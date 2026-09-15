export type PlatformModule =
  | 'identity'
  | 'marketplace'
  | 'collaboration'
  | 'ai'
  | 'infrastructure';

export type PrincipalType = 'user' | 'service';

export interface Principal {
  readonly id: string;
  readonly type: PrincipalType;
  readonly tenantId: string;
}

export interface AuthorizationRequest {
  readonly principal: Principal;
  readonly action: string;
  readonly resource: string;
  readonly module: PlatformModule;
}

export interface AuthorizationDecision {
  readonly allowed: boolean;
  readonly reason: string;
  readonly policyVersion: string;
}

export interface AuditEvent {
  readonly id: string;
  readonly occurredAt: string;
  readonly actor: Principal;
  readonly action: string;
  readonly resource: string;
  readonly outcome: 'allowed' | 'denied' | 'error';
  readonly correlationId: string;
}

export interface ReadinessCheck {
  readonly name: string;
  readonly status: 'pass' | 'fail' | 'unknown';
  readonly detail: string;
}

export interface ReadinessReport {
  readonly status: 'ready' | 'not_ready' | 'unknown';
  readonly service: string;
  readonly version: string;
  readonly checks: readonly ReadinessCheck[];
}
