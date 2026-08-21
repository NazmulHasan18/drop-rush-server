import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ValidationError as SequelizeValidationError } from 'sequelize';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

interface ErrorSource {
  path: string;
  message: string;
}

export const globalErrorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let message = 'Something went wrong!';
  let errorSources: ErrorSource[] = [{ path: '', message: 'Something went wrong!' }];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = [{ path: '', message: err.message }];
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    errorSources = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err instanceof SequelizeValidationError) {
    statusCode = 400;
    message = 'Validation error';
    errorSources = err.errors.map((e) => ({ path: e.path ?? '', message: e.message }));
  } else if (err instanceof Error) {
    message = err.message;
    errorSources = [{ path: '', message: err.message }];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    stack: config.env === 'development' && err instanceof Error ? err.stack : undefined,
  });
};

export default globalErrorHandler;
