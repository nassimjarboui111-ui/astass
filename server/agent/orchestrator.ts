import crypto from 'crypto';
import type { AgentStepLog, AgentToolCallRecord } from '../../src/types/astasecure.ts';
import { ENV } from '../config/env.ts';
import {
  generateEvidenceBasedNarrative,
  generateServiceExecutionPlan,
  getAiProviderStatus,
} from './aiProvider.ts';
import { inspectUntrustedTextForInjection } from './policyEngine.ts';
import {
  invokeDispatchNotificationEmail,
  invokeGeneratePdfReport,
  invokeGenerateRemediationPlan,
  invokePassiveDnsScan,
  invokeValidateDomainScope,
  invokeVerifyOwnership,
  type ToolExecutionContext,
} from './toolRegistry.ts';
import type { AgentExecuteJobInput, AgentJobExecutionResult } from './types.ts';

interface StoredServerJob {
  input: AgentExecuteJobInput;
  result: AgentJobExecutionResult;
}

const serverJobQueue = new Map<string, StoredServerJob>();

function makeStep(stepId: string, title: string): AgentStepLog {
  return {
    stepId,
    title,
    status: 'running',
    startedAtIso: new Date().toISOString(),
    detail: 'Executing...',
  };
}

function finishStep(
  step: AgentStepLog,
  status: AgentStepLog['status'],
  detail: string
) {
  step.status = status;
  step.completedAtIso = new Date().toISOString();
  step.detail = detail;
}

export function getServerAgentJob(jobId: string): AgentJobExecutionResult | null {
  return serverJobQueue.get(jobId)?.result || null;
}

export function getServerAgentJobForActor(
  jobId: string,
  actorUid: string,
  isPlatformAdmin = false
): { status: 'not_found' } | { status: 'forbidden' } | { status: 'ok'; job: AgentJobExecutionResult } {
  const stored = serverJobQueue.get(jobId);
  if (!stored) return { status: 'not_found' };
  if (stored.input.actorUid !== actorUid && !isPlatformAdmin) {
    return { status: 'forbidden' };
  }
  return { status: 'ok', job: stored.result };
}

export function listServerAgentJobs(orgId?: string): AgentJobExecutionResult[] {
  const all = Array.from(serverJobQueue.values()).map((j) => j.result);
  if (!orgId) return all;
  return all.filter((j) => {
    const stored = serverJobQueue.get(j.jobId);
    return stored?.input.orgId === orgId;
  });
}

