-- =========================================
-- MAPEAMENTO COMPLETO DO BANCO DE DADOS
-- Sistema Unificado Lepapon
-- Data: 2 de abril de 2026
-- =========================================

-- Mostrar todas as tabelas do banco
SELECT 
    TABLE_NAME as 'Tabela',
    TABLE_TYPE as 'Tipo',
    CREATE_TIME as 'Data Criacao',
    UPDATE_TIME as 'Ultima Atualizacao'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'lepapon_unified_db'
ORDER BY TABLE_NAME;

-- =========================================
-- ESTRUTURA DETALHADA DAS TABELAS PRINCIPAIS
-- =========================================

-- Tabela: products
DESCRIBE products;

-- Tabela: stock_movements (CRÍTICA PARA PRODUÇÃO)
DESCRIBE stock_movements;

-- Verificar ENUMs da tabela stock_movements
SHOW COLUMNS FROM stock_movements LIKE 'movement_type';
SHOW COLUMNS FROM stock_movements LIKE 'reference_type';

-- Tabela: suppliers
DESCRIBE suppliers;

-- Tabela: customers
DESCRIBE customers;

-- Tabela: sales
DESCRIBE sales;

-- Tabela: purchases
DESCRIBE purchases;

-- Tabela: comandas
DESCRIBE comandas;

-- Tabela: comanda_items
DESCRIBE comanda_items;

-- Tabela: cozinha_items
DESCRIBE cozinha_items;

-- =========================================
-- VERIFICAÇÃO DE ÍNDICES
-- =========================================

-- Índices da tabela stock_movements
SHOW INDEX FROM stock_movements;

-- Índices da tabela products
SHOW INDEX FROM products;

-- =========================================
-- VERIFICAÇÃO DE CONSTRAINTS E FOREIGN KEYS
-- =========================================

SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'lepapon_unified_db'
AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;

-- =========================================
-- ANÁLISE ESPECÍFICA: TYPES DE MOVIMENTO
-- =========================================

-- Verificar se os novos tipos de produção existem
SELECT COLUMN_TYPE 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'lepapon_unified_db' 
AND TABLE_NAME = 'stock_movements' 
AND COLUMN_NAME = 'movement_type';

SELECT COLUMN_TYPE 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'lepapon_unified_db' 
AND TABLE_NAME = 'stock_movements' 
AND COLUMN_NAME = 'reference_type';

-- =========================================
-- VERIFICAÇÃO DE DADOS: PRODUTOS COM RECEITAS
-- =========================================

-- Contar produtos por tipo
SELECT 
    type,
    COUNT(*) as quantidade,
    COUNT(CASE WHEN recipe IS NOT NULL AND recipe != '[]' THEN 1 END) as com_receita,
    COUNT(CASE WHEN category = 'casa' THEN 1 END) as categoria_casa
FROM products 
GROUP BY type
ORDER BY type;

-- Produtos da categoria 'casa' específicos
SELECT 
    id,
    name,
    type,
    category,
    CASE 
        WHEN recipe IS NULL OR recipe = '[]' THEN 'SEM RECEITA'
        ELSE 'COM RECEITA'
    END as status_receita,
    stock,
    cost,
    is_active
FROM products 
WHERE category = 'casa' OR category LIKE '%casa%'
ORDER BY type, name;

-- =========================================
-- MOVIMENTAÇÕES DE ESTOQUE RECENTES
-- =========================================

-- Últimas 10 movimentações para análise
SELECT 
    id,
    product_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    notes,
    created_at
FROM stock_movements 
ORDER BY created_at DESC 
LIMIT 10;

-- Tipos de movimentação existentes
SELECT 
    movement_type,
    COUNT(*) as quantidade
FROM stock_movements 
GROUP BY movement_type
ORDER BY quantidade DESC;

-- =========================================
-- VERIFICAÇÃO DE MIGRAÇÕES
-- =========================================

-- Verificar se existe tabela de migrações
SHOW TABLES LIKE '%migration%';

-- Se existir tabela knex_migrations, mostrar migrações aplicadas
-- (Descomente se a tabela existir)
-- SELECT * FROM knex_migrations ORDER BY batch, id;

-- =========================================
-- RESUMO EXECUTIVO
-- =========================================

SELECT 'PRODUTOS' as categoria, COUNT(*) as total FROM products
UNION ALL
SELECT 'MOVIMENTACOES', COUNT(*) FROM stock_movements
UNION ALL
SELECT 'FORNECEDORES', COUNT(*) FROM suppliers
UNION ALL
SELECT 'CLIENTES', COUNT(*) FROM customers
UNION ALL
SELECT 'VENDAS', COUNT(*) FROM sales
UNION ALL
SELECT 'COMPRAS', COUNT(*) FROM purchases
UNION ALL
SELECT 'COMANDAS', COUNT(*) FROM comandas;

-- =========================================
-- VERIFICAÇÃO DE PROBLEMAS POTENCIAIS
-- =========================================

-- Produtos sem fornecedor
SELECT COUNT(*) as produtos_sem_fornecedor 
FROM products 
WHERE supplier_id IS NULL OR supplier_id = '';

-- Produtos com estoque negativo
SELECT COUNT(*) as produtos_estoque_negativo
FROM products 
WHERE stock < 0;

-- Movimentações sem produto correspondente
SELECT COUNT(*) as movimentacoes_orfas
FROM stock_movements sm
LEFT JOIN products p ON sm.product_id = p.id
WHERE p.id IS NULL;