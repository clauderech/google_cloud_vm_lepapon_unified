# Referência das Tabelas Principais

## products
| Campo        | Tipo                                          | Chave | Observações           |
|-------------|-----------------------------------------------|-------|----------------------|
| id          | varchar(50)                                   | PRI   |                      |
| name        | varchar(255)                                  |       |                      |
| type        | enum('insumo','prato','revenda')              |       |                      |
| price       | decimal(10,2)                                 |       |                      |
| cost        | decimal(10,2)                                 |       |                      |
| stock       | decimal(10,3)                                 |       |                      |
| min_stock   | decimal(10,3)                                 |       |                      |
| max_stock   | decimal(10,3)                                 |       |                      |
| unit        | enum('un','kg','g','l','ml','cx','frd','pct') |       |                      |
| supplier_id | varchar(50)                                   |       |                      |
| category    | varchar(100)                                  |       |                      |
| description | text                                          |       |                      |
| recipe      | json                                          |       |                      |
| barcode     | varchar(50)                                   |       |                      |
| is_active   | tinyint(1)                                    |       |                      |
| created_at  | timestamp                                     |       |                      |
| updated_at  | timestamp                                     |       |                      |

## suppliers
| Campo      | Tipo         | Chave | Observações           |
|------------|--------------|-------|----------------------|
| id         | varchar(50)  | PRI   |                      |
| name       | varchar(255) |       |                      |
| contact    | varchar(100) |       |                      |
| email      | varchar(255) |       |                      |
| cnpj       | varchar(18)  |       |                      |
| address    | text         |       |                      |
| city       | varchar(100) |       |                      |
| state      | varchar(2)   |       |                      |
| created_at | timestamp    |       |                      |
| updated_at | timestamp    |       |                      |

## customers
| Campo          | Tipo         | Chave | Observações           |
|----------------|--------------|-------|----------------------|
| id             | varchar(50)  | PRI   |                      |
| nome           | varchar(255) |       |                      |
| sobrenome      | varchar(255) |       |                      |
| fone           | varchar(20)  |       |                      |
| loyalty_points | int          |       |                      |
| created_at     | timestamp    |       |                      |
| updated_at     | timestamp    |       |                      |

## sales
| Campo          | Tipo                               | Chave | Observações           |
|----------------|------------------------------------|-------|----------------------|
| id             | varchar(50)                        | PRI   |                      |
| date           | timestamp                          |       |                      |
| total          | decimal(10,2)                      |       |                      |
| payment_method | enum('cash','card','pix','credit') |       |                      |
| customer_id    | varchar(50)                        |       |                      |
| customer_name  | varchar(255)                       |       |                      |
| discount       | decimal(10,2)                      |       |                      |
| created_at     | timestamp                          |       |                      |

## purchases
| Campo          | Tipo                                   | Chave | Observações           |
|----------------|----------------------------------------|-------|----------------------|
| id             | varchar(50)                            | PRI   |                      |
| date           | timestamp                              |       |                      |
| supplier_id    | varchar(50)                            |       |                      |
| total          | decimal(10,2)                          |       |                      |
| status         | enum('ordered','received','cancelled') |       |                      |
| invoice_number | varchar(50)                            |       |                      |
| created_at     | timestamp                              |       |                      |

## purchase_items
| Campo        | Tipo          | Chave | Observações           |
|--------------|---------------|-------|----------------------|
| id           | int           | PRI   | auto_increment        |
| purchase_id  | varchar(50)   |       |                      |
| product_id   | varchar(50)   |       |                      |
| product_name | varchar(255)  |       |                      |
| quantity     | decimal(10,3) |       |                      |
| unit_price   | decimal(10,2) |       |                      |
| created_at   | timestamp     |       |                      |

## comandas
| Campo              | Tipo                               | Chave | Observações           |
|--------------------|------------------------------------|-------|----------------------|
| id                 | varchar(50)                        | PRI   |                      |
| customer_id        | varchar(50)                        |       |                      |
| customer_name      | varchar(255)                       |       |                      |
| table_number       | varchar(10)                        |       |                      |
| opened_at          | timestamp                          |       |                      |
| closed_at          | timestamp                          |       |                      |
| total              | decimal(10,2)                      |       |                      |
| status             | enum('open','closed','cancelled')  |       |                      |
| payment_method     | enum('cash','card','pix','credit') |       |                      |
| source             | enum('pos','lepapon')              |       |                      |
| lepapon_session_id | varchar(255)                       |       |                      |
| lepapon_order_id   | int                                |       |                      |
| order_status       | varchar(50)                        |       |                      |
| payment_status     | varchar(50)                        |       |                      |
| notes              | text                               |       |                      |
| created_at         | timestamp                          |       |                      |
| updated_at         | timestamp                          |       |                      |

## comanda_items
| Campo        | Tipo                                            | Chave | Observações           |
|--------------|-------------------------------------------------|-------|----------------------|
| id           | int unsigned                                    | PRI   | auto_increment        |
| comanda_id   | varchar(50)                                     |       |                      |
| product_id   | varchar(50)                                     |       |                      |
| product_name | varchar(255)                                    |       |                      |
| quantity     | decimal(10,3)                                   |       |                      |
| unit_price   | decimal(10,2)                                   |       |                      |
| status       | enum('pending','preparing','ready','delivered') |       |                      |
| notes        | text                                            |       |                      |
| created_at   | timestamp                                       |       |                      |
| updated_at   | timestamp                                       |       |                      |
