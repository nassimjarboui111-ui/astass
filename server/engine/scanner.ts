import net from 'net';
import tls from 'tls';
import type {
  CheckId,
  DnsCheckResult,
  DnsProviderId,
  DomainScanResult,
} from '../../src/types/astasecure.ts';
import { queryWithFallback } from './dnsClient.ts';
import { computeAuthoritativeScore, SEVERITY_DEDUCTION, signScanResult } from './scorer.ts';

const COMMON_DKIM_SELECTORS = [
  'google',
  'selector1',
  'selector2',
  'default',
  'k1',
  's1',
  's2',
  'mail',
  'dkim',
  'ovh',
  'zoho',
  'mandrill',
  'sendgrid',
  'protonmail',
  'smtp',
];

export const PROVIDER_LABELS: Record<DnsProviderId, string> = {
  cloudflare: 'Cloudflare',
  ovhcloud: 'OVHcloud',
  godaddy: 'GoDaddy',
  aws_route53: 'AWS Route 53',
  azure_dns: 'Microsoft Azure DNS',
  namecheap: 'Namecheap',
  gandi: 'Gandi',
  ionos: 'IONOS',
  hostinger: 'Hostinger',
  generic: 'Generic DNS / Local Registrar',
};

export function detectDnsProvider(nsRecords: string[]): DnsProviderId {
  const joined = nsRecords.join(' ').toLowerCase();
  if (joined.includes('cloudflare.com')) return 'cloudflare';
  if (joined.includes('ovh.net') || joined.includes('anycast.me') || joined.includes('ovh.ca')) return 'ovhcloud';
  if (joined.includes('domaincontrol.com') || joined.includes('godaddy')) return 'godaddy';
  if (joined.includes('awsdns-')) return 'aws_route53';
  if (joined.includes('azure-dns.')) return 'azure_dns';
  if (joined.includes('registrar-servers.com') || joined.includes('namecheaphosting')) return 'namecheap';
  if (joined.includes('gandi.net')) return 'gandi';
  if (joined.includes('ui-dns.') || joined.includes('1and1') || joined.includes('ionos')) return 'ionos';
  if (joined.includes('dns-parking.com') || joined.includes('hostinger')) return 'hostinger';
  return 'generic';
}

export async function countSpfDnsLookups(
  spfRecord: string,
  domain: string,
  visited = new Set<string>(),
  depth = 0
): Promise<{ lookups: number; exceeded: boolean; terms: string[]; technicalError?: string }> {
  if (depth > 5 || visited.has(domain)) {
    return { lookups: 0, exceeded: false, terms: [] };
  }
  visited.add(domain);

  const tokens = spfRecord.trim().split(/\s+/);
  let lookups = 0;
  const terms: string[] = [];

  for (const rawToken of tokens) {
    const token = rawToken.replace(/^[+\-~?]/, '').toLowerCase();
    if (token === 'v=spf1' || token === 'all' || token.startsWith('ip4:') || token.startsWith('ip6:') || token.startsWith('exp=')) {
      continue;
    }

    if (token === 'a' || token.startsWith('a:') || token.startsWith('a/')) {
      lookups += 1;
      terms.push(rawToken);
    } else if (token === 'mx' || token.startsWith('mx:') || token.startsWith('mx/')) {
      lookups += 1;
      terms.push(rawToken);
    } else if (token === 'ptr' || token.startsWith('ptr:')) {
      lookups += 1;
      terms.push(rawToken);
    } else if (token.startsWith('exists:')) {
      lookups += 1;
      terms.push(rawToken);
    } else if (token.startsWith('include:') || token.startsWith('redirect=')) {
      lookups += 1;
      terms.push(rawToken);
      const target = token.startsWith('include:') ? token.slice(8) : token.slice(9);
      if (target && !target.includes('%{')) {
        const subQuery = await queryWithFallback(target, 'TXT');
        if (!subQuery.ok) {
          return { lookups, exceeded: lookups > 10, terms, technicalError: subQuery.technicalError };
        }
        const subSpf = subQuery.records.find((r) => /^v=spf1(?:\s|$)/i.test(r.trim()));
        if (subSpf) {
          const nested = await countSpfDnsLookups(subSpf, target, visited, depth + 1);
          lookups += nested.lookups;
          terms.push(...nested.terms);
        }
      }
    }
  }

  return {
    lookups,
    exceeded: lookups > 10,
    terms,
  };
}

