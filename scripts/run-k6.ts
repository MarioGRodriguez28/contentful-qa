import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { loadDeliveryConfig } from '../src/config';

// The credentials reach k6 as environment variables, so they never appear in the command line.
const config = loadDeliveryConfig();
mkdirSync('reports', { recursive: true });

const result = spawnSync('k6', ['run', '--summary-export=reports/k6-summary.json', 'load/delivery-load.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    CONTENTFUL_SPACE_ID: config.spaceId,
    CONTENTFUL_ENVIRONMENT: config.environment,
    CONTENTFUL_CDA_TOKEN: config.cdaToken,
  },
});

if (result.error) {
  console.error(`Could not start k6: ${result.error.message}. Install it from https://grafana.com/docs/k6/latest/set-up/install-k6/`);
  process.exit(1);
}
process.exit(result.status ?? 1);
