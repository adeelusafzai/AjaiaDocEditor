import express from 'express';
import cors from 'cors';
import config from './config.js';
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

/** Builds the Express app. Exported (not started) so tests can drive it with supertest. */
export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
    })
  );
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', env: config.env }));

  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
