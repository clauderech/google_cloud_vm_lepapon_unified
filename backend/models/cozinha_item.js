const { db } = require('../config/knex');
const ProductModel = require('./product');

const KITCHEN_CATEGORIES = ['porção', 'porcao', 'picado', 'preparado', 'fracionado'];

function needsKitchenPreparation(product) {
  if (!product) return false;
  if (['insumo', 'insumo_bebida', 'revenda', 'drink'].includes(product.type)) return false;
  if (product.type === 'prato') return true;

  const category = (product.category || '').toLowerCase();
  return KITCHEN_CATEGORIES.some(value => category.includes(value)) || product.unit === 'frd';
}

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
  notifyRefresh() {
    if (notifyKitchen) notifyKitchen.refreshItems();
  },

  async create(data) {
    const product = await ProductModel.getById(data.product_id);
    if (!needsKitchenPreparation(product)) {
      throw new Error('Produto não requer preparo na cozinha');
    }

    const item = {
      ...data,
      quantidade: data.quantidade,
      status: data.status || 'pending',
      prioridade: data.prioridade || 'normal'
    };
    const [id] = await db('cozinha_items').insert(item).returning('id');
    const createdItem = await db('cozinha_items')
      .leftJoin('products', 'cozinha_items.product_id', 'products.id')
      .leftJoin('comandas', 'cozinha_items.comanda_id', 'comandas.id')
      .where('cozinha_items.id', id)
      .select(
        'cozinha_items.*',
        'products.name as product_name',
        'products.type as product_type',
        'comandas.customer_name as comanda_customer_name'
      )
      .first();

    if (notifyKitchen) notifyKitchen.newItem(createdItem);
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
  async manageCozinhaItems(comandaId, newItems = [], globalNotes = null, trx = db, options = {}) {
    const query = trx;
    const shouldNotify = options.notify !== false;
    console.log('[COZINHA_ITEM][MANAGE] Starting kitchen management for comanda', comandaId, 'with', newItems.length, 'items');
    
    // 1. Buscar itens atuais na cozinha para esta comanda
    const currentItems = await query('cozinha_items')
      .where({ comanda_id: comandaId })
      .select('id', 'product_id', 'quantidade', 'observacao', 'status');
    
    console.log('[COZINHA_ITEM][MANAGE] Current items in kitchen:', currentItems.length);
    
    // 2. Filtrar produtos que precisam de preparo na cozinha
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
    
    // 3. Criar chave única baseada em produto + observação
    const createItemKey = (productId, observacao) => {
      return `${productId}||${observacao || 'sem_obs'}`;
    };
    
    // 4. Criar mapas para comparação eficiente (usando product_id + observacao como chave)
    const currentMap = new Map();
    currentItems.forEach(item => {
      const key = createItemKey(item.product_id, item.observacao);
      const existing = currentMap.get(key);
      if (existing) {
        existing.quantidade += Number(item.quantidade) || 0;
        existing.duplicateIds.push(item.id);
      } else {
        currentMap.set(key, { ...item, duplicateIds: [] });
      }
    });
    
    const newMap = new Map();
    pratosItems.forEach(item => {
      const key = createItemKey(item.product_id, item.observacao);
      const existing = newMap.get(key);
      if (existing) {
        existing.quantidade += Number(item.quantidade) || 0;
      } else {
        newMap.set(key, { ...item, quantidade: Number(item.quantidade) || 0 });
      }
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
        if (currentItem.duplicateIds.length > 0) {
          operations.toDelete.push(...currentItem.duplicateIds);
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
      const insertedIds = [];
      for (const item of operations.toInsert) {
        const [insertedId] = await query('cozinha_items').insert(item);
        insertedIds.push(insertedId);
      }
      
      results.inserted = insertedIds.length;
      console.log('[COZINHA_ITEM][INSERT]', { 
        count: insertedIds.length,
        insertedIds
      });
      
      // Notificar sobre novos itens
      if (shouldNotify && notifyKitchen && insertedIds.length > 0) {
        // Buscar os itens recém inseridos com informações detalhadas
        const newItems = await query('cozinha_items')
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
        if (shouldNotify) notifyKitchen.refreshItems();
      }
    }
    
    if (operations.toDelete.length > 0) {
      await query('cozinha_items').whereIn('id', operations.toDelete).del();
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
