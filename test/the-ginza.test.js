const { renderCollection, renderStory, product, createRenderer } = require('./the-ginza-renderer');

function mount(html) {
  document.body.innerHTML = html;
  return document;
}

describe('THE GINZA brand pages', () => {
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

  it('renders category results without the brand TOP promotion sections', async () => {
    const { html } = await renderCollection({ tags: ['プロテクション'], products: [product(7, ['プロテクション'])] });
    const doc = mount(html);
    expect(doc.querySelector('h1').textContent).toBe('プロテクション');
    expect(doc.querySelector('.the-ginza__category-banner img').getAttribute('src')).toContain('category-protection');
    expect(doc.querySelector('.the-ginza__close-up')).toBeNull();
    expect(doc.querySelector('.the-ginza__sort input[name="view"]').value).toBe('the-ginza-products');
    expect(doc.querySelector('.the-ginza__navigation a[aria-current="page"]').textContent).toBe('プロテクション');
  });

  it('does not display other brands in listings or fixed product selections', async () => {
    const other = product(9, ['スキンケア'], { vendor: '別ブランド' });
    const listing = mount((await renderCollection({ products: [other], listing: true })).html);
    expect(listing.querySelector('.the-ginza__product')).toBeNull();
    expect(listing.querySelector('.the-ginza__empty')).not.toBeNull();
    const top = mount((await renderCollection({ settings: { best_sellers: [other] } })).html);
    expect(top.querySelector('.the-ginza__products--rail')).toBeNull();
  });

  it('keeps the selected product order and links to unchanged product pages', async () => {
    const best = [product(3), product(1), product(2), product(4)];
    const doc = mount((await renderCollection({ settings: { best_sellers: best } })).html);
    expect(
      [...doc.querySelectorAll('.the-ginza__products--rail .the-ginza__product-link')].map((a) =>
        a.getAttribute('href'),
      ),
    ).toEqual(best.map((p) => p.url));
    expect(doc.querySelector('.the-ginza__price').textContent).toContain('¥22,000');
    expect(doc.querySelector('.the-ginza__price').textContent).toContain('税込');
    expect(doc.querySelectorAll('form[action*="cart"], .badge, .rating')).toHaveLength(0);
  });

  it('holds undecided KV, copy, story links, store information and special care', async () => {
    const doc = mount((await renderCollection()).html);
    expect(doc.querySelector('.the-ginza__hero')).toBeNull();
    expect(doc.querySelector('.the-ginza__introduction')).toBeNull();
    expect(doc.querySelector('.the-ginza__store')).toBeNull();
    expect(doc.querySelector('a[href*="/pages/"]')).toBeNull();
    expect(doc.querySelectorAll('.the-ginza__close-up > li')).toHaveLength(3);
    expect(doc.querySelector('.the-ginza__close-up a')).toBeNull();
    expect(doc.querySelector('a[href=""], a[href="#"]')).toBeNull();
    expect(doc.querySelector('.the-ginza__mobile-menu').hasAttribute('open')).toBe(false);
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
    expect(hero.querySelector('a')).toBeNull();
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
            introduction: '<p>確定済み原稿</p>',
            story_page: { url: '/pages/the-ginza-story' },
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

  it('renders supplied story images in order without inventing missing body copy', async () => {
    const doc = mount(await renderStory());
    expect([...doc.querySelectorAll('.the-ginza__chapter img')].map((img) => img.getAttribute('src'))).toEqual([
      '/assets/the-ginza-story-1975.jpg',
      '/assets/the-ginza-story-2002.jpg',
      '/assets/the-ginza-story-aesthetics.jpg',
      '/assets/the-ginza-story-2025.jpg',
    ]);
    expect(doc.querySelector('.the-ginza__chapter .rte')).toBeNull();
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
