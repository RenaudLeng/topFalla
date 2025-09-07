const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Merchant = sequelize.define('Merchant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  website_url: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  logo_url: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
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
  commission_rate: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  contact_email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  postal_code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tax_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  terms_accepted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  last_sync: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'merchants',
  timestamps: true,
  indexes: [
    {
      fields: ['slug'],
      unique: true
    },
    {
      fields: ['name']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['rating']
    }
  ]
});

// Relations
Merchant.associate = (models) => {
  Merchant.hasMany(models.Product, {
    foreignKey: 'merchant_id',
    as: 'products'
  });
  
  Merchant.hasMany(models.Offer, {
    foreignKey: 'merchant_id',
    as: 'offers'
  });
};

module.exports = Merchant;
