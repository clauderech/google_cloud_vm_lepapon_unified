# 📊 RELATÓRIO DE COMPATIBILIDADE: CSV vs Tabela Products

## Data: 13 de janeiro de 2026
## Arquivo: `files/csvs/catalog_products_2026-01-05.csv`
## Tabela Alvo: `whatsapp_catalog_products`

---

## 📋 Estrutura do CSV

### Cabeçalho
```
id,name,type,category,price
```

### Colunas Identificadas
1. **id** - identificador do produto (ex: 411002)
2. **name** - nome do produto (ex: Pizza Muçarela)
3. **type** - tipo sempre "prato"
4. **category** - categoria (ex: pizza, xis, dogs)
5. **price** - preço em R$ (ex: 27.00)

### Amostra de Dados
```
411002,Pizza Muçarela,prato,pizza,27.00
411003,Pizza Portuguesa,prato,pizza,34.00
410100,Xis_Bacon_Coracao,prato,xis,35.00
410201,Cachorro_Simples,prato,dogs,11.00
```

### Total de Registros
- **102 linhas totais** (1 header + 101 produtos)

---

## 🗄️ Estrutura da Tabela `whatsapp_catalog_products`

### Schema (Migration 20260109_07_create_whatsapp_catalog_products.js)

| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| **id** | BIGINT | ❌ | AUTO_INCREMENT | Chave primária auto-incrementada |
| **product_retailer_id** | VARCHAR(100) | ❌ | UNIQUE | ID do produto (Meta/Retailer) |
| **catalog_id** | VARCHAR(100) | ✅ | NULL | ID do catálogo |
| **name** | VARCHAR(255) | ❌ | - | Nome do produto |
| **description** | TEXT | ✅ | NULL | Descrição detalhada |
| **category** | VARCHAR(100) | ✅ | NULL | Categoria do produto |
| **price** | DECIMAL(10,2) | ✅ | NULL | Preço em R$ |
| **currency** | VARCHAR(3) | - | 'BRL' | Moeda |
| **is_available** | BOOLEAN | - | TRUE | Disponibilidade |
| **stock_quantity** | INTEGER | - | 0 | Quantidade em estoque |
| **image_urls** | JSON | ✅ | NULL | URLs de imagens |
| **meta_data** | JSON | ✅ | NULL | Dados extras |
| **last_synced** | TIMESTAMP | ✅ | NULL | Última sincronização |
| **created_at** | TIMESTAMP | - | NOW() | Data de criação |
| **updated_at** | TIMESTAMP | - | NOW() | Última atualização |

---

## ✅/❌ ANÁLISE DE COMPATIBILIDADE

### 1. **CAMPOS DO CSV vs TABELA**

| Campo CSV | Tabela | Status | Observação |
|-----------|--------|--------|-----------|
| **id** | product_retailer_id | ✅ COMPATÍVEL | ID mapeado como product_retailer_id (string) |
| **name** | name | ✅ COMPATÍVEL | VARCHAR(255) acomoda |
| **type** | ❌ NÃO MAPEADO | ⚠️ AVISO | CSV tem "type=prato", tabela não tem este campo |
| **category** | category | ✅ COMPATÍVEL | VARCHAR(100) acomoda perfeitamente |
| **price** | price | ✅ COMPATÍVEL | DECIMAL(10,2) acomoda preços como 27.00 |

### 2. **CAMPOS DA TABELA NÃO PRESENTES NO CSV**

