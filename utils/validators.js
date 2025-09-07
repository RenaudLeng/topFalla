const Joi = require('joi');
const { Types } = require('sequelize');
const AppError = require('./appError');

// Schéma de validation pour l'inscription d'un utilisateur
const signupSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().label('Nom'),
  email: Joi.string().email().required().label('Email'),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,}'))
    .required()
    .label('Mot de passe')
    .messages({
      'string.pattern.base': 'Le mot de passe doit contenir au moins 8 caractères, dont une majuscule, une minuscule, un chiffre et un caractère spécial',
    }),
  passwordConfirm: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .label('Confirmation du mot de passe')
    .messages({
      'any.only': 'Les mots de passe ne correspondent pas',
    }),
  role: Joi.string().valid('user', 'merchant', 'admin').default('user'),
  phone: Joi.string().pattern(/^[0-9]{10}$/).allow('').label('Téléphone'),
  acceptTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'Vous devez accepter les conditions d\'utilisation',
  }),
});

// Schéma de validation pour la connexion d'un utilisateur
const loginSchema = Joi.object({
  email: Joi.string().email().required().label('Email'),
  password: Joi.string().required().label('Mot de passe'),
  rememberMe: Joi.boolean().default(false),
});

// Schéma de validation pour la réinitialisation du mot de passe
const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,}'))
    .required()
    .label('Nouveau mot de passe'),
  passwordConfirm: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .label('Confirmation du mot de passe')
    .messages({
      'any.only': 'Les mots de passe ne correspondent pas',
    }),
});

// Schéma de validation pour la mise à jour du profil utilisateur
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).label('Nom'),
  email: Joi.string().email().label('Email'),
  phone: Joi.string().pattern(/^[0-9]{10}$/).allow('').label('Téléphone'),
  address: Joi.string().allow('').label('Adresse'),
  city: Joi.string().allow('').label('Ville'),
  country: Joi.string().allow('').label('Pays'),
  postalCode: Joi.string().allow('').label('Code postal'),
  bio: Joi.string().allow('').max(500).label('Biographie'),
  website: Joi.string().uri().allow('').label('Site web'),
});

// Schéma de validation pour la création d'un produit
const createProductSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().label('Nom du produit'),
  description: Joi.string().required().label('Description'),
  price: Joi.number().min(0).required().label('Prix'),
  compareAtPrice: Joi.number().min(0).allow(null).label('Prix de comparaison'),
  costPerItem: Joi.number().min(0).allow(null).label('Coût par article'),
  sku: Joi.string().allow('').label('SKU'),
  barcode: Joi.string().allow('').label('Code-barres'),
  quantity: Joi.number().integer().min(0).default(0).label('Quantité'),
  weight: Joi.number().min(0).allow(null).label('Poids'),
  weightUnit: Joi.string().valid('g', 'kg', 'lb', 'oz').default('g'),
  categoryId: Joi.string().required().label('Catégorie'),
  brand: Joi.string().allow('').label('Marque'),
  status: Joi.string().valid('active', 'draft', 'archived').default('draft'),
  isFeatured: Joi.boolean().default(false),
  requiresShipping: Joi.boolean().default(true),
  isGiftCard: Joi.boolean().default(false),
  seoTitle: Joi.string().allow('').label('Titre SEO'),
  seoDescription: Joi.string().allow('').label('Description SEO'),
  tags: Joi.array().items(Joi.string()).default([]),
  options: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      values: Joi.array().items(Joi.string()).min(1).required(),
    })
  ),
  variants: Joi.array().items(
    Joi.object({
      option1: Joi.string().allow(null),
      option2: Joi.string().allow(null),
      option3: Joi.string().allow(null),
      price: Joi.number().min(0).required(),
      compareAtPrice: Joi.number().min(0).allow(null),
      sku: Joi.string().allow(''),
      barcode: Joi.string().allow(''),
      quantity: Joi.number().integer().min(0).default(0),
      weight: Joi.number().min(0).allow(null),
      requiresShipping: Joi.boolean().default(true),
    })
  ),
});

