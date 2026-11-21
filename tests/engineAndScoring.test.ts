import * as OTPAuth from 'otpauth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dnsClient from '../server/engine/dnsClient';
import {
  createOwnershipProof,
  generateOwnershipToken,
  verifyOwnershipProof,
} from '../server/engine/ownershipVerifier';
import { buildRemediationGuide } from '../server/engine/remediation';
import {
  countSpfDnsLookups,
  detectDnsProvider,
  runDkimCheck,
  runDmarcCheck,
  runSpfCheck,
} from '../server/engine/scanner';
import {
  computeAuthoritativeScore,
  signScanResult,
  verifyScanSignature,
} from '../server/engine/scorer';
import { generateScanPdfBuffer } from '../server/reports/pdfGenerator';
import { generateTotpEnrollment, verifyTotpToken } from '../server/services/totp';
import { DnsCheckResult, DnsProviderId, DomainScanResult } from '../src/types/astasecure';

describe('Security Scoring & Cryptographic Integrity', () => {
  it('starts at 100 and never penalizes not_verified or technical_error', () => {
    const checks: DnsCheckResult[] = [
      {
        id: 'dmarc',
        name: 'DMARC',
        purposeKey: 'dmarc',
        status: 'missing',
        severity: 'critical',
        pointsRemoved: 25,
        summary: 'No DMARC',
        riskExplanation: 'Risk',
        recommendedAction: 'Fix',
        evidence: { resolver: '1.1.1.1', queriedAt: '2026-01-01T00:00:00Z', recordType: 'TXT', queryName: '_dmarc.a.tn', rawRecords: [] },
      },
      {
        id: 'spf',
        name: 'SPF',
        purposeKey: 'spf',
        status: 'missing',
        severity: 'high',
        pointsRemoved: 15,
        summary: 'No SPF',
        riskExplanation: 'Risk',
        recommendedAction: 'Fix',
        evidence: { resolver: '1.1.1.1', queriedAt: '2026-01-01T00:00:00Z', recordType: 'TXT', queryName: 'a.tn', rawRecords: [] },
      },
      {
        id: 'dkim',
        name: 'DKIM',
        purposeKey: 'dkim',
        status: 'not_verified',
        severity: 'none',
        pointsRemoved: 99, // Verify authoritative scorer forces this to 0
        summary: 'Selector needed',
        riskExplanation: 'None',
        recommendedAction: 'Add selector',
        evidence: { resolver: '1.1.1.1', queriedAt: '2026-01-01T00:00:00Z', recordType: 'TXT', queryName: '_domainkey.a.tn', rawRecords: [] },
      },
      {
        id: 'dnssec',
        name: 'DNSSEC',
        purposeKey: 'dnssec',
        status: 'technical_error',
        severity: 'medium',
        pointsRemoved: 8, // Verify authoritative scorer forces technical_error to 0
        summary: 'Timeout',
        riskExplanation: 'None',
        recommendedAction: 'Retry',
        evidence: { resolver: '1.1.1.1', queriedAt: '2026-01-01T00:00:00Z', recordType: 'DS', queryName: 'a.tn', rawRecords: [] },
      },
    ];

    const computed = computeAuthoritativeScore(checks);
    expect(computed.score).toBe(60); // 100 - 25 - 15
    expect(computed.riskPoints).toBe(40);
    expect(checks[2].pointsRemoved).toBe(0);
    expect(checks[3].pointsRemoved).toBe(0);

    const sig = signScanResult({
      orgId: 'org_1',
      domain: 'a.tn',
      score: computed.score,
      riskPoints: computed.riskPoints,
      scannedAtIso: '2026-01-01T00:00:00Z',
      checks,
    });

    expect(
      verifyScanSignature({
        orgId: 'org_1',
        domain: 'a.tn',
        score: 60,
        riskPoints: 40,
        scannedAtIso: '2026-01-01T00:00:00Z',
        checks,
        integritySig: sig,
      })
    ).toBe(true);

    // Tampering score fails verification
    expect(
      verifyScanSignature({
        orgId: 'org_1',
        domain: 'a.tn',
        score: 100,
        riskPoints: 0,
        scannedAtIso: '2026-01-01T00:00:00Z',
        checks,
        integritySig: sig,
      })
    ).toBe(false);
  });

  it('verifies 7-day TXT token generation and HMAC ownership proof', () => {
    const tok = generateOwnershipToken('acme.tn');
    expect(tok.token.startsWith('astasecure-verify=')).toBe(true);
    expect(tok.recordNameSubdomain).toBe('_astasecure.acme.tn');

    const proof = createOwnershipProof('org_1', 'acme.tn', tok.token, tok.expiresAtIso);
    expect(verifyOwnershipProof(proof, 'org_1', 'acme.tn', tok.token).valid).toBe(true);
    expect(verifyOwnershipProof(proof, 'org_other', 'acme.tn', tok.token).valid).toBe(false);

    const expiredProof = createOwnershipProof('org_1', 'acme.tn', tok.token, '2020-01-01T00:00:00Z');
    expect(verifyOwnershipProof(expiredProof, 'org_1', 'acme.tn', tok.token).valid).toBe(false);
  });
});

