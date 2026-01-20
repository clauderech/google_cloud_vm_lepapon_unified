# 🍽️ GUIA COMPLETO: CADASTRO DE PRODUTOS TIPO PRATO

## 📋 Visão Geral
O sistema permite cadastrar **3 tipos de produtos**:
1. **📦 Insumo** - Matérias-primas que você compra
2. **🍽️ Prato** - Produtos que você prepara e vende
3. **🛒 Revenda** - Produtos prontos que você revende

---

## 🎯 PASSOS PARA CADASTRAR UM PRATO

### **PASSO 1: Acessar a Tela de Cadastro**

No menu lateral, clique em **"Cadastro & Estoque"** → A tela abre mostrando:
- Campo de busca de produtos
- Botão verde **"+ Novo Produto"**
- 3 abas: Insumos | Pratos | Revenda

```
┌─────────────────────────────────────────┐
│  Cadastro & Estoque          [+ Novo]   │
│                                          │
│  [Buscar produto...]                    │
│                                          │
│  📦 Insumos (Estoque Controlado)        │
│  🍽️ Pratos (Estoque Calculado)          │
│  🛒 Revenda (Estoque Controlado)        │
└─────────────────────────────────────────┘
```

---

### **PASSO 2: Selecionar o Tipo "PRATO"**

Clique no botão **"+ Novo Produto"** → O modal se abre com **3 abas**:

```
┌──────────────────────────────────────────────┐
│  ➕ Novo Produto                       [X]   │
├──────────────────────────────────────────────┤
│                                              │
│  [📦 Insumo] [🍽️ Prato] [🛒 Revenda]        │
│                                              │
│  (Clique em "🍽️ Prato")                      │
└──────────────────────────────────────────────┘
```

**Ao clicar em "🍽️ Prato":**
- Os campos se reorganizam para um produto tipo prato
- A seção "Receita" aparece com a cor azul

---

### **PASSO 3: Preencher os Dados Básicos**

Para um **prato tipo "Pizza Muçarela"**, preencha:

| Campo | Exemplo | Observação |
|-------|---------|-----------|
| **Nome** | Pizza Muçarela | Obrigatório (*) |
| **Categoria** | Pizza | Ex: Pizza, Xis, Pastel, Sanduíche, etc. |
| **Preço de Venda** | 35.00 | Valor que o cliente paga |
| **Ativo** | ✓ Sim | Checkbox - deixe marcado |

```html
<!-- FORMULÁRIO PARA PRATO -->
<form>
  <div>
    <label>Nome *</label>
    <input placeholder="Pizza Muçarela" />
  </div>
  
  <div>
    <label>Categoria</label>
    <input placeholder="Pizza" />
  </div>
  
  <div>
    <input type="checkbox" checked />
    <label>✓ Produto Ativo</label>
  </div>
  
  <div>
    <label>Preço de Venda</label>
    <input type="number" step="0.01" value="35.00" />
  </div>
</form>
```

---

### **PASSO 4: Criar a FICHA TÉCNICA (Receita)**

Esta é a seção mais importante! Aqui você **define os ingredientes** necessários.

#### **Como Adicionar um Ingrediente:**

1. **Selecione um INSUMO** no primeiro dropdown
   - Só aparecem produtos com `type = 'insumo'`
   - Exemplo: Farinha de Trigo

2. **Informe a QUANTIDADE** necessária
   - Unidade: aquela cadastrada no insumo (kg, g, l, ml, un)
   - Exemplo: 0.5 (kg)

3. **Clique em "+" para adicionar**

#### **Exemplo - Pizza Muçarela (Receita):**

```
┌────────────────────────────────────────────────┐
│ 🍽️ Ficha Técnica (Receita)                     │
├────────────────────────────────────────────────┤
│                                                 │
│  [Selecione um insumo...] [Quantidade] [+]    │
│                                                 │
│  Ingredientes Adicionados:                     │
│  ┌──────────────────────────────────────────┐  │
│  │ Farinha de Trigo               0.5 kg   │  │
│  │ Molho de Tomate               0.3 l    │  │
│  │ Mozzarela                     0.2 kg   │  │
│  │ Cebola                        0.05 kg  │  │
│  │ Orégano                       0.01 kg  │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└────────────────────────────────────────────────┘
```

#### **Passo a Passo da Receita:**

