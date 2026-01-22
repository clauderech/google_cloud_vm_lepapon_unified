'use strict';

const { db } = require('../config/knex');

const PurchaseModel = {
  async list() {
    return db('purchases').select('*');
  },
  async getById(id) {
    return db('purchases').where({ id }).first();
  },
  async create(data) {
    return db('purchases').insert(data);
  },
  async update(id, data) {
    return db('purchases').where({ id }).update(data);
  },
  async remove(id) {
    return db('purchases').where({ id }).del();
  }
};

module.exports = PurchaseModel;
