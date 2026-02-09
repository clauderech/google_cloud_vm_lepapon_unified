
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
    try {
      console.log('[SALE][CREATE][DATA]', { 
        items: data.items?.length || 0, 
        total: data.total, 
        paymentMethod: data.paymentMethod 
      });

      // Gerar ID único para a venda
      const saleId = `sale_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      
      // Inserir venda na tabela sales
      await db('sales').insert({
        id: saleId,
        date: data.date || new Date(),
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
                    console.log('[SALE][STOCK][INGREDIENT]', { 
                      ingredientId: recipeItem.ingredientId, 
                      oldStock: ingredient.stock, 
                      newStock 
                    });
                  }
                }
              } else if (product.type === 'insumo' || product.type === 'insumo_bebida' || product.type === 'revenda') {
                // Para insumos e revenda, deduzir diretamente do estoque
                const newStock = Math.max(0, (parseFloat(product.stock) || 0) - quantity);
                await ProductModel.update(productId, { stock: newStock });
                console.log('[SALE][STOCK][DIRECT]', { 
                  productId, 
                  oldStock: product.stock, 
                  newStock 
                });
              }
            }
          }
        }
        
        console.log('[SALE][STOCK][SUCCESS]', 'Estoque atualizado');
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
          customerName: data.customerName
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
