
const express = require('express');
const ProductModel = require('../models/product');
const SupplierModel = require('../models/supplier');
const { v4: uuidv4 } = require('uuid');
const { authDevMode } = require('../middleware/authUnified');
const { 
  validateSupplierExists, 
  validateRecipeProducts, 
  rateLimitProductCreation 
} = require('../middleware/productValidation');
const router = express.Router();

// Validação de dados do produto
function validateProductData(data, isUpdate = false) {
  const errors = [];
  
  // Campos obrigatórios
  if (!isUpdate && !data.name?.trim()) errors.push('Nome é obrigatório');
  if (data.name && typeof data.name !== 'string') errors.push('Nome deve ser texto');
  if (data.name && data.name.trim().length > 255) errors.push('Nome muito longo (máx 255 caracteres)');
  
  // Validar tipo
  const validTypes = ['insumo', 'insumo_bebida', 'prato', 'drink', 'revenda'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push(`Tipo inválido. Use: ${validTypes.join(', ')}`);
  }
  
  // Validar unidade
  const validUnits = ['un', 'kg', 'g', 'l', 'ml', 'cx', 'frd', 'pct'];
  if (data.unit && !validUnits.includes(data.unit)) {
    errors.push(`Unidade inválida. Use: ${validUnits.join(', ')}`);
  }
  
  // Validar números
  if (data.price !== undefined) {
    const price = parseFloat(data.price);
    if (isNaN(price) || price < 0) errors.push('Preço deve ser um número positivo');
    if (price > 999999.99) errors.push('Preço muito alto (máx R$ 999.999,99)');
  }
  
  if (data.cost !== undefined) {
    const cost = parseFloat(data.cost);
    if (isNaN(cost) || cost < 0) errors.push('Custo deve ser um número positivo');
    if (cost > 999999.99) errors.push('Custo muito alto (máx R$ 999.999,99)');
  }
  
  if (data.stock !== undefined) {
    const stock = parseFloat(data.stock);
    if (isNaN(stock) || stock < 0) errors.push('Estoque deve ser um número positivo');
  }
  
  if (data.min_stock !== undefined) {
    const minStock = parseFloat(data.min_stock);
    if (isNaN(minStock) || minStock < 0) errors.push('Estoque mínimo deve ser um número positivo');
  }
  
  if (data.max_stock !== undefined && data.max_stock !== null) {
    const maxStock = parseFloat(data.max_stock);
    if (isNaN(maxStock) || maxStock < 0) errors.push('Estoque máximo deve ser um número positivo');
  }
  
  // Validar recipe
  if (data.recipe !== undefined) {
    if (!Array.isArray(data.recipe)) {
      errors.push('Recipe deve ser um array');
    } else {
      data.recipe.forEach((item, index) => {
        if (!item.productId || !item.quantity) {
          errors.push(`Item ${index + 1} da receita deve ter productId e quantity`);
        }
        if (isNaN(parseFloat(item.quantity)) || parseFloat(item.quantity) <= 0) {
          errors.push(`Quantidade do item ${index + 1} da receita deve ser um número positivo`);
        }
      });
    }
  }
  
  // Validar category
  if (data.category && data.category.length > 100) {
    errors.push('Categoria muito longa (máx 100 caracteres)');
  }
  
  // Validar barcode
  if (data.barcode && data.barcode.length > 50) {
    errors.push('Código de barras muito longo (máx 50 caracteres)');
  }
  
  return errors;
}

// Sanitizar dados do produto
function sanitizeProductData(data) {
  const sanitized = { ...data };
  
  // Trim strings
  if (sanitized.name) sanitized.name = sanitized.name.trim();
  if (sanitized.category) sanitized.category = sanitized.category.trim();
  if (sanitized.description) sanitized.description = sanitized.description.trim();
  if (sanitized.barcode) sanitized.barcode = sanitized.barcode.trim();
  
  // Convert numbers
  if (sanitized.price !== undefined) sanitized.price = parseFloat(sanitized.price) || 0;
  if (sanitized.cost !== undefined) sanitized.cost = parseFloat(sanitized.cost) || 0;
  if (sanitized.stock !== undefined) sanitized.stock = parseFloat(sanitized.stock) || 0;
  if (sanitized.min_stock !== undefined) sanitized.min_stock = parseFloat(sanitized.min_stock) || 0;
  if (sanitized.max_stock !== undefined && sanitized.max_stock !== null) {
    sanitized.max_stock = parseFloat(sanitized.max_stock) || null;
  }
  
  // Convert boolean
  if (sanitized.is_active !== undefined) {
    sanitized.is_active = Boolean(sanitized.is_active);
  }
  
  // Set defaults
  if (!sanitized.category) sanitized.category = 'Geral';
  if (!sanitized.unit) sanitized.unit = 'un';
  if (sanitized.is_active === undefined) sanitized.is_active = true;
  
  return sanitized;
}


// Listar todos os produtos
router.get('/', async (req, res) => {
  try {
    const products = await ProductModel.list();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar produtos', details: err.message });
  }
});

