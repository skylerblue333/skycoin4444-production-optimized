import type { ReadinessCheck, ReadinessReport } from './contracts.js';

export function getReadinessReport(
  service: string,
  version: string,
  checks: readonly ReadinessCheck[],
): ReadinessReport {
  const hasFailure = checks.some((check) => check.status === 'fail');
  const hasUnknown = checks.some((check) => check.status === 'unknown');

  return {
    status: hasFailure ? 'not_ready' : hasUnknown ? 'unknown' : 'ready',
    service,
    version,
    checks,
  };
}
