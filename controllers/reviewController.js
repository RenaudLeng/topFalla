const { Op, Sequelize } = require('sequelize');
const { Review, User, Product, Merchant, HelpfulReview, ReviewReport } = require('../models');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

class ReviewController {
  // Créer un nouvel avis
  createReview = catchAsync(async (req, res, next) => {
    const { rating, comment, title, isRecommended } = req.body;
    const { productId, merchantId } = req.params;
    const userId = req.user.id;

    // Vérifier qu'un seul ID est fourni (produit OU marchand)
    if ((!productId && !merchantId) || (productId && merchantId)) {
      return next(
        new AppError('Veuillez fournir un ID de produit OU un ID de marchand', 400)
      );
    }

    // Vérifier si l'utilisateur a déjà laissé un avis pour ce produit/marchand
    const existingReview = await Review.findOne({
      where: {
        user_id: userId,
        [Op.or]: [
          { product_id: productId || null },
          { merchant_id: merchantId || null }
        ]
      }
    });

    if (existingReview) {
      return next(
        new AppError('Vous avez déjà laissé un avis pour ce produit/marchand', 400)
      );
    }

    // Créer l'avis
    const review = await Review.create({
      user_id: userId,
      product_id: productId || null,
      merchant_id: merchantId || null,
      rating,
      title,
      comment,
      is_recommended: isRecommended,
      status: 'pending' // En attente de modération
    });

    // Mettre à jour la note moyenne du produit/marchand
    await this.updateAverageRating(productId, merchantId);

    res.status(201).json({
      status: 'success',
      data: {
        review
      }
    });
  });

  // Marquer un avis comme utile
  markHelpful = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { isHelpful = true } = req.body;
    const userId = req.user.id;

    const review = await Review.findByPk(id);

    if (!review) {
      return next(new AppError('Aucun avis trouvé avec cet ID', 404));
    }

    // Vérifier que l'utilisateur ne marque pas son propre avis
    if (review.user_id === userId) {
      return next(new AppError('Vous ne pouvez pas noter votre propre avis', 400));
    }

    // Vérifier si l'utilisateur a déjà marqué cet avis
    const existingHelpful = await HelpfulReview.findOne({
      where: { user_id: userId, review_id: id }
    });

    if (existingHelpful) {
      // Si l'utilisateur a déjà marqué cet avis, mettre à jour son vote
      if (existingHelpful.is_helpful !== isHelpful) {
        await existingHelpful.update({ is_helpful: isHelpful });
        
        // Mettre à jour les compteurs
        if (isHelpful) {
          await review.increment('helpful_count');
          await review.decrement('unhelpful_count');
        } else {
          await review.increment('unhelpful_count');
          await review.decrement('helpful_count');
        }
      }
    } else {
      // Sinon, créer un nouveau vote
      await HelpfulReview.create({
        user_id: userId,
        review_id: id,
        is_helpful: isHelpful
      });

      // Mettre à jour les compteurs
      if (isHelpful) {
        await review.increment('helpful_count');
      } else {
        await review.increment('unhelpful_count');
      }
    }

    // Rafraîchir l'avis pour obtenir les compteurs mis à jour
    const updatedReview = await Review.findByPk(id);