export async function executeAgentServiceJob(
  input: AgentExecuteJobInput,
  attemptOverride?: number
): Promise<AgentJobExecutionResult> {
  const jobId = input.jobId || `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const existingStored = serverJobQueue.get(jobId);
  const attempts = attemptOverride ?? (existingStored ? existingStored.result.attempts + 1 : 1);
  const maxAttempts = 3;

  const steps: AgentStepLog[] = [];
  const toolCalls: AgentToolCallRecord[] = [];
  const aiStatus = getAiProviderStatus();

  const execCtx: ToolExecutionContext = {
    policyCtx: {
      uid: input.actorUid,
      email: input.actorEmail,
      emailVerified: input.actorEmailVerified,
      orgId: input.orgId,
      orgName: input.orgName,
      role: input.actorRole,
      domain: input.domain,
      domainVerified: Boolean(input.ownershipProof),
      verificationToken: input.verificationToken,
      tokenExpiresAt: input.tokenExpiresAt,
      ownershipProof: input.ownershipProof,
    },
    toolCalls,
  };

  // Step 1: Validate Policy, Domain Scope & Prompt-Injection Guard
  const stepScope = makeStep('step_policy', 'Policy & Scope Validation');
  steps.push(stepScope);
  const scopeCheck = await invokeValidateDomainScope(execCtx, input.domain, input.customerNotes);

  if (!scopeCheck.ok) {
    const isHold = scopeCheck.policy.code === 'UNTRUSTED_INPUT_HOLD';
    finishStep(stepScope, isHold ? 'blocked' : 'failed', scopeCheck.policy.reason);
    const blockedResult: AgentJobExecutionResult = {
      jobId,
      serviceRequestId: input.serviceRequestId,
      status: isHold ? 'waiting_for_customer' : 'failed',
      attempts,
      maxAttempts,
      aiProviderAvailable: aiStatus.configured,
      aiModel: aiStatus.model,
      policySummary: scopeCheck.policy.reason,
      remediationGuides: [],
      emailDelivery: {
        attempted: false,
        status: 'skipped',
        detail: 'Skipped because policy validation halted execution.',
      },
      steps,
      toolCalls,
      errorMessage: scopeCheck.policy.reason,
      updatedAtIso: new Date().toISOString(),
    };
    serverJobQueue.set(jobId, { input, result: blockedResult });
    return blockedResult;
  }

  finishStep(stepScope, 'completed', `Domain ${input.domain} validated within organization scope.`);

  // Step 2: Confirm Domain Ownership
  const stepOwn = makeStep('step_ownership', 'Dual-Resolver Ownership Gate');
  steps.push(stepOwn);

  if (!execCtx.policyCtx.ownershipProof) {
    const ownResult = await invokeVerifyOwnership(execCtx);
    if (!ownResult.ok || ownResult.outcome.status !== 'verified') {
      const msg = ownResult.ok
        ? ownResult.outcome.message
        : ownResult.policy.reason;
      finishStep(stepOwn, 'blocked', msg);
      const waitingResult: AgentJobExecutionResult = {
        jobId,
        serviceRequestId: input.serviceRequestId,
        status: 'waiting_for_customer',
        attempts,
        maxAttempts,
        aiProviderAvailable: aiStatus.configured,
        aiModel: aiStatus.model,
        policySummary: msg,
        remediationGuides: [],
        emailDelivery: {
          attempted: false,
          status: 'skipped',
          detail: 'Waiting for DNS TXT ownership verification.',
        },
        steps,
        toolCalls,
        errorMessage: msg,
        updatedAtIso: new Date().toISOString(),
      };
      serverJobQueue.set(jobId, { input, result: waitingResult });
      return waitingResult;
    }
    execCtx.policyCtx.domainVerified = true;
    execCtx.policyCtx.ownershipProof = ownResult.outcome.ownershipProof;
  }

  finishStep(stepOwn, 'completed', `Confirmed cryptographic ownership proof for ${input.domain}.`);

  // Step 3: AI Classification & Execution Planning (Honest Server Call)
  const stepPlan = makeStep('step_ai_plan', 'AI Service Classification & Plan');
  steps.push(stepPlan);
  const sanitizedNotes = inspectUntrustedTextForInjection(input.customerNotes).sanitizedText;
  const planRes = await generateServiceExecutionPlan({
    domain: input.domain,
    servicePackage: input.servicePackage,
    language: input.language,
    priority: input.priority,
    sanitizedNotes,
  });

  let aiAvailable = planRes.available;
  let aiDegradedReason = planRes.degradedReason;
  const aiClassification = planRes.data?.classification;

  if (planRes.available) {
    finishStep(stepPlan, 'completed', `Classified as "${planRes.data?.classification}" via ${planRes.model}.`);
  } else {
    finishStep(
      stepPlan,
      'skipped',
      `AI Planner unavailable (${planRes.degradedReason}). Continuing with deterministic DNS checks.`
    );
  }

  // Step 4: Passive DNS Security Assessment Tool
  const stepScan = makeStep('step_dns_scan', 'Passive DNS & Email Assessment');
  steps.push(stepScan);
  const scanExec = await invokePassiveDnsScan(execCtx, input.dkimSelectors || []);

  if (!scanExec.ok) {
    finishStep(stepScan, 'failed', scanExec.policy.reason);
    const failedScanResult: AgentJobExecutionResult = {
      jobId,
      serviceRequestId: input.serviceRequestId,
      status: 'failed',
      attempts,
      maxAttempts,
      aiProviderAvailable: aiAvailable,
      aiModel: ENV.aiModel,
      aiDegradedReason,
      aiClassification,
      policySummary: scanExec.policy.reason,
      remediationGuides: [],
      emailDelivery: {
        attempted: false,
        status: 'skipped',
        detail: 'Skipped due to scan authorization failure.',
      },
      steps,
      toolCalls,
      errorMessage: scanExec.policy.reason,
      updatedAtIso: new Date().toISOString(),
    };
    serverJobQueue.set(jobId, { input, result: failedScanResult });
    return failedScanResult;
  }

  const scan = scanExec.scan;
  finishStep(
    stepScan,
    'completed',
    `Completed ${scan.checks.length} passive checks (${scan.score}/100, host: ${scan.detectedProviderLabel}).`
  );

  // Step 5: Evidence-Grounded AI Risk Synthesis
  const stepAiSynth = makeStep('step_ai_synthesis', 'Evidence-Grounded AI Analysis');
  steps.push(stepAiSynth);
  let executiveNarrative: string | undefined;
  let prioritizedActions: string[] | undefined;

  if (aiAvailable) {
    const synthRes = await generateEvidenceBasedNarrative({
      orgName: input.orgName,
      scan,
      language: input.language,
    });
    if (synthRes.available && synthRes.data) {
      executiveNarrative = synthRes.data.executiveNarrative;
      prioritizedActions = synthRes.data.prioritizedActions;
      finishStep(stepAiSynth, 'completed', `Generated plain-language executive summary (${input.language.toUpperCase()}).`);
    } else {
      aiAvailable = false;
      aiDegradedReason = synthRes.degradedReason;
      finishStep(stepAiSynth, 'skipped', `AI Synthesis unavailable: ${synthRes.degradedReason}`);
    }
  } else {
    finishStep(
      stepAiSynth,
      'skipped',
      `Skipped AI narrative because provider is unavailable (${aiDegradedReason}).`
    );
  }

  // Step 6: Hosting-Specific Remediation Guides
  const stepRem = makeStep('step_remediation', 'Hosting-Specific Remediation Plan');
  steps.push(stepRem);
  const remExec = await invokeGenerateRemediationPlan(execCtx, scan, input.language);
  const remediationGuides = remExec.guides;
  finishStep(
    stepRem,
    remExec.ok ? 'completed' : 'failed',
    remExec.ok
      ? `Generated ${remediationGuides.length} actionable guide(s) for ${scan.detectedProviderLabel}.`
      : remExec.policy.reason
  );

  // Step 7: Signed PDF Report Artifact
  const stepPdf = makeStep('step_pdf', 'Signed PDF Report Generation');
  steps.push(stepPdf);
  const reportLang: 'en' | 'fr' = input.language === 'fr' ? 'fr' : 'en';
  const pdfExec = await invokeGeneratePdfReport(execCtx, scan, reportLang);
  if (pdfExec.ok) {
    finishStep(
      stepPdf,
      'completed',
      `PDF generated (${reportLang.toUpperCase()}) with SHA-256 ${pdfExec.sha256.slice(0, 14)}...`
    );
  } else {
    finishStep(stepPdf, 'failed', pdfExec.policy.reason);
  }

  // Step 8: Optional Customer Email Dispatch (Honest Delivery Tracking)
  const stepEmail = makeStep('step_email', 'Customer Email Notification');
  steps.push(stepEmail);
  let emailDelivery: AgentJobExecutionResult['emailDelivery'] = {
    attempted: false,
    status: 'skipped',
    detail: 'Email notification was not requested for this job.',
  };

  if (input.sendEmailReport && input.notifyEmail) {
    const emailBody = [
      `AstaSecure Operations Report Ready: ${scan.domain}`,
      `Organization: ${input.orgName}`,
      `Service Package: ${input.servicePackage}`,
      `Posture Score: ${scan.score}/100 (Risk Points: ${scan.riskPoints})`,
      pdfExec.ok ? `Report SHA-256: ${pdfExec.sha256}` : '',
      executiveNarrative ? `\nSummary:\n${executiveNarrative}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const emailRes = await invokeDispatchNotificationEmail(
      execCtx,
      input.notifyEmail,
      `AstaSecure Report Ready — ${scan.domain} (${scan.score}/100)`,
      emailBody
    );

    const status = emailRes.outcome.sent
      ? 'sent'
      : !emailRes.outcome.configured
        ? 'unconfigured'
        : 'failed';

    emailDelivery = {
      attempted: true,
      status,
      recipient: input.notifyEmail,
      detail: emailRes.outcome.message,
    };

    finishStep(
      stepEmail,
      status === 'sent' ? 'completed' : status === 'unconfigured' ? 'skipped' : 'failed',
      emailRes.outcome.message
    );
  } else {
    finishStep(stepEmail, 'skipped', emailDelivery.detail);
  }

  const finalStatus = aiAvailable ? 'completed' : 'degraded_retryable';

  const finalResult: AgentJobExecutionResult = {
    jobId,
    serviceRequestId: input.serviceRequestId,
    status: finalStatus,
    attempts,
    maxAttempts,
    aiProviderAvailable: aiAvailable,
    aiModel: ENV.aiModel,
    aiDegradedReason: aiAvailable ? undefined : aiDegradedReason,
    aiClassification,
    executiveNarrative,
    prioritizedActions,
    policySummary: 'Authorized: verified actor, non-member role, verified DNS TXT ownership, passive tools only.',
    scan,
    remediationGuides,
    reportPdfBase64: pdfExec.ok ? pdfExec.pdfBase64 : undefined,
    reportSha256: pdfExec.ok ? pdfExec.sha256 : undefined,
    reportLanguage: reportLang,
    emailDelivery,
    steps,
    toolCalls,
    updatedAtIso: new Date().toISOString(),
  };

  serverJobQueue.set(jobId, { input, result: finalResult });
  return finalResult;
}

export async function retryAgentServiceJob(
  jobId: string,
  actorUid: string,
  isPlatformAdmin = false
): Promise<AgentJobExecutionResult | null> {
  const existing = serverJobQueue.get(jobId);
  if (!existing) return null;
  if (existing.input.actorUid !== actorUid && !isPlatformAdmin) {
    throw new Error('FORBIDDEN_JOB_ACCESS');
  }
  if (existing.result.attempts >= existing.result.maxAttempts) {
    return {
      ...existing.result,
      status: 'failed',
      errorMessage: `Maximum retry attempts (${existing.result.maxAttempts}) reached.`,
      updatedAtIso: new Date().toISOString(),
    };
  }
  return executeAgentServiceJob(
    { ...existing.input, actorUid: existing.input.actorUid, jobId },
    existing.result.attempts + 1
  );
}
