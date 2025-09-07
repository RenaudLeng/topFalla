// Configuration du cache
const CACHE_NAME = 'topfalla-v2';
const OFFLINE_URL = '/offline.html';

// Fichiers essentiels pour le fonctionnement hors ligne
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/categories.js',
  '/js/sidebar.js',
  '/img/placeholder.png',
  '/img/icon-192x192.png',
  '/img/icon-512x512.png'
];

// Fichiers à mettre en cache mais qui ne sont pas critiques
const CACHEABLE_ASSETS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation en cours...');
  
  // Mise en cache des ressources critiques
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Mise en cache des ressources critiques');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        // Mettre en cache les ressources non critiques en arrière-plan
        caches.open(CACHE_NAME)
          .then(cache => cache.addAll(CACHEABLE_ASSETS))
          .catch(err => console.warn('Erreur lors de la mise en cache des ressources non critiques:', err));
      })
      .then(() => self.skipWaiting())
      .catch(error => {
        console.error('Erreur lors de l\'installation du Service Worker:', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activation en cours...');
  
  // Nettoyage des anciens caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Suppression de l\'ancien cache :', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de mise en cache : Cache First, puis réseau
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes qui ne sont pas de type GET
  if (event.request.method !== 'GET') return;
  
  // Ignorer les requêtes vers des domaines externes non fiables
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;
  
  // Gestion des requêtes d'API différemment
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // Stratégie: Cache First, puis réseau pour les autres requêtes
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si la ressource est en cache, la retourner
        if (response) {
          // Mettre à jour le cache en arrière-plan si nécessaire
          updateCache(event.request);
          return response;
        }
        
        // Sinon, aller chercher sur le réseau
        return fetchAndCache(event.request);
      })
      .catch(() => {
        // En cas d'erreur, essayer de retourner la ressource depuis le cache
        return caches.match(event.request)
          .then(response => {
            if (response) return response;
            
            // Si c'est une navigation, retourner la page hors ligne
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            // Pour les images, retourner une image de remplacement
            if (event.request.destination === 'image') {
              return caches.match('/img/placeholder.png');
            }
            
            return new Response('Ressource non disponible hors ligne', { 
              status: 404,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Gestion des requêtes API
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Si la réponse est valide, la retourner
    if (networkResponse && networkResponse.status === 200) {
      // Mettre en cache la réponse si nécessaire
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // Si la requête échoue, essayer de retourner la version en cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Sinon, retourner une réponse d'erreur
    return new Response(JSON.stringify({ error: 'Ressource non disponible hors ligne' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Erreur lors de la gestion de la requête API:', error);
    
    // En cas d'erreur, essayer de retourner la version en cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(JSON.stringify({ error: 'Erreur de connexion' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Fonction pour mettre à jour le cache en arrière-plan
function updateCache(request) {
  fetch(request)
    .then(response => {
      // Vérifier si la réponse est valide
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return;
      }
      
      // Mettre à jour le cache
      const responseToCache = response.clone();
      caches.open(CACHE_NAME)
        .then(cache => cache.put(request, responseToCache));
    })
    .catch(error => {
      console.warn('Échec de la mise à jour du cache pour:', request.url, error);
    });
}

// Fonction pour aller chercher une ressource et la mettre en cache
async function fetchAndCache(request) {
  try {
    const response = await fetch(request);
    
    // Vérifier si la réponse est valide
    if (!response || response.status !== 200 || response.type !== 'basic') {
      return response;
    }
    
    // Mettre en cache la réponse pour les requêtes futures
    const responseToCache = response.clone();
    caches.open(CACHE_NAME)
      .then(cache => cache.put(request, responseToCache));
    
    return response;
    
  } catch (error) {
    console.error('Erreur lors de la récupération de la ressource:', error);
    
    // Si c'est une navigation, retourner la page hors ligne
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    
    // Pour les images, retourner une image de remplacement
    if (request.destination === 'image') {
      return caches.match('/img/placeholder.png');
    }
    
    throw error; // Propager l'erreur pour une gestion ultérieure
  }
}

// Gestion des messages (pour la mise à jour du contenu)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
