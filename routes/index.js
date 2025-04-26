import express from 'express';
import linkedinRoutes from './linkedinRoutes.js';
import translateRoutes from './translateRoutes.js';
import apiKeyRoutes from './apiKeyRoutes.js';
import serviceRoutes from './serviceRoutes.js';
import proxyRoutes from './proxyRoutes.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Root route - API information
router.get('/', (req, res) => {
  res.success({ 
    message: 'KeyStream API - RapidAPI Proxy Service',
    endpoints: {
      linkedin: '/linkedin/:username',
      apiKeys: '/api-keys',
      services: '/services',
      serviceStats: '/services/:serviceName/stats',
      addService: '/services (POST)',
      addApiKey: '/services/:serviceName/keys (POST)',
      updateKeyRemaining: '/services/:serviceName/keys/:apiKey/remaining (PUT)',
      proxyCall: '/api/:serviceName/:endpoint(*)',
      translate: {
        text: '/translate/text (POST)',
        batch: '/translate/batch (POST)',
        json: '/translate/json (POST)', 
        html: '/translate/html (POST)',
        detect: '/translate/detect (POST)',
        languages: '/translate/languages'
      }
    },
    version: '1.0.0'
  });
});

// Mount all routes
router.use('/linkedin', linkedinRoutes);
router.use('/translate', translateRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/services', serviceRoutes);
router.use('/api', proxyRoutes);

// Log all API requests
router.use((req, res, next) => {
  logger.debug(`API Request: ${req.method} ${req.originalUrl}`);
  next();
});

export default router;