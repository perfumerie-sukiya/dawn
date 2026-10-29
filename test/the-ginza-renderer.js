const fs = require('fs');
const path = require('path');
const { Liquid } = require('liquidjs');

const root = path.resolve(__dirname, '..');
const translations = require('../locales/ja.json');
const clean = (source) => source.replace(/{%-?\s*(doc|schema)\s*-?%}[\s\S]*?{%-?\s*end\1\s*-?%}/g, '');
const escape = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function createRenderer() {
  const engine = new Liquid({
    root: path.join(root, 'snippets'),
    extname: '.liquid',
    strictFilters: true,
    globals: { routes: { root_url: '/' } },
    relativeReference: false,
    fs: {
      resolve: (dir, file, ext) => path.resolve(dir, file.endsWith(ext) ? file : file + ext),
      exists: async (file) => fs.existsSync(file),
      existsSync: fs.existsSync,
      readFile: async (file) => clean(fs.readFileSync(file, 'utf8')),
      readFileSync: (file) => clean(fs.readFileSync(file, 'utf8')),
    },
  });
  engine.registerFilter('t', (key) => {
    const result = key.split('.').reduce((value, part) => value?.[part], translations);
    if (typeof result !== 'string') throw new Error(`Missing translation: ${key}`);
    return result;
  });
  engine.registerFilter('asset_url', (name) => `/assets/${name}`);
  engine.registerFilter('file_url', (name) => `/files/${name}`);
  engine.registerFilter('stylesheet_tag', (url) => `<link rel="stylesheet" href="${escape(url)}">`);
  engine.registerFilter('image_url', (image) => image.src);
  engine.registerFilter('image_tag', (src, ...pairs) => {
    const options = Object.fromEntries(pairs);
    return `<img src="${escape(src)}" alt="${escape(options.alt || '')}" width="640" height="640" loading="${options.loading || 'lazy'}">`;
  });
  engine.registerFilter('metafield_tag', (field) => field?.value || '');
  engine.registerFilter('money', (amount) => `¥${(amount / 100).toLocaleString('ja-JP')}`);
  engine.registerFilter('handleize', (tag) => tag.toLowerCase().replace(/\s+/g, '-'));
  engine.registerTag('paginate', {
    parse(token, tokens) {
      this.templates = [];
      const stream = this.liquid.parser.parseStream(tokens);
      stream.on('tag:endpaginate', () => stream.stop());
      stream.on('template', (template) => this.templates.push(template));
      stream.start();
    },
    *render(context, emitter) {
      yield this.liquid.renderer.renderTemplates(this.templates, context, emitter);
    },
  });
  return engine;
}

function sectionFromTemplate(name) {
  const template = JSON.parse(fs.readFileSync(path.join(root, 'templates', name), 'utf8'));
  const section = template.sections.main;
  const schema = JSON.parse(
    fs
      .readFileSync(path.join(root, 'sections', section.type + '.liquid'), 'utf8')
      .split('{% schema %}')[1]
      .split('{% endschema %}')[0],
  );
  const defaults = Object.fromEntries(
    schema.settings.filter((s) => s.id && s.default !== undefined).map((s) => [s.id, s.default]),
  );
  return {
    id: 'the-ginza-test',
    settings: { ...defaults, ...section.settings },
    blocks: section.block_order.map((id) => ({ id, ...section.blocks[id] })),
  };
}

async function renderCollection({ products = [], tags = [], listing = false, settings = {}, blocks, metafields = {} } = {}) {
  const section = sectionFromTemplate('collection.the-ginza.json');
  section.settings = { ...section.settings, ...settings };
  if (blocks) section.blocks = blocks;
  const context = {
    routes: { root_url: '/' },
    section,
    collection: {
      url: '/collections/the-ginza',
      metafields,
      products,
      default_sort_by: 'manual',
      sort_options: [{ name: 'おすすめ順', value: 'manual' }],
    },
    current_tags: tags,
    template: { suffix: listing ? 'the-ginza-products' : 'the-ginza' },
    paginate: { pages: 1 },
  };
  const html = await createRenderer().parseAndRender(
    clean(fs.readFileSync(path.join(root, 'sections/main-collection-the-ginza.liquid'), 'utf8')),
    context,
  );
  return { html, context };
}

async function renderStory(settings = {}) {
  const section = sectionFromTemplate('page.the-ginza-story.json');
  section.settings = { ...settings };
  return createRenderer().parseAndRender(
    clean(fs.readFileSync(path.join(root, 'sections/main-page-the-ginza-story.liquid'), 'utf8')),
    {
      section,
      routes: { root_url: '/' },
      page: { url: '/pages/the-ginza-story' },
    },
  );
}

function product(id, tags = ['スキンケア'], overrides = {}) {
  return {
    id,
    title: `商品${id}`,
    vendor: 'THE GINZA',
    price: 2200000,
    price_varies: false,
    tags,
    url: `/products/ginza-${id}`,
    featured_image: { src: `/product-images/${id}.jpg` },
    ...overrides,
  };
}

module.exports = { createRenderer, sectionFromTemplate, renderCollection, renderStory, product };
