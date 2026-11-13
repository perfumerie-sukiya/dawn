const fs = require('fs');
const { Liquid } = require('liquidjs');

const liquid = new Liquid();
const collectionSection = fs.readFileSync('sections/main-collection-line-login.liquid', 'utf8');
const productSection = fs.readFileSync('sections/main-product.liquid', 'utf8');
const collectionTemplate = collectionSection.match(/{% assign line_login_collection_path[\s\S]*?<\/a>/)[0];
const productTemplate = productSection.split('\n\n<div class="page-width">')[0];
liquid.registerFilter('json', JSON.stringify);

test.each([
  ['', '/collections/sukiya-hukubukuro-2027'],
  ['/collections/sukiya-hukubukuro', '/collections/sukiya-hukubukuro'],
])('uses the same collection path for LINE login and restricted products: %s', async (configuredPath, expectedPath) => {
  const settings = { line_login_collection_path: configuredPath };
  const collectionHtml = await liquid.parseAndRender(collectionTemplate, {
    settings,
    request: { origin: 'https://online.sukiya.biz' },
  });
  const productHtml = await liquid.parseAndRender(productTemplate, {
    settings,
    product: { metafields: { my_fields: { isLinelogin: true } } },
  });
  const link = new URL(collectionHtml.match(/href="([^"]+)"/)[1]);
  expect(link.searchParams.get('redirect_uri')).toBe(`https://online.sukiya.biz${expectedPath}`);
  expect(productHtml).toContain(`window.location.href = ${JSON.stringify(expectedPath)}`);
});

test('does not redirect products that do not require LINE login', async () => {
  const html = await liquid.parseAndRender(productTemplate, { product: {} });
  expect(html).not.toContain('window.location.href');
});

test('returns LINE login to the current page when using the page template', async () => {
  const html = await liquid.parseAndRender(collectionTemplate, {
    settings: { line_login_collection_path: '/collections/sukiya-hukubukuro-2027' },
    request: { origin: 'https://online.sukiya.biz', page_type: 'page' },
    page: { url: '/pages/member-news' },
  });
  const link = new URL(html.match(/href="([^"]+)"/)[1]);
  expect(link.searchParams.get('redirect_uri')).toBe('https://online.sukiya.biz/pages/member-news');
});

test('reveals page content after LINE connection succeeds', () => {
  document.body.innerHTML = '<div data-line-login-preview>Preview</div><div data-line-login-content hidden>Full text</div>';
  jest.isolateModules(() => require('../assets/page-line-login.js'));
  expect(document.querySelector('[data-line-login-content]').hidden).toBe(true);
  document.dispatchEvent(new Event('line-login:connected'));
  expect(document.querySelector('[data-line-login-preview]').hidden).toBe(true);
  expect(document.querySelector('[data-line-login-content]').hidden).toBe(false);
});

test('login bypass reveals the page content', () => {
  localStorage.clear();
  window.history.replaceState({}, '', '/pages/member-news?skip_line_login=1');
  document.body.innerHTML = '<div data-line-login-preview>Preview</div><div data-line-login-content hidden>Full text</div><div class="line-login-success tw-hidden"></div><div class="line-connect-success tw-hidden"></div><div id="open-modal"></div><div class="line-login-modal"></div>';
  jest.isolateModules(() => {
    require('../assets/page-line-login.js');
    require('../assets/line-login.js');
  });
  expect(document.querySelector('[data-line-login-content]').hidden).toBe(false);
  expect(localStorage.getItem('isLineLogin')).toBe('true');
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});
