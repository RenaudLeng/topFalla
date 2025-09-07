// Configuration de l'application
const CONFIG = {
    // Catégories de produits populaires
    categories: [
        { id: 1, name: 'Téléphones', icon: 'bi-phone' },
        { id: 2, name: 'Électroménager', icon: 'bi-tv' },
        { id: 3, name: 'Informatique', icon: 'bi-laptop' },
        { id: 4, name: 'Mode', icon: 'bi-bag' },
        { id: 5, name: 'Beauté', icon: 'bi-droplet' },
        { id: 6, name: 'Épicerie', icon: 'bi-cart' },
    ],
    
    // Derniers prix (à remplacer par des données dynamiques plus tard)
    latestPrices: [
        { id: 1, name: 'iPhone 13 128GB', price: 450000, store: 'Azur', date: '2025-08-26', category: 'Téléphones' },
        { id: 2, name: 'Samsung Galaxy S21', price: 420000, store: 'Mbolo', date: '2025-08-25', category: 'Téléphones' },
        { id: 3, name: 'Sachet de riz 5kg', price: 3500, store: 'Casino', date: '2025-08-27', category: 'Épicerie' },
        { id: 4, name: 'Lave-linge 8kg', price: 320000, store: 'Mbolo', date: '2025-08-24', category: 'Électroménager' },
    ]
};

// Éléments DOM
const elements = {
    searchForm: document.getElementById('searchForm'),
    searchInput: document.getElementById('searchInput'),
    categoriesGrid: document.getElementById('categoriesGrid'),
    latestPricesGrid: document.getElementById('latestPrices'),
    installButton: document.getElementById('installButton')
};

// Événement de chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    loadCategories();
    loadLatestPrices();
    checkInstallPrompt();
    checkConnectivity();
});

// Initialisation de l'application
function initApp() {
    // Vérifier si l'application est installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('Application installée');
    }
    
    // Vérifier la connexion
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Recherche
    elements.searchForm.addEventListener('submit', handleSearch);
    
    // Installation de l'application
    if (elements.installButton) {
        elements.installButton.addEventListener('click', installApp);
    }
}

// Charger les catégories
function loadCategories() {
    if (!elements.categoriesGrid) return;
    
    elements.categoriesGrid.innerHTML = CONFIG.categories.map(category => `
        <div class="col-6 col-md-4 col-lg-3 mb-3">
            <div class="card category-card h-100 text-center p-4">
                <div class="category-icon">
                    <i class="bi ${category.icon}"></i>
                </div>
                <h3 class="h5 mb-0">${category.name}</h3>
            </div>
        </div>
    `).join('');
}

// Charger les derniers prix
function loadLatestPrices() {
    if (!elements.latestPricesGrid) return;
    
    elements.latestPricesGrid.innerHTML = CONFIG.latestPrices.map(item => `
        <div class="col-12 col-md-6 col-lg-3">
            <div class="card product-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h3 class="h6 mb-0">${item.name}</h3>
                        <span class="badge bg-light text-dark">${item.category}</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <div>
                            <div class="product-price">${formatPrice(item.price)} FCFA</div>
                            <div class="product-store">${item.store} • ${formatDate(item.date)}</div>
                        </div>
                        <button class="btn btn-sm btn-outline-success">
                            <i class="bi bi-plus-lg"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Gérer la recherche
function handleSearch(e) {
    e.preventDefault();
    const query = elements.searchInput.value.trim();
    
    if (query) {
        // Enregistrer la recherche dans l'historique
        saveSearchHistory(query);
        
        // Rediriger vers la page de résultats
        window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    }
}

// Formater le prix
function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR').format(price);
}

// Formater la date
function formatDate(dateString) {
    const options = { day: 'numeric', month: 'short' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
}

// Vérifier la connectivité
function checkConnectivity() {
    if (!navigator.onLine) {
        showOfflineBanner();
    }
}

// Mettre à jour le statut de connexion
function updateOnlineStatus() {
    if (navigator.onLine) {
        hideOfflineBanner();
        // Synchroniser les données si nécessaire
    } else {
        showOfflineBanner();
    }
}

// Afficher la bannière hors ligne
function showOfflineBanner() {
    const banner = document.createElement('div');
    banner.className = 'offline-banner';
    banner.innerHTML = 'Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.';
    document.body.appendChild(banner);
    banner.style.display = 'block';
}

// Cacher la bannière hors ligne
function hideOfflineBanner() {
    const banner = document.querySelector('.offline-banner');
    if (banner) {
        banner.style.display = 'none';
    }
}

// Gérer l'installation de l'application
let deferredPrompt;

function checkInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (elements.installButton) {
            elements.installButton.style.display = 'block';
        }
    });
}

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Installation acceptée');
                if (elements.installButton) {
                    elements.installButton.style.display = 'none';
                }
            }
            deferredPrompt = null;
        });
    }
}

// Sauvegarder l'historique des recherches
function saveSearchHistory(query) {
    let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    
    // Éviter les doublons
    history = history.filter(item => item.toLowerCase() !== query.toLowerCase());
    
    // Ajouter au début du tableau
    history.unshift(query);
    
    // Limiter à 10 recherches
    if (history.length > 10) {
        history = history.slice(0, 10);
    }
    
    localStorage.setItem('searchHistory', JSON.stringify(history));
}
