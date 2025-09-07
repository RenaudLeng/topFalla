const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const AppError = require('./appError');

// Configuration du stockage des fichiers
const storage = multer.memoryStorage();

// Filtre pour les types de fichiers autorisés
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new AppError('Type de fichier non supporté. Veuillez télécharger uniquement des images (jpeg, jpg, png, gif, webp).', 400), false);
  }
};

// Configuration de Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Middleware pour le téléchargement d'une seule image
const uploadSingleImage = (fieldName) => {
  return upload.single(fieldName);
};

// Middleware pour le téléchargement de plusieurs images
const uploadMultipleImages = (fieldName, maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

// Fonction pour traiter et enregistrer une image
const processAndSaveImage = async (file, folder, width = 800, height = 800, quality = 80) => {
  try {
    // Créer le dossier s'il n'existe pas
    const uploadPath = path.join(__dirname, `../public/uploads/${folder}`);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Générer un nom de fichier unique
    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = path.join(uploadPath, fileName);
    const relativePath = `/uploads/${folder}/${fileName}`;

    // Traiter l'image avec Sharp (redimensionnement, compression, etc.)
    await sharp(file.buffer)
      .resize(width, height, {
        fit: 'cover',
        withoutEnlargement: true
      })
      .jpeg({ quality })
      .png({ quality })
      .webp({ quality })
      .toFile(filePath);

    return {
      fileName,
      filePath,
      relativePath,
      mimeType: file.mimetype,
      size: file.size
    };
  } catch (error) {
    console.error('Erreur lors du traitement de l\'image:', error);
    throw new AppError('Erreur lors du traitement de l\'image', 500);
  }
};

// Middleware pour gérer le téléchargement d'une image de profil
const uploadUserPhoto = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const result = await processAndSaveImage(
      req.file,
      'users',
      500, // width
      500, // height
      85   // quality
    );

    // Ajouter le chemin de l'image à la requête
    req.file.filename = result.relativePath;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware pour gérer le téléchargement d'images de produits
const uploadProductImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return next();

    const processedImages = [];
    
    // Traiter chaque image
    for (const file of req.files) {
      const result = await processAndSaveImage(
        file,
        'products',
        1200, // width
        1200, // height
        90    // quality
      );
      
      processedImages.push({
        url: result.relativePath,
        alt: file.originalname,
        isPrimary: processedImages.length === 0 // La première image est principale par défaut
      });
    }

    // Ajouter les images traitées à la requête
    req.body.images = processedImages;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware pour gérer le téléchargement de logo de marchand
const uploadMerchantLogo = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const result = await processAndSaveImage(
      req.file,
      'merchants',
      400, // width
      400, // height
      85   // quality
    );

    // Ajouter le chemin du logo à la requête
    req.file.filename = result.relativePath;
    next();
  } catch (error) {
    next(error);
  }
};

// Fonction pour supprimer un fichier
const deleteFile = (filePath) => {
  const fullPath = path.join(__dirname, '../public', filePath);
  
  if (fs.existsSync(fullPath)) {
    fs.unlink(fullPath, (err) => {
      if (err) {
        console.error('Erreur lors de la suppression du fichier:', err);
        return false;
      }
      return true;
    });
  }
  return false;
};

// Fonction pour nettoyer les fichiers temporaires
const cleanupTempFiles = (files) => {
  if (!files) return;
  
  if (Array.isArray(files)) {
    files.forEach(file => {
      if (file.path) {
        deleteFile(file.path);
      }
    });
  } else if (files.path) {
    deleteFile(files.path);
  }
};

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
  uploadUserPhoto,
  uploadProductImages,
  uploadMerchantLogo,
  deleteFile,
  cleanupTempFiles,
  processAndSaveImage
};