export async function runSpfCheck(domain: string): Promise<DnsCheckResult> {
  const res = await queryWithFallback(domain, 'TXT');
  const evidence = {
    resolver: res.resolver,
    queriedAt: res.queriedAt,
    recordType: 'TXT',
    queryName: domain,
    ttl: res.ttl,
    rawRecords: res.records,
  };

  if (!res.ok) {
    return {
      id: 'spf',
      name: 'Authorized Senders (SPF)',
      purposeKey: 'spf',
      status: 'technical_error',
      severity: 'none',
      pointsRemoved: 0,
      summary: 'Unable to query SPF TXT record due to a DNS resolver error.',
      riskExplanation: 'The DNS resolver timed out or returned SERVFAIL. No score penalty applied.',
      recommendedAction: 'Retry the scan once DNS connectivity stabilizes.',
      evidence: { ...evidence, notes: res.technicalError },
    };
  }

  const spfRecords = res.records.filter((r) => /^v=spf1(?:\s|$)/i.test(r.trim()));
  if (spfRecords.length === 0) {
    return {
      id: 'spf',
      name: 'Authorized Senders (SPF)',
      purposeKey: 'spf',
      status: 'missing',
      severity: 'high',
      pointsRemoved: SEVERITY_DEDUCTION.high,
      summary: 'No SPF record is published for this domain.',
      riskExplanation: 'Without SPF, receiving mail servers cannot verify which IP addresses or mail providers are authorized to send email on your behalf.',
      recommendedAction: 'Publish a single TXT record at the domain root listing only your authorized mail servers and ending with ~all or -all.',
      proposedRecord: {
        type: 'TXT',
        name: '@',
        value: 'v=spf1 include:_spf.google.com ~all',
        ttl: '3600',
      },
      evidence,
    };
  }

  if (spfRecords.length > 1) {
    return {
      id: 'spf',
      name: 'Authorized Senders (SPF)',
      purposeKey: 'spf',
      status: 'confirmed',
      severity: 'high',
      pointsRemoved: SEVERITY_DEDUCTION.high,
      summary: `Multiple SPF records detected (${spfRecords.length}). RFC 7208 permits at most one.`,
      riskExplanation: 'Publishing more than one v=spf1 TXT record causes a permanent SPF evaluation error (permerror), leading mail providers to distrust your messages.',
      recommendedAction: 'Merge all authorized mechanisms into a single v=spf1 TXT record and delete duplicate SPF entries.',
      proposedRecord: {
        type: 'TXT',
        name: '@',
        value: spfRecords[0],
        ttl: '3600',
      },
      evidence: { ...evidence, rawRecords: spfRecords },
      details: { recordCount: spfRecords.length },
    };
  }

  const spf = spfRecords[0];
  const tokens = spf.trim().split(/\s+/);
  const allToken = tokens.find((t) => /^[+\-~?]?all$/i.test(t));
  const lookupAnalysis = await countSpfDnsLookups(spf, domain);

  if (allToken && allToken.toLowerCase() === '+all') {
    return {
      id: 'spf',
      name: 'Authorized Senders (SPF)',
      purposeKey: 'spf',
      status: 'confirmed',
      severity: 'critical',
      pointsRemoved: SEVERITY_DEDUCTION.critical,
      summary: 'SPF uses "+all", allowing any server on the internet to send email as your domain.',
      riskExplanation: 'The +all mechanism authorizes every IP address worldwide, completely nullifying SPF anti-spoofing protection.',
      recommendedAction: 'Replace +all with ~all (soft fail) or -all (hard fail).',
      proposedRecord: {
        type: 'TXT',
        name: '@',
        value: spf.replace(/\+all/i, '~all'),
        ttl: '3600',
      },
      evidence: { ...evidence, rawRecords: [spf] },
      details: { lookups: lookupAnalysis.lookups, allMechanism: '+all' },
    };
  }

  if (lookupAnalysis.exceeded) {
    return {
      id: 'spf',
      name: 'Authorized Senders (SPF)',
      purposeKey: 'spf',
      status: 'confirmed',
      severity: 'high',
      pointsRemoved: SEVERITY_DEDUCTION.high,
      summary: `SPF exceeds the 10-DNS-lookup limit (${lookupAnalysis.lookups} lookups detected).`,
      riskExplanation: 'RFC 7208 limits SPF evaluation to 10 DNS-querying mechanisms. Exceeding this causes a PermError and SPF validation failure.',
      recommendedAction: 'Remove unused include: statements or flatten static IP ranges to stay at or below 10 DNS lookups.',
      evidence: { ...evidence, rawRecords: [spf] },
      details: { lookups: lookupAnalysis.lookups, terms: lookupAnalysis.terms },
    };
  }

  if (!allToken || allToken.toLowerCase() === '?all') {
    return {
      id: 'spf',
      name: 'Authorized Senders (SPF)',
      purposeKey: 'spf',
      status: 'confirmed',
      severity: 'medium',
      pointsRemoved: SEVERITY_DEDUCTION.medium,
      summary: !allToken
        ? 'SPF record is missing a concluding "all" mechanism (~all or -all).'
        : 'SPF uses neutral "?all", which provides no enforcement signal.',
      riskExplanation: 'Without ~all or -all at the end of your SPF record, unauthorized senders are treated neutrally rather than flagged.',
      recommendedAction: 'End your SPF record with ~all while auditing senders, then transition to -all.',
      proposedRecord: {
        type: 'TXT',
        name: '@',
        value: allToken ? spf.replace(/\?all/i, '~all') : `${spf} ~all`,
        ttl: '3600',
      },
      evidence: { ...evidence, rawRecords: [spf] },
      details: { lookups: lookupAnalysis.lookups, allMechanism: allToken || 'none' },
    };
  }

  return {
    id: 'spf',
    name: 'Authorized Senders (SPF)',
    purposeKey: 'spf',
    status: 'confirmed',
    severity: 'none',
    pointsRemoved: 0,
    summary: `Valid single SPF record (${allToken}, ${lookupAnalysis.lookups}/10 DNS lookups).`,
    riskExplanation: 'Your SPF policy restricts authorized sending servers within the RFC 7208 lookup limit.',
    recommendedAction: 'Keep SPF updated whenever adding or retiring email SaaS tools.',
    evidence: { ...evidence, rawRecords: [spf] },
    details: { lookups: lookupAnalysis.lookups, allMechanism: allToken },
  };
}

export function parseDmarcTags(record: string): Record<string, string> {
  const tags: Record<string, string> = {};
  const parts = record.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const key = part.slice(0, idx).trim().toLowerCase();
      const val = part.slice(idx + 1).trim();
      tags[key] = val;
    }
  }
  return tags;
}

