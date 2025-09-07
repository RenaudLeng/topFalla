'use strict';

// Configuration des icônes pour les catégories (globale pour être accessible partout)
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

// Déclaration de l'objet global topFalla s'il n'existe pas
window.topFalla = window.topFalla || {};

// Vérifier si le code est déjà exécuté
if (window.topFallaSidebarInitialized) {
    console.warn('Le menu latéral a déjà été initialisé');
} else {
    window.topFallaSidebarInitialized = true;
    
    // Déclarer les fonctions globales
    let displayCategoriesInMenu, filterCategoriesInMenu, initLazyLoading, initSubmenus;
    
    // Initialisation du module
    (function() {
    
    // Fonction utilitaire pour gérer les erreurs d'images
    function handleImageError(img, categorySlug = '') {
        if (!img || !(img instanceof HTMLElement)) return;
        
        // Récupérer l'icône par défaut pour cette catégorie
        const defaultIcon = categoryIcons[categorySlug] || 'bi-grid';
        
        // Remplacer l'image par une icône
        img.outerHTML = `<i class="bi ${defaultIcon} menu-icon"></i>`;
    }

    // Marquer comme initialisé

    // Gestion du menu latéral
    document.addEventListener('DOMContentLoaded', function() {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const closeSidebar = document.getElementById('closeSidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        let isSidebarOpen = false;

        // Fonction pour ouvrir le menu avec animation fluide
        async function openSidebar() {
            if (isSidebarOpen) return;
            
            // Afficher les éléments avant l'animation
            if (sidebar) sidebar.style.display = 'block';
            if (sidebarOverlay) sidebarOverlay.style.display = 'block';
            
            // Forcer le recalcul des styles pour activer la transition
            await new Promise(resolve => {
                if (sidebar) void sidebar.offsetWidth;
                requestAnimationFrame(() => {
                    if (sidebar) sidebar.classList.add('show');
                    if (sidebarOverlay) sidebarOverlay.classList.add('show');
                    resolve();
                });
            });
            
            document.body.style.overflow = 'hidden';
            isSidebarOpen = true;
            document.body.classList.add('sidebar-open');
            
            // Ajouter une classe pour l'animation d'entrée
            if (sidebar) sidebar.classList.add('sidebar-enter');
            
            // Supprimer la classe après l'animation
            setTimeout(() => {
                if (sidebar) sidebar.classList.remove('sidebar-enter');
                
                // Déclencher un événement personnalisé une fois l'animation terminée
                window.dispatchEvent(new CustomEvent('sidebarOpened'));
            }, 300);
        }
    
        // Fonction pour fermer le menu avec animation fluide
        async function closeSidebarMenu() {
            if (!isSidebarOpen || !sidebar || !sidebarOverlay) return;
            
            // Ajouter une classe pour l'animation de sortie
            sidebar.classList.add('sidebar-exit');
            
            // Démarrer l'animation de sortie
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    if (sidebar) sidebar.classList.remove('show');
                    if (sidebarOverlay) sidebarOverlay.classList.remove('show');
                    resolve();
                });
            });
            
            // Réinitialiser les styles après l'animation
            setTimeout(() => {
                if (sidebar) {
                    sidebar.style.display = 'none';
                    sidebar.classList.remove('sidebar-exit');
                }
                if (sidebarOverlay) {
                    sidebarOverlay.style.display = 'none';
                }
                
                document.body.style.overflow = '';
                isSidebarOpen = false;
                document.body.classList.remove('sidebar-open');
                
                // Déclencher un événement personnalisé
                window.dispatchEvent(new CustomEvent('sidebarClosed'));
            }, 300);
        }
        
        // Initialisation
        if (sidebar) sidebar.style.display = 'none';
        if (sidebarOverlay) sidebarOverlay.style.display = 'none';
        
        // Gestionnaires d'événements
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                if (isSidebarOpen) {
                    closeSidebarMenu();
                } else {
                    openSidebar();
                }
            });
        }

        if (closeSidebar) {
            closeSidebar.addEventListener('click', closeSidebarMenu);
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', closeSidebarMenu);
        }

        // Gestion du clavier (Echap pour fermer)
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar && sidebar.classList.contains('show')) {
                closeSidebarMenu();
            }
        });

        // Initialiser le menu des catégories
        displayCategoriesInMenu();
    });
});

