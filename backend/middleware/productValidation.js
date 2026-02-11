/**
 * Middleware de validação para produtos
 */

const { db } = require('../config/knex');

/**
 * Valida se um supplier_id existe no banco
 */
async function validateSupplierExists(req, res, next) {
  try {
    if (req.body.supplier_id) {
      const supplier = await db('suppliers').where({ id: req.body.supplier_id }).first();
      if (!supplier) {
        return res.status(400).json({
          error: 'Fornecedor não encontrado',
          code: 'SUPPLIER_NOT_FOUND'
        });
      }
      req.validatedSupplier = supplier;
    }
    next();
  } catch (error) {
    console.error('[MIDDLEWARE][SUPPLIER_VALIDATION]', error);
    res.status(500).json({ 
      error: 'Erro ao validar fornecedor',
      code: 'VALIDATION_ERROR' 
    });
  }
}

/**
 * Valida se recipe items existem como produtos
 */
async function validateRecipeProducts(req, res, next) {
  try {
    if (req.body.recipe && Array.isArray(req.body.recipe) && req.body.recipe.length > 0) {
      const productIds = req.body.recipe.map(item => item.productId).filter(Boolean);
      
      if (productIds.length > 0) {
        const existingProducts = await db('products')
          .whereIn('id', productIds)
          .select('id', 'name');
        
        const existingIds = existingProducts.map(p => p.id);
        const missingIds = productIds.filter(id => !existingIds.includes(id));
        
        if (missingIds.length > 0) {
          return res.status(400).json({
            error: `Produtos da receita não encontrados: ${missingIds.join(', ')}`,
            code: 'RECIPE_PRODUCTS_NOT_FOUND',
            missingIds
          });
        }
        
        req.validatedRecipeProducts = existingProducts;
      }
    }
    next();
  } catch (error) {
    console.error('[MIDDLEWARE][RECIPE_VALIDATION]', error);
    res.status(500).json({ 
      error: 'Erro ao validar receita',
      code: 'VALIDATION_ERROR' 
    });
  }
}

/**
 * Rate limiting simples para criação de produtos
 */
const productCreationAttempts = new Map();

function rateLimitProductCreation(req, res, next) {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60000; // 1 minuto
  const maxAttempts = 10; // 10 tentativas por minuto
  
  if (!productCreationAttempts.has(clientIP)) {
    productCreationAttempts.set(clientIP, []);
  }
  
  const attempts = productCreationAttempts.get(clientIP);
  
  // Limpar tentativas antigas
  const recentAttempts = attempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return res.status(429).json({
      error: 'Muitas tentativas de criação de produto. Tente novamente em 1 minuto.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  recentAttempts.push(now);
  productCreationAttempts.set(clientIP, recentAttempts);
  
  next();
}

module.exports = {
  validateSupplierExists,
  validateRecipeProducts,
  rateLimitProductCreation
};