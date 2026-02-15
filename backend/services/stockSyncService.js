/**
 * Stock Sync Service
 * Sincroniza estoque entre catálogo WhatsApp e sistema de Lanchonete
 */

const ProductModel = require('../models/product');
const StockService = require('./stockService');

class StockSyncService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Sincronizar estoque do catálogo WhatsApp com produtos da lanchonete
   * @param {Object} catalogProduct - Produto do catálogo WhatsApp
   * @param {string} catalogProduct.id - ID do produto no catálogo WhatsApp
   * @param {string} catalogProduct.product_id - ID do produto no sistema (se mapeado)
   * @param {number} catalogProduct.availability - Disponibilidade no catálogo
   * @returns {Promise<Object>}
   */
  async syncCatalogStock(catalogProduct) {
    try {
      console.log('[StockSync] Sincronizando estoque de catálogo:', catalogProduct.id);
      
      if (!catalogProduct.product_id) {
        console.warn('[StockSync] Produto do catálogo sem mapeamento:', catalogProduct.id);
        return {
          success: false,
          catalogProductId: catalogProduct.id,
          error: 'Produto não mapeado no sistema'
        };
      }

      // Buscar produto no sistema
      const product = await ProductModel.getById(catalogProduct.product_id);
      if (!product) {
        console.warn('[StockSync] Produto não encontrado no sistema:', catalogProduct.product_id);
        return {
          success: false,
          catalogProductId: catalogProduct.id,
          error: 'Produto não encontrado no sistema'
        };
      }

      // Calcular disponibilidade real do produto
      let realAvailability = 0;
      
      if (product.type === 'prato' || product.type === 'drink') {
        // Para pratos e drinks, calcular quantos podem ser feitos com base nos ingredientes
        if (product.recipe && product.recipe.length > 0) {
          const recipe = typeof product.recipe === 'string' ? JSON.parse(product.recipe) : product.recipe;
          realAvailability = await this.calculateRecipeAvailability(recipe);
        }
      } else if (product.type === 'insumo' || product.type === 'insumo_bebida' || product.type === 'revenda') {
        // Para produtos simples, usar estoque direto
        realAvailability = Math.max(0, Math.floor(parseFloat(product.stock) || 0));
      }

      // Atualizar disponibilidade no catálogo WhatsApp se diferente
      const catalogAvailability = parseInt(catalogProduct.availability) || 0;
      
      if (realAvailability !== catalogAvailability) {
        await this.updateCatalogAvailability(catalogProduct.id, realAvailability);
        console.log('[StockSync] Estoque sincronizado:', {
          catalogProductId: catalogProduct.id,
          productId: product.id,
          previousAvailability: catalogAvailability,
          newAvailability: realAvailability
        });
      }
      
      return {
        success: true,
        catalogProductId: catalogProduct.id,
        productId: product.id,
        synced: realAvailability !== catalogAvailability,
        availability: realAvailability
      };
    } catch (error) {
      console.error('[StockSync] Erro ao sincronizar catálogo:', error);
      throw error;
    }
  }

  /**
   * Sincronizar produto de lanchonete para catálogo WhatsApp
   * @param {Object} product - Produto da lanchonete
   * @returns {Promise<Object>}
   */
  async syncProductToCatalog(product) {
    try {
      console.log('[StockSync] Sincronizando produto para catálogo:', product.id);
      
      // Buscar mapeamento do produto no catálogo WhatsApp
      const catalogMapping = await this.db('whatsapp_catalog_products')
        .where('product_id', product.id)
        .first();
      
      if (!catalogMapping) {
        console.warn('[StockSync] Produto sem mapeamento no catálogo:', product.id);
        return {
          success: false,
          productId: product.id,
          error: 'Produto não mapeado no catálogo WhatsApp'
        };
      }

      // Calcular disponibilidade
      let availability = 0;
      
      if (product.type === 'prato' || product.type === 'drink') {
        if (product.recipe && product.recipe.length > 0) {
          const recipe = typeof product.recipe === 'string' ? JSON.parse(product.recipe) : product.recipe;
          availability = await this.calculateRecipeAvailability(recipe);
        }
      } else if (product.type === 'insumo' || product.type === 'insumo_bebida' || product.type === 'revenda') {
        availability = Math.max(0, Math.floor(parseFloat(product.stock) || 0));
      }

      // Atualizar no catálogo WhatsApp
      await this.updateCatalogAvailability(catalogMapping.catalog_product_id, availability);
      
      console.log('[StockSync] Produto sincronizado para catálogo:', {
        productId: product.id,
        catalogProductId: catalogMapping.catalog_product_id,
        availability
      });
      
      return {
        success: true,
        productId: product.id,
        catalogProductId: catalogMapping.catalog_product_id,
        synced: true,
        availability
      };
    } catch (error) {
      console.error('[StockSync] Erro ao sincronizar produto:', error);
      throw error;
    }
  }

  /**
   * Calcula a disponibilidade de um produto baseado na receita
   * @param {Array} recipe - Receita do produto
   * @returns {Promise<number>} Quantidade máxima que pode ser produzida
   */
  async calculateRecipeAvailability(recipe) {
    let maxQuantity = Infinity;
    
    for (const ingredient of recipe) {
      const ingredientProduct = await ProductModel.getById(ingredient.ingredientId);
      if (ingredientProduct) {
        const availableStock = parseFloat(ingredientProduct.stock) || 0;
        const neededPerUnit = parseFloat(ingredient.quantity) || 0;
        
        if (neededPerUnit > 0) {
          const possibleQuantity = Math.floor(availableStock / neededPerUnit);
          maxQuantity = Math.min(maxQuantity, possibleQuantity);
        } else {
          maxQuantity = 0; // Se algum ingrediente tem quantidade 0, não pode produzir
          break;
        }
      } else {
        maxQuantity = 0; // Se ingrediente não existe, não pode produzir
        break;
      }
    }
    
    return maxQuantity === Infinity ? 0 : Math.max(0, maxQuantity);
  }

  /**
   * Atualiza a disponibilidade de um produto no catálogo WhatsApp
   * @param {string} catalogProductId - ID do produto no catálogo
   * @param {number} availability - Nova disponibilidade
   * @returns {Promise<void>}
   */
  async updateCatalogAvailability(catalogProductId, availability) {
    try {
      // Atualizar na tabela local
      await this.db('whatsapp_catalog_products')
        .where('catalog_product_id', catalogProductId)
        .update({
          availability: availability,
          last_sync: new Date()
        });
      
      // TODO: Implementar chamada para API do WhatsApp Business para atualizar o catálogo
      console.log('[StockSync] Disponibilidade atualizada localmente:', {
        catalogProductId,
        availability
      });
    } catch (error) {
      console.error('[StockSync] Erro ao atualizar disponibilidade:', error);
      throw error;
    }
  }

  /**
   * Sincronizar todos os produtos ativos
   * @returns {Promise<Object>} Resultado da sincronização
   */
  async syncAllProducts() {
    try {
      console.log('[StockSync] Iniciando sincronização completa');
      
      const products = await ProductModel.list();
      const activeProducts = products.filter(p => p.is_active);
      
      const results = {
        total: activeProducts.length,
        synced: 0,
        failed: 0,
        errors: []
      };
      
      for (const product of activeProducts) {
        try {
          await this.syncProductToCatalog(product);
          results.synced++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            productId: product.id,
            error: error.message
          });
        }
      }
      
      console.log('[StockSync] Sincronização completa:', results);
      return results;
    } catch (error) {
      console.error('[StockSync] Erro na sincronização completa:', error);
      throw error;
    }
  }

  /**
   * Obter produtos com estoque baixo para alertas
   * @returns {Promise<Array>}
   */
  async getStockAlerts() {
    try {
      const lowStockProducts = await StockService.getLowStockProducts();
      
      // Buscar produtos que também estão no catálogo WhatsApp
      const alerts = [];
      
      for (const product of lowStockProducts) {
        const catalogMapping = await this.db('whatsapp_catalog_products')
          .where('product_id', product.productId)
          .first();
        
        if (catalogMapping) {
          alerts.push({
            ...product,
            catalogProductId: catalogMapping.catalog_product_id,
            inWhatsappCatalog: true
          });
        } else {
          alerts.push({
            ...product,
            inWhatsappCatalog: false
          });
        }
      }
      
      return alerts;
    } catch (error) {
      console.error('[StockSync] Erro ao buscar alertas:', error);
      throw error;
    }
  }

  /**
   * Verificar e corrigir inconsistências entre sistema e catálogo
   * @returns {Promise<Object>} Relatório de inconsistências
   */
  async checkConsistency() {
    try {
      console.log('[StockSync] Verificando consistências');
      
      const catalogProducts = await this.db('whatsapp_catalog_products').select('*');
      const inconsistencies = [];
      
      for (const catalogProduct of catalogProducts) {
        const systemProduct = await ProductModel.getById(catalogProduct.product_id);
        
        if (!systemProduct) {
          inconsistencies.push({
            type: 'missing_product',
            catalogProductId: catalogProduct.catalog_product_id,
            productId: catalogProduct.product_id,
            message: 'Produto no catálogo mas não existe no sistema'
          });
          continue;
        }
        
        // Calcular disponibilidade real
        let realAvailability = 0;
        if (systemProduct.type === 'prato' || systemProduct.type === 'drink') {
          if (systemProduct.recipe) {
            const recipe = typeof systemProduct.recipe === 'string' ? JSON.parse(systemProduct.recipe) : systemProduct.recipe;
            realAvailability = await this.calculateRecipeAvailability(recipe);
          }
        } else {
          realAvailability = Math.max(0, Math.floor(parseFloat(systemProduct.stock) || 0));
        }
        
        if (realAvailability !== catalogProduct.availability) {
          inconsistencies.push({
            type: 'stock_mismatch',
            catalogProductId: catalogProduct.catalog_product_id,
            productId: catalogProduct.product_id,
            catalogAvailability: catalogProduct.availability,
            realAvailability: realAvailability,
            message: 'Disponibilidade divergente entre sistema e catálogo'
          });
        }
      }
      
      return {
        total_checked: catalogProducts.length,
        inconsistencies_found: inconsistencies.length,
        inconsistencies
      };
    } catch (error) {
      console.error('[StockSync] Erro na verificação de consistência:', error);
      throw error;
    }
  }
}

module.exports = StockSyncService;
