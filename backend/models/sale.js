
const { db } = require('../config/knex');
const ProductModel = require('./product');

const SaleModel = {
  async list() {
    return db('sales').select('*');
  },
  async getById(id) {
    return db('sales').where({ id }).first();
  },
  async create(data) {
    // Inserir venda na tabela sales
    const [saleId] = await db('sales').insert({
      date: data.date || new Date().toISOString(),
      subtotal: data.subtotal,
      total: data.total,
      discount: data.discount || 0,
      payment_method: data.paymentMethod,
      customer_name: data.customerName,
      customer_id: data.customerId
    });

    // Inserir itens da venda na tabela sale_items
    if (data.items && data.items.length > 0) {
      const saleItems = data.items.map(item => ({
        sale_id: saleId,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        notes: item.notes || null
      }));
      
      await db('sale_items').insert(saleItems);

      // Atualizar estoque dos produtos vendidos
      for (const item of data.items) {
        const productId = item.productId;
        const quantity = parseFloat(item.quantity);
        
        if (productId && !isNaN(quantity)) {
          const product = await ProductModel.getById(productId);
          
          if (product) {
            if (product.type === 'prato' && product.recipe) {
              // Para pratos, deduzir ingredientes da receita
              const recipe = typeof product.recipe === 'string' ? JSON.parse(product.recipe) : product.recipe;
              
              for (const recipeItem of recipe) {
                const ingredient = await ProductModel.getById(recipeItem.ingredientId);
                if (ingredient) {
                  const newStock = Math.max(0, (parseFloat(ingredient.stock) || 0) - (recipeItem.quantity * quantity));
                  await ProductModel.update(recipeItem.ingredientId, { stock: newStock });
                }
              }
            } else if (product.type === 'insumo' || product.type === 'insumo_bebida' || product.type === 'revenda') {
              // Para insumos e revenda, deduzir diretamente do estoque
              const newStock = Math.max(0, (parseFloat(product.stock) || 0) - quantity);
              await ProductModel.update(productId, { stock: newStock });
            }
          }
        }
      }
    }

    return [saleId];
  },
  async update(id, data) {
    return db('sales').where({ id }).update(data);
  },
  async remove(id) {
    return db('sales').where({ id }).del();
  }
};

module.exports = SaleModel;
