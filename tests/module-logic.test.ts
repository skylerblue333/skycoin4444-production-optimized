import { describe, expect, it } from 'vitest';
import { canAccessTenant, validateIdentity } from '../src/platform/identity.js';
import {
  validateListing,
  validateMoney,
  validatePaymentIntent,
} from '../src/platform/marketplace.js';
import {
  DeterministicTestAdapter,
  HttpModelAdapter,
  ValidationError,
  validateModelRequest,
} from '../src/platform/ai.js';

describe('identity and access', () => {
  it('validates active identities with tenant and roles', () => {
    expect(validateIdentity({
      id: 'user-1', type: 'user', tenantId: 'tenant-1', roles: ['member'], status: 'active',
    }).valid).toBe(true);
  });

  it('rejects suspended identities and prevents cross-tenant access', () => {
    expect(validateIdentity({
      id: 'user-1', type: 'user', tenantId: 'tenant-1', roles: ['member'], status: 'suspended',
    }).valid).toBe(false);
    expect(canAccessTenant({ tenantId: 'tenant-1' }, 'tenant-2')).toBe(false);
  });
});

describe('marketplace and payments specification', () => {
  it('accepts positive ISO currency amounts only', () => {
    expect(validateMoney({ currency: 'USD', minorUnits: 1099 }).valid).toBe(true);
    expect(validateMoney({ currency: 'usd', minorUnits: 1099 }).valid).toBe(false);
    expect(validateMoney({ currency: 'USD', minorUnits: 0 }).valid).toBe(false);
  });

  it('requires identity and idempotency before payment processing', () => {
    expect(validatePaymentIntent({
      idempotencyKey: 'order-1-attempt-1', orderId: 'order-1', buyerId: 'user-1',
      amount: { currency: 'USD', minorUnits: 500 },
    }).valid).toBe(true);
    expect(validatePaymentIntent({
      idempotencyKey: '', orderId: 'order-1', buyerId: 'user-1',
      amount: { currency: 'USD', minorUnits: 500 },
    }).valid).toBe(false);
  });

  it('does not activate a listing with invalid pricing', () => {
    expect(validateListing({
      id: 'listing-1', tenantId: 'tenant-1', sellerId: 'seller-1', title: 'Item',
      price: { currency: 'USD', minorUnits: 100 }, status: 'active',
    }).valid).toBe(true);
    expect(validateListing({
      id: 'listing-1', tenantId: 'tenant-1', sellerId: 'seller-1', title: 'Item',
      price: { currency: 'USD', minorUnits: 0 }, status: 'active',
    }).valid).toBe(false);
  });
});

describe('AI integration adapters', () => {
  it('rejects unbounded model requests', () => {
    expect(() => validateModelRequest({ requestId: '', model: 'test', input: 'hi', maxOutputTokens: 10 }))
      .toThrowError(ValidationError);
    expect(() => validateModelRequest({ requestId: 'r1', model: 'test', input: 'hi', maxOutputTokens: 9000 }))
      .toThrowError(ValidationError);
  });

  it('provides a deterministic adapter for tests and local development', async () => {
    const response = await new DeterministicTestAdapter().complete({
      requestId: 'r1', model: 'test-model', input: 'hello', maxOutputTokens: 20,
    });
    expect(response.output).toBe('test-response:hello');
    expect(response.requestId).toBe('r1');
  });

  it('validates HTTP provider response contracts', async () => {
    const adapter = new HttpModelAdapter('https://model.invalid', {
      post: async () => ({
        status: 200,
        body: JSON.stringify({ requestId: 'r2', model: 'provider-model', output: 'ok' }),
      }),
    });
    await expect(adapter.complete({
      requestId: 'r2', model: 'provider-model', input: 'hello', maxOutputTokens: 20,
    })).resolves.toMatchObject({ output: 'ok', requestId: 'r2' });
  });
});
