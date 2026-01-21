'use strict';

/**
 * Middleware: Validar Caixa Aberto
 * Garante que há um caixa aberto antes de permitir vendas
 */

/**
 * Requer caixa aberto para fazer operações financeiras
 * Injeta req.cashRegister com dados do caixa aberto
 */
async function requireOpenCashRegister(req, res, next) {
  try {
    const db = req.db;

    // Buscar caixa aberto
    const openCash = await db('cash_registers')
      .where('closed_at', null)
      .first();

    if (!openCash) {
      return res.status(400).json({
        error: 'CASH_NOT_OPEN',
        message: 'Caixa não está aberto. Abra um caixa antes de fazer vendas.',
        code: 'ERR_CASH_NOT_OPEN'
      });
    }

    // Injetar caixa aberto no request
    req.cashRegister = openCash;
    next();
  } catch (error) {
    console.error('[CashRegister Middleware] Erro:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: error.message,
      code: 'ERR_CASH_VALIDATION'
    });
  }
}

/**
 * Validação opcional - verifica se caixa está aberto mas não bloqueia
 * Útil para operações que podem ser feitas com ou sem caixa
 */
async function validateCashRegisterIfPresent(req, res, next) {
  try {
    const db = req.db;

    const openCash = await db('cash_registers')
      .where('closed_at', null)
      .first();

    if (openCash) {
      req.cashRegister = openCash;
    }

    next();
  } catch (error) {
    console.error('[CashRegister Middleware] Erro:', error);
    // Não bloqueia, apenas log
    next();
  }
}

module.exports = {
  requireOpenCashRegister,
  validateCashRegisterIfPresent
};