export async function runDmarcCheck(domain: string): Promise<{ result: DnsCheckResult; stage: DomainScanResult['dmarcStage'] }> {
  const queryName = `_dmarc.${domain}`;
  const res = await queryWithFallback(queryName, 'TXT');
  const evidence = {
    resolver: res.resolver,
    queriedAt: res.queriedAt,
    recordType: 'TXT',
    queryName,
    ttl: res.ttl,
    rawRecords: res.records,
  };

  if (!res.ok) {
    return {
      stage: 'missing',
      result: {
        id: 'dmarc',
        name: 'Anti-Spoofing Policy (DMARC)',
        purposeKey: 'dmarc',
        status: 'technical_error',
        severity: 'none',
        pointsRemoved: 0,
        summary: 'Unable to query _dmarc TXT record due to a DNS error.',
        riskExplanation: 'The resolver failed or timed out. No score penalty applied.',
        recommendedAction: 'Re-run the scan shortly.',
        evidence: { ...evidence, notes: res.technicalError },
      },
    };
  }

  const dmarcRecords = res.records.filter((r) => /^v=DMARC1(?:\s*;|\s|$)/.test(r.trim()));
  if (dmarcRecords.length === 0) {
    return {
      stage: 'missing',
      result: {
        id: 'dmarc',
        name: 'Anti-Spoofing Policy (DMARC)',
        purposeKey: 'dmarc',
        status: 'missing',
        severity: 'critical',
        pointsRemoved: SEVERITY_DEDUCTION.critical,
        summary: 'No DMARC record published. Anyone can spoof your exact domain in phishing emails.',
        riskExplanation: 'Without DMARC, receiving inboxes (Gmail, Outlook, Yahoo) have no policy instructing them to quarantine or reject fraudulent emails sent in your company name.',
        recommendedAction: 'Publish a _dmarc TXT record starting in monitoring mode (p=none) with aggregate reporting (rua=) so legitimate mail is never blocked.',
        proposedRecord: {
          type: 'TXT',
          name: '_dmarc',
          value: `v=DMARC1; p=none; rua=mailto:dmarc-reports@${domain}; fo=1`,
          ttl: '3600',
        },
        evidence,
      },
    };
  }

  if (dmarcRecords.length > 1) {
    return {
      stage: 'p_none',
      result: {
        id: 'dmarc',
        name: 'Anti-Spoofing Policy (DMARC)',
        purposeKey: 'dmarc',
        status: 'confirmed',
        severity: 'high',
        pointsRemoved: SEVERITY_DEDUCTION.high,
        summary: `Multiple DMARC records found (${dmarcRecords.length}). RFC 7489 requires exactly one.`,
        riskExplanation: 'When multiple DMARC records exist at _dmarc, mail receivers ignore DMARC enforcement altogether.',
        recommendedAction: 'Keep only one v=DMARC1 TXT record at _dmarc and remove duplicates.',
        evidence: { ...evidence, rawRecords: dmarcRecords },
      },
    };
  }

  const record = dmarcRecords[0];
  const tags = parseDmarcTags(record);
  const p = (tags.p || '').toLowerCase();
  const sp = (tags.sp || p).toLowerCase();
  const rawPct = tags.pct;
  const pct = rawPct !== undefined ? Number(rawPct) : 100;
  const pctValid = rawPct === undefined || (/^\d+$/.test(rawPct) && pct >= 0 && pct <= 100);
  const rua = tags.rua || '';

  if (p !== 'none' && p !== 'quarantine' && p !== 'reject') {
    return {
      stage: 'missing',
      result: {
        id: 'dmarc',
        name: 'Anti-Spoofing Policy (DMARC)',
        purposeKey: 'dmarc',
        status: 'confirmed',
        severity: 'critical',
        pointsRemoved: SEVERITY_DEDUCTION.critical,
        summary: 'DMARC syntax is invalid or missing a valid "p=" policy tag.',
        riskExplanation: 'Mail receivers discard malformed DMARC records, leaving your domain unprotected against direct spoofing.',
        recommendedAction: 'Fix the syntax to include a valid policy (p=none, p=quarantine, or p=reject).',
        proposedRecord: {
          type: 'TXT',
          name: '_dmarc',
          value: `v=DMARC1; p=none; rua=mailto:dmarc-reports@${domain}; fo=1`,
          ttl: '3600',
        },
        evidence: { ...evidence, rawRecords: [record] },
        details: { p, sp, pct, rua },
      },
    };
  }

  if (p === 'none') {
    return {
      stage: 'p_none',
      result: {
        id: 'dmarc',
        name: 'Anti-Spoofing Policy (DMARC)',
        purposeKey: 'dmarc',
        status: 'confirmed',
        severity: 'medium',
        pointsRemoved: SEVERITY_DEDUCTION.medium,
        summary: `DMARC is in monitoring mode (p=none)${rua ? ' with rua reporting' : ' without rua reporting'}. Direct spoofing is not yet blocked.`,
        riskExplanation: 'p=none collects visibility reports without blocking forged emails. After verifying all legitimate senders pass SPF/DKIM, upgrade to p=quarantine and then p=reject.',
        recommendedAction: rua
          ? 'Review DMARC aggregate reports for 2 weeks, confirm SPF and DKIM pass for all services, then move to p=quarantine and p=reject.'
          : 'Add a rua=mailto:... reporting tag, observe traffic for 2 weeks, then enforce p=quarantine or p=reject.',
        proposedRecord: {
          type: 'TXT',
          name: '_dmarc',
          value: `v=DMARC1; p=quarantine; rua=${rua || `mailto:dmarc-reports@${domain}`}; pct=100; fo=1`,
          ttl: '3600',
        },
        evidence: { ...evidence, rawRecords: [record] },
        details: { p, sp, pct, rua },
      },
    };
  }

  const stage: DomainScanResult['dmarcStage'] = p === 'reject' ? 'p_reject' : 'p_quarantine';
  if (!pctValid) {
    return {
      stage,
      result: {
        id: 'dmarc',
        name: 'Anti-Spoofing Policy (DMARC)',
        purposeKey: 'dmarc',
        status: 'confirmed',
        severity: 'medium',
        pointsRemoved: SEVERITY_DEDUCTION.medium,
        summary: `DMARC enforces p=${p}, but contains an invalid pct="${rawPct}" value (must be 0-100).`,
        riskExplanation: 'Mail receivers may ignore or misapply DMARC percentage sampling when pct= is malformed.',
        recommendedAction: 'Set pct=100 or remove the pct tag to enforce 100% by default.',
        evidence: { ...evidence, rawRecords: [record] },
        details: { p, sp, pct: rawPct, rua },
      },
    };
  }
  if (pct < 100) {
    return {
      stage,
      result: {
        id: 'dmarc',
        name: 'Anti-Spoofing Policy (DMARC)',
        purposeKey: 'dmarc',
        status: 'confirmed',
        severity: 'low',
        pointsRemoved: SEVERITY_DEDUCTION.low,
        summary: `DMARC enforces p=${p}, but applies to only ${pct}% of messages (pct=${pct}).`,
        riskExplanation: 'Partial percentage enforcement leaves the remaining traffic unprotected against spoofing.',
        recommendedAction: 'Once confident no legitimate mail is affected, increase pct=100.',
        evidence: { ...evidence, rawRecords: [record] },
        details: { p, sp, pct, rua },
      },
    };
  }

  return {
    stage,
    result: {
      id: 'dmarc',
      name: 'Anti-Spoofing Policy (DMARC)',
      purposeKey: 'dmarc',
      status: 'confirmed',
      severity: 'none',
      pointsRemoved: 0,
      summary: `DMARC actively enforces p=${p} (sp=${sp}, pct=${pct})${rua ? ' with reporting' : ''}.`,
      riskExplanation: 'Mail receivers enforce your anti-spoofing policy against unauthenticated messages.',
      recommendedAction: p === 'quarantine'
        ? 'Consider upgrading from p=quarantine to p=reject for maximum protection.'
        : 'Maintain monitoring via DMARC aggregate reports.',
      evidence: { ...evidence, rawRecords: [record] },
      details: { p, sp, pct, rua },
    },
  };
}

