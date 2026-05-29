if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/static/service-worker.js')
      .then(() => console.log('SW registrado'))
      .catch(() => console.log('SW no registrado'))
  })
}
