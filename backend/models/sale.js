
const { db } = require('../config/knex');

const SaleModel = {
  async list() {
    return db('sales').select('*');
  },
  async getById(id) {
    return db('sales').where({ id }).first();
  },
  async create(data) {
    return db('sales').insert(data);
  },
  async update(id, data) {
    return db('sales').where({ id }).update(data);
  },
  async remove(id) {
    return db('sales').where({ id }).del();
  }
};

module.exports = SaleModel;
