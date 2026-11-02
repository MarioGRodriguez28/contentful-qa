(() => {
  const { spaceId, environment, token } = window.CONTENTFUL;
  const ENTRIES = `https://cdn.contentful.com/spaces/${spaceId}/environments/${environment}/entries`;
  const PUBLICATION = 'Test Notes';
  const view = document.getElementById('view');
  const status = document.getElementById('status');

  // Everything from the API is written with textContent, never as HTML.
  const el = (tag, attrs = {}, text) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const formatDate = (iso) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  async function fetchArticles(extra = {}) {
    const params = new URLSearchParams({ content_type: 'article', order: '-fields.publishedDate', ...extra });
    const res = await fetch(`${ENTRIES}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Contentful answered ${res.status}`);
    return (await res.json()).items;
  }

  function meta(fields) {
    const line = el('p', { class: 'meta' });
    line.append(document.createTextNode(`${fields.author} · `));
    line.append(el('time', { datetime: fields.publishedDate.slice(0, 10) }, formatDate(fields.publishedDate)));
    return line;
  }

  function renderList(items) {
    if (items.length === 0) return say('No articles yet.');
    const list = el('ol', { class: 'ledger', id: 'articles' });
    items.forEach(({ fields }, index) => {
      const entry = el('li', { class: 'entry', 'data-testid': 'article-card' });
      const heading = el('h2');
      heading.append(el('a', { href: `#/article/${encodeURIComponent(fields.slug)}` }, fields.title));
      const number = el('span', { class: 'num', 'aria-hidden': 'true' }, String(index + 1).padStart(2, '0'));
      const excerpt = fields.body.slice(0, 110) + (fields.body.length > 110 ? '...' : '');
      entry.append(number, heading, meta(fields), el('p', { class: 'excerpt' }, excerpt));
      list.append(entry);
    });
    const row = el('div', { class: 'heading-row' });
    row.append(el('h1', { tabindex: '-1' }, 'Articles'), el('p', { class: 'tally' }, `${items.length} published`));
    view.replaceChildren(row, list);
    document.title = 'Articles';
    status.textContent = '';
  }

  function renderDetail({ fields }) {
    const article = el('article', { class: 'piece', 'data-testid': 'article-detail' });
    article.append(el('h1', { tabindex: '-1' }, fields.title), meta(fields), el('p', { class: 'body' }, fields.body), el('a', { class: 'back', href: '#/' }, 'Back to articles'));
    view.replaceChildren(article);
    document.title = `${fields.title} - ${PUBLICATION}`;
    status.textContent = '';
  }

  function say(message, role = 'status') {
    status.setAttribute('role', role);
    status.textContent = message;
    view.replaceChildren();
  }

  async function route() {
    status.setAttribute('role', 'status');
    status.textContent = 'Loading articles...';
    const match = location.hash.match(/^#\/article\/(.+)$/);
    try {
      if (match) {
        const [item] = await fetchArticles({ 'fields.slug': decodeURIComponent(match[1]), limit: '1' });
        if (!item) return say('Article not found.');
        renderDetail(item);
      } else {
        renderList(await fetchArticles());
      }
      view.querySelector('h1')?.focus();
    } catch {
      say('Could not load articles. Please try again later.', 'alert');
    }
  }

  window.addEventListener('hashchange', route);
  route();
})();