// Listar apenas produtos do tipo 'prato' com campos id e name
router.get('/pratos', async (req, res) => {
  try {
    const products = await ProductModel.list();
    const pratos = products
      .filter(p => p.type === 'prato')
      .map(p => ({ id: p.id, name: p.name }));
    res.json(pratos);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar pratos', details: err.message });
  }
});

// Buscar produto por ID
router.get('/:id', async (req, res) => {
  try {
    const product = await ProductModel.getById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produto', details: err.message });
  }
});

// Criar produto
router.post('/', 
  authDevMode, 
  rateLimitProductCreation,
  validateSupplierExists,
  validateRecipeProducts,
  async (req, res) => {
  try {
    // Validar dados
    const validationErrors = validateProductData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationErrors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Sanitizar dados
    const productData = sanitizeProductData(req.body);
    
    // Gerar UUID
    productData.id = uuidv4();
    
    // Supplier já foi validado pelo middleware se fornecido
    // Recipe products já foram validados pelo middleware se fornecidos
    
    // Verificar se já existe produto com mesmo nome e tipo
    const existingProduct = await ProductModel.findByNameAndType(productData.name, productData.type);
    if (existingProduct) {
      return res.status(409).json({
        error: 'Produto com mesmo nome e tipo já existe',
        code: 'PRODUCT_ALREADY_EXISTS'
      });
    }
    
    const result = await ProductModel.create(productData);
    
    console.log('[PRODUCT][CREATE][SUCCESS]', {
      id: productData.id,
      name: productData.name,
      type: productData.type
    });
    
    res.status(201).json({
      success: true,
      id: productData.id,
      message: 'Produto criado com sucesso'
    });
    
  } catch (err) {
    console.error('[PRODUCT][CREATE][ERROR]', {
      error: err.message,
      stack: err.stack,
      body: req.body
    });
    
    // Tratar erros específicos do banco
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Produto com este ID já existe',
        code: 'DUPLICATE_ENTRY'
      });
    }
    
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        error: 'Referência inválida (supplier_id não existe)',
        code: 'FOREIGN_KEY_ERROR'
      });
    }
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno'
    });
  }
});

// Atualizar produto
router.put('/:id', 
  authDevMode,
  validateSupplierExists,
  validateRecipeProducts,
  async (req, res) => {
  try {
    // Verificar se produto existe
    const existingProduct = await ProductModel.getById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        code: 'PRODUCT_NOT_FOUND'
      });
    }
    
    // Validar dados (modo update)
    const validationErrors = validateProductData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationErrors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Sanitizar dados
    const productData = sanitizeProductData(req.body);
    
    // Remover campos que não devem ser atualizados
    delete productData.id;
    delete productData.created_at;
    
    // Validar supplier_id se fornecido (já validado pelo middleware)
    // Recipe products já foram validados pelo middleware se fornecidos
    
    // Verificar duplicata de nome e tipo (exceto o próprio produto)
    if (productData.name || productData.type) {
      const nameToCheck = productData.name || existingProduct.name;
      const typeToCheck = productData.type || existingProduct.type;
      
      const duplicateProduct = await ProductModel.findByNameAndType(nameToCheck, typeToCheck);
      if (duplicateProduct && duplicateProduct.id !== req.params.id) {
        return res.status(409).json({
          error: 'Produto com mesmo nome e tipo já existe',
          code: 'PRODUCT_ALREADY_EXISTS'
        });
      }
    }
    
    await ProductModel.update(req.params.id, productData);
    
    console.log('[PRODUCT][UPDATE][SUCCESS]', {
      id: req.params.id,
      updatedFields: Object.keys(productData)
    });
    
    res.json({
      success: true,
      message: 'Produto atualizado com sucesso'
    });
    
  } catch (err) {
    console.error('[PRODUCT][UPDATE][ERROR]', {
      id: req.params.id,
      body: req.body,
      error: err.message,
      stack: err.stack
    });
    
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        error: 'Referência inválida (supplier_id não existe)',
        code: 'FOREIGN_KEY_ERROR'
      });
    }
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno'
    });
  }
});

// Remover produto
router.delete('/:id', authDevMode, async (req, res) => {
  try {
    // Verificar se produto existe
    const existingProduct = await ProductModel.getById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        code: 'PRODUCT_NOT_FOUND'
      });
    }
    
    await ProductModel.remove(req.params.id);
    
    console.log('[PRODUCT][DELETE][SUCCESS]', {
      id: req.params.id,
      name: existingProduct.name
    });
    
    res.json({
      success: true,
      message: 'Produto removido com sucesso'
    });
    
  } catch (err) {
    console.error('[PRODUCT][DELETE][ERROR]', {
      id: req.params.id,
      error: err.message
    });
    
    if (err.message.includes('está sendo usado')) {
      return res.status(409).json({
        error: err.message,
        code: 'PRODUCT_IN_USE'
      });
    }
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno'
    });
  }
});

module.exports = router;
