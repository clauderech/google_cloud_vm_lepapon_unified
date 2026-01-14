-- ============================================
-- Alterar Type de Coluna MySQL
-- ============================================

-- 1. ALTERAR COLUNA EXISTENTE para ENUM
-- Sintaxe: ALTER TABLE nome_tabela MODIFY COLUMN nome_coluna tipo_novo;

ALTER TABLE products 
MODIFY COLUMN unit ENUM('un','kg','g','l','ml') NOT NULL DEFAULT 'un';

-- ============================================
-- EXEMPLOS ADICIONAIS
-- ============================================

-- 2. Alterar tipo para INT
ALTER TABLE products 
MODIFY COLUMN stock INT NOT NULL DEFAULT 0;

-- 3. Alterar tipo para VARCHAR com tamanho maior
ALTER TABLE products 
MODIFY COLUMN name VARCHAR(500) NOT NULL;

-- 4. Alterar tipo para DECIMAL com precisão
ALTER TABLE products 
MODIFY COLUMN price DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- 5. Alterar tipo para TEXT
ALTER TABLE products 
MODIFY COLUMN description TEXT NULL;

-- 6. Alterar tipo para BOOLEAN/TINYINT
ALTER TABLE products 
MODIFY COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;

-- 7. Alterar tipo para DATETIME
ALTER TABLE products 
MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- ALTERAÇÕES EM MÚLTIPLAS COLUNAS (1 comando)
-- ============================================

ALTER TABLE products 
MODIFY COLUMN unit ENUM('un','kg','g','l','ml') NOT NULL DEFAULT 'un',
MODIFY COLUMN stock INT NOT NULL DEFAULT 0,
MODIFY COLUMN price DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- ============================================
-- RENOMEAR COLUNA (bonus)
-- ============================================

ALTER TABLE products 
CHANGE COLUMN unit measurement_unit ENUM('un','kg','g','l','ml') NOT NULL DEFAULT 'un';

-- ============================================
-- ADICIONAR COLUNA
-- ============================================

ALTER TABLE products 
ADD COLUMN new_column VARCHAR(255) NULL DEFAULT NULL;

-- ============================================
-- REMOVER COLUNA
-- ============================================

ALTER TABLE products 
DROP COLUMN column_to_remove;

-- ============================================
-- DICAS IMPORTANTES
-- ============================================

-- ✅ NÃO ESQUEÇA DE:
-- 1. Fazer backup antes de alterar
-- 2. Testar em ambiente de desenvolvimento primeiro
-- 3. Usar NOT NULL se a coluna não pode ser vazia
-- 4. Adicionar DEFAULT se necessário
-- 5. Se a coluna já tem dados, cuidado com conversão de tipos

-- ❌ PROBLEMAS COMUNS:
-- - Se tentar converter VARCHAR para INT e houver texto, vai falhar
-- - Se remover DEFAULT de uma coluna obrigatória, pode quebrar inserts
-- - ENUM é sensível a maiúsculas/minúsculas

-- ============================================
-- VERIFICAR TIPO DE COLUNA ATUAL
-- ============================================

DESC products;
-- ou
SHOW COLUMNS FROM products;
-- ou
SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'products' AND TABLE_SCHEMA = 'seu_banco_dados';
