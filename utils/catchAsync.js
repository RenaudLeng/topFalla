/**
 * Enveloppe une fonction asynchrone pour capturer les erreurs et les transmettre à next()
 * @param {Function} fn - La fonction asynchrone à envelopper
 * @returns {Function} Une fonction middleware qui gère les erreurs
 */
module.exports = (fn) => {
  return (req, res, next) => {
    // Exécute la fonction asynchrone et attrape les erreurs potentielles
    fn(req, res, next).catch((err) => {
      // Passe l'erreur au gestionnaire d'erreurs global
      next(err);
    });
  };
};
