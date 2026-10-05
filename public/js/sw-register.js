// Service Worker Registration & Live Cache Invalidation
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        reg.update();
        console.log('[PWA] Service Worker actualizado en v3.1.0:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker status:', err);
      });
  });
}

// Window Online/Offline Event Listeners
window.addEventListener('online', () => {
  console.log('[PWA] Conexión a internet restablecida');
  if (typeof handleNetworkChange === 'function') {
    handleNetworkChange(true);
  }
});

window.addEventListener('offline', () => {
  console.log('[PWA] Sin conexión a internet');
  if (typeof handleNetworkChange === 'function') {
    handleNetworkChange(false);
  }
});
