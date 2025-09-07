const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

// Charger les variables d'environnement depuis le fichier .env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Nettoyer et forcer NODE_ENV
process.env.NODE_ENV = process.env.NODE_ENV ? process.env.NODE_ENV.trim() : 'development';
if (!['production', 'development', 'test'].includes(process.env.NODE_ENV)) {
  console.warn(`NODE_ENV=${process.env.NODE_ENV} n'est pas valide, utilisation de 'development' par défaut`);
  process.env.NODE_ENV = 'development';
}

// Définir le schéma de validation pour les variables d'environnement
const envVarsSchema = Joi.object()
  .keys({
    // Environnement
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    
    // Base de données
    DB_HOST: Joi.string().required().description('Hôte de la base de données'),
    DB_PORT: Joi.number().default(3306),
    DB_USER: Joi.string().required().description('Utilisateur de la base de données'),
    DB_PASSWORD: Joi.string().required().description('Mot de passe de la base de données'),
    DB_NAME: Joi.string().required().description('Nom de la base de données'),
    
    // JWT
    JWT_SECRET: Joi.string().required().description('Clé secrète JWT'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('Durée d\'expiration du token JWT en minutes'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('Durée d\'expiration du refresh token en jours'),
    
    // Email
    SMTP_HOST: Joi.string().description('Serveur SMTP'),
    SMTP_PORT: Joi.number().description('Port SMTP'),
    SMTP_USERNAME: Joi.string().description('Nom d\'utilisateur SMTP'),
    SMTP_PASSWORD: Joi.string().description('Mot de passe SMTP'),
    EMAIL_FROM: Joi.string().description('Email expéditeur'),
    
    // Upload
    UPLOAD_LIMIT: Joi.string().default('10mb'),
    
    // CORS
    FRONTEND_URL: Joi.string().required().description('URL du frontend'),
    
    // Redis (pour le cache et les sessions)
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string(),
    
    // AWS S3 (pour le stockage de fichiers)
    AWS_ACCESS_KEY_ID: Joi.string(),
    AWS_SECRET_ACCESS_KEY: Joi.string(),
    AWS_REGION: Joi.string(),
    AWS_BUCKET_NAME: Joi.string(),
    
    // Google OAuth
    GOOGLE_CLIENT_ID: Joi.string(),
    GOOGLE_CLIENT_SECRET: Joi.string(),
    
    // Facebook OAuth
    FACEBOOK_APP_ID: Joi.string(),
    FACEBOOK_APP_SECRET: Joi.string(),
    
    // Stripe
    STRIPE_SECRET_KEY: Joi.string(),
    STRIPE_WEBHOOK_SECRET: Joi.string(),
    
    // Sentry
    SENTRY_DSN: Joi.string(),
    
    // Autres
    API_PREFIX: Joi.string().default('api'),
    API_VERSION: Joi.string().default('v1'),
    
  })
  .unknown();

// Afficher les variables d'environnement pour le débogage
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Toutes les variables d\'environnement:', process.env);

// Valider les variables d'environnement
const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env, { abortEarly: false });

if (error) {
  console.error('Erreurs de validation des variables d\'environnement:', error.details);
  throw new Error(`Erreur de configuration: ${error.message}`);
}

// Configuration de l'application
const config = {
  // Environnement
  env: envVars.NODE_ENV,
  isProduction: envVars.NODE_ENV === 'production',
  isDevelopment: envVars.NODE_ENV === 'development',
  isTest: envVars.NODE_ENV === 'test',
  
  // Serveur
  port: envVars.PORT,
  api: {
    prefix: `/${envVars.API_PREFIX}/${envVars.API_VERSION}`,
    version: envVars.API_VERSION
  },
  
  // Base de données
  db: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    name: envVars.DB_NAME,
    dialect: 'mysql',
    logging: envVars.NODE_ENV === 'development' ? console.log : false,
  },
  
  // JWT
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    cookieOptions: {
      httpOnly: true,
      secure: envVars.NODE_ENV === 'production',
      signed: true,
      maxAge: envVars.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000, // en millisecondes
    },
  },
  
  // Email
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  
  // Upload
  upload: {
    limit: envVars.UPLOAD_LIMIT,
    dest: 'uploads/',
  },
  
  // CORS
  cors: {
    origin: envVars.FRONTEND_URL,
    credentials: true,
  },
  
  // Redis
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
  },
  
  // AWS S3
  aws: {
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    region: envVars.AWS_REGION,
    s3Bucket: envVars.AWS_BUCKET_NAME,
  },
  
  // OAuth
  oauth: {
    google: {
      clientId: envVars.GOOGLE_CLIENT_ID,
      clientSecret: envVars.GOOGLE_CLIENT_SECRET,
      callbackURL: `${envVars.FRONTEND_URL}/auth/google/callback`,
    },
    facebook: {
      clientId: envVars.FACEBOOK_APP_ID,
      clientSecret: envVars.FACEBOOK_APP_SECRET,
      callbackURL: `${envVars.FRONTEND_URL}/auth/facebook/callback`,
      profileFields: ['id', 'emails', 'name'],
    },
  },
  
  // Paiement
  stripe: {
    secretKey: envVars.STRIPE_SECRET_KEY,
    webhookSecret: envVars.STRIPE_WEBHOOK_SECRET,
  },
  
  // Monitoring
  sentry: {
    dsn: envVars.SENTRY_DSN,
  },
  
  // Autres configurations
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limite chaque IP à 100 requêtes par fenêtre
  },
  
  // Chemins
  paths: {
    uploads: path.join(__dirname, '../uploads'),
    logs: path.join(__dirname, '../logs'),
    temp: path.join(__dirname, '../temp'),
    backups: path.join(__dirname, '../backups'),
  },
};

// Exporter la configuration
module.exports = config;
