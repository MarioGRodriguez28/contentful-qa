(() => {
  const { spaceId, environment, token } = window.CONTENTFUL;
  const ENTRIES = `https://cdn.contentful.com/spaces/${spaceId}/environments/${environment}/entries`;
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
    const list = el('ul', { class: 'cards', id: 'articles' });
    for (const { fields } of items) {
      const card = el('li', { class: 'card', 'data-testid': 'article-card' });
      const heading = el('h2');
      heading.append(el('a', { href: `#/article/${encodeURIComponent(fields.slug)}` }, fields.title));
      card.append(heading, meta(fields), el('p', { class: 'excerpt' }, fields.body.slice(0, 110) + (fields.body.length > 110 ? '...' : '')));
      list.append(card);
    }
    view.replaceChildren(el('h1', { tabindex: '-1' }, 'Articles'), list);
    status.textContent = '';
  }

  function renderDetail({ fields }) {
    const article = el('article', { 'data-testid': 'article-detail' });
    article.append(el('h1', { tabindex: '-1' }, fields.title), meta(fields), el('p', { class: 'body' }, fields.body), el('a', { class: 'back', href: '#/' }, 'Back to articles'));
    view.replaceChildren(article);
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
