/**
 * Classe utilitaire pour les réponses API standardisées
 */
class ApiResponse {
  /**
   * Crée une réponse de succès
   * @param {Object} res - Objet de réponse Express
   * @param {*} data - Données à renvoyer
   * @param {string} message - Message de succès
   * @param {number} statusCode - Code de statut HTTP (défaut: 200)
   */
  static success(res, data = null, message = 'Opération réussie', statusCode = 200) {
    const response = {
      success: true,
      message,
      data
    };

    // Supprimer les champs vides
    if (data === null) {
      delete response.data;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Crée une réponse d'erreur
   * @param {Object} res - Objet de réponse Express
   * @param {string} message - Message d'erreur
   * @param {number} statusCode - Code de statut HTTP (défaut: 400)
   * @param {Array} errors - Tableau d'erreurs détaillées
   */
  static error(res, message = 'Une erreur est survenue', statusCode = 400, errors = []) {
    const response = {
      success: false,
      message,
      errors: errors.length > 0 ? errors : undefined
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Crée une réponse de validation échouée
   * @param {Object} res - Objet de réponse Express
   * @param {Array} errors - Tableau d'erreurs de validation
   */
  static validationError(res, errors = []) {
    return this.error(
      res,
      'Erreur de validation',
      422, // Unprocessable Entity
      errors.map(err => ({
        field: err.path ? err.path.join('.') : undefined,
        message: err.message,
        type: err.type || 'validation'
      }))
    );
  }

  /**
   * Crée une réponse d'erreur non autorisée
   * @param {Object} res - Objet de réponse Express
   * @param {string} message - Message d'erreur
   */
  static unauthorized(res, message = 'Non autorisé') {
    return this.error(res, message, 401);
  }

  /**
   * Crée une réponse d'accès refusé
   * @param {Object} res - Objet de réponse Express
   * @param {string} message - Message d'erreur
   */
  static forbidden(res, message = 'Accès refusé') {
    return this.error(res, message, 403);
  }

  /**
   * Crée une réponse de ressource non trouvée
   * @param {Object} res - Objet de réponse Express
   * @param {string} message - Message d'erreur
   */
  static notFound(res, message = 'Ressource non trouvée') {
    return this.error(res, message, 404);
  }

  /**
   * Crée une réponse de conflit
   * @param {Object} res - Objet de réponse Express
   * @param {string} message - Message d'erreur
   */
  static conflict(res, message = 'Conflit de données') {
    return this.error(res, message, 409);
  }

  /**
   * Crée une réponse de trop de requêtes
   * @param {Object} res - Objet de réponse Express
   * @param {string} message - Message d'erreur
   */
  static tooManyRequests(res, message = 'Trop de requêtes, veuillez réessayer plus tard') {
    return this.error(res, message, 429);
  }

  /**
   * Crée une réponse d'erreur serveur
   * @param {Object} res - Objet de réponse Express
   * @param {string} message - Message d'erreur
   * @param {Error} error - Erreur d'origine (en développement)
   */
  static serverError(res, message = 'Erreur interne du serveur', error = null) {
    // En production, ne pas renvoyer les détails de l'erreur
    const errors = process.env.NODE_ENV === 'development' && error ? [{
      message: error.message,
      stack: error.stack
    }] : [];

    return this.error(res, message, 500, errors);
  }

  /**
   * Crée une réponse paginée
   * @param {Object} res - Objet de réponse Express
   * @param {Array} data - Tableau de données
   * @param {Object} pagination - Informations de pagination
   * @param {string} message - Message de succès
   */
  static paginated(res, data = [], pagination = {}, message = 'Données récupérées avec succès') {
    return this.success(
      res,
      {
        items: data,
        pagination: {
          total: pagination.total || 0,
          page: pagination.page || 1,
          limit: pagination.limit || data.length,
          totalPages: pagination.totalPages || 1,
          hasNextPage: pagination.hasNextPage || false,
          hasPrevPage: pagination.hasPrevPage || false,
          nextPage: pagination.nextPage || null,
          prevPage: pagination.prevPage || null
        }
      },
      message
    );
  }

  /**
   * Crée une réponse de création réussie
   * @param {Object} res - Objet de réponse Express
   * @param {*} data - Données créées
   * @param {string} message - Message de succès
   */
  static created(res, data, message = 'Ressource créée avec succès') {
    return this.success(res, data, message, 201);
  }

  /**
   * Crée une réponse de mise à jour réussie
   * @param {Object} res - Objet de réponse Express
   * @param {*} data - Données mises à jour
   * @param {string} message - Message de succès
   */
  static updated(res, data, message = 'Ressource mise à jour avec succès') {
    return this.success(res, data, message);
  }

  /**
   * Crée une réponse de suppression réussie
   * @param {Object} res - Objet de réponse Express
   * @param {string} message - Message de succès
   */
  static deleted(res, message = 'Ressource supprimée avec succès') {
    return this.success(res, null, message, 204);
  }

  /**
   * Crée une réponse de téléchargement de fichier
   * @param {Object} res - Objet de réponse Express
   * @param {Buffer} file - Fichier à télécharger
   * @param {string} filename - Nom du fichier
   * @param {string} contentType - Type MIME du fichier
   */
  static download(res, file, filename, contentType = 'application/octet-stream') {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(file);
  }
}

module.exports = ApiResponse;
