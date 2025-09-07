const express = require('express');
const router = express.Router();

// Importer les routes de l'API v1
const apiV1Routes = require('./api/v1');

// Utiliser les routes de l'API v1
router.use('/api/v1', apiV1Routes);

// Exporter le routeur
module.exports = router;
