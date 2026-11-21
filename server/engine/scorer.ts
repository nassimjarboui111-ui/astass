import crypto from 'crypto';
import { ENV } from '../config/env.ts';
import type { CheckId, DnsCheckResult, Severity } from '../../src/types/astasecure.ts';

export const SEVERITY_DEDUCTION: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  none: 0,
};

export interface ScoreComputation {
  score: number;
  maxScore: 100;
  riskPoints: number;
  deductions: {
    checkId: CheckId;
    severity: Severity;
    pointsRemoved: number;
    reason: string;
  }[];
}

export function computeAuthoritativeScore(checks: DnsCheckResult[]): ScoreComputation {
  let totalRemoved = 0;
  const deductions: ScoreComputation['deductions'] = [];

  for (const check of checks) {
    // CRITICAL RULE: "Not verified" and "Technical error" NEVER reduce score
    if (check.status === 'not_verified' || check.status === 'technical_error') {
      check.pointsRemoved = 0;
      continue;
    }

    const pts = check.pointsRemoved > 0 ? check.pointsRemoved : SEVERITY_DEDUCTION[check.severity];
    if (pts > 0) {
      check.pointsRemoved = pts;
      totalRemoved += pts;
      deductions.push({
        checkId: check.id,
        severity: check.severity,
        pointsRemoved: pts,
        reason: check.summary,
      });
    } else {
      check.pointsRemoved = 0;
    }
  }

  const score = Math.max(0, 100 - totalRemoved);
  const riskPoints = 100 - score;

  return {
    score,
    maxScore: 100,
    riskPoints,
    deductions,
  };
}

export function signScanResult(params: {
  orgId: string;
  domain: string;
  score: number;
  riskPoints: number;
  scannedAtIso: string;
  checks: DnsCheckResult[];
}): string {
  const canonical = JSON.stringify({
    orgId: params.orgId,
    domain: params.domain,
    score: params.score,
    riskPoints: params.riskPoints,
    scannedAtIso: params.scannedAtIso,
    checks: params.checks.map((c) => ({
      id: c.id,
      status: c.status,
      severity: c.severity,
      pointsRemoved: c.pointsRemoved,
    })),
  });
  return crypto
    .createHmac('sha256', ENV.scanSigningSecret)
    .update(canonical)
    .digest('hex');
}

export function verifyScanSignature(params: {
  orgId: string;
  domain: string;
  score: number;
  riskPoints: number;
  scannedAtIso: string;
  checks: DnsCheckResult[];
  integritySig: string;
}): boolean {
  try {
    if (!/^[0-9a-f]{64}$/i.test(params.integritySig)) {
      return false;
    }
    const expected = signScanResult(params);
    const a = Buffer.from(params.integritySig, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
