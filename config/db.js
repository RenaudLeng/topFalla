const { Sequelize } = require('sequelize');
const { logger } = require('../utils/logger');
const config = require('./config');

// Configuration de la connexion à la base de données
const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    logging: config.env === 'development' ? (msg) => logger.sql(msg) : false,
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true,
      defaultScope: {
        attributes: {
          exclude: ['deleted_at']
        }
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    timezone: '+01:00' // Fuseau horaire du Cameroun
  }
);

// Fonction pour tester la connexion à la base de données
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Connexion à la base de données établie avec succès');
    return true;
  } catch (error) {
    logger.error('❌ Impossible de se connecter à la base de données:', error);
    return false;
  }
};

// Synchronisation des modèles avec la base de données
const syncDatabase = async (force = false) => {
  try {
    if (force) {
      logger.warn('⚠️  Forçage de la synchronisation de la base de données');
    }
    
    await sequelize.sync({ force });
    logger.info('✅ Base de données synchronisée avec succès');
    return true;
  } catch (error) {
    logger.error('❌ Erreur lors de la synchronisation de la base de données:', error);
    return false;
  }
};

// Middleware pour ajouter la connexion à la requête
const databaseMiddleware = (req, res, next) => {
  req.db = sequelize;
  next();
};

// Gestion des erreurs de connexion
sequelize.addHook('afterConnect', (connection) => {
  logger.debug('Nouvelle connexion à la base de données établie');
  return Promise.resolve();
});

// Gestion des erreurs globales
process.on('unhandledRejection', (error) => {
  if (error.name === 'SequelizeDatabaseError' || error.name === 'SequelizeConnectionError') {
    logger.error('Erreur de base de données:', error);
    
    // Tentative de reconnexion en cas d'erreur de connexion
    if (error.original && error.original.code === 'PROTOCOL_CONNECTION_LOST') {
      logger.warn('Connexion à la base de données perdue. Tentative de reconnexion...');
      testConnection();
    }
  }
});

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  databaseMiddleware
};
