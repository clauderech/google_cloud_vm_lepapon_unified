'use strict';

import { db } from '../config/knex.js';

const SupplierModel = {
  async list() {
    return db('suppliers').select('*');
  },
  async getById(id) {
    return db('suppliers').where({ id }).first();
  },
  async create(data) {
    return db('suppliers').insert(data);
  },
  async update(id, data) {
    return db('suppliers').where({ id }).update(data);
  },
  async remove(id) {
    return db('suppliers').where({ id }).del();
  }
};

export default SupplierModel;