    res.status(200).json({
      status: 'success',
      data: {
        review: updatedReview
      }
    });
  });

  // Signaler un avis
  reportReview = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const review = await Review.findByPk(id);

    if (!review) {
      return next(new AppError('Aucun avis trouvé avec cet ID', 404));
    }

    // Vérifier que l'utilisateur ne signale pas son propre avis
    if (review.user_id === userId) {
      return next(new AppError('Vous ne pouvez pas signaler votre propre avis', 400));
    }

    // Vérifier si l'utilisateur a déjà signalé cet avis
    const existingReport = await ReviewReport.findOne({
      where: { user_id: userId, review_id: id }
    });

    if (existingReport) {
      return next(new AppError('Vous avez déjà signalé cet avis', 400));
    }

    // Créer le signalement
    await ReviewReport.create({
      user_id: userId,
      review_id: id,
      reason,
      status: 'pending'
    });

    // Incrémenter le compteur de signalements
    await review.increment('report_count');

    // Si le nombre de signalements dépasse un seuil, marquer comme en attente de modération
    if (review.report_count + 1 >= 5) {
      await review.update({ status: 'pending_review' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Avis signalé avec succès. Notre équipe va l\'examiner sous peu.'
    });
  });

  // Obtenir tous les avis (pour l'administration)
  getAllReviews = catchAsync(async (req, res, next) => {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;

    const { count, rows: reviews } = await Review.findAndCountAll({
      where,
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: Product, attributes: ['id', 'name'] },
        { model: Merchant, attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      status: 'success',
      results: reviews.length,
      total: count,
      data: {
        reviews
      }
    });
  });

  // Mettre à jour le statut d'un avis (pour l'administration)
  updateReviewStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const review = await Review.findByPk(id);
    if (!review) {
      return next(new AppError('Aucun avis trouvé avec cet ID', 404));
    }

    // Validation du statut
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return next(new AppError('Statut invalide', 400));
    }

    // Si le statut est rejeté, une raison est requise
    if (status === 'rejected' && !rejectionReason) {
      return next(new AppError('Une raison est requise pour rejeter un avis', 400));
    }

    await review.update({
      status,
      rejection_reason: status === 'rejected' ? rejectionReason : null,
      reviewed_at: new Date(),
      reviewed_by: req.user.id
    });

    // Si l'avis est approuvé, mettre à jour la note moyenne
    if (status === 'approved') {
      await this.updateAverageRating(review.product_id, review.merchant_id);
    }

    res.status(200).json({
      status: 'success',
      data: {
        review
      }
    });
  });

  // Obtenir un avis spécifique
  getReview = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const review = await Review.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: Product, as: 'product', attributes: ['id', 'name'], required: false },
        { model: Merchant, as: 'merchant', attributes: ['id', 'name'], required: false }
      ]
    });

    if (!review) {
      return next(new AppError('Aucun avis trouvé avec cet ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        review
      }
    });
  });

  // Mettre à jour un avis
  updateReview = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { rating, title, comment, isRecommended } = req.body;
    const userId = req.user.id;

    const review = await Review.findByPk(id);

    if (!review) {
      return next(new AppError('Aucun avis trouvé avec cet ID', 404));
    }

    // Vérifier que l'utilisateur est l'auteur de l'avis ou un administrateur
    if (review.user_id !== userId && req.user.role !== 'admin') {
      return next(
        new AppError('Vous n\'êtes pas autorisé à modifier cet avis', 403)
      );
    }

    // Mettre à jour l'avis
    const updatedReview = await review.update({
      rating: rating || review.rating,
      title: title || review.title,
      comment: comment || review.comment,
      is_recommended: isRecommended !== undefined ? isRecommended : review.is_recommended,
      status: 'pending', // Remettre en attente de modération après modification
      updated_at: new Date()
    });

    // Mettre à jour la note moyenne si le rating a changé
    if (rating && rating !== review.rating) {
      await this.updateAverageRating(updatedReview.product_id, updatedReview.merchant_id);
    }

    res.status(200).json({
      status: 'success',
      data: {
        review: updatedReview
      }
    });
  });

  // Supprimer un avis
  deleteReview = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;

    const review = await Review.findByPk(id);

    if (!review) {
      return next(new AppError('Aucun avis trouvé avec cet ID', 404));
    }

    // Vérifier que l'utilisateur est l'auteur de l'avis ou un administrateur
    if (review.user_id !== userId && req.user.role !== 'admin') {
      return next(
        new AppError('Vous n\'êtes pas autorisé à supprimer cet avis', 403)
      );
    }

    const productId = review.product_id;
    const merchantId = review.merchant_id;

    // Supprimer l'avis
    await review.destroy();

    // Mettre à jour la note moyenne
    await this.updateAverageRating(productId, merchantId);

    res.status(204).json({
      status: 'success',
      data: null
    });
  });

  // Obtenir les avis signalés (pour l'administration)
  getReportedReviews = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: reviews } = await Review.findAndCountAll({
      where: {
        report_count: { [Op.gt]: 0 }
      },
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: Product, attributes: ['id', 'name'] },
        { model: Merchant, attributes: ['id', 'name'] }
      ],
      order: [['report_count', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      status: 'success',
      results: reviews.length,
      total: count,
      data: {
        reviews
      }
    });
  });

  // Méthode utilitaire pour mettre à jour la note moyenne
  updateAverageRating = async (productId, merchantId) => {
    if (productId) {
      const result = await Review.findAll({
        where: { product_id: productId, status: 'approved' },
        attributes: [
          [Sequelize.fn('AVG', Sequelize.col('rating')), 'avg_rating'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'review_count']
        ],
        raw: true
      });

      if (result && result[0]) {
        const { avg_rating, review_count } = result[0];
        await Product.update(
          {
            average_rating: parseFloat(avg_rating) || 0,
            review_count: parseInt(review_count) || 0
          },
          { where: { id: productId } }
        );
      }
    }

    if (merchantId) {
      const result = await Review.findAll({
        where: { merchant_id: merchantId, status: 'approved' },
        attributes: [
          [Sequelize.fn('AVG', Sequelize.col('rating')), 'avg_rating'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'review_count']
        ],
        raw: true
      });

      if (result && result[0]) {
        const { avg_rating, review_count } = result[0];
        await Merchant.update(
          {
            rating: parseFloat(avg_rating) || 0,
            review_count: parseInt(review_count) || 0
          },
          { where: { id: merchantId } }
        );
      }
    }
  };
}

module.exports = new ReviewController();
