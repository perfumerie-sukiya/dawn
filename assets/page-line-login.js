document.addEventListener('line-login:connected', () => {
  document.querySelector('[data-line-login-preview]').hidden = true;
  document.querySelector('[data-line-login-content]').hidden = false;
});
