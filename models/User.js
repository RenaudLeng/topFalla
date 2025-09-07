const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sequelize = require('../config/database');

class User extends Model {
  // Vérifier si le mot de passe fourni correspond au mot de passe haché
  async correctPassword(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
  }

  // Vérifier si l'utilisateur a changé son mot de passe après l'émission du token
  changedPasswordAfter(JWTTimestamp) {
    if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
      return JWTTimestamp < changedTimestamp;
    }
    return false;
  }

  // Créer un token de réinitialisation de mot de passe
  createPasswordResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    return resetToken;
  }

  // Créer un token de vérification d'email
  createEmailVerificationToken() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    this.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 heures
    
    return verificationToken;
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      isEmail: true
    }
  },
  photo: {
    type: DataTypes.STRING,
    defaultValue: 'default.jpg'
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'moderator'),
    defaultValue: 'user'
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    select: false
  },
  passwordConfirm: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      // Cette validation ne fonctionne que sur CREATE et SAVE !
      validator: function(el) {
        return el === this.password;
      },
      message: 'Les mots de passe ne correspondent pas!'
    }
  },
  passwordChangedAt: DataTypes.DATE,
  passwordResetToken: DataTypes.STRING,
  passwordResetExpires: DataTypes.DATE,
  emailVerificationToken: DataTypes.STRING,
  emailVerificationExpires: DataTypes.DATE,
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    select: false
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  underscored: true,
  hooks: {
    // Hachage du mot de passe avant la création de l'utilisateur
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
        user.passwordConfirm = undefined; // Ne pas stocker la confirmation
      }
    },
    // Mise à jour du timestamp de changement de mot de passe
    beforeUpdate: async (user) => {
      if (user.changed('password') && !user.isNewRecord) {
        user.passwordChangedAt = Date.now() - 1000; // 1 seconde en arrière pour s'assurer que le token est émis après
      }
    }
  }
});

module.exports = User;