export async function runDkimCheck(
  domain: string,
  customSelectors: string[] = []
): Promise<DnsCheckResult> {
  const cleanCustom = customSelectors
    .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9._-]/g, ''))
    .filter(Boolean)
    .slice(0, 10);

  const selectorsToProbe = Array.from(new Set([...cleanCustom, ...COMMON_DKIM_SELECTORS]));
  const foundSelectors: { selector: string; record: string; resolver: string; queriedAt: string; revoked: boolean }[] = [];
  let hadTechError = false;

  // Query in small parallel batches
  const batchResults = await Promise.all(
    selectorsToProbe.map(async (selector) => {
      const qname = `${selector}._domainkey.${domain}`;
      const res = await queryWithFallback(qname, 'TXT');
      return { selector, qname, res };
    })
  );

  for (const item of batchResults) {
    if (!item.res.ok) {
      hadTechError = true;
      continue;
    }
    const dkimRecord = item.res.records.find((r) => r.includes('v=DKIM1') || r.includes('p='));
    if (dkimRecord) {
      const revoked = /(?:^|;\s*)p=\s*(?:;|$)/.test(dkimRecord);
      foundSelectors.push({
        selector: item.selector,
        record: dkimRecord,
        resolver: item.res.resolver,
        queriedAt: item.res.queriedAt,
        revoked,
      });
    }
  }

  const activeKeys = foundSelectors.filter((f) => !f.revoked);
  const firstMeta = batchResults[0]?.res;

  if (activeKeys.length > 0) {
    return {
      id: 'dkim',
      name: 'Email Cryptographic Signature (DKIM)',
      purposeKey: 'dkim',
      status: 'confirmed',
      severity: 'none',
      pointsRemoved: 0,
      summary: `Active DKIM public key confirmed on selector(s): ${activeKeys.map((a) => a.selector).join(', ')}.`,
      riskExplanation: 'Outgoing messages signed with these selectors can be cryptographically verified by recipients.',
      recommendedAction: 'Rotate DKIM keys periodically and ensure every active email service uses its own selector.',
      evidence: {
        resolver: activeKeys[0].resolver,
        queriedAt: activeKeys[0].queriedAt,
        recordType: 'TXT',
        queryName: `${activeKeys[0].selector}._domainkey.${domain}`,
        rawRecords: activeKeys.map((a) => `${a.selector}._domainkey: ${a.record}`),
      },
      details: { verifiedSelectors: activeKeys.map((a) => a.selector), probedCount: selectorsToProbe.length },
    };
  }

  // If customer explicitly provided selectors and NONE resolved (and no tech error), we can accurately report missing for those known selectors
  if (cleanCustom.length > 0 && !hadTechError) {
    return {
      id: 'dkim',
      name: 'Email Cryptographic Signature (DKIM)',
      purposeKey: 'dkim',
      status: 'missing',
      severity: 'high',
      pointsRemoved: SEVERITY_DEDUCTION.high,
      summary: `Customer-specified DKIM selector(s) (${cleanCustom.join(', ')}) returned no active public key.`,
      riskExplanation: 'Without an active DKIM TXT record at the configured selector, recipients cannot verify email signature authenticity.',
      recommendedAction: 'Publish the DKIM TXT record provided by your email service at <selector>._domainkey.' + domain,
      evidence: {
        resolver: firstMeta?.resolver || 'Public DoH Resolver',
        queriedAt: firstMeta?.queriedAt || new Date().toISOString(),
        recordType: 'TXT',
        queryName: `${cleanCustom[0]}._domainkey.${domain}`,
        rawRecords: [],
        notes: `Checked custom selectors [${cleanCustom.join(', ')}] and ${COMMON_DKIM_SELECTORS.length} common selectors.`,
      },
      details: { customSelectors: cleanCustom, probedCount: selectorsToProbe.length },
    };
  }

  if (hadTechError) {
    return {
      id: 'dkim',
      name: 'Email Cryptographic Signature (DKIM)',
      purposeKey: 'dkim',
      status: 'technical_error',
      severity: 'none',
      pointsRemoved: 0,
      summary: 'One or more DKIM selector lookups encountered a DNS resolver error.',
      riskExplanation: 'No penalty applied because DNS lookup errors prevent conclusive DKIM checking.',
      recommendedAction: 'Retry the scan or enter your exact DKIM selector in Domain Settings.',
      evidence: {
        resolver: firstMeta?.resolver || 'Public DoH Resolver',
        queriedAt: firstMeta?.queriedAt || new Date().toISOString(),
        recordType: 'TXT',
        queryName: `_domainkey.${domain}`,
        rawRecords: [],
      },
    };
  }

  // CRITICAL ACCURACY GUARANTEE: Never mark DKIM as "Missing" when no known selector has been verified!
  return {
    id: 'dkim',
    name: 'Email Cryptographic Signature (DKIM)',
    purposeKey: 'dkim',
    status: 'not_verified',
    severity: 'none',
    pointsRemoved: 0,
    summary: `Checked ${COMMON_DKIM_SELECTORS.length} common DKIM selectors; none published. Custom selector required to verify.`,
    riskExplanation: 'DKIM uses provider-specific selectors (e.g. selector1, google, mailjet, k1). Absence of common selectors does not mean DKIM is missing — zero points deducted.',
    recommendedAction: 'Find your DKIM selector in your email provider dashboard (or email header DKIM-Signature s= tag) and add it to this domain to verify.',
    evidence: {
      resolver: firstMeta?.resolver || 'Public DoH Resolver',
      queriedAt: firstMeta?.queriedAt || new Date().toISOString(),
      recordType: 'TXT',
      queryName: `<selector>._domainkey.${domain}`,
      rawRecords: [],
      notes: `Probed common selectors: ${COMMON_DKIM_SELECTORS.join(', ')}`,
    },
    details: { probedCommonSelectors: COMMON_DKIM_SELECTORS },
  };
}

