const AppError = require('../utils/appError');

// Gestion des erreurs de développement (avec stack trace)
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// Gestion des erreurs en production (sans stack trace)
const sendErrorProd = (err, res) => {
  // Erreurs opérationnelles, de confiance : on envoie le message au client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // Erreurs de programmation ou inconnues : ne pas divulguer les détails
    console.error('ERREUR 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Quelque chose a mal tourné !'
    });
  }
};

// Gestion des erreurs de validation de Sequelize
const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Données d'entrée non valides. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Gestion des champs en double dans la base de données
const handleDuplicateFieldsDB = err => {
  const value = err.errors[0].message.match(/(['"])(\\?.)*?\1/)[0];
  const message = `La valeur en double : ${value}. Veuillez utiliser une autre valeur !`;
  return new AppError(message, 400);
};

// Gestion des erreurs JWT
const handleJWTError = () =>
  new AppError('Jeton invalide. Veuillez vous reconnecter !', 401);

const handleJWTExpiredError = () =>
  new AppError('Votre jeton a expiré ! Veuillez vous reconnecter.', 401);

// Middleware de gestion des erreurs globales
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeValidationError') {
      error = handleValidationErrorDB(error);
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      error = handleDuplicateFieldsDB(error);
    }
    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    sendErrorProd(error, res);
  }
};

module.exports = { globalErrorHandler };
