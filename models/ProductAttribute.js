const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductAttribute = sequelize.define('ProductAttribute', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  display_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true
  },
  group: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_filterable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  data_type: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'date', 'url'),
    defaultValue: 'string'
  }
}, {
  tableName: 'product_attributes',
  timestamps: true,
  indexes: [
    {
      fields: ['product_id']
    },
    {
      fields: ['name']
    },
    {
      fields: ['group']
    },
    {
      fields: ['is_filterable']
    },
    {
      fields: ['is_visible']
    },
    {
      fields: ['position']
    }
  ]
});

// Relations
ProductAttribute.associate = (models) => {
  ProductAttribute.belongsTo(models.Product, {
    foreignKey: 'product_id',
    as: 'product'
  });
};

// Hooks
ProductAttribute.beforeSave((attribute, options) => {
  // S'assurer que le display_name n'est pas vide
  if (!attribute.display_name) {
    attribute.display_name = attribute.name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // Nettoyer la valeur en fonction du type de données
  if (attribute.data_type === 'number' && typeof attribute.value === 'string') {
    attribute.value = parseFloat(attribute.value.replace(/[^0-9.,]/g, '').replace(',', '.'));
  } else if (attribute.data_type === 'boolean') {
    attribute.value = !!attribute.value && attribute.value !== 'false' && attribute.value !== '0';
  }
});

module.exports = ProductAttribute;
