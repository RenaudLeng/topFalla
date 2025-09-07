const { Op, Sequelize, literal } = require('sequelize');
const BaseController = require('./baseController');
const { Offer, Product, Merchant, OfferHistory } = require('../models');
const AppError = require('../utils/appError');

class OfferController extends BaseController {
  constructor() {
    super(Offer);
  }

  // Récupérer toutes les offres avec filtrage avancé
  getAllOffers = async (req, res, next) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        sort = 'newest',
        minPrice, 
        maxPrice, 
        inStock,
        merchantId,
        productId,
        categoryId,
        hasDiscount,
        search
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Construire la requête de base
      const query = {
        where: {},
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'slug', 'image_url', 'brand', 'model'],
            required: true
          },
          {
            model: Merchant,
            as: 'merchant',
            attributes: ['id', 'name', 'slug', 'logo_url', 'rating', 'review_count'],
            required: true
          }
        ],
        distinct: true
      };

      // Filtrage par prix
      if (minPrice || maxPrice) {
        query.where.price = {};
        if (minPrice) query.where.price[Op.gte] = parseFloat(minPrice);
        if (maxPrice) query.where.price[Op.lte] = parseFloat(maxPrice);
      }

      // Filtrage par stock
      if (inStock === 'true') {
        query.where.in_stock = true;
      } else if (inStock === 'false') {
        query.where.in_stock = false;
      }

      // Filtrage par marchand
      if (merchantId) {
        query.where.merchant_id = merchantId;
      }

      // Filtrage par produit
      if (productId) {
        query.where.product_id = productId;
      }

      // Filtrage par catégorie
      if (categoryId) {
        query.include[0].include = [
          {
            model: 'categories',
            as: 'category',
            where: { id: categoryId },
            attributes: [],
            required: true
          }
        ];
      }

      // Filtrage par remise
      if (hasDiscount === 'true') {
        query.where.original_price = {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.gt]: 0 },
            { [Op.gt]: Sequelize.col('price') }
          ]
        };
      }

      // Filtrage par recherche
      if (search) {
        query.include[0].where = {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } },
            { brand: { [Op.iLike]: `%${search}%` } },
            { model: { [Op.iLike]: `%${search}%` } }
          ]
        };
      }

      // Trier les résultats
      switch (sort) {
        case 'price_asc':
          query.order = [['price', 'ASC']];
          break;
        case 'price_desc':
          query.order = [['price', 'DESC']];
          break;
        case 'discount_high':
          query.order = [
            [
              literal('(CASE WHEN original_price > 0 AND original_price > price THEN ((original_price - price) / original_price) ELSE 0 END)'),
              'DESC'
            ]
          ];
          break;
        case 'newest':
        default:
          query.order = [['created_at', 'DESC']];
      }

      // Pagination
      query.limit = parseInt(limit);
      query.offset = offset;

      const { count, rows: offers } = await this.model.findAndCountAll(query);
      const totalPages = Math.ceil(count / parseInt(limit));

      // Formater les offres pour inclure le pourcentage de réduction
      const formattedOffers = offers.map(offer => {
        const offerJson = offer.toJSON();
        
        // Calculer le pourcentage de réduction si applicable
        if (offerJson.original_price && offerJson.original_price > offerJson.price) {
          offerJson.discount_percentage = Math.round(
            ((offerJson.original_price - offerJson.price) / offerJson.original_price) * 100
          );
          offerJson.discount_amount = (offerJson.original_price - offerJson.price).toFixed(2);
        } else {
          offerJson.discount_percentage = 0;
          offerJson.discount_amount = 0;
        }

        return offerJson;
      });

      res.status(200).json({
        status: 'success',
        results: formattedOffers.length,
        total: count,
        totalPages,
        currentPage: parseInt(page),
        data: {
          offers: formattedOffers
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Récupérer une offre par son ID avec son historique
  getOffer = async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const offer = await this.model.findByPk(id, {
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'slug', 'image_url', 'brand', 'model', 'description']
          },
          {
            model: Merchant,
            as: 'merchant',
            attributes: ['id', 'name', 'slug', 'logo_url', 'rating', 'review_count', 'return_policy', 'shipping_policy']
          },
          {
            model: OfferHistory,
            as: 'history',
            attributes: ['id', 'price', 'original_price', 'in_stock', 'created_at'],
            order: [['created_at', 'DESC']],
            limit: 30 // Derniers 30 changements
          }
        ]
      });

      if (!offer) {
        return next(new AppError('Aucune offre trouvée avec cet ID', 404));
      }

      // Formater les données de l'offre
      const offerJson = offer.toJSON();
      
      // Calculer le pourcentage de réduction si applicable
      if (offerJson.original_price && offerJson.original_price > offerJson.price) {
        offerJson.discount_percentage = Math.round(
          ((offerJson.original_price - offerJson.price) / offerJson.original_price) * 100
        );
        offerJson.discount_amount = (offerJson.original_price - offerJson.price).toFixed(2);
      } else {
        offerJson.discount_percentage = 0;
        offerJson.discount_amount = 0;
      }

      // Calculer les statistiques de prix
      const priceStats = await this.getPriceStats(offer.product_id, offer.merchant_id);
      
      // Récupérer les offres alternatives du même marchand
      const merchantOffers = await this.getMerchantOffers(offer.merchant_id, offer.product_id, id);
      
      // Récupérer les offres des autres marchands pour le même produit
      const otherMerchants = await this.getOtherMerchants(offer.product_id, offer.merchant_id);

      res.status(200).json({
        status: 'success',
        data: {
          offer: {
            ...offerJson,
            price_stats: priceStats,
            merchant_offers: merchantOffers,
            other_merchants: otherMerchants
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Créer une nouvelle offre
  createOffer = async (req, res, next) => {
    try {
      const { product_id, merchant_id, price, original_price, ...offerData } = req.body;
      
      // Vérifier que le produit existe
      const product = await Product.findByPk(product_id);
      if (!product) {
        return next(new AppError('Aucun produit trouvé avec cet ID', 404));
      }
      
      // Vérifier que le marchand existe
      const merchant = await Merchant.findByPk(merchant_id);
      if (!merchant) {
        return next(new AppError('Aucun marchand trouvé avec cet ID', 404));
      }
      
      // Vérifier si une offre existe déjà pour ce produit et ce marchand
      const existingOffer = await this.model.findOne({
        where: {
          product_id,
          merchant_id
        }
      });
      
      if (existingOffer) {
        return next(new AppError('Une offre existe déjà pour ce produit et ce marchand', 400));
      }
      
      // Démarrer une transaction
      const transaction = await this.model.sequelize.transaction();
      
      try {
        // Créer l'offre
        const offer = await this.model.create({
          product_id,
          merchant_id,
          price: parseFloat(price),
          original_price: original_price ? parseFloat(original_price) : null,
          currency: 'XAF', // Devise par défaut
          in_stock: true, // Par défaut en stock
          ...offerData
        }, { transaction });
        
        // Créer l'entrée d'historique
        await OfferHistory.create({
          offer_id: offer.id,
          price: offer.price,
          original_price: offer.original_price,
          in_stock: offer.in_stock,
          stock_quantity: offer.stock_quantity,
          shipping_cost: offer.shipping_cost,
          condition: offer.condition,
          warranty: offer.warranty,
          is_lowest_price: false, // À déterminer après vérification
          price_change: 0,
          previous_price: null
        }, { transaction });
        
        // Mettre à jour le compteur de produits du marchand
        await merchant.increment('product_count', { transaction });
        
        // Valider la transaction
        await transaction.commit();
        
        // Vérifier et mettre à jour le statut de prix le plus bas
        await this.updateLowestPriceStatus(offer.product_id);
        
        res.status(201).json({
          status: 'success',
          data: {
            offer
          }
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  };

  // Mettre à jour une offre
  updateOffer = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { price, original_price, in_stock, ...updateData } = req.body;
      
      // Récupérer l'offre existante
      const offer = await this.model.findByPk(id);
      if (!offer) {
        return next(new AppError('Aucune offre trouvée avec cet ID', 404));
      }
      
      // Vérifier si le prix ou le stock a changé
      const priceChanged = price !== undefined && parseFloat(price) !== parseFloat(offer.price);
      const originalPriceChanged = original_price !== undefined && 
        ((!offer.original_price && original_price !== null) || 
         (offer.original_price && parseFloat(original_price) !== parseFloat(offer.original_price)));
      const stockChanged = in_stock !== undefined && in_stock !== offer.in_stock;
      
      // Si aucun changement significatif, retourner l'offre existante
      if (!priceChanged && !originalPriceChanged && !stockChanged && 
          Object.keys(updateData).length === 0) {
        return res.status(200).json({
          status: 'success',
          data: { offer }
        });
      }
      
      // Démarrer une transaction
      const transaction = await this.model.sequelize.transaction();
      
      try {
        // Calculer la variation de prix
        const priceChange = priceChanged ? parseFloat(price) - parseFloat(offer.price) : 0;
        
        // Mettre à jour l'offre
        const updatedOffer = await offer.update({
          price: price !== undefined ? parseFloat(price) : offer.price,
          original_price: original_price !== undefined ? 
            (original_price ? parseFloat(original_price) : null) : 
            offer.original_price,
          in_stock: in_stock !== undefined ? in_stock : offer.in_stock,
          last_updated: new Date(),
          ...updateData
        }, { transaction });
        
        // Créer une entrée d'historique si le prix ou le stock a changé
        if (priceChanged || originalPriceChanged || stockChanged) {
          await OfferHistory.create({
            offer_id: offer.id,
            price: updatedOffer.price,
            original_price: updatedOffer.original_price,
            in_stock: updatedOffer.in_stock,
            stock_quantity: updatedOffer.stock_quantity,
            shipping_cost: updatedOffer.shipping_cost,
            condition: updatedOffer.condition,
            warranty: updatedOffer.warranty,
            is_lowest_price: updatedOffer.is_lowest_price,
            price_change: priceChange,
            previous_price: priceChanged ? parseFloat(offer.price) : null
          }, { transaction });
        }
        
        // Valider la transaction
        await transaction.commit();
        
        // Mettre à jour le statut de prix le plus bas si le prix a changé
        if (priceChanged) {
          await this.updateLowestPriceStatus(offer.product_id);
        }
        
        res.status(200).json({
          status: 'success',
          data: {
            offer: updatedOffer
          }
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  };

  // Supprimer une offre
  deleteOffer = async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Récupérer l'offre existante
      const offer = await this.model.findByPk(id);
      if (!offer) {
        return next(new AppError('Aucune offre trouvée avec cet ID', 404));
      }
      
      // Démarrer une transaction
      const transaction = await this.model.sequelize.transaction();
      
      try {
        const merchantId = offer.merchant_id;
        const productId = offer.product_id;
        
        // Supprimer l'historique de l'offre
        await OfferHistory.destroy({
          where: { offer_id: id },
          transaction
        });
        
        // Supprimer l'offre
        await offer.destroy({ transaction });
        
        // Décrémenter le compteur de produits du marchand
        await Merchant.decrement('product_count', {
          where: { id: merchantId },
          transaction
        });
        
        // Valider la transaction
        await transaction.commit();
        
        // Mettre à jour le statut de prix le plus bas pour le produit
        await this.updateLowestPriceStatus(productId);
        
        res.status(204).json({
          status: 'success',
          data: null
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  };

  // Mettre à jour le statut de prix le plus bas pour un produit
  updateLowestPriceStatus = async (productId) => {
    // Trouver l'offre avec le prix le plus bas pour ce produit
    const lowestPriceOffer = await this.model.findOne({
      where: {
        product_id: productId,
        in_stock: true
      },
      order: [['price', 'ASC']]
    });
    
    if (lowestPriceOffer) {
      // Mettre à jour toutes les offres pour ce produit
      await this.model.update(
        { is_lowest_price: false },
        { where: { product_id: productId } }
      );
      
      // Marquer l'offre avec le prix le plus bas
      await lowestPriceOffer.update({ is_lowest_price: true });
    }
  };

  // Obtenir les statistiques de prix pour un produit
  getPriceStats = async (productId, excludeMerchantId = null) => {
    const whereClause = {
      product_id: productId,
      in_stock: true
    };
    
    if (excludeMerchantId) {
      whereClause.merchant_id = { [Op.ne]: excludeMerchantId };
    }
    
    const stats = await this.model.findOne({
      where: whereClause,
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total_offers'],
        [Sequelize.fn('AVG', Sequelize.col('price')), 'avg_price'],
        [Sequelize.fn('MIN', Sequelize.col('price')), 'min_price'],
        [Sequelize.fn('MAX', Sequelize.col('price')), 'max_price'],
        [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('merchant_id'))), 'merchant_count']
      ],
      raw: true
    });
    
    // Calculer la fourchette de prix
    if (stats && stats.min_price && stats.max_price) {
      const range = stats.max_price - stats.min_price;
      stats.price_range = {
        min: parseFloat(stats.min_price),
        max: parseFloat(stats.max_price),
        range: parseFloat(range.toFixed(2)),
        range_percentage: stats.avg_price ? 
          Math.round((range / stats.avg_price) * 100) : 0
      };
    }
    
    return stats || {
      total_offers: 0,
      avg_price: 0,
      min_price: 0,
      max_price: 0,
      merchant_count: 0,
      price_range: {
        min: 0,
        max: 0,
        range: 0,
        range_percentage: 0
      }
    };
  };

  // Obtenir les offres alternatives du même marchand pour un produit
  getMerchantOffers = async (merchantId, productId, excludeOfferId = null) => {
    const whereClause = {
      merchant_id: merchantId,
      product_id: productId,
      in_stock: true
    };
    
    if (excludeOfferId) {
      whereClause.id = { [Op.ne]: excludeOfferId };
    }
    
    return await this.model.findAll({
      where: whereClause,
      attributes: [
        'id',
        'price',
        'original_price',
        'currency',
        'condition',
        'warranty',
        'shipping_cost',
        'delivery_time',
        'is_lowest_price',
        'created_at',
        'updated_at'
      ],
      order: [['price', 'ASC']],
      limit: 5
    });
  };

  // Obtenir les offres des autres marchands pour un produit
  getOtherMerchants = async (productId, excludeMerchantId, limit = 5) => {
    return await this.model.findAll({
      where: {
        product_id: productId,
        merchant_id: { [Op.ne]: excludeMerchantId },
        in_stock: true
      },
      include: [
        {
          model: Merchant,
          as: 'merchant',
          attributes: ['id', 'name', 'slug', 'logo_url', 'rating', 'review_count']
        }
      ],
      attributes: [
        'id',
        'price',
        'original_price',
        'currency',
        'shipping_cost',
        'delivery_time',
        'is_lowest_price',
        'created_at',
        'updated_at'
      ],
      order: [['price', 'ASC']],
      limit
    });
  };

  // Suivre les clics sur les offres
  trackOfferClick = async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Incrémenter le compteur de clics
      const [updated] = await this.model.increment('click_count', {
        where: { id },
        returning: true
      });
      
      if (!updated) {
        return next(new AppError('Aucune offre trouvée avec cet ID', 404));
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Clic enregistré avec succès'
      });
    } catch (error) {
      next(error);
    }
  };

  // Obtenir l'historique des prix d'une offre
  getPriceHistory = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { days = 30 } = req.query;
      
      // Vérifier que l'offre existe
      const offer = await this.model.findByPk(id, {
        attributes: ['id', 'product_id', 'merchant_id']
      });
      
      if (!offer) {
        return next(new AppError('Aucune offre trouvée avec cet ID', 404));
      }
      
      // Calculer la date de début
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      
      // Récupérer l'historique des prix
      const history = await OfferHistory.findAll({
        where: {
          offer_id: id,
          created_at: { [Op.gte]: startDate }
        },
        attributes: [
          'id',
          'price',
          'original_price',
          'price_change',
          'previous_price',
          'in_stock',
          'created_at'
        ],
        order: [['created_at', 'ASC']]
      });
      
      // Formater les données pour le graphique
      const priceData = history.map(record => ({
        date: record.created_at,
        price: parseFloat(record.price),
        original_price: record.original_price ? parseFloat(record.original_price) : null,
        price_change: record.price_change ? parseFloat(record.price_change) : 0,
        in_stock: record.in_stock
      }));
      
      // Calculer les statistiques
      const stats = {
        days: parseInt(days),
        data_points: priceData.length,
        current_price: priceData.length > 0 ? priceData[priceData.length - 1].price : 0,
        price_change: priceData.length > 1 ? 
          priceData[priceData.length - 1].price - priceData[0].price : 0,
        price_change_percentage: priceData.length > 1 ? 
          ((priceData[priceData.length - 1].price - priceData[0].price) / priceData[0].price) * 100 : 0,
        min_price: priceData.length > 0 ? 
          Math.min(...priceData.map(d => d.price)) : 0,
        max_price: priceData.length > 0 ? 
          Math.max(...priceData.map(d => d.price)) : 0,
        average_price: priceData.length > 0 ? 
          priceData.reduce((sum, d) => sum + d.price, 0) / priceData.length : 0
      };
      
      res.status(200).json({
        status: 'success',
        data: {
          stats,
          history: priceData
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new OfferController();
