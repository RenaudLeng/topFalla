// Configuration de la recherche
const SEARCH_CONFIG = {
    // Données de démonstration (à remplacer par des appels API plus tard)
    products: [
        { 
            id: 1, 
            name: 'iPhone 13 128GB', 
            price: 450000, 
            store: 'Azur', 
            city: 'Libreville',
            date: '2025-08-26', 
            category: 'Téléphones',
            image: 'img/placeholder.png',
            rating: 4.5,
            votes: 24
        },
        { 
            id: 2, 
            name: 'Samsung Galaxy S21', 
            price: 420000, 
            store: 'Mbolo', 
            city: 'Libreville',
            date: '2025-08-25', 
            category: 'Téléphones',
            image: 'img/placeholder.png',
            rating: 4.2,
            votes: 18
        },
        { 
            id: 3, 
            name: 'Sachet de riz 5kg', 
            price: 3500, 
            store: 'Casino', 
            city: 'Port-Gentil',
            date: '2025-08-27', 
            category: 'Épicerie',
            image: 'img/placeholder.png',
            rating: 4.0,
            votes: 56
        },
        { 
            id: 4, 
            name: 'Lave-linge 8kg', 
            price: 320000, 
            store: 'Mbolo', 
            city: 'Libreville',
            date: '2025-08-24', 
            category: 'Électroménager',
            image: 'img/placeholder.png',
            rating: 4.7,
            votes: 12
        },
        { 
            id: 5, 
            name: 'Écouteurs Bluetooth', 
            price: 25000, 
            store: 'Azur', 
            city: 'Franceville',
            date: '2025-08-23', 
            category: 'Accessoires',
            image: 'img/placeholder.png',
            rating: 3.8,
            votes: 31
        },
        { 
            id: 6, 
            name: 'Télévision 55" 4K', 
            price: 380000, 
            store: 'Azur', 
            city: 'Libreville',
            date: '2025-08-22', 
            category: 'Télévisions',
            image: 'img/placeholder.png',
            rating: 4.9,
            votes: 8
        },
        { 
            id: 7, 
            name: 'Huile végétale 1L', 
            price: 1200, 
            store: 'Casino', 
            city: 'Port-Gentil',
            date: '2025-08-27', 
            category: 'Épicerie',
            image: 'img/placeholder.png',
            rating: 3.5,
            votes: 42
        },
        { 
            id: 8, 
            name: 'Sac à dos', 
            price: 15000, 
            store: 'Mbolo', 
            city: 'Libreville',
            date: '2025-08-21', 
            category: 'Mode',
            image: 'img/placeholder.png',
            rating: 4.1,
            votes: 15
        }
    ],
    itemsPerPage: 5,
    currentPage: 1,
    currentSort: 'relevance',
    currentFilters: {
        store: null,
        city: null,
        category: null
    }
};

// Éléments DOM
const elements = {
    searchForm: document.getElementById('searchForm'),
    searchInput: document.getElementById('searchInput'),
    searchQuery: document.getElementById('searchQuery'),
    searchResults: document.getElementById('searchResults'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    noResults: document.getElementById('noResults'),
    pagination: document.getElementById('pagination'),
    sortDropdown: document.querySelectorAll('[data-sort]')
};

// Événement de chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    initSearchPage();
    setupEventListeners();
});

// Initialisation de la page de recherche
function initSearchPage() {
    // Récupérer le terme de recherche depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    
    if (query) {
        elements.searchInput.value = query;
        elements.searchQuery.textContent = query;
        performSearch(query);
    } else {
        // Rediriger vers la page d'accueil si aucun terme de recherche
        window.location.href = 'index.html';
    }
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Recherche
    elements.searchForm.addEventListener('submit', handleSearch);
    
    // Tri des résultats
    elements.sortDropdown.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sortType = e.currentTarget.getAttribute('data-sort');
            sortResults(sortType);
        });
    });
}

