import type { ReadinessCheck, ReadinessReport } from './contracts.js';

export function getReadinessReport(
  service: string,
  version: string,
  checks: readonly ReadinessCheck[],
): ReadinessReport {
  const hasFailure = checks.some((check) => check.status === 'fail');
  const hasUnknown = checks.some((check) => check.status === 'unknown');
  const readinessPercentage = checks.length === 0
    ? 0
    : Math.round((checks.filter((check) => check.status === 'pass').length / checks.length) * 100);

  return {
    status: hasFailure ? 'not_ready' : hasUnknown ? 'unknown' : 'ready',
    readinessPercentage,
    service,
    version,
    checks,
  };
}
