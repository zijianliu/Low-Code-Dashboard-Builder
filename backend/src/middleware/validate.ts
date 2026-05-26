import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { error } from '../utils/response';

export function validateBody(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error: validationError } = schema.validate(req.body, { abortEarly: false });
    if (validationError) {
      const messages = validationError.details.map(d => d.message).join(', ');
      error(res, `Validation error: ${messages}`);
      return;
    }
    next();
  };
}

export function validateQuery(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error: validationError } = schema.validate(req.query, { abortEarly: false });
    if (validationError) {
      const messages = validationError.details.map(d => d.message).join(', ');
      error(res, `Validation error: ${messages}`);
      return;
    }
    next();
  };
}

export function validateParams(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error: validationError } = schema.validate(req.params, { abortEarly: false });
    if (validationError) {
      const messages = validationError.details.map(d => d.message).join(', ');
      error(res, `Validation error: ${messages}`);
      return;
    }
    next();
  };
}
