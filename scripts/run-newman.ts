import newman from 'newman';
import { loadDeliveryConfig } from '../src/config';

// The exported environment holds no secrets; the space id and token are injected from .env at run time.
const config = loadDeliveryConfig();

newman.run(
  {
    collection: 'postman/collection.json',
    environment: 'postman/environment.json',
    envVar: [
      { key: 'spaceId', value: config.spaceId },
      { key: 'environment', value: config.environment },
      { key: 'cdaToken', value: config.cdaToken },
    ],
    reporters: ['cli', 'junit'],
    reporter: { junit: { export: 'reports/postman-junit.xml' } },
    timeoutRequest: 15_000,
  },
  (error, summary) => {
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    process.exit(summary.run.failures.length > 0 ? 1 : 0);
  },
);
