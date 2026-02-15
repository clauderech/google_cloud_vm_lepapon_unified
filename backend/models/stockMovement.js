const { db } = require('../config/knex');

const StockMovementModel = {
  
  /**
   * Registra uma movimentação de estoque
   * @param {Object} data - Dados da movimentação
   * @param {string} data.product_id - ID do produto
   * @param {string} data.movement_type - Tipo da movimentação (sale, purchase, adjustment, etc.)
   * @param {number} data.quantity - Quantidade movimentada (pode ser negativa)
   * @param {number} data.previous_stock - Estoque anterior
   * @param {number} data.new_stock - Novo estoque
   * @param {string} data.reference_type - Tipo de referência (sale, purchase, comanda, manual_adjustment)
   * @param {string} data.reference_id - ID da referência
   * @param {string} data.notes - Observações opcionais
   * @param {string} data.user_id - ID do usuário que fez a movimentação
   * @returns {Promise<number>} ID da movimentação criada
   */
  async create(data) {
    console.log('[STOCK_MOVEMENT][CREATE]', {
      product_id: data.product_id,
      movement_type: data.movement_type,
      quantity: data.quantity,
      reference_type: data.reference_type,
      reference_id: data.reference_id
    });
    
    const [id] = await db('stock_movements').insert({
      product_id: data.product_id,
      movement_type: data.movement_type,
      quantity: parseFloat(data.quantity),
      previous_stock: parseFloat(data.previous_stock),
      new_stock: parseFloat(data.new_stock),
      reference_type: data.reference_type,
      reference_id: data.reference_id,
      notes: data.notes || null,
      user_id: data.user_id || null,
      created_at: new Date()
    });
    
    return id;
  },

  /**
   * Lista movimentações de um produto
   * @param {string} productId - ID do produto
   * @param {Object} options - Opções de filtro
   * @param {number} options.limit - Limite de resultados (padrão: 50)
   * @param {string} options.movement_type - Filtro por tipo de movimentação
   * @returns {Promise<Array>} Lista de movimentações
   */
  async getByProduct(productId, options = {}) {
    let query = db('stock_movements')
      .where('product_id', productId)
      .orderBy('created_at', 'desc');
    
    if (options.movement_type) {
      query = query.where('movement_type', options.movement_type);
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    } else {
      query = query.limit(50);
    }
    
    return query;
  },

  /**
   * Lista movimentações por referência (ex: todas as movimentações de uma venda)
   * @param {string} referenceType - Tipo de referência
   * @param {string} referenceId - ID da referência
   * @returns {Promise<Array>} Lista de movimentações
   */
  async getByReference(referenceType, referenceId) {
    return db('stock_movements')
      .where('reference_type', referenceType)
      .where('reference_id', referenceId)
      .orderBy('created_at', 'desc');
  },

  /**
   * Lista todas as movimentações com filtros
   * @param {Object} filters - Filtros opcionais
   * @param {Date} filters.start_date - Data início
   * @param {Date} filters.end_date - Data fim
   * @param {string} filters.movement_type - Tipo de movimentação
   * @param {number} filters.limit - Limite de resultados
   * @returns {Promise<Array>} Lista de movimentações
   */
  async list(filters = {}) {
    let query = db('stock_movements')
      .select('stock_movements.*', 'products.name as product_name')
      .leftJoin('products', 'stock_movements.product_id', 'products.id')
      .orderBy('stock_movements.created_at', 'desc');
    
    if (filters.start_date) {
      query = query.where('stock_movements.created_at', '>=', filters.start_date);
    }
    
    if (filters.end_date) {
      query = query.where('stock_movements.created_at', '<=', filters.end_date);
    }
    
    if (filters.movement_type) {
      query = query.where('stock_movements.movement_type', filters.movement_type);
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(100);
    }
    
    return query;
  },

  /**
   * Remove movimentações antigas (para limpeza)
   * @param {number} daysOld - Dias atrás para manter
   * @returns {Promise<number>} Número de registros removidos
   */
  async cleanup(daysOld = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    return db('stock_movements')
      .where('created_at', '<', cutoffDate)
      .del();
  }
};

module.exports = StockMovementModel;