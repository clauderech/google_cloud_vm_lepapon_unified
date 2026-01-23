const express = require('express');
const router = express.Router();
const SaleModel = require('../models/sale');
const SaleItemModel = require('../models/sale_item');
const ProductModel = require('../models/product');
// Finalizar comanda (pagamento normal ou crediário)
router.post('/:id/close', async (req, res) => {
  /*
    Espera body:
    {
      paymentMethod: 'cash' | 'card' | 'pix' | 'credit' | 'crediario',
      closeDate?: string (opcional, default: now)
    }
  */
  try {
    const comandaId = req.params.id;
    const { paymentMethod, closeDate } = req.body;
    const comanda = await ComandaModel.getById(comandaId);
    if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' });
    if (comanda.status === 'closed') return res.status(400).json({ error: 'Comanda já está fechada' });
    const items = await ComandaModel.getItems(comandaId);
    if (!items || items.length === 0) return res.status(400).json({ error: 'Comanda sem itens' });

    // Calcula total
    const total = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unit_price)), 0);

    // Atualiza comanda para fechada
    await ComandaModel.update(comandaId, {
      status: 'closed',
      payment_method: paymentMethod,
      closed_at: closeDate ? formatDateForMySQL(closeDate) : formatDateForMySQL(new Date()),
      // Utilitário para formatar datas no padrão MySQL DATETIME
      function formatDateForMySQL(date) {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0') + ' ' +
          String(d.getHours()).padStart(2, '0') + ':' +
          String(d.getMinutes()).padStart(2, '0') + ':' +
          String(d.getSeconds()).padStart(2, '0');
      }
      total
    });

    // Se for crediário, não gera venda agora
    if (paymentMethod === 'crediario') {
      return res.json({ success: true, comandaId, total, crediario: true });
    }

    // Gera venda (sales)
    const saleData = {
      date: closeDate || new Date().toISOString(),
      total,
      subtotal: total,
      discount: 0,
      payment_method: paymentMethod,
      customer_id: comanda.customer_id,
      customer_name: comanda.customer_name,
      comanda_id: comandaId,
      notes: comanda.notes
    };
    const [saleId] = await SaleModel.create(saleData);

    // Salva itens em sale_items
    await SaleItemModel.addItems(saleId, items);

    // Atualiza estoque dos produtos
    for (const item of items) {
      const productId = item.product_id || item.productId;
      const quantity = parseFloat(item.quantity);
      if (productId && !isNaN(quantity)) {
        const product = await ProductModel.getById(productId);
        if (product) {
          const newStock = (parseFloat(product.stock) || 0) - quantity;
          await ProductModel.update(productId, { stock: newStock });
        }
      }
    }

    res.json({ success: true, comandaId, saleId, total });
  } catch (err) {
    console.error('[COMANDA][CLOSE][ERROR]', { id: req.params.id, error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao fechar comanda', details: err.message, stack: err.stack });
  }
});
'use strict';

const ComandaModel = require('../models/comanda');

// Listar todas as comandas
router.get('/', async (req, res) => {
  try {
    const comandas = await ComandaModel.list();
    res.json(comandas);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar comandas', details: err.message });
  }
});

// Buscar comanda por ID
router.get('/:id', async (req, res) => {
  try {
    console.log('[COMANDA][OPEN][INFO]', {
      id: req.params.id,
      user: req.user ? req.user.id : undefined,
      timestamp: new Date().toISOString()
    });
    const comanda = await ComandaModel.getById(req.params.id);
    if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' });
    // Buscar itens da comanda
    const items = await ComandaModel.getItems(req.params.id);
    comanda.items = items;
    res.json(comanda);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar comanda', details: err.message });
  }
});

// Criar comanda
router.post('/', async (req, res) => {
  try {
    console.log('[COMANDA][CREATE][REQ]', { payload: req.body });
    const result = await ComandaModel.create(req.body);
    console.log('[COMANDA][CREATE][RESULT]', { result });
    res.status(201).json({ success: true, id: result[0] });
  } catch (err) {
    console.error('[COMANDA][CREATE][ERROR]', { payload: req.body, error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao criar comanda', details: err.message, stack: err.stack });
  }
});

// Atualizar comanda
router.put('/:id', async (req, res) => {
  try {
    console.log('[COMANDA][UPDATE][REQ]', { id: req.params.id, payload: req.body });
    // Atualiza dados da comanda (exceto itens)
    const { items, ...comandaData } = req.body;
    if (Object.keys(comandaData).length > 0) {
      await ComandaModel.update(req.params.id, comandaData);
    }
    // Atualiza itens da comanda se enviados
    if (Array.isArray(items)) {
      // Remove itens antigos e insere novos (simples)
      await ComandaModel.clearItems(req.params.id);
      await ComandaModel.addItems(req.params.id, items);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[COMANDA][UPDATE][ERROR]', { id: req.params.id, payload: req.body, error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao atualizar comanda', details: err.message, stack: err.stack });
  }
});

// Remover comanda
router.delete('/:id', async (req, res) => {
  try {
    await ComandaModel.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover comanda', details: err.message });
  }
});

module.exports = router;
