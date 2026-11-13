const fs = require('fs');
const path = require('path');
const { renderCollection, renderStory, product, createRenderer, sectionFromTemplate } = require('./the-ginza-renderer');

function mount(html) {
  document.body.innerHTML = html;
  return document;
}

describe('THE GINZA brand pages', () => {
  it('shows standard recommendations for THE GINZA only when manually selected products are enabled', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../sections/related-products.liquid'), 'utf8')
      .replace(/{% schema %}[\s\S]*?{% endschema %}/, '')
      .replace(/{%-? style -?%}[\s\S]*?{%-? endstyle -?%}/, '');
    const engine = createRenderer();
    const section = { id: 'related', settings: { image_shape: 'square' } };
    const routes = { product_recommendations_url: '/recommendations/products' };
    for (const vendor of ['ザ・ギンザ', 'THE GINZA']) {
      for (const setting of [undefined, 'ahead', 'only manual']) {
        const current = product(1, [], { vendor, metafields: {
          'shopify--discovery--product_recommendation': { related_products_display: { value: setting } },
        } });
        const doc = mount(await engine.parseAndRender(source, { product: current, section, routes }));
        expect(Boolean(doc.querySelector('product-recommendations'))).toBe(setting === 'only manual');
      }
    }
    const doc = mount(await engine.parseAndRender(source, {
      product: product(3, [], { vendor: '別ブランド' }), section, routes,
    }));
    expect(doc.querySelector('product-recommendations')).not.toBeNull();
  });

  it('groups all 33 products under five category headings without truncation', async () => {
    const tags = ['スキンケア', 'プロテクション', 'ボディ', 'フレグランス', 'セット・その他'];
    const counts = [18, 3, 4, 2, 6];
    let id = 0;
    const products = counts.flatMap((count, index) =>
      Array.from({ length: count }, () => product(++id, [tags[index]])),
    );
    const doc = mount((await renderCollection({ products, listing: true })).html);
    expect(doc.querySelectorAll('.the-ginza__product')).toHaveLength(33);
    expect(
      [...doc.querySelectorAll('.the-ginza__section .the-ginza__products')].map((list) => list.children.length),
    ).toEqual(counts);
    expect([...doc.querySelectorAll('.the-ginza__section h2')].map((h) => h.textContent)).toEqual(tags);
    expect(doc.querySelector('a[href="/products/ginza-33"]')).not.toBeNull();
  });

  it('shows a multiply tagged product once and preserves unclassified products', async () => {
    const products = [product(1, ['スキンケア', 'ボディ']), product(2, []), product(3, ['ボディ'])];
    const doc = mount((await renderCollection({ products, listing: true })).html);
    expect(doc.querySelectorAll('.the-ginza__product')).toHaveLength(3);
    expect(doc.querySelectorAll('a[href="/products/ginza-1"]')).toHaveLength(1);
    const other = [...doc.querySelectorAll('.the-ginza__section')].find(
      (s) => s.querySelector('h2').textContent === 'その他の商品',
    );
    expect(other.querySelector('a[href="/products/ginza-2"]')).not.toBeNull();
  });

  it('keeps category tiles, menus, banners and groups on the fixed category tag', async () => {
    const section = sectionFromTemplate('collection.the-ginza.json');
    section.blocks.find((block) => block.settings.key === 'skincare').settings.tag = '保湿';
    const doc = mount((await renderCollection({ blocks: section.blocks })).html);
    const expected = '/collections/the-ginza/スキンケア?view=the-ginza-products';
    expect(doc.querySelector('.the-ginza__categories a').getAttribute('href')).toBe(expected);
    expect(doc.querySelector('.the-ginza__navigation a').getAttribute('href')).toBe(expected);
    const listing = mount(
      (await renderCollection({ blocks: section.blocks, products: [product(1)], listing: true })).html,
    );
    expect(listing.querySelector('.the-ginza__section h2').textContent).toBe('スキンケア');
    const category = mount(
      (await renderCollection({ blocks: section.blocks, products: [product(1)], tags: ['スキンケア'] })).html,
    );
    expect(category.querySelector('.the-ginza__category-banner h1').textContent).toBe('スキンケア');
  });

  it('renders category results without the brand TOP promotion sections', async () => {
    const { html } = await renderCollection({ tags: ['プロテクション'], products: [product(7, ['プロテクション'])] });
    const doc = mount(html);
    expect(doc.querySelector('h1').textContent).toBe('プロテクション');
    expect(doc.querySelector('.the-ginza__category-banner img').getAttribute('src')).toContain('category-protection');
    expect(doc.querySelector('.the-ginza__close-up')).toBeNull();
    expect(doc.querySelector('.the-ginza__sort input[name="view"]').value).toBe('the-ginza-products');
    expect(doc.querySelector('.the-ginza__tabs')).toBeNull();
    expect(doc.querySelector('.the-ginza__desktop-menu .the-ginza__navigation')).not.toBeNull();
    expect(doc.querySelector('.the-ginza__mobile-menu .the-ginza__navigation')).not.toBeNull();
    expect(doc.querySelector('.the-ginza__sort select[name="sort_by"]')).not.toBeNull();
    expect(doc.querySelector('.the-ginza__sort button[type="submit"]')).not.toBeNull();
    expect(doc.querySelector('.the-ginza__navigation a[aria-current="page"]').textContent).toBe('プロテクション');
  });

  it('renders every collection product regardless of its vendor', async () => {
    const products = [
      product(1, ['スキンケア'], { vendor: 'THE GINZA' }),
      product(2, [], { vendor: '別ブランド' }),
      product(3, ['ボディ'], { vendor: '' }),
    ];
    const listing = mount((await renderCollection({ products, listing: true })).html);
    expect(listing.querySelectorAll('.the-ginza__product')).toHaveLength(3);
    for (const item of products) {
      expect(listing.querySelector(`a[href="${item.url}"]`)).not.toBeNull();
    }
    const category = mount((await renderCollection({ products: [products[1]], tags: ['スキンケア'] })).html);
    expect(category.querySelector('a[href="/products/ginza-2"]')).not.toBeNull();
    const top = mount((await renderCollection({ settings: { best_seller_collection: { products: [products[1]] } } })).html);
    expect(top.querySelector('.the-ginza__products--rail a[href="/products/ginza-2"]')).not.toBeNull();
  });

  it('renders up to four products from each selected collection in collection order', async () => {
    const best = [product(3), product(1), product(2), product(4)];
    const arrivals = [product(6), product(5)];
    const doc = mount((await renderCollection({ settings: { best_seller_collection: { products: [...best, product(7)] }, new_arrival_collection: { products: arrivals } } })).html);
    expect(
      [...doc.querySelectorAll('.the-ginza__products--rail .the-ginza__product-link')].map((a) =>
        a.getAttribute('href'),
      ),
    ).toEqual([...best, ...arrivals].map((p) => p.url));
    expect(doc.querySelector('.the-ginza__price').textContent).toContain('¥22,000');
    expect(doc.querySelector('.the-ginza__price').textContent).toContain('税込');
    expect(doc.querySelectorAll('form[action*="cart"], .badge, .rating')).toHaveLength(0);
  });

  it('shows the holiday KV, approved copy and four close-up blocks', async () => {
    const doc = mount((await renderCollection()).html);
    expect(doc.querySelector('.the-ginza__hero img').getAttribute('src')).toBe('/assets/the-ginza-holiday-landscape.jpg');
    expect(doc.querySelector('.the-ginza__hero-title').textContent).toBe('ホリデーコレクション');
    expect(doc.querySelector('.the-ginza__hero-caption').textContent).toBe('数量限定');
    expect(doc.querySelector('.the-ginza__hero-media a').getAttribute('href')).toBe('/collections/the-ginza-holiday-collection?view=the-ginza-feature');
    expect(doc.querySelector('.the-ginza__hero source').getAttribute('srcset')).toBe('/assets/the-ginza-holiday-square.jpg');
    expect(doc.querySelector('.the-ginza__introduction').textContent).toContain('タイムレスで本質的な美しさ');
    expect(doc.querySelector('.the-ginza__about .rte').textContent).toContain('1975年に銀座でファッションブティック');
    expect(sectionFromTemplate('collection.the-ginza.json').settings.new_arrival_collection).toBe('the-ginza-new-arrivals');
    expect(doc.querySelector('.the-ginza__store')).toBeNull();
    expect(doc.querySelector('.the-ginza__about a').getAttribute('href')).toBe('https://online.sukiya.biz/pages/the-ginza-story');
    expect(doc.querySelectorAll('.the-ginza__close-up > li')).toHaveLength(4);
    expect(doc.querySelectorAll('.the-ginza__close-up > li')[2].querySelector('img').getAttribute('src')).toContain('close-up-special');
    const links = [...doc.querySelectorAll('.the-ginza__close-up > li')].map((item) => item.querySelector('a')?.getAttribute('href'));
expect(links).toEqual(['/collections/the-ginza-for-first-time-visitors', '/pages/the-ginza-story#core-essence-care', '/collections/the-ginza-special-care', '/collections/the-ginza/フレグランス?view=the-ginza-products']);
    expect([...doc.querySelectorAll('.the-ginza__close-up h3')].map((heading) => heading.textContent)).toEqual(['はじめての方へ', 'コアエッセンスケア', 'スペシャルケア', 'フレグランス']);
    expect(doc.querySelector('a[href=""], a[href="#"]')).toBeNull();
    const menu = doc.querySelector('.the-ginza__mobile-menu');
    expect(menu.hasAttribute('open')).toBe(false);
    expect(menu.querySelector('summary')).not.toBeNull();
    expect(menu.querySelectorAll('.the-ginza__navigation a')).toHaveLength(6);
  });

  it('renders approved desktop and mobile KV choices at the actual source dimensions', async () => {
    const doc = mount(
      (
        await renderCollection({
          settings: {
            show_hero: true,
            hero_desktop_asset: 'the-ginza-holiday-square.jpg',
            hero_mobile_asset: 'the-ginza-holiday-portrait.jpg',
          },
        })
      ).html,
    );
    const hero = doc.querySelector('.the-ginza__hero');
    expect(hero.querySelector('source').getAttribute('srcset')).toBe('/assets/the-ginza-holiday-portrait.jpg');
    expect(hero.querySelector('img').getAttribute('width')).toBe('1040');
    expect(hero.querySelector('img').getAttribute('height')).toBe('1040');
    expect(hero.querySelector('img').getAttribute('loading')).toBe('eager');
    expect(hero.querySelector('a').getAttribute('href')).toBe('/collections/the-ginza-holiday-collection?view=the-ginza-feature');
  });

  it('escapes product titles without changing the supplied wording', async () => {
    const title = '商品 <限定> & セット';
    const doc = mount(
      (await renderCollection({ products: [product(5, ['スキンケア'], { title })], listing: true })).html,
    );
    expect(doc.querySelector('.the-ginza__product h3').textContent).toBe(title);
    expect(doc.querySelector('.the-ginza__product h3').children).toHaveLength(0);
  });

  it('makes approved copy and configured story and store links available', async () => {
    const doc = mount(
      (
        await renderCollection({
          settings: {
            about_link: '/pages/the-ginza-story',
            introduction: '<p>確定済み原稿</p>',
            store_title: 'スキヤ仙台店',
            store_text: '<p>確定済み店舗情報</p>',
            store_link: '/pages/stores',
          },
        })
      ).html,
    );
    expect(doc.querySelector('.the-ginza__introduction').textContent).toBe('確定済み原稿');
    expect(doc.querySelector('.the-ginza__about a').getAttribute('href')).toBe('/pages/the-ginza-story');
    expect(doc.querySelector('.the-ginza__store a').getAttribute('href')).toBe('/pages/stores');
  });

  it('hides the brand introduction link when no link is configured', async () => {
    const doc = mount((await renderCollection({ settings: { about_link: '' } })).html);
    expect(doc.querySelector('.the-ginza__about a')).toBeNull();
    expect(doc.querySelectorAll('.the-ginza__navigation a')).toHaveLength(10);
  });

  it('uses collection metafields for shared branding and category content', async () => {
    const metafields = {
      my_fields: { brand_top_logo: { value: { src: '/files/logo.jpg' } } },
      custom: {
        the_ginza_category_image_skincare: { value: { src: '/files/skincare.jpg' } },
        the_ginza_category_description_skincare: { value: '<p>スキンケアの説明</p>' },
      },
    };
    const top = mount((await renderCollection({ metafields, settings: { about_link: '/pages/story' } })).html);
    expect(top.querySelector('.the-ginza__logo img').getAttribute('src')).toBe('/files/logo.jpg');
    expect(top.querySelector('.the-ginza__categories img').getAttribute('src')).toBe('/files/skincare.jpg');
    expect(top.querySelector('.the-ginza__navigation a[href="/pages/story"]')).not.toBeNull();
    const listing = mount((await renderCollection({ metafields, tags: ['スキンケア'], settings: { about_link: '/pages/story' } })).html);
    expect(listing.querySelector('.the-ginza__navigation a[href="/pages/story"]')).not.toBeNull();
    expect(listing.querySelector('.the-ginza__category-banner img').getAttribute('src')).toBe('/files/skincare.jpg');
    expect(listing.querySelector('.the-ginza__category-banner p').textContent).toBe('スキンケアの説明');
  });

  it('provides the five tag routes and a separate all-products route', async () => {
    const doc = mount((await renderCollection()).html);
    expect(doc.querySelectorAll('.the-ginza__categories a')).toHaveLength(5);
    expect(doc.querySelector('.the-ginza__categories a').getAttribute('href')).toBe(
      '/collections/the-ginza/スキンケア?view=the-ginza-products',
    );
    expect(doc.querySelector('.the-ginza__view-all').getAttribute('href')).toBe(
      '/collections/the-ginza?view=the-ginza-products',
    );
  });

  it('renders a feature collection under its own title and links the header to the brand collection', async () => {
    const section = sectionFromTemplate('collection.the-ginza-feature.json');
    section.settings.brand_collection = { url: '/collections/the-ginza', metafields: {} };
    const products = [product(3, ['セット・その他']), product(1), product(2, [])];
    const html = await createRenderer().parseAndRender(
      fs.readFileSync(path.join(__dirname, '../sections/main-collection-the-ginza-feature.liquid'), 'utf8')
        .replace(/{% schema %}[\s\S]*?{% endschema %}/, ''),
      {
        section,
        routes: { root_url: '/' },
        collection: {
          title: 'はじめての方へ',
          url: '/collections/the-ginza-for-first-time-visitors',
          products,
          default_sort_by: 'manual',
          sort_options: [{ name: 'おすすめ順', value: 'manual' }],
        },
        paginate: { pages: 1 },
      },
    );
    const doc = mount(html);
    expect(doc.querySelector('h1').textContent).toBe('はじめての方へ');
    expect(doc.querySelectorAll('h2')).toHaveLength(0);
    const links = [...doc.querySelectorAll('.the-ginza__product a')].map((a) => a.getAttribute('href'));
    expect([...new Set(links)]).toEqual(['/products/ginza-3', '/products/ginza-1', '/products/ginza-2']);
    expect(doc.querySelector('.the-ginza__logo a').getAttribute('href')).toBe('/collections/the-ginza');
    expect(doc.querySelector('.the-ginza__navigation a[href="https://online.sukiya.biz/pages/the-ginza-story"]')).not.toBeNull();
    expect(doc.querySelector('.the-ginza__navigation a').getAttribute('href')).toBe(
      '/collections/the-ginza/スキンケア?view=the-ginza-products',
    );
  });

  it('renders story chapters, three selected products, and links to the collection', async () => {
    const products = [product(1), product(2), product(3)];
    const doc = mount(await renderStory({ products, brand_collection: { url: '/collections/the-ginza' } }));
    expect([...doc.querySelectorAll('.the-ginza__chapter img')].map((img) => img.getAttribute('src'))).toEqual([
      '/assets/the-ginza-story-1975.jpg',
      '/assets/the-ginza-story-2002.jpg',
      '/assets/the-ginza-story-aesthetics.jpg',
      '/assets/the-ginza-story-2025.jpg',
    ]);
    expect(doc.querySelectorAll('.the-ginza__chapter .rte')).toHaveLength(4);
    expect([...doc.querySelectorAll('.the-ginza__chapter h2')].map((heading) => heading.textContent)).toEqual(['ザ・ギンザという、物語の始まり。', 'ザ・ギンザ スキンケアの誕生。', '肌は、身にまとう最高のオートクチュール。', 'エッセンシャリスト・スキンケアへ。']);
    expect(doc.querySelectorAll('.the-ginza__chapter .rte')[3].textContent).toContain('エンパワリング グロウスキン');
    expect(doc.querySelector('#core-essence-care .the-ginza__products--rail')).not.toBeNull();
    expect([...doc.querySelectorAll('.the-ginza__products--rail .the-ginza__product-link')].map((a) => a.getAttribute('href'))).toEqual(products.map((p) => p.url));
    expect(doc.querySelector('.the-ginza__story-links a[href="/collections/the-ginza?view=the-ginza-products"]')).not.toBeNull();
    expect(doc.querySelector('.the-ginza__story-links a[href="/collections/the-ginza"]')).not.toBeNull();
    expect(doc.querySelector('a[href=""], a[href="#"]')).toBeNull();
    expect(doc.querySelector('video, iframe')).toBeNull();
  });

  it('keeps the global brand entry disabled until its collection is selected and enabled', async () => {
    const engine = createRenderer();
    const html = await engine.renderFile('../sections/top-brand', {
      section: { settings: { show_the_ginza: false } },
      collections: {},
    });
    expect(html).not.toContain('the-ginza-logo.png');
    const enabled = await engine.renderFile('../sections/top-brand', {
      section: {
        settings: {
          show_the_ginza: true,
          the_ginza_collection: { url: '/collections/the-ginza' },
        },
      },
      collections: {},
    });
    const doc = mount(enabled);
    const logo = doc.querySelector('img[src="/assets/the-ginza-logo.png"]');
    expect(logo.closest('a').getAttribute('href')).toBe('/collections/the-ginza');
    expect(logo.classList.contains('tw-object-contain')).toBe(true);
  });
});