```
1️⃣  Clique no dropdown "Selecione um insumo..."
    ↓ Aparece lista:
    - Farinha de Trigo (kg)
    - Molho de Tomate (l)
    - Mozzarela (kg)
    - Cebola (kg)
    - Orégano (kg)
    
2️⃣  Selecione "Farinha de Trigo"
    
3️⃣  No campo "Quantidade", digite: 0.5
    
4️⃣  Clique em "+" (botão verde)
    ✅ "Farinha de Trigo 0.5" aparece abaixo
    
5️⃣  Repita para cada ingrediente:
    - Molho de Tomate (0.3)
    - Mozzarela (0.2)
    - Cebola (0.05)
    - Orégano (0.01)
```

---

### **PASSO 5: Salvar o Produto**

Na base do formulário, clique em:

```
┌─────────────────────────────────────────────┐
│  [✅ Criar Prato]    [Cancelar]              │
└─────────────────────────────────────────────┘
```

---

## 🗄️ O QUE ACONTECE NOS BASTIDORES

### **1. Estrutura do Banco de Dados**

```sql
-- Tabela PRODUCTS (frontend/types.ts)
CREATE TABLE products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('insumo', 'prato', 'revenda'),
  category VARCHAR(100),
  price DECIMAL(10,2),          -- Preço de venda
  cost DECIMAL(10,2),            -- Custo (NULL para prato)
  stock INT,                      -- Quantidade em estoque
  min_stock INT,
  unit VARCHAR(10),
  supplier_id VARCHAR(50),
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### **2. Tabela de Receita**

Embora não haja uma tabela separada no banco, a receita é armazenada em memória:

```typescript
// No arquivo: frontend/types.ts
export interface RecipeItem {
  ingredientId: string;    // ID do insumo
  quantity: number;        // Quantidade necessária
}

export interface Product {
  recipe?: RecipeItem[];   // Array de ingredientes
}
```

### **3. Exemplo JSON de um Prato Cadastrado**

```json
{
  "id": "1705421234567",
  "name": "Pizza Muçarela",
  "type": "prato",
  "category": "Pizza",
  "price": 35.00,
  "cost": null,
  "stock": 0,
  "minStock": 0,
  "unit": "un",
  "supplierId": null,
  "isActive": true,
  "recipe": [
    { "ingredientId": "ing_farinha", "quantity": 0.5 },
    { "ingredientId": "ing_molho", "quantity": 0.3 },
    { "ingredientId": "ing_mozza", "quantity": 0.2 },
    { "ingredientId": "ing_cebola", "quantity": 0.05 },
    { "ingredientId": "ing_oregano", "quantity": 0.01 }
  ],
  "created_at": "2025-01-20T10:30:00Z",
  "updated_at": "2025-01-20T10:30:00Z"
}
```

---

## 🚀 FLUXO COMPLETO (Frontend → Backend → Database)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USUÁRIO PREENCHE E CLICA "Criar Prato"                       │
│    App.tsx → Inventory component → handleSave()                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND VALIDA                                              │
│    - Nome é obrigatório ✓                                       │
│    - type = 'prato' ✓                                           │
│    - Receita validada ✓                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CHAMA API: POST /api/products                                │
│    storageService.saveProduct(product)                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. BACKEND RECEBE (backend/routes/api.js)                       │
│    POST /api/products                                           │
│    Body: { id, name, type:'prato', category, price, recipe }  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. INSERE NO BANCO (db('products').insert())                    │
│    INSERT INTO products VALUES (...)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. FRONTEND ATUALIZA STATE                                      │
│    setState(prev => { products: [...] })                        │
│    ✅ Prato aparece na tabela "Pratos / Lanches"               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 TABELA DE VISUALIZAÇÃO (APÓS CADASTRO)

Após criar o prato, ele aparece na seção **"🍽️ Pratos / Lanches"**:

```
┌──────────────────────────────────────────────────────────────────┐
│  🍽️ Pratos / Lanches (Estoque Calculado)                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Nome                  Preço Venda   Produção Max.  Ingredientes │
│  ─────────────────────────────────────────────────────────────── │
│  Pizza Muçarela        R$ 35.00      ~ 10 un       Farinha, Mol.. │
│                                                    [✏️ Editar]    │
│                                                                   │
│  Xis Bacon             R$ 22.00      ~ 15 un       Pão, Carne..  │
│                                                    [✏️ Editar]    │
│                                                                   │
│  Pastel Calabresa      R$ 8.00       ~ 25 un       Massa, Carne..│
│                                                    [✏️ Editar]    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Coluna "Produção Max. Est.":**
- Calcula: quantas unidades você consegue fazer com os insumos em estoque
- Exemplo: Se tem 5kg de farinha e pizza usa 0.5kg → máximo 10 pizzas
- Fica **VERMELHA** se < 5 unidades (alerta de falta de insumo)