// Gérer la recherche
function handleSearch(e) {
    e.preventDefault();
    const query = elements.searchInput.value.trim();
    
    if (query) {
        // Mettre à jour l'URL sans recharger la page
        const newUrl = `${window.location.pathname}?q=${encodeURIComponent(query)}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
        
        // Mettre à jour l'affichage
        elements.searchQuery.textContent = query;
        
        // Effectuer la recherche
        performSearch(query);
    }
}

// Effectuer la recherche
function performSearch(query) {
    // Afficher l'indicateur de chargement
    elements.loadingIndicator.classList.remove('d-none');
    elements.searchResults.innerHTML = '';
    elements.noResults.classList.add('d-none');
    elements.pagination.style.display = 'none';
    
    // Simuler un délai de chargement (à remplacer par un appel API réel)
    setTimeout(() => {
        // Filtrer les résultats en fonction de la requête
        const searchResults = SEARCH_CONFIG.products.filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.category.toLowerCase().includes(query.toLowerCase())
        );
        
        // Afficher les résultats
        displayResults(searchResults);
        
        // Masquer l'indicateur de chargement
        elements.loadingIndicator.classList.add('d-none');
        
        // Afficher un message si aucun résultat
        if (searchResults.length === 0) {
            elements.noResults.classList.remove('d-none');
        } else {
            // Afficher la pagination si nécessaire
            if (searchResults.length > SEARCH_CONFIG.itemsPerPage) {
                setupPagination(searchResults.length);
                elements.pagination.style.display = 'block';
            }
        }
    }, 800);
}

// Afficher les résultats de la recherche
function displayResults(results) {
    // Trier les résultats si nécessaire
    const sortedResults = sortResults(SEARCH_CONFIG.currentSort, [...results]);
    
    // Appliquer la pagination
    const startIndex = (SEARCH_CONFIG.currentPage - 1) * SEARCH_CONFIG.itemsPerPage;
    const paginatedResults = sortedResults.slice(startIndex, startIndex + SEARCH_CONFIG.itemsPerPage);
    
    // Générer le HTML des résultats
    elements.searchResults.innerHTML = paginatedResults.map(product => `
        <div class="col-12 mb-3">
            <div class="card product-card h-100">
                <div class="row g-0">
                    <div class="col-md-2 d-flex align-items-center justify-content-center p-3">
                        <img src="${product.image}" class="img-fluid rounded" alt="${product.name}">
                    </div>
                    <div class="col-md-8">
                        <div class="card-body">
                            <h3 class="h5 card-title mb-1">${product.name}</h3>
                            <div class="d-flex align-items-center mb-2">
                                <div class="text-warning me-2">
                                    ${generateStarRating(product.rating)}
                                </div>
                                <small class="text-muted">(${product.votes} avis)</small>
                            </div>
                            <div class="d-flex flex-wrap gap-2 mb-2">
                                <span class="badge bg-light text-dark">${product.category}</span>
                                <span class="badge bg-light text-dark">${product.store}</span>
                                <span class="badge bg-light text-dark">${product.city}</span>
                            </div>
                            <p class="card-text text-muted small">Mis à jour le ${formatDate(product.date)}</p>
                        </div>
                    </div>
                    <div class="col-md-2 d-flex flex-column align-items-end justify-content-between p-3 border-start">
                        <div class="text-end">
                            <div class="h4 mb-0 text-success fw-bold">${formatPrice(product.price)} FCFA</div>
                            <small class="text-muted">Prix constaté</small>
                        </div>
                        <div class="d-grid gap-2 w-100 mt-3">
                            <button class="btn btn-sm btn-outline-success">
                                <i class="bi bi-cart-plus me-1"></i> Acheter
                            </button>
                            <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#priceAlertModal">
                                <i class="bi bi-bell me-1"></i> Alerte prix
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Trier les résultats
function sortResults(sortType, results = SEARCH_CONFIG.products) {
    SEARCH_CONFIG.currentSort = sortType;
    
    // Mettre à jour le menu déroulant de tri
    document.querySelectorAll('[data-sort]').forEach(item => {
        if (item.getAttribute('data-sort') === sortType) {
            item.classList.add('active');
            // Mettre à jour le texte du bouton de tri
            const sortText = document.querySelector('.dropdown-toggle');
            if (sortText) {
                sortText.textContent = `Trier par : ${item.textContent}`;
            }
        } else {
            item.classList.remove('active');
        }
    });
    
    // Trier les résultats en fonction du type de tri sélectionné
    switch (sortType) {
        case 'price-asc':
            return [...results].sort((a, b) => a.price - b.price);
        case 'price-desc':
            return [...results].sort((a, b) => b.price - a.price);
        case 'date':
            return [...results].sort((a, b) => new Date(b.date) - new Date(a.date));
        case 'relevance':
        default:
            return results;
    }
}

// Configurer la pagination
function setupPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / SEARCH_CONFIG.itemsPerPage);
    const pagination = document.querySelector('.pagination');
    
    if (!pagination) return;
    
    // Vider la pagination existante
    pagination.innerHTML = '';
    
    // Bouton Précédent
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${SEARCH_CONFIG.currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Précédent" data-page="${SEARCH_CONFIG.currentPage - 1}">
            <span aria-hidden="true">&laquo;</span>
        </a>
    `;
    pagination.appendChild(prevLi);
    
    // Numéros de page
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === SEARCH_CONFIG.currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
        pagination.appendChild(li);
    }
    
    // Bouton Suivant
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${SEARCH_CONFIG.currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Suivant" data-page="${SEARCH_CONFIG.currentPage + 1}">
            <span aria-hidden="true">&raquo;</span>
        </a>
    `;
    pagination.appendChild(nextLi);
    
    // Gérer les clics sur la pagination
    pagination.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.closest('a');
        
        if (target && target.hasAttribute('data-page')) {
            const page = parseInt(target.getAttribute('data-page'));
            if (page >= 1 && page <= totalPages && page !== SEARCH_CONFIG.currentPage) {
                SEARCH_CONFIG.currentPage = page;
                performSearch(elements.searchInput.value.trim());
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    });
}

// Générer le code HTML pour les étoiles de notation
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';
    
    // Étoiles pleines
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="bi bi-star-fill"></i>';
    }
    
    // Demi-étoile
    if (hasHalfStar) {
        stars += '<i class="bi bi-star-half"></i>';
    }
    
    // Étoiles vides
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="bi bi-star"></i>';
    }
    
    return stars;
}

// Formater le prix
function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR').format(price);
}

// Formater la date
function formatDate(dateString) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
}

// Gérer le bouton de retour en haut de page
window.addEventListener('scroll', () => {
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        if (window.pageYOffset > 300) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    }
});
