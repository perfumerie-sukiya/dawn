const fs = require('fs');
const { Liquid } = require('liquidjs');

const liquid = new Liquid();
liquid.registerFilter('asset_url', (name) => `https://cdn.example.com/${name}`);
liquid.registerFilter('image_url', (image) => image.src);
liquid.registerFilter('stylesheet_tag', () => '');
const sectionTemplate = fs.readFileSync('sections/main-collection-line-login-banner.liquid', 'utf8').split('{% schema %}')[0];
const blockSettings = {
  title: 'オンライン限定セレクト福袋',
  text: '<p>予約期間</p>',
  link: '/pages/select-hukubukuro',
  image_asset: 'select-hukubukuro-2027-banner.jpg',
  secret_image_asset: 'select-hukubukuro-2027-banner-secret.jpg',
  image_width: 1000,
  image_height: 400,
};

async function renderBanner(settings = blockSettings) {
  document.body.innerHTML = await liquid.parseAndRender(sectionTemplate, {
    section: { settings: { color_scheme: 'background-1' }, blocks: [{ settings, shopify_attributes: '' }] },
  });
  return {
    image: document.querySelector('[data-line-login-src]'),
    link: document.querySelector('[data-line-login-href]'),
  };
}

function loadScript() {
  jest.isolateModules(() => require('../assets/collection-line-login-banner.js'));
}

beforeEach(() => localStorage.clear());

test('shows the secret image without a link before LINE connection', async () => {
  const { image, link } = await renderBanner();
  loadScript();
  expect(image.getAttribute('src')).toBe('https://cdn.example.com/select-hukubukuro-2027-banner-secret.jpg');
  expect(link.hasAttribute('href')).toBe(false);
  expect(link.getAttribute('role')).toBe('button');
  expect(link.getAttribute('tabindex')).toBe('0');
  expect(document.body.textContent).toContain('オンライン限定セレクト福袋');
});

test('reveals the banner image and link after LINE connection succeeds', async () => {
  const { image, link } = await renderBanner();
  loadScript();
  document.dispatchEvent(new Event('line-login:connected'));
  expect(image.getAttribute('src')).toBe('https://cdn.example.com/select-hukubukuro-2027-banner.jpg');
  expect(link.getAttribute('href')).toBe('/pages/select-hukubukuro');
  expect(link.hasAttribute('role')).toBe(false);
  expect(link.hasAttribute('tabindex')).toBe(false);
});

test('reveals the banner immediately for users already connected', async () => {
  localStorage.setItem('isLineLogin', 'true');
  const { image, link } = await renderBanner();
  loadScript();
  expect(image.getAttribute('src')).toBe('https://cdn.example.com/select-hukubukuro-2027-banner.jpg');
  expect(link.getAttribute('href')).toBe('/pages/select-hukubukuro');
});

test('falls back to the product secret image when no secret image is set', async () => {
  const { image } = await renderBanner({ ...blockSettings, secret_image_asset: '' });
  expect(image.getAttribute('src')).toContain('secret-product.jpg');
});

test('opens the LINE login modal when the secret banner is clicked before connection', async () => {
  const { link } = await renderBanner();
  const openDialog = jest.fn();
  const modal = document.createElement('div');
  modal.className = 'line-login-modal';
  modal.openDialog = openDialog;
  document.body.appendChild(modal);
  loadScript();
  link.querySelector('img').click();
  expect(openDialog).toHaveBeenCalledTimes(1);
  link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  expect(openDialog).toHaveBeenCalledTimes(2);
  document.dispatchEvent(new Event('line-login:connected'));
  link.click();
  expect(openDialog).toHaveBeenCalledTimes(2);
});
