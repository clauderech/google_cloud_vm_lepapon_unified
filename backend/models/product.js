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
  
  async findByNameAndType(name, type) {
    const row = await db('products')
      .where({ name: name.trim(), type })
      .first();
    if (!row) return null;
    return {
      ...row,
      recipe: row.recipe ? (typeof row.recipe === 'string' ? JSON.parse(row.recipe) : row.recipe) : []
    };
  },
  
  async create(data) {
    const toSave = { 
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Validar e serializar recipe
    if (toSave.recipe) {
      if (!Array.isArray(toSave.recipe)) {
        throw new Error('Recipe deve ser um array');
      }
      toSave.recipe = JSON.stringify(toSave.recipe);
    }
    
    return db('products').insert(toSave);
  },
  
  async update(id, data) {
    const toSave = { 
      ...data,
      updated_at: new Date()
    };
    
    // Validar e serializar recipe
    if (toSave.recipe !== undefined) {
      if (toSave.recipe && !Array.isArray(toSave.recipe)) {
        throw new Error('Recipe deve ser um array');
      }
      toSave.recipe = toSave.recipe ? JSON.stringify(toSave.recipe) : null;
    }
    
    return db('products').where({ id }).update(toSave);
  },
  
  async remove(id) {
    // Verificar se produto está sendo usado
    const usageChecks = await Promise.all([
      db('sale_items').where({ product_id: id }).first(),
      db('purchase_items').where({ product_id: id }).first(),
      db('comanda_items').where({ product_id: id }).first(),
      db('cozinha_items').where({ product_id: id }).first()
    ]);
    
    const isBeingUsed = usageChecks.some(check => check !== undefined);
    if (isBeingUsed) {
      throw new Error('Produto não pode ser removido pois está sendo usado em vendas, compras ou comandas');
    }
    
    return db('products').where({ id }).del();
  }
};

module.exports = ProductModel;
