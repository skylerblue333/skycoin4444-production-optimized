# SKYCOIN4444 Production Optimized

Modular foundation for the SKYCOIN4444 production platform v5 beta.

## Current status

This repository is an **early v5 beta foundation**, not a deployed production platform. It currently provides:

- a workspace manifest with strict TypeScript and Vitest checks;
- shared contracts for principals, authorization, audit events, readiness, and module boundaries;
- deny-by-default authorization behavior for the foundation policy;
- truthful readiness semantics that distinguish `ready`, `not_ready`, and `unknown`;
- a cross-module beta orchestration slice with tenant and buyer boundaries;
- deterministic and HTTP AI adapter boundaries with safe failure handling;
- tests covering the initial policy and readiness contracts.

It does **not** yet provide production authentication, real payment processing, message transport, durable audit storage, cloud deployment, or verified customer/revenue operations. AI integration is limited to adapter contracts and non-production test behavior.

## Five platform modules

The v5 beta is organized around five bounded modules:

1. **Identity and access** — principals, tenants, roles, sessions, and authorization.
2. **Marketplace and payments** — listings, orders, vendors, and explicit billing boundaries.
3. **ShadowChat collaboration** — conversations, notifications, and integrations.
4. **AI platform** — model routing, agents, evaluations, and usage limits.
5. **Developer and infrastructure platform** — APIs, health, readiness, jobs, observability, and deployment boundaries.

The foundation shares authorization, audit, readiness, correlation, and versioning contracts. Modules must not bypass these contracts through hidden cross-module state.

## Development

```bash
pnpm install
pnpm check
```

The v5 beta scope and purpose-specific value rubric are in [`docs/V5-BETA-SPEC.md`](docs/V5-BETA-SPEC.md).

The current branch is intended to evolve through pull requests. The default branch must not be modified directly.

## Production truth

The presence of deployment scripts or a repository name containing “production” is not evidence that the platform is deployed or production-ready. Before making that claim, verify the build, typecheck, tests, integration tests, deployment configuration, secrets management, database connectivity, authentication, authorization, observability, rollback, TLS, and end-to-end customer/payment workflows.

See [`docs/V5-BETA-SPEC.md`](docs/V5-BETA-SPEC.md) and [`docs/PLATFORM-V4-FOUNDATION.md`](docs/PLATFORM-V4-FOUNDATION.md) for boundaries and the staged implementation order. Existing deployment and legal documents remain planning material until independently verified in the target environment.

## License

See the checked-in license and applicable third-party dependency licenses. Commercial redistribution requires a clear license decision for this repository and all integrated components.
