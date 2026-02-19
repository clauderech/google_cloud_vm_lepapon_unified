-- =====================================================
-- SISTEMA DE CREDIÁRIO MENSAL - CRIAÇÃO DAS TABELAS
-- Data: 19 de fevereiro de 2026
-- =====================================================

-- Tabela para contas mensais dos clientes
CREATE TABLE IF NOT EXISTS monthly_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    month_year VARCHAR(7) NOT NULL COMMENT 'Formato YYYY-MM',
    due_date DATE NOT NULL,
    total_amount DECIMAL(10, 2) DEFAULT 0 COMMENT 'Valor total das compras do mês',
    amount_paid DECIMAL(10, 2) DEFAULT 0 COMMENT 'Valor já pago pelo cliente',
    balance DECIMAL(10, 2) DEFAULT 0 COMMENT 'Saldo restante (total - pago)',
    status ENUM('open', 'paid', 'overdue', 'cancelled') DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para performance
    INDEX idx_customer_id (customer_id),
    INDEX idx_month_year (month_year),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date),
    
    -- Constraint única: um cliente só pode ter uma conta por mês
    UNIQUE KEY uk_customer_month (customer_id, month_year),
    
    -- Foreign key para customers
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Tabela para compras mensais dos clientes
CREATE TABLE IF NOT EXISTS monthly_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monthly_account_id INT UNSIGNED NOT NULL,
    sale_id VARCHAR(255) NULL COMMENT 'ID da venda/comanda relacionada',
    purchase_date TIMESTAMP NOT NULL,
    description VARCHAR(500) NOT NULL COMMENT 'Descrição da compra (ex: Comanda 123)',
    amount DECIMAL(10, 2) NOT NULL,
    items_json TEXT NULL COMMENT 'JSON detalhado dos itens comprados',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para performance
    INDEX idx_monthly_account_id (monthly_account_id),
    INDEX idx_purchase_date (purchase_date),
    INDEX idx_sale_id (sale_id),
    
    -- Foreign key para monthly_accounts
    FOREIGN KEY (monthly_account_id) REFERENCES monthly_accounts(id) ON DELETE CASCADE
);

-- Tabela para pagamentos mensais dos clientes
CREATE TABLE IF NOT EXISTS monthly_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monthly_account_id INT UNSIGNED NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash', 'card', 'pix', 'transfer') NOT NULL,
    receipt_number VARCHAR(100) NULL COMMENT 'Número do recibo/comprovante',
    received_by VARCHAR(100) NULL COMMENT 'Funcionário que recebeu o pagamento',
    notes TEXT NULL COMMENT 'Observações adicionais',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para performance
    INDEX idx_monthly_account_id (monthly_account_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_payment_method (payment_method),
    
    -- Foreign key para monthly_accounts
    FOREIGN KEY (monthly_account_id) REFERENCES monthly_accounts(id) ON DELETE CASCADE
);

-- =====================================================
-- COMENTÁRIOS SOBRE O FUNCIONAMENTO DO SISTEMA
-- =====================================================

/*
FLUXO DE FUNCIONAMENTO:

1. MONTHLY_ACCOUNTS:
   - Uma conta por cliente por mês (customer_id + month_year único)
   - Armazena totais consolidados do mês
   - Status automático baseado em pagamentos e vencimento

2. MONTHLY_PURCHASES:
   - Registra cada compra feita pelo cliente no mês
   - Vinculada à conta mensal correspondente
   - Pode vir de comandas finalizadas como "crediário"

3. MONTHLY_PAYMENTS:
   - Registra cada pagamento feito pelo cliente
   - Permite múltiplos pagamentos parciais
   - Atualiza automaticamente os totais da conta mensal

EXEMPLO DE USO:
- Cliente faz compra em Janeiro/2026 → cria monthly_account + monthly_purchase
- Cliente paga R$ 50 → adiciona monthly_payment + atualiza totals
- Sistema calcula automaticamente: balance = total_amount - amount_paid
*/