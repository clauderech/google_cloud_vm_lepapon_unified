-- =========================================
-- SCRIPT DE VERIFICAÇÃO E CORREÇÃO DE MIGRAÇÕES
-- Sistema Lepapon - Sincronização do Banco
-- Data: 2 de abril de 2026
-- =========================================

-- PASSO 1: VERIFICAR ESTADO ATUAL DOS ENUMs
-- =========================================

-- Verificar movement_type atual
SELECT COLUMN_TYPE as 'movement_type_atual' 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'lepapon_unified_db' 
AND TABLE_NAME = 'stock_movements' 
AND COLUMN_NAME = 'movement_type';

-- Verificar reference_type atual
SELECT COLUMN_TYPE as 'reference_type_atual' 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'lepapon_unified_db' 
AND TABLE_NAME = 'stock_movements' 
AND COLUMN_NAME = 'reference_type';

-- PASSO 2: ADICIONAR TIPOS DE PRODUÇÃO SE NÃO EXISTIREM
-- =========================================

-- Backup da estrutura atual (caso precise reverter)
-- CREATE TABLE stock_movements_backup AS SELECT * FROM stock_movements LIMIT 0;

-- Adicionar 'production' e 'production_ingredient' ao movement_type
-- (Execute apenas se não estiverem presentes)
ALTER TABLE stock_movements 
MODIFY COLUMN movement_type 
ENUM('sale', 'purchase', 'adjustment', 'comanda_add', 'comanda_cancel', 'recipe_usage', 'recipe_revert', 'production', 'production_ingredient');

-- Adicionar 'production' ao reference_type  
-- (Execute apenas se não estiver presente)
ALTER TABLE stock_movements 
MODIFY COLUMN reference_type 
ENUM('sale', 'purchase', 'comanda', 'manual_adjustment', 'production');

-- PASSO 3: VERIFICAR PRODUTOS DA CATEGORIA 'CASA'
-- =========================================

-- Se a categoria 'casa' não existir, vamos criar alguns produtos de exemplo
-- Verificar primeiro se existem:
SELECT COUNT(*) as produtos_casa_existentes 
FROM products 
WHERE category = 'casa';

-- PASSO 4: CRIAR PRODUTOS DE EXEMPLO PARA TESTE (SE NECESSÁRIO)
-- =========================================

-- Inserir insumos básicos para receitas (se não existirem)
INSERT IGNORE INTO products (id, name, type, price, cost, stock, unit, supplier_id, category, is_active) VALUES
('ovo', 'Ovos', 'insumo', 0.50, 0.40, 100, 'un', 'fornecedor1', 'basico', 1),
('oleo_soja', 'Óleo de Soja', 'insumo', 8.50, 7.00, 5, 'l', 'fornecedor1', 'basico', 1),
('sal', 'Sal', 'insumo', 2.00, 1.50, 10, 'kg', 'fornecedor1', 'basico', 1),
('limao', 'Limão', 'insumo', 0.30, 0.20, 50, 'un', 'fornecedor1', 'basico', 1),
('carne_moida', 'Carne Moída', 'insumo', 25.00, 20.00, 5, 'kg', 'fornecedor1', 'basico', 1),
('pao_hamburguer', 'Pão de Hambúrguer', 'insumo', 1.50, 1.20, 50, 'un', 'fornecedor1', 'basico', 1),
('farinha_trigo', 'Farinha de Trigo', 'insumo', 4.50, 3.50, 10, 'kg', 'fornecedor1', 'basico', 1),
('agua', 'Água', 'insumo', 0.10, 0.05, 100, 'l', 'fornecedor1', 'basico', 1);

-- Inserir insumos da categoria 'casa' com receitas
INSERT IGNORE INTO products (id, name, type, price, cost, stock, unit, supplier_id, category, recipe, is_active) VALUES
('maionese_casa', 'Maionese Caseira', 'insumo', 12.00, 8.50, 0, 'kg', '', 'casa', 
'[{"ingredientId":"ovo","quantity":2,"unit":"un"},{"ingredientId":"oleo_soja","quantity":0.3,"unit":"l"},{"ingredientId":"sal","quantity":0.005,"unit":"kg"},{"ingredientId":"limao","quantity":0.5,"unit":"un"}]', 1),

('hamburguer_casa', 'Hambúrguer Caseiro', 'insumo', 8.00, 6.00, 0, 'un', '', 'casa',
'[{"ingredientId":"carne_moida","quantity":0.15,"unit":"kg"},{"ingredientId":"sal","quantity":0.002,"unit":"kg"}]', 1),

('massa_pizza_casa', 'Massa de Pizza Caseira', 'insumo', 3.00, 2.50, 0, 'un', '', 'casa',
'[{"ingredientId":"farinha_trigo","quantity":0.3,"unit":"kg"},{"ingredientId":"agua","quantity":0.2,"unit":"l"},{"ingredientId":"sal","quantity":0.005,"unit":"kg"},{"ingredientId":"oleo_soja","quantity":0.02,"unit":"l"}]', 1);

-- PASSO 5: VERIFICAR FORNECEDORES NECESSÁRIOS
-- =========================================

INSERT IGNORE INTO suppliers (id, name, contact, email) VALUES
('fornecedor1', 'Fornecedor Geral', '(11) 99999-9999', 'contato@fornecedor.com');

-- PASSO 6: TESTAR MOVIMENTAÇÕES DE PRODUÇÃO
-- =========================================

-- Inserir uma movimentação de teste de produção (será removida depois)
INSERT INTO stock_movements 
(product_id, movement_type, quantity, previous_stock, new_stock, reference_type, reference_id, notes, user_id)
VALUES 
('maionese_casa', 'production', 1.0, 0.0, 1.0, 'production', 'prod_test_123', 'Teste do sistema de produção', 'system');

-- Verificar se a inserção funcionou
SELECT 'TESTE_PRODUCTION' as status, COUNT(*) as movimentacoes_producao
FROM stock_movements 
WHERE movement_type IN ('production', 'production_ingredient');

-- Remover teste
DELETE FROM stock_movements WHERE reference_id = 'prod_test_123';

-- PASSO 7: VERIFICAR FINAL
-- =========================================

-- Status final dos ENUMs
SELECT 
    'movement_type' as enum_type,
    COLUMN_TYPE as valores_permitidos
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'lepapon_unified_db' 
AND TABLE_NAME = 'stock_movements' 
AND COLUMN_NAME = 'movement_type'

UNION ALL

SELECT 
    'reference_type' as enum_type,
    COLUMN_TYPE as valores_permitidos
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'lepapon_unified_db' 
AND TABLE_NAME = 'stock_movements' 
AND COLUMN_NAME = 'reference_type';

-- Produtos casa disponíveis para produção
SELECT 
    id,
    name,
    type,
    category,
    CASE WHEN recipe IS NULL OR recipe = '[]' THEN 'SEM RECEITA' ELSE 'COM RECEITA' END as status_receita,
    cost,
    stock
FROM products 
WHERE category = 'casa'
ORDER BY name;

SELECT '=== SINCRONIZAÇÃO CONCLUÍDA ===' as resultado;