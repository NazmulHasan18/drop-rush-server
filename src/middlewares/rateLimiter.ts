import { rateLimit } from 'express-rate-limit';

// General API limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

// Tighter limiter specifically for the reserve endpoint, since it's the
// hot path during a drop (protects the DB from abusive click-spam).
export const reserveLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reservation attempts. Please wait a moment.' },
});
