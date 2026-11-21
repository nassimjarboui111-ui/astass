import express from 'express';
import type { Request, Response } from 'express';
import type {
  AppLanguage,
  CheckId,
  DnsProviderId,
  DomainScanResult,
  OrgRole,
  ServicePackageId,
} from '../../src/types/astasecure.ts';
import { getAiProviderStatus } from '../agent/aiProvider.ts';
import {
  executeAgentServiceJob,
  getServerAgentJobForActor,
  listServerAgentJobs,
  retryAgentServiceJob,
} from '../agent/orchestrator.ts';
import { evaluateInboundEmailSafety } from '../agent/policyEngine.ts';
import { validateAndNormalizeDomain } from '../engine/domainValidator.ts';
import {
  generateOwnershipToken,
  verifyDomainOwnershipAcrossResolvers,
  verifyOwnershipProof,
} from '../engine/ownershipVerifier.ts';
import { buildRemediationGuide } from '../engine/remediation.ts';
import { runFullDomainScan, runSingleCheckRecheck } from '../engine/scanner.ts';
import { verifyScanSignature } from '../engine/scorer.ts';
import { requireAuth, requirePlatformAdmin, requireVerifiedEmail } from '../middleware/auth.ts';
import {
  generalApiLimiter,
  scanRateLimiter,
  totpRateLimiter,
  verificationRateLimiter,
} from '../middleware/rateLimit.ts';
import { generateScanPdfBuffer } from '../reports/pdfGenerator.ts';
import {
  dispatchContactNotification,
  dispatchEmailAlert,
  dispatchWhatsAppAlert,
  getNotificationChannelsStatus,
} from '../services/notifications.ts';
import { generateTotpEnrollment, verifyTotpToken } from '../services/totp.ts';

export const apiRouter = express.Router();

apiRouter.use(generalApiLimiter);

// Health & capabilities endpoint (never exposes secrets)
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'astasecure-monitor-api',
    channels: getNotificationChannelsStatus(),
    ai: getAiProviderStatus(),
    timestamp: new Date().toISOString(),
  });
});

// Pure syntax validation (publicly accessible for form UX, zero DNS queries)
apiRouter.post('/domains/validate', (req: Request, res: Response) => {
  const { domain } = req.body as { domain?: string };
  const result = validateAndNormalizeDomain(domain || '');
  res.status(result.valid ? 200 : 400).json(result);
});

// Public Contact Form Server-Side Email Dispatch (honest delivery reporting)
apiRouter.post('/contact/notify', async (req: Request, res: Response) => {
  const { name, email, company, serviceCategory, domain, message, consentAccepted } = req.body as {
    name?: string;
    email?: string;
    company?: string;
    serviceCategory?: string;
    domain?: string;
    message?: string;
    consentAccepted?: boolean;
  };

  if (!consentAccepted) {
    res.status(400).json({ error: 'Privacy and authorized inquiry consent must be accepted.' });
    return;
  }

  if (!name || name.trim().length < 2 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !message || message.trim().length < 10) {
    res.status(400).json({ error: 'Valid name, email, and message (min 10 chars) are required.' });
    return;
  }

  if (domain && domain.trim()) {
    const check = validateAndNormalizeDomain(domain.trim());
    if (!check.valid) {
      res.status(400).json({ error: check.errorMessage || 'Invalid domain syntax.' });
      return;
    }
  }

  const delivery = await dispatchContactNotification({
    name: name.trim(),
    email: email.trim(),
    company: company?.trim(),
    serviceCategory: serviceCategory?.trim() || 'General Inquiry',
    domain: domain?.trim(),
    message: message.trim(),
  });

  res.json(delivery);
});

// Generate a 7-day TXT ownership token for a validated domain
apiRouter.post('/domains/token', requireAuth, requireVerifiedEmail, (req: Request, res: Response) => {
  const { domain } = req.body as { domain?: string };
  const validation = validateAndNormalizeDomain(domain || '');
  if (!validation.valid || !validation.normalized) {
    res.status(400).json({ error: validation.errorMessage, code: validation.errorCode });
    return;
  }

  const tokenPayload = generateOwnershipToken(validation.normalized);
  res.json({
    domain: validation.normalized,
    ...tokenPayload,
  });
});

