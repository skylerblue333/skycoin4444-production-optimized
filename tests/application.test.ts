import { describe, expect, it } from 'vitest';
import { DeterministicTestAdapter } from '../src/platform/ai.js';
import { createPlatformApplication } from '../src/platform/application.js';

const app = createPlatformApplication({
  identity: {
    id: 'user-1', type: 'user', tenantId: 'tenant-1', roles: ['admin'], status: 'active',
  },
  correlationId: 'corr-application-1',
}, '0.1.0-beta.1');

describe('platform application facade', () => {
  it('exposes the beta version and validates a complete listing flow', () => {
    expect(app.version).toBe('0.1.0-beta.1');
    expect(app.validateListing({
      id: 'listing-1', tenantId: 'tenant-1', sellerId: 'user-1', title: 'Beta service',
      price: { currency: 'USD', minorUnits: 2500 }, status: 'active',
    }).valid).toBe(true);
  });

  it('routes AI requests through the adapter contract', async () => {
    const result = await app.requestModel(new DeterministicTestAdapter(), {
      requestId: 'app-request-1', model: 'test-model', input: 'summarize', maxOutputTokens: 40,
    });
    expect(result.accepted).toBe(true);
    expect(result.value?.output).toBe('test-response:summarize');
  });

  it('reports unknown dependencies as unknown readiness', () => {
    expect(app.readiness([
      { name: 'database', status: 'unknown', detail: 'not configured' },
    ]).status).toBe('unknown');
  });
});
