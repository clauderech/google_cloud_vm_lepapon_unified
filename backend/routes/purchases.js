
const express = require('express');
const PurchaseModel = require('../models/purchase');
const { requireAuth } = require('../middleware/authUnified');
const router = express.Router();

// Listar todas as compras
router.get('/', requireAuth, async (req, res) => {
  try {
    const purchases = await PurchaseModel.list();
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar compras', details: err.message });
  }
});

// Buscar compra por ID
router.get('/:id', async (req, res) => {
  try {
    const purchase = await PurchaseModel.getById(req.params.id);
    if (!purchase) return res.status(404).json({ error: 'Compra não encontrada' });
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar compra', details: err.message });
  }
});

// Criar compra
router.post('/', requireAuth, async (req, res) => {
  try {
    const result = await PurchaseModel.create(req.body);
    res.status(201).json({ success: true, id: result[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar compra', details: err.message });
  }
});

// Atualizar compra
router.put('/:id', async (req, res) => {
  try {
    await PurchaseModel.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar compra', details: err.message });
  }
});

// Remover compra
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await PurchaseModel.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover compra', details: err.message });
  }
});

/**
 * ============================================
 * ROTA ANDROID - POST /api/purchases/android
 * ============================================
 * Registrar compra para app Android
 * Autenticação: X-API-Key obrigatório
 */
const { validateApiKey } = require('../middleware/authUnified');

router.post('/android', validateApiKey, async (req, res) => {
  try {
    const { supplierId, items, total, invoiceNumber } = req.body;
    
    console.log('[PURCHASE][ANDROID][CREATE]', {
      supplierId,
      itemCount: items?.length || 0,
      total
    });
    
    // Validações
    if (!supplierId) {
      return res.status(400).json({ 
        error: 'Campo supplierId é obrigatório' 
      });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'Campo items é obrigatório e deve conter ao menos 1 item' 
      });
    }
    
    if (!total || parseFloat(total) <= 0) {
      return res.status(400).json({ 
        error: 'Campo total é obrigatório e deve ser maior que 0' 
      });
    }
    
    // Criar compra
    const result = await PurchaseModel.create({
      supplierId,
      items,
      total: parseFloat(total),
      invoiceNumber: invoiceNumber || null,
      userId: 'android_app'
    });
    
    console.log('[PURCHASE][ANDROID][CREATE][SUCCESS]', { 
      purchaseId: result[0] 
    });
    
    res.status(201).json({ 
      success: true, 
      purchaseId: result[0],
      message: 'Compra registrada com sucesso'
    });
  } catch (err) {
    console.error('[PURCHASE][ANDROID][CREATE][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Erro ao registrar compra', 
      details: err.message 
    });
  }
});

module.exports = router;
