import 'dotenv/config';

export interface Config {
  spaceId: string;
  environment: string;
  cmaToken: string;
  cdaToken: string;
}

const REQUIRED = {
  spaceId: 'CONTENTFUL_SPACE_ID',
  cmaToken: 'CONTENTFUL_CMA_TOKEN',
  cdaToken: 'CONTENTFUL_CDA_TOKEN',
} as const;

// Reports the names of the missing variables, never their values.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const missing = Object.values(REQUIRED).filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
  }
  return {
    spaceId: env[REQUIRED.spaceId]!.trim(),
    environment: env.CONTENTFUL_ENVIRONMENT?.trim() || 'master',
    cmaToken: env[REQUIRED.cmaToken]!.trim(),
    cdaToken: env[REQUIRED.cdaToken]!.trim(),
  };
}
