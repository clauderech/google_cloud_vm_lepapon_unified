// ============================================
// DICAS PARA OTIMIZAR O APP.TSX (797 kB)
// ============================================

// O arquivo App.tsx está muito grande (1683 linhas) e pode ser dividido.
// Aqui estão as recomendações:

// 1. EXTRAIR COMPONENTES EM ARQUIVOS SEPARADOS
// ============================================

// Criar em components/:
// - DashboardComponent.tsx (Dashboard)
// - POSComponent.tsx (POS - Ponto de Venda)
// - InventoryComponent.tsx (Inventory)
// - ShoppingListComponent.tsx (ShoppingListView)
// - PurchasesComponent.tsx (Purchases)
// - CustomersManagerComponent.tsx (já existe)
// - FinancialComponent.tsx (FinancialDashboard - já existe)

// 2. CÓDIGO PARA REFATORAR

// Exemplo: Extrair Dashboard para arquivo separado
/*
// components/DashboardComponent.tsx
import React from 'react';
import { /* ... imports ... * / } from '../types';

interface DashboardProps {
  state: AppState;
  lowStockCount: number;
  totalRevenue: number;
}

export const DashboardComponent: React.FC<DashboardProps> = ({ state, lowStockCount, totalRevenue }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Dashboard content aqui */}
    </div>
  );
};
*/

// 3. ATUALIZAR APP.TSX PARA USAR COMPONENTES

/*
// Em App.tsx, substituir:
const Dashboard = () => { ... }; // Remover

// Por:
import { DashboardComponent } from './components/DashboardComponent';

// E no render:
{view === 'dashboard' && <DashboardComponent state={state} lowStockCount={lowStockCount} totalRevenue={totalRevenue} />}
*/

// 4. USAR LAZY LOADING PARA COMPONENTES PESADOS

/*
// Em App.tsx, adicionar:
import { lazy, Suspense } from 'react';

const DashboardComponent = lazy(() => import('./components/DashboardComponent'));
const POSComponent = lazy(() => import('./components/POSComponent'));
const InventoryComponent = lazy(() => import('./components/InventoryComponent'));

// No render:
<Suspense fallback={<div>Carregando...</div>}>
  {view === 'dashboard' && <DashboardComponent {...props} />}
</Suspense>
*/

// 5. COMANDO PARA ANALISAR TAMANHO ATUAL

// Instalar:
// npm install --save-dev vite-plugin-visualizer

// Adicionar ao vite.config.ts:
/*
import { visualizer } from 'vite-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true, // Abre o relatório automaticamente
    })
  ]
});
*/

// Depois executar:
// npm run build

// Isso gera um relatório visual de quais arquivos/componentes estão ocupando espaço


// 6. ESTRUTURA RECOMENDADA
// ============================================

/*
frontend/
├── src/
│   ├── App.tsx (apenas lógica principal)
│   ├── components/
│   │   ├── Dashboard.tsx (refatorado)
│   │   ├── POS.tsx (refatorado)
│   │   ├── Inventory.tsx (refatorado)
│   │   ├── ShoppingList.tsx (refatorado)
│   │   ├── Purchases.tsx (refatorado)
│   │   ├── Dashboard/
│   │   │   ├── SalesCard.tsx
│   │   │   ├── StockCard.tsx
│   │   │   └── RevenueChart.tsx
│   │   ├── POS/
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── Cart.tsx
│   │   │   ├── ObservationModal.tsx
│   │   │   └── CommandaList.tsx
│   │   ├── Inventory/
│   │   │   ├── ProductForm.tsx
│   │   │   ├── InsumoTable.tsx
│   │   │   ├── PratoTable.tsx
│   │   │   └── EditModal.tsx
│   │   └── ...outros
│   ├── hooks/
│   │   ├── useAuth.ts (já existe)
│   │   ├── useLepaponOrders.ts (já existe)
│   │   ├── useProducts.ts (novo)
│   │   ├── useCart.ts (novo)
│   │   └── ...outros
│   ├── services/
│   │   ├── storage.ts (já existe)
│   │   ├── financialService.ts (já existe)
│   │   └── ...outros
│   └── types.ts (já existe)
*/

// 7. PRÓXIMOS PASSOS

// 1. Não é URGENTE refatorar agora (o app funciona)
// 2. O aviso é apenas informativo
// 3. Conforme o app crescer, considere:
//    - Extrair componentes principais em arquivos separados
//    - Usar lazy loading para views menos frequentes
//    - Usar code-splitting automático do Vite

// O arquivo vite.config.ts foi melhorado para:
// ✅ Aumentar o limite de aviso para 1MB
// ✅ Separar React e Lucide Icons em chunks distintos
// ✅ Remover console.log em produção
// ✅ Usar terser para melhor minificação

// 8. MONITORAR TAMANHO

// Executar periodicamente:
npm run build

// Observar se o tamanho continua crescendo
// Se passar de 1MB gzipped, considere refatoração mais agressiva
