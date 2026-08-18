const { db } = require('../config/knex');

const ShoppingListModel = {
  async listPending() {
    return db('shopping_list_items')
      .where({ is_purchased: 0 })
      .orderBy('created_at', 'asc');
  },

  async create(data) {
    const id = data.id || `shopping_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    await db('shopping_list_items').insert({
      id,
      product_id: data.productId,
      supplier_id: data.supplierId || null,
      quantity: Number(data.quantity),
      priority: data.priority || 'medium',
      is_purchased: false,
      notes: data.notes || null,
      created_at: new Date(),
      updated_at: new Date()
    });
    return id;
  },

  async update(id, data) {
    const updates = { updated_at: new Date() };
    if (data.quantity !== undefined) updates.quantity = Number(data.quantity);
    if (data.supplierId !== undefined) updates.supplier_id = data.supplierId || null;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.notes !== undefined) updates.notes = data.notes || null;
    return db('shopping_list_items').where({ id, is_purchased: 0 }).update(updates);
  },

  async remove(id) {
    return db('shopping_list_items').where({ id, is_purchased: 0 }).del();
  },

  async markPurchased(id, client = db) {
    return client('shopping_list_items')
      .where({ id, is_purchased: 0 })
      .update({ is_purchased: true, purchased_at: new Date(), updated_at: new Date() });
  },

  async markPurchasedMany(ids, client = db) {
    if (!ids || ids.length === 0) return 0;
    return client('shopping_list_items')
      .whereIn('id', ids)
      .where({ is_purchased: 0 })
      .update({ is_purchased: true, purchased_at: new Date(), updated_at: new Date() });
  }
};

module.exports = ShoppingListModel;