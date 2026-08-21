import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { catchAsync } from '../utils/catchAsync.js';

export const validateRequest = (schema: ZodTypeAny) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const parsed = (await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    })) as { body?: unknown };

    req.body = parsed.body ?? req.body;
    next();
  });

export default validateRequest;
