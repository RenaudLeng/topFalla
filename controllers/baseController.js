const { Op } = require('sequelize');
const AppError = require('../utils/appError');

class BaseController {
  constructor(model) {
    this.model = model;
  }

  // Créer un nouvel enregistrement
  createOne = async (req, res, next) => {
    try {
      const doc = await this.model.create(req.body);
      res.status(201).json({
        status: 'success',
        data: {
          data: doc
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Récupérer tous les enregistrements avec pagination et filtrage
  getAll = async (req, res, next) => {
    try {
      // 1) Filtrage de base
      const queryObj = { ...req.query };
      const excludedFields = ['page', 'sort', 'limit', 'fields'];
      excludedFields.forEach(el => delete queryObj[el]);

      // 2) Filtrage avancé (gte, gt, lte, lt)
      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
      
      let where = JSON.parse(queryStr);
      
      // 3) Gestion des champs de recherche
      if (req.query.search) {
        where = {
          ...where,
          [Op.or]: [
            { name: { [Op.iLike]: `%${req.query.search}%` } },
            { description: { [Op.iLike]: `%${req.query.search}%` } }
          ]
        };
      }

      let query = { where };

      // 4) Tri
      if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query.order = sortBy.split(',').map(sort => {
          const [field, order] = sort.split(':');
          return [field, order || 'ASC'];
        });
      } else {
        query.order = [['createdAt', 'DESC']];
      }

      // 5) Limitation des champs
      if (req.query.fields) {
        const fields = req.query.fields.split(',').join(' ');
        query.attributes = fields.split(',');
      }

      // 6) Pagination
      const page = req.query.page * 1 || 1;
      const limit = req.query.limit * 1 || 100;
      const offset = (page - 1) * limit;
      
      query.limit = limit;
      query.offset = offset;

      // 7) Exécution de la requête
      const { count, rows: data } = await this.model.findAndCountAll(query);
      
      // 8) Vérifier si la page demandée dépasse le nombre total de pages
      const totalPages = Math.ceil(count / limit);
      if (page > totalPages && totalPages > 0) {
        return next(new AppError('Cette page n\'existe pas', 404));
      }

      res.status(200).json({
        status: 'success',
        results: data.length,
        total: count,
        totalPages,
        currentPage: page,
        data: {
          data
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Récupérer un enregistrement par son ID
  getOne = async (req, res, next) => {
    try {
      const doc = await this.model.findByPk(req.params.id);

      if (!doc) {
        return next(new AppError('Aucun document trouvé avec cet ID', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          data: doc
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Mettre à jour un enregistrement
  updateOne = async (req, res, next) => {
    try {
      const [updated] = await this.model.update(req.body, {
        where: { id: req.params.id },
        returning: true,
        plain: true
      });

      if (!updated) {
        return next(new AppError('Aucun document trouvé avec cet ID', 404));
      }

      const doc = await this.model.findByPk(req.params.id);

      res.status(200).json({
        status: 'success',
        data: {
          data: doc
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Supprimer un enregistrement
  deleteOne = async (req, res, next) => {
    try {
      const doc = await this.model.destroy({
        where: { id: req.params.id }
      });

      if (!doc) {
        return next(new AppError('Aucun document trouvé avec cet ID', 404));
      }

      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = BaseController;
