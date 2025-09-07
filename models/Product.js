const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  kelkoo_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  original_price: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  product_url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  merchant_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: true
  },
  availability: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  review_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  specifications: {
    type: DataTypes.JSON,
    allowNull: true
  },
  last_updated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'products',
  timestamps: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['kelkoo_id'],
      unique: true
    },
    {
      fields: ['category_id']
    },
    {
      fields: ['price']
    },
    {
      fields: ['brand']
    }
  ]
});

module.exports = Product;
