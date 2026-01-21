'use strict';

const express = require('express');
const UserController = require('../controllers/UserController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Users Routes (Autenticação)
 */

// POST /api/users/register - Registrar novo usuário
router.post('/register', UserController.register);

// POST /api/users/login - Fazer login
router.post('/login', UserController.login);

// Aplicar middleware de autenticação nas rotas abaixo
router.use(authMiddleware);

// GET /api/users/me - Dados do usuário logado
router.get('/me', UserController.getMe);

// GET /api/users - Listar usuários [REQUER ADMIN]
router.get('/', roleMiddleware('admin'), UserController.list);

// GET /api/users/:id - Obter usuário por ID [REQUER ADMIN]
router.get('/:id', roleMiddleware('admin'), UserController.getById);

// PUT /api/users/:id - Atualizar usuário [REQUER ADMIN]
router.put('/:id', roleMiddleware('admin'), UserController.update);

// POST /api/users/:id/change-password - Mudar senha
router.post('/:id/change-password', UserController.changePassword);

// DELETE /api/users/:id - Deletar usuário [REQUER ADMIN]
router.delete('/:id', roleMiddleware('admin'), UserController.delete);

module.exports = router;