| Campo | Tipo | Status | Solução |
|-------|------|--------|---------|
| **id** | BIGINT AUTO_INCREMENT | ✅ AUTOMÁTICO | Gerado automaticamente pelo BD |
| **catalog_id** | VARCHAR(100) | ⚠️ PREENCHIDO | Preenchido com env var `WHATSAPP_CATALOG_ID` ou default '857531673917870' |
| **description** | TEXT | ⚠️ GERADO | Gerado dinamicamente a partir do nome |
| **currency** | VARCHAR(3) | ✅ DEFAULT | Padrão: 'BRL' |
| **is_available** | BOOLEAN | ✅ DEFAULT | Padrão: TRUE (todos disponíveis) |
| **stock_quantity** | INTEGER | ✅ DEFAULT | Padrão: 999 (estoque ilimitado na importação) |
| **image_urls** | JSON | ✅ NULL | Não disponível no CSV (deixado vazio) |
| **meta_data** | JSON | ✅ PREENCHIDO | Contém {source: 'csv_import', imported_at, original_name} |
| **last_synced** | TIMESTAMP | ✅ PREENCHIDO | Timestamp atual na importação |
| **created_at/updated_at** | TIMESTAMP | ✅ PREENCHIDO | Timestamp atual na importação |

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. **Campo "type" do CSV não é usado**
- **Severidade:** 🟡 BAIXA
- **Descrição:** CSV contém coluna "type" (sempre "prato"), mas tabela não tem este campo
- **Impacto:** Informação perdida durante importação
- **Solução:** 
  - Opção A: Adicionar coluna `product_type` à tabela
  - Opção B: Armazenar em `meta_data` como JSON
  - Opção C: Ignorar (type sempre será "prato")

### 2. **Números com Underscores nos Nomes**
- **Severidade:** 🟢 BAIXA
- **Descrição:** Alguns nomes têm underscores (ex: "Xis_Bacon_Coracao")
- **Impacto:** Aspecto visual, sem impacto funcional
- **Solução:** Normalizar underscores em espaços durante importação
- **Status:** ✅ JÁ IMPLEMENTADO na função `generateDescription()`

### 3. **Acentuação e Caracteres Especiais**
- **Severidade:** 🟢 BAIXA
- **Descrição:** Alguns nomes têm acentuação (ex: "Muçarela")
- **Impacto:** Nenhum (charset UTF8MB4 suporta)
- **Status:** ✅ COMPATÍVEL

### 4. **Preços Inconsistentes**
- **Severidade:** 🟡 MÉDIA
- **Descrição:** Preço formato string "27.00" vs esperado numeric
- **Impacto:** Conversão automática (funciona)
- **Status:** ✅ COMPATÍVEL (JavaScript converte automaticamente)

---

## 📊 ANÁLISE DE DADOS

### Distribuição por Categoria

```
Pizzas:     18 produtos (411000-411018)
Xis:        23 produtos (410100-410122)
Dogs:        8 produtos (410200-410208)
Outros:     52 produtos (mais categorias)
Total:     101 produtos
```

### Range de Preços

| Categoria | Mínimo | Máximo | Média |
|-----------|--------|--------|-------|
| Pizza | R$ 5.00 | R$ 45.00 | ~33.00 |
| Xis | R$ 8.00 | R$ 42.00 | ~25.00 |
| Dogs | R$ 11.00 | R$ 23.00 | ~17.00 |

---

## 🔄 FLUXO DE IMPORTAÇÃO ATUAL

```
CSV File (catalog_products_2026-01-05.csv)
    ↓
Migration: 20260109_12_import_catalog_csv.js
    ├─ 1. Ler arquivo CSV
    ├─ 2. Parse: id, name (2 colunas apenas!)
    ├─ 3. generateDescription(name) → Formata nome
    ├─ 4. extractCategory(name) → Detecta categoria
    ├─ 5. generatePrice(name) → Gera preço padrão (PROBLEMA!)
    └─ 6. INSERT INTO whatsapp_catalog_products
                ↓
            Tabela whatsapp_catalog_products
```

### ⚠️ PROBLEMA CRÍTICO ENCONTRADO!

A migration **IGNORA** as colunas `type`, `category` e `price` do CSV!

