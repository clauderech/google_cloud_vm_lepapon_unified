'use strict';

const { db } = require('../config/knex');

const ComandaModel = {
  async list() {
    // Retorna todas as comandas
    return db('comandas').select('*');
  },
  async getById(id) {
    return db('comandas').where({ id }).first();
  },
  async create(data) {
    return db('comandas').insert(data);
  },
  async update(id, data) {
    return db('comandas').where({ id }).update(data);
  },
  async remove(id) {
    return db('comandas').where({ id }).del();
  },
  async getItems(comandaId) {
    return db('comanda_items').where({ comanda_id: comandaId }).select('*');
  }
};

module.exports = ComandaModel;
