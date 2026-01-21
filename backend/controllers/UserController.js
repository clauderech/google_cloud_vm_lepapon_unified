'use strict';

const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Controller: UserController
 * Autenticação e gerenciamento de usuários
 */

class UserController {
  /**
   * POST /api/users/register
   * Registrar novo usuário
   */
  static async register(req, res) {
    try {
      const { username, password, name, role = 'caixa' } = req.body;

      if (!username || !password || !name) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Campos obrigatórios: username, password, name',
        });
      }

      // Verificar se usuário já existe
      const existing = await User.findByUsername(username);
      if (existing) {
        return res.status(409).json({
          error: 'USER_EXISTS',
          message: 'Usuário já cadastrado',
        });
      }

      const validRoles = ['admin', 'operador', 'caixa'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'INVALID_ROLE',
          message: `Role deve ser um de: ${validRoles.join(', ')}`,
        });
      }

      const user = await User.create({
        username,
        password,
        name,
        role,
      });

      // Remover hash de senha da resposta
      const { password_hash, ...userWithoutPassword } = user;

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: userWithoutPassword,
      });
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/users/login
   * Fazer login
   */
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Campos obrigatórios: username, password',
        });
      }

      const user = await User.authenticate(username, password);

      if (!user) {
        return res.status(401).json({
          error: 'AUTHENTICATION_FAILED',
          message: 'Username ou password inválido',
        });
      }

      // Gerar token JWT
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Remover hash de senha
      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: userWithoutPassword,
          token,
        },
      });
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/users/me
   * Obter dados do usuário logado (requer autenticação)
   */
  static async getMe(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Usuário não autenticado',
        });
      }

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Usuário não encontrado',
        });
      }

      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: userWithoutPassword,
      });
    } catch (error) {
      console.error('Erro ao obter dados do usuário:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/users/:id
   * Obter usuário por ID
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Usuário não encontrado',
        });
      }

      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: userWithoutPassword,
      });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/users
   * Listar usuários
   */
  static async list(req, res) {
    try {
      const { role, isActive = true } = req.query;

      const users = await User.list({
        role,
        isActive: isActive === 'true',
      });

      // Remover hash de senha de todas as respostas
      const usersWithoutPasswords = users.map(u => {
        const { password_hash, ...userWithoutPassword } = u;
        return userWithoutPassword;
      });

      res.json({
        success: true,
        data: usersWithoutPasswords,
        count: usersWithoutPasswords.length,
      });
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/users/:id
   * Atualizar usuário
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { name, role, isActive, permissions } = req.body;

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Usuário não encontrado',
        });
      }

      const updated = await User.update(id, {
        name,
        role,
        isActive,
        permissions,
      });

      const { password_hash, ...userWithoutPassword } = updated;

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: userWithoutPassword,
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/users/:id/change-password
   * Mudar senha
   */
  static async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Campos obrigatórios: oldPassword, newPassword',
        });
      }

      const success = await User.changePassword(id, oldPassword, newPassword);

      if (!success) {
        return res.status(401).json({
          error: 'PASSWORD_CHANGE_FAILED',
          message: 'Senha atual inválida',
        });
      }

      res.json({
        success: true,
        message: 'Senha alterada com sucesso',
      });
    } catch (error) {
      console.error('Erro ao mudar senha:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/users/:id
   * Deletar usuário
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Usuário não encontrado',
        });
      }

      await User.delete(id);

      res.json({
        success: true,
        message: 'Usuário deletado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }
}

module.exports = UserController;
