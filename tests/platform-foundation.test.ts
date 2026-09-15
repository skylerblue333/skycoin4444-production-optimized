import { describe, expect, it } from 'vitest';
import { authorize, supportedModules } from '../src/platform/policy.js';
import { getReadinessReport } from '../src/platform/readiness.js';

const member = {
  id: 'user-1',
  type: 'user' as const,
  tenantId: 'tenant-1',
  roles: ['member'],
};

describe('platform v4 authorization foundation', () => {
  it('denies access when no role grants the requested action', () => {
    const decision = authorize(member, {
      action: 'operate',
      resource: 'production/deployments',
      module: 'infrastructure',
    });

    expect(decision.allowed).toBe(false);
    expect(decision.policyVersion).toBe('v4-foundation.1');
  });

  it('grants only the member permissions explicitly declared by policy', () => {
    const decision = authorize(member, {
      action: 'read',
      resource: 'marketplace/listings',
      module: 'marketplace',
    });

    expect(decision.allowed).toBe(true);
  });

  it('exposes the five bounded platform modules', () => {
    expect(supportedModules()).toEqual([
      'identity',
      'marketplace',
      'collaboration',
      'ai',
      'infrastructure',
    ]);
  });
});

describe('platform readiness', () => {
  it('reports not_ready when an operational check fails', () => {
    const report = getReadinessReport('platform-v4', '0.1.0', [
      { name: 'database', status: 'fail', detail: 'not configured' },
    ]);

    expect(report.status).toBe('not_ready');
  });

  it('does not claim readiness when a check is unknown', () => {
    const report = getReadinessReport('platform-v4', '0.1.0', [
      { name: 'payments', status: 'unknown', detail: 'not integrated' },
    ]);

    expect(report.status).toBe('unknown');
  });
});
