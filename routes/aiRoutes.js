import express from 'express';
import { validateRequest, suggestReasons, chat } from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/validate-request', protect, validateRequest);
router.post('/suggest-reasons', protect, suggestReasons);
router.post('/chat', protect, chat);

export default router;
