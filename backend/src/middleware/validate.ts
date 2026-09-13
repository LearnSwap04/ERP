import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

/** Parse+validate req.body against a zod schema; on success replaces req.body with the parsed data. */
export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', issues: result.error.issues });
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Parse+validate URL params. */
export function validateParams(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', issues: result.error.issues });
      return;
    }
    req.validatedParams = result.data;
    next();
  };
}