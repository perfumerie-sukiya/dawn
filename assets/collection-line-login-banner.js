(function () {
  function unlockLineLoginBanners() {
    document.querySelectorAll('[data-line-login-banner]').forEach(function (banner) {
      banner.querySelectorAll('[data-line-login-src]').forEach(function (image) {
        image.src = image.dataset.lineLoginSrc;
      });
      banner.querySelectorAll('[data-line-login-href]').forEach(function (link) {
        if (!link.dataset.lineLoginHref) return;
        link.href = link.dataset.lineLoginHref;
        link.removeAttribute('aria-disabled');
        link.classList.remove('tw-pointer-events-none');
      });
    });
  }

  if (localStorage.getItem('isLineLogin') === 'true') unlockLineLoginBanners();
  document.addEventListener('line-login:connected', unlockLineLoginBanners);
})();
