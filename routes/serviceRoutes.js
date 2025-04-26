import express from 'express';
import apiKeyController from '../controllers/apiKeyController.js';

const router = express.Router();

// Get stats for a specific service
router.get('/:serviceName/stats', apiKeyController.getApiKeyStats);

// Add a new service
router.post('/', apiKeyController.addService);

// Add API key to a service
router.post('/:serviceName/keys', apiKeyController.addApiKey);

// Update remaining uses for a key
router.put('/:serviceName/keys/:apiKey/remaining', apiKeyController.updateRemainingUses);

export default router;