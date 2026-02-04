'use strict';

import { db } from '../config/knex.js';

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
    const toSave = { ...data };
    if (toSave.recipe) toSave.recipe = JSON.stringify(toSave.recipe);
    return db('products').insert(toSave);
  },
  async update(id, data) {
    const toSave = { ...data };
    if (toSave.recipe) toSave.recipe = JSON.stringify(toSave.recipe);
    return db('products').where({ id }).update(toSave);
  },
  async remove(id) {
    return db('products').where({ id }).del();
  }
};

export default ProductModel;
