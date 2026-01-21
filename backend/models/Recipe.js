'use strict';

const knex = require('../config/knex').buildKnexConfig();
const db = require('knex')(knex);
const crypto = require('crypto');

/**
 * Model: Recipe
 * Receitas de pratos com ingredientes
 */

class Recipe {
  /**
   * Gerar UUID
   */
  static generateId() {
    return crypto.randomUUID();
  }

  /**
   * Criar nova receita
   */
  static async create(data) {
    const id = this.generateId();

    await db('recipes').insert({
      id,
      product_id: data.productId,
      notes: data.notes,
      is_active: data.isActive !== false,
    });

    return this.findById(id);
  }

  /**
   * Buscar receita por ID
   */
  static async findById(id) {
    const recipe = await db('recipes')
      .where('id', id)
      .first();

    if (recipe) {
      recipe.ingredients = await db('recipe_items')
        .where('recipe_id', id)
        .leftJoin('products', 'recipe_items.ingredient_id', 'products.id')
        .select('recipe_items.*', 'products.name as ingredient_name', 'products.stock');
    }

    return recipe;
  }

  /**
   * Buscar receita por product_id
   */
  static async findByProductId(productId) {
    const recipe = await db('recipes')
      .where('product_id', productId)
      .first();

    if (recipe) {
      recipe.ingredients = await db('recipe_items')
        .where('recipe_id', recipe.id)
        .leftJoin('products', 'recipe_items.ingredient_id', 'products.id')
        .select('recipe_items.*', 'products.name as ingredient_name', 'products.stock');
    }

    return recipe;
  }

  /**
   * Listar todas as receitas
   */
  static async list(filters = {}) {
    let query = db('recipes');

    if (filters.isActive !== undefined) {
      query = query.where('is_active', filters.isActive);
    }

    query = query.orderBy('created_at', 'desc');

    const recipes = await query;

    for (const recipe of recipes) {
      recipe.ingredients = await db('recipe_items')
        .where('recipe_id', recipe.id)
        .leftJoin('products', 'recipe_items.ingredient_id', 'products.id')
        .select('recipe_items.*', 'products.name as ingredient_name', 'products.stock');
    }

    return recipes;
  }

  /**
   * Atualizar receita
   */
  static async update(id, data) {
    const updateData = {};

    if (data.notes) updateData.notes = data.notes;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    updateData.updated_at = db.fn.now();

    await db('recipes')
      .where('id', id)
      .update(updateData);

    return this.findById(id);
  }

  /**
   * Deletar receita (também remove ingredientes)
   */
  static async delete(id) {
    // Remover ingredientes primeiro
    await db('recipe_items').where('recipe_id', id).del();

    return db('recipes')
      .where('id', id)
      .del();
  }

  /**
   * Calcular capacidade de produção baseado nos ingredientes
   */
  static async calculateProductionCapacity(productId) {
    const recipe = await this.findByProductId(productId);

    if (!recipe) {
      return 0;
    }

    if (recipe.ingredients.length === 0) {
      return Infinity;
    }

    // Encontrar o ingrediente mais limitante
    let minCapacity = Infinity;

    for (const ingredient of recipe.ingredients) {
      const stock = ingredient.stock || 0;
      const required = ingredient.quantity || 1;
      const capacity = Math.floor(stock / required);

      minCapacity = Math.min(minCapacity, capacity);
    }

    return minCapacity === Infinity ? 0 : minCapacity;
  }

  /**
   * Validar se há estoque suficiente para preparar
   */
  static async validateStock(productId, quantity = 1) {
    const recipe = await this.findByProductId(productId);

    if (!recipe) {
      return { valid: false, reason: 'Recipe not found' };
    }

    for (const ingredient of recipe.ingredients) {
      const required = ingredient.quantity * quantity;
      const available = ingredient.stock || 0;

      if (available < required) {
        return {
          valid: false,
          reason: `Insufficient stock of ${ingredient.ingredient_name}. Required: ${required}, Available: ${available}`,
        };
      }
    }

    return { valid: true };
  }
}

module.exports = Recipe;
