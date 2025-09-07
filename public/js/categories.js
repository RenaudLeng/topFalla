// Configuration des icônes pour les catégories
const categoryIcons = {
  // Icônes par défaut (utilisant Bootstrap Icons)
  'epicerie': 'bi-shop',
  'boissons': 'bi-cup-straw',
  'fruits-legumes': 'bi-apple',
  'poisson-viande': 'bi-egg-fried',
  'produits-laitiers': 'bi-cup-hot',
  'hygiene-beaute': 'bi-bag-heart',
  'electromenager': 'bi-tv',
  'telephonie': 'bi-phone',
  'mode': 'bi-shop',
  'informatique': 'bi-laptop',
  'maison': 'bi-house',
  'jardin': 'bi-tree',
  'bricolage': 'bi-tools',
  'sport': 'bi-activity',
  'loisirs': 'bi-controller',
  'auto-moto': 'bi-car-front',
  'bebe': 'bi-emoji-heart-eyes',
  'animalerie': 'bi-heart',
  'culture': 'bi-book',
  'default': 'bi-grid'
};

// Configuration des images
const imageConfig = {
  // Cache pour les images déjà chargées
  imageCache: new Map(),
  
  // Valeurs par défaut pour l'optimisation
  defaultWidth: 400,
  defaultHeight: 300,
  defaultQuality: 80,
  
  // Générer une URL d'image optimisée
  getOptimizedImageUrl(url, options = {}) {
    if (!url) return window.imageConfig.getFallbackImage('default');
    
    // Vérifier le cache d'abord
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey);
    }
    
    // Pour les images locales ou les données URI, ne pas les optimiser
    if (url.startsWith('/') || url.startsWith('data:') || url.includes('localhost')) {
      return url;
    }
    
    // Options d'optimisation
    const width = options.width || this.defaultWidth;
    const height = options.height || this.defaultHeight;
    const quality = options.quality || this.defaultQuality;
    
    // Pour Unsplash, utiliser les paramètres d'optimisation
    if (url.includes('unsplash.com')) {
      const optimizedUrl = new URL(url);
      optimizedUrl.searchParams.set('auto', 'format');
      optimizedUrl.searchParams.set('fit', 'crop');
      optimizedUrl.searchParams.set('w', width);
      optimizedUrl.searchParams.set('h', height);
      optimizedUrl.searchParams.set('q', quality);
      optimizedUrl.searchParams.set('dpr', window.devicePixelRatio > 1 ? '2' : '1');
      
      // Mettre en cache le résultat
      const result = optimizedUrl.toString();
      this.imageCache.set(cacheKey, result);
      return result;
    }
    
    // Pour d'autres fournisseurs d'images, retourner l'URL d'origine
    return url;
  },
  
  // Obtenir une image de secours
  getFallbackImage(categorySlug = 'default') {
    return window.imageConfig.getFallbackImage('default');
  },
  
  // Précharger les images
  preloadImages(urls) {
    if (!window.requestIdleCallback) return;
    
    window.requestIdleCallback(() => {
      urls.forEach(url => {
        if (!url) return;
        
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = url;
        document.head.appendChild(link);
        
        // Nettoyer après le chargement
        const img = new Image();
        img.src = url;
        img.onload = img.onerror = () => {
          document.head.removeChild(link);
        };
      });
    }, { timeout: 2000 });
  }
};

