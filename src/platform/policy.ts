import type {
  AuthorizationDecision,
  AuthorizationRequest,
  PlatformModule,
  Principal,
} from './contracts.js';

const POLICY_VERSION = 'v4-foundation.1';

const rolePermissions: Readonly<Record<string, readonly string[]>> = {
  admin: ['*:*'],
  operator: ['infrastructure:read', 'infrastructure:operate', 'collaboration:read'],
  member: ['collaboration:read', 'collaboration:write', 'marketplace:read'],
};

export function authorize(
  principal: Principal & { readonly roles?: readonly string[] },
  request: Omit<AuthorizationRequest, 'principal'>,
): AuthorizationDecision {
  const permission = `${request.module}:${request.action}`;
  const permissions = (principal.roles ?? []).flatMap(
    (role) => rolePermissions[role] ?? [],
  );
  const allowed = permissions.includes('*:*') || permissions.includes(permission);

  return {
    allowed,
    reason: allowed
      ? 'A configured role grants this action.'
      : 'No configured role grants this action.',
    policyVersion: POLICY_VERSION,
  };
}

export function supportedModules(): readonly PlatformModule[] {
  return ['identity', 'marketplace', 'collaboration', 'ai', 'infrastructure'];
}
