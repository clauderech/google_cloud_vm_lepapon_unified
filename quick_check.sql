-- =========================================
-- VERIFICAÇÃO RÁPIDA DO STATUS DO BANCO
-- Execute este script primeiro para diagnóstico
-- =========================================

-- 1. VERIFICAR TABELAS EXISTENTES
SHOW TABLES;

-- 2. VERIFICAR ENUMs ATUAIS DA TABELA stock_movements
SELECT COLUMN_TYPE FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'lepapon_unified_db' 
AND TABLE_NAME = 'stock_movements' 
AND COLUMN_NAME = 'movement_type';

-- 3. VERIFICAR SE CATEGORIA 'CASA' EXISTE
SELECT COUNT(*) as produtos_casa FROM products WHERE category = 'casa';

-- 4. ÚLTIMAS MOVIMENTAÇÕES
SELECT movement_type, COUNT(*) as qty FROM stock_movements GROUP BY movement_type;

-- 5. PRODUTOS COM RECEITAS
SELECT 
    type,
    COUNT(*) as total,
    SUM(CASE WHEN recipe IS NOT NULL AND recipe != '[]' THEN 1 ELSE 0 END) as com_receita
FROM products 
GROUP BY type;

-- === RESULTADO ESPERADO ===
-- Se movement_type contém 'production' e 'production_ingredient' → OK
-- Se existem produtos categoria 'casa' → OK  
-- Se não, execute fix_migrations.sql