describe('DNS Security Engine Parsing & Accuracy Rules', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detects all supported DNS providers accurately from NS records', () => {
    expect(detectDnsProvider(['ns1.cloudflare.com', 'ns2.cloudflare.com'])).toBe('cloudflare');
    expect(detectDnsProvider(['dns101.ovh.net', 'ns101.ovh.net'])).toBe('ovhcloud');
    expect(detectDnsProvider(['ns11.domaincontrol.com'])).toBe('godaddy');
    expect(detectDnsProvider(['ns-123.awsdns-12.org'])).toBe('aws_route53');
    expect(detectDnsProvider(['ns1-01.azure-dns.com'])).toBe('azure_dns');
    expect(detectDnsProvider(['dns1.registrar-servers.com'])).toBe('namecheap');
    expect(detectDnsProvider(['ns-10-a.gandi.net'])).toBe('gandi');
    expect(detectDnsProvider(['ns101.ui-dns.com'])).toBe('ionos');
    expect(detectDnsProvider(['ns1.dns-parking.com'])).toBe('hostinger');
    expect(detectDnsProvider(['ns1.ati.tn'])).toBe('generic');
  });

  it('flags SPF +all as Critical (-25) and enforces 10-lookup limit', async () => {
    vi.spyOn(dnsClient, 'queryWithFallback').mockResolvedValue({
      ok: true,
      records: ['v=spf1 a mx +all'],
      resolver: 'Mocked DoH',
      queriedAt: '2026-01-01T00:00:00Z',
      adFlag: false,
    });

    const spfPlusAll = await runSpfCheck('acme.tn');
    expect(spfPlusAll.status).toBe('confirmed');
    expect(spfPlusAll.severity).toBe('critical');
    expect(spfPlusAll.pointsRemoved).toBe(25);

    const lookupTest = await countSpfDnsLookups(
      'v=spf1 a mx a:1.t a:2.t a:3.t a:4.t a:5.t a:6.t a:7.t a:8.t a:9.t -all',
      'acme.tn'
    );
    expect(lookupTest.lookups).toBe(11);
    expect(lookupTest.exceeded).toBe(true);
  });

  it('evaluates DMARC missing (-25), p=none (-8), and p=reject (0)', async () => {
    const spy = vi.spyOn(dnsClient, 'queryWithFallback');

    spy.mockResolvedValueOnce({
      ok: true,
      records: [],
      resolver: 'Mock',
      queriedAt: '2026-01-01T00:00:00Z',
      adFlag: false,
    });
    const missing = await runDmarcCheck('acme.tn');
    expect(missing.result.status).toBe('missing');
    expect(missing.result.pointsRemoved).toBe(25);

    spy.mockResolvedValueOnce({
      ok: true,
      records: ['v=DMARC1; p=none; rua=mailto:dmarc@acme.tn'],
      resolver: 'Mock',
      queriedAt: '2026-01-01T00:00:00Z',
      adFlag: false,
    });
    const pNone = await runDmarcCheck('acme.tn');
    expect(pNone.stage).toBe('p_none');
    expect(pNone.result.severity).toBe('medium');
    expect(pNone.result.pointsRemoved).toBe(8);

    spy.mockResolvedValueOnce({
      ok: true,
      records: ['v=DMARC1; p=reject; pct=100; rua=mailto:dmarc@acme.tn'],
      resolver: 'Mock',
      queriedAt: '2026-01-01T00:00:00Z',
      adFlag: false,
    });
    const pReject = await runDmarcCheck('acme.tn');
    expect(pReject.stage).toBe('p_reject');
    expect(pReject.result.pointsRemoved).toBe(0);
  });

  it('never marks DKIM as missing when no custom selector is provided', async () => {
    vi.spyOn(dnsClient, 'queryWithFallback').mockResolvedValue({
      ok: true,
      records: [],
      resolver: 'Mock',
      queriedAt: '2026-01-01T00:00:00Z',
      adFlag: false,
    });

    const withoutSelector = await runDkimCheck('acme.tn', []);
    expect(withoutSelector.status).toBe('not_verified');
    expect(withoutSelector.pointsRemoved).toBe(0);

    const withCustomMissing = await runDkimCheck('acme.tn', ['mailjet2026']);
    expect(withCustomMissing.status).toBe('missing');
    expect(withCustomMissing.pointsRemoved).toBe(15);
  });
});

