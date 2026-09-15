import type { Principal } from './contracts.js';

export interface IdentityRecord extends Principal {
  readonly roles: readonly string[];
  readonly status: 'active' | 'suspended' | 'disabled';
}

export interface IdentityValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateIdentity(identity: IdentityRecord): IdentityValidation {
  const errors: string[] = [];
  if (!identity.id.trim()) errors.push('identity id is required');
  if (!identity.tenantId.trim()) errors.push('tenant id is required');
  if (identity.roles.length === 0) errors.push('at least one role is required');
  if (identity.status !== 'active') errors.push('identity is not active');
  return { valid: errors.length === 0, errors };
}

export function canAccessTenant(
  principal: Pick<Principal, 'tenantId'>,
  resourceTenantId: string,
): boolean {
  return Boolean(resourceTenantId.trim()) && principal.tenantId === resourceTenantId;
}