// Données des catégories avec icônes
const categories = [
  {
    id: 1,
    name: 'Épicerie',
    slug: 'epicerie',
    icon: categoryIcons['epicerie'],
    description: 'Riz, pâtes, huile et produits de base',
    subcategories: [
      { name: 'Riz et Pâtes', slug: 'riz-pates', icon: 'bi-basket' },
      { name: 'Huiles et Condiments', slug: 'huiles-condiments', icon: 'bi-droplet' },
      { name: 'Conserves', slug: 'conserves', icon: 'bi-box-seam' },
      { name: 'Farines et Céréales', slug: 'farines-cereales', icon: 'bi-bread-slice' }
    ]
  },
  {
    id: 2,
    name: 'Boissons',
    slug: 'boissons',
    icon: categoryIcons['boissons'],
    description: 'Regab, Djino, jus naturels et sodas',
    subcategories: [
      { name: 'Boissons Gazeuses', slug: 'boissons-gazeuses', icon: 'bi-cup-straw' },
      { name: 'Jus Naturels', slug: 'jus-naturels', icon: 'bi-cup' },
      { name: 'Eaux Minérales', slug: 'eaux', icon: 'bi-droplet' },
      { name: 'Boissons Énergisantes', slug: 'boissons-energisantes', icon: 'bi-lightning' }
    ]
  },
  {
    id: 3,
    name: 'Fruits et Légumes',
    slug: 'fruits-legumes',
    icon: categoryIcons['fruits-legumes'],
    description: 'Frais, surgelés ou en conserve',
    subcategories: [
      { name: 'Fruits Frais', slug: 'fruits-frais', icon: 'bi-apple' },
      { name: 'Légumes Frais', slug: 'legumes-frais', icon: 'bi-carrot' },
      { name: 'Fruits Secs', slug: 'fruits-secs', icon: 'bi-nut' },
      { name: 'Légumes Surgelés', slug: 'legumes-surgelees', icon: 'bi-snow' }
    ]
  },
  {
    id: 4,
    name: 'Poisson et Viande',
    slug: 'poisson-viande',
    icon: categoryIcons['poisson-viande'],
    description: 'Poissons frais, viande de brousse, poulet',
    subcategories: [
      { name: 'Viandes Rouges', slug: 'viandes-rouges', icon: 'bi-droplet' },
      { name: 'Volailles', slug: 'volailles', icon: 'bi-egg-fried' },
      { name: 'Poissons', slug: 'poissons', icon: 'bi-droplet' },
      { name: 'Fruits de Mer', slug: 'fruits-de-mer', icon: 'bi-droplet' }
    ]
  },
  {
    id: 5,
    name: 'Produits Laitiers',
    slug: 'produits-laitiers',
    icon: categoryIcons['produits-laitiers'],
    description: 'Lait, yaourts, fromages locaux et importés',
    subcategories: [
      { name: 'Lait', slug: 'lait', icon: 'bi-cup-hot' },
      { name: 'Yaourts', slug: 'yaourts', icon: 'bi-cup-straw' },
      { name: 'Fromages', slug: 'fromages', icon: 'bi-egg-fried' },
      { name: 'Beurre et Crème', slug: 'beurre-creme', icon: 'bi-droplet' }
    ]
  },
  {
    id: 6,
    name: 'Hygiène & Beauté',
    slug: 'hygiene-beaute',
    icon: categoryIcons['hygiene-beaute'],
    description: 'Savons, laits corporels, produits capillaires',
    subcategories: [
      { name: 'Soins du Corps', slug: 'soins-corps', icon: 'bi-bag-heart' },
      { name: 'Produits Capillaires', slug: 'produits-capillaires', icon: 'bi-scissors' },
      { name: 'Parfums', slug: 'parfums', icon: 'bi-flower1' },
      { name: 'Maquillage', slug: 'maquillage', icon: 'bi-palette' }
    ]
  },
  {
    id: 7,
    name: 'Électroménager',
    slug: 'electromenager',
    icon: categoryIcons['electromenager'],
    description: 'Gros et petit électroménager pour la maison',
    subcategories: [
      { name: 'Gros Électroménager', slug: 'gros-electromenager', icon: 'bi-refrigerator' },
      { name: 'Petit Électroménager', slug: 'petit-electromenager', icon: 'bi-lightning' },
      { name: 'Climatisation', slug: 'climatisation', icon: 'bi-snow' },
      { name: 'Cuisine', slug: 'electromenager-cuisine', icon: 'bi-egg-fried' }
    ]
  },
  {
    id: 8,
    name: 'Téléphonie',
    slug: 'telephonie',
    icon: categoryIcons['telephonie'],
    description: 'Smartphones, forfaits, accessoires télécoms',
    subcategories: [
      { name: 'Smartphones', slug: 'smartphones', icon: 'bi-phone' },
      { name: 'Forfaits Mobiles', slug: 'forfaits-mobiles', icon: 'bi-phone' },
      { name: 'Accessoires', slug: 'accessoires-telephonie', icon: 'bi-earbuds' },
      { name: 'Montres Connectées', slug: 'montres-connectees', icon: 'bi-smartwatch' }
    ]
  }
];

