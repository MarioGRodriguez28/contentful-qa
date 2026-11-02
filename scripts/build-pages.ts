import { cp, rm, writeFile } from 'node:fs/promises';
import { loadDeliveryConfig } from '../src/config';
import { configScript } from '../src/page-config';

// Builds the static site for GitHub Pages: the page files plus a config.js made from the secrets of the run.
const config = loadDeliveryConfig();
// Management tokens start with CFPAT-; the published page must only ever carry a read-only delivery token.
if (config.cdaToken.startsWith('CFPAT-')) {
  throw new Error('Refusing to publish: the token is a management token, not a Content Delivery token');
}
await rm('dist', { recursive: true, force: true });
await cp('web', 'dist', { recursive: true });
await writeFile('dist/config.js', configScript(config));
console.log('Built dist/ with the page and its config');
