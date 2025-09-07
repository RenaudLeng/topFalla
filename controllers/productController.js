const { Op } = require('sequelize');
const BaseController = require('./baseController');
const { Product, Category, Merchant, Offer, ProductImage, ProductAttribute } = require('../models');
const AppError = require('../utils/appError');

class ProductController extends BaseController {
  constructor() {
    super(Product);
  }

  // Récupérer tous les produits avec des options de filtrage avancé
  getAllProducts = async (req, res, next) => {
    try {
      // 1) Construction de la requête de base
      const query = {
        where: {},
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'slug']
          },
          {
            model: ProductImage,
            as: 'images',
            attributes: ['id', 'url', 'alt_text', 'is_primary'],
            where: { is_primary: true },
            required: false
          },
          {
            model: Offer,
            as: 'offers',
            attributes: ['id', 'price', 'original_price', 'currency', 'in_stock', 'merchant_id'],
            include: [
              {
                model: Merchant,
                as: 'merchant',
                attributes: ['id', 'name', 'logo_url', 'rating']
              }
            ]
          }
        ]
      };

      // 2) Filtrage par catégorie
      if (req.query.category) {
        query.include[0].where = { slug: req.query.category };
      }

      // 3) Filtrage par fourchette de prix
      if (req.query.minPrice || req.query.maxPrice) {
        query.include[2].where = {
          ...query.include[2].where,
          price: {}
        };
        
        if (req.query.minPrice) {
          query.include[2].where.price[Op.gte] = parseFloat(req.query.minPrice);
        }
        
        if (req.query.maxPrice) {
          query.include[2].where.price[Op.lte] = parseFloat(req.query.maxPrice);
        }
      }

      // 4) Filtrage par recherche
      if (req.query.search) {
        query.where[Op.or] = [
          { name: { [Op.iLike]: `%${req.query.search}%` } },
          { description: { [Op.iLike]: `%${req.query.search}%` } },
          { brand: { [Op.iLike]: `%${req.query.search}%` } }
        ];
      }

      // 5) Filtrage par disponibilité
      if (req.query.inStock === 'true') {
        query.include[2].where = {
          ...query.include[2].where,
          in_stock: true
        };
      }

      // 6) Tri
      if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query.order = sortBy.split(',').map(sort => {
          const [field, order] = sort.split(':');
          
          // Cas spécial pour le tri par prix
          if (field === 'price') {
            return [
              { model: Offer, as: 'offers' },
              'price',
              order || 'ASC'
            ];
          }
          
          return [field, order || 'ASC'];
        });
      } else {
        query.order = [['createdAt', 'DESC']];
      }

      // 7) Pagination
      const page = req.query.page * 1 || 1;
      const limit = req.query.limit * 1 || 24;
      const offset = (page - 1) * limit;
      
      query.limit = limit;
      query.offset = offset;

      // 8) Exécution de la requête
      const { count, rows: products } = await Product.findAndCountAll(query);
      
      // 9) Vérifier si la page demandée dépasse le nombre total de pages
      const totalPages = Math.ceil(count / limit);
      if (page > totalPages && totalPages > 0) {
        return next(new AppError('Cette page n\'existe pas', 404));
      }

      // 10) Formater la réponse
      const formattedProducts = products.map(product => {
        const productJson = product.toJSON();
        
        // Trouver le meilleur prix parmi les offres
        if (productJson.offers && productJson.offers.length > 0) {
          const prices = productJson.offers.map(offer => offer.price);
          productJson.bestPrice = Math.min(...prices);
          
          // Calculer la réduction moyenne
          const offersWithDiscount = productJson.offers.filter(
            offer => offer.original_price && offer.original_price > offer.price
          );
          
          if (offersWithDiscount.length > 0) {
            const totalDiscount = offersWithDiscount.reduce((sum, offer) => {
              return sum + ((offer.original_price - offer.price) / offer.original_price * 100);
            }, 0);
            
            productJson.averageDiscount = Math.round(totalDiscount / offersWithDiscount.length);
          }
          
          // Compter le nombre de marchands
          productJson.merchantCount = new Set(
            productJson.offers.map(offer => offer.merchant_id)
          ).size;
        }
        
        return productJson;
      });

      res.status(200).json({
        status: 'success',
        results: formattedProducts.length,
        total: count,
        totalPages,
        currentPage: page,
        data: {
          products: formattedProducts
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Récupérer un produit par son ID avec toutes ses informations
  getProduct = async (req, res, next) => {
    try {
      const product = await Product.findByPk(req.params.id, {
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'slug']
          },
          {
            model: ProductImage,
            as: 'images',
            attributes: ['id', 'url', 'alt_text', 'is_primary', 'position'],
            order: [['position', 'ASC']]
          },
          {
            model: ProductAttribute,
            as: 'attributes',
            attributes: ['id', 'name', 'display_name', 'value', 'unit', 'group', 'position'],
            order: [
              ['group', 'ASC'],
              ['position', 'ASC']
            ]
          },
          {
            model: Offer,
            as: 'offers',
            attributes: [
              'id', 'price', 'original_price', 'currency', 
              'in_stock', 'shipping_cost', 'free_shipping',
              'delivery_time', 'condition', 'warranty',
              'url', 'affiliate_url', 'last_updated'
            ],
            include: [
              {
                model: Merchant,
                as: 'merchant',
                attributes: ['id', 'name', 'logo_url', 'rating', 'review_count']
              }
            ],
            order: [
              ['price', 'ASC'],
              ['last_updated', 'DESC']
            ]
          }
        ]
      });

      if (!product) {
        return next(new AppError('Aucun produit trouvé avec cet ID', 404));
      }

      // Formater les données pour la réponse
      const productJson = product.toJSON();
      
      // Calculer les statistiques des prix
      if (productJson.offers && productJson.offers.length > 0) {
        const prices = productJson.offers.map(offer => offer.price);
        productJson.priceStats = {
          min: Math.min(...prices),
          max: Math.max(...prices),
          average: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2),
          count: prices.length
        };
        
        // Calculer les économies potentielles
        const offersWithDiscount = productJson.offers.filter(
          offer => offer.original_price && offer.original_price > offer.price
        );
        
        if (offersWithDiscount.length > 0) {
          const totalDiscount = offersWithDiscount.reduce((sum, offer) => {
            return sum + (offer.original_price - offer.price);
          }, 0);
          
          productJson.priceStats.averageDiscount = (totalDiscount / offersWithDiscount.length).toFixed(2);
          productJson.priceStats.maxDiscount = Math.max(
            ...offersWithDiscount.map(offer => offer.original_price - offer.price)
          ).toFixed(2);
        }
      }
      
      // Grouper les attributs par groupe
      if (productJson.attributes) {
        productJson.attributesGrouped = productJson.attributes.reduce((groups, attr) => {
          const group = attr.group || 'Général';
          if (!groups[group]) {
            groups[group] = [];
          }
          groups[group].push(attr);
          return groups;
        }, {});
      }

      res.status(200).json({
        status: 'success',
        data: {
          product: productJson
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Créer un nouveau produit avec ses images et attributs
  createProduct = async (req, res, next) => {
    try {
      const transaction = await this.model.sequelize.transaction();
      
      try {
        // 1) Créer le produit
        const product = await this.model.create(req.body, { transaction });
        
        // 2) Gérer les images
        if (req.files && req.files.images) {
          const images = Array.isArray(req.files.images) 
            ? req.files.images 
            : [req.files.images];
          
          const imagePromises = images.map((file, index) => 
            ProductImage.create({
              product_id: product.id,
              url: `/uploads/products/${file.filename}`,
              alt_text: `${product.name} - Image ${index + 1}`,
              is_primary: index === 0,
              position: index
            }, { transaction })
          );
          
          await Promise.all(imagePromises);
        }
        
        // 3) Gérer les attributs
        if (req.body.attributes && Array.isArray(req.body.attributes)) {
          const attributePromises = req.body.attributes.map((attr, index) =>
            ProductAttribute.create({
              product_id: product.id,
              name: attr.name,
              value: attr.value,
              display_name: attr.display_name || attr.name,
              unit: attr.unit,
              group: attr.group || 'Général',
              is_filterable: attr.is_filterable || false,
              is_visible: attr.is_visible !== false,
              position: attr.position || index,
              data_type: attr.data_type || 'string'
            }, { transaction })
          );
          
          await Promise.all(attributePromises);
        }
        
        await transaction.commit();
        
        // Récupérer le produit complet avec ses relations
        const newProduct = await this.model.findByPk(product.id, {
          include: [
            { model: ProductImage, as: 'images' },
            { model: ProductAttribute, as: 'attributes' }
          ]
        });
        
        res.status(201).json({
          status: 'success',
          data: {
            product: newProduct
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

  // Mettre à jour un produit
  updateProduct = async (req, res, next) => {
    try {
      const transaction = await this.model.sequelize.transaction();
      
      try {
        // 1) Mettre à jour le produit
        const [updated] = await this.model.update(req.body, {
          where: { id: req.params.id },
          transaction
        });

        if (!updated) {
          await transaction.rollback();
          return next(new AppError('Aucun produit trouvé avec cet ID', 404));
        }
        
        // 2) Mettre à jour les images si fournies
        if (req.files && req.files.images) {
          // Supprimer les anciennes images (facultatif, selon les besoins)
          await ProductImage.destroy({
            where: { product_id: req.params.id },
            transaction
          });
          
          // Ajouter les nouvelles images
          const images = Array.isArray(req.files.images) 
            ? req.files.images 
            : [req.files.images];
          
          const imagePromises = images.map((file, index) => 
            ProductImage.create({
              product_id: req.params.id,
              url: `/uploads/products/${file.filename}`,
              alt_text: `${req.body.name || 'Produit'} - Image ${index + 1}`,
              is_primary: index === 0,
              position: index
            }, { transaction })
          );
          
          await Promise.all(imagePromises);
        }
        
        // 3) Mettre à jour les attributs
        if (req.body.attributes && Array.isArray(req.body.attributes)) {
          // Supprimer les anciens attributs
          await ProductAttribute.destroy({
            where: { product_id: req.params.id },
            transaction
          });
          
          // Ajouter les nouveaux attributs
          const attributePromises = req.body.attributes.map((attr, index) =>
            ProductAttribute.create({
              product_id: req.params.id,
              name: attr.name,
              value: attr.value,
              display_name: attr.display_name || attr.name,
              unit: attr.unit,
              group: attr.group || 'Général',
              is_filterable: attr.is_filterable || false,
              is_visible: attr.is_visible !== false,
              position: attr.position || index,
              data_type: attr.data_type || 'string'
            }, { transaction })
          );
          
          await Promise.all(attributePromises);
        }
        
        await transaction.commit();
        
        // Récupérer le produit mis à jour avec ses relations
        const updatedProduct = await this.model.findByPk(req.params.id, {
          include: [
            { model: Category, as: 'category' },
            { model: ProductImage, as: 'images' },
            { model: ProductAttribute, as: 'attributes' },
            {
              model: Offer,
              as: 'offers',
              include: [
                { model: Merchant, as: 'merchant' }
              ]
            }
          ]
        });
        
        res.status(200).json({
          status: 'success',
          data: {
            product: updatedProduct
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

  // Supprimer un produit
  deleteProduct = async (req, res, next) => {
    try {
      const transaction = await this.model.sequelize.transaction();
      
      try {
        // 1) Supprimer les images associées
        await ProductImage.destroy({
          where: { product_id: req.params.id },
          transaction
        });
        
        // 2) Supprimer les attributs associés
        await ProductAttribute.destroy({
          where: { product_id: req.params.id },
          transaction
        });
        
        // 3) Supprimer les offres associées
        await Offer.destroy({
          where: { product_id: req.params.id },
          transaction
        });
        
        // 4) Supprimer le produit
        const deleted = await this.model.destroy({
          where: { id: req.params.id },
          transaction
        });
        
        if (!deleted) {
          await transaction.rollback();
          return next(new AppError('Aucun produit trouvé avec cet ID', 404));
        }
        
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
  
  // Récupérer les produits similaires
  getSimilarProducts = async (req, res, next) => {
    try {
      const product = await this.model.findByPk(req.params.id, {
        attributes: ['id', 'category_id', 'brand']
      });
      
      if (!product) {
        return next(new AppError('Aucun produit trouvé avec cet ID', 404));
      }
      
      const similarProducts = await this.model.findAll({
        where: {
          id: { [Op.ne]: product.id },
          [Op.or]: [
            { category_id: product.category_id },
            { brand: product.brand }
          ]
        },
        include: [
          {
            model: ProductImage,
            as: 'images',
            where: { is_primary: true },
            required: false,
            attributes: ['url', 'alt_text']
          },
          {
            model: Offer,
            as: 'offers',
            attributes: ['price', 'currency'],
            order: [['price', 'ASC']],
            limit: 1
          }
        ],
        limit: 8,
        order: [['createdAt', 'DESC']]
      });
      
      res.status(200).json({
        status: 'success',
        results: similarProducts.length,
        data: {
          products: similarProducts
        }
      });
    } catch (error) {
      next(error);
    }
  };
  
  // Récupérer les statistiques des produits
  getProductStats = async (req, res, next) => {
    try {
      const stats = await this.model.sequelize.query(`
        SELECT 
          COUNT(*) as total_products,
          (SELECT COUNT(*) FROM products WHERE created_at >= NOW() - INTERVAL '30 days') as new_products,
          (SELECT COUNT(DISTINCT brand) FROM products WHERE brand IS NOT NULL) as total_brands,
          (SELECT COUNT(*) FROM products WHERE id IN (SELECT DISTINCT product_id FROM offers WHERE in_stock = true)) as in_stock_products
        FROM products;
      `, { type: this.model.sequelize.QueryTypes.SELECT });
      
      const categoryStats = await this.model.sequelize.query(`
        SELECT 
          c.id, 
          c.name, 
          COUNT(p.id) as product_count,
          MIN(o.price) as min_price,
          MAX(o.price) as max_price,
          AVG(o.price) as avg_price
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        LEFT JOIN offers o ON o.product_id = p.id
        GROUP BY c.id, c.name
        ORDER BY product_count DESC
        LIMIT 5;
      `, { type: this.model.sequelize.QueryTypes.SELECT });
      
      res.status(200).json({
        status: 'success',
        data: {
          stats: stats[0],
          topCategories: categoryStats
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new ProductController();
