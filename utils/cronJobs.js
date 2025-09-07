const cron = require('node-cron');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { User, PasswordResetToken, EmailVerificationToken, Product, Offer, Review } = require('../models');
const { logger } = require('./logger');
const { deleteFile } = require('./uploadHandler');
const Email = require('./email');

class CronJobs {
  constructor() {
    this.jobs = [];
  }

  /**
   * Initialise tous les jobs planifiés
   */
  init() {
    // Nettoyage des tokens de réinitialisation de mot de passe expirés (toutes les heures)
    this.schedule('0 * * * *', 'cleanup-expired-password-reset-tokens', this.cleanupExpiredPasswordResetTokens);
    
    // Nettoyage des tokens de vérification d'email expirés (toutes les 6 heures)
    this.schedule('0 */6 * * *', 'cleanup-expired-email-verification-tokens', this.cleanupExpiredEmailVerificationTokens);
    
    // Mise à jour des prix des offres (toutes les 12 heures)
    this.schedule('0 */12 * * *', 'update-offer-prices', this.updateOfferPrices);
    
    // Nettoyage des fichiers temporaires (tous les jours à minuit)
    this.schedule('0 0 * * *', 'cleanup-temp-files', this.cleanupTempFiles);
    
    // Envoi des rappels de panier abandonné (tous les jours à 10h)
    this.schedule('0 10 * * *', 'send-abandoned-cart-reminders', this.sendAbandonedCartReminders);
    
    // Nettoyage des logs anciens (tous les dimanches à minuit)
    this.schedule('0 0 * * 0', 'cleanup-old-logs', this.cleanupOldLogs);
    
    // Sauvegarde de la base de données (tous les jours à 2h du matin)
    this.schedule('0 2 * * *', 'backup-database', this.backupDatabase);
    
    logger.info(`🚀 ${this.jobs.length} tâches planifiées ont été initialisées`);
  }

  /**
   * Planifie une tâche récurrente
   * @param {string} schedule - Expression cron
   * @param {string} name - Nom de la tâche
   * @param {Function} task - Fonction à exécuter
   */
  schedule(schedule, name, task) {
    const job = cron.schedule(schedule, async () => {
      const startTime = Date.now();
      logger.info(`🚀 Début de la tâche planifiée: ${name}`);
      
      try {
        await task();
        const duration = (Date.now() - startTime) / 1000;
        logger.info(`✅ Tâche ${name} terminée avec succès en ${duration.toFixed(2)}s`);
      } catch (error) {
        logger.error(`❌ Erreur lors de l'exécution de la tâche ${name}:`, error);
      }
    }, {
      scheduled: true,
      timezone: 'Africa/Douala' // Fuseau horaire du Cameroun
    });

    this.jobs.push({
      name,
      schedule,
      task: job
    });
  }

  /**
   * Nettoie les tokens de réinitialisation de mot de passe expirés
   */
  async cleanupExpiredPasswordResetTokens() {
    const result = await PasswordResetToken.destroy({
      where: {
        expiresAt: { [Op.lt]: new Date() }
      }
    });
    
    logger.info(`Supprimé ${result} tokens de réinitialisation de mot de passe expirés`);
  }

  /**
   * Nettoie les tokens de vérification d'email expirés
   */
  async cleanupExpiredEmailVerificationTokens() {
    const result = await EmailVerificationToken.destroy({
      where: {
        expiresAt: { [Op.lt]: new Date() }
      }
    });
    
    logger.info(`Supprimé ${result} tokens de vérification d'email expirés`);
  }

  /**
   * Met à jour les prix des offres en fonction des fournisseurs
   */
  async updateOfferPrices() {
    // Implémentation de la logique de mise à jour des prix
    // Cette méthode devrait être personnalisée en fonction de votre logique métier
    logger.info('Mise à jour des prix des offres en cours...');
    
    // Exemple: Mettre à jour les prix pour les offres actives
    const updatedOffers = await Offer.update(
      { 
        // Logique de mise à jour des prix
        // Par exemple, appliquer une augmentation de 2% aux prix
        price: sequelize.literal('price * 1.02'),
        lastPriceUpdate: new Date()
      },
      {
        where: {
          isActive: true
        },
        returning: true
      }
    );
    
    logger.info(`Mise à jour de ${updatedOffers[0]} offres terminée`);
  }

