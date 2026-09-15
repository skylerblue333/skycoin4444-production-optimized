# Platform v5 Ultimate Beta Specification

## What v5 is

v5 is a controlled beta integration layer across five bounded capabilities: identity and access, marketplace and payments, ShadowChat collaboration, AI, and infrastructure. It is not a claim of production readiness, security certification, billion-dollar quality, revenue, or customer adoption.

The beta exists to prove that the modules can share tenant boundaries, authorization decisions, validation contracts, correlation, readiness reporting, and failure handling without becoming one untestable monolith.

## Beta vertical slice

The first vertical slice is:

1. An active identity enters a tenant-scoped context.
2. The identity is authorized for a module operation.
3. A listing or payment intent is validated without crossing tenant or buyer boundaries.
4. An AI request is validated and sent through a provider adapter.
5. Provider failure becomes a safe rejected operation rather than an unhandled exception.
6. Readiness reports unknown dependencies as `unknown`, never as `ready`.

The slice currently uses in-memory contracts and deterministic test adapters. Persistence, real provider credentials, payment processing, message transport, and deployment are intentionally excluded from the beta foundation.

## Release gates

### Required before private beta

- tenant-scoped persistence design;
- durable audit interface;
- identity/session threat model;
- payment lifecycle state machine and idempotency store;
- webhook signature and replay tests;
- AI adapter timeout, retry, cost, and output policy;
- dependency and secret scanning;
- protected pull-request review;
- local setup and test documentation;
- test fixtures that contain no real personal or payment data.

### Required before public beta

- staging deployment with rollback;
- error tracking and operational dashboards;
- documented data retention and deletion;
- abuse and rate-limit controls;
- accessibility review for user-facing interfaces;
- load and failure testing for core workflows;
- support process and incident response;
- clear beta limitations and user consent.

### Required before production claim

Real production validation is required for authentication, authorization, database migrations, payment provider flows, AI provider behavior, backups, observability, TLS, secrets, deployment isolation, incident response, and rollback. A repository name, checklist, or deployment script is not evidence by itself.

## Portfolio value rubric

Every repository should receive a purpose-specific score, not a universal “10/10.” A repository can be 10/10 for a learning experiment while being unsuitable for production. Score each dimension from 0 to 2:

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Purpose | unclear or misleading | stated but broad | specific user/problem and scope |
| Evidence | no runnable proof | partial demo or tests | reproducible proof and known limits |
| Maintainability | no owner/status | intermittent maintenance | owner, lifecycle, CI, dependencies |
| Security | unknown or unsafe | basic controls | risk-appropriate controls and review |
| Reliability | no failure model | partial tests | boundaries, observability, recovery |
| Usability | difficult to start | basic instructions | clear onboarding and feedback loop |
| Reuse | one-off or tangled | possible reuse | stable API, examples, versioning |
| Adoption | no users/evidence | testers or feedback | repeated real usage or customers |
| Differentiation | generic concept | some focus | defensible advantage or insight |
| Governance | unclear license/IP | partial documentation | explicit license, provenance, contribution, privacy |

The maximum is 20. A repository is “10/10 valuable” only relative to its declared purpose when it scores at least 18/20 and has no critical unresolved security or ownership issue. For a production product, adoption and operational evidence are mandatory; documentation alone cannot produce a 10/10.

## Portfolio actions by score

- **18–20:** flagship or reusable asset; invest and publish evidence.
- **14–17:** active improvement candidate; fix the highest-risk gaps.
- **9–13:** experiment or maintenance candidate; narrow scope and improve truthfulness.
- **0–8:** archive, consolidate, privatize, or rewrite only after ownership review.

Score separately for the repository’s intended role. Do not compare a manuscript, a library, a prototype, and a deployed service using identical expectations.
