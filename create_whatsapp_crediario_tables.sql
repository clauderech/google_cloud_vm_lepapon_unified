-- ================================
-- SQL MANUAL PARA ENVIO DE CONTAS WHATSAPP
-- Data: 3 de abril de 2026
-- ================================

-- 1. Usar campo 'fone' existente em customers para WhatsApp
-- (Não é necessário alterar a tabela customers - campo 'fone' já existe)

-- ================================

-- 2. Adicionar campos de controle WhatsApp na tabela monthly_accounts
-- (Migration: 20260403_02_add_whatsapp_fields_to_monthly_accounts.js)
-- Verificar se as colunas já existem antes de adicionar
SET @sql_last_sent_at = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_accounts' AND COLUMN_NAME = 'last_sent_at') = 0, 'ALTER TABLE monthly_accounts ADD COLUMN last_sent_at TIMESTAMP NULL COMMENT ''Última vez que foi enviada via WhatsApp'';', 'SELECT ''Column last_sent_at already exists'' AS message;');
PREPARE stmt FROM @sql_last_sent_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_receipt_count = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_accounts' AND COLUMN_NAME = 'receipt_count') = 0, 'ALTER TABLE monthly_accounts ADD COLUMN receipt_count INT DEFAULT 0 COMMENT ''Quantas vezes foi enviada'';', 'SELECT ''Column receipt_count already exists'' AS message;');
PREPARE stmt FROM @sql_receipt_count;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_status_whatsapp = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_accounts' AND COLUMN_NAME = 'status_whatsapp') = 0, 'ALTER TABLE monthly_accounts ADD COLUMN status_whatsapp ENUM(''never_sent'', ''sent'', ''delivered'', ''read'', ''failed'') DEFAULT ''never_sent'' COMMENT ''Status do envio WhatsApp'';', 'SELECT ''Column status_whatsapp already exists'' AS message;');
PREPARE stmt FROM @sql_status_whatsapp;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Criar índices se não existirem
SET @sql_idx_last_sent = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_accounts' AND INDEX_NAME = 'idx_monthly_accounts_last_sent_at') = 0, 'CREATE INDEX idx_monthly_accounts_last_sent_at ON monthly_accounts(last_sent_at);', 'SELECT ''Index idx_monthly_accounts_last_sent_at already exists'' AS message;');
PREPARE stmt FROM @sql_idx_last_sent;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_idx_status = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_accounts' AND INDEX_NAME = 'idx_monthly_accounts_status_whatsapp') = 0, 'CREATE INDEX idx_monthly_accounts_status_whatsapp ON monthly_accounts(status_whatsapp);', 'SELECT ''Index idx_monthly_accounts_status_whatsapp already exists'' AS message;');
PREPARE stmt FROM @sql_idx_status;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ================================

-- 3. Criar tabela para histórico de mensagens de contas enviadas via WhatsApp
-- (Migration: 20260403_03_create_whatsapp_account_messages.js)
CREATE TABLE IF NOT EXISTS whatsapp_account_messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  
  monthly_account_id INT UNSIGNED NOT NULL COMMENT 'FK para monthly_accounts',
  customer_id VARCHAR(255) NOT NULL COMMENT 'ID do cliente',
  whatsapp_phone VARCHAR(20) NOT NULL COMMENT 'Número WhatsApp (cópia do campo fone)',
  
  message_type ENUM('account_receipt', 'reminder', 'response', 'resend') NOT NULL COMMENT 'Tipo da mensagem',
  message_content TEXT NULL COMMENT 'Texto da mensagem enviada',
  media_url VARCHAR(500) NULL COMMENT 'URL da imagem da conta (se aplicável)',
  
  send_status ENUM('pending', 'sent', 'delivered', 'read', 'failed') DEFAULT 'pending' COMMENT 'Status do envio',
  whatsapp_message_id VARCHAR(100) NULL COMMENT 'ID da mensagem no WhatsApp',
  error_details TEXT NULL COMMENT 'Detalhes do erro se falhou',
  
  sent_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  read_at TIMESTAMP NULL,
  failed_at TIMESTAMP NULL,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices para performance
  INDEX idx_whatsapp_account_messages_monthly_account_id (monthly_account_id),
  INDEX idx_whatsapp_account_messages_customer_id (customer_id),
  INDEX idx_whatsapp_account_messages_whatsapp_phone (whatsapp_phone),  
  INDEX idx_whatsapp_account_messages_message_type (message_type),
  INDEX idx_whatsapp_account_messages_send_status (send_status),
  INDEX idx_whatsapp_account_messages_sent_at (sent_at),
  
  -- Foreign key (se monthly_accounts existir)
  FOREIGN KEY (monthly_account_id) REFERENCES monthly_accounts(id) ON DELETE CASCADE
);

-- ================================
-- COMANDOS DE VERIFICAÇÃO (OPCIONAL)
-- ================================

-- Verificar se as alterações foram aplicadas:
-- DESCRIBE customers;
-- DESCRIBE monthly_accounts;  
-- DESCRIBE whatsapp_account_messages;

-- Verificar índices criados:
-- SHOW INDEX FROM customers WHERE Key_name LIKE '%whatsapp%';
-- SHOW INDEX FROM monthly_accounts WHERE Key_name LIKE '%whatsapp%' OR Key_name LIKE '%last_sent%';
-- SHOW INDEX FROM whatsapp_account_messages;

-- ================================
-- DADOS DE TESTE (OPCIONAL)
-- ================================

-- Exemplo: Ver contas que podem receber WhatsApp (usando campo 'fone' existente)
-- SELECT ma.*, c.nome, c.sobrenome, c.fone 
-- FROM monthly_accounts ma 
-- JOIN customers c ON ma.customer_id = c.id 
-- WHERE ma.balance > 0 AND c.fone IS NOT NULL AND c.fone != '';

-- ================================