// Verify domain ownership via two independent public DNS resolvers (Cloudflare 1.1.1.1 & Google 8.8.8.8)
apiRouter.post(
  '/domains/verify-ownership',
  requireAuth,
  requireVerifiedEmail,
  verificationRateLimiter,
  async (req: Request, res: Response) => {
    const { orgId, domain, token, expiresAtIso } = req.body as {
      orgId?: string;
      domain?: string;
      token?: string;
      expiresAtIso?: string;
    };

    const validation = validateAndNormalizeDomain(domain || '');
    if (!validation.valid || !validation.normalized) {
      res.status(400).json({ error: validation.errorMessage, code: validation.errorCode });
      return;
    }

    if (!orgId || !token || !expiresAtIso) {
      res.status(400).json({ error: 'orgId, token, and expiresAtIso are required.' });
      return;
    }

    const outcome = await verifyDomainOwnershipAcrossResolvers(
      orgId,
      validation.normalized,
      token,
      expiresAtIso
    );
    res.json({
      domain: validation.normalized,
      ...outcome,
    });
  }
);

// Run real DNS security scan (STRICTLY enforces ownership proof + live TXT check)
apiRouter.post(
  '/scans/run',
  requireAuth,
  requireVerifiedEmail,
  scanRateLimiter,
  async (req: Request, res: Response) => {
    const {
      orgId,
      domain,
      verificationToken,
      tokenExpiresAt,
      ownershipProof,
      dkimSelectors,
      alertEmail,
      emailAlertsEnabled,
      whatsappNumber,
      whatsappAlertsEnabled,
      previousScore,
    } = req.body as {
      orgId?: string;
      domain?: string;
      verificationToken?: string;
      tokenExpiresAt?: string;
      ownershipProof?: string;
      dkimSelectors?: string[];
      alertEmail?: string;
      emailAlertsEnabled?: boolean;
      whatsappNumber?: string;
      whatsappAlertsEnabled?: boolean;
      previousScore?: number;
    };

    const validation = validateAndNormalizeDomain(domain || '');
    if (!validation.valid || !validation.normalized) {
      res.status(400).json({ error: validation.errorMessage, code: validation.errorCode });
      return;
    }

    if (!orgId || !verificationToken || !tokenExpiresAt) {
      res.status(403).json({
        error: 'Domain ownership verification is required before scanning.',
        code: 'OWNERSHIP_REQUIRED',
      });
      return;
    }

    const proofCheck = verifyOwnershipProof(
      ownershipProof,
      orgId,
      validation.normalized,
      verificationToken
    );

    if (!proofCheck.valid) {
      const liveCheck = await verifyDomainOwnershipAcrossResolvers(
        orgId,
        validation.normalized,
        verificationToken,
        tokenExpiresAt
      );
      if (liveCheck.status !== 'verified') {
        res.status(403).json({
          error: liveCheck.message || proofCheck.reason || 'Ownership verification failed.',
          code: 'OWNERSHIP_NOT_VERIFIED',
          verificationStatus: liveCheck.status,
        });
        return;
      }
    }

    const scanResult = await runFullDomainScan({
      orgId,
      domain: validation.normalized,
      dkimSelectors: Array.isArray(dkimSelectors) ? dkimSelectors : [],
    });

    const alertResults = [];
    if (typeof previousScore === 'number' && scanResult.score < previousScore) {
      const msg = `AstaSecure Monitor Alert: ${scanResult.domain} score dropped from ${previousScore}/100 to ${scanResult.score}/100.`;
      if (emailAlertsEnabled && alertEmail) {
        alertResults.push(await dispatchEmailAlert(alertEmail, `Security Alert: ${scanResult.domain}`, msg));
      }
      if (whatsappAlertsEnabled && whatsappNumber) {
        alertResults.push(await dispatchWhatsAppAlert(whatsappNumber, msg));
      }
    }

    res.json({
      scan: scanResult,
      alerts: alertResults,
    });
  }
);