// Fonction utilitaire pour gérer les erreurs de chargement d'images
function handleImageError(img, categorySlug = '', options = {}) {
  try {
    const element = img.target || img;
    if (!element || !(element instanceof HTMLImageElement)) return;
    
    // Ne pas gérer les erreurs sur les images déjà en erreur
    if (element.classList.contains('img-error')) return;
    
    const { retry = true, maxRetries = 1 } = options;
    const currentRetry = parseInt(element.dataset.retryCount || '0');
    
    // Si on a dépassé le nombre maximal de tentatives ou que l'option retry est désactivée
    if (!retry || currentRetry >= maxRetries) {
      // Utiliser l'icône de la catégorie comme fallback
      const iconClass = categorySlug && categoryIcons[categorySlug] 
        ? categoryIcons[categorySlug] 
        : 'bi-image';
      
      // Créer une image de remplacement avec l'icône
      element.outerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center bg-light" 
             style="width: 100%; height: 100%; min-height: 100px;">
          <i class="bi ${iconClass} fs-1 text-muted"></i>
          <small class="text-muted mt-2">Image non disponible</small>
        </div>
      `;
      return;
    }
    
    // Incrémenter le compteur de tentatives
    element.dataset.retryCount = (currentRetry + 1).toString();
    
    // Attendre un peu avant de réessayer (backoff exponentiel)
    const delay = Math.min(1000 * Math.pow(2, currentRetry), 5000);
    
    // Réessayer avec une nouvelle URL
    setTimeout(() => {
      const originalSrc = element.dataset.originalSrc || element.src;
      const timestamp = new Date().getTime();
      const retryUrl = originalSrc.includes('?') 
        ? `${originalSrc}&retry=${timestamp}` 
        : `${originalSrc}?retry=${timestamp}`;
      
      // Réessayer avec la nouvelle URL
      element.src = retryUrl;
    }, delay);
  } catch (error) {
    console.error('Erreur dans handleImageError:', error);
  }
}

/**
 * Obtient une URL d'image sécurisée avec gestion d'erreur et optimisation
 * @param {string} url - URL de l'image à charger
 * @param {string} categorySlug - Slug de la catégorie pour l'image de secours
 * @param {Object} options - Options d'optimisation
 * @param {number} [options.width] - Largeur souhaitée
 * @param {number} [options.height] - Hauteur souhaitée
 * @param {number} [options.quality] - Qualité (0-100)
 * @param {boolean} [options.lazy=true] - Si true, utilise le chargement paresseux
 * @returns {Promise<string>} URL de l'image optimisée ou de secours
 */
async function getSafeImageUrl(url, categorySlug = '', options = {}) {
  const { lazy = true, ...imgOptions } = options;
  
  // Si pas d'URL, retourner l'image de secours
  if (!url) {
    return imageConfig.getFallbackImage(categorySlug);
  }
  
  // Pour les images SVG ou les données URI, retourner directement
  if (url.startsWith('data:') || url.endsWith('.svg')) {
    return url;
  }
  
  // Vérifier le cache d'abord
  const cacheKey = `url:${url}-${categorySlug}-${JSON.stringify(imgOptions)}`;
  if (imageConfig.imageCache.has(cacheKey)) {
    return imageConfig.imageCache.get(cacheKey);
  }
  
  try {
    // Optimiser l'URL avec les paramètres de qualité/dimensions
    const optimizedUrl = imageConfig.getOptimizedImageUrl(url, imgOptions);
    
    // Si le chargement paresseux est activé, retourner directement l'URL optimisée
    if (lazy) {
      // Mettre en cache pour les prochains appels
      imageConfig.imageCache.set(cacheKey, optimizedUrl);
      return optimizedUrl;
    }
    
    // Vérifier si l'image est déjà en cache du navigateur
    if (await isImageCached(optimizedUrl)) {
      imageConfig.imageCache.set(cacheKey, optimizedUrl);
      return optimizedUrl;
    }
    
    // Charger l'image en arrière-plan pour vérifier son intégrité
    const isValid = await checkImageIntegrity(optimizedUrl);
    
    if (isValid) {
      imageConfig.imageCache.set(cacheKey, optimizedUrl);
      return optimizedUrl;
    }
    
    // Si l'image n'est pas valide, essayer avec l'URL d'origine
    if (url !== optimizedUrl) {
      const originalValid = await checkImageIntegrity(url);
      if (originalValid) {
        imageConfig.imageCache.set(cacheKey, url);
        return url;
      }
    }
    
    // Si tout échoue, retourner l'image de secours
    return imageConfig.getFallbackImage(categorySlug);
    
  } catch (error) {
    console.error('Erreur lors du chargement de l\'image:', error);
    return imageConfig.getFallbackImage(categorySlug);
  }
}

/**
 * Vérifie si une image est déjà en cache dans le navigateur
 * @param {string} url - URL de l'image à vérifier
 * @returns {Promise<boolean>} true si l'image est en cache
 */
function isImageCached(url) {
  // Pour les images locales, toujours les charger
  if (url.startsWith('/') || url.startsWith('data:')) {
    return false;
  }
  
  // Vérifier le cache via l'API Cache
  if ('caches' in window) {
    return caches.match(url)
      .then(response => !!response)
      .catch(() => false);
  }
  
  // Fallback: toujours supposer que l'image n'est pas en cache
  return Promise.resolve(false);
}

/**
 * Vérifie l'intégrité d'une image en la chargeant
 * @param {string} url - URL de l'image à vérifier
 * @returns {Promise<boolean>} true si l'image est valide
 */
function checkImageIntegrity(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }
    
    const img = new Image();
    let loaded = false;
    
    const cleanup = () => {
      img.onload = img.onerror = null;
      clearTimeout(timeout);
      // Libérer la mémoire
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
    };
    
    const timeout = setTimeout(() => {
      if (!loaded) {
        cleanup();
        resolve(false);
      }
    }, 5000); // 5 secondes de timeout
    
    img.onload = () => {
      loaded = true;
      cleanup();
      // Vérifier que l'image a des dimensions valides
      resolve(img.width > 0 && img.height > 0);
    };
    
    img.onerror = () => {
      cleanup();
      resolve(false);
    };
    
    // Démarrer le chargement
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.src = url;
  });
}

/**
 * Affiche les catégories dans le conteneur spécifié
 * @param {string} containerId - ID du conteneur HTML
 * @param {number} maxItems - Nombre maximum d'éléments à afficher
 * @returns {Promise<void>}
 */
async function displayCategories(containerId = 'categories-container', maxItems = 50) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Conteneur avec l'ID ${containerId} non trouvé`);
    return;
  }

  // Afficher un indicateur de chargement
  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-success" role="status">
        <span class="visually-hidden">Chargement des catégories...</span>
      </div>
      <p class="mt-2 text-muted">Chargement des catégories en cours</p>
    </div>`;
  
  try {
    const categoriesToShow = maxItems ? categories.slice(0, maxItems) : categories;
    
    // Générer le HTML des cartes de catégories avec des placeholders
    const cardsHtml = categoriesToShow.map(category => {
      const iconClass = categoryIcons[category.slug] || categoryIcons['default'];
      const placeholderColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}20`;
      
      return `
        <div class="col-6 col-md-4 col-lg-3 mb-4" data-category-slug="${category.slug}">
          <a href="/search.html?categorie=${encodeURIComponent(category.slug)}" class="text-decoration-none">
            <div class="card h-100 category-card shadow-sm">
              <div class="category-image-container" style="background-color: ${placeholderColor};">
                <div class="d-flex align-items-center justify-content-center" style="height: 150px;">
                  <i class="bi ${iconClass} fs-1 text-muted"></i>
                </div>
              </div>
              <div class="card-body text-center">
                <h5 class="card-title mb-0">${category.name}</h5>
              </div>
            </div>
          </a>
        </div>`;
    });
    
    // Afficher les cartes avec les placeholders
    container.innerHTML = `
      <div class="row g-3">
        ${cardsHtml.join('\n')}
      </div>`;
    
    // Charger les images en arrière-plan et les afficher une fois chargées
    categoriesToShow.forEach(async (category) => {
      if (!category.image) return;
      
      const cardElement = container.querySelector(`[data-category-slug="${category.slug}"]`);
      if (!cardElement) return;
      
      try {
        const imageUrl = await getSafeImageUrl(category.image, category.slug, {
          width: 500,
          height: 350,
          quality: 75,
          lazy: true
        });
        
        const imgContainer = cardElement.querySelector('.category-image-container');
        if (imgContainer) {
          imgContainer.innerHTML = `
            <img 
              src="${imageUrl}"
              alt="${category.name}" 
              class="category-image img-fluid"
              loading="lazy"
              onerror="window.handleImageError(this, '${category.slug}')"
              style="width: 100%; height: 150px; object-fit: cover;">`;
        }
      } catch (error) {
        console.error(`Erreur lors du chargement de l'image pour ${category.name}:`, error);
      }
    });
    
    // Initialiser le chargement paresseux pour les images
    initLazyLoading();
  } catch (error) {
    console.error('Erreur lors du chargement des catégories:', error);
    container.innerHTML = `
      <div class="alert alert-danger">
        Une erreur est survenue lors du chargement des catégories. Veuillez réessayer plus tard.
      </div>`;
  }
}

