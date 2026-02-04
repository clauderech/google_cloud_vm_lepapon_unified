'use strict';


/**
 * Servidor Express para webhook da Meta / WhatsApp Cloud API.
 * Entry-point: `npm start`
 */

// Carregar .env do caminho absoluto do servidor
require('dotenv').config({ path: '/var/www/google_cloud_vm_lepapon_unified/.env' });
// LOG TEMPORÁRIO PARA DEBUG DO .ENV
console.log('DEBUG ENV: WHATSAPP_FLOW_PRIVATE_KEY_PATH =', process.env.WHATSAPP_FLOW_PRIVATE_KEY_PATH);
// FIM DO LOG TEMPORÁRIO

import express, { json } from 'express';

import webhookRoutes from './routes/webhook-whatsapp-meta';

const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';

const app = express();

app.use(json({ limit: '1mb' }));

app.use(webhookRoutes);

app.use((_req, res) => res.status(404).json({ ok: false, error: 'Not Found' }));

app.listen(PORT, () => {
  if (!VERIFY_TOKEN) {
  }
});
