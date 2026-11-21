import dns from 'dns';

export type DnsRecordType = 'TXT' | 'MX' | 'NS' | 'SOA' | 'A' | 'AAAA' | 'CAA' | 'DS' | 'DNSKEY';

export interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

export interface DohResponse {
  Status: number; // 0 = NOERROR, 2 = SERVFAIL, 3 = NXDOMAIN
  AD?: boolean; // Authenticated Data (DNSSEC validated)
  Answer?: DohAnswer[];
}

export interface DnsQueryResult {
  ok: boolean;
  technicalError?: string;
  nxdomain?: boolean;
  adFlag: boolean;
  resolver: string;
  queriedAt: string;
  ttl?: number;
  records: string[];
}

const DNS_TIMEOUT_MS = 5000;

export const PUBLIC_RESOLVERS = {
  cloudflare: {
    name: 'Cloudflare Public DNS (1.1.1.1)',
    url: 'https://cloudflare-dns.com/dns-query',
  },
  google: {
    name: 'Google Public DNS (8.8.8.8)',
    url: 'https://dns.google/resolve',
  },
} as const;

const TYPE_CODE_MAP: Record<DnsRecordType, number> = {
  A: 1,
  NS: 2,
  SOA: 6,
  MX: 15,
  TXT: 16,
  AAAA: 28,
  DS: 43,
  DNSKEY: 48,
  CAA: 257,
};

function normalizeTxtData(raw: string): string {
  // DoH JSON returns TXT strings wrapped in quotes, sometimes split into quoted chunks like "\"v=spf1 \" \"include:...\""
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const chunks = trimmed.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
    if (chunks && chunks.length > 0) {
      return chunks.map((c) => c.slice(1, -1).replace(/\\"/g, '"')).join('');
    }
  }
  return trimmed;
}

export async function queryDohResolver(
  domain: string,
  type: DnsRecordType,
  resolverKey: keyof typeof PUBLIC_RESOLVERS = 'cloudflare',
  dnssecOk = false
): Promise<DnsQueryResult> {
  const resolver = PUBLIC_RESOLVERS[resolverKey];
  const queriedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DNS_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      name: domain,
      type,
    });
    if (dnssecOk) {
      params.set('do', '1');
    }

    const res = await fetch(`${resolver.url}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/dns-json',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        ok: false,
        technicalError: `Resolver HTTP ${res.status}`,
        adFlag: false,
        resolver: resolver.name,
        queriedAt,
        records: [],
      };
    }

    const body = (await res.json()) as DohResponse;
    if (body.Status === 2) {
      return {
        ok: false,
        technicalError: 'DNS SERVFAIL returned by upstream resolver',
        adFlag: Boolean(body.AD),
        resolver: resolver.name,
        queriedAt,
        records: [],
      };
    }

    const expectedTypeCode = TYPE_CODE_MAP[type];
    const matchingAnswers = (body.Answer || []).filter((ans) => ans.type === expectedTypeCode);
    const records = matchingAnswers.map((ans) =>
      type === 'TXT' ? normalizeTxtData(ans.data) : ans.data.trim()
    );
    const ttl = matchingAnswers.length > 0 ? matchingAnswers[0].TTL : undefined;

    return {
      ok: true,
      nxdomain: body.Status === 3,
      adFlag: Boolean(body.AD),
      resolver: resolver.name,
      queriedAt,
      ttl,
      records,
    };
  } catch (err) {
    const message = err instanceof Error && err.name === 'AbortError'
      ? `DNS query timed out after ${DNS_TIMEOUT_MS}ms`
      : err instanceof Error
        ? err.message
        : 'Unknown DNS network error';
    return {
      ok: false,
      technicalError: message,
      adFlag: false,
      resolver: resolver.name,
      queriedAt,
      records: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function queryWithFallback(
  domain: string,
  type: DnsRecordType,
  dnssecOk = false
): Promise<DnsQueryResult> {
  const primary = await queryDohResolver(domain, type, 'cloudflare', dnssecOk);
  if (primary.ok) return primary;

  // Try secondary independent public resolver (Google 8.8.8.8) before reporting technical_error
  const secondary = await queryDohResolver(domain, type, 'google', dnssecOk);
  if (secondary.ok) return secondary;

  // Optional Node native resolver fallback for basic record types if DoH is unreachable
  if (!dnssecOk && (type === 'TXT' || type === 'MX' || type === 'NS' || type === 'SOA' || type === 'A' || type === 'AAAA' || type === 'CAA')) {
    const queriedAt = new Date().toISOString();
    try {
      const resolver = new dns.promises.Resolver();
      resolver.setServers(['1.1.1.1', '8.8.8.8']);
      if (type === 'TXT') {
        const rows = await resolver.resolveTxt(domain);
        return { ok: true, adFlag: false, resolver: 'System DNS (1.1.1.1 / 8.8.8.8)', queriedAt, records: rows.map((r) => r.join('')) };
      }
      if (type === 'MX') {
        const rows = await resolver.resolveMx(domain);
        return { ok: true, adFlag: false, resolver: 'System DNS (1.1.1.1 / 8.8.8.8)', queriedAt, records: rows.map((r) => `${r.priority} ${r.exchange}`) };
      }
      if (type === 'NS') {
        const rows = await resolver.resolveNs(domain);
        return { ok: true, adFlag: false, resolver: 'System DNS (1.1.1.1 / 8.8.8.8)', queriedAt, records: rows };
      }
      if (type === 'SOA') {
        const r = await resolver.resolveSoa(domain);
        return { ok: true, adFlag: false, resolver: 'System DNS (1.1.1.1 / 8.8.8.8)', queriedAt, records: [`${r.nsname} ${r.hostmaster} ${r.serial} ${r.refresh} ${r.retry} ${r.expire} ${r.minttl}`] };
      }
      if (type === 'A') {
        const rows = await resolver.resolve4(domain);
        return { ok: true, adFlag: false, resolver: 'System DNS (1.1.1.1 / 8.8.8.8)', queriedAt, records: rows };
      }
      if (type === 'AAAA') {
        const rows = await resolver.resolve6(domain);
        return { ok: true, adFlag: false, resolver: 'System DNS (1.1.1.1 / 8.8.8.8)', queriedAt, records: rows };
      }
      if (type === 'CAA') {
        const rows = await resolver.resolveCaa(domain);
        return { ok: true, adFlag: false, resolver: 'System DNS (1.1.1.1 / 8.8.8.8)', queriedAt, records: rows.map((r) => `${r.critical} ${r.issue ? `issue "${r.issue}"` : r.issuewild ? `issuewild "${r.issuewild}"` : r.iodef ? `iodef "${r.iodef}"` : ''}`.trim()) };
      }
    } catch (nodeErr: unknown) {
      const code = (nodeErr as NodeJS.ErrnoException)?.code;
      if (code === 'ENODATA' || code === 'ENOTFOUND') {
        return { ok: true, nxdomain: code === 'ENOTFOUND', adFlag: false, resolver: 'System DNS (1.1.1.1 / 8.8.8.8)', queriedAt, records: [] };
      }
    }
  }

  return primary;
}
