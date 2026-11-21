import { validateAndNormalizeDomain } from '../engine/domainValidator.ts';
import { verifyOwnershipProof } from '../engine/ownershipVerifier.ts';
import type { InboundEmailEvaluationResult } from '../../src/types/astasecure.ts';
import type { AgentPolicyContext, PolicyEvaluationResult } from './types.ts';

export const ALLOWLISTED_AGENT_TOOLS = [
  'validate_domain_scope',
  'verify_domain_ownership',
  'run_passive_dns_scan',
  'generate_remediation_plan',
  'generate_pdf_report',
  'dispatch_notification_email',
  'evaluate_inbound_email',
] as const;

export type AllowlistedToolName = (typeof ALLOWLISTED_AGENT_TOOLS)[number];

const PROHIBITED_TOOLS = new Set([
  'modify_dns',
  'delete_organization',
  'export_other_tenant',
  'penetration_test',
  'port_scan',
  'read_env_secrets',
]);

const PROMPT_INJECTION_PATTERNS: { pattern: RegExp; flag: string }[] = [
  { pattern: /ignore\s+(all\s+)?(previous|prior|system)\s+instructions/i, flag: 'prompt_override_attempt' },
  { pattern: /reveal\s+(your\s+)?(system\s+prompt|api[_\s]?key|secrets?|env)/i, flag: 'secret_exfiltration_attempt' },
  { pattern: /process\.env|GEMINI_API_KEY|SMTP_PASS|SCAN_SIGNING_SECRET/i, flag: 'env_secret_probe' },
  { pattern: /(bypass|skip|disable)\s+(domain\s+)?(ownership|verification|txt\s+check)/i, flag: 'ownership_bypass_attempt' },
  { pattern: /cross[\s_-]?tenant|other\s+organization|all\s+tenants/i, flag: 'cross_tenant_access_attempt' },
  { pattern: /(run|execute|launch)\s+(exploit|brute[\s-]?force|port\s+scan|ddos|sql\s+injection)/i, flag: 'prohibited_active_attack' },
  { pattern: /<\s*script\b|javascript:/i, flag: 'script_injection_payload' },
];

export function inspectUntrustedTextForInjection(rawText: string): {
  safe: boolean;
  flags: string[];
  sanitizedText: string;
} {
  const input = (rawText || '').trim().slice(0, 4000);
  const flags: string[] = [];

  for (const rule of PROMPT_INJECTION_PATTERNS) {
    if (rule.pattern.test(input)) {
      flags.push(rule.flag);
    }
  }

  const sanitizedText = input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return {
    safe: flags.length === 0,
    flags,
    sanitizedText,
  };
}

