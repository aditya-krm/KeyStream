import express from 'express';
import linkedinController from '../controllers/linkedinController.js';

const router = express.Router();

// Get LinkedIn profile by URL or username
router.get('/:profileUrl', linkedinController.getLinkedInProfile);

export default router;