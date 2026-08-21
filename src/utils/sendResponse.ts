import type { Response } from 'express';

type Meta = {
  page?: number;
  limit?: number;
  total?: number;
};

type ResponsePayload<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  meta?: Meta;
  data?: T;
};

export const sendResponse = <T>(res: Response, payload: ResponsePayload<T>): void => {
  res.status(payload.statusCode).json({
    success: payload.success,
    message: payload.message,
    meta: payload.meta ?? undefined,
    data: payload.data ?? undefined,
  });
};

export default sendResponse;
