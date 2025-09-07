const express = require('express');
const router = express.Router();

// Import des contrôleurs
const authController = require('../../../controllers/authController');
const offerController = require('../../../controllers/offerController');
const reviewController = require('../../../controllers/reviewController');

// Middleware d'authentification
const { protect, restrictTo } = require('../../../middlewares/authMiddleware');

// Routes d'authentification
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.get('/auth/logout', authController.logout);
router.post('/auth/forgot-password', authController.forgotPassword);
router.patch('/auth/reset-password/:token', authController.resetPassword);
router.patch('/auth/update-password', protect, authController.updatePassword);
router.get('/auth/verify-email/:token', authController.verifyEmail);
router.post('/auth/resend-verification-email', authController.resendVerificationEmail);
router.get('/auth/me', protect, authController.isLoggedIn);

// Routes des offres
router.get('/offers', offerController.getAllOffers);
router.get('/offers/:id', offerController.getOffer);
router.post('/offers', protect, restrictTo('admin', 'merchant'), offerController.createOffer);
router.patch('/offers/:id', protect, restrictTo('admin', 'merchant'), offerController.updateOffer);
router.delete('/offers/:id', protect, restrictTo('admin', 'merchant'), offerController.deleteOffer);
router.get('/offers/:id/price-history', offerController.getPriceHistory);
router.post('/offers/:id/click', offerController.trackOfferClick);

// Routes des avis
router.get('/reviews', reviewController.getAllReviews);
router.get('/reviews/:id', reviewController.getReview);
router.post('/reviews', protect, reviewController.createReview);
router.post('/reviews/product/:productId', protect, reviewController.createReview);
router.post('/reviews/merchant/:merchantId', protect, reviewController.createReview);
router.patch('/reviews/:id', protect, reviewController.updateReview);
router.delete('/reviews/:id', protect, reviewController.deleteReview);
router.post('/reviews/:id/helpful', protect, reviewController.markHelpful);
router.post('/reviews/:id/report', protect, reviewController.reportReview);

// Routes protégées pour l'administration
router.get('/admin/reviews', protect, restrictTo('admin'), reviewController.getAllReviews);
router.patch('/admin/reviews/:id/status', protect, restrictTo('admin'), reviewController.updateReviewStatus);
router.get('/admin/reports', protect, restrictTo('admin'), reviewController.getReportedReviews);

module.exports = router;
