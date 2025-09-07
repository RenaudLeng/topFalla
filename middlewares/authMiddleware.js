const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const AppError = require('../utils/appError');

// Middleware pour protéger les routes et vérifier l'authentification
const protect = async (req, res, next) => {
  try {
    let token;
    
    // 1) Vérifier si le token est présent dans les en-têtes ou les cookies
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(
        new AppError('Vous n\'êtes pas connecté. Veuillez vous connecter pour accéder à cette ressource.', 401)
      );
    }

    // 2) Vérifier le token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Vérifier si l'utilisateur existe toujours
    const currentUser = await User.findByPk(decoded.id);
    if (!currentUser) {
      return next(
        new AppError('L\'utilisateur appartenant à ce token n\'existe plus.', 401)
      );
    }

    // 4) Vérifier si l'utilisateur a changé son mot de passe après l'émission du token
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError('L\'utilisateur a récemment changé son mot de passe. Veuillez vous reconnecter.', 401)
      );
    }

    // 5) Vérifier si le compte est vérifié
    if (!currentUser.isVerified) {
      return next(
        new AppError('Veuvez vérifier votre adresse email avant de continuer.', 401)
      );
    }

    // 6) Accès accordé, ajouter l'utilisateur à la requête
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware pour restreindre l'accès en fonction des rôles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Vérifier si l'utilisateur a le rôle requis
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Vous n\'avez pas la permission d\'effectuer cette action', 403)
      );
    }

    next();
  };
};

// Middleware pour vérifier si l'utilisateur est connecté (pour le rendu côté client)
const isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // 1) Vérifier le token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Vérifier si l'utilisateur existe toujours
      const currentUser = await User.findByPk(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Vérifier si l'utilisateur a changé son mot de passe après l'émission du token
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // Il y a un utilisateur connecté
      res.locals.user = currentUser;
      return next();
    }
    next();
  } catch (err) {
    return next();
  }
};

// Middleware pour vérifier la propriété (l'utilisateur est le propriétaire de la ressource)
const checkOwnership = (model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resource = await model.findByPk(req.params[paramName]);
      
      if (!resource) {
        return next(new AppError('Ressource non trouvée', 404));
      }
      
      // Vérifier si l'utilisateur est le propriétaire ou un administrateur
      if (resource.userId !== req.user.id && req.user.role !== 'admin') {
        return next(
          new AppError('Vous n\'êtes pas autorisé à effectuer cette action', 403)
        );
      }
      
      // Ajouter la ressource à la requête pour une utilisation ultérieure
      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware pour vérifier si l'utilisateur est un marchand
const isMerchant = (req, res, next) => {
  if (req.user.role !== 'merchant' && req.user.role !== 'admin') {
    return next(
      new AppError('Cette action est réservée aux marchands', 403)
    );
  }
  next();
};

// Middleware pour vérifier si l'utilisateur est un administrateur
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(
      new AppError('Cette action est réservée aux administrateurs', 403)
    );
  }
  next();
};

// Middleware pour vérifier si l'utilisateur est vérifié
const isVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return next(
      new AppError('Veuvez vérifier votre adresse email avant de continuer', 403)
    );
  }
  next();
};

module.exports = {
  protect,
  restrictTo,
  isLoggedIn,
  checkOwnership,
  isMerchant,
  isAdmin,
  isVerified
};
