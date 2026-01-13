# 🔧 GUIA DE CORREÇÃO: Importação CSV para Products

## Problema Identificado

A migration original `20260109_12_import_catalog_csv.js` **ignora dados importantes do CSV**:
- ❌ Preços reais do CSV são ignorados (usa preços genéricos)
- ❌ Categorias do CSV são ignoradas (tenta deduzir do nome)
- ❌ Campo "type" do CSV não é preservado
- ❌ Sem validação de dados

---

## Solução: Arquivos Corrigidos

### 1. **Versão Corrigida da Migration**

**Arquivo:** `migrations/20260109_12_import_catalog_csv_FIXED.js` ✅ NOVO

**Melhorias Implementadas:**

```javascript
// ❌ ANTES (Original)
const [id, ...nameParts] = line.split(',');
return {
  id: id.trim(),
  name: nameParts.join(',').trim(), // Ignora resto
};
// Resultado: ignora type, category, price!

// ✅ DEPOIS (Corrigido)
const parts = line.split(',');
const id = parts[0].trim();
const name = parts[1].trim();
const type = parts[2].trim();
const category = parts[3].trim();
const price = parseFloat(parts[4].trim());
// Resultado: usa TODAS as colunas
```

**Validações Adicionadas:**

```javascript
// ✅ ID vazio?
if (!id) {
  console.warn(`[Row ${i}] ID vazio, ignorando`);
  skippedCount++;
  continue;
}

// ✅ Nome vazio?
if (!name) {
  console.warn(`[Row ${i}] Nome vazio, ignorando ID ${id}`);
  skippedCount++;
  continue;
}

// ✅ Preço inválido?
if (isNaN(price)) {
  console.warn(`[Row ${i}] Preço inválido "${parts[4]}" para ${name}, usando 0`);
}

// ✅ Preço fora do range?
if (price < 0 || price > 999.99) {
  console.warn(`[Row ${i}] Preço fora do range (${price}): ${name}`);
}
```

**Dados Preservados:**

```javascript
meta_data: JSON.stringify({
  source: 'csv_import_v2',
  original_name: record.csv_name,           // ✅ Nome original com underscore
  original_category: record.csv_category,   // ✅ Categoria original
  original_price: record.csv_price,         // ✅ Preço original
  product_type: record.csv_type,            // ✅ Type preservado
})
```

---

## 📋 Como Implementar as Correções

### **Opção 1: Usar Migration Corrigida (RECOMENDADO)**

Se **NUNCA rodou a migration original**:

```bash
# 1. Deletar arquivo errado
rm migrations/20260109_12_import_catalog_csv.js

# 2. Renomear versão corrigida
mv migrations/20260109_12_import_catalog_csv_FIXED.js \
   migrations/20260109_12_import_catalog_csv.js

# 3. Rodar migrations
cd backend
npx knex migrate:latest

# 4. Verificar importação
mysql -u root -p lepapon_unified_db -e \
  "SELECT COUNT(*), AVG(price), MIN(price), MAX(price) FROM whatsapp_catalog_products;"
```

### **Opção 2: Corrigir Banco Existente (SE JÁ IMPORTOU)**

Se a migration original **já foi executada** e dados estão errados:

```bash
# 1. Backup do banco (OBRIGATÓRIO!)
mysqldump -u root -p lepapon_unified_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Deletar dados atuais
mysql -u root -p lepapon_unified_db -e "DELETE FROM whatsapp_catalog_products;"

# 3. Criar migration de fix
touch migrations/20260113_fix_import_catalog_csv.js
# Copiar código da versão corrigida para este arquivo

# 4. Rodar
npx knex migrate:latest

# 5. Verificar
mysql -u root -p lepapon_unified_db -e \
  "SELECT id, name, category, price FROM whatsapp_catalog_products LIMIT 10;"
```

---

## 🧪 Validação Pós-Importação

### **1. Verificar Contagem**

```bash
mysql -u root -p lepapon_unified_db -e \
  "SELECT COUNT(*) as total_products FROM whatsapp_catalog_products;"

# Esperado: 101
```

