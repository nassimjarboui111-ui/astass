import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

export const scanRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.uid || ipKeyGenerator(req.ip || '127.0.0.1'),
  message: { error: 'Scan rate limit reached for this account. Please wait before running more scans.' },
});

export const verificationRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.uid || ipKeyGenerator(req.ip || '127.0.0.1'),
  message: { error: 'Too many DNS verification attempts. Please wait a few minutes for DNS propagation.' },
});

export const totpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.uid || ipKeyGenerator(req.ip || '127.0.0.1'),
  message: { error: 'Too many 2FA verification attempts. Please wait 5 minutes.' },
});
