import { describe, expect, it } from 'vitest';
import { getHealthStatus } from '../src/platform/health.js';

describe('platform health', () => {
  it('returns a valid operational health contract', () => {
    const result = getHealthStatus('skycoin4444-production-optimized', '1.0.0-beta.1');

    expect(result.status).toBe('ok');
    expect(result.service).toBe('skycoin4444-production-optimized');
    expect(result.version).toBe('1.0.0-beta.1');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
