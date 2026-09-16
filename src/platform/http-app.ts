import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { PlatformApplication } from './application.js';

function json(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.end(payload);
}

function route(application: PlatformApplication, request: IncomingMessage, response: ServerResponse): void {
  const method = request.method ?? 'GET';
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;

  if (method !== 'GET') {
    json(response, 405, { error: 'method_not_allowed' });
    return;
  }

  if (pathname === '/') {
    json(response, 200, {
      name: 'SKYCOIN4444 Platform',
      version: application.version,
      status: 'private_beta',
      message: 'Five bounded platform capabilities behind one beta application boundary.',
      modules: ['identity', 'marketplace', 'collaboration', 'ai', 'infrastructure'],
    });
    return;
  }

  if (pathname === '/healthz') {
    json(response, 200, { status: 'ok', service: 'skycoin4444-platform', version: application.version });
    return;
  }

  if (pathname === '/readyz') {
    const report = application.readiness([
      { name: 'application', status: 'pass', detail: 'HTTP application initialized' },
      { name: 'persistent_storage', status: 'unknown', detail: 'beta storage adapter not configured' },
      { name: 'payment_provider', status: 'unknown', detail: 'beta payment adapter not configured' },
    ]);
    json(response, report.status === 'not_ready' ? 503 : 200, report);
    return;
  }

  if (pathname === '/api/v1/beta/summary') {
    json(response, 200, {
      beta: true,
      version: application.version,
      capabilities: {
        identity: 'validation and tenant boundary foundation',
        marketplace: 'listing and payment-intent validation',
        ai: 'adapter boundary with deterministic test provider',
        collaboration: 'contract boundary only',
        infrastructure: 'health and readiness endpoints',
      },
      limitations: ['no real payments', 'no production credentials', 'no durable storage'],
    });
    return;
  }

  json(response, 404, { error: 'not_found' });
}

export function createBetaHttpServer(application: PlatformApplication): Server {
  return createServer((request, response) => route(application, request, response));
}
