const { db } = require('../config/knex');
const ProductModel = require('./product');

// Notificações em tempo real (com fallback se Socket.IO não estiver disponível)
let notifyKitchen = null;
try {
  const { notifyKitchen: socketNotify } = require('../services/socketConfig');
  notifyKitchen = socketNotify;
} catch (e) {
  console.warn('[CozinhaItem] Socket.IO não disponível, notificações desabilitadas');
  notifyKitchen = {
    newItem: () => {},
    statusUpdate: () => {},
    itemUpdate: () => {},
    refreshItems: () => {}
  };
}

const CozinhaItem = {
  async create(data) {
    const [id] = await db('cozinha_items').insert(data).returning('id');
    return id;
  },

  /**
   * Gerencia os itens da cozinha para uma comanda específica
   * Faz diff inteligente para inserir/atualizar/remover apenas o necessário
   * Envia para cozinha: pratos, drinks, porções, fracionados e produtos de preparo
   * @param {number} comandaId - ID da comanda
   * @param {Array} newItems - Array de itens: [{productId, quantity, notes}]
   * @param {string} globalNotes - Observações globais do pedido (usado quando item.notes for vazio)
   */
  async manageCozinhaItems(comandaId, newItems = [], globalNotes = null) {
    console.log('[COZINHA_ITEM][MANAGE] Starting kitchen management for comanda', comandaId, 'with', newItems.length, 'items');
    
    // 1. Buscar itens atuais na cozinha para esta comanda
    const currentItems = await db('cozinha_items')
      .where({ comanda_id: comandaId })
      .select('id', 'product_id', 'quantidade', 'observacao', 'status');
    
    console.log('[COZINHA_ITEM][MANAGE] Current items in kitchen:', currentItems.length);
    
    // 2. Função para determinar se produto precisa de preparo na cozinha
    const needsKitchenPreparation = (product) => {
      if (!product) return false;
      
      // Tipos que sempre vão para cozinha
      if (product.type === 'prato' || product.type === 'drink') {
        return true;
      }
      
      // Categorias que precisam de preparo
      const kitchenCategories = ['porção', 'porcao', 'picado', 'preparado', 'fracionado'];
      const categoryLower = (product.category || '').toLowerCase();
      if (kitchenCategories.some(cat => categoryLower.includes(cat))) {
        return true;
      }
      
      // Unidades que indicam preparo fracionado
      if (product.unit === 'frd') {
        return true;
      }
      
      return false;
    };
    
    // 3. Filtrar produtos que precisam de preparo na cozinha
    const pratosItems = [];
    for (const item of newItems) {
      const productId = item.productId || item.product_id;
      if (!productId) continue;
      
      const product = await ProductModel.getById(productId);
      const needsKitchen = needsKitchenPreparation(product);
      
      console.log(`[COZINHA_ITEM][FILTER] Product ${productId} (${product?.name}) - type:${product?.type}, category:'${product?.category}', unit:${product?.unit} → Kitchen: ${needsKitchen ? 'YES' : 'NO'}`);
      
      if (needsKitchen) {
        pratosItems.push({
          product_id: productId,
          quantidade: item.quantity || item.quantidade,
          observacao: item.notes || item.observacao || globalNotes || null
        });
      }
    }
    
    console.log('[COZINHA_ITEM][MANAGE] Filtered kitchen items (pratos + porções + drinks + fracionados):', pratosItems.length);
    
    // 3. Função para criar chave única baseada em produto + observação
    const createItemKey = (productId, observacao) => {
      return `${productId}||${observacao || 'sem_obs'}`;
    };
    
    // 4. Criar mapas para comparação eficiente (usando product_id + observacao como chave)
    const currentMap = new Map();
    currentItems.forEach(item => {
      const key = createItemKey(item.product_id, item.observacao);
      currentMap.set(key, item);
    });
    
    const newMap = new Map();
    pratosItems.forEach(item => {
      const key = createItemKey(item.product_id, item.observacao);
      newMap.set(key, item);
    });
    
    const operations = {
      toInsert: [],
      toUpdate: [],
      toDelete: []
    };
    
    // 5. Identificar itens para inserir ou atualizar
    for (const [itemKey, newItem] of newMap) {
      const currentItem = currentMap.get(itemKey);
      
      if (!currentItem) {
        // Item não existe na cozinha - inserir
        operations.toInsert.push({
          comanda_id: comandaId,
          product_id: newItem.product_id,
          quantidade: newItem.quantidade,
          status: 'pending',
          observacao: newItem.observacao || globalNotes || null,
          prioridade: 'normal',
          responsavel: null
        });
      } else {
        // Item existe - verificar se precisa atualizar quantidade
        if (currentItem.quantidade !== newItem.quantidade) {
          operations.toUpdate.push({
            id: currentItem.id,
            quantidade: newItem.quantidade,
            observacao: newItem.observacao || globalNotes || null
          });
        }
      }
    }
    
    // 6. Identificar itens para remover (estavam na cozinha mas não estão mais na comanda)
    for (const [itemKey, currentItem] of currentMap) {
      if (!newMap.has(itemKey)) {
        operations.toDelete.push(currentItem.id);
      }
    }
    
    console.log('[COZINHA_ITEM][MANAGE] Operations:', {
      toInsert: operations.toInsert.length,
      toUpdate: operations.toUpdate.length,
      toDelete: operations.toDelete.length,
      newKeys: Array.from(newMap.keys()),
      currentKeys: Array.from(currentMap.keys())
    });
    
    // 7. Executar operações no banco
    const results = { inserted: 0, updated: 0, deleted: 0 };
    
    if (operations.toInsert.length > 0) {
      const insertedIds = await db('cozinha_items').insert(operations.toInsert);
      results.inserted = operations.toInsert.length;
      
      // Notificar sobre novos itens
      if (notifyKitchen && insertedIds.length > 0) {
        // Buscar os itens recém inseridos com informações detalhadas
        const newItems = await db('cozinha_items')
          .leftJoin('products', 'cozinha_items.product_id', 'products.id')
          .leftJoin('comandas', 'cozinha_items.comanda_id', 'comandas.id')
          .whereIn('cozinha_items.id', insertedIds)
          .select(
            'cozinha_items.*',
            'products.name as product_name',
            'products.type as product_type',
            'comandas.customer_name as comanda_customer_name'
          );
          
        newItems.forEach(item => {
          notifyKitchen.newItem(item);
        });
      }
    }
    
    if (operations.toUpdate.length > 0) {
      for (const update of operations.toUpdate) {
        await db('cozinha_items')
          .where({ id: update.id })
          .update({
            quantidade: update.quantidade,
            observacao: update.observacao,
            updated_at: db.fn.now()
          });
      }
      results.updated = operations.toUpdate.length;
      
      // Notificar sobre atualizações
      if (notifyKitchen && operations.toUpdate.length > 0) {
        notifyKitchen.refreshItems();
      }
    }
    
    if (operations.toDelete.length > 0) {
      await db('cozinha_items').whereIn('id', operations.toDelete).del();
      results.deleted = operations.toDelete.length;
    }
    
    console.log('[COZINHA_ITEM][MANAGE] Completed:', results);
    return results;
  },
  async list(filter = {}) {
    let query = db('cozinha_items')
      .leftJoin('products', 'cozinha_items.product_id', 'products.id')
      .leftJoin('comandas', 'cozinha_items.comanda_id', 'comandas.id')
      .select(
        'cozinha_items.*',
        'products.name as product_name',
        'products.type as product_type',
        'comandas.customer_name as comanda_customer_name'
      );
      
    if (filter.status) query = query.where('cozinha_items.status', filter.status);
    if (filter.prioridade) query = query.where('cozinha_items.prioridade', filter.prioridade);
    if (filter.responsavel) query = query.where('cozinha_items.responsavel', filter.responsavel);
    
    return query.orderBy('cozinha_items.prioridade', 'desc')
                .orderBy('cozinha_items.created_at', 'asc');
  },
  async updateStatus(id, status, responsavel = null) {
    await db('cozinha_items').where({ id }).update({ status, responsavel, updated_at: db.fn.now() });
    await db('cozinha_item_status_history').insert({ cozinha_item_id: id, status, responsavel });
    
    // Notificar mudança de status em tempo real
    if (notifyKitchen) {
      notifyKitchen.statusUpdate(id, status, responsavel);
    }
  },
  async getHistory(id) {
    return db('cozinha_item_status_history').where({ cozinha_item_id: id }).orderBy('timestamp', 'asc');
  }
};

module.exports = CozinhaItem;
