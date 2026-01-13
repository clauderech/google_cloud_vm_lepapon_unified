-- ===================================================================
-- VERIFICAÇÃO FINAL DO PROJETO
-- ===================================================================

-- 1. Verificar migrações executadas
SELECT 
  'Migrações Executadas' as Verificação,
  COUNT(*) as Total
FROM knex_migrations;

-- 2. Contar produtos importados
SELECT 
  'Produtos Catálogo' as Verificacao,
  COUNT(*) as Total,
  COUNT(DISTINCT category) as Categorias,
  MIN(price) as PrecoMin,
  MAX(price) as PrecoMax,
  AVG(price) as PrecoMedio
FROM whatsapp_catalog_products;

-- 3. Verificar campos LePapon nas orders
SELECT 
  'Campos LePapon em Orders' as Verificacao,
  COUNT(*) as Total,
  SUM(CASE WHEN source = 'lepapon' THEN 1 ELSE 0 END) as FromLepapon,
  SUM(CASE WHEN source = 'whatsapp' THEN 1 ELSE 0 END) as FromWhatsapp,
  SUM(CASE WHEN lepapon_order_id IS NOT NULL THEN 1 ELSE 0 END) as ComLePaponId
FROM whatsapp_orders;

-- 4. Verificar campo lepapon_session_id em users
SELECT 
  'Usuários com Session LePapon' as Verificacao,
  COUNT(*) as Total,
  SUM(CASE WHEN lepapon_session_id IS NOT NULL THEN 1 ELSE 0 END) as ComSessionId
FROM whatsapp_users;

-- 5. Estrutura de whatsapp_orders (verificar colunas LePapon)
DESCRIBE whatsapp_orders;

-- 6. Estrutura de whatsapp_users (verificar lepapon_session_id)
DESCRIBE whatsapp_users;

-- 7. Exemplo de produtos importados (primeiros 10)
SELECT 
  id,
  name,
  category,
  price,
  is_available,
  created_at
FROM whatsapp_catalog_products
LIMIT 10;

-- 8. Distribuição de preços
SELECT 
  ROUND(price, -1) as FaixaPreco,
  COUNT(*) as Quantidade,
  MIN(price) as PrecoMin,
  MAX(price) as PrecoMax
FROM whatsapp_catalog_products
WHERE price > 0
GROUP BY ROUND(price, -1)
ORDER BY FaixaPreco;
