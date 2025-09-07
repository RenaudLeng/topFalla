const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Offer = sequelize.define('Offer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  merchant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'merchants',
      key: 'id'
    }
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
    defaultValue: 'EUR',
    allowNull: false
  },
  in_stock: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  stock_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  shipping_cost: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  free_shipping: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  delivery_time: {
    type: DataTypes.STRING,
    allowNull: true
  },
  condition: {
    type: DataTypes.ENUM('new', 'refurbished', 'used'),
    defaultValue: 'new'
  },
  warranty: {
    type: DataTypes.STRING,
    allowNull: true
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isUrl: true
    }
  },
  affiliate_url: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_updated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  discount_percentage: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.original_price || this.original_price <= this.price) {
        return 0;
      }
      return Math.round(((this.original_price - this.price) / this.original_price) * 100);
    }
  },
  total_price: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.price + (this.free_shipping ? 0 : (this.shipping_cost || 0));
    }
  }
}, {
  tableName: 'offers',
  timestamps: true,
  indexes: [
    {
      fields: ['product_id']
    },
    {
      fields: ['merchant_id']
    },
    {
      fields: ['price']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['in_stock']
    },
    {
      fields: ['last_updated']
    }
  ]
});

// Relations
Offer.associate = (models) => {
  Offer.belongsTo(models.Product, {
    foreignKey: 'product_id',
    as: 'product'
  });
  
  Offer.belongsTo(models.Merchant, {
    foreignKey: 'merchant_id',
    as: 'merchant'
  });
  
  Offer.hasMany(models.OfferHistory, {
    foreignKey: 'offer_id',
    as: 'history'
  });
};

// Hooks
Offer.afterUpdate(async (offer, options) => {
  // Enregistrer l'historique des prix
  if (offer.changed('price') || offer.changed('stock_status')) {
    try {
      await offer.createHistory({
        price: offer.price,
        original_price: offer.original_price,
        in_stock: offer.in_stock,
        stock_quantity: offer.stock_quantity,
        shipping_cost: offer.shipping_cost,
        free_shipping: offer.free_shipping
      });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'historique de l\'offre:', error);
    }
  }
});

module.exports = Offer;
