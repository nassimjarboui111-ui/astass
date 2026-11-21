import crypto from 'crypto';
import { ENV } from '../config/env.ts';
import type { DnsQueryResult } from './dnsClient.ts';
import { PUBLIC_RESOLVERS, queryDohResolver } from './dnsClient.ts';

export interface OwnershipTokenPayload {
  token: string;
  recordNameApex: string;
  recordNameSubdomain: string;
  expiresAtIso: string;
}

export interface ResolverVerificationDetail {
  resolver: string;
  found: boolean;
  technicalError?: string;
  matchedLocation?: string;
  observedRecords: string[];
  queriedAt: string;
}

export interface OwnershipVerificationOutcome {
  status: 'verified' | 'pending' | 'technical_error';
  message: string;
  verifiedAtIso?: string;
  ownershipProof?: string;
  resolvers: [ResolverVerificationDetail, ResolverVerificationDetail];
}

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateOwnershipToken(domain: string): OwnershipTokenPayload {
  const randomHex = crypto.randomBytes(16).toString('hex');
  const token = `astasecure-verify=${randomHex}`;
  const expiresAtIso = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  return {
    token,
    recordNameApex: domain,
    recordNameSubdomain: `_astasecure.${domain}`,
    expiresAtIso,
  };
}

export function createOwnershipProof(
  orgId: string,
  domain: string,
  token: string,
  expiresAtIso: string
): string {
  const verifiedAt = new Date().toISOString();
  const payload = `${orgId}|${domain}|${token}|${expiresAtIso}|${verifiedAt}`;
  const sig = crypto
    .createHmac('sha256', ENV.scanSigningSecret)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}|${sig}`, 'utf-8').toString('base64url');
}

export function verifyOwnershipProof(
  proof: string | undefined,
  orgId: string,
  domain: string,
  token: string
): { valid: boolean; reason?: string } {
  if (!proof) {
    return { valid: false, reason: 'Missing server ownership proof.' };
  }
  try {
    const decoded = Buffer.from(proof, 'base64url').toString('utf-8');
    const parts = decoded.split('|');
    if (parts.length !== 6) {
      return { valid: false, reason: 'Malformed ownership proof.' };
    }
    const [pOrgId, pDomain, pToken, pExpiresAt, pVerifiedAt, pSig] = parts;
    if (pOrgId !== orgId || pDomain !== domain || pToken !== token) {
      return { valid: false, reason: 'Ownership proof mismatch.' };
    }
    if (Date.now() > Date.parse(pExpiresAt)) {
      return { valid: false, reason: 'Ownership verification token expired (7-day window).' };
    }
    if (!/^[0-9a-f]{64}$/i.test(pSig)) {
      return { valid: false, reason: 'Invalid ownership proof signature format.' };
    }
    const expectedSig = crypto
      .createHmac('sha256', ENV.scanSigningSecret)
      .update(`${pOrgId}|${pDomain}|${pToken}|${pExpiresAt}|${pVerifiedAt}`)
      .digest('hex');
    const a = Buffer.from(pSig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, reason: 'Invalid ownership proof signature.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Unreadable ownership proof.' };
  }
}

async function checkSingleResolver(
  domain: string,
  expectedToken: string,
  resolverKey: keyof typeof PUBLIC_RESOLVERS
): Promise<ResolverVerificationDetail> {
  const subDomain = `_astasecure.${domain}`;
  const [apexRes, subRes]: [DnsQueryResult, DnsQueryResult] = await Promise.all([
    queryDohResolver(domain, 'TXT', resolverKey, false),
    queryDohResolver(subDomain, 'TXT', resolverKey, false),
  ]);

  if (!apexRes.ok && !subRes.ok) {
    return {
      resolver: PUBLIC_RESOLVERS[resolverKey].name,
      found: false,
      technicalError: apexRes.technicalError || subRes.technicalError || 'DNS lookup error',
      observedRecords: [],
      queriedAt: apexRes.queriedAt,
    };
  }

  const normalizedToken = expectedToken.trim();
  const inApex = apexRes.ok && apexRes.records.some((r) => r.trim() === normalizedToken);
  const inSub = subRes.ok && subRes.records.some((r) => r.trim() === normalizedToken);

  return {
    resolver: PUBLIC_RESOLVERS[resolverKey].name,
    found: inApex || inSub,
    matchedLocation: inSub ? subDomain : inApex ? domain : undefined,
    observedRecords: [...subRes.records, ...apexRes.records].slice(0, 10),
    queriedAt: apexRes.queriedAt,
  };
}

export async function verifyDomainOwnershipAcrossResolvers(
  orgId: string,
  domain: string,
  expectedToken: string,
  expiresAtIso: string
): Promise<OwnershipVerificationOutcome> {
  if (!expectedToken.startsWith('astasecure-verify=')) {
    return {
      status: 'pending',
      message: 'Invalid verification token format.',
      resolvers: [
        { resolver: PUBLIC_RESOLVERS.cloudflare.name, found: false, observedRecords: [], queriedAt: new Date().toISOString() },
        { resolver: PUBLIC_RESOLVERS.google.name, found: false, observedRecords: [], queriedAt: new Date().toISOString() },
      ],
    };
  }

  if (Date.now() > Date.parse(expiresAtIso)) {
    return {
      status: 'pending',
      message: 'Verification token expired (7-day limit). Generate a new token and publish the TXT record.',
      resolvers: [
        { resolver: PUBLIC_RESOLVERS.cloudflare.name, found: false, observedRecords: [], queriedAt: new Date().toISOString() },
        { resolver: PUBLIC_RESOLVERS.google.name, found: false, observedRecords: [], queriedAt: new Date().toISOString() },
      ],
    };
  }

  const [cf, google] = await Promise.all([
    checkSingleResolver(domain, expectedToken, 'cloudflare'),
    checkSingleResolver(domain, expectedToken, 'google'),
  ]);

  if (cf.technicalError && google.technicalError) {
    return {
      status: 'technical_error',
      message: 'Both public DNS resolvers failed to respond. This is a technical error, not a missing record.',
      resolvers: [cf, google],
    };
  }

  // Require confirmation from both independent public resolvers (or if one had a transient error, do not fake verification)
  if (cf.found && google.found) {
    const verifiedAtIso = new Date().toISOString();
    const ownershipProof = createOwnershipProof(orgId, domain, expectedToken, expiresAtIso);
    return {
      status: 'verified',
      message: 'Domain ownership verified by both Cloudflare (1.1.1.1) and Google (8.8.8.8) public DNS resolvers.',
      verifiedAtIso,
      ownershipProof,
      resolvers: [cf, google],
    };
  }

  if ((cf.found && google.technicalError) || (google.found && cf.technicalError)) {
    return {
      status: 'technical_error',
      message: 'One public DNS resolver confirmed the record while the second resolver encountered a technical timeout. Retry shortly.',
      resolvers: [cf, google],
    };
  }

  return {
    status: 'pending',
    message: 'Verification TXT record is not visible yet on both public resolvers. DNS propagation can take up to 24 hours.',
    resolvers: [cf, google],
  };
}
