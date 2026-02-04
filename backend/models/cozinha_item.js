import { db } from '../config/knex.js';

const CozinhaItem = {
  async create(data) {
    const [id] = await db('cozinha_items').insert(data).returning('id');
    return id;
  },
  async list(filter = {}) {
    let query = db('cozinha_items');
    if (filter.status) query = query.where('status', filter.status);
    if (filter.prioridade) query = query.where('prioridade', filter.prioridade);
    if (filter.responsavel) query = query.where('responsavel', filter.responsavel);
    return query.orderBy('prioridade', 'desc').orderBy('created_at', 'asc');
  },
  async updateStatus(id, status, responsavel = null) {
    await db('cozinha_items').where({ id }).update({ status, responsavel, updated_at: db.fn.now() });
    await db('cozinha_item_status_history').insert({ cozinha_item_id: id, status, responsavel });
  },
  async getHistory(id) {
    return db('cozinha_item_status_history').where({ cozinha_item_id: id }).orderBy('timestamp', 'asc');
  }
};

export default CozinhaItem;
