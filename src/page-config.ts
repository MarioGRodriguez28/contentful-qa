import type { DeliveryConfig } from './config';

// The page reads published content from the browser, so it receives only the read-only delivery token.
export function configScript(config: DeliveryConfig): string {
  return `window.CONTENTFUL = ${JSON.stringify({ spaceId: config.spaceId, environment: config.environment, token: config.cdaToken })};`;
}
