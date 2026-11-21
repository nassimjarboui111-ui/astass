import crypto from 'crypto';
import type {
  AgentToolCallRecord,
  AppLanguage,
  DomainScanResult,
  RemediationGuidePayload,
} from '../../src/types/astasecure.ts';
import { validateAndNormalizeDomain } from '../engine/domainValidator.ts';
import { verifyDomainOwnershipAcrossResolvers } from '../engine/ownershipVerifier.ts';
import { buildRemediationGuide } from '../engine/remediation.ts';
import { runFullDomainScan } from '../engine/scanner.ts';
import { generateScanPdfBuffer } from '../reports/pdfGenerator.ts';
import { dispatchEmailAlert } from '../services/notifications.ts';
import { evaluateToolAuthorization } from './policyEngine.ts';
import type { AgentPolicyContext } from './types.ts';

function makeCallId(): string {
  return `tool_${crypto.randomBytes(4).toString('hex')}`;
}

export interface ToolExecutionContext {
  policyCtx: AgentPolicyContext;
  toolCalls: AgentToolCallRecord[];
}

function recordToolCall(
  execCtx: ToolExecutionContext,
  toolName: string,
  allowed: boolean,
  policyDecision: string,
  durationMs: number,
  summary: string
) {
  execCtx.toolCalls.push({
    callId: makeCallId(),
    toolName,
    allowed,
    policyDecision,
    durationMs,
    summary,
    timestampIso: new Date().toISOString(),
  });
}

export async function invokeValidateDomainScope(
  execCtx: ToolExecutionContext,
  domain: string,
  untrustedNotes?: string
) {
  const start = Date.now();
  const policy = evaluateToolAuthorization({
    toolName: 'validate_domain_scope',
    ctx: execCtx.policyCtx,
    targetOrgId: execCtx.policyCtx.orgId,
    targetDomain: domain,
    untrustedNotes,
  });

  if (!policy.allowed) {
    recordToolCall(execCtx, 'validate_domain_scope', false, policy.code, Date.now() - start, policy.reason);
    return { ok: false as const, policy };
  }

  const syntax = validateAndNormalizeDomain(domain);
  recordToolCall(
    execCtx,
    'validate_domain_scope',
    true,
    policy.code,
    Date.now() - start,
    syntax.valid ? `Validated ${syntax.normalized}` : `Rejected syntax: ${syntax.errorCode}`
  );
  return { ok: syntax.valid, syntax, policy };
}

export async function invokeVerifyOwnership(execCtx: ToolExecutionContext) {
  const start = Date.now();
  const policy = evaluateToolAuthorization({
    toolName: 'verify_domain_ownership',
    ctx: execCtx.policyCtx,
    targetOrgId: execCtx.policyCtx.orgId,
    targetDomain: execCtx.policyCtx.domain,
  });

  if (!policy.allowed) {
    recordToolCall(execCtx, 'verify_domain_ownership', false, policy.code, Date.now() - start, policy.reason);
    return { ok: false as const, policy };
  }

  const outcome = await verifyDomainOwnershipAcrossResolvers(
    execCtx.policyCtx.orgId,
    execCtx.policyCtx.domain,
    execCtx.policyCtx.verificationToken,
    execCtx.policyCtx.tokenExpiresAt
  );

  recordToolCall(
    execCtx,
    'verify_domain_ownership',
    true,
    policy.code,
    Date.now() - start,
    `Ownership verification status: ${outcome.status}`
  );
  return { ok: true as const, outcome, policy };
}

export async function invokePassiveDnsScan(
  execCtx: ToolExecutionContext,
  dkimSelectors: string[]
) {
  const start = Date.now();
  const policy = evaluateToolAuthorization({
    toolName: 'run_passive_dns_scan',
    ctx: execCtx.policyCtx,
    targetOrgId: execCtx.policyCtx.orgId,
    targetDomain: execCtx.policyCtx.domain,
  });

  if (!policy.allowed) {
    recordToolCall(execCtx, 'run_passive_dns_scan', false, policy.code, Date.now() - start, policy.reason);
    return { ok: false as const, policy };
  }

  const scan = await runFullDomainScan({
    orgId: execCtx.policyCtx.orgId,
    domain: execCtx.policyCtx.domain,
    dkimSelectors,
  });

  recordToolCall(
    execCtx,
    'run_passive_dns_scan',
    true,
    policy.code,
    Date.now() - start,
    `Completed passive DNS scan (${scan.score}/100, ${scan.checks.length} checks).`
  );
  return { ok: true as const, scan, policy };
}

