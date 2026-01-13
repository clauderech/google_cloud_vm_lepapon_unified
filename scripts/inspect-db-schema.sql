-- ===================================================================
-- SCRIPT: Inspeciona todas as tabelas, colunas, índices e FKs
-- ===================================================================

-- 1. Listar todas as tabelas
SELECT 
  TABLE_NAME as 'Tabela',
  TABLE_ROWS as 'Registros',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) as 'Tamanho (MB)'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;

-- ===================================================================
-- 2. Colunas de cada tabela com tipos e constraints
-- ===================================================================
SELECT 
  TABLE_NAME as 'Tabela',
  COLUMN_NAME as 'Campo',
  COLUMN_TYPE as 'Tipo',
  IS_NULLABLE as 'Nullable',
  COLUMN_KEY as 'Chave',
  EXTRA as 'Extra'
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- ===================================================================
-- 3. Índices por tabela
-- ===================================================================
SELECT 
  TABLE_NAME as 'Tabela',
  INDEX_NAME as 'Índice',
  COLUMN_NAME as 'Campo',
  SEQ_IN_INDEX as 'Posição',
  NON_UNIQUE as 'Não Único',
  INDEX_TYPE as 'Tipo'
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- ===================================================================
-- 4. Foreign Keys
-- ===================================================================
SELECT 
  KCU.TABLE_NAME as 'Tabela',
  KCU.COLUMN_NAME as 'Campo',
  KCU.REFERENCED_TABLE_NAME as 'Tabela Referenciada',
  KCU.REFERENCED_COLUMN_NAME as 'Campo Referenciado',
  RC.UPDATE_RULE as 'ON UPDATE',
  RC.DELETE_RULE as 'ON DELETE'
FROM information_schema.KEY_COLUMN_USAGE KCU
JOIN information_schema.REFERENTIAL_CONSTRAINTS RC
  ON KCU.CONSTRAINT_NAME = RC.CONSTRAINT_NAME
  AND KCU.TABLE_SCHEMA = RC.CONSTRAINT_SCHEMA
WHERE KCU.TABLE_SCHEMA = DATABASE()
  AND KCU.REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY KCU.TABLE_NAME, KCU.COLUMN_NAME;

-- ===================================================================
-- 5. Resumo: Tabelas com quantidade de colunas, índices e FKs
-- ===================================================================
SELECT 
  t.TABLE_NAME as 'Tabela',
  (SELECT COUNT(*) FROM information_schema.COLUMNS 
   WHERE TABLE_NAME = t.TABLE_NAME AND TABLE_SCHEMA = DATABASE()) as 'Colunas',
  (SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS 
   WHERE TABLE_NAME = t.TABLE_NAME AND TABLE_SCHEMA = DATABASE()) as 'Índices',
  (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE 
   WHERE TABLE_NAME = t.TABLE_NAME AND TABLE_SCHEMA = DATABASE() 
   AND REFERENCED_TABLE_NAME IS NOT NULL) as 'FKs',
  t.TABLE_ROWS as 'Registros'
FROM information_schema.TABLES t
WHERE t.TABLE_SCHEMA = DATABASE()
ORDER BY t.TABLE_NAME;
