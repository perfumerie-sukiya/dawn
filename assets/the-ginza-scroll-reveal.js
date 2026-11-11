(() => {
  const root = document.querySelector('.the-ginza');
  if (!root || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const blocks = root.querySelectorAll(':scope > .the-ginza__hero, :scope > .the-ginza__introduction, :scope > .the-ginza__section');
  const inViewAtLoad = new Set();
  blocks.forEach((block) => {
    if (block.getBoundingClientRect().top < window.innerHeight) inViewAtLoad.add(block);
  });

  window.addEventListener('scroll', () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('tg-reveal--visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0 });

    blocks.forEach((block) => {
      if (inViewAtLoad.has(block)) return;
      block.classList.add('tg-reveal');
      observer.observe(block);
    });
  }, { once: true, passive: true });
})();
