const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name ? user.name.split(' ')[0] : 'Utilisateur';
    this.url = url;
    this.from = `TopFalla <${process.env.EMAIL_FROM}>`;
  }

  // Créer un transporteur différent selon l'environnement
  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Utiliser SendGrid pour la production
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    // Utiliser Mailtrap pour le développement
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // Rendre le template PUG en HTML
  async renderTemplate(template, data = {}) {
    const templatePath = `${__dirname}/../views/emails/${template}.pug`;
    const html = pug.renderFile(templatePath, {
      firstName: this.firstName,
      url: this.url,
      ...data
    });
    return html;
  }

  // Envoyer l'email
  async send(template, subject, data = {}) {
    try {
      // 1) Rendre le template HTML basé sur un template Pug
      const html = await this.renderTemplate(template, data);

      // 2) Définir les options de l'email
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: htmlToText(html, {
          wordwrap: 130
        })
      };

      // 3) Créer un transport et envoyer l'email
      await this.newTransport().sendMail(mailOptions);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      throw error;
    }
  }

  // Email de bienvenue
  async sendWelcome() {
    await this.send('welcome', 'Bienvenue sur TopFalla !');
  }

  // Email de réinitialisation de mot de passe
  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Votre lien de réinitialisation de mot de passe (valable 10 minutes)'
    );
  }

  // Email de vérification d'adresse email
  async sendEmailVerification() {
    await this.send(
      'verifyEmail',
      'Veuvez vérifier votre adresse email pour TopFalla'
    );
  }

  // Notification de nouvelle commande
  async sendOrderConfirmation(order) {
    await this.send(
      'orderConfirmation',
      'Confirmation de votre commande',
      { order }
    );
  }

  // Notification d'expédition
  async sendShippingConfirmation(trackingNumber, estimatedDelivery) {
    await this.send(
      'shippingConfirmation',
      'Votre commande a été expédiée !',
      { trackingNumber, estimatedDelivery }
    );
  }

  // Notification de livraison
  async sendDeliveryConfirmation() {
    await this.send(
      'deliveryConfirmation',
      'Votre commande a été livrée !'
    );
  }

  // Notification d'annulation de commande
  async sendOrderCancellation(reason) {
    await this.send(
      'orderCancellation',
      'Votre commande a été annulée',
      { reason }
    );
  }

  // Notification de remboursement
  async sendRefundConfirmation(amount, orderId) {
    await this.send(
      'refundConfirmation',
      'Votre remboursement a été traité',
      { amount, orderId }
    );
  }

  // Notification de compte mis à jour
  async sendAccountUpdateNotification(changes) {
    await this.send(
      'accountUpdate',
      'Mise à jour de votre compte TopFalla',
      { changes }
    );
  }

  // Notification de sécurité (connexion suspecte)
  async sendSecurityAlert(ip, device, location) {
    await this.send(
      'securityAlert',
      'Alerte de sécurité : connexion suspecte détectée',
      { ip, device, location }
    );
  }

  // Notification de promotion spéciale
  async sendSpecialOffer(offerDetails) {
    await this.send(
      'specialOffer',
      'Offre spéciale pour vous !',
      { offerDetails }
    );
  }

  // Notification d'abandon de panier
  async sendCartReminder(cartItems) {
    await this.send(
      'cartReminder',
      'Vous avez oublié quelque chose dans votre panier',
      { cartItems }
    );
  }

  // Notification de retour de produit
  async sendReturnConfirmation(returnDetails) {
    await this.send(
      'returnConfirmation',
      'Confirmation de votre demande de retour',
      { returnDetails }
    );
  }

  // Notification de réapprovisionnement
  async sendBackInStockNotification(product) {
    await this.send(
      'backInStock',
      'Le produit que vous recherchez est de retour en stock !',
      { product }
    );
  }

  // Notification de réduction de prix
  async sendPriceDropNotification(product, oldPrice, newPrice) {
    await this.send(
      'priceDrop',
      'Prix réduit sur un produit de votre liste de souhaits',
      { product, oldPrice, newPrice }
    );
  }
};
