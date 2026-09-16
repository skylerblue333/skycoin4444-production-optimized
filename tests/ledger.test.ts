import { describe, expect, it } from 'vitest';
import { InMemoryAuditStore, PaymentLedger } from '../src/platform/ledger.js';

const actor = { id: 'admin-1', type: 'user' as const, tenantId: 'tenant-1' };
const payment = {
  id: 'payment-1', orderId: 'order-1', buyerId: 'buyer-1', idempotencyKey: 'idem-1',
  amount: { currency: 'USD', minorUnits: 500 },
};

describe('payment ledger', () => {
  it('returns the original payment on idempotent replay', () => {
    const audit = new InMemoryAuditStore();
    const ledger = new PaymentLedger(audit);
    const first = ledger.create(payment, actor, 'corr-1');
    const replay = ledger.create(payment, actor, 'corr-2');
    expect(replay).toEqual(first);
    expect(audit.list('payment-1')).toHaveLength(1);
  });

  it('rejects idempotency-key reuse with changed payment data', () => {
    const ledger = new PaymentLedger(new InMemoryAuditStore());
    ledger.create(payment, actor, 'corr-1');
    expect(() => ledger.create({ ...payment, amount: { currency: 'USD', minorUnits: 501 } }, actor, 'corr-2'))
      .toThrow('idempotency key conflicts');
  });

  it('authorizes once and returns the stable authorized record on replay', async () => {
    const audit = new InMemoryAuditStore();
    const ledger = new PaymentLedger(audit);
    ledger.create(payment, actor, 'corr-1');
    let calls = 0;
    const provider = { authorize: async () => { calls += 1; return { providerReference: 'provider-1' }; } };
    const first = await ledger.authorize('idem-1', provider, actor, 'corr-1');
    const replay = await ledger.authorize('idem-1', provider, actor, 'corr-2');
    expect(calls).toBe(1);
    expect(replay).toEqual(first);
    expect(first.state).toBe('authorized');
    expect(audit.list('payment-1')).toHaveLength(2);
  });

  it('records a failed authorization without retrying a failed charge blindly', async () => {
    const audit = new InMemoryAuditStore();
    const ledger = new PaymentLedger(audit);
    ledger.create(payment, actor, 'corr-1');
    const provider = { authorize: async () => { throw new Error('provider timeout'); } };
    await expect(ledger.authorize('idem-1', provider, actor, 'corr-1')).rejects.toThrow('provider timeout');
    expect(audit.list('payment-1').at(-1)?.action).toBe('payment.authorize_failed');
    await expect(ledger.authorize('idem-1', provider, actor, 'corr-2')).rejects.toThrow('payment cannot be authorized from failed');
  });
});
