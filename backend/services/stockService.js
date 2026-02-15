const ProductModel = require('../models/product');
const StockMovementModel = require('../models/stockMovement');

/**
 * Service centralizado para gerenciamento de estoque
 * Responsável por todas as atualizações de estoque e auditoria
 */
class StockService {
  
  /**
   * Atualiza o estoque de um produto e registra a movimentação
   * @param {Object} params - Parâmetros da atualização
   * @param {string} params.productId - ID do produto
   * @param {number} params.quantity - Quantidade a ser movimentada (+ adiciona, - subtrai)
   * @param {string} params.movementType - Tipo da movimentação (sale, purchase, adjustment, etc.)
   * @param {string} params.referenceType - Tipo de referência (sale, purchase, comanda, manual_adjustment)
   * @param {string} params.referenceId - ID da referência
   * @param {string} params.notes - Observações opcionais
   * @param {string} params.userId - ID do usuário que fez a alteração
   * @returns {Promise<Object>} Resultado da operação
   */
  async updateStock(params) {
    const { productId, quantity, movementType, referenceType, referenceId, notes, userId } = params;
    
    console.log('[STOCK_SERVICE][UPDATE]', {
      productId,
      quantity,
      movementType,
      referenceType,
      referenceId
    });

    try {
      // Busca produto atual
      const product = await ProductModel.getById(productId);
      if (!product) {
        throw new Error(`Produto não encontrado: ${productId}`);
      }

      const previousStock = parseFloat(product.stock) || 0;
      const quantityNum = parseFloat(quantity) || 0;
      const newStock = Math.max(0, previousStock + quantityNum); // Não permite estoque negativo

      // Atualiza estoque do produto
      await ProductModel.update(productId, { stock: newStock });

      // Registra movimentação
      await StockMovementModel.create({
        product_id: productId,
        movement_type: movementType,
        quantity: quantityNum,
        previous_stock: previousStock,
        new_stock: newStock,
        reference_type: referenceType,
        reference_id: referenceId,
        notes: notes,
        user_id: userId
      });

      console.log('[STOCK_SERVICE][UPDATE][SUCCESS]', {
        productId,
        previousStock,
        newStock,
        quantity: quantityNum
      });

      return {
        success: true,
        productId,
        previousStock,
        newStock,
        quantity: quantityNum
      };

    } catch (error) {
      console.error('[STOCK_SERVICE][UPDATE][ERROR]', {
        productId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Processa venda de um produto (com ou sem receita)
   * @param {Object} params - Parâmetros da venda
   * @param {string} params.productId - ID do produto vendido
   * @param {number} params.quantity - Quantidade vendida
   * @param {string} params.saleId - ID da venda
   * @param {string} params.userId - ID do usuário
   * @returns {Promise<Array>} Lista de movimentações realizadas
   */
  async processSale(params) {
    const { productId, quantity, saleId, userId } = params;
    
    console.log('[STOCK_SERVICE][SALE]', { productId, quantity, saleId });
    
    const movements = [];
    const product = await ProductModel.getById(productId);
    
    if (!product) {
      throw new Error(`Produto não encontrado: ${productId}`);
    }

    if ((product.type === 'prato' || product.type === 'drink') && product.recipe) {
      // Produto com receita - deduz ingredientes
      const recipe = typeof product.recipe === 'string' ? JSON.parse(product.recipe) : product.recipe;
      
      for (const recipeItem of recipe) {
        const ingredientQuantity = -(recipeItem.quantity * quantity); // Negativo para deduzir
        
        const movement = await this.updateStock({
          productId: recipeItem.ingredientId,
          quantity: ingredientQuantity,
          movementType: 'recipe_usage',
          referenceType: 'sale',
          referenceId: saleId,
          notes: `Uso em receita: ${product.name} (${quantity}x)`,
          userId
        });
        
        movements.push(movement);
      }
    } else if (product.type === 'insumo' || product.type === 'insumo_bebida' || product.type === 'revenda' || (product.type === 'drink' && !product.recipe)) {
      // Produto simples - deduz diretamente
      const movement = await this.updateStock({
        productId: productId,
        quantity: -quantity, // Negativo para deduzir
        movementType: 'sale',
        referenceType: 'sale',
        referenceId: saleId,
        notes: `Venda direta`,
        userId
      });
      
      movements.push(movement);
    }

    return movements;
  }

  /**
   * Processa compra de produtos
   * @param {Object} params - Parâmetros da compra
   * @param {Array} params.items - Lista de itens comprados
   * @param {string} params.purchaseId - ID da compra
   * @param {string} params.userId - ID do usuário
   * @returns {Promise<Array>} Lista de movimentações realizadas
   */
  async processPurchase(params) {
    const { items, purchaseId, userId } = params;
    
    console.log('[STOCK_SERVICE][PURCHASE]', { itemsCount: items.length, purchaseId });
    
    const movements = [];
    
    for (const item of items) {
      const movement = await this.updateStock({
        productId: item.productId || item.product_id,
        quantity: parseFloat(item.quantity), // Positivo para adicionar
        movementType: 'purchase',
        referenceType: 'purchase',
        referenceId: purchaseId,
        notes: `Compra - ${item.productName || item.product_name || ''}`,
        userId
      });
      
      movements.push(movement);
    }

    return movements;
  }

  /**
   * Processa comanda (adicionar itens)
   * @param {Object} params - Parâmetros da comanda
   * @param {Array} params.items - Lista de itens da comanda
   * @param {string} params.comandaId - ID da comanda
   * @param {string} params.userId - ID do usuário
   * @returns {Promise<Array>} Lista de movimentações realizadas
   */
  async processComanda(params) {
    const { items, comandaId, userId } = params;
    
    console.log('[STOCK_SERVICE][COMANDA]', { itemsCount: items.length, comandaId });
    
    const movements = [];
    
    for (const item of items) {
      const movement = await this.updateStock({
        productId: item.product_id || item.productId,
        quantity: -parseFloat(item.quantity), // Negativo para deduzir
        movementType: 'comanda_add',
        referenceType: 'comanda',
        referenceId: comandaId,
        notes: `Adicionado à comanda`,
        userId
      });
      
      movements.push(movement);
    }

    return movements;
  }

  /**
   * Reverte comanda (cancelar/deletar comanda)
   * @param {Object} params - Parâmetros da reversão
   * @param {Array} params.items - Lista de itens para reverter
   * @param {string} params.comandaId - ID da comanda
   * @param {string} params.userId - ID do usuário
   * @returns {Promise<Array>} Lista de movimentações realizadas
   */
  async revertComanda(params) {
    const { items, comandaId, userId } = params;
    
    console.log('[STOCK_SERVICE][COMANDA_REVERT]', { itemsCount: items.length, comandaId });
    
    const movements = [];
    
    for (const item of items) {
      const movement = await this.updateStock({
        productId: item.product_id || item.productId,
        quantity: parseFloat(item.quantity), // Positivo para adicionar de volta
        movementType: 'comanda_cancel',
        referenceType: 'comanda',
        referenceId: comandaId,
        notes: `Comanda cancelada - estoque revertido`,
        userId
      });
      
      movements.push(movement);
    }

    return movements;
  }

  /**
   * Ajuste manual de estoque
   * @param {Object} params - Parâmetros do ajuste
   * @param {string} params.productId - ID do produto
   * @param {number} params.newStock - Novo valor do estoque
   * @param {string} params.reason - Razão do ajuste
   * @param {string} params.userId - ID do usuário
   * @returns {Promise<Object>} Resultado da operação
   */
  async adjustStock(params) {
    const { productId, newStock, reason, userId } = params;
    
    const product = await ProductModel.getById(productId);
    if (!product) {
      throw new Error(`Produto não encontrado: ${productId}`);
    }

    const currentStock = parseFloat(product.stock) || 0;
    const newStockNum = parseFloat(newStock) || 0;
    const difference = newStockNum - currentStock;

    return await this.updateStock({
      productId,
      quantity: difference,
      movementType: 'adjustment',
      referenceType: 'manual_adjustment',
      referenceId: `adj_${Date.now()}`,
      notes: reason || 'Ajuste manual',
      userId
    });
  }

  /**
   * Obtém produtos com estoque baixo
   * @returns {Promise<Array>} Lista de produtos com estoque baixo
   */
  async getLowStockProducts() {
    const products = await ProductModel.list();
    
    return products.filter(product => {
      const stock = parseFloat(product.stock) || 0;
      const minStock = parseFloat(product.min_stock) || 0;
      return stock <= minStock && product.type === 'insumo';
    }).map(product => ({
      productId: product.id,
      productName: product.name,
      currentStock: parseFloat(product.stock) || 0,
      minStock: parseFloat(product.min_stock) || 0,
      difference: (parseFloat(product.min_stock) || 0) - (parseFloat(product.stock) || 0),
      unit: product.unit || 'un'
    }));
  }

  /**
   * Obtém histórico de movimentações de um produto
   * @param {string} productId - ID do produto
   * @param {Object} options - Opções de filtro
   * @returns {Promise<Array>} Lista de movimentações
   */
  async getProductMovements(productId, options = {}) {
    return await StockMovementModel.getByProduct(productId, options);
  }

  /**
   * Obtém estatísticas de estoque
   * @returns {Promise<Object>} Estatísticas gerais
   */
  async getStockStats() {
    const products = await ProductModel.list();
    const lowStockProducts = await this.getLowStockProducts();
    
    const stats = {
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      totalValue: 0,
      byType: {
        insumo: 0,
        insumo_bebida: 0,
        prato: 0,
        drink: 0,
        revenda: 0
      }
    };

    products.forEach(product => {
      const stock = parseFloat(product.stock) || 0;
      const cost = parseFloat(product.cost) || 0;
      stats.totalValue += stock * cost;
      
      if (stats.byType[product.type] !== undefined) {
        stats.byType[product.type]++;
      }
    });

    return stats;
  }
}

module.exports = new StockService();