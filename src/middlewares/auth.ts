import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';

export interface AuthTokenPayload {
  userId: string;
  username: string;
}

export const auth = () =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError(401, 'You are not authorized. Please log in.');
    }

    const token = header.split(' ')[1];

    let decoded: AuthTokenPayload;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as AuthTokenPayload;
    } catch {
      throw new AppError(401, 'Invalid or expired token. Please log in again.');
    }

    req.user = decoded;
    next();
  });

export default auth;
