import type { AuthorizationRequest, ReadinessReport } from './contracts.js';
import { authorize } from './policy.js';
import type { IdentityRecord } from './identity.js';
import { canAccessTenant, validateIdentity } from './identity.js';
import type { MarketplaceListing, PaymentIntentRequest, ValidationResult } from './marketplace.js';
import { validateListing, validatePaymentIntent } from './marketplace.js';
import type { ModelAdapter, ModelRequest, ModelResponse } from './ai.js';
import { getReadinessReport } from './readiness.js';

export interface BetaContext {
  readonly identity: IdentityRecord;
  readonly correlationId: string;
}

export interface BetaOperationResult<T> {
  readonly accepted: boolean;
  readonly value?: T;
  readonly reason: string;
}

function rejected<T>(reason: string): BetaOperationResult<T> {
  return { accepted: false, reason };
}

export function authorizeBetaOperation(
  context: BetaContext,
  request: Omit<AuthorizationRequest, 'principal'>,
): BetaOperationResult<true> {
  const identity = validateIdentity(context.identity);
  if (!identity.valid) return rejected(identity.errors.join('; '));
  if (!canAccessTenant(context.identity, context.identity.tenantId)) return rejected('tenant boundary failed');
  const decision = authorize(context.identity, request);
  return decision.allowed ? { accepted: true, value: true, reason: decision.reason } : rejected(decision.reason);
}

export function validateBetaListing(
  context: BetaContext,
  listing: MarketplaceListing,
): ValidationResult {
  if (!canAccessTenant(context.identity, listing.tenantId)) {
    return { valid: false, errors: ['listing crosses tenant boundary'] };
  }
  return validateListing(listing);
}

export function validateBetaPayment(
  context: BetaContext,
  payment: PaymentIntentRequest,
): ValidationResult {
  if (!payment.buyerId || payment.buyerId !== context.identity.id) {
    return { valid: false, errors: ['payment buyer does not match authenticated identity'] };
  }
  return validatePaymentIntent(payment);
}

export async function runBetaModelRequest(
  context: BetaContext,
  adapter: ModelAdapter,
  request: ModelRequest,
): Promise<BetaOperationResult<ModelResponse>> {
  const decision = authorizeBetaOperation(context, {
    action: 'write',
    resource: `ai/requests/${request.requestId}`,
    module: 'ai',
  });
  if (!decision.accepted) return rejected(decision.reason);
  try {
    return { accepted: true, value: await adapter.complete(request), reason: 'model request completed' };
  } catch (error) {
    return rejected(error instanceof Error ? error.message : 'model request failed');
  }
}

export function getBetaReadiness(
  service: string,
  version: string,
  checks: ReadinessReport['checks'],
): ReadinessReport {
  return getReadinessReport(service, version, checks);
}
