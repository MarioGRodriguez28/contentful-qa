import http from 'k6/http';
import { check, sleep } from 'k6';

// A gentle load on the Content Delivery API: 3 virtual users for 20 seconds, about 15 requests per second.
// It is a smoke-level load check against a third-party service, not a stress test.
export const options = {
  vus: 3,
  duration: '20s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.99'],
  },
};

const space = __ENV.CONTENTFUL_SPACE_ID;
const environment = __ENV.CONTENTFUL_ENVIRONMENT || 'master';
const base = `https://cdn.contentful.com/spaces/${space}/environments/${environment}/entries`;
const params = { headers: { Authorization: `Bearer ${__ENV.CONTENTFUL_CDA_TOKEN}` } };

export default function () {
  const list = http.get(`${base}?content_type=article&order=-fields.publishedDate`, params);
  check(list, {
    'list answers 200': (r) => r.status === 200,
    'list has the three published articles': (r) => r.json('total') === 3,
  });

  const entry = http.get(`${base}/seed-api-testing-basics`, params);
  check(entry, {
    'entry answers 200': (r) => r.status === 200,
    'entry is the requested one': (r) => r.json('sys.id') === 'seed-api-testing-basics',
  });

  // A 404 is the correct answer for the draft, so it must not count as a failed request.
  const draft = http.get(`${base}/seed-unpublished-draft`, { ...params, responseCallback: http.expectedStatuses(404) });
  check(draft, { 'the draft stays unavailable (404)': (r) => r.status === 404 });

  sleep(0.5);
}
