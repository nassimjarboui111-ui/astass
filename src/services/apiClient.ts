import { auth } from '../lib/firebase';
import {
  AgentJobStatus,
  AgentStepLog,
  AgentToolCallRecord,
  AppLanguage,
  CheckId,
  DnsCheckResult,
  DnsProviderId,
  DomainScanResult,
  InboundEmailEvaluationResult,
  OrgRole,
  RemediationGuidePayload,
  ServicePackageId,
} from '../types/astasecure';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required.');
  }
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function apiValidateDomainSyntax(domain: string): Promise<{
  valid: boolean;
  normalized?: string;
  errorCode?: string;
  errorMessage?: string;
}> {
  const res = await fetch('/api/v1/domains/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  });
  return res.json();
}

export async function apiSendContactNotification(params: {
  name: string;
  email: string;
  company?: string;
  serviceCategory: string;
  domain?: string;
  message: string;
  consentAccepted: boolean;
}): Promise<{
  status: 'sent' | 'failed' | 'unconfigured';
  configured: boolean;
  sent: boolean;
  detail: string;
}> {
  const res = await fetch('/api/v1/contact/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Contact inquiry validation failed.');
  }
  return data;
}

export async function apiGenerateOwnershipToken(domain: string): Promise<{
  domain: string;
  token: string;
  recordNameApex: string;
  recordNameSubdomain: string;
  expiresAtIso: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/domains/token', {
    method: 'POST',
    headers,
    body: JSON.stringify({ domain }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to generate ownership token.');
  return data;
}

export async function apiVerifyDomainOwnership(params: {
  orgId: string;
  domain: string;
  token: string;
  expiresAtIso: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/domains/verify-ownership', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ownership verification request failed.');
  return data as {
    domain: string;
    status: 'verified' | 'pending' | 'technical_error';
    message: string;
    verifiedAtIso?: string;
    ownershipProof?: string;
    resolvers: {
      resolver: string;
      found: boolean;
      technicalError?: string;
      matchedLocation?: string;
      observedRecords: string[];
      queriedAt: string;
    }[];
  };
}

export async function apiRunDomainScan(params: {
  orgId: string;
  domain: string;
  verificationToken: string;
  tokenExpiresAt: string;
  ownershipProof?: string;
  dkimSelectors?: string[];
  alertEmail?: string;
  emailAlertsEnabled?: boolean;
  whatsappNumber?: string;
  whatsappAlertsEnabled?: boolean;
  previousScore?: number;
}): Promise<{ scan: DomainScanResult; alerts: { channel: string; configured: boolean; sent: boolean; message: string }[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/scans/run', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Domain scan failed.');
  return data;
}

export async function apiRecheckSingleCheck(params: {
  orgId: string;
  domain: string;
  checkId: CheckId;
  verificationToken: string;
  ownershipProof: string;
  dkimSelectors?: string[];
}): Promise<DnsCheckResult> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/scans/recheck', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Single check verification failed.');
  return data.check;
}

export async function apiVerifyScanIntegrity(scan: DomainScanResult): Promise<boolean> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/scans/verify-integrity', {
    method: 'POST',
    headers,
    body: JSON.stringify({ scan }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data.valid);
}

export async function apiGetRemediationGuide(params: {
  domain: string;
  checkId: CheckId;
  provider: DnsProviderId;
  lang: AppLanguage;
  customProposedRecord?: { type: string; name: string; value: string; ttl: string };
}): Promise<RemediationGuidePayload> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/remediation/guide', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load remediation guide.');
  return data.guide;
}

export async function apiDownloadPdfReport(params: {
  organizationName: string;
  language: 'en' | 'fr';
  scan: DomainScanResult;
}): Promise<{ sha256: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/reports/pdf', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate PDF report.' }));
    throw new Error(err.error || 'Failed to generate PDF report.');
  }
  const sha256 = res.headers.get('X-Report-SHA256') || '';
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AstaSecure-${params.scan.domain}-${params.language}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { sha256 };
}