export async function runMxCheck(domain: string): Promise<DnsCheckResult> {
  const res = await queryWithFallback(domain, 'MX');
  const evidence = {
    resolver: res.resolver,
    queriedAt: res.queriedAt,
    recordType: 'MX',
    queryName: domain,
    ttl: res.ttl,
    rawRecords: res.records,
  };

  if (!res.ok) {
    return {
      id: 'mx',
      name: 'Incoming Mail Servers (MX)',
      purposeKey: 'mx',
      status: 'technical_error',
      severity: 'none',
      pointsRemoved: 0,
      summary: 'Unable to query MX records due to a DNS resolver error.',
      riskExplanation: 'No score penalty applied on resolver error.',
      recommendedAction: 'Retry the scan shortly.',
      evidence: { ...evidence, notes: res.technicalError },
    };
  }

  if (res.records.length === 0) {
    return {
      id: 'mx',
      name: 'Incoming Mail Servers (MX)',
      purposeKey: 'mx',
      status: 'missing',
      severity: 'high',
      pointsRemoved: SEVERITY_DEDUCTION.high,
      summary: 'No MX records found for this domain.',
      riskExplanation: 'Without MX records, the domain cannot reliably receive inbound email, including bounce notices or security reports.',
      recommendedAction: 'Publish MX records pointing to your mail provider, or publish a Null MX (0 .) if the domain never handles email.',
      evidence,
    };
  }

  // Check Null MX (RFC 7505)
  if (res.records.length === 1 && /^0\s+\.?$/.test(res.records[0].trim())) {
    return {
      id: 'mx',
      name: 'Incoming Mail Servers (MX)',
      purposeKey: 'mx',
      status: 'confirmed',
      severity: 'none',
      pointsRemoved: 0,
      summary: 'Null MX (0 .) explicitly declares this domain does not receive email.',
      riskExplanation: 'Publishing a Null MX prevents misdirected inbound mail delivery attempts.',
      recommendedAction: 'Ensure SPF (-all) and DMARC (p=reject) match this non-sending domain posture.',
      evidence,
    };
  }

  // Verify A/AAAA resolution for MX targets
  const hosts = res.records
    .map((r) => r.trim().split(/\s+/)[1]?.replace(/\.$/, ''))
    .filter(Boolean) as string[];
  const unresolved: string[] = [];

  await Promise.all(
    hosts.slice(0, 6).map(async (host) => {
      const [aRes, aaaaRes] = await Promise.all([
        queryWithFallback(host, 'A'),
        queryWithFallback(host, 'AAAA'),
      ]);
      if (aRes.ok && aaaaRes.ok && aRes.records.length === 0 && aaaaRes.records.length === 0) {
        unresolved.push(host);
      }
    })
  );

  if (unresolved.length > 0) {
    return {
      id: 'mx',
      name: 'Incoming Mail Servers (MX)',
      purposeKey: 'mx',
      status: 'confirmed',
      severity: 'medium',
      pointsRemoved: SEVERITY_DEDUCTION.medium,
      summary: `MX target(s) failed A/AAAA resolution: ${unresolved.join(', ')}.`,
      riskExplanation: 'If an MX target hostname does not resolve to an IP address, incoming email may bounce or delay.',
      recommendedAction: 'Verify the MX hostnames in your DNS zone and remove stale mail exchangers.',
      evidence,
      details: { unresolvedHosts: unresolved },
    };
  }

  return {
    id: 'mx',
    name: 'Incoming Mail Servers (MX)',
    purposeKey: 'mx',
    status: 'confirmed',
    severity: 'none',
    pointsRemoved: 0,
    summary: `${res.records.length} active MX server(s) verified and resolving cleanly.`,
    riskExplanation: 'Inbound mail routing resolves to valid mail exchanger addresses.',
    recommendedAction: 'Ensure SPF authorizes the same mail infrastructure if used for outbound mail.',
    evidence,
  };
}

export async function runNsCheck(domain: string): Promise<{ result: DnsCheckResult; provider: DnsProviderId }> {
  const res = await queryWithFallback(domain, 'NS');
  const evidence = {
    resolver: res.resolver,
    queriedAt: res.queriedAt,
    recordType: 'NS',
    queryName: domain,
    ttl: res.ttl,
    rawRecords: res.records,
  };

  if (!res.ok) {
    return {
      provider: 'generic',
      result: {
        id: 'ns',
        name: 'Authoritative DNS Servers (NS)',
        purposeKey: 'ns',
        status: 'technical_error',
        severity: 'none',
        pointsRemoved: 0,
        summary: 'Unable to query NS records due to a DNS resolver error.',
        riskExplanation: 'No score penalty applied.',
        recommendedAction: 'Retry scan.',
        evidence: { ...evidence, notes: res.technicalError },
      },
    };
  }

  const provider = detectDnsProvider(res.records);
  if (res.records.length === 0) {
    return {
      provider,
      result: {
        id: 'ns',
        name: 'Authoritative DNS Servers (NS)',
        purposeKey: 'ns',
        status: 'missing',
        severity: 'high',
        pointsRemoved: SEVERITY_DEDUCTION.high,
        summary: 'No authoritative NS records returned.',
        riskExplanation: 'Domains without valid NS delegation become unreachable across the internet.',
        recommendedAction: 'Configure at least two redundant nameservers at your domain registrar.',
        evidence,
      },
    };
  }

  if (res.records.length < 2) {
    return {
      provider,
      result: {
        id: 'ns',
        name: 'Authoritative DNS Servers (NS)',
        purposeKey: 'ns',
        status: 'confirmed',
        severity: 'medium',
        pointsRemoved: SEVERITY_DEDUCTION.medium,
        summary: `Only ${res.records.length} nameserver configured; lacks redundancy.`,
        riskExplanation: 'Relying on a single nameserver creates a single point of failure for your website and email.',
        recommendedAction: 'Add at least one secondary authoritative nameserver.',
        evidence,
        details: { provider, providerLabel: PROVIDER_LABELS[provider] },
      },
    };
  }

  return {
    provider,
    result: {
      id: 'ns',
      name: 'Authoritative DNS Servers (NS)',
      purposeKey: 'ns',
      status: 'confirmed',
      severity: 'none',
      pointsRemoved: 0,
      summary: `${res.records.length} redundant nameservers active (${PROVIDER_LABELS[provider]}).`,
      riskExplanation: 'Redundant authoritative DNS servers keep your domain resilient.',
      recommendedAction: 'Ensure registrar lock is enabled on your domain.',
      evidence,
      details: { provider, providerLabel: PROVIDER_LABELS[provider] },
    },
  };
}

