
const express = require('express');
const { handleVerifyWebhook, handleWebhookEvent } = require('../controllers/processwhatsapp_simple');
const { requireWhatsappAuth } = require('../middleware/authUnified');
const router = express.Router();

router.get('/webhook', handleVerifyWebhook);
router.post('/webhook', requireWhatsappAuth, handleWebhookEvent);

module.exports = router;
