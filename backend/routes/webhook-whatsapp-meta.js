
import express from 'express';
import { handleVerifyWebhook, handleWebhookEvent } from '../controllers/processwhatsapp.js';
const router = express.Router();

router.get('/webhook', handleVerifyWebhook);
router.post('/webhook', handleWebhookEvent);

export default router;