export async function runSoaCheck(domain: string): Promise<DnsCheckResult> {
  const res = await queryWithFallback(domain, 'SOA');
  const evidence = {
    resolver: res.resolver,
    queriedAt: res.queriedAt,
    recordType: 'SOA',
    queryName: domain,
    ttl: res.ttl,
    rawRecords: res.records,
  };

  if (!res.ok) {
    return {
      id: 'soa',
      name: 'DNS Zone Authority (SOA)',
      purposeKey: 'soa',
      status: 'technical_error',
      severity: 'none',
      pointsRemoved: 0,
      summary: 'Unable to query SOA record due to a DNS resolver error.',
      riskExplanation: 'No score penalty applied.',
      recommendedAction: 'Retry scan.',
      evidence: { ...evidence, notes: res.technicalError },
    };
  }

  if (res.records.length === 0) {
    return {
      id: 'soa',
      name: 'DNS Zone Authority (SOA)',
      purposeKey: 'soa',
      status: 'missing',
      severity: 'medium',
      pointsRemoved: SEVERITY_DEDUCTION.medium,
      summary: 'No SOA record found for this DNS zone.',
      riskExplanation: 'Every valid DNS zone requires a Start of Authority (SOA) record to define zone synchronization and caching behavior.',
      recommendedAction: 'Check zone configuration at your DNS hosting provider.',
      evidence,
    };
  }

  return {
    id: 'soa',
    name: 'DNS Zone Authority (SOA)',
    purposeKey: 'soa',
    status: 'confirmed',
    severity: 'none',
    pointsRemoved: 0,
    summary: 'Valid Start of Authority (SOA) zone configuration confirmed.',
    riskExplanation: 'DNS zone parameters and serial metadata are properly published.',
    recommendedAction: 'No change needed.',
    evidence,
  };
}

export async function runDnssecCheck(domain: string): Promise<DnsCheckResult> {
  const [dsCf, dnskeyCf] = await Promise.all([
    queryWithFallback(domain, 'DS', true),
    queryWithFallback(domain, 'DNSKEY', true),
  ]);

  const evidence = {
    resolver: dsCf.ok ? dsCf.resolver : dnskeyCf.resolver,
    queriedAt: dsCf.queriedAt,
    recordType: 'DS / DNSKEY',
    queryName: domain,
    ttl: dsCf.ttl || dnskeyCf.ttl,
    rawRecords: [...dsCf.records.map((r) => `DS: ${r}`), ...dnskeyCf.records.map((r) => `DNSKEY: ${r}`)].slice(0, 6),
  };

  if (!dsCf.ok && !dnskeyCf.ok) {
    return {
      id: 'dnssec',
      name: 'DNS Integrity Protection (DNSSEC)',
      purposeKey: 'dnssec',
      status: 'technical_error',
      severity: 'none',
      pointsRemoved: 0,
      summary: 'Unable to verify DNSSEC records due to a resolver error.',
      riskExplanation: 'No score penalty applied.',
      recommendedAction: 'Retry scan shortly.',
      evidence: { ...evidence, notes: dsCf.technicalError || dnskeyCf.technicalError },
    };
  }

  const hasDs = dsCf.ok && dsCf.records.length > 0;
  const hasKey = dnskeyCf.ok && dnskeyCf.records.length > 0;
  const adValidated = dsCf.adFlag || dnskeyCf.adFlag;

  if (hasDs && (hasKey || adValidated)) {
    return {
      id: 'dnssec',
      name: 'DNS Integrity Protection (DNSSEC)',
      purposeKey: 'dnssec',
      status: 'confirmed',
      severity: 'none',
      pointsRemoved: 0,
      summary: `DNSSEC is enabled and cryptographically signed${adValidated ? ' (AD validated)' : ''}.`,
      riskExplanation: 'DNSSEC protects resolvers from DNS cache poisoning and forged record responses.',
      recommendedAction: 'Monitor DS key rollovers when changing DNS providers.',
      evidence,
      details: { adValidated, dsCount: dsCf.records.length, dnskeyCount: dnskeyCf.records.length },
    };
  }

  return {
    id: 'dnssec',
    name: 'DNS Integrity Protection (DNSSEC)',
    purposeKey: 'dnssec',
    status: 'missing',
    severity: 'medium',
    pointsRemoved: SEVERITY_DEDUCTION.medium,
    summary: 'DNSSEC is not enabled on this domain.',
    riskExplanation: 'Without DNSSEC, DNS responses are not cryptographically signed, increasing exposure to DNS spoofing or cache poisoning.',
    recommendedAction: 'Enable DNSSEC at your DNS host and publish the DS record at your domain registrar.',
    evidence,
  };
}

export async function runCaaCheck(domain: string): Promise<DnsCheckResult> {
  const res = await queryWithFallback(domain, 'CAA');
  const evidence = {
    resolver: res.resolver,
    queriedAt: res.queriedAt,
    recordType: 'CAA',
    queryName: domain,
    ttl: res.ttl,
    rawRecords: res.records,
  };

  if (!res.ok) {
    return {
      id: 'caa',
      name: 'Authorized Certificate Issuers (CAA)',
      purposeKey: 'caa',
      status: 'technical_error',
      severity: 'none',
      pointsRemoved: 0,
      summary: 'Unable to query CAA records due to a resolver error.',
      riskExplanation: 'No score penalty applied.',
      recommendedAction: 'Retry scan.',
      evidence: { ...evidence, notes: res.technicalError },
    };
  }

  if (res.records.length === 0) {
    return {
      id: 'caa',
      name: 'Authorized Certificate Issuers (CAA)',
      purposeKey: 'caa',
      status: 'missing',
      severity: 'low',
      pointsRemoved: SEVERITY_DEDUCTION.low,
      summary: 'No CAA record published to restrict SSL/TLS certificate issuance.',
      riskExplanation: 'Without a CAA record, any public Certificate Authority can issue an SSL/TLS certificate for your domain.',
      recommendedAction: 'Publish a CAA record allowing only your chosen Certificate Authority (e.g. letsencrypt.org or digicert.com).',
      proposedRecord: {
        type: 'CAA',
        name: '@',
        value: '0 issue "letsencrypt.org"',
        ttl: '3600',
      },
      evidence,
    };
  }

  return {
    id: 'caa',
    name: 'Authorized Certificate Issuers (CAA)',
    purposeKey: 'caa',
    status: 'confirmed',
    severity: 'none',
    pointsRemoved: 0,
    summary: `${res.records.length} CAA policy record(s) restrict certificate issuance.`,
    riskExplanation: 'Only listed Certificate Authorities may issue TLS certificates for this domain.',
    recommendedAction: 'Update CAA records if you switch SSL/TLS providers.',
    evidence,
  };
}

