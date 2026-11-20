(function () {
  function unlockLineLoginBanners() {
    document.querySelectorAll('[data-line-login-banner]').forEach(function (banner) {
      banner.querySelectorAll('[data-line-login-src]').forEach(function (image) {
        image.src = image.dataset.lineLoginSrc;
      });
      banner.querySelectorAll('[data-line-login-href]').forEach(function (link) {
        if (!link.dataset.lineLoginHref) return;
        link.href = link.dataset.lineLoginHref;
        link.removeAttribute('role');
        link.removeAttribute('tabindex');
      });
    });
  }

  document.querySelectorAll('[data-line-login-banner] [data-line-login-href]').forEach(function (link) {
    function openLineLoginModal(event) {
      if (link.hasAttribute('href')) return;
      event.preventDefault();
      document.querySelector('.line-login-modal')?.openDialog();
    }
    link.addEventListener('click', openLineLoginModal);
    link.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') openLineLoginModal(event);
    });
  });

  if (localStorage.getItem('isLineLogin') === 'true') unlockLineLoginBanners();
  document.addEventListener('line-login:connected', unlockLineLoginBanners);
})();
