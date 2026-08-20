'use strict';

const { db } = require('../config/knex');

const ProductModel = {
  async list() {
    const rows = await db('products').where({ is_active: 1 }).select('*');
    return rows.map(row => ({
      ...row,
      packageQuantity: Number(row.package_quantity ?? 1),
      recipe: row.recipe ? (typeof row.recipe === 'string' ? JSON.parse(row.recipe) : row.recipe) : []
    }));
  },
  async getById(id, client = db) {
    const row = await client('products').where({ id }).first();
    if (!row) return null;
    return {
      ...row,
      packageQuantity: Number(row.package_quantity ?? 1),
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
      if (Object.prototype.hasOwnProperty.call(toSave, 'packageQuantity')) {
        toSave.package_quantity = Number(toSave.packageQuantity ?? 1);
        delete toSave.packageQuantity;
      }
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
  async update(id, data, client = db) {
    console.log('[PRODUCT][MODEL][UPDATE][REQ]', { 
      id, 
      fields: Object.keys(data),
      hasRecipe: !!data.recipe
    });
    
    try {
      const toSave = { ...data };
      if (Object.prototype.hasOwnProperty.call(toSave, 'packageQuantity')) {
        toSave.package_quantity = Number(toSave.packageQuantity ?? 1);
        delete toSave.packageQuantity;
      }
      if (toSave.recipe) toSave.recipe = JSON.stringify(toSave.recipe);
      
      const result = await client('products').where({ id }).update(toSave);
      
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
  },

  async listByCategoryWithStock(category) {
    const rows = await db('products')
      .where({ is_active: 1, category })
      .where('stock', '>', 0)
      .select('id', 'name', 'price', 'stock')
      .orderBy('name', 'asc');

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      price: parseFloat(row.price || 0),
      stock: parseFloat(row.stock || 0)
    }));
  },

  async listRefrigerantesWithStock() {
    return this.listByCategoryWithStock('refrigerantes');
  },

  async listCervejasWithStock() {
    return this.listByCategoryWithStock('cervejas');
  }
};

module.exports = ProductModel;
