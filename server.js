require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const morgan = require('morgan');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

// Import des routes
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const merchantRoutes = require('./routes/merchantRoutes');
const offerRoutes = require('./routes/offerRoutes');
const authRoutes = require('./routes/authRoutes');

// Import des middlewares d'erreur
const { globalErrorHandler } = require('./middlewares/errorMiddleware');

// Initialisation de l'application Express
const app = express();

// 1) MIDDLEWARES GLOBAUX

// Sécurité des en-têtes HTTP
app.use(helmet());

// Journalisation des requêtes en mode développement
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limiter le nombre de requêtes par IP
const limiter = rateLimit({
  max: process.env.RATE_LIMIT_MAX || 100,
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  message: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer dans 15 minutes.'
});
app.use('/api', limiter);

// Body parser, lecture des données du corps en JSON avec une limite de 10kb
app.use(express.json({ limit: '10kb' }));

// Nettoyage des données contre l'injection NoSQL
app.use(mongoSanitize());

// Protection contre les attaques XSS
app.use(xss());

// Protection contre la pollution des paramètres HTTP
app.use(hpp({
  whitelist: [
    'price',
    'averageRating',
    'ratingsQuantity',
    'createdAt',
    'name',
    'category'
  ]
}));

// Configuration CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Servir les fichiers statiques du frontend en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
  });
}

// Configuration Swagger pour la documentation de l'API
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TopFalla API',
      version: '1.0.0',
      description: 'API pour le comparateur de prix TopFalla',
      contact: {
        name: 'Équipe TopFalla',
        email: 'contact@topfalla.ga'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000/api',
        description: 'Serveur de développement'
      },
      {
        url: 'https://api.topfalla.ga',
        description: 'Serveur de production'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js', './models/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// 2) ROUTES
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/offers', offerRoutes);
app.use('/api/v1/auth', authRoutes);

// Gestion des routes non trouvées
app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Impossible de trouver ${req.originalUrl} sur ce serveur.`
  });
});

// Middleware de gestion des erreurs globales
app.use(globalErrorHandler);

// 3) DÉMARRAGE DU SERVEUR
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Application en cours d'exécution en mode ${process.env.NODE_ENV} sur le port ${port}...`);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
  console.error('ERREUR NON GÉRÉE ! 💥 Arrêt...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM REÇU. Arrêt en douceur...');
  server.close(() => {
    console.log('💥 Processus terminé !');
  });
});

module.exports = app;
