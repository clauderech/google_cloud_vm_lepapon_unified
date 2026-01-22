'use strict';

const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { requireOpenCashRegister } = require('../middleware/cashRegisterMiddleware');

const router = express.Router();

/**
 * GET /api/initial-state
 * Retorna estado inicial da aplicação (produtos, clientes, etc)
 */
router.get('/api/initial-state', async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database não inicializado' });
    }

    // Carregar produtos
    const products = await db('products').select('*');

    // Carregar fornecedores
    const suppliers = await db('suppliers').select('*');

    // Carregar clientes
    const customers = await db('customers').select('*');

    // Carregar vendas recentes (últimas 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const salesRaw = await db('sales')
      .where('created_at', '>=', thirtyDaysAgo)
      .select('*');

    const saleIds = (salesRaw || []).map(s => s.id).filter(Boolean);
    const saleItemsRaw = saleIds.length > 0
      ? await db('sale_items').whereIn('sale_id', saleIds).select('*')
      : [];

    const itemsBySaleId = new Map();
    for (const it of saleItemsRaw) {
      const sid = it.sale_id;
      if (!itemsBySaleId.has(sid)) itemsBySaleId.set(sid, []);
      itemsBySaleId.get(sid).push({
        productId: it.product_id,
        productName: it.product_name,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price)
      });
    }

    const sales = (salesRaw || []).map(s => {
      const items = itemsBySaleId.get(s.id) || [];
      const subtotal = items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.unitPrice)), 0);
      return {
        ...s,
        items,
        subtotal
      };
    });

    // Carregar compras recentes
    const purchases = await db('purchases')
      .where('created_at', '>=', thirtyDaysAgo)
      .select('*');

    res.json({
      products: products || [],
      suppliers: suppliers || [],
      customers: customers || [],
      sales: sales || [],
      purchases: purchases || [],
      shoppingList: [],
      activeComandas: []
    });

  } catch (error) {
    console.error('[API] Erro ao carregar estado inicial:', error);
    res.status(500).json({
      error: 'Erro ao carregar estado inicial',
      message: error.message
    });
  }
});

/**
 * POST /api/sales
 * Criar nova venda [REQUER AUTENTICAÇÃO + CAIXA ABERTO]
 */
router.post('/api/sales', authMiddleware, requireOpenCashRegister, async (req, res) => {
  const db = req.db;
  if (!db) {
    return res.status(500).json({ error: 'Database não inicializado' });
  }

  const {
    id,
    date,
    items,
    total,
    discount,
    paymentMethod,
    customerId,
    customerName
  } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Itens da venda são obrigatórios'
    });
  }

  const normalizedTotal = Number(total);
  if (!Number.isFinite(normalizedTotal) || normalizedTotal < 0) {
    return res.status(400).json({
      success: false,
      error: 'Total inválido'
    });
  }

  const allowedPayment = new Set(['cash', 'card', 'pix', 'credit']);
  if (!allowedPayment.has(paymentMethod)) {
    return res.status(400).json({
      success: false,
      error: 'Forma de pagamento inválida'
    });
  }

  const saleId = (id && String(id).trim()) ? String(id).trim() : `SALE-${Date.now()}`;
  const saleDate = date ? new Date(date) : new Date();
  const normalizedDiscount = Number(discount || 0);

  const trx = await db.transaction();
  try {
    // Inserir venda
    await trx('sales').insert({
      id: saleId,
      date: saleDate,
      total: normalizedTotal,
      payment_method: paymentMethod,
      customer_id: customerId || null,
      customer_name: customerName || null,
      discount: Number.isFinite(normalizedDiscount) ? normalizedDiscount : 0,
      created_at: new Date()
    });

    // Inserir itens
    const saleItemsToInsert = items.map(it => ({
      sale_id: saleId,
      product_id: it.productId,
      product_name: it.productName,
      quantity: Number(it.quantity),
      unit_price: Number(it.unitPrice),
      created_at: new Date()
    }));

    for (const it of saleItemsToInsert) {
      if (!it.product_id || !it.product_name) {
        throw new Error('Item de venda inválido: product_id/product_name ausente');
      }
      if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
        throw new Error('Item de venda inválido: quantity');
      }
      if (!Number.isFinite(it.unit_price) || it.unit_price < 0) {
        throw new Error('Item de venda inválido: unit_price');
      }
    }

    await trx('sale_items').insert(saleItemsToInsert);

    // Atualizar estoque no banco
    const productIds = [...new Set(saleItemsToInsert.map(i => i.product_id))];
    const products = await trx('products').whereIn('id', productIds).select('id', 'recipe');
    const productById = new Map(products.map(p => [p.id, p]));

    for (const it of saleItemsToInsert) {
      const productRow = productById.get(it.product_id);
      if (!productRow) {
        throw new Error(`Produto não encontrado: ${it.product_id}`);
      }

      // Se tiver receita, debita ingredientes; senão, debita o próprio produto
      let recipe = null;
      if (productRow.recipe) {
        try {
          recipe = typeof productRow.recipe === 'string' ? JSON.parse(productRow.recipe) : productRow.recipe;
        } catch {
          recipe = null;
        }
      }

      if (Array.isArray(recipe) && recipe.length > 0) {
        for (const r of recipe) {
          const ingredientId = r.ingredientId || r.ingredient_id;
          const qty = Number(r.quantity);
          if (!ingredientId || !Number.isFinite(qty) || qty <= 0) continue;
          const debit = qty * Number(it.quantity);
          await trx('products')
            .where('id', ingredientId)
            .update({
              stock: trx.raw('stock - ?', [debit]),
              updated_at: new Date()
            });
        }
      } else {
        await trx('products')
          .where('id', it.product_id)
          .update({
            stock: trx.raw('stock - ?', [Number(it.quantity)]),
            updated_at: new Date()
          });
      }
    }

    await trx.commit();
    return res.json({
      success: true,
      saleId,
      message: 'Venda registrada com sucesso'
    });
  } catch (error) {
    await trx.rollback();
    console.error('[API] Erro ao criar venda:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao criar venda',
      message: error.message
    });
  }
});

