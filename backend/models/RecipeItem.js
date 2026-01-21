'use strict';

const knex = require('../config/knex').buildKnexConfig();
const db = require('knex')(knex);

/**
 * Model: RecipeItem
 * Ingredientes das receitas
 */

class RecipeItem {
  /**
   * Adicionar ingrediente à receita
   */
  static async create(data) {
    const [id] = await db('recipe_items').insert({
      recipe_id: data.recipeId,
      ingredient_id: data.ingredientId,
      quantity: data.quantity,
      unit: data.unit || 'un',
      notes: data.notes,
    });

    return this.findById(id);
  }

  /**
   * Buscar ingrediente por ID
   */
  static async findById(id) {
    return db('recipe_items')
      .where('id', id)
      .leftJoin('products', 'recipe_items.ingredient_id', 'products.id')
      .select('recipe_items.*', 'products.name as ingredient_name', 'products.stock')
      .first();
  }

  /**
   * Listar ingredientes de uma receita
   */
  static async listByRecipe(recipeId) {
    return db('recipe_items')
      .where('recipe_id', recipeId)
      .leftJoin('products', 'recipe_items.ingredient_id', 'products.id')
      .select(
        'recipe_items.*',
        'products.name as ingredient_name',
        'products.stock',
        'products.unit',
        'products.cost'
      )
      .orderBy('recipe_items.created_at', 'asc');
  }

  /**
   * Atualizar ingrediente
   */
  static async update(id, data) {
    const updateData = {};

    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unit) updateData.unit = data.unit;
    if (data.notes) updateData.notes = data.notes;

    await db('recipe_items')
      .where('id', id)
      .update(updateData);

    return this.findById(id);
  }

  /**
   * Remover ingrediente
   */
  static async delete(id) {
    return db('recipe_items')
      .where('id', id)
      .del();
  }

  /**
   * Remover todos os ingredientes de uma receita
   */
  static async deleteByRecipe(recipeId) {
    return db('recipe_items')
      .where('recipe_id', recipeId)
      .del();
  }

  /**
   * Calcular custo total da receita
   */
  static async calculateRecipeCost(recipeId) {
    const items = await db('recipe_items')
      .where('recipe_id', recipeId)
      .leftJoin('products', 'recipe_items.ingredient_id', 'products.id')
      .select(
        db.raw('SUM(recipe_items.quantity * COALESCE(products.cost, 0)) as total_cost')
      )
      .first();

    return items?.total_cost || 0;
  }
}

module.exports = RecipeItem;
