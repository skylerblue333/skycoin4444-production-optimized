import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AuditEvent } from './contracts.js';
import type { PaymentRecord } from './ledger.js';

export interface PaymentStore {
  getByIdempotency(key: string): PaymentRecord | undefined;
  save(payment: PaymentRecord): void;
}

export class InMemoryPaymentStore implements PaymentStore {
  private readonly records = new Map<string, PaymentRecord>();
  getByIdempotency(key: string): PaymentRecord | undefined { return this.records.get(key); }
  save(payment: PaymentRecord): void { this.records.set(payment.idempotencyKey, Object.freeze({ ...payment })); }
}

interface Snapshot { payments: PaymentRecord[]; audits: AuditEvent[]; }

export class JsonFileStore implements PaymentStore {
  private readonly snapshot: Snapshot;
  constructor(private readonly filename: string) {
    mkdirSync(dirname(filename), { recursive: true });
    try {
      this.snapshot = JSON.parse(readFileSync(filename, 'utf8')) as Snapshot;
    } catch {
      this.snapshot = { payments: [], audits: [] };
      this.flush();
    }
  }
  getByIdempotency(key: string): PaymentRecord | undefined {
    return this.snapshot.payments.find((payment) => payment.idempotencyKey === key);
  }
  save(payment: PaymentRecord): void {
    const index = this.snapshot.payments.findIndex((item) => item.idempotencyKey === payment.idempotencyKey);
    if (index >= 0) this.snapshot.payments[index] = payment;
    else this.snapshot.payments.push(payment);
    this.flush();
  }
  appendAudit(event: AuditEvent): void {
    if (this.snapshot.audits.some((item) => item.id === event.id)) return;
    this.snapshot.audits.push(event);
    this.flush();
  }
  listAudit(resource?: string): readonly AuditEvent[] {
    return resource ? this.snapshot.audits.filter((item) => item.resource === resource) : [...this.snapshot.audits];
  }
  private flush(): void {
    const temporary = `${this.filename}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(this.snapshot, null, 2)}\n`, { mode: 0o600 });
    renameSync(temporary, this.filename);
  }
}

export interface ProviderWebhook {
  readonly eventId: string;
  readonly paymentId: string;
  readonly state: 'authorized' | 'failed' | 'cancelled';
}

export function signWebhook(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(signWebhook(payload, secret), 'utf8');
  const actual = Buffer.from(signature, 'utf8');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function parseVerifiedWebhook(payload: string, signature: string, secret: string): ProviderWebhook {
  if (!verifyWebhook(payload, signature, secret)) throw new Error('invalid webhook signature');
  const event = JSON.parse(payload) as Partial<ProviderWebhook>;
  if (!event.eventId || !event.paymentId || !event.state) throw new Error('invalid webhook contract');
  return event as ProviderWebhook;
}