/**
 * GET /api/products
 * Retorna lista de produtos
 */
router.get('/api/products', async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database não inicializado' });
    }

    const products = await db('products').select('*').orderBy('name');

    res.json({
      success: true,
      data: products || [],
      count: (products || []).length
    });

  } catch (error) {
    console.error('[API] Erro ao carregar produtos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao carregar produtos',
      message: error.message
    });
  }
});

/**
 * GET /api/products/:id
 * Retorna um produto específico
 */
router.get('/api/products/:id', async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database não inicializado' });
    }

    const { id } = req.params;
    const product = await db('products').where('id', id).first();

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produto não encontrado'
      });
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('[API] Erro ao carregar produto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao carregar produto',
      message: error.message
    });
  }
});

/**
 * POST /api/products
 * Criar novo produto
 */
router.post('/api/products', async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database não inicializado' });
    }

    const { 
      id, 
      name, 
      type, 
      category, 
      price, 
      cost,
      stock, 
      min_stock,
      max_stock,
      unit,
      supplier_id,
      description,
      barcode,
      is_active,
      recipe
    } = req.body;

    if (!id || !name) {
      return res.status(400).json({
        success: false,
        error: 'ID e nome são obrigatórios'
      });
    }

    await db('products').insert({
      id,
      name,
      type: type || 'prato',
      category: category || 'Geral',
      price: price || 0,
      cost: cost || 0,
      stock: stock || 0,
      min_stock: min_stock || 10,
      max_stock: max_stock || null,
      unit: unit || 'un',
      supplier_id: (supplier_id && supplier_id !== '') ? supplier_id : null,
      description: description || null,
      barcode: barcode || null,
      is_active: is_active !== undefined ? is_active : 1,
      recipe: recipe ? JSON.stringify(recipe) : null,
      created_at: new Date(),
      updated_at: new Date()
    });

    res.json({
      success: true,
      message: 'Produto criado com sucesso',
      id
    });

  } catch (error) {
    console.error('[API] Erro ao criar produto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar produto',
      message: error.message
    });
  }
});

/**
 * PUT /api/products/:id
 * Atualizar produto [REQUER AUTENTICAÇÃO]
 */
router.put('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database não inicializado' });
    }

    const { id } = req.params;
    console.log('[API] Atualizando produto:', id);
    console.log('[API] Body recebido:', JSON.stringify(req.body, null, 2));

    const { 
      name, 
      type, 
      category, 
      price, 
      cost,
      stock, 
      min_stock,
      max_stock,
      unit,
      supplier_id,
      description,
      barcode,
      is_active,
      recipe
    } = req.body;

    const updateData = { updated_at: new Date() };
    
    // Apenas atualizar campos que foram enviados
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (price !== undefined) updateData.price = price;
    if (cost !== undefined) updateData.cost = cost;
    if (stock !== undefined) updateData.stock = stock;
    if (min_stock !== undefined) updateData.min_stock = min_stock;
    if (max_stock !== undefined) updateData.max_stock = max_stock;
    if (unit !== undefined) updateData.unit = unit;
    // Converter string vazia em null para foreign key
    if (supplier_id !== undefined) {
      updateData.supplier_id = (supplier_id === '' || supplier_id === null) ? null : supplier_id;
      console.log('[API] supplier_id original:', supplier_id, '| convertido:', updateData.supplier_id);
    }
    if (description !== undefined) updateData.description = description;
    if (barcode !== undefined) updateData.barcode = barcode;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (recipe !== undefined) updateData.recipe = recipe ? JSON.stringify(recipe) : null;

    console.log('[API] UpdateData:', JSON.stringify(updateData, null, 2));

    const result = await db('products').where('id', id).update(updateData);
    console.log('[API] Linhas afetadas:', result);

    res.json({
      success: true,
      message: 'Produto atualizado com sucesso'
    });

  } catch (error) {
    console.error('[API] Erro ao atualizar produto:', error);
    console.error('[API] Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar produto',
      message: error.message,
      details: error.toString()
    });
  }
});

/**
 * DELETE /api/products/:id
 * Deletar produto [REQUER ADMIN]
 */
router.delete('/api/products/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database não inicializado' });
    }

    const { id } = req.params;

    await db('products').where('id', id).delete();

    res.json({
      success: true,
      message: 'Produto deletado com sucesso'
    });

  } catch (error) {
    console.error('[API] Erro ao deletar produto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar produto',
      message: error.message
    });
  }
});

module.exports = router;
