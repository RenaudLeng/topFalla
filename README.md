# TopFalla - Comparateur de prix Gabonais

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-brightgreen)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey)](https://expressjs.com/)
[![Sequelize](https://img.shields.io/badge/Sequelize-6.x-blue)](https://sequelize.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](https://www.mysql.com/)

TopFalla est une application web progressive (PWA) qui permet aux utilisateurs de comparer les prix des produits au Gabon. Inspirée de Kelkoo mais adaptée au contexte local, cette application est conçue pour fonctionner même avec une connexion internet limitée.

## 🌟 Fonctionnalités

- 🔍 Recherche avancée de produits par nom, catégorie, marque ou magasin
- 📱 Interface responsive optimisée pour mobile et desktop
- 📊 Comparaison des prix entre différents marchands
- 📍 Filtrage par catégorie, prix, disponibilité et plus
- ⭐ Système d'évaluation et d'avis des produits
- 📱 Installation sur l'écran d'accueil (PWA)
- ⚡ Fonctionnement hors ligne
- 📊 Historique des prix avec graphiques
- 🔔 Alertes de prix
- 👥 Tableau de bord administrateur

## 🚀 Architecture Technique

### Backend (Node.js + Express)
- **API RESTful** avec Express.js
- **Authentification** JWT
- **Validation** des données d'entrée
- **Gestion des erreurs** centralisée
- **Limitation du taux de requêtes**
- **Sécurité** renforcée (helmet, xss-clean)
- **Documentation** avec Swagger/OpenAPI

### Base de Données (MySQL + Sequelize ORM)
- **Modèles principaux** : Produits, Catégories, Marchands, Offres
- **Historique des prix** pour le suivi des évolutions
- **Attributs dynamiques** pour les spécifications produits
- **Gestion des médias** (images des produits)
- **Indexation** optimisée pour les recherches
- **Migrations** et seeds pour la gestion des versions

### Frontend (PWA)
- **Application Web Progressive** (PWA)
- **Interface utilisateur** avec Bootstrap 5
- **Gestion d'état** côté client
- **Stockage local** pour le mode hors ligne
- **Graphiques** avec Chart.js
- **Optimisation des performances**

## 🛠️ Stack Technologique

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **ORM**: Sequelize
- **Base de données**: MySQL 8.0+
- **Authentification**: JWT
- **Documentation**: Swagger/OpenAPI
- **Tests**: Jest, Supertest

### Frontend
- **HTML5**, **CSS3**, **JavaScript** (ES6+)
- **Bootstrap 5** et **Bootstrap Icons**
- **Workbox** pour le service worker
- **Chart.js** pour les graphiques
- **IndexedDB** pour le stockage hors ligne

### Outils de Développement
- **ESLint** et **Prettier** pour le formatage
- **Nodemon** pour le rechargement automatique
- **Husky** pour les hooks Git
- **Git** pour le contrôle de version

## 🚀 Installation et Configuration

### Prérequis

- Node.js 18 ou supérieur
- MySQL 8.0 ou supérieur
- npm 9.x ou supérieur

### Configuration initiale

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/votre-utilisateur/topfalla.git
   cd topfalla
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer la base de données**
   - Créer une base de données MySQL
   - Copier le fichier `.env.example` vers `.env`
   - Mettre à jour les variables d'environnement dans `.env`

4. **Exécuter les migrations**
   ```bash
   npx sequelize-cli db:migrate
   ```

5. **Lancer le serveur de développement**
   ```bash
   # Mode développement (avec rechargement automatique)
   npm run dev

   # Ou en production
   npm start
   ```

6. **Accéder à l'application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3000/api
   - Documentation API: http://localhost:3000/api-docs

### Commandes utiles

```bash
# Lancer les migrations
npm run migrate

# Annuler la dernière migration
npm run migrate:undo

# Exécuter les seeds
npm run seed

# Lancer les tests
npm test

# Formater le code
npm run format

# Vérifier le style de code
npm run lint
```

## 🔧 Configuration avancée

### Variables d'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_NAME=topfalla_development
DB_USER=root
DB_PASS=

# Serveur
NODE_ENV=development
PORT=3000
HOST=localhost

# JWT
JWT_SECRET=votre_cle_secrete
JWT_EXPIRES_IN=30d
JWT_COOKIE_EXPIRES=30

# Sécurité
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

### Structure des dossiers

```
topfalla/
├── config/               # Fichiers de configuration
├── migrations/           # Migrations de la base de données
├── models/               # Modèles Sequelize
│   ├── index.js          # Point d'entrée des modèles
│   ├── Category.js       # Modèle des catégories
│   ├── Merchant.js       # Modèle des marchands
│   ├── Offer.js          # Modèle des offres
│   ├── OfferHistory.js   # Historique des prix
│   ├── Product.js        # Modèle des produits
│   └── ProductImage.js   # Images des produits
├── public/               # Fichiers statiques du frontend
├── routes/               # Routes de l'API
├── seeders/              # Données de test
├── .env                  # Variables d'environnement
├── .sequelizerc          # Configuration de Sequelize CLI
├── package.json          # Dépendances et scripts
└── server.js             # Point d'entrée du serveur
```

## 📚 Documentation API

La documentation complète de l'API est disponible à l'adresse `/api-docs` après le démarrage du serveur. Elle est générée automatiquement à partir des commentaires JSDoc du code.

## 🧪 Tests

Pour exécuter les tests :

```bash
npm test
```

Les tests couvrent :
- Les modèles de données
- Les contrôleurs d'API
- Les middlewares d'authentification
- Les validations

## 🚀 Déploiement

### Préparation pour la production

1. Mettre à jour les variables d'environnement pour la production
2. Exécuter les migrations en production :
   ```bash
   NODE_ENV=production npx sequelize-cli db:migrate
   ```
3. Construire les assets frontend :
   ```bash
   npm run build
   ```

### Options de déploiement

- **PM2** (Recommandé pour la production) :
  ```bash
  npm install -g pm2
  pm2 start server.js --name "topfalla"
  pm2 save
  pm2 startup
  ```

- **Docker** :
  ```bash
  docker-compose up -d
  ```

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment contribuer :

1. Forkez le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Poussez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- [Kelkoo](https://www.kelkoo.fr/) pour l'inspiration
- Tous les contributeurs qui ont participé à ce projet

1. **Configuration de Supabase**
   - Créez un compte sur [Supabase](https://supabase.com/)
   - Créez un nouveau projet
   - Copiez vos clés d'API et l'URL dans un fichier `.env`

2. **Variables d'environnement**
   Créez un fichier `.env` à la racine du projet :
   ```
   VITE_SUPABASE_URL=votre_url_supabase
   VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
   ```

## 📦 Déploiement

### Sur Netlify (recommandé)

1. Poussez votre code sur GitHub/GitLab/Bitbucket
2. Connectez-vous à [Netlify](https://www.netlify.com/)
3. Sélectionnez "New site from Git"
4. Choisissez votre dépôt
5. Configurez les paramètres de build :
   - Build command: `npm run build`
   - Publish directory: `public`
6. Cliquez sur "Deploy site"

### Sur Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvotre-utilisateur%2Ftopfalla&project-name=topfalla&repository-name=topfalla)

## 📱 Installation comme application

1. Ouvrez l'application dans Chrome ou Edge sur Android, ou Safari sur iOS
2. Appuyez sur "Ajouter à l'écran d'accueil"
3. Suivez les instructions pour installer l'application

## 📊 Structure du projet

```
topfalla/
├── public/                  # Fichiers statiques
│   ├── css/                 # Feuilles de style
│   ├── js/                  # Fichiers JavaScript
│   ├── img/                 # Images et icônes
│   ├── index.html           # Page d'accueil
│   ├── search.html          # Page de recherche
│   ├── offline.html         # Page hors ligne
│   └── manifest.json        # Configuration PWA
├── src/                     # Code source
│   ├── js/                  # Modules JavaScript
│   └── scss/                # Fichiers SCSS (optionnel)
├── .gitignore               # Fichiers ignorés par Git
├── package.json             # Dépendances et scripts
└── README.md                # Ce fichier
```

## 🤝 Contribuer

Les contributions sont les bienvenues ! Voici comment contribuer :

1. Forkez le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/ma-fonctionnalite`)
3. Committez vos changements (`git commit -am 'Ajouter une fonctionnalité'`)
4. Poussez vers la branche (`git push origin feature/ma-fonctionnalite`)
5. Créez une Pull Request

## 📝 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- [Bootstrap](https://getbootstrap.com/) pour le framework CSS
- [Supabase](https://supabase.com/) pour la base de données
- [Netlify](https://www.netlify.com/) pour l'hébergement
- [Chart.js](https://www.chartjs.org/) pour les graphiques

---

Développé avec ❤️ pour le Gabon par ML.Inc
