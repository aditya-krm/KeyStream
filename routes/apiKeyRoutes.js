import express from 'express';
import apiKeyController from '../controllers/apiKeyController.js';

const router = express.Router();

// Get API key stats for all services
router.get('/', apiKeyController.getApiKeyStats);

// Add new API key (legacy endpoint for backward compatibility)
router.post('/', apiKeyController.addApiKey);

export default router;