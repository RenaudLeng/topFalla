const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;

const logDir = 'logs';

// Créer le répertoire de logs s'il n'existe pas
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Format personnalisé pour la sortie console
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  const logMessage = `${timestamp} [${level}]: ${stack || message}`;
  return logMessage;
});

// Format pour les fichiers de log
const fileFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}${metaString}`;
});

// Niveaux de log personnalisés
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  sql: 5
};

// Couleurs pour chaque niveau de log
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  sql: 'cyan'
};

winston.addColors(colors);

// Filtre pour les requêtes SQL
const sqlFilter = format((info, opts) => {
  return info.level === 'sql' ? info : false;
});

// Filtre pour les logs qui ne sont pas des requêtes SQL
const notSqlFilter = format((info, opts) => {
  return info.level !== 'sql' ? info : false;
});

// Configuration principale du logger
const logger = createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'topfalla-api' },
  transports: [
    // Fichier de logs d'erreurs
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: combine(notSqlFilter(), fileFormat)
    }),
    
    // Fichier de logs d'activité
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: combine(notSqlFilter(), fileFormat)
    }),
    
    // Fichier de logs SQL
    new transports.File({
      filename: path.join(logDir, 'sql.log'),
      level: 'sql',
      format: combine(sqlFilter(), fileFormat)
    })
  ],
  exitOnError: false
});

// Si on n'est pas en production, on ajoute aussi la sortie console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'HH:mm:ss' }),
      consoleFormat
    ),
    level: 'debug'
  }));
}

// Middleware pour Express
const httpLogger = (req, res, next) => {
  // Ignorer les requêtes pour les fichiers statiques
  if (req.originalUrl.includes('.')) {
    return next();
  }

  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMeta = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      // Ne pas logger les mots de passe ou données sensibles
      body: req.body && req.body.password ? { ...req.body, password: '***' } : req.body,
      query: req.query,
      params: req.params
    };

    if (res.statusCode >= 400) {
      logger.error(`${req.method} ${req.originalUrl} - ${res.statusCode}`, logMeta);
    } else {
      logger.http(`${req.method} ${req.originalUrl} - ${res.statusCode}`, logMeta);
    }
  });

  next();
};

// Logger pour les requêtes SQL
const sqlLogger = (queryString, queryObject) => {
  if (queryString) {
    logger.log('sql', queryString, {
      type: 'sql',
      query: queryString,
      bind: queryObject?.bind,
      executionTime: queryObject?.time
    });
  }
};

module.exports = {
  logger,
  httpLogger,
  sqlLogger
};
