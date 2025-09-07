// Configuration du Service Worker
const CACHE_NAME = 'topfalla-v1';
const OFFLINE_URL = 'offline.html';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/categories.js',
  '/js/sidebar.js',
  '/img/placeholder.png',
  '/img/icon-192x192.png',
  '/img/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation en cours...');
  
  // Créer un nouveau cache et ajouter les fichiers
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Mise en cache des ressources');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(error => {
        console.error('Erreur lors de la mise en cache:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Stratégie: Cache First, puis réseau
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourner la réponse en cache si disponible
        if (response) {
          return response;
        }

        // Sinon, faire une requête réseau
        return fetch(event.request)
          .then((response) => {
            // Vérifier si la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Mettre en cache la réponse pour les requêtes futures
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // En cas d'erreur de réseau, retourner la page hors ligne
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Hors ligne', { status: 408, statusText: 'Hors ligne' });
          });
      })
  );
});

// Nettoyer les anciens caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
