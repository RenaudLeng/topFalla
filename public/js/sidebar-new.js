'use strict';

// Configuration des icônes pour les catégories (globale pour être accessible partout)
const categoryIcons = {
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

// Initialisation de l'objet global topFalla
window.topFalla = window.topFalla || {};

// Vérifier si le code est déjà exécuté
if (window.topFallaSidebarInitialized) {
    console.warn('Le menu latéral a déjà été initialisé');
} else {
    window.topFallaSidebarInitialized = true;

    // Déclaration des fonctions
    const handleImageError = function(img, categorySlug = '') {
        if (!img || !(img instanceof HTMLElement)) return;
        const defaultIcon = categoryIcons[categorySlug] || 'bi-grid';
        img.outerHTML = `<i class="bi ${defaultIcon} menu-icon"></i>`;
    };

    const openSidebar = async function() {
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        
        if (window.isSidebarOpen) return;
        
        if (sidebar) sidebar.style.display = 'block';
        if (sidebarOverlay) sidebarOverlay.style.display = 'block';
        
        await new Promise(resolve => {
            if (sidebar) void sidebar.offsetWidth;
            requestAnimationFrame(() => {
                if (sidebar) sidebar.classList.add('show');
                if (sidebarOverlay) sidebarOverlay.classList.add('show');
                resolve();
            });
        });
        
        document.body.style.overflow = 'hidden';
        window.isSidebarOpen = true;
        document.body.classList.add('sidebar-open');
        
        if (sidebar) {
            sidebar.classList.add('sidebar-enter');
            setTimeout(() => {
                sidebar.classList.remove('sidebar-enter');
                window.dispatchEvent(new CustomEvent('sidebarOpened'));
            }, 300);
        }
    };

    const closeSidebarMenu = async function() {
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        
        if (!window.isSidebarOpen || !sidebar || !sidebarOverlay) return;
        
        sidebar.classList.add('sidebar-exit');
        
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                sidebar.classList.remove('show');
                sidebarOverlay.classList.remove('show');
                resolve();
            });
        });
        
        setTimeout(() => {
            sidebar.style.display = 'none';
            sidebar.classList.remove('sidebar-exit');
            sidebarOverlay.style.display = 'none';
            document.body.style.overflow = '';
            window.isSidebarOpen = false;
            document.body.classList.remove('sidebar-open');
            window.dispatchEvent(new CustomEvent('sidebarClosed'));
        }, 300);
    };

    const displayCategoriesInMenu = async function(containerId = 'categoriesMenu') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Conteneur avec l'ID ${containerId} non trouvé`);
            return;
        }

        try {
            const categories = window.categories || [];
            
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
            
            const ul = document.createElement('ul');
            ul.className = 'nav flex-column';
            
            categories.forEach((category, index) => {
                const hasSubcategories = category.subcategories && category.subcategories.length > 0;
                const li = document.createElement('li');
                li.className = 'nav-item menu-item' + (hasSubcategories ? ' has-submenu' : '');
                li.style.setProperty('--delay', `${index * 0.05}s`);
                
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
            });
            
            container.innerHTML = `
                ${searchHtml}
                <div class="categories-list">
                    ${ul.outerHTML}
                </div>
            `;
            
            const searchInput = document.getElementById('categorySearch');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    filterCategoriesInMenu(e.target.value);
                });
            }
            
            initSubmenus();
            
            const menuItems = container.querySelectorAll('.menu-item');
            menuItems.forEach((item, index) => {
                item.style.animationDelay = `${index * 50}ms`;
                item.classList.add('enter');
                
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
    };

    const filterCategoriesInMenu = function(searchTerm) {
        const menuItems = document.querySelectorAll('.categories-list .nav-link');
        const categoriesList = document.querySelector('.categories-list');
        if (!categoriesList) return;
        
        let hasVisibleItems = false;
        
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
                
                if (searchTerm) {
                    const regex = new RegExp(`(${searchTerm})`, 'gi');
                    item.innerHTML = item.innerHTML.replace(regex, '<span class="bg-warning">$1</span>');
                }
                
                const submenu = parentLi.querySelector('.submenu');
                if (submenu) {
                    submenu.classList.add('show');
                }
            } else {
                const subItems = parentLi.querySelectorAll('.submenu .nav-link');
                let hasMatchingSubItem = false;
                
                subItems.forEach(subItem => {
                    const subText = subItem.textContent.toLowerCase();
                    if (subText.includes(searchTerm)) {
                        hasMatchingSubItem = true;
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
        
        if (searchTerm && !hasVisibleItems) {
            const noResults = document.createElement('div');
            noResults.className = 'alert alert-info m-3 no-results-message';
            noResults.innerHTML = `
                <i class="bi bi-info-circle me-2"></i>
                Aucun résultat trouvé pour "${searchTerm}"
            `;
            categoriesList.appendChild(noResults);
        }
    };

    const initLazyLoading = function() {
        const lazyImages = document.querySelectorAll('img.lazy-load');
        
        if (!('IntersectionObserver' in window)) {
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
                        img.src = img.dataset.src;
                        
                        img.onload = () => {
                            img.classList.add('loaded');
                            img.style.opacity = '1';
                        };
                        
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
    };

    const initSubmenus = function() {
        try {
            const categoryItems = document.querySelectorAll('.has-submenu');
            if (!categoryItems.length) return;
            
            const toggleSubmenu = function(e) {
                const link = e.currentTarget;
                const parent = link.parentElement;
                const submenu = parent.querySelector('.submenu');
                const chevron = link.querySelector('.menu-arrow');
                
                if (!submenu) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                const isOpening = !submenu.classList.contains('show');
                
                // Fermer tous les autres sous-menus
                document.querySelectorAll('.submenu.show').forEach(openSubmenu => {
                    if (openSubmenu !== submenu) {
                        openSubmenu.classList.remove('show');
                        const parentLi = openSubmenu.closest('li');
                        if (parentLi) {
                            parentLi.classList.remove('open');
                        }
                    }
                });
                
                // Basculer l'état du sous-menu actuel
                submenu.classList.toggle('show', isOpening);
                parent.classList.toggle('open', isOpening);
                
                if (chevron) {
                    chevron.className = isOpening ? 
                        'bi bi-chevron-up menu-arrow' : 
                        'bi bi-chevron-down menu-arrow';
                }
            };
            
            categoryItems.forEach(item => {
                try {
                    const link = item.querySelector('> a');
                    if (!link) return;
                    
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
        displayCategoriesInMenu,
        filterCategoriesInMenu,
        initLazyLoading,
        initSubmenus,
        handleImageError,
        openSidebar,
        closeSidebarMenu
    };

    // Initialisation après le chargement du DOM
    document.addEventListener('DOMContentLoaded', function() {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const closeSidebar = document.getElementById('closeSidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        
        window.isSidebarOpen = false;
        
        // Initialisation
        if (sidebar) sidebar.style.display = 'none';
        if (sidebarOverlay) sidebarOverlay.style.display = 'none';
        
        // Gestionnaires d'événements
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                if (window.isSidebarOpen) {
                    window.topFalla.sidebar.closeSidebarMenu();
                } else {
                    window.topFalla.sidebar.openSidebar();
                }
            });
        }

        if (closeSidebar) {
            closeSidebar.addEventListener('click', window.topFalla.sidebar.closeSidebarMenu);
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', window.topFalla.sidebar.closeSidebarMenu);
        }

        // Gestion du clavier (Echap pour fermer)
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && window.isSidebarOpen) {
                window.topFalla.sidebar.closeSidebarMenu();
            }
        });

        // Initialiser le menu des catégories
        if (window.topFalla?.sidebar) {
            window.topFalla.sidebar.displayCategoriesInMenu();
        }
    });
}
