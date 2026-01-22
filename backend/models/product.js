'use strict';

const { db } = require('../config/knex');

const ProductModel = {
  async list() {
    return db('products').select('*');
  },
  async getById(id) {
    return db('products').where({ id }).first();
  },
  async create(data) {
    return db('products').insert(data);
  },
  async update(id, data) {
    return db('products').where({ id }).update(data);
  },
  async remove(id) {
    return db('products').where({ id }).del();
  }
};

module.exports = ProductModel;
