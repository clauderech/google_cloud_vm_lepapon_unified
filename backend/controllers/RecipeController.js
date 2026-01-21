'use strict';

const Recipe = require('../models/Recipe');
const RecipeItem = require('../models/RecipeItem');

/**
 * Controller: RecipeController
 * Gerencia receitas de pratos
 */

class RecipeController {
  /**
   * POST /api/recipes
   * Criar nova receita
   */
  static async create(req, res) {
    try {
      const { productId, notes } = req.body;

      if (!productId) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'productId é obrigatório',
        });
      }

      const recipe = await Recipe.create({
        productId,
        notes,
      });

      res.status(201).json({
        success: true,
        message: 'Receita criada com sucesso',
        data: recipe,
      });
    } catch (error) {
      console.error('Erro ao criar receita:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/recipes/:id
   * Obter receita por ID
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const recipe = await Recipe.findById(id);

      if (!recipe) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Receita não encontrada',
        });
      }

      res.json({
        success: true,
        data: recipe,
      });
    } catch (error) {
      console.error('Erro ao buscar receita:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/recipes/product/:productId
   * Obter receita por product ID
   */
  static async getByProductId(req, res) {
    try {
      const { productId } = req.params;

      const recipe = await Recipe.findByProductId(productId);

      if (!recipe) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Receita não encontrada para este produto',
        });
      }

      res.json({
        success: true,
        data: recipe,
      });
    } catch (error) {
      console.error('Erro ao buscar receita:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/recipes
   * Listar todas as receitas
   */
  static async list(req, res) {
    try {
      const { isActive = true } = req.query;

      const recipes = await Recipe.list({
        isActive: isActive === 'true',
      });

      res.json({
        success: true,
        data: recipes,
        count: recipes.length,
      });
    } catch (error) {
      console.error('Erro ao listar receitas:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/recipes/:id/ingredients
   * Adicionar ingrediente à receita
   */
  static async addIngredient(req, res) {
    try {
      const { id } = req.params;
      const { ingredientId, quantity, unit } = req.body;

      if (!ingredientId || !quantity) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Campos obrigatórios: ingredientId, quantity',
        });
      }

      // Verificar se receita existe
      const recipe = await Recipe.findById(id);
      if (!recipe) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Receita não encontrada',
        });
      }

      const ingredient = await RecipeItem.create({
        recipeId: id,
        ingredientId,
        quantity: parseFloat(quantity),
        unit: unit || 'un',
      });

      res.status(201).json({
        success: true,
        message: 'Ingrediente adicionado à receita',
        data: ingredient,
      });
    } catch (error) {
      console.error('Erro ao adicionar ingrediente:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/recipes/:recipeId/ingredients/:ingredientId
   * Atualizar ingrediente
   */
  static async updateIngredient(req, res) {
    try {
      const { recipeId, ingredientId } = req.params;
      const { quantity, unit } = req.body;

      const ingredient = await RecipeItem.findById(ingredientId);

      if (!ingredient || ingredient.recipe_id !== recipeId) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Ingrediente não encontrado',
        });
      }

      const updated = await RecipeItem.update(ingredientId, {
        quantity: quantity !== undefined ? parseFloat(quantity) : ingredient.quantity,
        unit: unit || ingredient.unit,
      });

      res.json({
        success: true,
        message: 'Ingrediente atualizado com sucesso',
        data: updated,
      });
    } catch (error) {
      console.error('Erro ao atualizar ingrediente:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/recipes/:recipeId/ingredients/:ingredientId
   * Remover ingrediente
   */
  static async removeIngredient(req, res) {
    try {
      const { recipeId, ingredientId } = req.params;

      const ingredient = await RecipeItem.findById(ingredientId);

      if (!ingredient || ingredient.recipe_id !== recipeId) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Ingrediente não encontrado',
        });
      }

      await RecipeItem.delete(ingredientId);

      res.json({
        success: true,
        message: 'Ingrediente removido com sucesso',
      });
    } catch (error) {
      console.error('Erro ao remover ingrediente:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/recipes/:productId/production-capacity
   * Calcular capacidade de produção
   */
  static async getProductionCapacity(req, res) {
    try {
      const { productId } = req.params;

      const capacity = await Recipe.calculateProductionCapacity(productId);

      res.json({
        success: true,
        data: {
          productId,
          capacity,
        },
      });
    } catch (error) {
      console.error('Erro ao calcular capacidade:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/recipes/:productId/validate-stock
   * Validar se há estoque para preparar
   */
  static async validateStock(req, res) {
    try {
      const { productId } = req.params;
      const { quantity = 1 } = req.body;

      const validation = await Recipe.validateStock(productId, parseInt(quantity, 10));

      res.json({
        success: validation.valid,
        data: validation,
      });
    } catch (error) {
      console.error('Erro ao validar estoque:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/recipes/:id
   * Atualizar receita
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { notes, isActive } = req.body;

      const recipe = await Recipe.findById(id);

      if (!recipe) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Receita não encontrada',
        });
      }

      const updated = await Recipe.update(id, { notes, isActive });

      res.json({
        success: true,
        message: 'Receita atualizada com sucesso',
        data: updated,
      });
    } catch (error) {
      console.error('Erro ao atualizar receita:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/recipes/:id
   * Deletar receita
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const recipe = await Recipe.findById(id);

      if (!recipe) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Receita não encontrada',
        });
      }

      await Recipe.delete(id);

      res.json({
        success: true,
        message: 'Receita deletada com sucesso',
      });
    } catch (error) {
      console.error('Erro ao deletar receita:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }
}

module.exports = RecipeController;