// Single-check re-verification for the Guided Fix screen
apiRouter.post(
  '/scans/recheck',
  requireAuth,
  requireVerifiedEmail,
  scanRateLimiter,
  async (req: Request, res: Response) => {
    const {
      orgId,
      domain,
      checkId,
      verificationToken,
      ownershipProof,
      dkimSelectors,
    } = req.body as {
      orgId?: string;
      domain?: string;
      checkId?: CheckId;
      verificationToken?: string;
      ownershipProof?: string;
      dkimSelectors?: string[];
    };

    const validation = validateAndNormalizeDomain(domain || '');
    if (!validation.valid || !validation.normalized) {
      res.status(400).json({ error: validation.errorMessage });
      return;
    }

    if (!orgId || !verificationToken || !ownershipProof) {
      res.status(403).json({ error: 'Ownership verification is required before re-checking.' });
      return;
    }

    const proofCheck = verifyOwnershipProof(
      ownershipProof,
      orgId,
      validation.normalized,
      verificationToken
    );
    if (!proofCheck.valid) {
      res.status(403).json({ error: proofCheck.reason || 'Ownership verification required.' });
      return;
    }

    const allowedChecks: CheckId[] = ['spf', 'dmarc', 'dkim', 'mx', 'ns', 'soa', 'dnssec', 'caa', 'tls'];
    if (!checkId || !allowedChecks.includes(checkId)) {
      res.status(400).json({ error: 'Invalid checkId.' });
      return;
    }

    const checkResult = await runSingleCheckRecheck({
      domain: validation.normalized,
      checkId,
      dkimSelectors: Array.isArray(dkimSelectors) ? dkimSelectors : [],
    });

    res.json({ check: checkResult });
  }
);

// Verify integrity signature of a stored scan
apiRouter.post('/scans/verify-integrity', requireAuth, (req: Request, res: Response) => {
  const { scan } = req.body as { scan?: DomainScanResult };
  if (!scan || !scan.integritySig || !Array.isArray(scan.checks)) {
    res.status(400).json({ valid: false, error: 'Missing or malformed scan payload.' });
    return;
  }

  const valid = verifyScanSignature({
    orgId: scan.orgId,
    domain: scan.domain,
    score: scan.score,
    riskPoints: scan.riskPoints,
    scannedAtIso: scan.scannedAtIso,
    checks: scan.checks,
    integritySig: scan.integritySig,
  });

  res.json({ valid });
});

// Remediation guide endpoint
apiRouter.post('/remediation/guide', requireAuth, (req: Request, res: Response) => {
  const { domain, checkId, provider, lang, customProposedRecord } = req.body as {
    domain?: string;
    checkId?: CheckId;
    provider?: DnsProviderId;
    lang?: AppLanguage;
    customProposedRecord?: { type: string; name: string; value: string; ttl: string };
  };

  const validation = validateAndNormalizeDomain(domain || '');
  if (!validation.valid || !validation.normalized) {
    res.status(400).json({ error: validation.errorMessage });
    return;
  }

  const guide = buildRemediationGuide({
    domain: validation.normalized,
    checkId: checkId || 'dmarc',
    provider: provider || 'generic',
    lang: lang || 'en',
    customProposedRecord,
  });
  res.json({ guide });
});

