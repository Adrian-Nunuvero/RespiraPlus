// Service Worker Registration & Network Status Monitor
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('✅ Service Worker registrado con alcance:', reg.scope);
      })
      .catch((err) => {
        console.warn('⚠️ No se pudo registrar el Service Worker:', err);
      });
  });
}

// Window Online/Offline Event Listeners
window.addEventListener('online', () => {
  console.log('🌐 Conexión a internet restablecida');
  if (typeof handleNetworkChange === 'function') {
    handleNetworkChange(true);
  }
});

window.addEventListener('offline', () => {
  console.log('📡 Sin conexión a internet');
  if (typeof handleNetworkChange === 'function') {
    handleNetworkChange(false);
  }
});
