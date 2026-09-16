import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonFileStore, parseVerifiedWebhook, signWebhook, verifyWebhook } from '../src/platform/persistence.js';

describe('beta persistence and provider webhooks', () => {
  it('recovers payment state from a file-backed store', () => {
    const directory = mkdtempSync(join(tmpdir(), 'skycoin-beta-'));
    const filename = join(directory, 'state.json');
    const first = new JsonFileStore(filename);
    first.save({ id: 'payment-1', orderId: 'order-1', buyerId: 'buyer-1', idempotencyKey: 'idem-1', amount: { currency: 'USD', minorUnits: 100 }, state: 'authorized', providerReference: 'provider-1' });
    const restarted = new JsonFileStore(filename);
    expect(restarted.getByIdempotency('idem-1')?.state).toBe('authorized');
    rmSync(directory, { recursive: true, force: true });
  });

  it('writes audit events atomically and deduplicates event IDs', () => {
    const directory = mkdtempSync(join(tmpdir(), 'skycoin-audit-'));
    const store = new JsonFileStore(join(directory, 'state.json'));
    const event = { id: 'event-1', occurredAt: new Date().toISOString(), actor: { id: 'user-1', type: 'user' as const, tenantId: 'tenant-1' }, action: 'payment.authorized', resource: 'payment-1', outcome: 'allowed' as const, correlationId: 'corr-1' };
    store.appendAudit(event);
    store.appendAudit(event);
    expect(store.listAudit('payment-1')).toHaveLength(1);
    rmSync(directory, { recursive: true, force: true });
  });

  it('accepts valid signatures and rejects tampering', () => {
    const payload = JSON.stringify({ eventId: 'evt-1', paymentId: 'payment-1', state: 'authorized' });
    const signature = signWebhook(payload, 'test-secret');
    expect(verifyWebhook(payload, signature, 'test-secret')).toBe(true);
    expect(verifyWebhook(`${payload}x`, signature, 'test-secret')).toBe(false);
    expect(parseVerifiedWebhook(payload, signature, 'test-secret').eventId).toBe('evt-1');
  });

  it('rejects malformed or unsigned provider callbacks', () => {
    expect(() => parseVerifiedWebhook('{}', 'wrong', 'test-secret')).toThrow('invalid webhook signature');
    const payload = JSON.stringify({ eventId: 'evt-1' });
    expect(() => parseVerifiedWebhook(payload, signWebhook(payload, 'test-secret'), 'test-secret')).toThrow('invalid webhook contract');
  });
});
