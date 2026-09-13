import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { uploadDir } from './middleware/upload';
import { apiRouter } from './routes';

export function createApp() {
  const app = express();

  const clientOrigins = env.CLIENT_ORIGIN.split(',').map((s) => s.trim());
  // Allow the configured origin(s) plus any localhost dev origin (the Angular
  // dev server often runs on a forwarded port, not necessarily 4200).
  const isLocalDev = (o: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || clientOrigins.includes(origin) || isLocalDev(origin)) cb(null, true);
        else cb(new Error(`CORS: origin "${origin}" not allowed`));
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