// Schéma de validation pour la création d'une commande
const createOrderSchema = Joi.object({
  customerId: Joi.string().required().label('Client'),
  shippingAddress: Joi.object({
    firstName: Joi.string().required().label('Prénom'),
    lastName: Joi.string().required().label('Nom'),
    company: Joi.string().allow('').label('Entreprise'),
    address1: Joi.string().required().label('Adresse ligne 1'),
    address2: Joi.string().allow('').label('Adresse ligne 2'),
    city: Joi.string().required().label('Ville'),
    country: Joi.string().required().label('Pays'),
    province: Joi.string().required().label('Région/Province/État'),
    postalCode: Joi.string().required().label('Code postal'),
    phone: Joi.string().allow('').label('Téléphone'),  
  }).required().label('Adresse de livraison'),
  billingAddress: Joi.object({
    firstName: Joi.string().required().label('Prénom'),
    lastName: Joi.string().required().label('Nom'),
    company: Joi.string().allow('').label('Entreprise'),
    address1: Joi.string().required().label('Adresse ligne 1'),
    address2: Joi.string().allow('').label('Adresse ligne 2'),
    city: Joi.string().required().label('Ville'),
    country: Joi.string().required().label('Pays'),
    province: Joi.string().required().label('Région/Province/État'),
    postalCode: Joi.string().required().label('Code postal'),
    phone: Joi.string().allow('').label('Téléphone'),
  }).required().label('Adresse de facturation'),
  lineItems: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required().label('Produit'),
        variantId: Joi.string().allow(null).label('Variante'),
        quantity: Joi.number().integer().min(1).required().label('Quantité'),
        price: Joi.number().min(0).required().label('Prix unitaire'),
        compareAtPrice: Joi.number().min(0).allow(null).label('Prix de comparaison'),
        title: Joi.string().required().label('Titre'),
        variantTitle: Joi.string().allow('').label('Titre de la variante'),
        sku: Joi.string().allow('').label('SKU'),
        requiresShipping: Joi.boolean().default(true),
        taxable: Joi.boolean().default(true),
        taxCode: Joi.string().allow('').label('Code fiscal'),
        fulfillmentService: Joi.string().allow('').label('Service de livraison'),
      })
    )
    .min(1)
    .required()
    .label('Articles'),
  shippingLine: Joi.object({
    title: Joi.string().required().label('Méthode de livraison'),
    price: Joi.number().min(0).required().label('Frais de livraison'),
    code: Joi.string().allow('').label('Code de livraison'),
    source: Joi.string().allow('').label('Source de la livraison'),
    phone: Joi.string().allow('').label('Téléphone pour la livraison'),
    requestedFulfillmentServiceId: Joi.string().allow('').label('Service de livraison demandé'),
  }).required().label('Livraison'),
  note: Joi.string().allow('').label('Note'),
  tags: Joi.array().items(Joi.string()).default([]).label('Étiquettes'),
  email: Joi.string().email().allow('').label('Email'),
  sendReceipt: Joi.boolean().default(true).label('Envoyer le reçu'),
  sendFulfillmentReceipt: Joi.boolean().default(false).label('Envoyer le reçu d\'expédition'),
});

// Schéma de validation pour un avis
const reviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required().label('Note'),
  title: Joi.string().min(3).max(100).required().label('Titre'),
  comment: Joi.string().required().label('Commentaire'),
  isRecommended: Joi.boolean().default(true).label('Recommandé'),
  photos: Joi.array().items(Joi.string().uri()).default([]).label('Photos'),
  productId: Joi.string().when('merchantId', {
    is: Joi.exist(),
    then: Joi.forbidden(),
    otherwise: Joi.string().required(),
  }),
  merchantId: Joi.string().when('productId', {
    is: Joi.exist(),
    then: Joi.forbidden(),
    otherwise: Joi.string().required(),
  }),
  orderId: Joi.string().allow('').label('Numéro de commande'),
  nickname: Joi.string().allow('').max(50).label('Pseudo'),
  location: Joi.string().allow('').max(100).label('Localisation'),
  email: Joi.string().email().allow('').label('Email'),
  wouldBuyAgain: Joi.boolean().default(true).label('Acheterait à nouveau'),
  quality: Joi.number().min(1).max(5).label('Qualité'),
  value: Joi.number().min(1).max(5).label('Rapport qualité/prix'),
  pros: Joi.string().allow('').max(500).label('Points forts'),
  cons: Joi.string().allow('').max(500).label('Points faibles'),
});

// Fonction de validation générique
const validate = (schema, data, options = {}) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
    ...options,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message.replace(/\"/g, '\''),
      type: detail.type,
    }));

    throw new AppError('Validation error', 400, errors);
  }

  return value;
};

// Fonction pour valider les ID de base de données
const validateId = (id, name = 'ID') => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(`${name} invalide`, 400);
  }
  return id;
};

// Middleware pour valider les données de la requête
const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[source];
      const validatedData = validate(schema, data);
      req[source] = validatedData;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  // Schémas
  signupSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
  createProductSchema,
  createOrderSchema,
  reviewSchema,
  
  // Fonctions utilitaires
  validate,
  validateId,
  validateRequest,
  
  // Alias pour les validations courantes
  validateSignup: (data) => validate(signupSchema, data),
  validateLogin: (data) => validate(loginSchema, data),
  validateResetPassword: (data) => validate(resetPasswordSchema, data),
  validateUpdateProfile: (data) => validate(updateProfileSchema, data),
  validateCreateProduct: (data) => validate(createProductSchema, data),
  validateCreateOrder: (data) => validate(createOrderSchema, data),
  validateReview: (data) => validate(reviewSchema, data),
};
