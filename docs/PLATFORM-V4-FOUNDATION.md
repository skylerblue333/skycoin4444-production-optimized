# Platform v4 Foundation

## Purpose

This repository is the integration boundary for a modular Skycoin production platform. The initial v4 implementation establishes shared contracts before feature modules are connected. It does not claim that the platform is deployed, revenue-generating, secure by independent review, or production-ready.

## Five bounded modules

| Module | Initial responsibility | Explicit boundary |
| --- | --- | --- |
| Identity | Principals, tenants, roles, sessions, authorization inputs | No password, OAuth, or cryptographic implementation yet |
| Marketplace | Listings, orders, vendor and billing boundaries | No real payment processing yet |
| Collaboration | Conversations, notifications, integration events | No message transport or retention implementation yet |
| AI | Model routing, agent boundaries, evaluations, usage limits | No model provider or autonomous action integration yet |
| Infrastructure | Health, readiness, jobs, observability, deployment boundaries | No production deployment or cloud credentials yet |

The modules share contracts for authorization, audit events, readiness, correlation, and versioning. They should not share hidden database tables or bypass authorization through direct calls.

## Security posture of the foundation

Authorization is deny-by-default for actions not explicitly granted by a role. The current policy is an in-memory foundation for tests; it is not an identity provider, access-control service, or compliance control. Before production use, policy storage, tenant isolation, administrative approval, audit persistence, session security, and independent review are required.

Readiness is deliberately separate from liveness. A healthy process can be alive while the platform is not ready to serve production traffic. Unknown checks prevent a `ready` result.

## Quality gates

Every change must pass:

- strict TypeScript compilation;
- deterministic unit tests;
- formatting checks;
- dependency and secret review;
- workflow permission review;
- module-boundary review;
- documentation and rollback update.

High-risk modules additionally require threat modeling, authorization tests, input validation, rate limits, audit coverage, data classification, dependency review, and operational rollback evidence.

## V4 implementation order

1. Establish identity and tenant contracts.
2. Add durable policy and audit interfaces behind tests.
3. Add marketplace catalog behavior with fake payment boundaries.
4. Add collaboration event contracts and bounded message behavior.
5. Add AI provider interfaces, evaluation fixtures, and cost limits.
6. Add infrastructure adapters for health, readiness, jobs, metrics, and deployment.
7. Integrate one vertical slice end-to-end with non-production adapters.
8. Validate security, reliability, accessibility, and rollback before any real deployment.

## What would justify a production claim

A production claim requires evidence for the actual deployment: reproducible build, protected review, dependency and secret controls, authenticated and authorized flows, database migration and backup procedures, observability, incident response, rollback, load/resource boundaries, accessibility for applicable UI, and real end-to-end validation. Repository scripts and names are not evidence by themselves.
