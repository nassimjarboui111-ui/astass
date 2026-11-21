import type {
  AgentJobStatus,
  AgentStepLog,
  AgentToolCallRecord,
  AppLanguage,
  DomainScanResult,
  OrgRole,
  RemediationGuidePayload,
  ServicePackageId,
} from '../../src/types/astasecure.ts';

export interface AgentPolicyContext {
  uid: string;
  email: string;
  emailVerified: boolean;
  orgId: string;
  orgName: string;
  role: OrgRole;
  domain: string;
  domainVerified: boolean;
  verificationToken: string;
  tokenExpiresAt: string;
  ownershipProof?: string;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason: string;
  code: string;
  blockedFlags: string[];
}

export interface AiPlanOutput {
  classification: string;
  riskFocusAreas: string[];
  plannedSteps: string[];
}

export interface AiNarrativeOutput {
  executiveNarrative: string;
  prioritizedActions: string[];
}

export interface AiProviderResponse<T> {
  available: boolean;
  model: string;
  data?: T;
  degradedReason?: string;
  retryable: boolean;
}

export interface AgentExecuteJobInput {
  jobId?: string;
  serviceRequestId: string;
  orgId: string;
  orgName: string;
  actorUid: string;
  actorEmail: string;
  actorEmailVerified: boolean;
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
}

export interface AgentJobExecutionResult {
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
