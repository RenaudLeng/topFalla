const rateLimit = require('express-rate-limit');
const httpStatus = require('http-status');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');

/**
 * Limiteur de débit pour les requêtes d'authentification
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limite chaque IP à 20 requêtes par fenêtre
  skipSuccessfulRequests: true, // Ne pas compter les requêtes réussies
  handler: (req, res, next) => {
    next(
      new ApiError(
        httpStatus.TOO_MANY_REQUESTS,
        'Trop de tentatives de connexion. Veuillez réessayer plus tard.'
      )
    );
  },
});

/**
 * Limiteur de débit pour les requêtes API
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes par fenêtre
  standardHeaders: true, // Renvoie les informations de limite de débit dans les en-têtes `RateLimit-*`
  legacyHeaders: false, // Désactive les en-têtes `X-RateLimit-*`
  handler: (req, res, next) => {
    next(
      new ApiError(
        httpStatus.TOO_MANY_REQUESTS,
        'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.'
      )
    );
  },
});

/**
 * Middleware pour limiter le débit en fonction de l'environnement
 */
const rateLimiter = (req, res, next) => {
  // Désactiver le rate limiting en développement pour faciliter les tests
  if (config.env === 'development') {
    return next();
  }
  
  // Appliquer le rate limiting approprié en fonction du chemin
  if (req.path.startsWith(`/${config.api.prefix}/auth`)) {
    return authLimiter(req, res, next);
  }
  
  return apiLimiter(req, res, next);
};

module.exports = {
  authLimiter,
  apiLimiter,
  rateLimiter,
};