---

## 🔄 EDITAR UM PRATO CADASTRADO

Para editar um prato já cadastrado:

1. Clique em **"✏️ Editar"** na linha do prato
2. O formulário se abre **pré-preenchido**
3. Modifique qualquer campo ou ingrediente
4. Clique em **"💾 Atualizar Prato"**

```
✅ Após atualizar:
- Tabela é atualizada imediatamente
- Campo "Produção Max." recalcula automaticamente
- Receita é substituída completamente
```

---

## ⚠️ COMPORTAMENTOS ESPECIAIS DE PRATO

| Comportamento | Detalhe |
|--|--|
| **Estoque** | Sempre **0** (calculado a partir dos insumos) |
| **Custo** | Não tem campo (calculado a partir da receita) |
| **Fornecedor** | Não tem campo (fornecedor é dos insumos) |
| **Receita Obrigatória** | Não, mas sem receita não consegue vender |
| **Ao Vender** | Sistema deduz insumos conforme recipe |

---

## 🎨 EXEMPLO PRÁTICO COMPLETO

### **Cadastrando: Pastel de Carne**

```
PASSO 1: Clique "+ Novo Produto"
         ↓
         Modal abre

PASSO 2: Clique em "🍽️ Prato"
         ↓
         Interface muda para prato

PASSO 3: Preencha campos básicos
         Nome: Pastel de Carne
         Categoria: Pastel
         Preço de Venda: 12.00
         Ativo: ✓

PASSO 4: Abra "Ficha Técnica (Receita)"
         ↓
         Selecione: "Massa de Pastel" → 0.08 kg → Clique +
         Selecione: "Carne Moída" → 0.1 kg → Clique +
         Selecione: "Cebola" → 0.02 kg → Clique +
         ↓
         Mostra:
         ✓ Massa de Pastel (0.08 kg)
         ✓ Carne Moída (0.1 kg)
         ✓ Cebola (0.02 kg)

PASSO 5: Clique em "✅ Criar Prato"
         ↓
         ✅ Pastéis cadastrado!
         Aparece na tabela "Pratos / Lanches"
         Mostra: "Produção Max. ~ 25 un" (baseado em insumos)
```

---

## 📱 VISÃO NO CARDÁPIO (Venda)

Quando você está vendendo no **PDV**, o prato aparece assim:

```
┌─────────────────────────┐
│     🍽️ Pizza Muçarela    │
│                         │
│        R$ 35.00         │
│                         │
│   [Adicionar ao Pedido] │
└─────────────────────────┘
```

Ao clicar, se for **prato**, o sistema abre um modal para:
- Adicionar observações (sem cebola, sem molho, etc.)
- Depois deduz automaticamente os insumos do estoque

---

## 🔍 RESUMO VISUAL DO PROCESSO

```
┌──────────────────────────────────────┐
│   CADASTRO DE PRATO (RECEITA)        │
├──────────────────────────────────────┤
│                                      │
│  1. Tipo: 🍽️ PRATO                   │
│                                      │
│  2. Dados:                           │
│     • Nome                           │
│     • Categoria                      │
│     • Preço de Venda                │
│     • Status (Ativo)                │
│                                      │
│  3. Receita (Ingredientes):         │
│     • Insumo 1 (quantidade)         │
│     • Insumo 2 (quantidade)         │
│     • Insumo 3 (quantidade)         │
│     • ... N ingredientes            │
│                                      │
│  4. Salvar → Banco de Dados         │
│                                      │
│  5. Aparece em "Pratos / Lanches"   │
│     com cálculo de produção máxima   │
│                                      │
└──────────────────────────────────────┘
```

---

## 💡 DICAS IMPORTANTES

✅ **Sempre comece cadastrando INSUMOS primeiro**
- Sem insumos, não consegue criar receitas

✅ **Use categorias consistentes**
- Pizza, Pastel, Sanduíche, Bebida, etc.
- Ajuda na organização do cardápio

✅ **Defina o preço com base na receita + margem**
- Custo insumo + lucro desejado = preço final

✅ **Atualize receitas se mudar ingredientes**
- Sistema recalcula produção máxima automaticamente

✅ **Monitore a coluna "Produção Max."**
- Vermelha = falta insumo, compre mais
- Verde = tudo bem, pode vender

---

**Documento atualizado:** 20 de janeiro de 2026
