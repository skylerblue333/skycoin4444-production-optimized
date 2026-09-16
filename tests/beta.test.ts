import { describe, expect, it } from 'vitest';
import { DeterministicTestAdapter } from '../src/platform/ai.js';
import {
  getBetaReadiness,
  runBetaModelRequest,
  validateBetaListing,
  validateBetaPayment,
} from '../src/platform/beta.js';

const admin = {
  id: 'user-1', type: 'user' as const, tenantId: 'tenant-1', roles: ['admin'], status: 'active' as const,
};
const context = { identity: admin, correlationId: 'corr-1' };

describe('v5 ultimate beta orchestration', () => {
  it('keeps marketplace operations inside the authenticated tenant', () => {
    const valid = validateBetaListing(context, {
      id: 'listing-1', tenantId: 'tenant-1', sellerId: 'user-1', title: 'Beta item',
      price: { currency: 'USD', minorUnits: 100 }, status: 'active',
    });
    const invalid = validateBetaListing(context, {
      id: 'listing-2', tenantId: 'tenant-2', sellerId: 'user-1', title: 'Cross-tenant item',
      price: { currency: 'USD', minorUnits: 100 }, status: 'active',
    });
    expect(valid.valid).toBe(true);
    expect(invalid.valid).toBe(false);
  });

  it('requires the payment buyer to match the authenticated identity', () => {
    const result = validateBetaPayment(context, {
      idempotencyKey: 'key-1', orderId: 'order-1', buyerId: 'other-user',
      amount: { currency: 'USD', minorUnits: 100 },
    });
    expect(result.valid).toBe(false);
  });

  it('runs an authorized deterministic AI request through the adapter boundary', async () => {
    const result = await runBetaModelRequest(context, new DeterministicTestAdapter(), {
      requestId: 'request-1', model: 'beta-test', input: 'hello', maxOutputTokens: 20,
    });
    expect(result.accepted).toBe(true);
    expect(result.value?.output).toBe('test-response:hello');
  });

  it('converts provider errors into a safe rejected operation', async () => {
    const result = await runBetaModelRequest(context, {
      name: 'failing-adapter',
      complete: async () => { throw new Error('provider unavailable'); },
    }, {
      requestId: 'request-2', model: 'beta-test', input: 'hello', maxOutputTokens: 20,
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('provider unavailable');
  });

  it('does not call an unknown beta readiness state ready', () => {
    expect(getBetaReadiness('platform-v5', '0.1.0-beta.1', [
      { name: 'payments', status: 'unknown', detail: 'not connected' },
    ]).status).toBe('unknown');
  });
});
