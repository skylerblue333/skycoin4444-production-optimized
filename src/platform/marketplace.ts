export interface Money {
  readonly currency: string;
  readonly minorUnits: number;
}

export interface MarketplaceListing {
  readonly id: string;
  readonly tenantId: string;
  readonly sellerId: string;
  readonly title: string;
  readonly price: Money;
  readonly status: 'draft' | 'active' | 'suspended';
}

export interface PaymentIntentRequest {
  readonly idempotencyKey: string;
  readonly orderId: string;
  readonly buyerId: string;
  readonly amount: Money;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateMoney(money: Money): ValidationResult {
  const errors: string[] = [];
  if (!/^[A-Z]{3}$/.test(money.currency)) errors.push('currency must be an ISO 4217 uppercase code');
  if (!Number.isSafeInteger(money.minorUnits) || money.minorUnits <= 0) {
    errors.push('minorUnits must be a positive safe integer');
  }
  return { valid: errors.length === 0, errors };
}

export function validateListing(listing: MarketplaceListing): ValidationResult {
  const errors: string[] = [];
  if (!listing.id.trim()) errors.push('listing id is required');
  if (!listing.tenantId.trim()) errors.push('tenant id is required');
  if (!listing.sellerId.trim()) errors.push('seller id is required');
  if (!listing.title.trim()) errors.push('title is required');
  if (listing.status === 'active' && !validateMoney(listing.price).valid) {
    errors.push('active listings must have valid positive pricing');
  }
  return { valid: errors.length === 0, errors };
}

export function validatePaymentIntent(request: PaymentIntentRequest): ValidationResult {
  const errors: string[] = [];
  if (!request.idempotencyKey.trim()) errors.push('idempotency key is required');
  if (!request.orderId.trim()) errors.push('order id is required');
  if (!request.buyerId.trim()) errors.push('buyer id is required');
  if (!validateMoney(request.amount).valid) errors.push('payment amount is invalid');
  return { valid: errors.length === 0, errors };
}
