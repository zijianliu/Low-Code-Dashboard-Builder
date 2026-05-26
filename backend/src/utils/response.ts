import { Response } from 'express';
import { ApiResponse } from '../types';

export function success<T>(res: Response, data?: T, message?: string, pagination?: ApiResponse['pagination']): Response {
  return res.json({
    success: true,
    data,
    message,
    pagination
  });
}

export function error(res: Response, error: string, statusCode: number = 400): Response {
  return res.status(statusCode).json({
    success: false,
    error
  });
}

export function unauthorized(res: Response, message: string = 'Unauthorized'): Response {
  return error(res, message, 401);
}

export function forbidden(res: Response, message: string = 'Forbidden'): Response {
  return error(res, message, 403);
}

export function notFound(res: Response, message: string = 'Not found'): Response {
  return error(res, message, 404);
}