// Downloadable PDF Report (English & French, verifies scan HMAC signature before generating)
apiRouter.post('/reports/pdf', requireAuth, requireVerifiedEmail, async (req: Request, res: Response) => {
  const { organizationName, language, scan } = req.body as {
    organizationName?: string;
    language?: 'en' | 'fr';
    scan?: DomainScanResult;
  };

  if (!scan || !scan.domain || !scan.integritySig || !Array.isArray(scan.checks)) {
    res.status(400).json({ error: 'Valid signed scan record is required.' });
    return;
  }

  const validSig = verifyScanSignature({
    orgId: scan.orgId,
    domain: scan.domain,
    score: scan.score,
    riskPoints: scan.riskPoints,
    scannedAtIso: scan.scannedAtIso,
    checks: scan.checks,
    integritySig: scan.integritySig,
  });

  if (!validSig) {
    res.status(403).json({
      error: 'Scan integrity signature verification failed. Client-side score manipulation is rejected.',
      code: 'INTEGRITY_CHECK_FAILED',
    });
    return;
  }

  const reportLang = language === 'fr' ? 'fr' : 'en';
  const { buffer, sha256 } = await generateScanPdfBuffer({
    organizationName: organizationName || 'Organization',
    language: reportLang,
    scan,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="AstaSecure-${scan.domain}-${reportLang}.pdf"`);
  res.setHeader('X-Report-SHA256', sha256);
  res.send(buffer);
});

// --- AstaSecure AI Operations Agent Endpoints ---

apiRouter.get('/agent/status', requireAuth, (_req: Request, res: Response) => {
  res.json({
    ai: getAiProviderStatus(),
    channels: getNotificationChannelsStatus(),
    timestamp: new Date().toISOString(),
  });
});

apiRouter.post(
  '/agent/jobs/execute',
  requireAuth,
  requireVerifiedEmail,
  scanRateLimiter,
  async (req: Request, res: Response) => {
    const body = req.body as {
      jobId?: string;
      serviceRequestId?: string;
      orgId?: string;
      orgName?: string;
      actorRole?: OrgRole;
      domainId?: string;
      domain?: string;
      verificationToken?: string;
      tokenExpiresAt?: string;
      ownershipProof?: string;
      dkimSelectors?: string[];
      servicePackage?: ServicePackageId;
      language?: AppLanguage;
      priority?: 'standard' | 'urgent';
      customerNotes?: string;
      notifyEmail?: string;
      sendEmailReport?: boolean;
    };

    if (!req.user || !body.orgId || !body.serviceRequestId || !body.domain || !body.domainId) {
      res.status(400).json({ error: 'orgId, serviceRequestId, domainId, and domain are required.' });
      return;
    }

    const allowedPackages: ServicePackageId[] = [
      'domain_assessment',
      'email_security_review',
      'dns_monitoring',
      'remediation_advisory',
    ];
    const pkg = allowedPackages.includes(body.servicePackage as ServicePackageId)
      ? (body.servicePackage as ServicePackageId)
      : 'domain_assessment';

    const normalizedRole: OrgRole =
      body.actorRole === 'owner' || body.actorRole === 'admin' ? body.actorRole : 'member';

    const result = await executeAgentServiceJob({
      jobId: body.jobId,
      serviceRequestId: body.serviceRequestId,
      orgId: body.orgId,
      orgName: body.orgName || 'Organization',
      actorUid: req.user.uid,
      actorEmail: req.user.email,
      actorEmailVerified: req.user.emailVerified,
      actorRole: normalizedRole,
      domainId: body.domainId,
      domain: body.domain,
      verificationToken: body.verificationToken || '',
      tokenExpiresAt: body.tokenExpiresAt || '',
      ownershipProof: body.ownershipProof,
      dkimSelectors: Array.isArray(body.dkimSelectors) ? body.dkimSelectors : [],
      servicePackage: pkg,
      language: body.language || 'en',
      priority: body.priority === 'urgent' ? 'urgent' : 'standard',
      customerNotes: body.customerNotes || '',
      notifyEmail: body.notifyEmail,
      sendEmailReport: Boolean(body.sendEmailReport),
    });

    res.json(result);
  }
);

apiRouter.post(
  '/agent/jobs/retry',
  requireAuth,
  requireVerifiedEmail,
  scanRateLimiter,
  async (req: Request, res: Response) => {
    const { jobId } = req.body as { jobId?: string };
    if (!req.user || !jobId) {
      res.status(400).json({ error: 'jobId is required.' });
      return;
    }

    const access = getServerAgentJobForActor(jobId, req.user.uid, req.user.isPlatformAdmin);
    if (access.status === 'not_found') {
      res.status(404).json({ error: 'Server job context not found for retry. Re-run from the service request.' });
      return;
    }
    if (access.status === 'forbidden') {
      res.status(403).json({ error: 'Forbidden: you do not have access to retry this job.', code: 'JOB_ACCESS_FORBIDDEN' });
      return;
    }

    const retried = await retryAgentServiceJob(jobId, req.user.uid, req.user.isPlatformAdmin);
    if (!retried) {
      res.status(404).json({ error: 'Server job context not found for retry. Re-run from the service request.' });
      return;
    }
    res.json(retried);
  }
);

apiRouter.get('/agent/jobs/:jobId', requireAuth, (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const access = getServerAgentJobForActor(
    String(req.params.jobId || ''),
    req.user.uid,
    req.user.isPlatformAdmin
  );
  if (access.status === 'not_found') {
    res.status(404).json({ error: 'Job not found in runtime queue.' });
    return;
  }
  if (access.status === 'forbidden') {
    res.status(403).json({ error: 'Forbidden: you do not have access to this job.', code: 'JOB_ACCESS_FORBIDDEN' });
    return;
  }
  res.json(access.job);
});

apiRouter.post('/email/inbound-evaluate', requireAuth, requireVerifiedEmail, (req: Request, res: Response) => {
  const { senderEmail, subject, body, knownOrgDomains } = req.body as {
    senderEmail?: string;
    subject?: string;
    body?: string;
    knownOrgDomains?: string[];
  };

  if (!senderEmail || !body) {
    res.status(400).json({ error: 'senderEmail and body are required.' });
    return;
  }

  const evaluation = evaluateInboundEmailSafety({
    senderEmail,
    subject: subject || '',
    body,
    knownOrgDomains: Array.isArray(knownOrgDomains) ? knownOrgDomains : [],
  });
  res.json(evaluation);
});

// Protected Platform Admin Telemetry Endpoint
apiRouter.get('/admin/overview', requireAuth, requirePlatformAdmin, (_req: Request, res: Response) => {
  res.json({
    ok: true,
    ai: getAiProviderStatus(),
    channels: getNotificationChannelsStatus(),
    runtimeQueueCount: listServerAgentJobs().length,
    recentRuntimeJobs: listServerAgentJobs().slice(-20).reverse(),
    timestamp: new Date().toISOString(),
  });
});

// TOTP 2FA setup & verification
apiRouter.post('/auth/totp/setup', requireAuth, totpRateLimiter, async (req: Request, res: Response) => {
  const email = req.user?.email || 'user@astasecure.tn';
  const enrollment = await generateTotpEnrollment(email);
  res.json(enrollment);
});

apiRouter.post('/auth/totp/verify', requireAuth, totpRateLimiter, (req: Request, res: Response) => {
  const { secret, token } = req.body as { secret?: string; token?: string };
  if (!secret || !token) {
    res.status(400).json({ valid: false, error: 'Secret and 6-digit token are required.' });
    return;
  }
  const valid = verifyTotpToken(secret, token);
  res.status(valid ? 200 : 400).json({ valid });
});

// Optional notification test endpoint
apiRouter.post('/alerts/test', requireAuth, requireVerifiedEmail, async (req: Request, res: Response) => {
  const { channel, target, domain } = req.body as {
    channel?: 'email' | 'whatsapp';
    target?: string;
    domain?: string;
  };
  if (!target) {
    res.status(400).json({ error: 'Target recipient is required.' });
    return;
  }

  const text = `AstaSecure Monitor test alert for ${domain || 'your organization'}.`;
  if (channel === 'whatsapp') {
    const out = await dispatchWhatsAppAlert(target, text);
    res.json(out);
    return;
  }
  const out = await dispatchEmailAlert(target, 'AstaSecure Monitor Test Alert', text);
  res.json(out);
});
