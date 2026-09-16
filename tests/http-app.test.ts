import { describe, expect, it, afterEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createPlatformApplication } from '../src/platform/application.js';
import { createBetaHttpServer } from '../src/platform/http-app.js';

const application = createPlatformApplication({
  identity: { id: 'admin-1', type: 'user', tenantId: 'tenant-1', roles: ['admin'], status: 'active' },
  correlationId: 'http-test-1',
});

const servers: ReturnType<typeof createBetaHttpServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function request(path: string, method = 'GET'): Promise<Response> {
  const server = createBetaHttpServer(application);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as AddressInfo;
  return fetch(`http://127.0.0.1:${address.port}${path}`, { method });
}

describe('private beta HTTP application', () => {
  it('returns a truthful landing response', async () => {
    const response = await request('/');
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe('private_beta');
    expect(body.modules).toHaveLength(5);
  });

  it('provides liveness and non-ready readiness endpoints', async () => {
    expect((await request('/healthz')).status).toBe(200);
    expect((await request('/readyz')).status).toBe(200);
    expect((await (await request('/readyz')).json()).status).toBe('unknown');
  });

  it('exposes beta limitations instead of implying production capability', async () => {
    const body = await (await request('/api/v1/beta/summary')).json();
    expect(body.beta).toBe(true);
    expect(body.limitations).toContain('no real payments');
  });

  it('rejects unsupported methods and unknown paths', async () => {
    expect((await request('/', 'POST')).status).toBe(405);
    expect((await request('/missing')).status).toBe(404);
  });
});
