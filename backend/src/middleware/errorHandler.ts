import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }
  console.error('Unhandled server error:', err);
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ error: 'Internal server error', details: message });
}