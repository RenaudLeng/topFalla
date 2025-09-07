const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductImage = sequelize.define('ProductImage', {
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
  url: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isUrl: true
    }
  },
  alt_text: {
    type: DataTypes.STRING,
    allowNull: true
  },
  width: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  size: {
    type: DataTypes.INTEGER,
    comment: 'Taille du fichier en octets',
    allowNull: true
  },
  format: {
    type: DataTypes.ENUM('jpg', 'jpeg', 'png', 'gif', 'webp'),
    allowNull: true
  },
  is_primary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  source: {
    type: DataTypes.STRING,
    comment: 'Source de l\'image (merchant, user, manufacturer, etc.)',
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'active', 'rejected'),
    defaultValue: 'pending'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  last_verified: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'product_images',
  timestamps: true,
  indexes: [
    {
      fields: ['product_id']
    },
    {
      fields: ['is_primary']
    },
    {
      fields: ['position']
    },
    {
      fields: ['status']
    },
    {
      fields: ['last_verified']
    }
  ]
});

// Relations
ProductImage.associate = (models) => {
  ProductImage.belongsTo(models.Product, {
    foreignKey: 'product_id',
    as: 'product'
  });
};

// Hooks
ProductImage.beforeSave(async (image, options) => {
  // S'assurer qu'il n'y a qu'une seule image principale par produit
  if (image.is_primary) {
    await ProductImage.update(
      { is_primary: false },
      {
        where: {
          product_id: image.product_id,
          id: { [sequelize.Op.ne]: image.id || null }
        },
        transaction: options.transaction
      }
    );
  }

  // Extraire les métadonnées de l'URL si nécessaire
  if (image.url && !image.format) {
    const match = image.url.match(/\.(jpg|jpeg|png|gif|webp)(?:\?.*)?$/i);
    if (match) {
      image.format = match[1].toLowerCase();
    }
  }
});

// Méthodes d'instance
ProductImage.prototype.getDimensions = function() {
  if (this.width && this.height) {
    return { width: this.width, height: this.height };
  }
  return null;
};

ProductImage.prototype.getAspectRatio = function() {
  if (this.width && this.height && this.height > 0) {
    return (this.width / this.height).toFixed(2);
  }
  return null;
};

ProductImage.prototype.getSizeInKB = function() {
  if (this.size) {
    return (this.size / 1024).toFixed(2);
  }
  return null;
};

module.exports = ProductImage;
