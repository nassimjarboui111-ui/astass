export type AppLanguage = 'en' | 'fr' | 'ar';

export type OrgRole = 'owner' | 'admin' | 'member';

export type PlanId = 'free' | 'essential' | 'pro' | 'agency';

export type CheckId = 'spf' | 'dmarc' | 'dkim' | 'mx' | 'ns' | 'soa' | 'dnssec' | 'caa' | 'tls';

export type CheckStatus = 'confirmed' | 'missing' | 'not_verified' | 'technical_error';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'none';

export type DnsProviderId =
  | 'cloudflare'
  | 'ovhcloud'
  | 'godaddy'
  | 'aws_route53'
  | 'azure_dns'
  | 'namecheap'
  | 'gandi'
  | 'ionos'
  | 'hostinger'
  | 'generic';

export interface CheckEvidence {
  resolver: string;
  queriedAt: string;
  recordType: string;
  queryName: string;
  ttl?: number;
  rawRecords: string[];
  notes?: string;
}

export interface DnsCheckResult {
  id: CheckId;
  name: string;
  purposeKey: string;
  status: CheckStatus;
  severity: Severity;
  pointsRemoved: number;
  summary: string;
  riskExplanation: string;
  recommendedAction: string;
  proposedRecord?: {
    type: string;
    name: string;
    value: string;
    ttl: string;
  };
  evidence: CheckEvidence;
  details?: Record<string, unknown>;
}

export interface DomainScanResult {
  domain: string;
  orgId: string;
  score: number;
  maxScore: 100;
  riskPoints: number;
  durationMs: number;
  detectedProvider: DnsProviderId;
  detectedProviderLabel: string;
  dmarcStage: 'missing' | 'p_none' | 'p_quarantine' | 'p_reject';
  checks: DnsCheckResult[];
  deductions: {
    checkId: CheckId;
    severity: Severity;
    pointsRemoved: number;
    reason: string;
  }[];
  integritySig: string;
  scannedAtIso: string;
}

export interface MonitoredDomainDoc {
  id: string;
  orgId: string;
  domain: string;
  createdBy: string;
  verificationToken: string;
  tokenExpiresAt: string;
  verificationStatus: 'pending' | 'verified' | 'suspended' | 'technical_error';
  verifiedAt?: string;
  ownershipProof?: string;
  detectedProvider?: DnsProviderId;
  dkimSelectors?: string[];
  lastScanId?: string;
  lastScore?: number;
  lastScanAt?: string;
  scheduleFrequency: 'manual' | 'weekly' | 'daily';
  memberUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrganizationDoc {
  id: string;
  name: string;
  ownerId: string;
  plan: PlanId;
  language: AppLanguage;
  domainLimit: number;
  scanQuotaDaily: number;
  alertEmail?: string;
  emailAlertsEnabled?: boolean;
  whatsappNumber?: string;
  whatsappAlertsEnabled?: boolean;
  memberUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrganizationMemberDoc {
  id: string;
  userId: string;
  orgId: string;
  email: string;
  displayName: string;
  role: OrgRole;
  status: 'active' | 'invited';
  invitedBy?: string;
  memberUids: string[];
}

export interface SubscriptionPlanDoc {
  id: PlanId;
  name: string;
  priceTnd: number;
  domainLimit: number;
  dailyScanQuota: number;
  scheduleAllowed: 'manual' | 'weekly' | 'daily';
  pdfReportsEnabled: boolean;
}

export interface AuditLogDoc {
  id: string;
  orgId: string;
  actorId: string;
  actorEmail: string;
  action: string;
  target: string;
  details?: string;
  createdAt?: unknown;
}

export interface RemediationGuidePayload {
  checkId: CheckId;
  provider: DnsProviderId;
  providerLabel: string;
  title: string;
  problemSummary: string;
  whyItMatters: string;
  requiredRecord: {
    type: string;
    name: string;
    value: string;
    ttl: string;
  };
  steps: string[];
  verificationSteps: string[];
}

// --- AstaSecure AI Operations Agent & Service Workflow Types ---

export type ServicePackageId =
  | 'domain_assessment'
  | 'email_security_review'
  | 'dns_monitoring'
  | 'remediation_advisory';

export type AgentJobStatus =
  | 'queued'
  | 'running'
  | 'waiting_for_customer'
  | 'completed'
  | 'failed'
  | 'degraded_retryable';

export interface AgentStepLog {
  stepId: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'blocked';
  startedAtIso: string;
  completedAtIso?: string;
  detail: string;
}

export interface AgentToolCallRecord {
  callId: string;
  toolName: string;
  allowed: boolean;
  policyDecision: string;
  durationMs: number;
  summary: string;
  timestampIso: string;
}

export interface ServiceRequestDoc {
  id: string;
  orgId: string;
  createdBy: string;
  requesterEmail: string;
  domainId: string;
  domain: string;
  servicePackage: ServicePackageId;
  language: AppLanguage;
  priority: 'standard' | 'urgent';
  customerNotes: string;
  status: AgentJobStatus;
  latestJobId?: string;
  memberUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AgentJobDoc {
  id: string;
  orgId: string;
  serviceRequestId: string;
  domainId: string;
  domain: string;
  servicePackage: ServicePackageId;
  language: AppLanguage;
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
  scanId?: string;
  score?: number;
  reportSha256?: string;
  emailDeliveryStatus?: 'sent' | 'failed' | 'unconfigured' | 'skipped';
  emailDeliveryDetail?: string;
  steps: AgentStepLog[];
  toolCalls: AgentToolCallRecord[];
  errorMessage?: string;
  memberUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StoredReportDoc {
  id: string;
  orgId: string;
  domainId: string;
  domain: string;
  scanId: string;
  jobId?: string;
  language: 'en' | 'fr';
  score: number;
  sha256: string;
  integritySig: string;
  generatedBy: string;
  generatedAtIso: string;
  memberUids: string[];
  createdAt?: unknown;
}

export interface EmailDeliveryLogDoc {
  id: string;
  orgId: string;
  recipient: string;
  category: 'contact_ack' | 'service_request' | 'job_report' | 'security_alert' | 'test';
  subject: string;
  status: 'sent' | 'failed' | 'unconfigured';
  detail: string;
  relatedJobId?: string;
  memberUids: string[];
  sentAtIso: string;
  createdAt?: unknown;
}

export interface NotificationDoc {
  id: string;
  orgId: string;
  title: string;
  body: string;
  category: 'agent_job' | 'report_ready' | 'email_status' | 'security_alert';
  severity: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  relatedJobId?: string;
  relatedDomain?: string;
  memberUids: string[];
  createdAtIso: string;
  createdAt?: unknown;
}

export interface InboundEmailEvaluationResult {
  senderEmail: string;
  subject: string;
  safeToRoute: boolean;
  promptInjectionDetected: boolean;
  requiresHumanReview: boolean;
  recommendedAction: 'queue_service_request' | 'hold_waiting_for_customer' | 'reject_suspicious';
  riskFlags: string[];
  sanitizedSummary: string;
  evaluatedAtIso: string;
}
