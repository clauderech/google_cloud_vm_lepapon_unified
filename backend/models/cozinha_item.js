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
   * 
   * FILTROS APLICADOS (em ordem de prioridade):
   * 1. Insumos/revenda NUNCA vão para cozinha (correção de bug)  
   * 2. Pratos SEMPRE vão para cozinha
   * 3. Drinks NUNCA vão para cozinha  
   * 4. Produtos com categorias especiais: porção, picado, preparado, fracionado
   * 5. Produtos com unidade 'frd' (fracionado)
   * 
   * CORREÇÃO WebSocket: Agora calcula IDs inseridos corretamente para evitar duplicação
   * de notificações. MySQL retorna [insertId, affectedRows], não array de IDs.
   * 
   * @param {number} comandaId - ID da comanda
   * @param {Array} newItems - Array de itens: [{productId, quantity, notes, observation}]
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
      
      // PRIMEIRO: Verificar tipos que NUNCA vão para cozinha (correção principal)
      if (product.type === 'insumo' || product.type === 'insumo_bebida' || product.type === 'revenda') {
        // Log de debug para produtos incorretamente categorizados
        if (product.category) {
          const categoryLower = product.category.toLowerCase();
          const kitchenCategories = ['porção', 'porcao', 'picado', 'preparado', 'fracionado'];
          const hasKitchenCategory = kitchenCategories.some(cat => categoryLower.includes(cat));
          
          if (hasKitchenCategory || product.unit === 'frd') {
            console.warn(`[COZINHA_ITEM][FILTER][BLOCKED] Produto tipo '${product.type}' com categoria/unidade de cozinha BLOQUEADO:`, {
              id: product.id,
              name: product.name,
              type: product.type,
              category: product.category,
              unit: product.unit,
              reason: 'Insumos/revenda não devem ir para cozinha'
            });
          }
        }
        return false; // ✅ Força insumos/revenda a NÃO irem para cozinha
      }
      
      // SEGUNDO: Tipos que sempre vão para cozinha
      if (product.type === 'prato') {
        return true;
      }
      
      // Drinks não vão para cozinha (apenas pratos)
      if (product.type === 'drink') {
        console.log(`[COZINHA_ITEM][FILTER][BLOCKED] Drink NÃO enviado para cozinha:`, {
          id: product.id,
          name: product.name,
          type: product.type,
          reason: 'Drinks não precisam de preparo na cozinha'
        });
        return false;
      }
      
      // TERCEIRO: Categorias especiais (apenas para tipos não definidos acima)
      const kitchenCategories = ['porção', 'porcao', 'picado', 'preparado', 'fracionado'];
      const categoryLower = (product.category || '').toLowerCase();
      if (kitchenCategories.some(cat => categoryLower.includes(cat))) {
        console.log(`[COZINHA_ITEM][FILTER][CATEGORY] Produto enviado para cozinha por categoria:`, {
          id: product.id,
          name: product.name,
          type: product.type,
          category: product.category,
          matchedCategory: kitchenCategories.find(cat => categoryLower.includes(cat))
        });
        return true;
      }
      
      // QUARTO: Unidades que indicam preparo fracionado (apenas para tipos não definidos acima)
      if (product.unit === 'frd') {
        console.log(`[COZINHA_ITEM][FILTER][UNIT] Produto enviado para cozinha por unidade fracionada:`, {
          id: product.id,
          name: product.name,
          type: product.type,
          unit: product.unit
        });
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
      
      console.log(`[COZINHA_ITEM][FILTER] Product ${productId} (${product?.name}) - type:'${product?.type}', category:'${product?.category}', unit:'${product?.unit}' → Kitchen: ${needsKitchen ? 'YES' : 'NO'}`);
      
      if (needsKitchen) {
        pratosItems.push({
          product_id: productId,
          quantidade: item.quantity || item.quantidade,
          observacao: item.notes || item.observacao || item.observation || globalNotes || null
        });
      }
    }
    
    console.log('[COZINHA_ITEM][MANAGE] Filtered kitchen items (apenas pratos + categorias especiais):', pratosItems.length);
    console.log('[COZINHA_ITEM][MANAGE] Items going to kitchen:', pratosItems.map(item => ({
      productId: item.product_id,
      quantidade: item.quantidade,
      observacao: item.observacao || 'sem obs'
    })));
    
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
          observacao: newItem.observacao || newItem.observation || globalNotes || null,
          prioridade: 'normal',
          responsavel: null
        });
      } else {
        // Item existe - verificar se precisa atualizar quantidade
        if (currentItem.quantidade !== newItem.quantidade) {
          operations.toUpdate.push({
            id: currentItem.id,
            quantidade: newItem.quantidade,
            observacao: newItem.observacao || newItem.observation || globalNotes || null
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
      const result = await db('cozinha_items').insert(operations.toInsert);
      const firstInsertId = result[0]; // MySQL retorna [insertId, affectedRows]
      const count = operations.toInsert.length;
      
      // Calcular IDs sequenciais corretos (MySQL AUTO_INCREMENT é sequencial)
      const insertedIds = Array.from(
        { length: count }, 
        (_, i) => firstInsertId + i
      );
      
      results.inserted = count;
      console.log('[COZINHA_ITEM][INSERT]', { 
        firstId: firstInsertId, 
        count, 
        calculatedIds: insertedIds 
      });
      
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
          
        console.log('[COZINHA_ITEM][NOTIFY]', { 
          expectedCount: insertedIds.length, 
          foundCount: newItems.length,
          itemIds: newItems.map(item => item.id)
        });
          
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
