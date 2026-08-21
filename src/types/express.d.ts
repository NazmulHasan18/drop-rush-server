import type { AuthTokenPayload } from '../middlewares/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export {};
