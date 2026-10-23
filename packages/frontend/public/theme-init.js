// Run before styles render, including when preference storage is unavailable.
(() => {
  let preference;
  try { preference = localStorage.getItem('fortisim-theme'); } catch { /* System default. */ }
  document.documentElement.dataset.theme = preference === 'dark' || preference === 'light'
    ? preference : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
})();
