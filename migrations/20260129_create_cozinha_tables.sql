-- Tabela principal dos itens da cozinha (apenas pratos)
CREATE TABLE IF NOT EXISTS cozinha_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comanda_id VARCHAR(50) NOT NULL,
  product_id INT NOT NULL,
  quantidade INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  observacao VARCHAR(255),
  prioridade ENUM('normal','urgente') NOT NULL DEFAULT 'normal',
  responsavel VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (comanda_id) REFERENCES comandas(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Histórico de status dos itens da cozinha
CREATE TABLE IF NOT EXISTS cozinha_item_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cozinha_item_id INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  responsavel VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cozinha_item_id) REFERENCES cozinha_items(id)
);
