'use strict';

const express = require('express');
const ProductModel = require('../models/product');
const SupplierModel = require('../models/supplier');
const CustomerModel = require('../models/customer');
const SaleModel = require('../models/sale');
const PurchaseModel = require('../models/purchase');
const ComandaModel = require('../models/comanda');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [products, suppliers, customers, sales, purchases, comandas] = await Promise.all([
      ProductModel.list(),
      SupplierModel.list(),
      CustomerModel.list(),
      SaleModel.list(),
      PurchaseModel.list(),
      ComandaModel.list()
    ]);

    // Buscar itens das comandas abertas
    const activeComandas = [];
    for (const comanda of comandas.filter(c => c.status === 'open')) {
      const items = await ComandaModel.getItems(comanda.id);
      activeComandas.push({ ...comanda, items });
    }

    res.json({
      products,
      suppliers,
      customers,
      sales,
      purchases,
      shoppingList: [],
      activeComandas
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar estado inicial', details: err.message });
  }
});

module.exports = router;
