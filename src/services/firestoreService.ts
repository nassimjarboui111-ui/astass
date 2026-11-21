import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import {
  AgentJobDoc,
  AgentJobStatus,
  AppLanguage,
  AuditLogDoc,
  DomainScanResult,
  EmailDeliveryLogDoc,
  MonitoredDomainDoc,
  NotificationDoc,
  OrganizationDoc,
  OrganizationMemberDoc,
  OrgRole,
  PlanId,
  ServicePackageId,
  ServiceRequestDoc,
  StoredReportDoc,
  SubscriptionPlanDoc,
} from '../types/astasecure';
import type { AgentExecutionApiResponse } from './apiClient';

export const DEFAULT_PLANS: SubscriptionPlanDoc[] = [
  {
    id: 'free',
    name: 'Free Check',
    priceTnd: 0,
    domainLimit: 1,
    dailyScanQuota: 5,
    scheduleAllowed: 'manual',
    pdfReportsEnabled: false,
  },
  {
    id: 'essential',
    name: 'Essential',
    priceTnd: 49,
    domainLimit: 1,
    dailyScanQuota: 10,
    scheduleAllowed: 'weekly',
    pdfReportsEnabled: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    priceTnd: 119,
    domainLimit: 3,
    dailyScanQuota: 25,
    scheduleAllowed: 'daily',
    pdfReportsEnabled: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    priceTnd: 349,
    domainLimit: 25,
    dailyScanQuota: 100,
    scheduleAllowed: 'daily',
    pdfReportsEnabled: true,
  },
];

