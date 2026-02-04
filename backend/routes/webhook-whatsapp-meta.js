
const express = require('express');
const { handleVerifyWebhook, handleWebhookEvent } = require('../controllers/processwhatsapp');
const router = express.Router();

router.get('/webhook', handleVerifyWebhook);
router.post('/webhook', handleWebhookEvent);

module.exports = router;