```javascript
// Código atual (ERRADO):
const [id, ...nameParts] = line.split(',');
return {
  id: id.trim(),
  name: nameParts.join(',').trim(), // Toma apenas "name", ignora o resto!
};
```

**Resultado:** 
- `price` do CSV é **IGNORADO** 
- `category` do CSV é **IGNORADO**
- `generatePrice()` gera preço padrão genérico
- `extractCategory()` tenta deduzir categoria do nome

---

## ✅ SOLUÇÕES RECOMENDADAS

### **Solução 1: Atualizar Parser CSV (RECOMENDADO)**

```javascript
// Novo código:
const columns = lines[0].split(',').map(c => c.trim());
const records = lines.slice(1).map(line => {
  const values = line.split(',');
  return {
    id: values[0].trim(),
    name: values[1].trim(),
    type: values[2]?.trim() || 'prato',
    category: values[3]?.trim(),
    price: parseFloat(values[4]) || null,
  };
});
```

**Benefício:** Usa dados reais do CSV em vez de gerar/deduzir

### **Solução 2: Adicionar Coluna product_type (OPCIONAL)**

```sql
ALTER TABLE whatsapp_catalog_products 
ADD COLUMN product_type VARCHAR(50) 
AFTER product_retailer_id;
```

**Benefício:** Preserva informação "type" do CSV

### **Solução 3: Validação de Dados (RECOMENDADO)**

Adicionar validação antes de INSERT:

```javascript
// Validar
if (!product.product_retailer_id) {
  console.warn(`[SKIP] Produto sem ID: ${product.name}`);
  continue;
}
if (!product.name || product.name.trim().length === 0) {
  console.warn(`[SKIP] Produto sem nome: ID ${product.product_retailer_id}`);
  continue;
}
if (product.price !== null && (product.price < 0 || product.price > 999.99)) {
  console.warn(`[WARN] Preço fora do range: ${product.name} = R$ ${product.price}`);
}
```

---

## 📋 CHECKLIST DE COMPATIBILIDADE

- [✅] CSV pode ser lido como texto
- [✅] Encoding UTF-8 (com acentuação)
- [✅] Colunas podem ser parseadas
- [✅] Tipos de dados são compatíveis
- [❌] **Preços do CSV NÃO são usados** (gerados padrão)
- [❌] **Categoria do CSV NÃO é usada** (deduzida do nome)
- [⚠️] **Campo "type" do CSV não tem destino** na tabela
- [⚠️] Sem validação de dados de entrada
- [⚠️] Sem detecção de duplicatas por ID

---

## 🎯 RECOMENDAÇÃO FINAL

### **Status: PARCIALMENTE COMPATÍVEL** ⚠️

**O CSV é tecnicamente compatível, mas:**

1. **Preços do CSV estão sendo ignorados** - A migration gera preços genéricos
2. **Categoria do CSV é ignorada** - A migration tenta deduzir
3. **Campo "type" não tem destino** - Informação perdida

### **Ação Recomendada:**

1. **Imediato:** Corrigir parser CSV para usar colunas reais
2. **Opcional:** Adicionar coluna `product_type` se necessário
3. **Importante:** Adicionar validação de dados

### **Impacto se não corrigido:**

- ✅ Importação funciona (dados salvos)
- ❌ Preços estarão incorretos (genéricos em vez dos reais)
- ❌ Categorias podem estar erradas (deduzidas)
- ⚠️ Dados do CSV não aproveitados plenamente

---

## 📎 Arquivos Relacionados

- CSV: `files/csvs/catalog_products_2026-01-05.csv` (101 produtos)
- Migration de criação: `migrations/20260109_07_create_whatsapp_catalog_products.js`
- Migration de importação: `migrations/20260109_12_import_catalog_csv.js` ⚠️ **REQUER CORREÇÃO**

---

**Relatório Gerado:** 13 de janeiro de 2026  
**Status da Compatibilidade:** 🟡 PARCIALMENTE COMPATÍVEL
