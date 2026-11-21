import type { NextFunction, Request, Response } from 'express';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { ENV, getFirebaseConfig } from '../config/env.ts';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  isPlatformAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function getFirebaseAdminAuth() {
  const { projectId } = getFirebaseConfig();
  const app = getApps().length ? getApp() : initializeApp({ projectId });
  return getAuth(app);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication token required.' });
    return;
  }

  const idToken = header.slice(7).trim();
  if (!idToken) {
    res.status(401).json({ error: 'Empty authentication token.' });
    return;
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
    const email = decoded.email || '';
    const emailVerified = Boolean(decoded.email_verified);
    req.user = {
      uid: decoded.uid,
      email,
      emailVerified,
      isPlatformAdmin: emailVerified && email.toLowerCase() === ENV.bootstrappedAdminEmail.toLowerCase(),
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (!req.user.emailVerified) {
    res.status(403).json({
      error: 'Email verification is required before running domain verification or scans.',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }
  next();
}

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (!req.user.isPlatformAdmin) {
    res.status(403).json({
      error: 'Platform Administrator authorization is required.',
      code: 'ADMIN_FORBIDDEN',
    });
    return;
  }
  next();
}