export function evaluateToolAuthorization(params: {
  toolName: string;
  ctx: AgentPolicyContext;
  targetOrgId?: string;
  targetDomain?: string;
  untrustedNotes?: string;
}): PolicyEvaluationResult {
  const { toolName, ctx, targetOrgId, targetDomain, untrustedNotes } = params;

  if (PROHIBITED_TOOLS.has(toolName) || !(ALLOWLISTED_AGENT_TOOLS as readonly string[]).includes(toolName)) {
    return {
      allowed: false,
      code: 'TOOL_NOT_ALLOWLISTED',
      reason: `Tool "${toolName}" is prohibited or outside the authorized AstaSecure Agent tool registry.`,
      blockedFlags: ['unauthorized_tool'],
    };
  }

  if (!ctx.uid || !ctx.emailVerified) {
    return {
      allowed: false,
      code: 'ACTOR_UNVERIFIED',
      reason: 'Authenticated user with verified email is required for agent operations.',
      blockedFlags: ['unverified_actor'],
    };
  }

  if (ctx.role === 'member') {
    return {
      allowed: false,
      code: 'INSUFFICIENT_ROLE',
      reason: 'Read-only organization members cannot execute AI Operations scans or dispatches.',
      blockedFlags: ['read_only_member'],
    };
  }

  if (targetOrgId && targetOrgId !== ctx.orgId) {
    return {
      allowed: false,
      code: 'CROSS_TENANT_BLOCKED',
      reason: 'Cross-organization access is strictly prohibited.',
      blockedFlags: ['cross_tenant_mismatch'],
    };
  }

  if (targetDomain) {
    const syntax = validateAndNormalizeDomain(targetDomain);
    if (!syntax.valid || !syntax.normalized) {
      return {
        allowed: false,
        code: syntax.errorCode || 'INVALID_DOMAIN',
        reason: syntax.errorMessage || 'Target domain failed syntax validation.',
        blockedFlags: ['invalid_domain'],
      };
    }
    if (syntax.normalized !== ctx.domain) {
      return {
        allowed: false,
        code: 'DOMAIN_SCOPE_MISMATCH',
        reason: 'Target domain does not match the authorized service request domain.',
        blockedFlags: ['domain_scope_mismatch'],
      };
    }
  }

  if (
    toolName === 'run_passive_dns_scan' ||
    toolName === 'generate_remediation_plan' ||
    toolName === 'generate_pdf_report'
  ) {
    if (!ctx.domainVerified) {
      return {
        allowed: false,
        code: 'OWNERSHIP_NOT_VERIFIED',
        reason: 'Domain TXT ownership must be verified across public resolvers before running agent scans or reports.',
        blockedFlags: ['unverified_domain'],
      };
    }

    const proof = verifyOwnershipProof(
      ctx.ownershipProof,
      ctx.orgId,
      ctx.domain,
      ctx.verificationToken
    );
    if (!proof.valid) {
      return {
        allowed: false,
        code: 'OWNERSHIP_PROOF_INVALID',
        reason: proof.reason || 'Cryptographic domain ownership proof is invalid or missing.',
        blockedFlags: ['invalid_ownership_proof'],
      };
    }
  }

  if (untrustedNotes) {
    const inspection = inspectUntrustedTextForInjection(untrustedNotes);
    if (!inspection.safe) {
      return {
        allowed: false,
        code: 'UNTRUSTED_INPUT_HOLD',
        reason: `Customer/inbound note triggered safety policy guard (${inspection.flags.join(', ')}). Routed to human review.`,
        blockedFlags: inspection.flags,
      };
    }
  }

  return {
    allowed: true,
    code: 'ALLOWED',
    reason: 'Policy check passed (verified tenant, authorized role, verified ownership, allowlisted passive tool).',
    blockedFlags: [],
  };
}

export function evaluateInboundEmailSafety(params: {
  senderEmail: string;
  subject: string;
  body: string;
  knownOrgDomains: string[];
}): InboundEmailEvaluationResult {
  const combined = `${params.subject}\n${params.body}`;
  const inspection = inspectUntrustedTextForInjection(combined);
  const flags = [...inspection.flags];

  const cleanSender = (params.senderEmail || '').trim().toLowerCase();
  if (!cleanSender || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanSender)) {
    flags.push('invalid_sender_format');
  }

  const mentionsKnownDomain = params.knownOrgDomains.some((dom) =>
    combined.toLowerCase().includes(dom.toLowerCase())
  );

  if (!mentionsKnownDomain && params.knownOrgDomains.length > 0) {
    flags.push('unmatched_organization_domain');
  }

  const promptInjectionDetected = inspection.flags.length > 0;
  const safeToRoute = flags.length === 0;

  return {
    senderEmail: cleanSender,
    subject: (params.subject || '').trim().slice(0, 200),
    safeToRoute,
    promptInjectionDetected,
    requiresHumanReview: true, // All untrusted inbound email intake requires explicit approval before active execution
    recommendedAction: promptInjectionDetected
      ? 'reject_suspicious'
      : safeToRoute
        ? 'queue_service_request'
        : 'hold_waiting_for_customer',
    riskFlags: flags,
    sanitizedSummary: inspection.sanitizedText.slice(0, 400),
    evaluatedAtIso: new Date().toISOString(),
  };
}
