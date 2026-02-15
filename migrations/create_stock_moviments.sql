-- Migration manual: Criar tabela stock_movements
-- Data: 15 de fevereiro de 2026
-- Auditoria de movimentações de estoque

-- Verificar se a tabela já existe (opcional)
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'stock_movements';

-- Criar tabela stock_movements
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(255) NOT NULL,
  `movement_type` enum('sale','purchase','adjustment','comanda_add','comanda_cancel','recipe_usage') NOT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `previous_stock` decimal(10,3) NOT NULL,
  `new_stock` decimal(10,3) NOT NULL,
  `reference_type` enum('sale','purchase','comanda','manual_adjustment') NOT NULL,
  `reference_id` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `user_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `stock_movements_product_id_index` (`product_id`),
  KEY `stock_movements_movement_type_index` (`movement_type`),
  KEY `stock_movements_reference_type_reference_id_index` (`reference_type`, `reference_id`),
  KEY `stock_movements_created_at_index` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar se a tabela foi criada
SELECT 'Tabela stock_movements criada com sucesso!' as status;

-- Para reverter (se necessário):
-- DROP TABLE IF EXISTS `stock_movements`;