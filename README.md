# Contentful QA

A personal learning project: tests at four levels against a headless CMS, using a free Contentful space.

It is not client work and it does not come from a real project. I built it to practise testing a CMS from the API down to the screen, and to keep the result honest: everything listed as done below was run and passed, and everything else is in the [Roadmap](#roadmap).

## What it tests

A seed script creates an `Article` content type and four entries in a Contentful space (three published, one left as a draft on purpose). A small HTML and JavaScript page reads them, and the tests check each layer:

| Layer | Tools | What it checks | Cases |
|---|---|---|---|
| Delivery API (REST) | Axios, Vitest | status, media type, response envelope, required fields and their types, filtering, selecting, ordering, paging, drafts not delivered, 401 and 404 and 400 and 422 answers, error body shape, response time | 48 |
| Delivery API (REST) | Postman, Newman | the same core checks as an exported collection and environment, run from the command line | 13 requests, 40 assertions |
| GraphQL API | Axios, Vitest | valid queries, aliases, variables, fragments, introspection, filters, ordering, paging, drafts, invalid queries, authentication and addressing errors, response time | 41 |
| Web page | Playwright, axe-core | article list and detail, document title, error and empty states, content shown as text and not as markup, accessibility, phone emulation (Pixel 7, iPhone 13) and desktop | 85 passed, 17 skipped on purpose |
| Load | k6 | a gentle check of the Delivery API: 3 users for 20 seconds | 303 requests, 0% failed, p95 43 ms |
| Support code | Vitest, Python `unittest` | the config loader, the seed data and the results summary script | 10 and 8 |

The 17 skipped Playwright cases are by design: phone-only tests do not run on desktop, desktop-only tests do not run on phones, and the checks on the small page server run once instead of three times.

Last full run, all green: 214 passed, 0 failed, 17 skipped, plus the load check and the Python tests. Lint, types, unit, REST, Postman, GraphQL and Playwright were also run step by step in a clean clone on Node 22 with no `.env` and only the two read-only secrets.

## Requirements

- Node 22.12 or later. Node 20 does not work: Vitest 5 and the axe-core integration require 22.12, and Node 20 is out of support.
- Python 3 for the summary script (tested with 3.9). Standard library only.
- k6, only for `npm run test:load`.
- A free Contentful account.

## The page

It is a small publication called Test Notes. The list reads like a table of contents: numbered rows, thick rules, a condensed display face for the titles, and the whole row is the link. An article is one narrow reading column under a heavy rule. The look follows my own site, with the same colours and type, and it uses no gradients, shadows or icons.

It is accessible on purpose: real headings, focus moves to the title when the view changes, the document title follows the article, and links are at least 44 px tall. The fonts are Big Shoulders Display, Archivo and JetBrains Mono, served from the project itself under the SIL Open Font License, so the page asks nothing from font services.

## Setup, step by step

### What you do by hand in Contentful

1. Create a free account and a space. Note the **Space ID**. The environment is `master`.
2. In the space, go to Settings, API keys and add a key. Copy the **Content Delivery API access token**.
3. In your account profile, go to CMA tokens and create a **personal access token**. Copy it when it is created, it is shown only once. It starts with `CFPAT-`.
4. On the CMA tokens page, click **Authorize access** on that token and choose your organization. Until you do, Contentful answers `401 OrganizationAccessGrantRequired`.

### On your machine

```bash
npm ci
npx playwright install chromium webkit
cp .env.example .env
```

Fill in `.env`:

| Variable | Value |
|---|---|
| `CONTENTFUL_SPACE_ID` | the Space ID |
| `CONTENTFUL_ENVIRONMENT` | `master` |
| `CONTENTFUL_CDA_TOKEN` | the Content Delivery access token |
| `CONTENTFUL_CMA_TOKEN` | the personal access token (only the seed needs it) |

`.env` is ignored by git. Then create the content once:

```bash
npm run seed
```

The seed is repeatable: running it again leaves the same four entries.

## Commands

| Command | What it does |
|---|---|
| `npm run seed` | creates the content type and the four entries (uses the management token) |
| `npm run test:unit` | unit tests of the support code |
| `npm run test:api` | REST tests with Axios and Vitest |
| `npm run test:postman` | the Postman collection with Newman |
| `npm run test:graphql` | GraphQL tests |
| `npm run test:ui` | Playwright on desktop and the two phones |
| `npm run test:all` | all of the above, in that order |
| `npm run test:load` | the k6 load check |
| `npm run test:python` | tests of the summary script |
| `npm run report:summary` | writes `reports/summary.md` from the JUnit and k6 reports |
| `npm run serve:web` | serves the page on http://127.0.0.1:4173 |
| `npm run lint`, `npm run typecheck` | static checks |

Reports go to `reports/` and `playwright-report/`.

## How the tests are built

- Every suite except the seed is read-only. The tests never change the space.
- Tests do not depend on each other. The API and GraphQL suites also pass in random order.
- The expected data comes from one file, `src/seed-data.ts`, which the seed also uses. The API and GraphQL suites stop with a message that names the real cause when the space is not ready (wrong token, wrong space, or not seeded).
- The expected behaviour was checked against the real API before writing each assertion, not assumed. Some of what I found:
  - A draft answers `404 NotFound` by id in REST, but `null` with no error in GraphQL, the same as an id that does not exist.
  - With `select=fields.title` the entries come back without `sys` unless it is selected too.
  - Skipping past the end of a collection returns an empty list and `total: 0`.
  - The Delivery API does not expose field validations such as a unique slug.
  - Asking for `preview: true` with a delivery token is refused with `ACCESS_TOKEN_INVALID`.
- The response time checks are loose smoke thresholds, not a service level. They are meant not to fail by chance.

## CI

`.github/workflows/tests.yml` runs on every push and pull request, and can be started by hand. It has three jobs: lint, types and unit tests with no secrets, then the API suites and the Playwright suite, each saving its reports as artifacts. The last two need two repository secrets: `CONTENTFUL_SPACE_ID` and `CONTENTFUL_CDA_TOKEN`. They only read content; the management token is never used in CI.

**The workflow has not run on GitHub yet.** What I did instead was run each of its steps locally in a clean clone, on Node 22, with no `.env` and only those two secrets as environment variables. Pull requests from forks do not receive secrets, so those jobs only run for branches of this repository.

## Security notes

- Tokens live only in `.env` and in repository secrets. `.env.example` has no values.
- The seed is the only thing that needs the management token. Everything else loads a read-only configuration.
- The page reads Contentful from the browser, so the **read-only delivery token is visible in the browser**. That is how a page that reads directly works, and that token can only read published content. It is injected when the page is served and is not in the repository.
- Playwright traces record request headers, so they are off in CI. I checked the reports from a CI-style run for the token and found none.
- Content from the API is written to the page as text, never as HTML. A test sends a hostile title and checks that nothing runs.
- The page server only serves the page files and the three fonts, nothing else on disk, and sets a strict Content-Security-Policy. The page makes no request to any third party except the Contentful API.

## Structure

```
src/            config loader, management API helper, seed data
scripts/        seed, page server, Newman and k6 runners, Python summary
web/            the page (HTML, JavaScript, CSS, fonts)
postman/        collection and environment
tests/api       REST tests        tests/graphql   GraphQL tests
tests/ui        Playwright tests  load/           k6 script
test/           unit tests of the support code
.github/        workflow
```

## Limits

- The tests run against one live, shared space, not an isolated copy per run. If someone edits the content, the tests will say so.
- The phone tests use Playwright's device emulation (viewport, touch, user agent). That is not the same as a real device.
- The page is deliberately minimal. This project is about the tests, not the interface.
- The load check is gentle on purpose, because it targets a third-party service and a free plan.

## Roadmap

Not done yet:

- Run the workflow on GitHub and add a status badge once it passes.
- Appium tests on a mobile emulator or simulator. Playwright's emulation covers viewport and touch, but not a native device, and I have not set Appium up.
- Create a separate space for each CI run through the management API, so runs do not share data.
- Publish the Python summary in the CI run page, and run the k6 check as a manual workflow.
- Cover more of the content model: rich text, references between entries, and more than one locale.
- Visual regression checks on the page.

## License

MIT. See [LICENSE](LICENSE).
