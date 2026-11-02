import { loadConfig } from '../src/config';
import { call, createCma, expectOk, type Sys } from '../src/cma';
import { ARTICLES, ARTICLE_CONTENT_TYPE, CONTENT_TYPE_ID, toFields } from '../src/seed-data';

async function main(): Promise<void> {
  const config = loadConfig();
  const cma = createCma(config);
  const env = `/environments/${config.environment}`;

  const space = expectOk(await call(cma, 'get', ''), 'Connecting to the space').data as { name: string };
  console.log(`Connected to space "${space.name}", environment ${config.environment}`);

  const locales = expectOk(await call(cma, 'get', `${env}/locales`), 'Reading locales').data as { items: { code: string; default: boolean }[] };
  const locale = locales.items.find((l) => l.default)?.code ?? 'en-US';

  const typeUrl = `${env}/content_types/${CONTENT_TYPE_ID}`;
  const existingType = await call(cma, 'get', typeUrl);
  const typeVersion: Record<string, string | number> = existingType.status === 200 ? { 'X-Contentful-Version': (existingType.data as { sys: Sys }).sys.version } : {};
  const savedType = expectOk(await call(cma, 'put', typeUrl, ARTICLE_CONTENT_TYPE, typeVersion), 'Saving the content type').data as { sys: Sys };
  expectOk(await call(cma, 'put', `${typeUrl}/published`, undefined, { 'X-Contentful-Version': savedType.sys.version }), 'Publishing the content type');
  console.log(`Content type "${CONTENT_TYPE_ID}" is published`);

  for (const article of ARTICLES) {
    const entryUrl = `${env}/entries/${article.id}`;
    const existing = await call(cma, 'get', entryUrl);
    const headers: Record<string, string | number> = { 'X-Contentful-Content-Type': CONTENT_TYPE_ID };
    if (existing.status === 200) headers['X-Contentful-Version'] = (existing.data as { sys: Sys }).sys.version;

    const saved = expectOk(await call(cma, 'put', entryUrl, { fields: toFields(article, locale) }, headers), `Saving "${article.slug}"`).data as { sys: Sys };
    const version = { 'X-Contentful-Version': saved.sys.version };
    if (article.published) {
      expectOk(await call(cma, 'put', `${entryUrl}/published`, undefined, version), `Publishing "${article.slug}"`);
    } else if (existing.status === 200 && (existing.data as { sys: Sys }).sys.publishedVersion) {
      expectOk(await call(cma, 'delete', `${entryUrl}/published`, undefined, version), `Unpublishing "${article.slug}"`);
    }
    console.log(`${article.published ? 'published ' : 'draft     '} ${article.slug}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
