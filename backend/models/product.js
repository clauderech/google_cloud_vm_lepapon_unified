'use strict';

const { db } = require('../config/knex');

const ProductModel = {
  async list() {
    const rows = await db('products').select('*');
    return rows.map(row => ({
      ...row,
      recipe: row.recipe ? (typeof row.recipe === 'string' ? JSON.parse(row.recipe) : row.recipe) : []
    }));
  },
  async getById(id) {
    const row = await db('products').where({ id }).first();
    if (!row) return null;
    return {
      ...row,
      recipe: row.recipe ? (typeof row.recipe === 'string' ? JSON.parse(row.recipe) : row.recipe) : []
    };
  },
  async create(data) {
    console.log('[PRODUCT][MODEL][CREATE][REQ]', { 
      id: data.id, 
      name: data.name, 
      type: data.type,
      stock: data.stock,
      hasRecipe: !!data.recipe,
      recipeLength: data.recipe?.length || 0
    });
    
    try {
      const toSave = { ...data };
      if (toSave.recipe) toSave.recipe = JSON.stringify(toSave.recipe);
      
      const result = await db('products').insert(toSave);
      
      console.log('[PRODUCT][MODEL][CREATE][SUCCESS]', { 
        id: data.id, 
        name: data.name,
        insertResult: result
      });
      
      return result;
    } catch (err) {
      console.error('[PRODUCT][MODEL][CREATE][ERROR]', {
        id: data.id,
        name: data.name,
        error: err.message,
        code: err.code,
        stack: err.stack
      });
      throw err;
    }
  },
  async update(id, data) {
    console.log('[PRODUCT][MODEL][UPDATE][REQ]', { 
      id, 
      fields: Object.keys(data),
      hasRecipe: !!data.recipe
    });
    
    try {
      const toSave = { ...data };
      if (toSave.recipe) toSave.recipe = JSON.stringify(toSave.recipe);
      
      const result = await db('products').where({ id }).update(toSave);
      
      console.log('[PRODUCT][MODEL][UPDATE][SUCCESS]', { 
        id,
        rowsAffected: result
      });
      
      return result;
    } catch (err) {
      console.error('[PRODUCT][MODEL][UPDATE][ERROR]', {
        id,
        error: err.message,
        code: err.code,
        stack: err.stack
      });
      throw err;
    }
  },
  async remove(id) {
    return db('products').where({ id }).del();
  }
};

module.exports = ProductModel;
