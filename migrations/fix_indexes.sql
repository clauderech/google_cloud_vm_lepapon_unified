-- =====================================================
-- CORREÇÃO: CRIAR ÍNDICES SEM IF NOT EXISTS
-- Compatível com todas as versões do MySQL
-- =====================================================

-- Verificar conexão
SELECT DATABASE() as current_database;

-- =====================================================
-- CRIAR ÍNDICES (com verificação via procedure)
-- =====================================================

-- Procedure temporária para criar índice se não existir
DELIMITER $$
DROP PROCEDURE IF EXISTS CreateIndexIfNotExists$$
CREATE PROCEDURE CreateIndexIfNotExists(
    IN schemaName VARCHAR(128),
    IN tableName VARCHAR(128), 
    IN indexName VARCHAR(128),
    IN indexColumns VARCHAR(256)
)
BEGIN
    DECLARE indexExists INT DEFAULT 0;
    
    SELECT COUNT(1) INTO indexExists
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = schemaName 
    AND TABLE_NAME = tableName 
    AND INDEX_NAME = indexName;
    
    IF indexExists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', indexName, ' ON ', schemaName, '.', tableName, ' (', indexColumns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('Índice ', indexName, ' criado com sucesso') as resultado;
    ELSE
        SELECT CONCAT('Índice ', indexName, ' já existe') as resultado;
    END IF;
END$$
DELIMITER ;

-- Criar índices usando a procedure
CALL CreateIndexIfNotExists(DATABASE(), 'products', 'idx_products_type', 'type');
CALL CreateIndexIfNotExists(DATABASE(), 'products', 'idx_products_category', 'category');
CALL CreateIndexIfNotExists(DATABASE(), 'products', 'idx_products_active', 'is_active');
CALL CreateIndexIfNotExists(DATABASE(), 'products', 'idx_products_supplier', 'supplier_id');
CALL CreateIndexIfNotExists(DATABASE(), 'products', 'idx_products_name_type', 'name, type');
CALL CreateIndexIfNotExists(DATABASE(), 'products', 'idx_products_stock', 'stock, min_stock');

-- Limpar procedure temporária
DROP PROCEDURE CreateIndexIfNotExists;

-- =====================================================
-- VERIFICAR CONSTRAINTS (sem adicionar - pode dar erro)
-- =====================================================

-- Mostrar constraints existentes
SELECT 
    CONSTRAINT_NAME,
    CONSTRAINT_TYPE,
    TABLE_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'products';

-- =====================================================
-- VERIFICAÇÕES FINAIS
-- =====================================================

-- Mostrar índices criados
SHOW INDEX FROM products;

-- Contar produtos por tipo
SELECT 
    type,
    COUNT(*) as total,
    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as ativos,
    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inativos
FROM products 
GROUP BY type
ORDER BY type;

-- Verificar produtos sem fornecedor nos tipos que precisam
SELECT COUNT(*) as produtos_sem_fornecedor
FROM products 
WHERE (supplier_id IS NULL OR supplier_id = '') 
AND type IN ('insumo', 'insumo_bebida', 'revenda')
AND is_active = 1;

-- Verificar produtos com estoque baixo
SELECT 
    COUNT(*) as produtos_estoque_baixo
FROM products 
WHERE stock <= min_stock 
AND type IN ('insumo', 'insumo_bebida', 'revenda')
AND is_active = 1;

-- Verificar produtos sem categoria
SELECT COUNT(*) as produtos_sem_categoria
FROM products 
WHERE category IS NULL OR category = '';

-- Mostrar estrutura final
DESCRIBE products;

-- =====================================================
-- LIMPEZA DE DADOS SE NECESSÁRIO
-- =====================================================

-- Atualizar produtos sem categoria
UPDATE products 
SET category = 'Geral' 
WHERE category IS NULL OR category = '';

-- Atualizar produtos sem unidade
UPDATE products 
SET unit = 'un' 
WHERE unit IS NULL;

-- Garantir que produtos tenham is_active definido
UPDATE products 
SET is_active = 1 
WHERE is_active IS NULL;

-- =====================================================
-- VERIFICAÇÃO FINAL DE CONSISTÊNCIA
-- =====================================================

-- Verificar se há produtos duplicados (nome + tipo)
SELECT 
    name, 
    type, 
    COUNT(*) as duplicatas
FROM products 
GROUP BY name, type 
HAVING COUNT(*) > 1;

-- Verificar se há IDs duplicados
SELECT 
    id, 
    COUNT(*) as duplicatas
FROM products 
GROUP BY id 
HAVING COUNT(*) > 1;

-- =====================================================
-- SUCESSO!
-- =====================================================
SELECT '✅ Banco de dados configurado com sucesso!' as status,
       NOW() as timestamp;

-- =====================================================
-- PRÓXIMOS PASSOS:
-- 1. Testar criação de produto via API
-- 2. Verificar se enum aceita novos tipos
-- 3. Testar validações do backend
-- 4. Fazer backup após validar funcionamento
-- =====================================================