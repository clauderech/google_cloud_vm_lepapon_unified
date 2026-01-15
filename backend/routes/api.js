'use strict';

const express = require('express');

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
    
    const sales = await db('sales')
      .where('created_at', '>=', thirtyDaysAgo)
      .select('*');

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
      is_active
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
      supplier_id: supplier_id || null,
      description: description || null,
      barcode: barcode || null,
      is_active: is_active !== undefined ? is_active : 1,
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
 * Atualizar produto
 */
router.put('/api/products/:id', async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database não inicializado' });
    }

    const { id } = req.params;
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
    if (supplier_id !== undefined) updateData.supplier_id = supplier_id;
    if (description !== undefined) updateData.description = description;
    if (barcode !== undefined) updateData.barcode = barcode;
    if (is_active !== undefined) updateData.is_active = is_active;

    await db('products').where('id', id).update(updateData);

    res.json({
      success: true,
      message: 'Produto atualizado com sucesso'
    });

  } catch (error) {
    console.error('[API] Erro ao atualizar produto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar produto',
      message: error.message
    });
  }
});

/**
 * DELETE /api/products/:id
 * Deletar produto
 */
router.delete('/api/products/:id', async (req, res) => {
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
