'use strict';

import { db } from '../config/knex.js';

const SaleItemModel = {
  async addItems(saleId, items) {
    if (!Array.isArray(items) || items.length === 0) return;
    const mapped = items.map(item => ({
      sale_id: saleId,
      product_id: item.product_id || item.productId,
      product_name: item.product_name || item.productName,
      quantity: item.quantity,
      unit_price: item.unit_price || item.unitPrice,
      status: item.status || 'sold',
      notes: item.notes || null
    }));
    return db('sale_items').insert(mapped);
  }
};

export default SaleItemModel;
