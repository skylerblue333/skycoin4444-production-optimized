import { createPlatformApplication } from './application.js';
import { createBetaHttpServer } from './http-app.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const application = createPlatformApplication({
  identity: {
    id: 'beta-system',
    type: 'service',
    tenantId: 'beta-tenant',
    roles: ['admin'],
    status: 'active',
  },
  correlationId: 'server-startup',
});

const server = createBetaHttpServer(application);
server.listen(port, '0.0.0.0', () => {
  console.log(`SKYCOIN4444 private beta listening on 0.0.0.0:${port}`);
});

function shutdown(signal: string): void {
  server.close((error) => {
    if (error) {
      console.error(`shutdown failed after ${signal}:`, error);
      process.exitCode = 1;
    }
    process.exit();
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
