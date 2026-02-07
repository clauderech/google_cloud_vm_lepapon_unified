
const { db } = require('../config/knex');

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

  async findByPhone(fone) {
    return db('customers').where({ fone }).first();
  },
  async update(id, data) {
    return db('customers').where({ id }).update(data);
  },
  async remove(id) {
    return db('customers').where({ id }).del();
  },

  async listForDropdown() {
    const customers = await db('customers').select('*');
    return customers.map(customer => ({
      id: customer.id,
      displayName: this.formatDisplayName(customer),
      originalData: customer
    }));
  },

  formatDisplayName(customer) {
    // Formato: id_nome_sobrenome
    const nome = customer.nome || '';
    const sobrenome = customer.sobrenome || '';
    const fullName = `${nome}${sobrenome ? '_' + sobrenome : ''}`.replace(/\s+/g, '_');
    return `${customer.id}_${fullName}`;
  }
};

module.exports = CustomerModel;
