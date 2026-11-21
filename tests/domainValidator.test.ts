import { describe, expect, it } from 'vitest';
import { validateAndNormalizeDomain } from '../server/engine/domainValidator';

describe('validateAndNormalizeDomain', () => {
  it('accepts and normalizes valid public domains and subdomains', () => {
    expect(validateAndNormalizeDomain('  Company.TN. ')).toEqual({
      valid: true,
      normalized: 'company.tn',
    });
    expect(validateAndNormalizeDomain('mail.sub-domain.co.uk')).toEqual({
      valid: true,
      normalized: 'mail.sub-domain.co.uk',
    });
    expect(validateAndNormalizeDomain('xn--bcher-kva.example.com'.replace('.example.com', '.de'))).toEqual({
      valid: true,
      normalized: 'xn--bcher-kva.de',
    });
  });

  it('rejects IPv4 and IPv6 addresses', () => {
    for (const ip of ['192.168.1.1', '8.8.8.8', '127.0.0.1', '::1', '[2001:db8::1]']) {
      const res = validateAndNormalizeDomain(ip);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('IP_ADDRESS_FORBIDDEN');
    }
  });

  it('rejects internal hostnames and reserved internal TLDs', () => {
    for (const host of [
      'localhost',
      'intranet',
      'server.local',
      'db.internal',
      'printer.lan',
      'metadata.google.internal',
      'corp.localhost',
    ]) {
      const res = validateAndNormalizeDomain(host);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('INTERNAL_HOSTNAME_FORBIDDEN');
    }
  });

  it('rejects URLs, ports, paths, emails, and wildcards', () => {
    expect(validateAndNormalizeDomain('https://company.tn').errorCode).toBe('CONTAINS_PROTOCOL_OR_PATH');
    expect(validateAndNormalizeDomain('company.tn/login').errorCode).toBe('CONTAINS_PROTOCOL_OR_PATH');
    expect(validateAndNormalizeDomain('company.tn:8443').errorCode).toBe('CONTAINS_PROTOCOL_OR_PATH');
    expect(validateAndNormalizeDomain('admin@company.tn').errorCode).toBe('CONTAINS_PROTOCOL_OR_PATH');
    expect(validateAndNormalizeDomain('*.company.tn').errorCode).toBe('WILDCARD_FORBIDDEN');
  });
});
