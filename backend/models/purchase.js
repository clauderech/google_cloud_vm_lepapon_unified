
const { db } = require('../config/knex');
const StockService = require('../services/stockService');
const StockMovementModel = require('./stockMovement');
const ShoppingListModel = require('./shoppingList');

const PurchaseModel = {
  async list() {
    return db('purchases').select('*');
  },
  async getById(id) {
    return db('purchases').where({ id }).first();
  },
  
  async create(data) {
    console.log('[PURCHASE][CREATE]', {
      supplierId: data.supplierId,
      itemCount: data.items?.length || 0,
      total: data.total
    });

    try {
      // Gerar ID único para a compra
      const purchaseId = `purchase_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      await db.transaction(async (trx) => {
        await trx('purchases').insert({
          id: purchaseId,
          date: new Date(),
          supplier_id: data.supplierId,
          total: parseFloat(data.total),
          invoice_number: data.invoiceNumber || null,
          status: 'received',
          created_at: new Date()
        });

        await StockService.processPurchase({
          items: data.items,
          purchaseId,
          userId: data.userId || null,
          trx,
          sync: false
        });

        if (data.shoppingListItemIds?.length) {
          const completed = await ShoppingListModel.markPurchasedMany(data.shoppingListItemIds, trx);
          if (completed !== data.shoppingListItemIds.length) {
            throw new Error('Um ou mais itens da lista de compras não estão pendentes');
          }
        }
      });

      try {
        await StockService.syncAllRelevantProductsToLepapon({
          referenceId: purchaseId,
          source: 'purchase'
        });
      } catch (syncError) {
        console.error('[PURCHASE][LEPAPON_SYNC][ERROR]', {
          purchaseId,
          error: syncError.message
        });
      }

      console.log('[PURCHASE][CREATE][SUCCESS]', { purchaseId });

      return [purchaseId];
    } catch (error) {
      console.error('[PURCHASE][CREATE][ERROR]', {
        error: error.message,
        stack: error.stack,
        data: {
          supplierId: data.supplierId,
          itemCount: data.items?.length || 0
        }
      });
      throw error;
    }
  },
  
  async update(id, data) {
    console.log('[PURCHASE][UPDATE]', { id, fields: Object.keys(data) });
    return db('purchases').where({ id }).update(data);
  },
  
  async remove(id) {
    console.log('[PURCHASE][DELETE]', { id });
    const purchase = await db('purchases').where({ id }).first();
    if (!purchase) return 0;

    await db.transaction(async (trx) => {
      const movements = await StockMovementModel.getByReference('purchase', id, trx);

      for (const movement of movements) {
        await StockService.updateStock({
          productId: movement.product_id,
          quantity: -Math.abs(parseFloat(movement.quantity) || 0),
          movementType: 'adjustment',
          referenceType: 'purchase',
          referenceId: id,
          notes: `Reversão da compra ${id}`,
          userId: null,
          trx,
          sync: false
        });
      }

      await trx('purchases').where({ id }).del();
    });

    try {
      await StockService.syncAllRelevantProductsToLepapon({
        referenceId: id,
        source: 'purchase_reversal'
      });
    } catch (syncError) {
      console.error('[PURCHASE][DELETE][LEPAPON_SYNC][ERROR]', {
        purchaseId: id,
        error: syncError.message
      });
    }

    return 1;
  }
};

module.exports = PurchaseModel;