### **2. Verificar Preços**

```bash
mysql -u root -p lepapon_unified_db -e "
SELECT 
  category,
  COUNT(*) as count,
  MIN(price) as min_price,
  MAX(price) as max_price,
  ROUND(AVG(price), 2) as avg_price
FROM whatsapp_catalog_products
WHERE price IS NOT NULL
GROUP BY category
ORDER BY avg_price DESC;
"
```

**Esperado (aproximado):**
```
| category  | count | min_price | max_price | avg_price |
|-----------|-------|-----------|-----------|-----------|
| pizza     | 18    | 5.00      | 45.00     | 33.50     |
| xis       | 23    | 8.00      | 42.00     | 25.00     |
| dogs      | 8     | 11.00     | 23.00     | 17.00     |
```

### **3. Verificar Nomes Normalizados**

```bash
mysql -u root -p lepapon_unified_db -e \
  "SELECT name, category, price FROM whatsapp_catalog_products LIMIT 5;"
```

**Esperado:**
- Underscores convertidos em espaços ✅
- Nomes capitalizados corretamente ✅
- Preços reais do CSV ✅

### **4. Verificar Meta Data**

```bash
mysql -u root -p lepapon_unified_db -e \
  "SELECT product_retailer_id, name, meta_data FROM whatsapp_catalog_products LIMIT 1\\G"
```

**Esperado:**
```json
{
  "source": "csv_import_v2",
  "original_name": "Xis_Bacon",
  "original_category": "xis",
  "original_price": 29.00,
  "product_type": "prato"
}
```

---

## 📊 Comparação: Antes vs Depois

### **Produto: Pizza Muçarela (ID: 411002)**

#### ❌ ANTES (Original - Errado)

| Campo | Valor |
|-------|-------|
| id | 1 (auto-increment) |
| product_retailer_id | 411002 |
| name | Pizza Muçarela |
| category | Pizza (deduzida) |
| price | 45.00 (genérico) |
| description | Pizza Muçarela (do nome) |
| meta_data | source: csv_import, original_name: "Pizza Muçarela" |

**Problemas:**
- Preço 45.00 está errado (CSV tem 27.00)
- Tipo não foi preservado
- Meta data incompleta

#### ✅ DEPOIS (Corrigido)

| Campo | Valor |
|-------|-------|
| id | 1 (auto-increment) |
| product_retailer_id | 411002 |
| name | Pizza Muçarela |
| category | Pizza |
| price | **27.00** ✅ (do CSV) |
| description | Pizza Muçarela |
| meta_data | {source: csv_import_v2, original_price: 27.00, **product_type: prato** ✅} |

**Melhorias:**
- Preço correto do CSV ✅
- Tipo preservado em meta_data ✅
- Categoria correta ✅
- Meta data completa ✅

---

## 🚀 Próximos Passos

### **Imediato (Hoje)**

1. ✅ [Revisar COMPATIBILIDADE_CSV_PRODUCTS.md](COMPATIBILIDADE_CSV_PRODUCTS.md)
2. ✅ [Usar migration corrigida 20260109_12_import_catalog_csv_FIXED.js](migrations/20260109_12_import_catalog_csv_FIXED.js)
3. ✅ Rodar `npx knex migrate:latest`
4. ✅ Validar com queries SQL acima

### **Futuro (Se necessário)**

- [ ] Adicionar coluna `product_type` na tabela (se quiser normalizá-la)
- [ ] Integrar importação de imagens (image_urls)
- [ ] Adicionar script de sincronização periódica com LePapon

---

## 📞 Suporte

Se houver problemas:

1. **Verificar logs da migration:**
   ```bash
   npx knex migrate:latest --verbose
   ```

2. **Rollback e retry:**
   ```bash
   npx knex migrate:rollback
   npx knex migrate:latest
   ```

3. **Listar migrations:**
   ```bash
   npx knex migrate:list
   ```

---

**Última Atualização:** 13 de janeiro de 2026  
**Status:** ✅ Pronto para implementação
