import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

export interface TotpEnrollmentPayload {
  secret: string;
  otpauthUri: string;
  qrCodeDataUrl: string;
}

export async function generateTotpEnrollment(email: string): Promise<TotpEnrollmentPayload> {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'AstaSecure Monitor',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  const otpauthUri = totp.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, {
    width: 220,
    margin: 2,
    color: {
      dark: '#0A1120',
      light: '#FFFFFF',
    },
  });

  return {
    secret: secret.base32,
    otpauthUri,
    qrCodeDataUrl,
  };
}

export function verifyTotpToken(secretBase32: string, token: string): boolean {
  const cleaned = token.replace(/\s+/g, '').trim();
  if (!/^\d{6}$/.test(cleaned)) {
    return false;
  }

  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'AstaSecure Monitor',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });
    const delta = totp.validate({ token: cleaned, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}
