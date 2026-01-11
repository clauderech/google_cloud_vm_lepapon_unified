'use strict';

/**
 * Servidor Express para webhook da Meta / WhatsApp Cloud API.
 * Entry-point: `npm start`
 */

require('dotenv').config();

const express = require('express');

const webhookRoutes = require('./routes/webhook-whatsapp-meta');

const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';

const app = express();

app.use(express.json({ limit: '1mb' }));

app.use(webhookRoutes);

app.use((_req, res) => res.status(404).json({ ok: false, error: 'Not Found' }));

app.listen(PORT, () => {
  if (!VERIFY_TOKEN) {
  }
});
