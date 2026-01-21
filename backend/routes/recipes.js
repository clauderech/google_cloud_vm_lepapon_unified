'use strict';

const express = require('express');
const RecipeController = require('../controllers/RecipeController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

/**
 * Recipes Routes
 */

// POST /api/recipes - Criar nova receita
router.post('/', RecipeController.create);

// GET /api/recipes - Listar receitas
router.get('/', RecipeController.list);

// GET /api/recipes/:id - Obter receita por ID
router.get('/:id', RecipeController.getById);

// GET /api/recipes/product/:productId - Obter receita por product ID
router.get('/product/:productId', RecipeController.getByProductId);

// POST /api/recipes/:id/ingredients - Adicionar ingrediente
router.post('/:id/ingredients', RecipeController.addIngredient);

// PUT /api/recipes/:recipeId/ingredients/:ingredientId - Atualizar ingrediente
router.put('/:recipeId/ingredients/:ingredientId', RecipeController.updateIngredient);

// DELETE /api/recipes/:recipeId/ingredients/:ingredientId - Remover ingrediente
router.delete('/:recipeId/ingredients/:ingredientId', RecipeController.removeIngredient);

// GET /api/recipes/:productId/production-capacity - Calcular capacidade
router.get('/:productId/production-capacity', RecipeController.getProductionCapacity);

// POST /api/recipes/:productId/validate-stock - Validar estoque
router.post('/:productId/validate-stock', RecipeController.validateStock);

// PUT /api/recipes/:id - Atualizar receita
router.put('/:id', RecipeController.update);

// DELETE /api/recipes/:id - Deletar receita
router.delete('/:id', RecipeController.delete);

module.exports = router;
