# Marketplace and Payments Module Specification

## Status and scope

This specification defines the next implementation boundary for the v4 Marketplace and Payments module. The current branch implements validation contracts and tests only. It does not process real payments, hold funds, perform KYC/AML decisions, or connect to a payment provider.

## Goals

The module must support a tenant-scoped marketplace in which sellers publish listings, buyers create orders, and a payment boundary can safely request authorization for an order. Every money-moving attempt must be idempotent, auditable, attributable to a buyer and tenant, and recoverable after timeout or provider failure.

## Non-goals for the first release

The first release will not implement custody, stored payment credentials, refunds, chargebacks, tax calculation, KYC/AML adjudication, cross-border settlement, cryptocurrency conversion, or real-money production transactions. These require legal, compliance, provider, and operational review.

## Core entities

### Listing

A listing contains `id`, `tenantId`, `sellerId`, `title`, `price`, and `status`. An active listing must have a non-empty title and positive safe-integer minor-unit price with an uppercase three-letter currency code. Listing ownership and tenant access must be checked before mutation.

### Order

An order must contain `id`, `tenantId`, `buyerId`, line items, a total calculated by the server, and a lifecycle status. The client must never be trusted to provide the authoritative total. Order transitions must be explicit and monotonic except for documented cancellation or recovery transitions.

### Payment intent

A payment intent contains `idempotencyKey`, `orderId`, `buyerId`, and a server-calculated `Money` amount. The idempotency key must be unique within the tenant and operation scope. Replaying the same key with the same request returns the original result. Reusing it with a different amount, buyer, order, or currency fails with a conflict.

### Audit event

Each order and payment transition emits an audit event containing actor, tenant, action, resource, outcome, correlation ID, and timestamp. Sensitive payment credentials, full payment instrument data, and provider secrets must never enter the audit payload.

## State model

The proposed order states are `draft`, `pending_payment`, `paid`, `fulfillment_pending`, `fulfilled`, `cancelled`, `payment_failed`, and `refunded`. Valid transitions must be encoded in one state machine and tested. Provider callbacks must be authenticated, deduplicated, and reconciled against the local intent and order.

## Security requirements

All reads and writes are tenant-scoped. Authorization must distinguish buyer, seller, operator, and administrator actions. Administrative operations require explicit roles and audit events. Input validation must reject malformed currency, non-positive amounts, unsafe integers, empty identifiers, and unexpected state transitions. Rate limits and replay protection are required at public endpoints. Secrets belong in the platform secret manager, never in source, fixtures, logs, or repository configuration.

## Reliability requirements

Order creation and payment authorization must be idempotent. Provider timeouts must produce an explicitly recoverable state rather than an automatic duplicate charge. Webhook processing must be retry-safe and use durable event identifiers. A reconciliation job must identify local/provider mismatches. Database migrations must be backward-compatible where rolling deployment requires it, and every migration needs a rollback or restoration procedure.

## Acceptance tests

The first implementation is accepted only when tests cover:

1. active listings require valid positive pricing;
2. listing reads and writes reject cross-tenant access;
3. order totals are calculated server-side;
4. duplicate idempotency keys return the same result;
5. idempotency-key reuse with changed request data is rejected;
6. payment provider timeout does not create a second charge;
7. duplicate webhook delivery is safe;
8. invalid webhook signatures are rejected;
9. unauthorized seller, buyer, and admin operations are rejected;
10. every state transition produces the expected audit event;
11. payment secrets and full payment instruments are absent from logs and audit events;
12. migrations and recovery behavior are exercised in integration tests.

The current branch covers the validation subset for money, listings, and payment intent shape. It intentionally leaves provider integration and durable state for subsequent implementation.
