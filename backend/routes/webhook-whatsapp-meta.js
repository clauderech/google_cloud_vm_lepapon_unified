
const express = require('express');
const { handleVerifyWebhook, handleWebhookEvent } = require('../controllers/processwhatsapp_simple');
const router = express.Router();

router.get('/webhook', handleVerifyWebhook);
router.post('/webhook', handleWebhookEvent);

module.exports = router;
