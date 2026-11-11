const fs = require('fs');
const path = require('path');
const script = fs.readFileSync(path.join(__dirname, '../assets/the-ginza-scroll-reveal.js'), 'utf8');

describe('THE GINZA scroll reveal', () => {
  let callback;
  let observe;
  let unobserve;

  beforeEach(() => {
    document.body.innerHTML = '<div class="the-ginza"><div class="the-ginza__hero"></div><div class="the-ginza__introduction"></div><section class="the-ginza__section"></section></div>';
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    window.matchMedia = jest.fn(() => ({ matches: false }));
    observe = jest.fn();
    unobserve = jest.fn();
    window.IntersectionObserver = jest.fn((handler) => { callback = handler; return { observe, unobserve }; });
    const blocks = document.querySelector('.the-ginza').children;
    blocks[0].getBoundingClientRect = () => ({ top: 0 });
    blocks[1].getBoundingClientRect = () => ({ top: 900 });
    blocks[2].getBoundingClientRect = () => ({ top: 1000 });
  });

  it('leaves visible blocks alone and reveals offscreen blocks once', () => {
    window.eval(script);
    const blocks = document.querySelector('.the-ginza').children;
    expect(blocks[0].classList.contains('tg-reveal')).toBe(false);
    expect(observe).toHaveBeenCalledTimes(2);
    expect(blocks[1].classList.contains('tg-reveal')).toBe(true);
    callback([{ target: blocks[1], isIntersecting: true }]);
    expect(blocks[1].classList.contains('tg-reveal--visible')).toBe(true);
    expect(unobserve).toHaveBeenCalledWith(blocks[1]);
  });

  it('leaves content visible when reduced motion is requested or IntersectionObserver is unavailable', () => {
    window.matchMedia = jest.fn(() => ({ matches: true }));
    window.eval(script);
    expect(observe).not.toHaveBeenCalled();
    delete window.IntersectionObserver;
    window.eval(script);
    expect(document.querySelector('.tg-reveal')).toBeNull();
  });
});