describe('Remediation Guides, PDF Export & TOTP 2FA', () => {
  it('builds localized remediation guides for all 10 DNS providers in EN, FR, and AR', () => {
    const providers: DnsProviderId[] = [
      'cloudflare',
      'ovhcloud',
      'godaddy',
      'aws_route53',
      'azure_dns',
      'namecheap',
      'gandi',
      'ionos',
      'hostinger',
      'generic',
    ];
    for (const provider of providers) {
      for (const lang of ['en', 'fr', 'ar'] as const) {
        const g = buildRemediationGuide({ domain: 'acme.tn', checkId: 'dmarc', provider, lang });
        expect(g.steps.length).toBeGreaterThanOrEqual(2);
        expect(g.requiredRecord.value).toContain('v=DMARC1');
      }
    }
  });

  it('generates real downloadable PDF buffers in English and French with SHA-256 fingerprint', async () => {
    const sampleScan: DomainScanResult = {
      domain: 'acme.tn',
      orgId: 'org_1',
      score: 75,
      maxScore: 100,
      riskPoints: 25,
      durationMs: 320,
      detectedProvider: 'cloudflare',
      detectedProviderLabel: 'Cloudflare',
      dmarcStage: 'missing',
      checks: [
        {
          id: 'dmarc',
          name: 'Anti-Spoofing Policy (DMARC)',
          purposeKey: 'dmarc',
          status: 'missing',
          severity: 'critical',
          pointsRemoved: 25,
          summary: 'No DMARC record published.',
          riskExplanation: 'Direct spoofing possible.',
          recommendedAction: 'Publish p=none TXT record.',
          proposedRecord: { type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=none', ttl: '3600' },
          evidence: {
            resolver: 'Cloudflare DoH',
            queriedAt: '2026-01-01T00:00:00Z',
            recordType: 'TXT',
            queryName: '_dmarc.acme.tn',
            rawRecords: [],
          },
        },
      ],
      deductions: [{ checkId: 'dmarc', severity: 'critical', pointsRemoved: 25, reason: 'No DMARC record published.' }],
      integritySig: 'a'.repeat(64),
      scannedAtIso: '2026-01-01T00:00:00Z',
    };

    const enPdf = await generateScanPdfBuffer({ organizationName: 'Acme SARL', language: 'en', scan: sampleScan });
    expect(enPdf.buffer.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
    expect(enPdf.sha256).toHaveLength(64);

    const frPdf = await generateScanPdfBuffer({ organizationName: 'Acme SARL', language: 'fr', scan: sampleScan });
    expect(frPdf.buffer.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
  });

  it('enrolls and validates TOTP 2FA codes', async () => {
    const enrollment = await generateTotpEnrollment('security@acme.tn');
    expect(enrollment.qrCodeDataUrl.startsWith('data:image/png;base64,')).toBe(true);

    const totp = new OTPAuth.TOTP({
      issuer: 'AstaSecure Monitor',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(enrollment.secret),
    });
    const code = totp.generate();
    expect(verifyTotpToken(enrollment.secret, code)).toBe(true);
    expect(verifyTotpToken(enrollment.secret, '000000')).toBe(false);
  });
});
