export interface HealthStatus {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
}

export function getHealthStatus(service: string, version: string): HealthStatus {
  return {
    status: 'ok',
    service,
    version,
    timestamp: new Date().toISOString(),
  };
}
