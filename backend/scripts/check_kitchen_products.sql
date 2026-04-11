-- Script para verificar produtos com dados inconsistentes na cozinha
-- Execute este script para identificar produtos que podem estar mal categorizados

-- 1. Produtos tipo insumo/revenda com categorias de cozinha (potencialmente problemáticos)
SELECT 
    id, 
    name, 
    type, 
    category,
    unit,
    'Insumo com categoria de cozinha' as issue
FROM products 
WHERE (type = 'insumo' OR type = 'insumo_bebida' OR type = 'revenda')
AND (
    category LIKE '%porção%' OR 
    category LIKE '%porcao%' OR 
    category LIKE '%picado%' OR 
    category LIKE '%preparado%' OR 
    category LIKE '%fracionado%' OR
    unit = 'frd'
)

UNION ALL

-- 2. Produtos sem tipo definido com categorias de cozinha
SELECT 
    id, 
    name, 
    type, 
    category,
    unit,
    'Produto sem tipo com categoria de cozinha' as issue
FROM products 
WHERE type IS NULL
AND (
    category LIKE '%porção%' OR 
    category LIKE '%porcao%' OR 
    category LIKE '%picado%' OR 
    category LIKE '%preparado%' OR 
    category LIKE '%fracionado%' OR
    unit = 'frd'
)

UNION ALL

-- 3. Produtos tipo drink (não devem mais ir para cozinha)
SELECT 
    id, 
    name, 
    type, 
    category,
    unit,
    'Drink não deve ir para cozinha' as issue
FROM products 
WHERE type = 'drink'

UNION ALL

-- 4. Produtos tipo prato sem receita (podem estar mal categorizados)
SELECT 
    id, 
    name, 
    type, 
    category,
    unit,
    'Prato sem receita' as issue
FROM products 
WHERE type = 'prato'
AND (recipe IS NULL OR recipe = '' OR recipe = '[]')

ORDER BY issue, type, name;