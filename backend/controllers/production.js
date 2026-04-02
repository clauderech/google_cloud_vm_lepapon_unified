const ProductModel = require('../models/product');
const StockService = require('../services/stockService');

/**
 * Controller para produção de insumos caseiros
 * Gerencia o processo de produção de insumos que possuem receitas
 */
const ProductionController = {
  
  /**
   * Lista insumos que podem ser produzidos (têm receitas)
   * GET /api/production/available
   */
  async listAvailableProductions(req, res) {
    try {
      console.log('[PRODUCTION][AVAILABLE][REQ] Route called successfully');
      console.log('[PRODUCTION][AVAILABLE][REQ] Headers:', req.headers);
      
      console.log('[PRODUCTION][AVAILABLE][STEP1] Calling ProductModel.list()...');
      const allProducts = await ProductModel.list();
      console.log('[PRODUCTION][AVAILABLE][STEP1] ProductModel.list() completed, found:', allProducts.length, 'products');
      
      console.log('[PRODUCTION][DEBUG] Total products found:', allProducts.length);
      
      console.log('[PRODUCTION][AVAILABLE][STEP2] Starting product filtering...');
      // Filtrar apenas insumos com receitas válidas
      const availableProductions = allProducts.filter(product => {
        console.log('[PRODUCTION][AVAILABLE][STEP2] Filtering product:', product.id, product.name);
        // Deve ser insumo
        const isInsumo = product.type === 'insumo' || product.type === 'insumo_bebida';
        
        // Deve estar ativo
        const isActive = product.is_active === 1;
        
        // Deve ter receita válida
        let hasValidRecipe = false;
        if (product.recipe) {
          try {
            const recipe = typeof product.recipe === 'string' ? JSON.parse(product.recipe) : product.recipe;
            hasValidRecipe = Array.isArray(recipe) && recipe.length > 0;
          } catch (error) {
            console.warn(`[PRODUCTION] Invalid recipe JSON for product ${product.id}:`, error.message);
          }
        }
        
        const shouldInclude = isInsumo && isActive && hasValidRecipe;
        
        console.log(`[PRODUCTION][DEBUG] Product ${product.id} (${product.name}):`, {
          type: product.type,
          category: product.category,
          isInsumo,
          isActive,
          hasValidRecipe,
          recipeLength: product.recipe ? product.recipe.length : 0,
          shouldInclude
        });
        
        return shouldInclude;
      });
      
      console.log(`[PRODUCTION][DEBUG] Filtered products for production: ${availableProductions.length}`);
      availableProductions.forEach(p => console.log(`  - ${p.id}: ${p.name} (${p.category})`));
      
      console.log('[PRODUCTION][AVAILABLE][STEP3] Starting availability calculations...');
      // Calcular disponibilidade de produção baseado nos ingredientes
      const productionsWithAvailability = await Promise.all(
        availableProductions.map(async (product) => {
          try {
            console.log(`[PRODUCTION][CALC] Processing product ${product.id} (${product.name})`);
            const recipe = typeof product.recipe === 'string' ? JSON.parse(product.recipe) : product.recipe;
            
            console.log(`[PRODUCTION][CALC] Recipe for ${product.name}:`, recipe);
          
          // Calcular quantas unidades podem ser produzidas
          let maxProduction = Infinity;
          const ingredientDetails = [];
          
          for (const recipeItem of recipe) {
            console.log(`[PRODUCTION][CALC] Looking for ingredient: ${recipeItem.ingredientId}`);
            const ingredient = await ProductModel.getById(recipeItem.ingredientId);
            if (ingredient) {
              const availableStock = parseFloat(ingredient.stock) || 0;
              const requiredPerUnit = recipeItem.quantity;
              const possibleUnits = Math.floor(availableStock / requiredPerUnit);
              
              console.log(`[PRODUCTION][CALC] Ingredient ${ingredient.name}: available=${availableStock}, required=${requiredPerUnit}, possible=${possibleUnits}`);
              
              maxProduction = Math.min(maxProduction, possibleUnits);
              
              ingredientDetails.push({
                id: ingredient.id,
                name: ingredient.name,
                required: requiredPerUnit,
                unit: ingredient.unit || 'un',
                available: availableStock,
                possibleUnits: possibleUnits
              });
            } else {
              console.warn(`[PRODUCTION][CALC] Ingredient not found: ${recipeItem.ingredientId}`);
              maxProduction = 0; // Se não encontrar ingrediente, não pode produzir
            }
          }
          
          const finalProduct = {
            ...product,
            maxProduction: maxProduction === Infinity ? 0 : maxProduction,
            ingredientDetails
          };
          
          console.log(`[PRODUCTION][CALC] Final result for ${product.name}: maxProduction=${finalProduct.maxProduction}, ingredients=${ingredientDetails.length}`);
          
          return finalProduct;
          } catch (productError) {
            console.error(`[PRODUCTION][CALC][ERROR] Error processing product ${product.id}:`, productError.message);
            return {
              ...product,
              maxProduction: 0,
              ingredientDetails: [],
              error: productError.message
            };
          }
        })
      );
      console.log('[PRODUCTION][AVAILABLE][STEP4] Availability calculations completed');
      
      console.log('[PRODUCTION][AVAILABLE][SUCCESS]', { 
        count: productionsWithAvailability.length 
      });
      
      console.log('[PRODUCTION][RESPONSE] Sending to frontend:', 
        productionsWithAvailability.map(p => ({ 
          id: p.id, 
          name: p.name, 
          category: p.category,
          maxProduction: p.maxProduction,
          ingredientsCount: p.ingredientDetails.length
        }))
      );
      
      // Adicionar headers CORS explicitamente
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      res.status(200).json({
        success: true,
        data: productionsWithAvailability
      });
      
    } catch (error) {
      console.error('[PRODUCTION][AVAILABLE][ERROR]', {
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro ao listar produções disponíveis',
        error: error.message
      });
    }
  },
  
  /**
   * Produz um insumo caseiro
   * POST /api/production/produce
   */
  async produceItem(req, res) {
    try {
      const { productId, quantity, notes } = req.body;
      const userId = req.user?.id || 'system';
      
      console.log('[PRODUCTION][PRODUCE][REQ]', {
        productId,
        quantity,
        userId
      });
      
      // Validações
      if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ProductId e quantity são obrigatórios e quantity deve ser maior que zero'
        });
      }
      
      // Verificar se produto existe e é um insumo produzível
      const product = await ProductModel.getById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
      }
      
      if (product.type !== 'insumo' && product.type !== 'insumo_bebida') {
        return res.status(400).json({
          success: false,
          message: 'Apenas insumos podem ser produzidos'
        });
      }
      
      if (!product.recipe || product.recipe.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Produto não possui receita definida'
        });
      }
      
      // Processar produção
      const movements = await StockService.processProduction({
        productId,
        quantity: parseFloat(quantity),
        userId,
        notes
      });
      
      console.log('[PRODUCTION][PRODUCE][SUCCESS]', {
        productId,
        productName: product.name,
        quantity,
        movementsCount: movements.length
      });
      
      res.json({
        success: true,
        message: `Produção de ${quantity} ${product.unit || 'un'} de ${product.name} realizada com sucesso`,
        data: {
          productId,
          productName: product.name,
          quantity: parseFloat(quantity),
          unit: product.unit || 'un',
          movements
        }
      });
      
    } catch (error) {
      console.error('[PRODUCTION][PRODUCE][ERROR]', {
        error: error.message,
        stack: error.stack
      });
      
      // Extrair erros específicos do StockService
      if (error.message.includes('Estoque insuficiente')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  },
  
  /**
   * Obtém histórico de produções
   * GET /api/production/history
   */
  async getProductionHistory(req, res) {
    try {
      const { productId, limit = 50 } = req.query;
      
      console.log('[PRODUCTION][HISTORY][REQ]', { productId, limit });
      
      const StockMovementModel = require('../models/stockMovement');
      
      // Buscar movimentações de produção
      const query = {
        movement_type: ['production', 'production_ingredient'],
        limit: parseInt(limit)
      };
      
      if (productId) {
        query.product_id = productId;
      }
      
      const movements = await StockMovementModel.list(query);
      
      // Agrupar por production_id (reference_id)
      const groupedProductions = {};
      
      for (const movement of movements) {
        const productionId = movement.reference_id;
        
        if (!groupedProductions[productionId]) {
          groupedProductions[productionId] = {
            productionId,
            date: movement.created_at,
            userId: movement.user_id,
            producedItems: [],
            consumedIngredients: []
          };
        }
        
        const product = await ProductModel.getById(movement.product_id);
        const movementData = {
          ...movement,
          productName: product?.name || 'Produto não encontrado'
        };
        
        if (movement.movement_type === 'production') {
          groupedProductions[productionId].producedItems.push(movementData);
        } else if (movement.movement_type === 'production_ingredient') {
          groupedProductions[productionId].consumedIngredients.push(movementData);
        }
      }
      
      const productionHistory = Object.values(groupedProductions)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log('[PRODUCTION][HISTORY][SUCCESS]', { 
        count: productionHistory.length 
      });
      
      res.json({
        success: true,
        data: productionHistory
      });
      
    } catch (error) {
      console.error('[PRODUCTION][HISTORY][ERROR]', {
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro ao obter histórico de produção',
        error: error.message
      });
    }
  }
};

module.exports = ProductionController;