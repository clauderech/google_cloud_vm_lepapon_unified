'use strict';

const knex = require('../config/knex').buildKnexConfig();
const db = require('knex')(knex);
const crypto = require('crypto');

/**
 * Model: User
 * Usuários do sistema com autenticação e roles
 */

class User {
  /**
   * Hash de senha seguro
   */
  static hashPassword(password) {
    return crypto
      .pbkdf2Sync(password, process.env.PASSWORD_SALT || 'default-salt', 1000, 64, 'sha512')
      .toString('hex');
  }

  /**
   * Verificar se senha está correta
   */
  static verifyPassword(password, hash) {
    const newHash = this.hashPassword(password);
    return newHash === hash;
  }

  /**
   * Gerar UUID
   */
  static generateId() {
    return crypto.randomUUID();
  }

  /**
   * Criar novo usuário
   */
  static async create(data) {
    const id = this.generateId();
    const passwordHash = this.hashPassword(data.password);

    await db('users').insert({
      id,
      username: data.username,
      password_hash: passwordHash,
      name: data.name,
      role: data.role || 'caixa',
      permissions: data.permissions ? JSON.stringify(data.permissions) : null,
      is_active: data.isActive !== false,
    });

    return this.findById(id);
  }

  /**
   * Buscar usuário por ID
   */
  static async findById(id) {
    const user = await db('users')
      .where('id', id)
      .first();

    if (user && user.permissions) {
      user.permissions = JSON.parse(user.permissions);
    }

    return user;
  }

  /**
   * Buscar usuário por username
   */
  static async findByUsername(username) {
    const user = await db('users')
      .where('username', username)
      .first();

    if (user && user.permissions) {
      user.permissions = JSON.parse(user.permissions);
    }

    return user;
  }

  /**
   * Autenticar usuário (login)
   */
  static async authenticate(username, password) {
    const user = await this.findByUsername(username);

    if (!user || !user.is_active) {
      return null;
    }

    if (!this.verifyPassword(password, user.password_hash)) {
      return null;
    }

    // Atualizar último login
    await db('users')
      .where('id', user.id)
      .update({ last_login: db.fn.now() });

    return user;
  }

  /**
   * Listar usuários
   */
  static async list(filters = {}) {
    let query = db('users');

    if (filters.role) {
      query = query.where('role', filters.role);
    }

    if (filters.isActive !== undefined) {
      query = query.where('is_active', filters.isActive);
    }

    query = query.orderBy('created_at', 'desc');

    const users = await query;

    return users.map(u => {
      if (u.permissions) {
        u.permissions = JSON.parse(u.permissions);
      }
      return u;
    });
  }

  /**
   * Atualizar usuário
   */
  static async update(id, data) {
    const updateData = {};

    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (data.password) updateData.password_hash = this.hashPassword(data.password);
    if (data.permissions) updateData.permissions = JSON.stringify(data.permissions);
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    updateData.updated_at = db.fn.now();

    await db('users')
      .where('id', id)
      .update(updateData);

    return this.findById(id);
  }

  /**
   * Deletar usuário
   */
  static async delete(id) {
    return db('users')
      .where('id', id)
      .del();
  }

  /**
   * Mudança de senha
   */
  static async changePassword(id, oldPassword, newPassword) {
    const user = await this.findById(id);

    if (!user) {
      return false;
    }

    if (!this.verifyPassword(oldPassword, user.password_hash)) {
      return false;
    }

    const newHash = this.hashPassword(newPassword);

    await db('users')
      .where('id', id)
      .update({ password_hash: newHash, updated_at: db.fn.now() });

    return true;
  }
}

module.exports = User;
