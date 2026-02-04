
import express from 'express';
import ProductModel from '../models/product.js';
import SupplierModel from '../models/supplier.js';
import CustomerModel from '../models/customer.js';
import SaleModel from '../models/sale.js';
import PurchaseModel from '../models/purchase.js';
import ComandaModel from '../models/comanda.js';
const router = express.Router();

router.get('/', async (req, res) => {
  console.log('[DEBUG] /api/initial-state chamada em', new Date().toISOString(), 'IP:', req.ip);
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

export default router;