export function isPublicRoutableIp(ip: string): boolean {
  const trimmed = ip.trim();
  const ipVersion = net.isIP(trimmed);
  if (ipVersion === 4) {
    const octets = trimmed.split('.').map(Number);
    if (octets.length !== 4 || octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) return false;
    const [a, b, c] = octets;
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
    if (a === 192 && b === 168) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    if (a === 198 && b === 51 && c === 100) return false;
    if (a === 203 && b === 0 && c === 113) return false;
    if (a >= 224) return false;
    return true;
  }
  if (ipVersion === 6) {
    const lower = trimmed.toLowerCase();
    const mappedV4 = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mappedV4) return isPublicRoutableIp(mappedV4[1]);
    if (lower === '::' || lower === '::1') return false;
    if (/^(?:0+:){6,7}0*[01]?$/.test(lower)) return false;
    if (lower.startsWith('::ffff:') || lower.startsWith('::')) return false;
    if (/^fe[89ab][0-9a-f]:/.test(lower)) return false;
    if (/^f[cd][0-9a-f]{2}:/.test(lower)) return false;
    if (/^ff[0-9a-f]{2}:/.test(lower)) return false;
    if (/^2001:0?db8:/.test(lower)) return false;
    if (/^0?100::/.test(lower) || /^0?0?64:ff9b:/.test(lower)) return false;
    return true;
  }
  return false;
}

export async function runTlsCertificateCheck(domain: string): Promise<DnsCheckResult> {
  const queriedAt = new Date().toISOString();

  // Resolve target IP first and enforce SSRF boundary (never connect to private, loopback, or metadata IPs)
  const [aRes, aaaaRes] = await Promise.all([
    queryWithFallback(domain, 'A'),
    queryWithFallback(domain, 'AAAA'),
  ]);
  const resolvedIps = [...aRes.records, ...aaaaRes.records]
    .map((r) => r.trim())
    .filter((r) => net.isIP(r) !== 0);

  if (resolvedIps.some((ip) => !isPublicRoutableIp(ip))) {
    return {
      id: 'tls',
      name: 'HTTPS / TLS Certificate Monitoring',
      purposeKey: 'tls',
      status: 'not_verified',
      severity: 'none',
      pointsRemoved: 0,
      summary: 'HTTPS check skipped because the domain resolves to a non-public or reserved IP address.',
      riskExplanation: 'SSRF protection prevents connecting to internal, loopback, or metadata network addresses. Zero points deducted.',
      recommendedAction: 'Ensure apex A/AAAA records point only to public internet servers before inspecting TLS.',
      evidence: {
        resolver: aRes.resolver || 'Public DoH Resolver',
        queriedAt,
        recordType: 'TLS',
        queryName: domain,
        rawRecords: [],
        notes: 'SSRF protection blocked private/reserved IP resolution.',
      },
    };
  }

  const targetIp = resolvedIps[0];
  if (!targetIp) {
    return {
      id: 'tls',
      name: 'HTTPS / TLS Certificate Monitoring',
      purposeKey: 'tls',
      status: 'not_verified',
      severity: 'none',
      pointsRemoved: 0,
      summary: 'No public A/AAAA web address record found for HTTPS inspection.',
      riskExplanation: 'Domains without an apex A/AAAA record may be used strictly for email. Zero points deducted.',
      recommendedAction: 'Ignore for email-only domains.',
      evidence: {
        resolver: aRes.resolver || 'Public DoH Resolver',
        queriedAt,
        recordType: 'TLS',
        queryName: domain,
        rawRecords: [],
      },
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: DnsCheckResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const socket = tls.connect(
      {
        host: targetIp,
        port: 443,
        servername: domain,
        rejectUnauthorized: false,
        timeout: 4000,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate();
          const protocol = socket.getProtocol() || 'TLS';
          const authorized = socket.authorized;
          socket.end();

          if (!cert || !cert.valid_to) {
            finish({
              id: 'tls',
              name: 'HTTPS / TLS Certificate Monitoring',
              purposeKey: 'tls',
              status: 'not_verified',
              severity: 'none',
              pointsRemoved: 0,
              summary: 'No leaf TLS certificate was returned on port 443.',
              riskExplanation: 'Port 443 may not serve a public website. Zero points deducted.',
              recommendedAction: 'Ignore if this domain is used strictly for email.',
              evidence: { resolver: `${domain}:443`, queriedAt, recordType: 'TLS', queryName: domain, rawRecords: [] },
            });
            return;
          }

          const expiresMs = Date.parse(cert.valid_to);
          const daysRemaining = Math.floor((expiresMs - Date.now()) / (1000 * 60 * 60 * 24));
          const issuer = cert.issuer?.O || cert.issuer?.CN || 'Unknown CA';
          const rawSummary = `Subject=${cert.subject?.CN || domain}; Issuer=${issuer}; Protocol=${protocol}; ValidTo=${cert.valid_to}; DaysLeft=${daysRemaining}; Trusted=${authorized}`;

          if (daysRemaining < 0) {
            finish({
              id: 'tls',
              name: 'HTTPS / TLS Certificate Monitoring',
              purposeKey: 'tls',
              status: 'confirmed',
              severity: 'high',
              pointsRemoved: SEVERITY_DEDUCTION.high,
              summary: `HTTPS certificate expired ${Math.abs(daysRemaining)} day(s) ago.`,
              riskExplanation: 'Visitors and API integrations receive security warnings when connecting over HTTPS.',
              recommendedAction: 'Renew and deploy a valid TLS certificate immediately (e.g. Let\'s Encrypt / Certbot).',
              evidence: { resolver: `${domain}:443`, queriedAt, recordType: 'TLS', queryName: domain, rawRecords: [rawSummary] },
              details: { daysRemaining, issuer, protocol, authorized },
            });
            return;
          }

          if (daysRemaining <= 14) {
            finish({
              id: 'tls',
              name: 'HTTPS / TLS Certificate Monitoring',
              purposeKey: 'tls',
              status: 'confirmed',
              severity: 'medium',
              pointsRemoved: SEVERITY_DEDUCTION.medium,
              summary: `HTTPS certificate expires in ${daysRemaining} day(s) (${cert.valid_to}).`,
              riskExplanation: 'Imminent certificate expiry risks website downtime and browser trust errors.',
              recommendedAction: 'Verify automated certificate renewal before expiration.',
              evidence: { resolver: `${domain}:443`, queriedAt, recordType: 'TLS', queryName: domain, rawRecords: [rawSummary] },
              details: { daysRemaining, issuer, protocol, authorized },
            });
            return;
          }

          finish({
            id: 'tls',
            name: 'HTTPS / TLS Certificate Monitoring',
            purposeKey: 'tls',
            status: 'confirmed',
            severity: 'none',
            pointsRemoved: 0,
            summary: `Valid ${protocol} certificate (${daysRemaining} days remaining, issued by ${issuer}).`,
            riskExplanation: 'HTTPS transport encryption is active with healthy renewal margin.',
            recommendedAction: 'Keep auto-renewal enabled.',
            evidence: { resolver: `${domain}:443`, queriedAt, recordType: 'TLS', queryName: domain, rawRecords: [rawSummary] },
            details: { daysRemaining, issuer, protocol, authorized },
          });
        } catch {
          socket.destroy();
          finish({
            id: 'tls',
            name: 'HTTPS / TLS Certificate Monitoring',
            purposeKey: 'tls',
            status: 'not_verified',
            severity: 'none',
            pointsRemoved: 0,
            summary: 'TLS certificate metadata could not be parsed.',
            riskExplanation: 'Zero points deducted.',
            recommendedAction: 'Verify HTTPS service availability if a website is hosted on this domain.',
            evidence: { resolver: `${domain}:443`, queriedAt, recordType: 'TLS', queryName: domain, rawRecords: [] },
          });
        }
      }
    );

    socket.on('timeout', () => {
      socket.destroy();
      finish({
        id: 'tls',
        name: 'HTTPS / TLS Certificate Monitoring',
        purposeKey: 'tls',
        status: 'not_verified',
        severity: 'none',
        pointsRemoved: 0,
        summary: 'No public HTTPS listener detected on port 443 (timeout).',
        riskExplanation: 'Many mail-only domains do not expose port 443. Zero points deducted.',
        recommendedAction: 'No action required unless this apex domain hosts a website.',
        evidence: { resolver: `${domain}:443`, queriedAt, recordType: 'TLS', queryName: domain, rawRecords: [], notes: 'Connection timed out' },
      });
    });

    socket.on('error', (err) => {
      socket.destroy();
      finish({
        id: 'tls',
        name: 'HTTPS / TLS Certificate Monitoring',
        purposeKey: 'tls',
        status: 'not_verified',
        severity: 'none',
        pointsRemoved: 0,
        summary: 'No public HTTPS service reachable on port 443.',
        riskExplanation: 'Zero points deducted when HTTPS is not exposed on the apex domain.',
        recommendedAction: 'Ignore for email-only domains.',
        evidence: { resolver: `${domain}:443`, queriedAt, recordType: 'TLS', queryName: domain, rawRecords: [], notes: err.message },
      });
    });
  });
}

