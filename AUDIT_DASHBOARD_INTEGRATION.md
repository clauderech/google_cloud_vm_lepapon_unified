# 🎨 Guia de Integração - Dashboard de Auditoria

Como integrar o componente `AuditDashboard` em sua aplicação React.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Instalação](#instalação)
3. [Uso Básico](#uso-básico)
4. [Integração em Rotas](#integração-em-rotas)
5. [Personalização](#personalização)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Pré-requisitos

- ✅ React 18+
- ✅ TypeScript
- ✅ Recharts (para gráficos)
- ✅ lucide-react (para ícones)
- ✅ Tailwind CSS (para estilos)

### Instalar dependências

```bash
npm install recharts lucide-react
# Tailwind deve já estar configurado
```

---

## 📦 Instalação

### 1. Copiar componente para seu projeto

Copie o arquivo `frontend/components/AuditDashboard.tsx` para sua pasta de componentes:

```
frontend/
├── components/
│   ├── AuditDashboard.tsx    ← Copiar aqui
│   ├── ProtectedRoute.tsx    (já existe)
│   ├── ErrorDisplay.tsx      (já existe)
│   └── ...
```

### 2. Verificar dependências

Certifique-se de que os componentes necessários existem:

```
✅ ProtectedRoute.tsx
✅ ErrorDisplay.tsx
✅ useAuth hook
✅ useApiError hook
```

---

## 🚀 Uso Básico

### Uso Simples

```tsx
import AuditDashboard from './components/AuditDashboard';

function App() {
  return (
    <div>
      <AuditDashboard />
    </div>
  );
}

export default App;
```

O componente:
- ✅ Valida automaticamente se o usuário é admin
- ✅ Carrega dados de auditoria
- ✅ Exibe 4 abas: Resumo, Logs, Eventos, Estatísticas
- ✅ Fornece filtros interativos
- ✅ Permite exportação em CSV

---

## 🛣️ Integração em Rotas

### React Router v6

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuditDashboard from './components/AuditDashboard';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin" element={<AdminPanel />} />
        
        {/* Auditoria - apenas para admins */}
        <Route path="/admin/audit" element={<AuditDashboard />} />
        <Route path="/admin/audit/:tab" element={<AuditDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### Adicionar ao Menu de Navegação

```tsx
import { useAuth } from './hooks/useAuth';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

function Navigation() {
  const { user, hasPermission } = useAuth();
  
  return (
    <nav>
      {hasPermission('view_audit') && (
        <Link 
          to="/admin/audit" 
          className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-100"
        >
          <Shield className="w-5 h-5" />
          Auditoria
        </Link>
      )}
    </nav>
  );
}
```

---

## 🎨 Personalização

### Alterar Cores do Dashboard

Edite as classes Tailwind no componente:

```tsx
// Antes (azul)
className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"

// Depois (verde)
className="flex items-center gap-2 bg-green-500 hover:bg-green-600"
```

---

### Adicionar Novo Filtro

Para adicionar um filtro customizado, edite o estado de filtros:

```tsx
const [filters, setFilters] = useState({
  action: '',
  endpoint: '',
  status: '',
  startDate: '',
  endDate: '',
  userId: '',  // ← Novo filtro
  minDuration: '' // ← Novo filtro
});
```

E adicione inputs no formulário:

```tsx
<input
  type="text"
  placeholder="Filtrar por usuário..."
  value={filters.userId}
  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
  className="flex-1 px-3 py-2 border rounded"
/>

<input
  type="number"
  placeholder="Min duration (ms)..."
  value={filters.minDuration}
  onChange={(e) => setFilters({ ...filters, minDuration: e.target.value })}
  className="flex-1 px-3 py-2 border rounded"
/>
```

---

### Mudar Tamanho de Cards

```tsx
// Antes (4 colunas)
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">

// Depois (3 colunas)
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">

// Depois (2 colunas)
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

---

### Desabilitar Exportação de CSV

```tsx
<button
  onClick={handleExport}
  disabled={true}  // ← Desabilitado
  className="flex items-center gap-2 bg-green-500 opacity-50 cursor-not-allowed..."
>
  <Download className="w-4 h-4" />
  Exportar CSV (desabilitado)
</button>
```

---

### Mudar Intervalo Padrão de Atualização

```tsx
// Antes (atualiza ao mudar filtro)
useEffect(() => {
  loadData();
}, [filters]);

// Depois (atualiza a cada 30 segundos automaticamente)
useEffect(() => {
  loadData();
  const interval = setInterval(loadData, 30000); // 30 segundos
  return () => clearInterval(interval);
}, [filters]);
```

---

## 🔌 Integração com Outros Componentes

### Mostrar Auditoria em Modal

```tsx
import { useState } from 'react';
import AuditDashboard from './components/AuditDashboard';

function AdminPanel() {
  const [showAudit, setShowAudit] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowAudit(true)}>
        Abrir Auditoria
      </button>
      
      {showAudit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-11/12 h-5/6 overflow-auto">
            <button
              onClick={() => setShowAudit(false)}
              className="sticky top-0 right-0 p-4 text-lg font-bold"
            >
              ✕ Fechar
            </button>
            <AuditDashboard />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Incorporar em Dashboard Existente

```tsx
import { useState } from 'react';
import AuditDashboard from './components/AuditDashboard';

function Dashboard() {
  const [showAudit, setShowAudit] = useState(false);
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2">
        {/* Conteúdo principal */}
      </div>
      
      <div className="bg-white rounded shadow p-4">
        <button 
          onClick={() => setShowAudit(!showAudit)}
          className="w-full bg-blue-500 text-white py-2 rounded"
        >
          {showAudit ? 'Esconder' : 'Mostrar'} Auditoria
        </button>
        
        {showAudit && <AuditDashboard />}
      </div>
    </div>
  );
}
```

---

## 📊 APIs Utilizadas

O componente utiliza estas rotas de API:

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/audit/logs` | GET | Lista logs com filtros |
| `/api/audit/stats` | GET | Estatísticas por período |
| `/api/audit/events` | GET | Eventos de segurança |
| `/api/audit/summary` | GET | Resumo geral |
| `/api/audit/export` | GET | Exportar em CSV |
| `/api/audit/cleanup` | POST | Limpar logs antigos |

Se precisar mudar a base URL:

```tsx
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const loadData = async () => {
  const response = await fetch(`${BASE_URL}/api/audit/logs`, ...);
};
```

---

## 🎯 Funcionalidades do Dashboard

### Aba "Resumo" 📊

Mostra:
- Total de requisições
- Requisições falhadas
- Usuários ativos
- Incidentes de segurança
- Usuários mais ativos
- Endpoints mais acessados
- Atividade recente (tabela)

---

### Aba "Logs" 📋

Mostra:
- Tabela de todos os logs
- Filtros por: ação, endpoint, status
- Coluna "Duration (ms)"
- Status HTTP colorido
- Timestamp formatado

---

### Aba "Eventos" ⚠️

Mostra:
- Eventos de segurança (401, 403)
- IP address do cliente
- User agent (navegador)
- Tipo de evento
- Timeline de ocorrências

---

### Aba "Estatísticas" 📈

Mostra:
- Gráfico de barras: Ações mais comuns
- Gráfico de pizza: Distribuição de status
- Seletor de período (24h, 7d, 30d)
- Agregação por ação, usuário, role

---

## 🐛 Troubleshooting

### Problema: "Cannot find module 'recharts'"

Solução:
```bash
npm install recharts
```

---

### Problema: Componente não carrega dados

Verifique:
1. API backend está rodando? (`http://localhost:3000`)
2. Token de admin é válido?
3. Middleware de auditoria está ativo em `app.js`?
4. Tabelas de auditoria foram criadas? (`npx knex migrate:latest`)

---

### Problema: "403 Forbidden" ao acessar audit

Causa: Usuário não é admin

Solução: Usar token de admin ou alterar permissões em `routes/audit.js`

```tsx
// Para permitir operador também
const auditRouter = express.Router();
auditRouter.use(requireAuth); // Ao invés de requireAdmin
```

---

### Problema: Gráficos não aparecem

Verifique:
1. Recharts está instalado?
2. ResponsiveContainer tem altura? (height={300})
3. Dados estão sendo carregados?

Adicione console.log para debug:

```tsx
useEffect(() => {
  console.log('Stats carregadas:', stats);
  loadData();
}, []);
```

---

### Problema: Exportação CSV não funciona

Verifique:
1. Endpoint `/api/audit/export` existe?
2. Token de admin é válido?
3. Navegador permite download?

Teste manualmente:
```bash
curl -X GET "http://localhost:3000/api/audit/export" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  > test.csv
```

---

## ✅ Checklist de Integração

- [ ] Componente `AuditDashboard.tsx` copiado
- [ ] Dependências instaladas (recharts, lucide-react)
- [ ] API backend rodando em http://localhost:3000
- [ ] Token de admin obtido
- [ ] Rota `/admin/audit` criada em React Router
- [ ] Menu de navegação atualizado
- [ ] Testado acesso com usuário admin
- [ ] Verificado se dados aparecem
- [ ] Testado filtros
- [ ] Testado exportação CSV
- [ ] Testado acesso negado com operador

---

## 🎊 Conclusão

O AuditDashboard está pronto para usar! 

Se encontrar problemas:
1. Verifique os logs do backend: `tail -f backend/logs/app.log`
2. Verifique o console do navegador: F12 → Console
3. Teste APIs manualmente com curl
4. Consulte [TEST_COMMANDS_PHASE5.md](TEST_COMMANDS_PHASE5.md)

**Bom monitoramento! 🚀**