/**
 * Initialise le chargement paresseux des images
 */
function initLazyLoading() {
  const lazyImages = document.querySelectorAll('img.lazy-load');
  
  if (!('IntersectionObserver' in window)) {
    // Fallback pour les navigateurs qui ne supportent pas IntersectionObserver
    lazyImages.forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
    });
    return;
  }
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.classList.remove('lazy-load');
          observer.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '200px',
    threshold: 0.01
  });
  
  lazyImages.forEach(img => {
    imageObserver.observe(img);
  });
}

// Fonction pour obtenir les informations d'une catégorie par son slug
function getCategoryBySlug(slug) {
  return categories.find(cat => cat.slug === slug);
}

// Fonction pour obtenir toutes les catégories
function getAllCategories() {
  return [...categories];
}

// Fonction pour filtrer les catégories
function filterCategories(searchTerm) {
  const searchTermLower = searchTerm.toLowerCase();
  return categories.filter(category => 
    category.name.toLowerCase().includes(searchTermLower) || 
    (category.description && category.description.toLowerCase().includes(searchTermLower))
  );
}

// Exposer les fonctions et données au scope global
if (!window.topFalla) {
    window.topFalla = {};
}

if (!window.topFalla.categories) {
    window.topFalla.categories = {
        categories: categories,
        getCategoryBySlug: getCategoryBySlug,
        getAllCategories: getAllCategories,
        filterCategories: filterCategories,
        handleImageError: handleImageError,
        getSafeImageUrl: getSafeImageUrl,
        displayCategories: displayCategories,
        initLazyLoading: initLazyLoading
    };
}

// Alias pour la rétrocompatibilité
if (!window.categories) {
    window.categories = categories;
}

if (!window.CategoryManager) {
    window.CategoryManager = window.topFalla.categories;
}

// Initialisation automatique si la page contient un conteneur de catégories
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('categories-container')) {
    displayCategories();
  }
});
