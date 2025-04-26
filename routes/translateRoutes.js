import express from 'express';
import translateController from '../controllers/translateController.js';

const router = express.Router();

// Text translation
router.post('/text', translateController.translateText);

// Batch translation
router.post('/batch', translateController.batchTranslate);

// JSON translation
router.post('/json', translateController.translateJson);

// HTML translation
router.post('/html', translateController.translateHtml);

// Language detection
router.post('/detect', translateController.detectLanguage);

// Get supported languages
router.get('/languages', translateController.getSupportedLanguages);

export default router;