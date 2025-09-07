const { Op } = require('sequelize');
const BaseController = require('./baseController');
const { Category, Product } = require('../models');
const AppError = require('../utils/appError');

class CategoryController extends BaseController {
  constructor() {
    super(Category);
  }

  // Récupérer toutes les catégories avec une structure hiérarchique
  getAllCategories = async (req, res, next) => {
    try {
      const categories = await Category.findAll({
        attributes: ['id', 'name', 'slug', 'description', 'parent_id', 'level', 'image_url', 'product_count'],
        order: [['level', 'ASC'], ['name', 'ASC']]
      });

      // Construire la structure hiérarchique
      const buildTree = (categories, parentId = null) => {
        const tree = [];
        
        categories
          .filter(cat => cat.parent_id === parentId)
          .forEach(cat => {
            const children = buildTree(categories, cat.id);
            if (children.length > 0) {
              cat.children = children;
            }
            tree.push(cat);
          });
          
        return tree;
      };

      const hierarchicalCategories = buildTree(categories);

      res.status(200).json({
        status: 'success',
        results: categories.length,
        data: {
          categories: hierarchicalCategories
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Récupérer une catégorie avec ses sous-catégories et produits
  getCategory = async (req, res, next) => {
    try {
      const category = await Category.findByPk(req.params.id, {
        include: [
          {
            model: Category,
            as: 'children',
            attributes: ['id', 'name', 'slug', 'description', 'image_url', 'product_count'],
            order: [['name', 'ASC']]
          },
          {
            model: Product,
            as: 'products',
            attributes: ['id', 'name', 'slug', 'image_url'],
            include: [
              {
                model: 'offers',
                as: 'offers',
                attributes: ['price', 'original_price', 'currency'],
                order: [['price', 'ASC']],
                limit: 1
              }
            ],
            limit: 10
          }
        ]
      });

      if (!category) {
        return next(new AppError('Aucune catégorie trouvée avec cet ID', 404));
      }

      // Récupérer les catégories parentes (breadcrumb)
      let parentCategories = [];
      if (category.parent_id) {
        parentCategories = await this.getParentCategories(category.parent_id);
      }

      res.status(200).json({
        status: 'success',
        data: {
          category: {
            ...category.toJSON(),
            breadcrumb: [...parentCategories.reverse(), { id: category.id, name: category.name, slug: category.slug }]
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Récupérer les catégories parentes récursivement
  getParentCategories = async (categoryId, parents = []) => {
    const category = await Category.findByPk(categoryId, {
      attributes: ['id', 'name', 'slug', 'parent_id']
    });

    if (!category) return parents;

    parents.push({
      id: category.id,
      name: category.name,
      slug: category.slug
    });

    if (category.parent_id) {
      return this.getParentCategories(category.parent_id, parents);
    }

    return parents;
  };

  // Récupérer les produits d'une catégorie
  getCategoryProducts = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 24, sort = 'newest', minPrice, maxPrice } = req.query;

      // Vérifier que la catégorie existe
      const category = await Category.findByPk(id);
      if (!category) {
        return next(new AppError('Aucune catégorie trouvée avec cet ID', 404));
      }

      // Trouver tous les IDs de catégories enfants
      const categoryIds = await this.getCategoryIds(id);
      categoryIds.push(parseInt(id));

      // Construire la requête
      const query = {
        where: {
          category_id: { [Op.in]: categoryIds }
        },
        include: [
          {
            model: 'offers',
            as: 'offers',
            attributes: ['price', 'original_price', 'currency', 'in_stock'],
            where: {},
            required: true
          }
        ],
        distinct: true
      };

      // Filtrer par prix
      if (minPrice || maxPrice) {
        query.include[0].where.price = {};
        if (minPrice) query.include[0].where.price[Op.gte] = parseFloat(minPrice);
        if (maxPrice) query.include[0].where.price[Op.lte] = parseFloat(maxPrice);
      }

      // Trier les résultats
      switch (sort) {
        case 'price_asc':
          query.order = [[{ model: 'offers', as: 'offers' }, 'price', 'ASC']];
          break;
        case 'price_desc':
          query.order = [[{ model: 'offers', as: 'offers' }, 'price', 'DESC']];
          break;
        case 'name_asc':
          query.order = [['name', 'ASC']];
          break;
        case 'name_desc':
          query.order = [['name', 'DESC']];
          break;
        case 'discount':
          // Trier par remise (nécessite une sous-requête ou une vue matérialisée)
          query.order = [['discount_percentage', 'DESC']];
          break;
        case 'newest':
        default:
          query.order = [['created_at', 'DESC']];
      }

      // Pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query.limit = parseInt(limit);
      query.offset = offset;

      const { count, rows: products } = await Product.findAndCountAll(query);
      const totalPages = Math.ceil(count / parseInt(limit));

      res.status(200).json({
        status: 'success',
        results: products.length,
        total: count,
        totalPages,
        currentPage: parseInt(page),
        data: {
          products,
          category: {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Récupérer récursivement tous les IDs des sous-catégories
  getCategoryIds = async (categoryId) => {
    const subCategories = await Category.findAll({
      where: { parent_id: categoryId },
      attributes: ['id']
    });

    let ids = [];
    for (const subCat of subCategories) {
      ids.push(subCat.id);
      const subIds = await this.getCategoryIds(subCat.id);
      ids = [...ids, ...subIds];
    }

    return ids;
  };

  // Créer une nouvelle catégorie
  createCategory = async (req, res, next) => {
    try {
      const { name, parent_id } = req.body;
      
      // Vérifier si la catégorie parente existe
      let level = 1;
      if (parent_id) {
        const parentCategory = await Category.findByPk(parent_id);
        if (!parentCategory) {
          return next(new AppError('La catégorie parente spécifiée n\'existe pas', 400));
        }
        level = parentCategory.level + 1;
      }

      // Créer la catégorie
      const category = await Category.create({
        ...req.body,
        level,
        slug: this.generateSlug(name)
      });

      res.status(201).json({
        status: 'success',
        data: {
          category
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Mettre à jour une catégorie
  updateCategory = async (req, res, next) => {
    try {
      const category = await Category.findByPk(req.params.id);
      if (!category) {
        return next(new AppError('Aucune catégorie trouvée avec cet ID', 404));
      }

      // Si le parent est modifié, mettre à jour le niveau et les niveaux des enfants
      if (req.body.parent_id && req.body.parent_id !== category.parent_id) {
        const parentCategory = await Category.findByPk(req.body.parent_id);
        if (!parentCategory) {
          return next(new AppError('La catégorie parente spécifiée n\'existe pas', 400));
        }

        const newLevel = parentCategory.level + 1;
        const levelDiff = newLevel - category.level;

        // Mettre à jour le niveau de cette catégorie et de toutes ses sous-catégories
        await this.updateCategoryLevels(category.id, levelDiff);
      }

      // Mettre à jour la catégorie
      const [updated] = await Category.update(
        { 
          ...req.body,
          slug: req.body.name ? this.generateSlug(req.body.name) : undefined 
        },
        { 
          where: { id: req.params.id },
          returning: true,
          individualHooks: true
        }
      );

      if (!updated) {
        return next(new AppError('Échec de la mise à jour de la catégorie', 500));
      }

      const updatedCategory = await Category.findByPk(req.params.id);

      res.status(200).json({
        status: 'success',
        data: {
          category: updatedCategory
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Mettre à jour les niveaux des sous-catégories de manière récursive
  updateCategoryLevels = async (categoryId, levelDiff) => {
    const category = await Category.findByPk(categoryId);
    if (!category) return;

    // Mettre à jour le niveau de la catégorie actuelle
    const newLevel = category.level + levelDiff;
    await category.update({ level: newLevel });

    // Mettre à jour les sous-catégories
    const subCategories = await Category.findAll({
      where: { parent_id: categoryId }
    });

    for (const subCat of subCategories) {
      await this.updateCategoryLevels(subCat.id, levelDiff);
    }
  };

  // Supprimer une catégorie
  deleteCategory = async (req, res, next) => {
    try {
      const transaction = await this.model.sequelize.transaction();
      
      try {
        const category = await this.model.findByPk(req.params.id, { transaction });
        if (!category) {
          await transaction.rollback();
          return next(new AppError('Aucune catégorie trouvée avec cet ID', 404));
        }

        // Vérifier s'il y a des sous-catégories
        const subCategories = await this.model.count({
          where: { parent_id: req.params.id },
          transaction
        });

        if (subCategories > 0) {
          await transaction.rollback();
          return next(new AppError('Impossible de supprimer une catégorie ayant des sous-catégories', 400));
        }

        // Vérifier s'il y a des produits dans cette catégorie
        const productCount = await Product.count({
          where: { category_id: req.params.id },
          transaction
        });

        if (productCount > 0) {
          await transaction.rollback();
          return next(new AppError('Impossible de supprimer une catégorie contenant des produits', 400));
        }

        // Supprimer la catégorie
        await category.destroy({ transaction });
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

  // Générer un slug à partir d'un nom
  generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Supprimer les caractères spéciaux
      .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
      .replace(/--+/g, '-') // Remplacer les tirets multiples par un seul
      .trim();
  };

  // Récupérer les statistiques des catégories
  getCategoryStats = async (req, res, next) => {
    try {
      const stats = await this.model.sequelize.query(`
        SELECT 
          c.id,
          c.name,
          c.slug,
          c.level,
          COUNT(DISTINCT p.id) as product_count,
          COUNT(DISTINCT o.id) as offer_count,
          MIN(o.price) as min_price,
          MAX(o.price) as max_price,
          AVG(o.price) as avg_price,
          COUNT(DISTINCT p.brand) as brand_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        LEFT JOIN offers o ON o.product_id = p.id
        GROUP BY c.id, c.name, c.slug, c.level
        ORDER BY product_count DESC;
      `, { type: this.model.sequelize.QueryTypes.SELECT });

      res.status(200).json({
        status: 'success',
        results: stats.length,
        data: {
          stats
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new CategoryController();
