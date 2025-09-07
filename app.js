// Charger les variables d'environnement en premier
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const httpStatus = require('http-status');
const config = require('./config/config');
const { logger, morgan } = require('./utils/logger');
const ApiError = require('./utils/ApiError');
const { errorConverter, errorHandler } = require('./middlewares/error');
const { authLimiter } = require('./middlewares/rateLimiter');
const { databaseMiddleware, sequelize } = require('./config/db');
const cronJobs = require('./utils/cronJobs');

// Initialiser l'application Express
const app = express();

// Configuration des middlewares de sécurité
app.use(helmet());
app.use(xss());
app.use(mongoSanitize());
app.use(hpp());

// Parser le corps des requêtes
app.use(express.json({ limit: config.upload.limit }));
app.use(express.urlencoded({ extended: true, limit: config.upload.limit }));
app.use(cookieParser(config.jwt.secret));

// Compression des réponses
app.use(compression());

// Configuration CORS
const corsOptions = {
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Total-Count']
};
app.use(cors(corsOptions));

// Logger des requêtes HTTP
const { httpLogger } = require('./utils/logger');
app.use(httpLogger);

// Limiter le taux de requêtes pour les routes d'authentification
app.use(`${config.api.prefix}/auth`, authLimiter);

// Ajouter la connexion à la base de données à la requête
app.use(databaseMiddleware);

// Routes de l'API
app.use(`${config.api.prefix}`, require('./routes'));

// Route de santé
app.get('/health', (req, res) => {
  res.status(httpStatus.OK).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Gestion des routes non trouvées
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Route non trouvée'));
});

// Convertisseur d'erreur
app.use(errorConverter);

// Gestionnaire d'erreurs
app.use(errorHandler);

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Rejet non géré à la promesse:', promise, 'Raison:', reason);
  // Vous pourriez choisir de redémarrer le serveur ici
});

process.on('uncaughtException', (error) => {
  logger.error('Exception non capturée:', error);
  // Vous pourriez choisir de redémarrer le serveur ici
  process.exit(1);
});

// Fonction pour démarrer le serveur
const startServer = async () => {
  try {
    // Tester la connexion à la base de données
    await sequelize.authenticate();
    logger.info('✅ Connexion à la base de données établie avec succès');

    // Synchroniser les modèles avec la base de données (sans forcer en production)
    if (config.env !== 'production') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Modèles synchronisés avec la base de données');
    }

    // Démarrer les tâches planifiées
    if (config.env !== 'test') {
      cronJobs.init();
    }

    // Démarrer le serveur
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Serveur démarré sur le port ${config.port} en mode ${config.env}`);
    });

    // Gestion de la fermeture gracieuse
    const gracefulShutdown = async () => {
      logger.info('🚦 Arrêt gracieux du serveur en cours...');
      
      // Arrêter les tâches planifiées
      cronJobs.stopAll();
      
      // Fermer le serveur
      server.close(async () => {
        logger.info('🛑 Serveur arrêté');
        
        // Fermer la connexion à la base de données
        await sequelize.close();
        logger.info('🔌 Connexion à la base de données fermée');
        
        process.exit(0);
      });
      
      // Forcer la fermeture après un délai
      setTimeout(() => {
        logger.error('Forçage de la fermeture...');
        process.exit(1);
      }, 10000);
    };

    // Gestion des signaux d'arrêt
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    return server;
  } catch (error) {
    logger.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Exporter l'application et la fonction de démarrage
module.exports = {
  app,
  startServer,
};

// Démarrer le serveur si ce fichier est exécuté directement
if (require.main === module) {
  startServer();
}
