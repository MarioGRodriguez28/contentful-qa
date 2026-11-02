import 'dotenv/config';

export interface DeliveryConfig {
  spaceId: string;
  environment: string;
  cdaToken: string;
}

export interface Config extends DeliveryConfig {
  cmaToken: string;
}

const NAMES = {
  spaceId: 'CONTENTFUL_SPACE_ID',
  cdaToken: 'CONTENTFUL_CDA_TOKEN',
  cmaToken: 'CONTENTFUL_CMA_TOKEN',
} as const;

function assertPresent(env: NodeJS.ProcessEnv, names: string[]): void {
  const missing = names.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
  }
}

// Read-only suites and the page server only need the delivery token, so CI never has to hold a write token.
// The error names the missing variables and never prints a value.
export function loadDeliveryConfig(env: NodeJS.ProcessEnv = process.env): DeliveryConfig {
  assertPresent(env, [NAMES.spaceId, NAMES.cdaToken]);
  return {
    spaceId: env[NAMES.spaceId]!.trim(),
    environment: env.CONTENTFUL_ENVIRONMENT?.trim() || 'master',
    cdaToken: env[NAMES.cdaToken]!.trim(),
  };
}

// The seed script writes content, so it also needs the management token.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  assertPresent(env, [NAMES.spaceId, NAMES.cmaToken, NAMES.cdaToken]);
  return { ...loadDeliveryConfig(env), cmaToken: env[NAMES.cmaToken]!.trim() };
}