export async function invokeGenerateRemediationPlan(
  execCtx: ToolExecutionContext,
  scan: DomainScanResult,
  lang: AppLanguage
) {
  const start = Date.now();
  const policy = evaluateToolAuthorization({
    toolName: 'generate_remediation_plan',
    ctx: execCtx.policyCtx,
    targetOrgId: execCtx.policyCtx.orgId,
    targetDomain: scan.domain,
  });

  if (!policy.allowed) {
    recordToolCall(execCtx, 'generate_remediation_plan', false, policy.code, Date.now() - start, policy.reason);
    return { ok: false as const, policy, guides: [] as RemediationGuidePayload[] };
  }

  const actionableChecks = scan.checks
    .filter((c) => c.pointsRemoved > 0 && c.id !== 'tls')
    .sort((a, b) => b.pointsRemoved - a.pointsRemoved)
    .slice(0, 4);

  const guides = actionableChecks.map((check) =>
    buildRemediationGuide({
      domain: scan.domain,
      checkId: check.id,
      provider: scan.detectedProvider,
      lang,
      customProposedRecord: check.proposedRecord,
    })
  );

  recordToolCall(
    execCtx,
    'generate_remediation_plan',
    true,
    policy.code,
    Date.now() - start,
    `Built ${guides.length} remediation guide(s) tailored to ${scan.detectedProviderLabel}.`
  );
  return { ok: true as const, guides, policy };
}

export async function invokeGeneratePdfReport(
  execCtx: ToolExecutionContext,
  scan: DomainScanResult,
  lang: 'en' | 'fr'
) {
  const start = Date.now();
  const policy = evaluateToolAuthorization({
    toolName: 'generate_pdf_report',
    ctx: execCtx.policyCtx,
    targetOrgId: execCtx.policyCtx.orgId,
    targetDomain: scan.domain,
  });

  if (!policy.allowed) {
    recordToolCall(execCtx, 'generate_pdf_report', false, policy.code, Date.now() - start, policy.reason);
    return { ok: false as const, policy };
  }

  const { buffer, sha256 } = await generateScanPdfBuffer({
    organizationName: execCtx.policyCtx.orgName,
    language: lang,
    scan,
  });

  recordToolCall(
    execCtx,
    'generate_pdf_report',
    true,
    policy.code,
    Date.now() - start,
    `Generated ${lang.toUpperCase()} PDF report (${buffer.length} bytes, SHA-256 ${sha256.slice(0, 12)}...).`
  );
  return {
    ok: true as const,
    pdfBase64: buffer.toString('base64'),
    sha256,
    policy,
  };
}

export async function invokeDispatchNotificationEmail(
  execCtx: ToolExecutionContext,
  recipient: string,
  subject: string,
  body: string
) {
  const start = Date.now();
  const policy = evaluateToolAuthorization({
    toolName: 'dispatch_notification_email',
    ctx: execCtx.policyCtx,
    targetOrgId: execCtx.policyCtx.orgId,
  });

  if (!policy.allowed) {
    recordToolCall(execCtx, 'dispatch_notification_email', false, policy.code, Date.now() - start, policy.reason);
    return {
      ok: false as const,
      policy,
      outcome: {
        channel: 'email' as const,
        configured: false,
        sent: false,
        message: policy.reason,
      },
    };
  }

  const outcome = await dispatchEmailAlert(recipient, subject, body);
  recordToolCall(
    execCtx,
    'dispatch_notification_email',
    true,
    policy.code,
    Date.now() - start,
    outcome.sent
      ? `Email sent to ${recipient}`
      : !outcome.configured
        ? 'Email dispatch skipped: SMTP unconfigured'
        : `Email dispatch failed: ${outcome.message}`
  );
  return { ok: true as const, outcome, policy };
}
