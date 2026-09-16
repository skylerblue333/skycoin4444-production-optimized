import type { ModelAdapter, ModelRequest, ModelResponse } from './ai.js';
import { runBetaModelRequest, validateBetaListing, validateBetaPayment } from './beta.js';
import type { BetaContext, BetaOperationResult } from './beta.js';
import type { MarketplaceListing, PaymentIntentRequest, ValidationResult } from './marketplace.js';
import type { ReadinessCheck, ReadinessReport } from './contracts.js';
import { getBetaReadiness } from './beta.js';

export interface PlatformApplication {
  readonly version: string;
  validateListing(listing: MarketplaceListing): ValidationResult;
  validatePayment(payment: PaymentIntentRequest): ValidationResult;
  requestModel(adapter: ModelAdapter, request: ModelRequest): Promise<BetaOperationResult<ModelResponse>>;
  readiness(checks: readonly ReadinessCheck[]): ReadinessReport;
}

export function createPlatformApplication(
  context: BetaContext,
  version = '0.1.0-beta.1',
): PlatformApplication {
  return {
    version,
    validateListing: (listing) => validateBetaListing(context, listing),
    validatePayment: (payment) => validateBetaPayment(context, payment),
    requestModel: (adapter, request) => runBetaModelRequest(context, adapter, request),
    readiness: (checks) => getBetaReadiness('skycoin4444-platform', version, checks),
  };
}