export async function runFullDomainScan(params: {
  orgId: string;
  domain: string;
  dkimSelectors?: string[];
}): Promise<DomainScanResult> {
  const startedAt = Date.now();
  const [spf, dmarcOutcome, dkim, mx, nsOutcome, soa, dnssec, caa, tlsCheck] = await Promise.all([
    runSpfCheck(params.domain),
    runDmarcCheck(params.domain),
    runDkimCheck(params.domain, params.dkimSelectors || []),
    runMxCheck(params.domain),
    runNsCheck(params.domain),
    runSoaCheck(params.domain),
    runDnssecCheck(params.domain),
    runCaaCheck(params.domain),
    runTlsCertificateCheck(params.domain),
  ]);

  const checks: DnsCheckResult[] = [
    dmarcOutcome.result,
    spf,
    dkim,
    mx,
    nsOutcome.result,
    soa,
    dnssec,
    caa,
    tlsCheck,
  ];

  const scored = computeAuthoritativeScore(checks);
  const scannedAtIso = new Date().toISOString();
  const durationMs = Date.now() - startedAt;

  const integritySig = signScanResult({
    orgId: params.orgId,
    domain: params.domain,
    score: scored.score,
    riskPoints: scored.riskPoints,
    scannedAtIso,
    checks,
  });

  return {
    domain: params.domain,
    orgId: params.orgId,
    score: scored.score,
    maxScore: 100,
    riskPoints: scored.riskPoints,
    durationMs,
    detectedProvider: nsOutcome.provider,
    detectedProviderLabel: PROVIDER_LABELS[nsOutcome.provider],
    dmarcStage: dmarcOutcome.stage,
    checks,
    deductions: scored.deductions,
    integritySig,
    scannedAtIso,
  };
}

export async function runSingleCheckRecheck(params: {
  domain: string;
  checkId: CheckId;
  dkimSelectors?: string[];
}): Promise<DnsCheckResult> {
  switch (params.checkId) {
    case 'spf':
      return runSpfCheck(params.domain);
    case 'dmarc':
      return (await runDmarcCheck(params.domain)).result;
    case 'dkim':
      return runDkimCheck(params.domain, params.dkimSelectors || []);
    case 'mx':
      return runMxCheck(params.domain);
    case 'ns':
      return (await runNsCheck(params.domain)).result;
    case 'soa':
      return runSoaCheck(params.domain);
    case 'dnssec':
      return runDnssecCheck(params.domain);
    case 'caa':
      return runCaaCheck(params.domain);
    case 'tls':
      return runTlsCertificateCheck(params.domain);
  }
}
