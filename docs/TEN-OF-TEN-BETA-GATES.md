# 10/10 Beta Quality Gates

## Meaning of 10/10

A 10/10 score is not a claim based on repository count, feature count, or polished language. It means the beta meets all applicable gates for its declared scope, has no unresolved critical security or ownership issue, and has evidence that another person can reproduce the result.

The current platform remains below 10/10. This document defines the path to earn the score.

## Gate 1 — Product value

- One target user and one primary problem are documented.
- The main workflow can be completed end-to-end.
- A new beta user can understand the product and begin without maintainer intervention.
- Beta feedback is collected and converted into prioritized changes.
- Scope excludes features that do not support the primary workflow.

**Evidence:** user journey, demo, onboarding instructions, feedback records, and success metric.

## Gate 2 — Identity and tenant security

- Authentication and session management use a reviewed provider or a reviewed implementation.
- Authorization is deny-by-default and tested for every sensitive operation.
- Tenant isolation is enforced at the persistence boundary, not only in request helpers.
- Administrative actions require explicit roles and produce audit events.
- Sessions, tokens, recovery, account disablement, and rate limits are documented and tested.

**Evidence:** threat model, authorization matrix, negative tests, security review, and incident procedure.

## Gate 3 — Marketplace and payments

- Server-side totals are authoritative.
- Orders and payment intents have an explicit state machine.
- Idempotency is durable and conflict-safe.
- Provider callbacks are authenticated, deduplicated, and replay-safe.
- Timeout, retry, reconciliation, cancellation, and recovery behavior are tested.
- No real money is processed until legal, provider, compliance, and operational review is complete.

**Evidence:** integration tests, reconciliation report, provider sandbox run, audit events, and rollback procedure.

## Gate 4 — AI safety and quality

- Provider credentials are isolated from source and logs.
- Requests have input, token, timeout, concurrency, and cost limits.
- Retries are bounded and do not duplicate unsafe actions.
- Outputs are validated before downstream use.
- Model versions, prompts, evaluation fixtures, and regressions are tracked.
- Sensitive data handling, retention, abuse, and human-review boundaries are documented.

**Evidence:** adapter tests, timeout tests, cost telemetry, evaluation report, and abuse test results.

## Gate 5 — Reliability and operations

- CI runs on pull requests and the default branch.
- Builds and deployments are reproducible.
- Health, readiness, metrics, logs, and alerts are useful and privacy-aware.
- Backups, restore tests, migrations, rollback, and incident response exist.
- Resource limits, rate limits, timeouts, and graceful shutdown are verified.
- Staging behavior is tested before any production claim.

**Evidence:** CI history, staging deployment, restore log, rollback drill, dashboards, and runbook.

## Gate 6 — Supply-chain and repository security

- Workflow permissions are least-privilege.
- Third-party actions are pinned and reviewed.
- Secrets are scanned, rotated, and absent from repository history where applicable.
- Dependencies have an update and vulnerability-triage policy.
- Code review, CODEOWNERS, branch protection, and security reporting are configured.
- Relevant static analysis, dependency review, and Scorecard checks are addressed.

**Evidence:** workflow review, scan results, dependency decisions, protected branch settings, and review records.

## Gate 7 — User experience and accessibility

- Core web workflows work with keyboard navigation.
- Forms have labels, useful errors, visible focus, and accessible authentication.
- Information has meaningful structure, contrast, text alternatives, and responsive behavior.
- Important flows are tested with automated checks and manual review.

**Evidence:** WCAG-focused test checklist, screenshots or recordings, issue log, and resolved findings.

## Gate 8 — Ownership, legal, and lifecycle

- Every integrated component has known provenance and compatible licensing.
- Private, personal, generated, and third-party materials are classified.
- Data retention, deletion, privacy, and terms are appropriate to the beta.
- The canonical repository and successor/archive relationships are explicit.
- Commercial claims are supported by evidence and limitations are visible.

**Evidence:** dependency inventory, license review, privacy decisions, repository register, and published limitations.

## Scoring rule

Each gate is scored:

- **0:** absent or contradicted by evidence
- **1:** partially implemented or locally demonstrated
- **2:** implemented, tested, documented, and reproducible

A 10/10 beta requires all eight gates to score 2 for the applicable scope, plus no critical open issue. If a gate is not applicable, the reason must be documented; it cannot be silently ignored.

The current v5 beta has meaningful progress in contracts, tests, application routing, readiness reporting, and adapter boundaries. It does not yet meet the evidence threshold for durable identity, payments, operations, security review, accessibility, or adoption. Therefore it must not be labeled 10/10 yet.

## Execution order

1. Add durable persistence interfaces and audit events.
2. Implement a non-production order/payment state machine with idempotency and webhook replay tests.
3. Add AI timeout, cost, output, and evaluation controls.
4. Add authentication/session boundaries and negative authorization tests.
5. Add staging deployment, observability, backup/restore, and rollback evidence.
6. Test core user flows for accessibility and onboarding.
7. Review licenses, provenance, secrets, workflows, and repository lifecycle.
8. Run the complete gate review and publish the evidence.