  /**
   * Nettoie les fichiers temporaires
   */
  async cleanupTempFiles() {
    const tempDir = path.join(__dirname, '../temp');
    
    if (!fs.existsSync(tempDir)) {
      return logger.info('Le répertoire temporaire n\'existe pas');
    }
    
    const files = fs.readdirSync(tempDir);
    let deletedFiles = 0;
    
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      // Supprimer les fichiers de plus de 24 heures
      if (Date.now() - stats.mtimeMs > 24 * 60 * 60 * 1000) {
        try {
          fs.unlinkSync(filePath);
          deletedFiles++;
        } catch (error) {
          logger.error(`Erreur lors de la suppression du fichier ${filePath}:`, error);
        }
      }
    });
    
    logger.info(`Nettoyage des fichiers temporaires: ${deletedFiles} fichiers supprimés`);
  }

  /**
   * Envoie des rappels pour les paniers abandonnés
   */
  async sendAbandonedCartReminders() {
    // Récupérer les utilisateurs avec un panier abandonné depuis plus de 24h
    const usersWithAbandonedCarts = await User.findAll({
      where: {
        lastCartActivity: {
          [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Plus de 24h
          [Op.ne]: null // Panier non vide
        },
        lastCartReminderSent: {
          [Op.or]: [
            { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Dernier rappel il y a plus de 24h
            { [Op.eq]: null } // Ou jamais de rappel envoyé
          ]
        }
      },
      include: [{
        model: Product,
        as: 'cartItems',
        through: { attributes: ['quantity'] }
      }]
    });
    
    logger.info(`Envoi de ${usersWithAbandonedCarts.length} rappels de panier abandonné`);
    
    // Envoyer un email à chaque utilisateur
    for (const user of usersWithAbandonedCarts) {
      try {
        const email = new Email(user, `${process.env.FRONTEND_URL}/cart`);
        await email.sendAbandonedCartReminder(user.cartItems);
        
        // Mettre à jour la date du dernier rappel
        await user.update({ lastCartReminderSent: new Date() });
      } catch (error) {
        logger.error(`Erreur lors de l'envoi du rappel à ${user.email}:`, error);
      }
    }
  }

  /**
   * Nettoie les anciens fichiers de logs
   */
  async cleanupOldLogs() {
    const logsDir = path.join(__dirname, '../logs');
    const maxLogAge = 30 * 24 * 60 * 60 * 1000; // 30 jours en millisecondes
    
    if (!fs.existsSync(logsDir)) {
      return logger.info('Le répertoire de logs n\'existe pas');
    }
    
    const files = fs.readdirSync(logsDir);
    let deletedFiles = 0;
    
    files.forEach(file => {
      if (file.endsWith('.log')) {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        
        // Ne pas supprimer les fichiers de logs des 30 derniers jours
        if (Date.now() - stats.mtimeMs > maxLogAge) {
          try {
            fs.unlinkSync(filePath);
            deletedFiles++;
          } catch (error) {
            logger.error(`Erreur lors de la suppression du fichier de log ${filePath}:`, error);
          }
        }
      }
    });
    
    logger.info(`Nettoyage des anciens logs: ${deletedFiles} fichiers supprimés`);
  }

  /**
   * Effectue une sauvegarde de la base de données
   */
  async backupDatabase() {
    const backupDir = path.join(__dirname, '../backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
    
    // Créer le répertoire de sauvegarde s'il n'existe pas
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Commande pour sauvegarder la base de données MySQL
    // Note: Cette commande nécessite que mysqldump soit installé sur le serveur
    const { exec } = require('child_process');
    const { DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    
    const command = `mysqldump -u ${DB_USER} -p"${DB_PASSWORD}" ${DB_NAME} > ${backupFile}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error('Erreur lors de la sauvegarde de la base de données:', error);
        return;
      }
      
      if (stderr) {
        logger.warn('Avertissements lors de la sauvegarde:', stderr);
      }
      
      logger.info(`Sauvegarde de la base de données terminée: ${backupFile}`);
      
      // Supprimer les anciennes sauvegardes (conserver les 5 dernières)
      this.cleanupOldBackups(backupDir, 5);
    });
  }
  
  /**
   * Nettoie les anciennes sauvegardes
   * @param {string} backupDir - Répertoire des sauvegardes
   * @param {number} keepCount - Nombre de sauvegardes à conserver
   */
  cleanupOldBackups(backupDir, keepCount = 5) {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    // Supprimer les sauvegardes excédentaires
    for (let i = keepCount; i < files.length; i++) {
      try {
        fs.unlinkSync(files[i].path);
        logger.info(`Ancienne sauvegarde supprimée: ${files[i].name}`);
      } catch (error) {
        logger.error(`Erreur lors de la suppression de ${files[i].path}:`, error);
      }
    }
  }
  
  /**
   * Arrête tous les jobs planifiés
   */
  stopAll() {
    this.jobs.forEach(job => job.task.stop());
    logger.info('Tous les jobs planifiés ont été arrêtés');
  }
}

// Exporter une instance unique
module.exports = new CronJobs();
