import type { AuditEvent } from './contracts.js';
import type { Money } from './marketplace.js';

export type PaymentState = 'created' | 'authorized' | 'captured' | 'failed' | 'cancelled';

export interface PaymentRecord {
  readonly id: string;
  readonly orderId: string;
  readonly buyerId: string;
  readonly amount: Money;
  readonly idempotencyKey: string;
  readonly state: PaymentState;
  readonly providerReference?: string;
}

export interface AuditStore {
  append(event: AuditEvent): void;
  list(resource?: string): readonly AuditEvent[];
}

export class InMemoryAuditStore implements AuditStore {
  private readonly events: AuditEvent[] = [];

  append(event: AuditEvent): void {
    if (this.events.some((existing) => existing.id === event.id)) return;
    this.events.push(Object.freeze({ ...event }));
  }

  list(resource?: string): readonly AuditEvent[] {
    return resource ? this.events.filter((event) => event.resource === resource) : [...this.events];
  }
}

export interface PaymentProvider {
  authorize(payment: PaymentRecord): Promise<{ providerReference: string }>;
}

export class PaymentLedger {
  private readonly byIdempotency = new Map<string, PaymentRecord>();

  constructor(private readonly audit: AuditStore) {}

  create(payment: Omit<PaymentRecord, 'state'>, actor: AuditEvent['actor'], correlationId: string): PaymentRecord {
    const existing = this.byIdempotency.get(payment.idempotencyKey);
    if (existing) {
      if (existing.orderId !== payment.orderId || existing.amount.currency !== payment.amount.currency || existing.amount.minorUnits !== payment.amount.minorUnits) {
        throw new Error('idempotency key conflicts with an existing payment');
      }
      return existing;
    }
    const record: PaymentRecord = { ...payment, state: 'created' };
    this.byIdempotency.set(payment.idempotencyKey, record);
    this.audit.append({ id: `payment-created:${payment.id}`, occurredAt: new Date().toISOString(), actor, action: 'payment.created', resource: payment.id, outcome: 'allowed', correlationId });
    return record;
  }

  async authorize(idempotencyKey: string, provider: PaymentProvider, actor: AuditEvent['actor'], correlationId: string): Promise<PaymentRecord> {
    const existing = this.byIdempotency.get(idempotencyKey);
    if (!existing) throw new Error('payment does not exist');
    if (existing.state === 'authorized' || existing.state === 'captured') return existing;
    if (existing.state !== 'created') throw new Error(`payment cannot be authorized from ${existing.state}`);
    try {
      const result = await provider.authorize(existing);
      const authorized: PaymentRecord = { ...existing, state: 'authorized', providerReference: result.providerReference };
      this.byIdempotency.set(idempotencyKey, authorized);
      this.audit.append({ id: `payment-authorized:${existing.id}`, occurredAt: new Date().toISOString(), actor, action: 'payment.authorized', resource: existing.id, outcome: 'allowed', correlationId });
      return authorized;
    } catch (error) {
      const failed: PaymentRecord = { ...existing, state: 'failed' };
      this.byIdempotency.set(idempotencyKey, failed);
      this.audit.append({ id: `payment-failed:${existing.id}`, occurredAt: new Date().toISOString(), actor, action: 'payment.authorize_failed', resource: existing.id, outcome: 'error', correlationId });
      throw error;
    }
  }
}
