const { Op } = require('sequelize');

class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // 1A) Filtrage de base
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 1B) Filtrage avancé
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    // Conversion des opérateurs pour Sequelize
    const where = {};
    const queryFilters = JSON.parse(queryStr);
    
    for (const [key, value] of Object.entries(queryFilters)) {
      if (typeof value === 'object' && value !== null) {
        where[key] = {};
        for (const [op, val] of Object.entries(value)) {
          switch (op) {
            case '$gte':
              where[key][Op.gte] = val;
              break;
            case '$gt':
              where[key][Op.gt] = val;
              break;
            case '$lte':
              where[key][Op.lte] = val;
              break;
            case '$lt':
              where[key][Op.lt] = val;
              break;
            case '$ne':
              where[key][Op.ne] = val;
              break;
            case '$like':
              where[key][Op.like] = `%${val}%`;
              break;
            case '$ilike':
              where[key][Op.iLike] = `%${val}%`;
              break;
            case '$in':
              where[key][Op.in] = Array.isArray(val) ? val : [val];
              break;
            case '$notIn':
              where[key][Op.notIn] = Array.isArray(val) ? val : [val];
              break;
            case '$between':
              where[key][Op.between] = val;
              break;
            case '$notBetween':
              where[key][Op.notBetween] = val;
              break;
            default:
              where[key] = { [op]: val };
          }
        }
      } else {
        where[key] = value;
      }
    }

    this.query = { ...this.query, where };
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const order = [];
      const sortFields = this.queryString.sort.split(',');
      
      sortFields.forEach(field => {
        if (field.startsWith('-')) {
          order.push([field.slice(1), 'DESC']);
        } else {
          order.push([field, 'ASC']);
        }
      });
      
      this.query.order = order;
    } else {
      // Tri par défaut
      this.query.order = [['createdAt', 'DESC']];
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const attributes = this.queryString.fields.split(',');
      this.query.attributes = attributes;
    } else {
      // Par défaut, exclure les champs sensibles
      this.query.attributes = { exclude: ['password', 'passwordChangedAt', 'passwordResetToken', 'passwordResetExpires'] };
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const offset = (page - 1) * limit;

    this.query.offset = offset;
    this.query.limit = limit;
    this.query.page = page;

    return this;
  }

  search(fields) {
    if (this.queryString.search && fields && fields.length > 0) {
      const searchConditions = fields.map(field => ({
        [field]: { [Op.like]: `%${this.queryString.search}%` }
      }));
      
      if (!this.query.where) {
        this.query.where = {};
      }
      
      if (this.query.where[Op.and]) {
        this.query.where[Op.and].push({ [Op.or]: searchConditions });
      } else if (Object.keys(this.query.where).length > 0) {
        this.query.where = {
          [Op.and]: [
            this.query.where,
            { [Op.or]: searchConditions }
          ]
        };
      } else {
        this.query.where = { [Op.or]: searchConditions };
      }
    }

    return this;
  }

  include(associations) {
    if (associations && associations.length > 0) {
      this.query.include = associations;
    }
    return this;
  }

  async getResults() {
    // Exécuter la requête avec les paramètres construits
    const results = await this.query;
    
    // Si c'est une requête paginée, renvoyer les métadonnées
    if (this.query.offset !== undefined && this.query.limit !== undefined) {
      const total = await this.query.model.count({ where: this.query.where });
      const totalPages = Math.ceil(total / this.query.limit);
      
      return {
        results,
        page: this.query.page,
        limit: this.query.limit,
        total,
        totalPages
      };
    }
    
    return results;
  }
}

module.exports = APIFeatures;