export async function apiSetupTotp(): Promise<{
  secret: string;
  otpauthUri: string;
  qrCodeDataUrl: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/auth/totp/setup', { method: 'POST', headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'TOTP setup failed.');
  return data;
}

export async function apiVerifyTotp(secret: string, token: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/auth/totp/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify({ secret, token }),
  });
  const data = await res.json();
  return Boolean(data.valid);
}

export async function apiGetHealth(): Promise<{
  ok: boolean;
  channels: {
    emailConfigured: boolean;
    whatsappConfigured: boolean;
    contactRecipientEmail: string | null;
    contactRoutingConfigured: boolean;
  };
  ai: {
    provider: string;
    model: string;
    configured: boolean;
  };
}> {
  const res = await fetch('/api/v1/health');
  return res.json();
}

// --- AstaSecure AI Operations Agent Client Callers ---

export interface AgentExecutionApiResponse {
  jobId: string;
  serviceRequestId: string;
  status: AgentJobStatus;
  attempts: number;
  maxAttempts: number;
  aiProviderAvailable: boolean;
  aiModel: string;
  aiDegradedReason?: string;
  aiClassification?: string;
  executiveNarrative?: string;
  prioritizedActions?: string[];
  policySummary: string;
  scan?: DomainScanResult;
  remediationGuides: RemediationGuidePayload[];
  reportPdfBase64?: string;
  reportSha256?: string;
  reportLanguage?: 'en' | 'fr';
  emailDelivery: {
    attempted: boolean;
    status: 'sent' | 'failed' | 'unconfigured' | 'skipped';
    recipient?: string;
    detail: string;
  };
  steps: AgentStepLog[];
  toolCalls: AgentToolCallRecord[];
  errorMessage?: string;
  updatedAtIso: string;
}

export async function apiGetAgentStatus(): Promise<{
  ai: { provider: string; model: string; configured: boolean };
  channels: {
    emailConfigured: boolean;
    whatsappConfigured: boolean;
    contactRecipientEmail: string | null;
    contactRoutingConfigured: boolean;
  };
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/agent/status', { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to read AI Operations status.');
  return data;
}

export async function apiExecuteAgentJob(params: {
  jobId?: string;
  serviceRequestId: string;
  orgId: string;
  orgName: string;
  actorRole: OrgRole;
  domainId: string;
  domain: string;
  verificationToken: string;
  tokenExpiresAt: string;
  ownershipProof?: string;
  dkimSelectors?: string[];
  servicePackage: ServicePackageId;
  language: AppLanguage;
  priority: 'standard' | 'urgent';
  customerNotes: string;
  notifyEmail?: string;
  sendEmailReport?: boolean;
}): Promise<AgentExecutionApiResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/agent/jobs/execute', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI Operations Agent execution failed.');
  return data;
}

export async function apiRetryAgentJob(jobId: string): Promise<AgentExecutionApiResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/agent/jobs/retry', {
    method: 'POST',
    headers,
    body: JSON.stringify({ jobId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to retry AI job.');
  return data;
}

export async function apiEvaluateInboundEmail(params: {
  senderEmail: string;
  subject: string;
  body: string;
  knownOrgDomains: string[];
}): Promise<InboundEmailEvaluationResult> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/email/inbound-evaluate', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Inbound email safety evaluation failed.');
  return data;
}

export async function apiAdminGetOverview(): Promise<{
  ok: boolean;
  ai: { provider: string; model: string; configured: boolean };
  channels: {
    emailConfigured: boolean;
    whatsappConfigured: boolean;
    contactRecipientEmail: string | null;
    contactRoutingConfigured: boolean;
  };
  runtimeQueueCount: number;
  recentRuntimeJobs: AgentExecutionApiResponse[];
  timestamp: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/admin/overview', { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Admin telemetry access denied.');
  return data;
}
