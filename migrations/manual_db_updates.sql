-- =====================================================
-- ATUALIZAÇÕES MANUAIS DO BANCO DE DADOS
-- Sistema de Produtos - Correções e Melhorias
-- Data: 11 de fevereiro de 2026
-- =====================================================

-- Verificar conexão e banco atual
SELECT DATABASE() as current_database;

-- =====================================================
-- 1. ATUALIZAR ENUM DE TIPOS DE PRODUTO
-- =====================================================

-- Primeiro, vamos ver os tipos atuais
SHOW COLUMNS FROM products LIKE 'type';

-- Atualizar o enum para incluir todos os tipos necessários
ALTER TABLE products 
MODIFY COLUMN type ENUM('insumo', 'insumo_bebida', 'prato', 'drink', 'revenda') NOT NULL;

-- Verificar se a alteração foi aplicada
SHOW COLUMNS FROM products LIKE 'type';

-- =====================================================
-- 2. GARANTIR ESTRUTURA COMPLETA DA TABELA PRODUCTS
-- =====================================================

-- Verificar estrutura atual
DESCRIBE products;

-- Adicionar colunas faltantes se não existirem (com verificação)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_schema = DATABASE() 
     AND table_name = 'products' 
     AND column_name = 'created_at') = 0,
    'ALTER TABLE products ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'SELECT "Coluna created_at já existe" as status'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_schema = DATABASE() 
     AND table_name = 'products' 
     AND column_name = 'updated_at') = 0,
    'ALTER TABLE products ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'SELECT "Coluna updated_at já existe" as status'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice para busca por tipo
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);

-- Índice para busca por categoria
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Índice para produtos ativos
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- Índice para fornecedor
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);

-- Índice para busca por nome (para evitar duplicatas)
CREATE INDEX IF NOT EXISTS idx_products_name_type ON products(name, type);

-- Índice para produtos com estoque baixo
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock, min_stock);

-- =====================================================
-- 4. ADICIONAR CONSTRAINTS DE VALIDAÇÃO
-- =====================================================

-- Constraint para preço positivo
ALTER TABLE products ADD CONSTRAINT chk_products_price_positive 
CHECK (price >= 0) NOT ENFORCED;

-- Constraint para custo positivo  
ALTER TABLE products ADD CONSTRAINT chk_products_cost_positive 
CHECK (cost >= 0) NOT ENFORCED;

-- Constraint para estoque positivo
ALTER TABLE products ADD CONSTRAINT chk_products_stock_positive 
CHECK (stock >= 0) NOT ENFORCED;

-- Constraint para estoque mínimo positivo
ALTER TABLE products ADD CONSTRAINT chk_products_min_stock_positive 
CHECK (min_stock >= 0) NOT ENFORCED;

-- =====================================================
-- 5. ATUALIZAR DADOS EXISTENTES SE NECESSÁRIO
-- =====================================================

-- Garantir que produtos ativos tenham is_active = 1
UPDATE products 
SET is_active = 1 
WHERE is_active IS NULL;

-- Garantir que produtos tenham categoria
UPDATE products 
SET category = 'Geral' 
WHERE category IS NULL OR category = '';

-- Garantir que produtos tenham unidade
UPDATE products 
SET unit = 'un' 
WHERE unit IS NULL OR unit = '';

-- Corrigir timestamps se necessário
UPDATE products 
SET created_at = NOW(), updated_at = NOW() 
WHERE created_at IS NULL;

-- =====================================================
-- 6. VERIFICAÇÕES FINAIS
-- =====================================================

-- Mostrar estrutura final da tabela
DESCRIBE products;

-- Mostrar índices criados
SHOW INDEX FROM products;

-- Verificar constraints
SELECT 
    CONSTRAINT_NAME,
    CONSTRAINT_TYPE,
    TABLE_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'products';

-- Contar produtos por tipo
SELECT 
    type,
    COUNT(*) as total,
    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as ativos
FROM products 
GROUP BY type
ORDER BY type;

-- Verificar produtos sem fornecedor
SELECT COUNT(*) as produtos_sem_fornecedor
FROM products 
WHERE (supplier_id IS NULL OR supplier_id = '') 
AND type IN ('insumo', 'insumo_bebida', 'revenda');

-- Verificar produtos com estoque baixo
SELECT 
    COUNT(*) as produtos_estoque_baixo
FROM products 
WHERE stock <= min_stock 
AND type IN ('insumo', 'insumo_bebida', 'revenda')
AND is_active = 1;

-- =====================================================
-- 7. LIMPEZA E OTIMIZAÇÃO
-- =====================================================

-- Analisar tabela para otimizar performance
ANALYZE TABLE products;

-- =====================================================
-- SUCESSO! 
-- =====================================================
SELECT 'Banco de dados atualizado com sucesso!' as status,
       NOW() as timestamp;

-- =====================================================
-- PRÓXIMOS PASSOS RECOMENDADOS:
-- =====================================================
-- 1. Testar criação de produto via API
-- 2. Verificar se validações estão funcionando  
-- 3. Testar edição e remoção de produtos
-- 4. Verificar performance das consultas
-- 5. Fazer backup após validar funcionamento
-- =====================================================