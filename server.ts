import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { ENV } from './server/config/env.ts';
import { apiRouter } from './server/routes/api.ts';

export async function createAppServer() {
  const app = express();

  app.set('trust proxy', 1);

  // OWASP security headers configured cleanly for SPA + iFrame hosting
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    })
  );

  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1', apiRouter);

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
}

if (process.env.VITEST !== 'true') {
  createAppServer().then((app) => {
    app.listen(ENV.port, '0.0.0.0', () => {
      console.log(`AstaSecure Monitor server listening on http://0.0.0.0:${ENV.port}`);
    });
  });
}
