
const { db } = require('../config/knex');
const ProductModel = require('./product');const StockService = require('../services/stockService');
// Função para converter data para formato MySQL
function formatDateForMySQL(date) {
  const d = new Date(date);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0') + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0') + ':' +
    String(d.getSeconds()).padStart(2, '0');
}

const SaleModel = {
  async list() {
    const sales = await db('sales').select('*');
    if (sales.length === 0) return [];

    const saleIds = sales.map(sale => sale.id);
    const items = await db('sale_items')
      .whereIn('sale_id', saleIds)
      .select('sale_id', 'product_id', 'product_name', 'quantity', 'unit_price', 'notes');
    const itemsBySaleId = new Map();

    for (const item of items) {
      const saleItems = itemsBySaleId.get(item.sale_id) || [];
      saleItems.push({
        productId: item.product_id,
        productName: item.product_name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        observation: item.notes || ''
      });
      itemsBySaleId.set(item.sale_id, saleItems);
    }

    return sales.map(sale => ({
      ...sale,
      items: itemsBySaleId.get(sale.id) || []
    }));
  },
  async getById(id) {
    return db('sales').where({ id }).first();
  },
  async create(data) {
    try {
      console.log('[SALE][CREATE][DATA]', { 
        items: data.items?.length || 0, 
        total: data.total, 
        paymentMethod: data.paymentMethod,
        dateReceived: data.date
      });

      // Gerar ID único menor que 2.1 bilhões (limite INT MySQL)
      // Usa timestamp dos últimos 5 dígitos + 3 dígitos aleatórios = máximo 99999999 (~100M)
      const now = new Date();
      const timePart = parseInt(now.getTime().toString().slice(-5)); // Últimos 5 dígitos
      const randomPart = Math.floor(Math.random() * 100); // 2 dígitos aleatórios
      const saleId = parseInt(`${timePart}${randomPart.toString().padStart(2, '0')}`); // Máximo 7 dígitos
      
      // Converter data para formato MySQL
      const mysqlDate = formatDateForMySQL(data.date || new Date());
      console.log('[SALE][CREATE][DATE]', { original: data.date, converted: mysqlDate });
      
      // Inserir venda na tabela sales
      await db('sales').insert({
        id: saleId,
        date: mysqlDate,
        total: parseFloat(data.total) || 0,
        discount: parseFloat(data.discount) || 0,
        payment_method: data.paymentMethod,
        customer_name: data.customerName || null,
        customer_id: data.customerId || null
      });

      console.log('[SALE][CREATE][SUCCESS]', { saleId });

      // Inserir itens da venda na tabela sale_items
      if (data.items && data.items.length > 0) {
        const saleItems = data.items.map(item => ({
          sale_id: saleId,
          product_id: item.productId,
          product_name: item.productName,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unitPrice),
          notes: item.notes || null
        }));
        
        await db('sale_items').insert(saleItems);
        console.log('[SALE][ITEMS][SUCCESS]', { itemCount: saleItems.length });

        // Atualizar estoque dos produtos vendidos usando StockService
        for (const item of data.items) {
          const productId = item.productId;
          const quantity = parseFloat(item.quantity);
          
          if (productId && !isNaN(quantity)) {
            try {
              await StockService.processSale({
                productId: productId,
                quantity: quantity,
                saleId: saleId.toString(),
                userId: data.userId || null
              });
              
              console.log('[SALE][STOCK][SUCCESS]', { 
                productId, 
                quantity,
                saleId
              });
            } catch (stockError) {
              console.error('[SALE][STOCK][ERROR]', {
                productId,
                quantity,
                error: stockError.message
              });
              // Não falha a venda por erro de estoque, apenas loga
            }
          }
        }
        
        console.log('[SALE][STOCK][SUCCESS]', 'Estoque atualizado via StockService');
      }

      if (data.customerId) {
        const pointsUsed = Math.max(0, Number(data.loyaltyPointsUsed) || 0);
        const pointsEarned = Math.floor((Number(data.total) || 0) / 10);
        const updatedCustomers = await db('customers')
          .where({ id: data.customerId })
          .whereRaw('COALESCE(loyalty_points, 0) >= ?', [pointsUsed])
          .update({
            loyalty_points: db.raw('COALESCE(loyalty_points, 0) - ? + ?', [pointsUsed, pointsEarned])
          });

        if (updatedCustomers === 0) {
          throw new Error('Cliente não encontrado ou saldo de pontos insuficiente');
        }
      }

      return [saleId];
    } catch (error) {
      console.error('[SALE][CREATE][ERROR]', { 
        error: error.message, 
        stack: error.stack,
        data: {
          itemsCount: data.items?.length || 0,
          total: data.total,
          paymentMethod: data.paymentMethod,
          customerName: data.customerName,
          dateOriginal: data.date
        }
      });
      throw error;
    }
  },
  async update(id, data) {
    return db('sales').where({ id }).update(data);
  },
  async remove(id) {
    return db('sales').where({ id }).del();
  }
};

module.exports = SaleModel;
