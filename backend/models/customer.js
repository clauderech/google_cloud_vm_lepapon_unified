'use strict';

import { db } from '../config/knex.js';

const CustomerModel = {
  async list() {
    return db('customers').select('*');
  },
  async getById(id) {
    return db('customers').where({ id }).first();
  },
  async create(data) {
    return db('customers').insert(data);
  },
  async update(id, data) {
    return db('customers').where({ id }).update(data);
  },
  async remove(id) {
    return db('customers').where({ id }).del();
  }
};

export default CustomerModel;
