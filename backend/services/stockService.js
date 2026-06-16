const axios = require('axios');
const ProductModel = require('../models/product');
const StockMovementModel = require('../models/stockMovement');

const LEPAPON_REMOTE_STOCK_URL = process.env.LEPAPON_REMOTE_STOCK_URL || 'https://lepapon.com.br/api/produtos';
const LEPAPON_REMOTE_TOKEN = process.env.LEPAPON_REMOTE_TOKEN || '';

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

      // Sincroniza estoque com Lepapon para produtos relevantes
      try {
        const productType = product.type;
        if (productType === 'revenda' || productType === 'prato') {
          await this.syncProductStockToLepapon(productId);
        } else if (productType === 'insumo' || productType === 'insumo_bebida') {
          await this.syncRecipeProductsAffectedByIngredient(productId);
        }
      } catch (syncError) {
        console.error('[STOCK_SERVICE][LEPAPON_SYNC][ERROR]', {
          productId,
          error: syncError.message,
          stack: syncError.stack
        });
      }

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

  async sendStockToLepapon(productId, stock) {
    const headers = { 'Content-Type': 'application/json' };
    if (LEPAPON_REMOTE_TOKEN) headers.Authorization = `Bearer ${LEPAPON_REMOTE_TOKEN}`;

    try {
      const response = await axios.patch(
        `${LEPAPON_REMOTE_STOCK_URL}/${encodeURIComponent(productId)}/stock`,
        { stock },
        { headers, timeout: 15000 }
      );

      console.log('[STOCK_SERVICE][LEPAPON_SYNC][SUCCESS]', {
        productId,
        stock,
        status: response.status
      });
    } catch (err) {
      console.error('[STOCK_SERVICE][LEPAPON_SYNC][HTTP_ERROR]', {
        productId,
        stock,
        error: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      throw err;
    }
  }

  async calculateLepaponStock(product) {
    if (!product) return 0;

    if (product.type === 'revenda') {
      return Math.max(0, Math.floor(parseFloat(product.stock) || 0));
    }

    if ((product.type === 'prato' || product.type === 'drink') && product.recipe && product.recipe.length > 0) {
      let maxCount = Infinity;
      for (const recipeItem of product.recipe) {
        const ingredient = await ProductModel.getById(recipeItem.ingredientId);
        if (!ingredient) return 0;
        const qtyNeeded = parseFloat(recipeItem.quantity) || 0;
        if (qtyNeeded <= 0) return 0;
        const possible = Math.floor((parseFloat(ingredient.stock) || 0) / qtyNeeded);
        maxCount = Math.min(maxCount, possible);
      }
      return maxCount === Infinity ? 0 : Math.max(0, maxCount);
    }

    return 0;
  }

  async syncProductStockToLepapon(productId) {
    const product = await ProductModel.getById(productId);
    if (!product) {
      console.warn('[STOCK_SERVICE][LEPAPON_SYNC][PRODUCT_NOT_FOUND]', { productId });
      return;
    }

    if (!['prato', 'revenda'].includes(product.type)) {
      return;
    }

    const stock = await this.calculateLepaponStock(product);
    await this.sendStockToLepapon(product.id, stock);
  }

  async syncRecipeProductsAffectedByIngredient(ingredientId) {
    const products = await ProductModel.list();
    const affected = products.filter(product =>
      (product.type === 'prato' || product.type === 'drink') &&
      Array.isArray(product.recipe) &&
      product.recipe.some(item => item.ingredientId === ingredientId)
    );

    for (const product of affected) {
      await this.syncProductStockToLepapon(product.id);
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

    if (((product.type === 'prato' || product.type === 'drink') && product.recipe) || 
        ((product.type === 'insumo' || product.type === 'insumo_bebida') && product.recipe)) {
      // Produto com receita - deduz ingredientes (pratos, drinks e insumos caseiros)
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
    } else if (((product.type === 'insumo' || product.type === 'insumo_bebida') && !product.recipe) || 
               product.type === 'revenda' || 
               (product.type === 'drink' && !product.recipe)) {
      // Produto simples - deduz diretamente (insumos básicos, revenda, drinks simples)
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
   * Processa produção de insumo caseiro com receita
   * @param {Object} params - Parâmetros da produção
   * @param {string} params.productId - ID do insumo a ser produzido
   * @param {number} params.quantity - Quantidade a ser produzida
   * @param {string} params.userId - ID do usuário
   * @param {string} params.notes - Observações opcionais
   * @returns {Promise<Array>} Lista de movimentações realizadas
   */
  async processProduction(params) {
    const { productId, quantity, userId, notes } = params;
    
    console.log('[STOCK_SERVICE][PRODUCTION]', { productId, quantity });
    
    const movements = [];
    const product = await ProductModel.getById(productId);
    
    if (!product) {
      throw new Error(`Produto não encontrado: ${productId}`);
    }

    // Verificar se é um insumo com receita
    if (product.type !== 'insumo' && product.type !== 'insumo_bebida') {
      throw new Error(`Produto ${product.name} não é um insumo. Apenas insumos podem ser produzidos.`);
    }

    if (!product.recipe || product.recipe.length === 0) {
      throw new Error(`Produto ${product.name} não tem receita definida. Impossível produzir.`);
    }

    const recipe = typeof product.recipe === 'string' ? JSON.parse(product.recipe) : product.recipe;
    const productionId = `prod_${Date.now()}`;
    
    // Verificar se há ingredientes suficientes
    for (const recipeItem of recipe) {
      const ingredient = await ProductModel.getById(recipeItem.ingredientId);
      if (!ingredient) {
        throw new Error(`Ingrediente não encontrado: ${recipeItem.ingredientId}`);
      }
      
      const requiredQuantity = recipeItem.quantity * quantity;
      const availableStock = parseFloat(ingredient.stock) || 0;
      
      if (availableStock < requiredQuantity) {
        throw new Error(`Estoque insuficiente de ${ingredient.name}. Necessário: ${requiredQuantity} ${ingredient.unit || 'un'}, Disponível: ${availableStock} ${ingredient.unit || 'un'}`);
      }
    }
    
    // Consumir ingredientes
    for (const recipeItem of recipe) {
      const ingredientQuantity = -(recipeItem.quantity * quantity); // Negativo para deduzir
      
      const ingredient = await ProductModel.getById(recipeItem.ingredientId);
      const movement = await this.updateStock({
        productId: recipeItem.ingredientId,
        quantity: ingredientQuantity,
        movementType: 'production_ingredient',
        referenceType: 'production',
        referenceId: productionId,
        notes: `Ingrediente para produção: ${product.name} (${quantity}x)`,
        userId
      });
      
      movements.push(movement);
    }
    
    // Produzir insumo final
    const productionMovement = await this.updateStock({
      productId: productId,
      quantity: quantity, // Positivo para adicionar
      movementType: 'production',
      referenceType: 'production',
      referenceId: productionId,
      notes: notes || `Produção caseira de ${product.name}`,
      userId
    });
    
    movements.push(productionMovement);
    
    // Recalcular custo baseado nos ingredientes
    await this.updateProductionCost(productId);

    console.log('[STOCK_SERVICE][PRODUCTION][SUCCESS]', {
      productId,
      productName: product.name,
      quantity,
      ingredientsConsumed: recipe.length,
      productionId
    });

    return movements;
  }

  /**
   * Atualiza o custo do produto baseado no custo dos ingredientes da receita
   * @param {string} productId - ID do produto
   * @returns {Promise<void>}
   */
  async updateProductionCost(productId) {
    const product = await ProductModel.getById(productId);
    if (!product || !product.recipe) return;
    
    const recipe = typeof product.recipe === 'string' ? JSON.parse(product.recipe) : product.recipe;
    let totalCost = 0;
    
    for (const recipeItem of recipe) {
      const ingredient = await ProductModel.getById(recipeItem.ingredientId);
      if (ingredient) {
        const ingredientCost = parseFloat(ingredient.cost) || 0;
        totalCost += ingredientCost * recipeItem.quantity;
      }
    }
    
    if (totalCost > 0) {
      await ProductModel.update(productId, { cost: totalCost });
      console.log('[STOCK_SERVICE][COST_UPDATE]', {
        productId,
        productName: product.name,
        newCost: totalCost
      });
    }
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
      const productId = item.product_id || item.productId;
      const quantity = parseFloat(item.quantity);
      
      if (!productId || isNaN(quantity)) {
        console.warn('[STOCK_SERVICE][COMANDA][SKIP]', { productId, quantity });
        continue;
      }
      
      // Usar a mesma lógica inteligente que processSale()
      const product = await ProductModel.getById(productId);
      if (!product) {
        console.warn(`[STOCK_SERVICE][COMANDA][PRODUCT_NOT_FOUND] ${productId}`);
        continue;
      }

      if (((product.type === 'prato' || product.type === 'drink') && product.recipe) || 
          ((product.type === 'insumo' || product.type === 'insumo_bebida') && product.recipe)) {
        // Produto com receita - deduz ingredientes (pratos, drinks e insumos caseiros)
        const recipe = typeof product.recipe === 'string' ? JSON.parse(product.recipe) : product.recipe;
        
        for (const recipeItem of recipe) {
          const ingredientQuantity = -(recipeItem.quantity * quantity); // Negativo para deduzir
          
          const movement = await this.updateStock({
            productId: recipeItem.ingredientId,
            quantity: ingredientQuantity,
            movementType: 'recipe_usage',
            referenceType: 'comanda',
            referenceId: comandaId,
            notes: `Uso em receita: ${product.name} (${quantity}x) - Comanda`,
            userId
          });
          
          movements.push(movement);
        }
      } else if (((product.type === 'insumo' || product.type === 'insumo_bebida') && !product.recipe) || 
                 product.type === 'revenda' || 
                 (product.type === 'drink' && !product.recipe)) {
        // Produto simples - deduz diretamente (insumos básicos, revenda, drinks simples)
        const movement = await this.updateStock({
          productId: productId,
          quantity: -quantity, // Negativo para deduzir
          movementType: 'comanda_add',
          referenceType: 'comanda',
          referenceId: comandaId,
          notes: `Adicionado à comanda`,
          userId
        });
        
        movements.push(movement);
      } else {
        console.warn(`[STOCK_SERVICE][COMANDA][SKIP_TYPE] Tipo de produto não suportado: ${product.type} para produto ${productId}`);
      }
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
      const productId = item.product_id || item.productId;
      const quantity = parseFloat(item.quantity);
      
      if (!productId || isNaN(quantity)) {
        console.warn('[STOCK_SERVICE][COMANDA_REVERT][SKIP]', { productId, quantity });
        continue;
      }
      
      // Usar a mesma lógica inteligente que processSale()
      const product = await ProductModel.getById(productId);
      if (!product) {
        console.warn(`[STOCK_SERVICE][COMANDA_REVERT][PRODUCT_NOT_FOUND] ${productId}`);
        continue;
      }

      if (((product.type === 'prato' || product.type === 'drink') && product.recipe) || 
          ((product.type === 'insumo' || product.type === 'insumo_bebida') && product.recipe)) {
        // Produto com receita - reverte ingredientes (pratos, drinks e insumos caseiros)
        const recipe = typeof product.recipe === 'string' ? JSON.parse(product.recipe) : product.recipe;
        
        for (const recipeItem of recipe) {
          const ingredientQuantity = recipeItem.quantity * quantity; // POSITIVO para devolver
          
          const movement = await this.updateStock({
            productId: recipeItem.ingredientId,
            quantity: ingredientQuantity,
            movementType: 'recipe_revert',
            referenceType: 'comanda',
            referenceId: comandaId,
            notes: `Reversão receita: ${product.name} (${quantity}x) - Comanda cancelada`,
            userId
          });
          
          movements.push(movement);
        }
      } else if (((product.type === 'insumo' || product.type === 'insumo_bebida') && !product.recipe) || 
                 product.type === 'revenda' || 
                 (product.type === 'drink' && !product.recipe)) {
        // Produto simples - reverte diretamente
        const movement = await this.updateStock({
          productId: productId,
          quantity: quantity, // POSITIVO para devolver
          movementType: 'comanda_cancel',
          referenceType: 'comanda',
          referenceId: comandaId,
          notes: `Comanda cancelada - estoque revertido`,
          userId
        });
        
        movements.push(movement);
      } else {
        console.warn(`[STOCK_SERVICE][COMANDA_REVERT][SKIP_TYPE] Tipo de produto não suportado: ${product.type} para produto ${productId}`);
      }
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