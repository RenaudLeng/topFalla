const { Op, Sequelize } = require('sequelize');
const BaseController = require('./baseController');
const { Merchant, Offer, Product, Category, Review, MerchantCategory } = require('../models');
const AppError = require('../utils/appError');

class MerchantController extends BaseController {
  constructor() {
    super(Merchant);
  }

  // Récupérer tous les marchands avec filtrage et tri
  getAllMerchants = async (req, res, next) => {
    try {
      const { page = 1, limit = 20, sort = 'name_asc', search, category } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Construire la requête de base
      const query = {
        where: {},
        attributes: [
          'id',
          'name',
          'slug',
          'logo_url',
          'rating',
          'review_count',
          'product_count',
          'created_at',
          [
            Sequelize.literal('(SELECT COUNT(*) FROM offers WHERE offers.merchant_id = merchant.id AND offers.in_stock = true)'),
            'active_products'
          ]
        ],
        include: [
          {
            model: MerchantCategory,
            as: 'categories',
            attributes: ['id', 'name', 'slug'],
            through: { attributes: [] },
            required: false
          }
        ],
        distinct: true
      };

      // Filtrage par recherche
      if (search) {
        query.where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { domain: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Filtrage par catégorie
      if (category) {
        query.include[0].required = true;
        if (typeof query.include[0].where === 'undefined') {
          query.include[0].where = {};
        }
        query.include[0].where.slug = category;
      }

      // Trier les résultats
      const order = [];
      switch (sort) {
        case 'name_asc':
          order.push(['name', 'ASC']);
          break;
        case 'name_desc':
          order.push(['name', 'DESC']);
          break;
        case 'rating_high':
          order.push([
            Sequelize.literal('(rating * 100 + review_count)'),
            'DESC'
          ]);
          break;
        case 'products_high':
          order.push([
            Sequelize.literal('(SELECT COUNT(*) FROM offers WHERE offers.merchant_id = merchant.id AND offers.in_stock = true)'),
            'DESC'
          ]);
          break;
        case 'newest':
          order.push(['created_at', 'DESC']);
          break;
        default:
          order.push(['name', 'ASC']);
      }
      query.order = order;

      // Pagination
      query.limit = parseInt(limit);
      query.offset = offset;

      const { count, rows: merchants } = await this.model.findAndCountAll(query);
      const totalPages = Math.ceil(count / parseInt(limit));

      res.status(200).json({
        status: 'success',
        results: merchants.length,
        total: count,
        totalPages,
        currentPage: parseInt(page),
        data: {
          merchants
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Récupérer un marchand par son ID avec des détails complets
  getMerchant = async (req, res, next) => {
    try {
      const merchant = await this.model.findByPk(req.params.id, {
        include: [
          {
            model: MerchantCategory,
            as: 'categories',
            attributes: ['id', 'name', 'slug'],
            through: { attributes: [] },
            required: false
          },
          {
            model: Review,
            as: 'reviews',
            attributes: ['id', 'rating', 'title', 'comment', 'created_at', 'user_name'],
            order: [['created_at', 'DESC']],
            limit: 5,
            required: false
          }
        ]
      });

      if (!merchant) {
        return next(new AppError('Aucun marchand trouvé avec cet ID', 404));
      }

      // Récupérer les statistiques des produits
      const productStats = await this.getMerchantProductStats(merchant.id);
      
      // Récupérer les catégories de produits les plus populaires
      const topCategories = await this.getTopCategories(merchant.id);

      // Récupérer les produits les plus populaires
      const popularProducts = await this.getPopularProducts(merchant.id);

      // Récupérer les statistiques des avis
      const reviewStats = await this.getReviewStats(merchant.id);

      res.status(200).json({
        status: 'success',
        data: {
          merchant: {
            ...merchant.toJSON(),
            stats: {
              ...productStats,
              reviewStats
            },
            topCategories,
            popularProducts
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Récupérer les statistiques des produits d'un marchand
  getMerchantProductStats = async (merchantId) => {
    const stats = await Offer.findOne({
      where: { merchant_id: merchantId },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('offers.id')), 'total_products'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN offers.in_stock = true THEN 1 ELSE 0 END')), 'in_stock_count'],
        [Sequelize.fn('AVG', Sequelize.col('price')), 'avg_price'],
        [Sequelize.fn('MIN', Sequelize.col('price')), 'min_price'],
        [Sequelize.fn('MAX', Sequelize.col('price')), 'max_price'],
        [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('product_id'))), 'unique_products'],
        [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('category_id'))), 'category_count']
      ],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: [],
          required: true
        }
      ],
      raw: true,
      group: ['merchant_id']
    });

    return stats || {
      total_products: 0,
      in_stock_count: 0,
      avg_price: 0,
      min_price: 0,
      max_price: 0,
      unique_products: 0,
      category_count: 0
    };
  };

  // Récupérer les catégories les plus populaires d'un marchand
  getTopCategories = async (merchantId, limit = 5) => {
    return await Category.findAll({
      attributes: [
        'id', 'name', 'slug',
        [Sequelize.fn('COUNT', Sequelize.col('products.id')), 'product_count']
      ],
      include: [
        {
          model: Product,
          as: 'products',
          attributes: [],
          required: true,
          include: [
            {
              model: Offer,
              as: 'offers',
              where: { 
                merchant_id: merchantId,
                in_stock: true 
              },
              attributes: [],
              required: true
            }
          ]
        }
      ],
      group: ['Category.id'],
      order: [[Sequelize.literal('product_count'), 'DESC']],
      limit,
      subQuery: false
    });
  };

  // Récupérer les produits les plus populaires d'un marchand
  getPopularProducts = async (merchantId, limit = 5) => {
    return await Product.findAll({
      attributes: [
        'id', 'name', 'slug', 'image_url',
        [Sequelize.col('offers.price'), 'price'],
        [Sequelize.col('offers.original_price'), 'original_price'],
        [Sequelize.col('offers.currency'), 'currency']
      ],
      include: [
        {
          model: Offer,
          as: 'offers',
          where: { 
            merchant_id: merchantId,
            in_stock: true 
          },
          attributes: [],
          required: true
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        }
      ],
      order: [
        [Sequelize.literal('offers.view_count'), 'DESC'],
        [Sequelize.literal('offers.click_count'), 'DESC']
      ],
      limit,
      subQuery: false
    });
  };

  // Récupérer les statistiques des avis d'un marchand
  getReviewStats = async (merchantId) => {
    const stats = await Review.findOne({
      where: { merchant_id: merchantId },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total_reviews'],
        [Sequelize.fn('AVG', Sequelize.col('rating')), 'average_rating'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN rating = 5 THEN 1 ELSE 0 END')), 'five_star'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN rating = 4 THEN 1 ELSE 0 END')), 'four_star'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN rating = 3 THEN 1 ELSE 0 END')), 'three_star'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN rating = 2 THEN 1 ELSE 0 END')), 'two_star'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN rating = 1 THEN 1 ELSE 0 END')), 'one_star']
      ],
      raw: true
    });

    if (!stats || !stats.total_reviews) {
      return {
        total_reviews: 0,
        average_rating: 0,
        rating_distribution: {
          five_star: 0,
          four_star: 0,
          three_star: 0,
          two_star: 0,
          one_star: 0
        }
      };
    }

    // Calculer les pourcentages pour chaque étoile
    const total = parseInt(stats.total_reviews);
    const ratingDistribution = {
      five_star: Math.round((parseInt(stats.five_star || 0) / total) * 100),
      four_star: Math.round((parseInt(stats.four_star || 0) / total) * 100),
      three_star: Math.round((parseInt(stats.three_star || 0) / total) * 100),
      two_star: Math.round((parseInt(stats.two_star || 0) / total) * 100),
      one_star: Math.round((parseInt(stats.one_star || 0) / total) * 100)
    };

    return {
      total_reviews: total,
      average_rating: parseFloat(stats.average_rating).toFixed(1),
      rating_distribution: ratingDistribution
    };
  };

  // Créer un nouveau marchand
  createMerchant = async (req, res, next) => {
    try {
      const { name, description, domain, logo_url, categories } = req.body;
      
      // Vérifier si le domaine est déjà utilisé
      const existingMerchant = await this.model.findOne({
        where: { domain }
      });

      if (existingMerchant) {
        return next(new AppError('Un marchand avec ce domaine existe déjà', 400));
      }

      // Démarrer une transaction
      const transaction = await this.model.sequelize.transaction();

      try {
        // Créer le marchand
        const merchant = await this.model.create({
          name,
          description,
          domain,
          logo_url,
          rating: 0,
          review_count: 0,
          product_count: 0,
          status: 'pending' // En attente de vérification
        }, { transaction });

        // Associer les catégories si fournies
        if (categories && categories.length > 0) {
          // Vérifier que les catégories existent
          const existingCategories = await MerchantCategory.findAll({
            where: { id: { [Op.in]: categories } },
            transaction
          });

          if (existingCategories.length !== categories.length) {
            await transaction.rollback();
            return next(new AppError('Une ou plusieurs catégories sont invalides', 400));
          }

          // Associer les catégories
          await merchant.setCategories(categories, { transaction });
        }

        // Valider la transaction
        await transaction.commit();

        res.status(201).json({
          status: 'success',
          data: {
            merchant
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

  // Mettre à jour un marchand
  updateMerchant = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { categories, ...updateData } = req.body;

      // Vérifier que le marchand existe
      const merchant = await this.model.findByPk(id);
      if (!merchant) {
        return next(new AppError('Aucun marchand trouvé avec cet ID', 404));
      }

      // Démarrer une transaction
      const transaction = await this.model.sequelize.transaction();

      try {
        // Mettre à jour les données du marchand
        await merchant.update(updateData, { transaction });

        // Mettre à jour les catégories si fournies
        if (categories) {
          // Vérifier que les catégories existent
          if (categories.length > 0) {
            const existingCategories = await MerchantCategory.count({
              where: { id: { [Op.in]: categories } },
              transaction
            });

            if (existingCategories !== categories.length) {
              await transaction.rollback();
              return next(new AppError('Une ou plusieurs catégories sont invalides', 400));
            }
          }

          // Mettre à jour les associations de catégories
          await merchant.setCategories(categories, { transaction });
        }

        // Valider la transaction
        await transaction.commit();

        // Récupérer le marchand mis à jour avec ses catégories
        const updatedMerchant = await this.model.findByPk(id, {
          include: [
            {
              model: MerchantCategory,
              as: 'categories',
              attributes: ['id', 'name', 'slug'],
              through: { attributes: [] }
            }
          ]
        });

        res.status(200).json({
          status: 'success',
          data: {
            merchant: updatedMerchant
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

  // Supprimer un marchand
  deleteMerchant = async (req, res, next) => {
    try {
      const { id } = req.params;

      // Vérifier que le marchand existe
      const merchant = await this.model.findByPk(id);
      if (!merchant) {
        return next(new AppError('Aucun marchand trouvé avec cet ID', 404));
      }

      // Vérifier s'il y a des offres associées
      const offerCount = await Offer.count({
        where: { merchant_id: id }
      });

      if (offerCount > 0) {
        return next(new AppError('Impossible de supprimer un marchand ayant des offres associées', 400));
      }

      // Démarrer une transaction
      const transaction = await this.model.sequelize.transaction();

      try {
        // Supprimer les associations de catégories
        await merchant.setCategories([], { transaction });

        // Supprimer les avis associés
        await Review.destroy({
          where: { merchant_id: id },
          transaction
        });

        // Supprimer le marchand
        await merchant.destroy({ transaction });

        // Valider la transaction
        await transaction.commit();

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
}

module.exports = new MerchantController();