export function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export async function ensureUserProfile(params: {
  uid: string;
  email: string;
  displayName: string;
  preferredLang: AppLanguage;
}) {
  const path = `users/${params.uid}`;
  try {
    const ref = doc(db, 'users', params.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: params.uid,
        email: params.email.slice(0, 254),
        displayName: (params.displayName || params.email.split('@')[0] || 'User').slice(0, 120),
        preferredLang: params.preferredLang,
        totpEnabled: false,
        acceptedPrivacyPolicyAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return (await getDoc(ref)).data();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<{ displayName: string; activeOrgId: string; preferredLang: AppLanguage; totpEnabled: boolean }>
) {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveTotpSecret(uid: string, secret: string, enabled: boolean) {
  const path = `users/${uid}/secrets/totp`;
  try {
    const ref = doc(db, 'users', uid, 'secrets', 'totp');
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        secret,
        enabled,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid,
        secret,
        enabled,
        updatedAt: serverTimestamp(),
      });
    }
    await updateUserProfile(uid, { totpEnabled: enabled });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getTotpSecret(uid: string): Promise<{ secret: string; enabled: boolean } | null> {
  const path = `users/${uid}/secrets/totp`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'secrets', 'totp'));
    if (!snap.exists()) return null;
    const data = snap.data();
    return { secret: String(data.secret), enabled: Boolean(data.enabled) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createDefaultOrganization(params: {
  uid: string;
  email: string;
  displayName: string;
  orgName: string;
  language: AppLanguage;
}): Promise<string> {
  const orgId = makeSafeId('org');
  const path = `organizations/${orgId}`;
  try {
    const batch = writeBatch(db);
    const orgRef = doc(db, 'organizations', orgId);
    const memberRef = doc(db, 'organizations', orgId, 'members', params.uid);
    const membershipRef = doc(db, 'users', params.uid, 'memberships', orgId);
    const logRef = doc(db, 'organizations', orgId, 'auditLogs', makeSafeId('log'));

    const cleanOrgName = (params.orgName || `${params.displayName} Workspace`).slice(0, 120);

    batch.set(orgRef, {
      id: orgId,
      name: cleanOrgName,
      ownerId: params.uid,
      plan: 'free',
      language: params.language,
      domainLimit: 1,
      scanQuotaDaily: 5,
      alertEmail: params.email.slice(0, 254),
      emailAlertsEnabled: false,
      whatsappAlertsEnabled: false,
      memberUids: [params.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(memberRef, {
      userId: params.uid,
      orgId,
      email: params.email.slice(0, 254),
      displayName: (params.displayName || 'Owner').slice(0, 120),
      role: 'owner',
      status: 'active',
      memberUids: [params.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(membershipRef, {
      orgId,
      orgName: cleanOrgName,
      role: 'owner',
      joinedAt: serverTimestamp(),
    });

    batch.set(logRef, {
      orgId,
      actorId: params.uid,
      actorEmail: params.email.slice(0, 254),
      action: 'organization.created',
      target: cleanOrgName,
      details: 'Initialized organization workspace with Free Check plan.',
      memberUids: [params.uid],
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    await updateUserProfile(params.uid, { activeOrgId: orgId });
    return orgId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function listUserMemberships(uid: string) {
  const path = `users/${uid}/memberships`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'memberships'));
    return snap.docs.map((d) => d.data() as { orgId: string; orgName: string; role: OrgRole });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function appendAuditLog(params: {
  orgId: string;
  actorId: string;
  actorEmail: string;
  action: string;
  target: string;
  details?: string;
  memberUids: string[];
}) {
  const logId = makeSafeId('log');
  const path = `organizations/${params.orgId}/auditLogs/${logId}`;
  try {
    await setDoc(doc(db, 'organizations', params.orgId, 'auditLogs', logId), {
      orgId: params.orgId,
      actorId: params.actorId,
      actorEmail: params.actorEmail.slice(0, 254),
      action: params.action.slice(0, 120),
      target: params.target.slice(0, 256),
      details: (params.details || '').slice(0, 500),
      memberUids: params.memberUids.slice(0, 25),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function addMonitoredDomain(params: {
  orgId: string;
  domain: string;
  createdBy: string;
  actorEmail: string;
  verificationToken: string;
  tokenExpiresAt: string;
  memberUids: string[];
}): Promise<string> {
  const domainId = makeSafeId('dom');
  const path = `organizations/${params.orgId}/domains/${domainId}`;
  try {
    await setDoc(doc(db, 'organizations', params.orgId, 'domains', domainId), {
      orgId: params.orgId,
      domain: params.domain.slice(0, 253),
      createdBy: params.createdBy,
      verificationToken: params.verificationToken.slice(0, 128),
      tokenExpiresAt: params.tokenExpiresAt.slice(0, 64),
      verificationStatus: 'pending',
      scheduleFrequency: 'manual',
      dkimSelectors: [],
      memberUids: params.memberUids.slice(0, 25),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await appendAuditLog({
      orgId: params.orgId,
      actorId: params.createdBy,
      actorEmail: params.actorEmail,
      action: 'domain.added',
      target: params.domain,
      details: 'Generated 7-day DNS TXT verification token.',
      memberUids: params.memberUids,
    });
    return domainId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateDomainVerification(params: {
  orgId: string;
  domainId: string;
  domain: string;
  actorId: string;
  actorEmail: string;
  memberUids: string[];
  verificationStatus: 'pending' | 'verified' | 'suspended' | 'technical_error';
  verifiedAt?: string;
  ownershipProof?: string;
  verificationToken?: string;
  tokenExpiresAt?: string;
}) {
  const path = `organizations/${params.orgId}/domains/${params.domainId}`;
  try {
    const payload: Record<string, unknown> = {
      verificationStatus: params.verificationStatus,
      updatedAt: serverTimestamp(),
    };
    if (params.verifiedAt) payload.verifiedAt = params.verifiedAt;
    if (params.ownershipProof) payload.ownershipProof = params.ownershipProof;
    if (params.verificationToken) payload.verificationToken = params.verificationToken;
    if (params.tokenExpiresAt) payload.tokenExpiresAt = params.tokenExpiresAt;

    await updateDoc(doc(db, 'organizations', params.orgId, 'domains', params.domainId), payload);

    if (params.verificationStatus === 'verified') {
      await appendAuditLog({
        orgId: params.orgId,
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        action: 'domain.ownership_verified',
        target: params.domain,
        details: 'Verified via Cloudflare (1.1.1.1) and Google (8.8.8.8) public DNS resolvers.',
        memberUids: params.memberUids,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveDomainScanToFirestore(params: {
  orgId: string;
  domainId: string;
  triggeredBy: string;
  actorEmail: string;
  triggerType: 'manual' | 'scheduled' | 'recheck';
  scan: DomainScanResult;
  memberUids: string[];
}): Promise<string> {
  const scanId = makeSafeId('scan');
  const path = `organizations/${params.orgId}/scans/${scanId}`;
  try {
    const batch = writeBatch(db);
    const scanRef = doc(db, 'organizations', params.orgId, 'scans', scanId);
    const domRef = doc(db, 'organizations', params.orgId, 'domains', params.domainId);
    const logRef = doc(db, 'organizations', params.orgId, 'auditLogs', makeSafeId('log'));

    batch.set(scanRef, {
      orgId: params.orgId,
      domainId: params.domainId,
      domain: params.scan.domain,
      triggeredBy: params.triggeredBy,
      triggerType: params.triggerType,
      score: params.scan.score,
      riskPoints: params.scan.riskPoints,
      durationMs: params.scan.durationMs,
      detectedProvider: params.scan.detectedProvider,
      checks: params.scan.checks,
      integritySig: params.scan.integritySig,
      scannedAtIso: params.scan.scannedAtIso,
      memberUids: params.memberUids.slice(0, 25),
      createdAt: serverTimestamp(),
    });

    batch.update(domRef, {
      lastScanId: scanId,
      lastScore: params.scan.score,
      lastScanAt: params.scan.scannedAtIso,
      detectedProvider: params.scan.detectedProvider,
      updatedAt: serverTimestamp(),
    });

    batch.set(logRef, {
      orgId: params.orgId,
      actorId: params.triggeredBy,
      actorEmail: params.actorEmail.slice(0, 254),
      action: params.triggerType === 'recheck' ? 'scan.recheck' : 'scan.completed',
      target: params.scan.domain,
      details: `Score ${params.scan.score}/100 (${params.scan.riskPoints} risk points, ${params.scan.durationMs}ms).`,
      memberUids: params.memberUids.slice(0, 25),
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return scanId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateDomainSettings(params: {
  orgId: string;
  domainId: string;
  dkimSelectors: string[];
  scheduleFrequency: 'manual' | 'weekly' | 'daily';
}) {
  const path = `organizations/${params.orgId}/domains/${params.domainId}`;
  try {
    await updateDoc(doc(db, 'organizations', params.orgId, 'domains', params.domainId), {
      dkimSelectors: params.dkimSelectors.slice(0, 15),
      scheduleFrequency: params.scheduleFrequency,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMonitoredDomain(params: {
  orgId: string;
  domainId: string;
  domain: string;
  actorId: string;
  actorEmail: string;
  memberUids: string[];
}) {
  const path = `organizations/${params.orgId}/domains/${params.domainId}`;
  try {
    await deleteDoc(doc(db, 'organizations', params.orgId, 'domains', params.domainId));
    await appendAuditLog({
      orgId: params.orgId,
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      action: 'domain.deleted',
      target: params.domain,
      memberUids: params.memberUids,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateOrganizationSettings(params: {
  orgId: string;
  updates: Partial<{
    name: string;
    language: AppLanguage;
    alertEmail: string;
    emailAlertsEnabled: boolean;
    whatsappNumber: string;
    whatsappAlertsEnabled: boolean;
  }>;
}) {
  const path = `organizations/${params.orgId}`;
  try {
    await updateDoc(doc(db, 'organizations', params.orgId), {
      ...params.updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- Service Requests, AI Operations Jobs, Stored Reports, Email Logs, Notifications ---

export async function createServiceRequestRecord(params: {
  orgId: string;
  createdBy: string;
  requesterEmail: string;
  domainId: string;
  domain: string;
  servicePackage: ServicePackageId;
  language: AppLanguage;
  priority: 'standard' | 'urgent';
  customerNotes: string;
  memberUids: string[];
}): Promise<string> {
  const requestId = makeSafeId('req');
  const path = `organizations/${params.orgId}/serviceRequests/${requestId}`;
  try {
    await setDoc(doc(db, 'organizations', params.orgId, 'serviceRequests', requestId), {
      orgId: params.orgId,
      createdBy: params.createdBy,
      requesterEmail: params.requesterEmail.slice(0, 254),
      domainId: params.domainId,
      domain: params.domain.slice(0, 253),
      servicePackage: params.servicePackage,
      language: params.language,
      priority: params.priority,
      customerNotes: params.customerNotes.slice(0, 2000),
      status: 'queued',
      memberUids: params.memberUids.slice(0, 25),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return requestId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function persistAgentJobExecution(params: {
  orgId: string;
  serviceRequestId: string;
  domainId: string;
  domain: string;
  servicePackage: ServicePackageId;
  language: AppLanguage;
  actorUid: string;
  actorEmail: string;
  memberUids: string[];
  result: AgentExecutionApiResponse;
}) {
  const { result } = params;
  const jobId = result.jobId.replace(/[^a-zA-Z0-9_-]/g, '');
  const path = `organizations/${params.orgId}/agentJobs/${jobId}`;

  try {
    let scanId: string | undefined;
    if (result.scan) {
      scanId = await saveDomainScanToFirestore({
        orgId: params.orgId,
        domainId: params.domainId,
        triggeredBy: params.actorUid,
        actorEmail: params.actorEmail,
        triggerType: 'manual',
        scan: result.scan,
        memberUids: params.memberUids,
      });
    }

    const batch = writeBatch(db);
    const jobRef = doc(db, 'organizations', params.orgId, 'agentJobs', jobId);
    const existingJob = await getDoc(jobRef);

    const jobPayload: Record<string, unknown> = {
      orgId: params.orgId,
      serviceRequestId: params.serviceRequestId,
      domainId: params.domainId,
      domain: params.domain,
      servicePackage: params.servicePackage,
      language: params.language,
      status: result.status,
      attempts: result.attempts,
      maxAttempts: result.maxAttempts,
      aiProviderAvailable: result.aiProviderAvailable,
      aiModel: result.aiModel,
      policySummary: result.policySummary.slice(0, 500),
      steps: result.steps,
      toolCalls: result.toolCalls,
      emailDeliveryStatus: result.emailDelivery.status,
      emailDeliveryDetail: result.emailDelivery.detail.slice(0, 500),
      memberUids: params.memberUids.slice(0, 25),
      updatedAt: serverTimestamp(),
    };
    if (result.aiDegradedReason) jobPayload.aiDegradedReason = result.aiDegradedReason.slice(0, 500);
    if (result.aiClassification) jobPayload.aiClassification = result.aiClassification.slice(0, 200);
    if (result.executiveNarrative) jobPayload.executiveNarrative = result.executiveNarrative.slice(0, 3000);
    if (result.prioritizedActions) jobPayload.prioritizedActions = result.prioritizedActions.slice(0, 15);
    if (scanId) jobPayload.scanId = scanId;
    if (result.scan) jobPayload.score = result.scan.score;
    if (result.reportSha256) jobPayload.reportSha256 = result.reportSha256;
    if (result.errorMessage) jobPayload.errorMessage = result.errorMessage.slice(0, 1000);

    if (existingJob.exists()) {
      batch.update(jobRef, jobPayload);
    } else {
      batch.set(jobRef, { ...jobPayload, createdAt: serverTimestamp() });
    }

    const reqRef = doc(db, 'organizations', params.orgId, 'serviceRequests', params.serviceRequestId);
    batch.update(reqRef, {
      status: result.status,
      latestJobId: jobId,
      updatedAt: serverTimestamp(),
    });

    if (scanId && result.scan && result.reportSha256 && result.reportLanguage) {
      const reportRef = doc(db, 'organizations', params.orgId, 'reports', makeSafeId('rep'));
      batch.set(reportRef, {
        orgId: params.orgId,
        domainId: params.domainId,
        domain: params.domain,
        scanId,
        jobId,
        language: result.reportLanguage,
        score: result.scan.score,
        sha256: result.reportSha256,
        integritySig: result.scan.integritySig,
        generatedBy: params.actorUid,
        generatedAtIso: new Date().toISOString(),
        memberUids: params.memberUids.slice(0, 25),
        createdAt: serverTimestamp(),
      });
    }

    if (result.emailDelivery.attempted && result.emailDelivery.recipient && result.emailDelivery.status !== 'skipped') {
      const emailLogRef = doc(db, 'organizations', params.orgId, 'emailLogs', makeSafeId('mail'));
      batch.set(emailLogRef, {
        orgId: params.orgId,
        recipient: result.emailDelivery.recipient.slice(0, 254),
        category: 'job_report',
        subject: `AstaSecure Report Ready — ${params.domain}`,
        status: result.emailDelivery.status,
        detail: result.emailDelivery.detail.slice(0, 500),
        relatedJobId: jobId,
        memberUids: params.memberUids.slice(0, 25),
        sentAtIso: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });
    }

    const notifRef = doc(db, 'organizations', params.orgId, 'notifications', makeSafeId('notif'));
    const notifSeverity =
      result.status === 'completed'
        ? 'success'
        : result.status === 'degraded_retryable' || result.status === 'waiting_for_customer'
          ? 'warning'
          : 'error';
    const notifTitle =
      result.status === 'completed'
        ? `AI Operations Completed: ${params.domain}`
        : result.status === 'degraded_retryable'
          ? `AI Operations Degraded (Retryable): ${params.domain}`
          : result.status === 'waiting_for_customer'
            ? `Action Required for ${params.domain}`
            : `AI Operations Job Halted: ${params.domain}`;
    const notifBody =
      result.scan
        ? `Score ${result.scan.score}/100 recorded.${result.aiDegradedReason ? ` AI Notice: ${result.aiDegradedReason}` : ''}`
        : result.errorMessage || result.policySummary;

    batch.set(notifRef, {
      orgId: params.orgId,
      title: notifTitle.slice(0, 160),
      body: notifBody.slice(0, 1000),
      category: 'agent_job',
      severity: notifSeverity,
      read: false,
      relatedJobId: jobId,
      relatedDomain: params.domain,
      memberUids: params.memberUids.slice(0, 25),
      createdAtIso: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    await appendAuditLog({
      orgId: params.orgId,
      actorId: params.actorUid,
      actorEmail: params.actorEmail,
      action: `agent.job_${result.status}`,
      target: params.domain,
      details: `Job ${jobId} (${params.servicePackage}) · AI: ${result.aiProviderAvailable ? 'OK' : 'Unavailable'}${result.scan ? ` · Score ${result.scan.score}/100` : ''}`,
      memberUids: params.memberUids,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function recordStoredReport(params: {
  orgId: string;
  domainId: string;
  domain: string;
  scanId: string;
  language: 'en' | 'fr';
  score: number;
  sha256: string;
  integritySig: string;
  generatedBy: string;
  memberUids: string[];
}) {
  const reportId = makeSafeId('rep');
  const path = `organizations/${params.orgId}/reports/${reportId}`;
  try {
    await setDoc(doc(db, 'organizations', params.orgId, 'reports', reportId), {
      orgId: params.orgId,
      domainId: params.domainId,
      domain: params.domain,
      scanId: params.scanId,
      language: params.language,
      score: params.score,
      sha256: params.sha256,
      integritySig: params.integritySig,
      generatedBy: params.generatedBy,
      generatedAtIso: new Date().toISOString(),
      memberUids: params.memberUids.slice(0, 25),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markNotificationRead(orgId: string, notifId: string, read = true) {
  const path = `organizations/${orgId}/notifications/${notifId}`;
  try {
    await updateDoc(doc(db, 'organizations', orgId, 'notifications', notifId), { read });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function inviteOrgMember(params: {
  orgId: string;
  orgName: string;
  email: string;
  role: 'admin' | 'member';
  invitedBy: string;
  actorEmail: string;
  memberUids: string[];
}) {
  const inviteId = makeSafeId('inv');
  const path = `invitations/${inviteId}`;
  try {
    await setDoc(doc(db, 'invitations', inviteId), {
      orgId: params.orgId,
      orgName: params.orgName.slice(0, 120),
      email: params.email.trim().toLowerCase().slice(0, 254),
      role: params.role,
      invitedBy: params.invitedBy,
      status: 'pending',
      memberUids: params.memberUids.slice(0, 25),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await appendAuditLog({
      orgId: params.orgId,
      actorId: params.invitedBy,
      actorEmail: params.actorEmail,
      action: 'team.invited',
      target: params.email.trim().toLowerCase(),
      details: `Invited with role: ${params.role}`,
      memberUids: params.memberUids,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function listPendingInvitationsForEmail(email: string) {
  const path = 'invitations';
  try {
    const q = query(
      collection(db, 'invitations'),
      where('email', '==', email.trim().toLowerCase()),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as {
      id: string;
      orgId: string;
      orgName: string;
      email: string;
      role: 'admin' | 'member';
      memberUids: string[];
    }[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function acceptOrganizationInvitation(params: {
  invitationId: string;
  orgId: string;
  orgName: string;
  role: 'admin' | 'member';
  uid: string;
  email: string;
  displayName: string;
  existingMemberUids: string[];
}) {
  const path = `organizations/${params.orgId}/members/${params.uid}`;
  try {
    const nextMemberUids = Array.from(new Set([...params.existingMemberUids, params.uid])).slice(0, 25);
    const batch = writeBatch(db);

    batch.update(doc(db, 'invitations', params.invitationId), {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'organizations', params.orgId, 'members', params.uid), {
      userId: params.uid,
      orgId: params.orgId,
      email: params.email.slice(0, 254),
      displayName: (params.displayName || params.email.split('@')[0]).slice(0, 120),
      role: params.role,
      status: 'active',
      invitationId: params.invitationId,
      memberUids: nextMemberUids,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'users', params.uid, 'memberships', params.orgId), {
      orgId: params.orgId,
      orgName: params.orgName.slice(0, 120),
      role: params.role,
      joinedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'organizations', params.orgId), {
      memberUids: nextMemberUids,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    await updateUserProfile(params.uid, { activeOrgId: params.orgId });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncDomainMemberAccess(orgId: string, domains: MonitoredDomainDoc[], memberUids: string[]) {
  try {
    const batch = writeBatch(db);
    let dirty = false;
    for (const dom of domains) {
      const current = new Set(dom.memberUids || []);
      const missing = memberUids.some((u) => !current.has(u));
      if (missing) {
        dirty = true;
        batch.update(doc(db, 'organizations', orgId, 'domains', dom.id), {
          memberUids: memberUids.slice(0, 25),
          updatedAt: serverTimestamp(),
        });
      }
    }
    if (dirty) await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `organizations/${orgId}/domains`);
  }
}

export async function updateMemberRole(params: {
  orgId: string;
  targetUserId: string;
  newRole: OrgRole;
  actorId: string;
  actorEmail: string;
  memberUids: string[];
}) {
  const path = `organizations/${params.orgId}/members/${params.targetUserId}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'organizations', params.orgId, 'members', params.targetUserId), {
      role: params.newRole,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    await appendAuditLog({
      orgId: params.orgId,
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      action: 'team.role_changed',
      target: params.targetUserId,
      details: `Updated role to ${params.newRole}`,
      memberUids: params.memberUids,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeOrgMember(params: {
  orgId: string;
  targetUserId: string;
  currentMemberUids: string[];
  actorId: string;
  actorEmail: string;
}) {
  const path = `organizations/${params.orgId}/members/${params.targetUserId}`;
  try {
    const nextUids = params.currentMemberUids.filter((u) => u !== params.targetUserId);
    const batch = writeBatch(db);
    batch.delete(doc(db, 'organizations', params.orgId, 'members', params.targetUserId));
    if (nextUids.length > 0) {
      batch.update(doc(db, 'organizations', params.orgId), {
        memberUids: nextUids,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    await appendAuditLog({
      orgId: params.orgId,
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      action: 'team.member_removed',
      target: params.targetUserId,
      memberUids: nextUids.length > 0 ? nextUids : [params.actorId],
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function listPlans(): Promise<SubscriptionPlanDoc[]> {
  const path = 'plans';
  try {
    const snap = await getDocs(collection(db, 'plans'));
    if (snap.empty) return DEFAULT_PLANS;
    const map = new Map<string, SubscriptionPlanDoc>();
    for (const d of snap.docs) {
      map.set(d.id, d.data() as SubscriptionPlanDoc);
    }
    return DEFAULT_PLANS.map((def) => map.get(def.id) || def);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function savePlanConfig(plan: SubscriptionPlanDoc) {
  const path = `plans/${plan.id}`;
  try {
    await setDoc(doc(db, 'plans', plan.id), {
      ...plan,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function submitContactInquiry(params: {
  name: string;
  email: string;
  company?: string;
  serviceCategory?: string;
  domain?: string;
  consentAccepted?: boolean;
  emailDeliveryStatus?: 'sent' | 'failed' | 'unconfigured';
  emailDeliveryDetail?: string;
  message: string;
}) {
  const inquiryId = makeSafeId('inq');
  const path = `contactInquiries/${inquiryId}`;
  try {
    const payload: Record<string, unknown> = {
      name: params.name.trim().slice(0, 120),
      email: params.email.trim().slice(0, 254),
      company: (params.company || '').trim().slice(0, 120),
      message: params.message.trim().slice(0, 2000),
      createdAt: serverTimestamp(),
    };
    if (params.serviceCategory) payload.serviceCategory = params.serviceCategory.trim().slice(0, 120);
    if (params.domain) payload.domain = params.domain.trim().slice(0, 253);
    if (typeof params.consentAccepted === 'boolean') payload.consentAccepted = params.consentAccepted;
    if (params.emailDeliveryStatus) payload.emailDeliveryStatus = params.emailDeliveryStatus;
    if (params.emailDeliveryDetail) payload.emailDeliveryDetail = params.emailDeliveryDetail.slice(0, 500);

    await setDoc(doc(db, 'contactInquiries', inquiryId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function checkIsPlatformAdmin(uid: string, email: string | null): Promise<boolean> {
  if (email && email.toLowerCase() === 'nassimjarboui111@gmail.com') {
    return true;
  }
  const path = `admins/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function adminListAllOrganizations(): Promise<OrganizationDoc[]> {
  const path = 'organizations';
  try {
    const snap = await getDocs(collection(db, 'organizations'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OrganizationDoc, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function adminListAllUsers() {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as {
      uid: string;
      email: string;
      displayName: string;
      activeOrgId?: string;
      totpEnabled: boolean;
      preferredLang: AppLanguage;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function adminListContactInquiries() {
  const path = 'contactInquiries';
  try {
    const snap = await getDocs(query(collection(db, 'contactInquiries'), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function adminListOperationsAcrossOrgs(orgs: OrganizationDoc[]) {
  const allDomains: MonitoredDomainDoc[] = [];
  const allRequests: ServiceRequestDoc[] = [];
  const allJobs: AgentJobDoc[] = [];
  const allEmailLogs: EmailDeliveryLogDoc[] = [];
  let totalScans = 0;

  for (const org of orgs) {
    try {
      const [domSnap, scanSnap, reqSnap, jobSnap, emailSnap] = await Promise.all([
        getDocs(collection(db, 'organizations', org.id, 'domains')),
        getDocs(collection(db, 'organizations', org.id, 'scans')),
        getDocs(collection(db, 'organizations', org.id, 'serviceRequests')),
        getDocs(collection(db, 'organizations', org.id, 'agentJobs')),
        getDocs(collection(db, 'organizations', org.id, 'emailLogs')),
      ]);
      domSnap.docs.forEach((d) => allDomains.push({ id: d.id, ...(d.data() as Omit<MonitoredDomainDoc, 'id'>) }));
      totalScans += scanSnap.size;
      reqSnap.docs.forEach((d) => allRequests.push({ id: d.id, ...(d.data() as Omit<ServiceRequestDoc, 'id'>) }));
      jobSnap.docs.forEach((d) => allJobs.push({ id: d.id, ...(d.data() as Omit<AgentJobDoc, 'id'>) }));
      emailSnap.docs.forEach((d) => allEmailLogs.push({ id: d.id, ...(d.data() as Omit<EmailDeliveryLogDoc, 'id'>) }));
    } catch {
      // Skip any inaccessible org subcollection cleanly
    }
  }

  return { allDomains, totalScans, allRequests, allJobs, allEmailLogs };
}

export async function adminAssignOrganizationPlan(params: {
  orgId: string;
  plan: PlanId;
  domainLimit: number;
  scanQuotaDaily: number;
}) {
  const path = `organizations/${params.orgId}`;
  try {
    await updateDoc(doc(db, 'organizations', params.orgId), {
      plan: params.plan,
      domainLimit: params.domainLimit,
      scanQuotaDaily: params.scanQuotaDaily,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminGrantPlatformAdmin(params: {
  targetUid: string;
  targetEmail: string;
  grantedByUid: string;
}) {
  const path = `admins/${params.targetUid}`;
  try {
    await setDoc(doc(db, 'admins', params.targetUid), {
      uid: params.targetUid,
      email: params.targetEmail.trim().toLowerCase(),
      grantedBy: params.grantedByUid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAccountData(uid: string, ownedOrgId?: string) {
  try {
    if (ownedOrgId) {
      const subCols = ['domains', 'scans', 'serviceRequests', 'agentJobs', 'reports', 'emailLogs', 'notifications', 'auditLogs', 'members'];
      for (const colName of subCols) {
        const snap = await getDocs(collection(db, 'organizations', ownedOrgId, colName));
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      }
      await deleteDoc(doc(db, 'organizations', ownedOrgId));
    }

    const myMemberships = await getDocs(collection(db, 'users', uid, 'memberships'));
    for (const m of myMemberships.docs) {
      await deleteDoc(m.ref);
    }
    try {
      await deleteDoc(doc(db, 'users', uid, 'secrets', 'totp'));
    } catch {
      // May not exist
    }
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
}
