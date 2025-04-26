import express from 'express';
import proxyController from '../controllers/proxyController.js';

const router = express.Router();

// Generic proxy endpoint for any RapidAPI service
router.post('/:serviceName/:endpoint(*)', proxyController.proxyCall);

export default router;