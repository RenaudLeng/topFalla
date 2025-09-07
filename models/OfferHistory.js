const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OfferHistory = sequelize.define('OfferHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  offer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'offers',
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
  in_stock: {
    type: DataTypes.BOOLEAN,
    allowNull: false
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
  price_change: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  price_change_percentage: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  is_lowest_price: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'offer_histories',
  timestamps: true,
  indexes: [
    {
      fields: ['offer_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['price']
    },
    {
      fields: ['is_lowest_price']
    }
  ]
});

// Relations
OfferHistory.associate = (models) => {
  OfferHistory.belongsTo(models.Offer, {
    foreignKey: 'offer_id',
    as: 'offer'
  });
};

// Hooks
OfferHistory.beforeCreate(async (history, options) => {
  if (history.isNewRecord) {
    // Trouver la dernière entrée d'historique pour cette offre
    const lastHistory = await OfferHistory.findOne({
      where: { offer_id: history.offer_id },
      order: [['created_at', 'DESC']]
    });

    if (lastHistory) {
      // Calculer la variation de prix
      history.price_change = history.price - lastHistory.price;
      
      if (lastHistory.price > 0) {
        history.price_change_percentage = ((history.price - lastHistory.price) / lastHistory.price) * 100;
      }
      
      // Vérifier si c'est le prix le plus bas
      const lowestPrice = await OfferHistory.min('price', {
        where: { offer_id: history.offer_id }
      });
      
      history.is_lowest_price = history.price <= (lowestPrice || Infinity);
    } else {
      // Première entrée d'historique
      history.is_lowest_price = true;
    }
  }
});

module.exports = OfferHistory;
