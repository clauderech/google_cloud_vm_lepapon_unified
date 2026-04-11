-- Script para corrigir produtos categorizados incorretamente
-- ATENÇÃO: Execute apenas após revisar os dados com check_kitchen_products.sql

-- 1. Corrigir produtos "Porção" que deveriam ser tipo "prato"
-- Apenas descomente e execute se confirmado que são realmente pratos
/*
UPDATE products 
SET type = 'prato',
    updated_at = NOW()
WHERE (category LIKE '%Porção%' OR name LIKE 'Porção%')
AND (type = 'insumo' OR type = 'insumo_bebida' OR type = 'revenda')
AND id IN (
    -- Liste aqui IDs específicos após verificação manual
    -- '410700', '410701', '410702'
);
*/

-- 2. Corrigir categorias que deveriam ser de insumo simples
-- Para produtos que são realmente insumos mas têm categoria de cozinha por erro
/*
UPDATE products 
SET category = 'Insumo',
    updated_at = NOW()
WHERE type = 'insumo'
AND (
    category LIKE '%picado%' OR 
    category LIKE '%preparado%' OR 
    category LIKE '%fracionado%'
)
AND id IN (
    -- Liste aqui IDs específicos após verificação manual
);
*/

-- 3. Verificar resultado das correções
SELECT 
    type,
    category,
    COUNT(*) as count
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
GROUP BY type, category;