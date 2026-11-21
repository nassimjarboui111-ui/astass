import net from 'net';

export interface DomainValidationResult {
  valid: boolean;
  normalized?: string;
  errorCode?:
    | 'EMPTY'
    | 'INVALID_TYPE'
    | 'CONTAINS_PROTOCOL_OR_PATH'
    | 'IP_ADDRESS_FORBIDDEN'
    | 'INTERNAL_HOSTNAME_FORBIDDEN'
    | 'WILDCARD_FORBIDDEN'
    | 'TOO_LONG'
    | 'INVALID_SYNTAX';
  errorMessage?: string;
}

const RESERVED_INTERNAL_TLDS = new Set([
  'local',
  'internal',
  'lan',
  'home',
  'corp',
  'intranet',
  'arpa',
  'localhost',
  'test',
  'example',
  'invalid',
  'localdomain',
]);

const RESERVED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  '169.254.169.254',
]);

const DOMAIN_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD_REGEX = /^(?:[a-z]{2,63}|xn--[a-z0-9]{2,59})$/;

export function validateAndNormalizeDomain(rawInput: string): DomainValidationResult {
  if (typeof rawInput !== 'string') {
    return { valid: false, errorCode: 'INVALID_TYPE', errorMessage: 'Domain must be a string.' };
  }

  let candidate = rawInput.trim().toLowerCase();
  if (!candidate) {
    return { valid: false, errorCode: 'EMPTY', errorMessage: 'Domain name is required.' };
  }

  // Strip trailing dot if present
  if (candidate.endsWith('.')) {
    candidate = candidate.slice(0, -1);
  }

  // Reject IPv4 and IPv6 addresses before colon/port checks
  const unbracketed = candidate.replace(/^\[|\]$/g, '');
  if (net.isIP(unbracketed) !== 0 || /^\d+\.\d+\.\d+\.\d+$/.test(candidate)) {
    return {
      valid: false,
      errorCode: 'IP_ADDRESS_FORBIDDEN',
      errorMessage: 'IP addresses are rejected. Enter a registered public domain name.',
    };
  }

  if (candidate.includes('://') || candidate.includes('/') || candidate.includes('?') || candidate.includes('#') || candidate.includes('@') || candidate.includes(':')) {
    return {
      valid: false,
      errorCode: 'CONTAINS_PROTOCOL_OR_PATH',
      errorMessage: 'Enter a bare domain name without http://, paths, ports, or email @ prefixes (e.g. company.tn).',
    };
  }

  if (candidate.startsWith('*.') || candidate.includes('*')) {
    return {
      valid: false,
      errorCode: 'WILDCARD_FORBIDDEN',
      errorMessage: 'Wildcard domains are not permitted. Enter a concrete domain name.',
    };
  }

  if (RESERVED_HOSTNAMES.has(candidate)) {
    return {
      valid: false,
      errorCode: 'INTERNAL_HOSTNAME_FORBIDDEN',
      errorMessage: 'Internal or loopback hostnames are forbidden.',
    };
  }

  if (candidate.length < 3 || candidate.length > 253) {
    return {
      valid: false,
      errorCode: 'TOO_LONG',
      errorMessage: 'Domain length must be between 3 and 253 characters.',
    };
  }

  const labels = candidate.split('.');
  if (labels.length < 2) {
    return {
      valid: false,
      errorCode: 'INTERNAL_HOSTNAME_FORBIDDEN',
      errorMessage: 'Single-label internal hostnames are not allowed. Enter a full domain (e.g. company.tn).',
    };
  }

  const tld = labels[labels.length - 1];
  if (RESERVED_INTERNAL_TLDS.has(tld)) {
    return {
      valid: false,
      errorCode: 'INTERNAL_HOSTNAME_FORBIDDEN',
      errorMessage: `Internal or reserved top-level domain (.${tld}) is forbidden.`,
    };
  }

  if (!TLD_REGEX.test(tld)) {
    return {
      valid: false,
      errorCode: 'INVALID_SYNTAX',
      errorMessage: 'Invalid top-level domain syntax.',
    };
  }

  for (let i = 0; i < labels.length - 1; i++) {
    if (!DOMAIN_LABEL_REGEX.test(labels[i])) {
      return {
        valid: false,
        errorCode: 'INVALID_SYNTAX',
        errorMessage: `Invalid DNS label "${labels[i]}". Only letters, digits, and internal hyphens are permitted.`,
      };
    }
  }

  return {
    valid: true,
    normalized: candidate,
  };
}
