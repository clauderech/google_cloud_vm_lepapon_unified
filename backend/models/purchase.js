
const { db } = require('../config/knex');
const StockService = require('../services/stockService');

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
      
      // Inserir compra na tabela
      await db('purchases').insert({
        id: purchaseId,
        supplier_id: data.supplierId,
        total: parseFloat(data.total) || 0,
        invoice_number: data.invoiceNumber || null,
        payment_method: data.paymentMethod || 'cash',
        notes: data.notes || null,
        status: 'received',
        created_at: new Date()
      });

      console.log('[PURCHASE][CREATE][SUCCESS]', { purchaseId });

      // Atualizar estoque dos produtos comprados usando StockService
      if (data.items && data.items.length > 0) {
        try {
          await StockService.processPurchase({
            items: data.items,
            purchaseId: purchaseId,
            userId: data.userId || null
          });
          
          console.log('[PURCHASE][STOCK][SUCCESS]', { 
            purchaseId, 
            itemCount: data.items.length 
          });
        } catch (stockError) {
          console.error('[PURCHASE][STOCK][ERROR]', {
            purchaseId,
            error: stockError.message
          });
          // Não falha a compra por erro de estoque, apenas loga
        }
      }

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
    // TODO: Implementar reversão de estoque quando deletar compra
    return db('purchases').where({ id }).del();
  }
};

module.exports = PurchaseModel;
