require('../assets/my-accordion');

beforeEach(() => {
  document.body.innerHTML = '';
});

function createAccordion() {
  document.body.innerHTML = `
    <my-accordion>
      <button class="my-accordion">絞り込み</button>
      <div class="panel" id="outer">
        <div>
          <button class="my-accordion" id="category">
            スキンケア
            <span data-accordion-icon>
              <span data-accordion-icon-closed>+</span>
              <span data-accordion-icon-open hidden>-</span>
            </span>
          </button>
          <div class="panel" id="inner"><a href="/collections/predia-blue/洗顔料">洗顔</a></div>
        </div>
      </div>
    </my-accordion>`;
  const outer = document.getElementById('outer');
  const inner = document.getElementById('inner');
  const category = document.getElementById('category');
  Object.defineProperty(outer, 'scrollHeight', { configurable: true, get: () => 80 + (inner.classList.contains('show') ? 120 : 0) });
  Object.defineProperty(inner, 'scrollHeight', { get: () => 120 });
  document.querySelector('button').click();
  return { outer, inner, category };
}

test('nested category expansion keeps links inside the ancestor panel height', () => {
  const { outer, inner, category } = createAccordion();
  expect(outer.style.maxHeight).toBe('80px');
  category.click();
  expect(inner.classList.contains('show')).toBe(true);
  expect(outer.style.maxHeight).toBe('200px');
  expect(category.querySelector('[data-accordion-icon-closed]').hidden).toBe(true);
  expect(category.querySelector('[data-accordion-icon-open]').hidden).toBe(false);
  inner.dispatchEvent(new Event('transitionend'));
  expect(outer.style.maxHeight).toBe('200px');
});

test('closing a nested category resets its icon and shrinks its ancestor after transition', () => {
  const { outer, inner, category } = createAccordion();
  category.click();
  inner.dispatchEvent(new Event('transitionend'));
  category.click();
  inner.dispatchEvent(new Event('transitionend'));
  expect(inner.classList.contains('show')).toBe(false);
  expect(outer.style.maxHeight).toBe('80px');
  expect(category.querySelector('[data-accordion-icon-closed]').hidden).toBe(false);
  expect(category.querySelector('[data-accordion-icon-open]').hidden).toBe(true);
});
