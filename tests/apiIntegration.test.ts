import express from 'express';
import http from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiRouter } from '../server/routes/api';

describe('API Router Security & Route Integration', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /api/v1/health responds 200 without leaking secrets', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe('astasecure-monitor-api');
    expect(body.channels).toHaveProperty('emailConfigured');
    expect(body.channels).toHaveProperty('whatsappConfigured');
    expect(JSON.stringify(body)).not.toContain('SECRET');
  });

  it('POST /api/v1/domains/validate accepts valid domains and blocks IPs/internal hostnames', async () => {
    const okRes = await fetch(`${baseUrl}/api/v1/domains/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'astasecure.tn' }),
    });
    expect(okRes.status).toBe(200);
    expect((await okRes.json()).normalized).toBe('astasecure.tn');

    const badRes = await fetch(`${baseUrl}/api/v1/domains/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: '127.0.0.1' }),
    });
    expect(badRes.status).toBe(400);
    expect((await badRes.json()).errorCode).toBe('IP_ADDRESS_FORBIDDEN');
  });

  it('rejects unauthenticated requests to protected scanning, token, and PDF endpoints', async () => {
    const tokenRes = await fetch(`${baseUrl}/api/v1/domains/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'astasecure.tn' }),
    });
    expect(tokenRes.status).toBe(401);

    const scanRes = await fetch(`${baseUrl}/api/v1/scans/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'astasecure.tn', orgId: 'org_1' }),
    });
    expect(scanRes.status).toBe(401);

    const pdfRes = await fetch(`${baseUrl}/api/v1/reports/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(pdfRes.status).toBe(401);
  });
});
