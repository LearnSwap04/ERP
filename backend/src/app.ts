import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { uploadDir } from './middleware/upload';
import { apiRouter } from './routes';

export function createApp() {
  const app = express();

  const clientOrigins = env.CLIENT_ORIGIN.split(',').map((s) => s.trim().replace(/\/+$/, ''));
  // Allow configured origin(s), any localhost dev origin, and any vercel deploy URL.
  const isLocalDev = (o: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        const normalized = origin.replace(/\/+$/, '');
        if (
          clientOrigins.includes('*') ||
          clientOrigins.includes(normalized) ||
          isLocalDev(normalized) ||
          normalized.endsWith('.vercel.app')
        ) {
          return cb(null, true);
        }
        cb(null, true);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(uploadDir));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', apiRouter);

  app.use(errorHandler);
  return app;
}