-- ===================================================================
-- LEPAPON UNIFIED DATABASE SCHEMA
-- ===================================================================
-- Versão 1.0 - Unificação WhatsApp + Lanchonete
-- Data: 2026-01-11
-- ===================================================================

-- Criar banco de dados
DROP DATABASE IF EXISTS lepapon_unified_db;
CREATE DATABASE lepapon_unified_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lepapon_unified_db;

-- ===================================================================
-- SEÇÃO 1: TABELAS WHATSAPP
-- ===================================================================

-- whatsapp_users
CREATE TABLE IF NOT EXISTS whatsapp_users (
    id VARCHAR(255) PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(255),
    display_name VARCHAR(255),
    profile_picture_url TEXT,
    user_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- whatsapp_contacts
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    id VARCHAR(255) PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    profile_picture_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- whatsapp_messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id VARCHAR(255) PRIMARY KEY,
    conversation_id VARCHAR(255),
    sender_id VARCHAR(255),
    receiver_id VARCHAR(255),
    message_text LONGTEXT,
    message_type VARCHAR(50),
    media_url TEXT,
    status VARCHAR(50),
    timestamp BIGINT,
    order_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES whatsapp_users(id) ON DELETE SET NULL,
    FOREIGN KEY (receiver_id) REFERENCES whatsapp_users(id) ON DELETE SET NULL,
    INDEX idx_conversation (conversation_id),
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- whatsapp_orders
CREATE TABLE IF NOT EXISTS whatsapp_orders (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    order_data JSON NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_type VARCHAR(50),
    total_amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES whatsapp_users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- whatsapp_order_items
CREATE TABLE IF NOT EXISTS whatsapp_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    item_name VARCHAR(255),
    quantity INT,
    price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES whatsapp_orders(id) ON DELETE CASCADE,
    INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- whatsapp_catalog_products
CREATE TABLE IF NOT EXISTS whatsapp_catalog_products (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    image_url TEXT,
    availability BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- whatsapp_sessions
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    session_data JSON,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES whatsapp_users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- whatsapp_flow_interactions
CREATE TABLE IF NOT EXISTS whatsapp_flow_interactions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    flow_name VARCHAR(255),
    flow_action VARCHAR(255),
    interaction_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES whatsapp_users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_flow (flow_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- whatsapp_flow_sessions
CREATE TABLE IF NOT EXISTS whatsapp_flow_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    flow_id VARCHAR(255),
    session_state JSON,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES whatsapp_users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_flow (flow_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- whatsapp_interactions
CREATE TABLE IF NOT EXISTS whatsapp_interactions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    type VARCHAR(100),
    action VARCHAR(100),
    data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES whatsapp_users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- whatsapp_analytics
CREATE TABLE IF NOT EXISTS whatsapp_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_name VARCHAR(255),
    metric_value VARCHAR(255),
    timestamp BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_metric (metric_name),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- security_audit_log
CREATE TABLE IF NOT EXISTS security_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(255),
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    user_id VARCHAR(255),
    details JSON,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_timestamp (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- SEÇÃO 2: TABELAS LANCHONETE
-- ===================================================================

-- customers
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    sobrenome VARCHAR(255),
    fone VARCHAR(20),
    loyalty_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome (nome),
    INDEX idx_fone (fone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(100),
    email VARCHAR(255),
    cnpj VARCHAR(18),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- products
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('insumo', 'prato') NOT NULL,
    price DECIMAL(10, 2) DEFAULT 0.00,
    cost DECIMAL(10, 2) DEFAULT 0.00,
    stock DECIMAL(10, 3) DEFAULT 0,
    min_stock DECIMAL(10, 3) DEFAULT 10,
    max_stock DECIMAL(10, 3),
    unit ENUM('un', 'kg', 'g', 'l', 'ml') DEFAULT 'un',
    supplier_id VARCHAR(50),
    category VARCHAR(100) DEFAULT 'Geral',
    description TEXT,
    barcode VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    INDEX idx_type (type),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- sales
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(50) PRIMARY KEY,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash', 'card', 'pix', 'credit') NOT NULL,
    customer_id VARCHAR(50),
    customer_name VARCHAR(255),
    discount DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- sale_items
CREATE TABLE IF NOT EXISTS sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_sale (sale_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- purchases
CREATE TABLE IF NOT EXISTS purchases (
    id VARCHAR(50) PRIMARY KEY,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    supplier_id VARCHAR(50) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status ENUM('ordered', 'received', 'cancelled') DEFAULT 'received',
    invoice_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    INDEX idx_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- purchase_items
CREATE TABLE IF NOT EXISTS purchase_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_purchase (purchase_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- SEÇÃO 3: TABELAS NOVAS DE SINCRONIZAÇÃO
-- ===================================================================

-- whatsapp_lanchonete_sync
CREATE TABLE IF NOT EXISTS whatsapp_lanchonete_sync (
    id INT AUTO_INCREMENT PRIMARY KEY,
    whatsapp_order_id VARCHAR(255) NOT NULL,
    sale_id VARCHAR(50),
    whatsapp_user_id VARCHAR(255),
    customer_id VARCHAR(50),
    sync_type VARCHAR(50) COMMENT 'order_to_sale, customer_sync, payment_sync',
    sync_data JSON,
    sync_status VARCHAR(50) DEFAULT 'pending',
    sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (whatsapp_order_id) REFERENCES whatsapp_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
    FOREIGN KEY (whatsapp_user_id) REFERENCES whatsapp_users(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_whatsapp_order (whatsapp_order_id),
    INDEX idx_sale (sale_id),
    INDEX idx_status (sync_status),
    INDEX idx_timestamp (sync_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- sync_status_log
CREATE TABLE IF NOT EXISTS sync_status_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sync_id INT,
    status_from VARCHAR(50),
    status_to VARCHAR(50),
    message TEXT,
    error_details JSON,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sync_id) REFERENCES whatsapp_lanchonete_sync(id) ON DELETE CASCADE,
    INDEX idx_sync (sync_id),
    INDEX idx_timestamp (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- FIM DO SCHEMA
-- ===================================================================
