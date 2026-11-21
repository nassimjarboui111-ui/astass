import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface FirebaseConfigJson {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
}

let cachedFirebaseConfig: FirebaseConfigJson | null = null;

export function getFirebaseConfig(): FirebaseConfigJson {
  if (cachedFirebaseConfig) return cachedFirebaseConfig;
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const raw = fs.readFileSync(configPath, 'utf-8');
  cachedFirebaseConfig = JSON.parse(raw) as FirebaseConfigJson;
  return cachedFirebaseConfig;
}

// Deterministic fallback secret scoped to process runtime if env var is unset in dev
const RUNTIME_FALLBACK_SECRET = crypto
  .createHash('sha256')
  .update(`astasecure-dev-signing-${process.env.APP_URL || 'local'}-${getFirebaseConfig().projectId}`)
  .digest('hex');

export const ENV = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'gemini-4-hydrogen',
  scanSigningSecret: process.env.SCAN_SIGNING_SECRET && process.env.SCAN_SIGNING_SECRET !== 'CHANGE_ME_IN_PRODUCTION'
    ? process.env.SCAN_SIGNING_SECRET
    : RUNTIME_FALLBACK_SECRET,
  bootstrappedAdminEmail: 'nassimjarboui111@gmail.com',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
  contactRecipientEmail: process.env.CONTACT_RECIPIENT_EMAIL || '',
  whatsappToken: process.env.WHATSAPP_API_TOKEN || '',
  whatsappPhoneId: process.env.WHATSAPP_PHONE_ID || '',
  databaseUrl: process.env.DATABASE_URL || '',
};