// Fonction pour afficher les catégories dans le menu latéral
displayCategoriesInMenu = async function(containerId = 'categoriesMenu') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Conteneur avec l'ID ${containerId} non trouvé`);
        return;
    }

    // Créer la structure du menu
    container.innerHTML = `
        <div class="sidebar-header">
            <h5 class="mb-0">Catégories</h5>
            <button id="closeSidebar" aria-label="Fermer le menu">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `;

    try {
        // Récupérer les catégories depuis la variable globale
        const categories = window.categories || [];
        
        // Créer l'élément de recherche
        const searchHtml = `
            <div class="px-3 mb-3">
                <div class="input-group">
                    <span class="input-group-text bg-light border-end-0">
                        <i class="bi bi-search text-muted"></i>
                    </span>
                    <input type="text" 
                           id="categorySearch" 
                           class="form-control border-start-0" 
                           placeholder="Rechercher une catégorie..."
                           aria-label="Rechercher une catégorie">
                </div>
            </div>
        `;
        
        // Créer la liste des catégories
        const ul = document.createElement('ul');
        ul.className = 'nav flex-column';
        
        // Ajouter chaque catégorie avec une animation
        for (const [index, category] of categories.entries()) {
            const hasSubcategories = category.subcategories && category.subcategories.length > 0;
            const li = document.createElement('li');
            li.className = 'nav-item menu-item' + (hasSubcategories ? ' has-submenu' : '');
            li.style.setProperty('--delay', `${index * 0.05}s`);
            
            // Utiliser l'icône de la catégorie ou une icône par défaut
            const iconClass = categoryIcons[category.slug] || 'bi-grid';
            
            let categoryContent = `
                <a href="search.html?categorie=${encodeURIComponent(category.slug)}" class="nav-link d-flex align-items-center">
                    <i class="bi ${iconClass} menu-icon me-2"></i>
                    <span class="flex-grow-1">${category.name}</span>
                    ${hasSubcategories ? '<i class="bi bi-chevron-down menu-arrow"></i>' : ''}
                </a>
            `;
            
            if (hasSubcategories) {
                categoryContent += `
                    <ul class="submenu">
                        ${category.subcategories.map(sub => `
                            <li>
                                <a href="search.html?categorie=${encodeURIComponent(sub.slug)}" class="nav-link d-flex align-items-center">
                                    <i class="bi ${sub.icon || 'bi-dot'} menu-icon me-2"></i>
                                    <span>${sub.name}</span>
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                `;
            }
            
            li.innerHTML = categoryContent;
            ul.appendChild(li);
        }
        
        // Construire le contenu final
        container.innerHTML = `
            ${searchHtml}
            <div class="categories-list">
                ${ul.outerHTML}
            </div>
        `;
        
        // Initialiser la recherche
        const searchInput = document.getElementById('categorySearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                filterCategoriesInMenu(e.target.value);
            });
        }
        
        // Initialiser les sous-menus
        initSubmenus();
        
        // Animer l'apparition des éléments avec un délai progressif
        const menuItems = container.querySelectorAll('.menu-item');
        menuItems.forEach((item, index) => {
            // Ajouter un délai progressif pour l'animation
            item.style.animationDelay = `${index * 50}ms`;
            item.classList.add('enter');
            
            // Ajouter un gestionnaire d'erreur pour les icônes
            const icon = item.querySelector('.menu-icon');
            if (icon) {
                icon.onerror = () => {
                    icon.className = 'bi bi-grid menu-icon me-2';
                };
            }
        });
        
    } catch (error) {
        console.error('Erreur lors du chargement des catégories :', error);
        container.innerHTML = `
            <div class="alert alert-warning m-3">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Impossible de charger les catégories. Veuillez réessayer.
                <div class="mt-2 small">${error.message || ''}</div>
            </div>
        `;
    }
}

// Fonction pour filtrer les catégories dans le menu
filterCategoriesInMenu = function(searchTerm) {
    const menuItems = document.querySelectorAll('.categories-list .nav-link');
    const categoriesList = document.querySelector('.categories-list');
    if (!categoriesList) return;
    
    let hasVisibleItems = false;
    
    // Supprimer le message d'absence de résultats précédent
    const existingNoResults = categoriesList.querySelector('.no-results-message');
    if (existingNoResults) {
        existingNoResults.remove();
    }
    
    menuItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        const parentLi = item.closest('li');
        
        if (searchTerm === '' || text.includes(searchTerm)) {
            parentLi.style.display = '';
            hasVisibleItems = true;
            
            // Mettre en surbrillance le texte correspondant
            if (searchTerm) {
                const regex = new RegExp(`(${searchTerm})`, 'gi');
                item.innerHTML = item.innerHTML.replace(regex, '<span class="bg-warning">$1</span>');
            }
            
            // Ouvrir les sous-menus si correspondance
            const submenu = parentLi.querySelector('.submenu');
            if (submenu) {
                submenu.classList.add('show');
            }
        } else {
            // Vérifier si une sous-catégorie correspond
            const subItems = parentLi.querySelectorAll('.submenu .nav-link');
            let hasMatchingSubItem = false;
            
            subItems.forEach(subItem => {
                const subText = subItem.textContent.toLowerCase();
                if (subText.includes(searchTerm)) {
                    hasMatchingSubItem = true;
                    // Mettre en surbrillance la correspondance
                    const regex = new RegExp(`(${searchTerm})`, 'gi');
                    subItem.innerHTML = subItem.innerHTML.replace(regex, '<span class="bg-warning">$1</span>');
                }
            });
            
            if (hasMatchingSubItem) {
                parentLi.style.display = '';
                const submenu = parentLi.querySelector('.submenu');
                if (submenu) submenu.classList.add('show');
                hasVisibleItems = true;
            } else {
                parentLi.style.display = 'none';
            }
        }
    });
    
    // Afficher un message si aucune correspondance
    if (searchTerm && !hasVisibleItems) {
        const noResults = document.createElement('div');
        noResults.className = 'alert alert-info m-3 no-results-message';
        noResults.innerHTML = `
            <i class="bi bi-info-circle me-2"></i>
            Aucun résultat trouvé pour "${searchTerm}"
        `;
        categoriesList.appendChild(noResults);
    }
}

/**
 * Initialise le chargement paresseux des images
 */
initLazyLoading = function() {
    const lazyImages = document.querySelectorAll('img.lazy-load');
    
    if (!('IntersectionObserver' in window)) {
        // Fallback pour les navigateurs qui ne supportent pas IntersectionObserver
        lazyImages.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.classList.remove('lazy-load');
            }
        });
        return;
    }
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    // Charger l'image
                    img.src = img.dataset.src;
                    
                    // Une fois l'image chargée, ajouter une classe pour l'animation
                    img.onload = () => {
                        img.classList.add('loaded');
                        img.style.opacity = '1';
                    };
                    
                    // Gérer les erreurs de chargement
                    img.onerror = () => {
                        window.topFalla?.categories.handleImageError({
                            target: img
                        }, img.dataset.categorySlug);
                    };
                    
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

// Fonction pour initialiser les événements des sous-menus
initSubmenus = function() {
    try {
        const categoryItems = document.querySelectorAll('.has-submenu');
        if (!categoryItems.length) return;
        
        categoryItems.forEach(item => {
            try {
                const link = item.querySelector('> a');
                const submenu = item.querySelector('.submenu');
                const chevron = link ? link.querySelector('.menu-arrow') : null;
                
                if (!link || !submenu || !chevron) {
                    console.warn('Élément de menu manquant', { link: !!link, submenu: !!submenu, chevron: !!chevron });
                    return;
                }
                
                // Fermer tous les sous-menus au démarrage
                submenu.style.maxHeight = '0';
                
                const toggleSubmenu = (e) => {
                    try {
                        if (e) e.preventDefault();
                        
                        // Basculer le sous-menu actuel
                        if (submenu.style.maxHeight === '0px') {
                            submenu.style.maxHeight = submenu.scrollHeight + 'px';
                            chevron.classList.add('rotate-180');
                            
                            // Fermer les autres sous-menus
                            document.querySelectorAll('.has-submenu').forEach(otherItem => {
                                if (otherItem !== item) {
                                    const otherSubmenu = otherItem.querySelector('.submenu');
                                    const otherChevron = otherItem.querySelector('.menu-arrow');
                                    
                                    if (otherSubmenu) otherSubmenu.style.maxHeight = '0';
                                    if (otherChevron) otherChevron.classList.remove('rotate-180');
                                }
                            });
                        } else {
                            submenu.style.maxHeight = '0';
                            chevron.classList.remove('rotate-180');
                        }
                    } catch (error) {
                        console.error('Erreur dans toggleSubmenu:', error);
                    }
                };
                
                // Supprimer les écouteurs existants pour éviter les doublons
                link.removeEventListener('click', toggleSubmenu);
                link.addEventListener('click', toggleSubmenu);
                
            } catch (error) {
                console.error('Erreur lors de l\'initialisation d\'un élément de menu:', error);
            }
        });
    } catch (error) {
        console.error('Erreur critique dans initSubmenus:', error);
    }
};

        // Exporter les fonctions globales
        window.topFalla.sidebar = {
            displayCategoriesInMenu: displayCategoriesInMenu,
            filterCategoriesInMenu: filterCategoriesInMenu,
            initLazyLoading: initLazyLoading,
            initSubmenus: initSubmenus,
            handleImageError: handleImageError
        };

        // Initialisation après le chargement du DOM
        document.addEventListener('DOMContentLoaded', function() {
            if (window.topFalla?.sidebar) {
                // Initialiser le menu des catégories
                window.topFalla.sidebar.displayCategoriesInMenu();
            }
        });
    })();
}

