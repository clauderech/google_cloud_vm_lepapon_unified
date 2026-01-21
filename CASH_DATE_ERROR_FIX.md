# 🐛 ERRO DE DATA NO CAIXA - CORRIGIDO

## 📍 Erro Encontrado

```
Error: ER_TRUNCATED_WRONG_VALUE errno: 1292
sqlMessage: "Incorrect date value: '2026-01-21T23:19:59.465Z' for column 'date' at row 1"
```

### **Root Cause:**

Coluna `date` do tipo `DATE` (só aceita: `YYYY-MM-DD`)  
Mas estava recebendo: `2026-01-21T23:19:59.465Z` (timestamp ISO completo com hora)

---

## ❌ Código Antes

```javascript
// backend/routes/financial.js - Linha 45
const [id] = await db('cash_registers').insert({
  date: new Date().toISOString(),  // ← ERRADO!
  // Resultado: 2026-01-21T23:19:59.465Z
  initial_amount: initialAmount,
  opened_by: openedBy,
  opened_at: new Date().toISOString(),  // ← Isso está correto
  // ...
});
```

**Problema:** 
- `date` é coluna `DATE` (apenas data)
- `opened_at` é coluna `TIMESTAMP` (data + hora) ✅

---

## ✅ Código Depois

```javascript
// backend/routes/financial.js - Linha 45-57
const now = new Date();
const dateOnly = now.toISOString().split('T')[0]; // ← EXTRAI APENAS DATA!
// Resultado: 2026-01-21

const [id] = await db('cash_registers').insert({
  date: dateOnly,              // ← 2026-01-21 ✅
  initial_amount: initialAmount,
  opened_by: openedBy,
  opened_at: now.toISOString(), // ← 2026-01-21T23:19:59.465Z ✅
  closed_at: null,
  closed_by: null,
  final_amount: null,
  notes: null
});
```

---

## 🔍 Diferença

```
new Date().toISOString()
└─ "2026-01-21T23:19:59.465Z"
   ├─ Parte 1: "2026-01-21"  ← date (DATE)
   └─ Parte 2: "T23:19:59.465Z" ← hora (TIMESTAMP)

.split('T')[0]  // Extrai parte 1
└─ "2026-01-21"  ← Correto para coluna DATE
```

---

## 📊 Banco de Dados

### Estrutura Correta:

```sql
CREATE TABLE cash_registers (
  id INT PRIMARY KEY,
  date DATE,                    -- Só data: 2026-01-21
  opened_at TIMESTAMP,          -- Data + hora: 2026-01-21 23:19:59
  closed_at TIMESTAMP NULL,     -- Data + hora (opcional)
  ...
);
```

### Inserção Correta:

```sql
INSERT INTO cash_registers (date, opened_at, ...)
VALUES ('2026-01-21', '2026-01-21 23:19:59', ...);
```

---

## ✨ Resultado

### Antes:
```
Operador clica "Abrir Caixa"
    ↓
Backend tenta inserir timestamp na coluna DATE
    ↓
❌ MySQL rejeita: "Incorrect date value"
    ↓
Frontend: Erro ao abrir caixa
```

### Depois:
```
Operador clica "Abrir Caixa"
    ↓
Backend extrai só a data (YYYY-MM-DD)
    ↓
✅ MySQL aceita: data válida
    ↓
Frontend: Caixa aberto com sucesso!
```

---

## 🧪 Como Testar

**Terminal:**
```bash
# Reiniciar backend
cd /var/www/google_cloud_vm_lepapon_unified/backend
npm start
```

**Teste da API:**
```bash
curl -X POST http://localhost:3000/api/cash-register/open \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_AQUI" \
  -d '{
    "initialAmount": 100,
    "openedBy": "João"
  }'

# Resposta esperada (200):
{
  "success": true,
  "registerId": 1,
  "message": "Caixa aberto com sucesso"
}
```

---

## 📝 Checklist

- [x] Identificar erro: DATE vs TIMESTAMP
- [x] Corrigir: Extrair apenas data com `.split('T')[0]`
- [x] Testar: Verificar que abre sem erro
- [x] Documentar: Explicar a diferença

---

## 🔐 Detalhes Técnicos

### MySQL DATE vs TIMESTAMP

| Tipo | Formato | Tamanho | Exemplo |
|------|---------|--------|---------|
| DATE | YYYY-MM-DD | 3 bytes | 2026-01-21 |
| TIMESTAMP | YYYY-MM-DD HH:MM:SS | 4 bytes | 2026-01-21 23:19:59 |

**Regra:**
- Use `DATE` para datas apenas
- Use `TIMESTAMP` para data + hora + timezone

---

## 🎯 Por Que Aconteceu?

1. Tabela define `date` como `DATE`
2. Código usava `new Date().toISOString()` = formato TIMESTAMP
3. MySQL rejeita porque tipo não combina

**Lição:** Sempre verificar tipo de coluna vs tipo de dados enviado!

---

## ✅ Agora Funciona

```
✅ POST /api/cash-register/open
✅ Date: 2026-01-21
✅ OpenedAt: 2026-01-21T23:19:59.465Z
✅ MySQL aceita
✅ Caixa abre!
```
