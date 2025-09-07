const crypto = require('crypto');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const bcrypt = require('bcryptjs');
const { User, PasswordResetToken, EmailVerificationToken } = require('../models');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

// Fonction pour générer un token JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Fonction pour créer et envoyer un token JWT via un cookie
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user.id);
  
  // Options du cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    sameSite: 'lax'
  };

  // Envoyer le cookie
  res.cookie('jwt', token, cookieOptions);

  // Ne pas envoyer le mot de passe dans la réponse
  user.password = undefined;
  user.passwordChangedAt = undefined;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.active = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

class AuthController {
  // Inscription d'un nouvel utilisateur
  signup = async (req, res, next) => {
    try {
      // Créer un nouvel utilisateur
      const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role || 'user'
      });

      // Générer un token de vérification d'email
      const verificationToken = newUser.createEmailVerificationToken();
      await newUser.save({ validateBeforeSave: false });

      // Envoyer l'email de vérification
      try {
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email/${verificationToken}`;
        
        await new Email(newUser, verificationUrl).sendWelcome();
        
        // Créer et envoyer le token JWT
        createSendToken(newUser, 201, req, res);
      } catch (err) {
        // En cas d'erreur lors de l'envoi de l'email, supprimer l'utilisateur créé
        await newUser.destroy();
        
        return next(
          new AppError(
            'Il y a eu une erreur lors de l\'envoi de l\'email de vérification. Veuillez réessayer plus tard.',
            500
          )
        );
      }
    } catch (error) {
      // Gérer les erreurs de validation de Sequelize
      if (error.name === 'SequelizeUniqueConstraintError') {
        return next(new AppError('Cette adresse email est déjà utilisée', 400));
      }
      next(error);
    }
  };

  // Connexion d'un utilisateur
  login = async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // 1) Vérifier si l'email et le mot de passe existent
      if (!email || !password) {
        return next(new AppError('Veuillez fournir un email et un mot de passe', 400));
      }

      // 2) Vérifier si l'utilisateur existe et si le mot de passe est correct
      const user = await User.findOne({
        where: { email },
        attributes: { include: ['password'] } // Inclure le mot de passe pour la vérification
      });

      if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Email ou mot de passe incorrect', 401));
      }

      // 3) Vérifier si le compte est vérifié
      if (!user.isVerified) {
        return next(new AppError('Veuvez vérifier votre adresse email avant de vous connecter', 401));
      }

      // 4) Si tout est bon, envoyer le token au client
      createSendToken(user, 200, req, res);
    } catch (error) {
      next(error);
    }
  };

  // Déconnexion d'un utilisateur
  logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });
    
    res.status(200).json({ status: 'success' });
  };

  // Protection des routes - Vérifier si l'utilisateur est connecté
  protect = async (req, res, next) => {
    try {
      let token;
      
      // 1) Récupérer le token et vérifier s'il existe
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

      // ACCÈS AUTORISÉ
      req.user = currentUser;
      res.locals.user = currentUser;
      next();
    } catch (error) {
      next(error);
    }
  };

  // Restriction d'accès en fonction des rôles
  restrictTo = (...roles) => {
    return (req, res, next) => {
      // roles est un tableau ['admin', 'moderator']
      if (!roles.includes(req.user.role)) {
        return next(
          new AppError('Vous n\'avez pas la permission d\'effectuer cette action', 403)
        );
      }

      next();
    };
  };

  // Mot de passe oublié - Étape 1: Générer un token de réinitialisation
  forgotPassword = async (req, res, next) => {
    try {
      // 1) Récupérer l'utilisateur basé sur l'email
      const user = await User.findOne({ where: { email: req.body.email } });
      
      if (!user) {
        return next(new AppError('Il n\'y a pas d\'utilisateur avec cette adresse email.', 404));
      }

      // 2) Générer un token de réinitialisation aléatoire
      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      try {
        // 3) Envoyer l'email avec le token
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password/${resetToken}`;
        
        await new Email(user, resetURL).sendPasswordReset();

        res.status(200).json({
          status: 'success',
          message: 'Un email avec les instructions de réinitialisation a été envoyé.'
        });
      } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
          new AppError('Il y a eu une erreur lors de l\'envoi de l\'email. Veuillez réessayer plus tard!', 500)
        );
      }
    } catch (error) {
      next(error);
    }
  };

  // Réinitialisation du mot de passe - Étape 2: Mettre à jour le mot de passe
  resetPassword = async (req, res, next) => {
    try {
      // 1) Récupérer l'utilisateur basé sur le token
      const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

      const user = await User.findOne({
        where: {
          passwordResetToken: hashedToken,
          passwordResetExpires: { [Op.gt]: Date.now() }
        }
      });

      // 2) Si le token n'a pas expiré et qu'il y a un utilisateur, définir le nouveau mot de passe
      if (!user) {
        return next(new AppError('Le token est invalide ou a expiré', 400));
      }

      // 3) Mettre à jour le mot de passe
      user.password = req.body.password;
      user.passwordConfirm = req.body.passwordConfirm;
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();

      // 4) Connecter l'utilisateur, envoyer le JWT
      createSendToken(user, 200, req, res);
    } catch (error) {
      next(error);
    }
  };

  // Mise à jour du mot de passe pour un utilisateur connecté
  updatePassword = async (req, res, next) => {
    try {
      // 1) Récupérer l'utilisateur depuis la collection
      const user = await User.findByPk(req.user.id, {
        attributes: { include: ['password'] } // Inclure le mot de passe pour la vérification
      });

      // 2) Vérifier si le mot de passe actuel est correct
      if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
        return next(new AppError('Votre mot de passe actuel est incorrect.', 401));
      }

      // 3) Si c'est le cas, mettre à jour le mot de passe
      user.password = req.body.newPassword;
      user.passwordConfirm = req.body.newPasswordConfirm;
      await user.save();

      // 4) Connecter l'utilisateur, envoyer le JWT
      createSendToken(user, 200, req, res);
    } catch (error) {
      next(error);
    }
  };

  // Vérification de l'email
  verifyEmail = async (req, res, next) => {
    try {
      // 1) Trouver l'utilisateur avec le token de vérification
      const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

      const verificationToken = await EmailVerificationToken.findOne({
        where: {
          token: hashedToken,
          expires: { [Op.gt]: Date.now() }
        },
        include: [User]
      });

      // 2) Si le token est valide, marquer l'email comme vérifié
      if (!verificationToken) {
        return next(new AppError('Le lien de vérification est invalide ou a expiré', 400));
      }

      const user = verificationToken.user;
      user.isVerified = true;
      await user.save();

      // 3) Supprimer le token de vérification
      await verificationToken.destroy();

      // 4) Connecter l'utilisateur
      createSendToken(user, 200, req, res);
    } catch (error) {
      next(error);
    }
  };

  // Renvoyer l'email de vérification
  resendVerificationEmail = async (req, res, next) => {
    try {
      const { email } = req.body;

      // 1) Vérifier si l'email est fourni
      if (!email) {
        return next(new AppError('Veuillez fournir une adresse email', 400));
      }

      // 2) Vérifier si l'utilisateur existe
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        return next(new AppError('Aucun utilisateur trouvé avec cette adresse email', 404));
      }

      // 3) Vérifier si l'email est déjà vérifié
      if (user.isVerified) {
        return next(new AppError('Cette adresse email est déjà vérifiée', 400));
      }

      // 4) Générer un nouveau token de vérification
      const verificationToken = user.createEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      try {
        // 5) Envoyer l'email de vérification
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email/${verificationToken}`;
        
        await new Email(user, verificationUrl).sendEmailVerification();

        res.status(200).json({
          status: 'success',
          message: 'Un nouvel email de vérification a été envoyé.'
        });
      } catch (err) {
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
          new AppError('Il y a eu une erreur lors de l\'envoi de l\'email. Veuillez réessayer plus tard!', 500)
        );
      }
    } catch (error) {
      next(error);
    }
  };

  // Vérifier si l'utilisateur est connecté (pour le rendu côté client)
  isLoggedIn = async (req, res, next) => {
    try {
      if (req.cookies.jwt) {
        // 1) Vérifier le token
        const decoded = await promisify(jwt.verify) (
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

        // IL Y A UN UTILISATEUR CONNECTÉ
        res.locals.user = currentUser;
        return res.status(200).json({
          status: 'success',
          data: {
            user: currentUser
          }
        });
      }
      
      // PAS D'UTILISATEUR CONNECTÉ
      return res.status(200).json({
        status: 'success',
        data: {
          user: null
        }
      });
    } catch (err) {
      return res.status(200).json({
        status: 'success',
        data: {
          user: null
        }
      });
    }
  };

  // Mettre à jour les détails de l'utilisateur (nom, email, etc.)
  updateMe = async (req, res, next) => {
    try {
      // 1) Créer une erreur si l'utilisateur essaie de mettre à jour le mot de passe
      if (req.body.password || req.body.passwordConfirm) {
        return next(
          new AppError(
            'Cette route n\'est pas pour les mises à jour de mot de passe. Veuillez utiliser /update-password.',
            400
          )
        );
      }

      // 2) Filtrer les champs non autorisés
      const filteredBody = {};
      const allowedFields = ['name', 'email', 'phone', 'address', 'city', 'country', 'postalCode', 'photo'];
      
      Object.keys(req.body).forEach(el => {
        if (allowedFields.includes(el)) {
          filteredBody[el] = req.body[el];
        }
      });

      // 3) Mettre à jour le document utilisateur
      const updatedUser = await User.update(filteredBody, {
        where: { id: req.user.id },
        returning: true,
        individualHooks: true
      });

      res.status(200).json({
        status: 'success',
        data: {
          user: updatedUser[1][0]
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Désactiver un compte utilisateur (soft delete)
  deleteMe = async (req, res, next) => {
    try {
      await User.update(
        { active: false },
        { where: { id: req.user.id } }
      );

      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new AuthController();
