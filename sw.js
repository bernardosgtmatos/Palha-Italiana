// sw.js - Service Worker completo com cache offline e geração dinâmica de ícones

const CACHE_NAME = 'palha-italiana-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './sw.js'
];

// Tamanhos de ícones suportados
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// ---------- INSTALL: pré-carrega o app shell ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    }).then(() => {
      self.skipWaiting();
    })
  );
});

// ---------- ACTIVATE: limpa caches antigos ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return clients.claim();
    })
  );
});

// ---------- GERAÇÃO DE ÍCONES ----------
function generateIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Fundo marrom (#4a2c1b)
  ctx.fillStyle = '#4a2c1b';
  ctx.fillRect(0, 0, size, size);
  
  // Borda mais clara
  ctx.strokeStyle = '#c17b3c';
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.strokeRect(size * 0.1, size * 0.1, size * 0.8, size * 0.8);
  
  // Emoji de chocolate centralizado
  ctx.fillStyle = '#fef0da';
  ctx.font = `${size * 0.5}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍫', size / 2, size / 2);
  
  return canvas.convertToBlob({ type: 'image/png' });
}

function isIconRequest(url) {
  return ICON_SIZES.some(size => url.pathname.endsWith(`/icons/icon-${size}.png`));
}

// ---------- FETCH: estratégia de cache ----------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 1. Ícones gerados dinamicamente (com cache)
  if (isIconRequest(url)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        // Extrai o tamanho do URL
        const size = ICON_SIZES.find(s => url.pathname.endsWith(`/icons/icon-${s}.png`));
        if (size) {
          return generateIcon(size).then((blob) => {
            const response = new Response(blob, {
              headers: { 'Content-Type': 'image/png' }
            });
            // Armazena no cache para uso futuro
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
            });
            return response;
          });
        }
        return fetch(event.request);
      })
    );
    return;
  }
  
  // 2. App shell / mesmosite: Cache First
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Atualiza o cache em segundo plano (stale-while-revalidate)
          fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // Offline fallback: retorna o index.html como fallback
          return caches.match('./index.html');
        });
      })
    );
    return;
  }
  
  // 3. Recursos externos (CDN, etc): Network First com fallback
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200) {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});