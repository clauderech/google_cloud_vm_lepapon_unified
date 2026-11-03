import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard,
  PiggyBank,
  AlertCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { financialService } from '../services/financialService';
import type { FinancialDashboardData } from '../services/financialService';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export const FinancialDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<FinancialDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<7 | 30>(7);

  useEffect(() => {
    void loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      setDashboard(await financialService.getFinancialDashboard(period));
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const formatDay = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };
  const chartData = dashboard?.daily.map(day => ({
    date: formatDay(day.date),
    receitas: day.totalSales,
    compras: day.totalPurchases,
    saldo: day.netBalance
  })) || [];

  const paymentMethodsData = dashboard ? [
    { name: 'Dinheiro', value: dashboard.today.salesCash },
    { name: 'Cartão', value: dashboard.today.salesCard },
    { name: 'PIX', value: dashboard.today.salesPix },
    { name: 'Crédito', value: dashboard.today.salesCredit }
  ].filter(d => d.value > 0) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 font-medium">Carregando dados financeiros...</div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
          <p className="font-bold">Não foi possível carregar o financeiro.</p>
          <p className="mt-1 text-sm">{error || 'A API não retornou dados financeiros.'}</p>
          <button onClick={() => void loadData()} className="mt-4 rounded-lg bg-red-700 px-4 py-2 font-bold text-white hover:bg-red-800">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const periodSales = dashboard.period.totalSales;
  const periodPurchases = dashboard.period.totalPurchases;
  const periodBalance = dashboard.period.netBalance;
  const cashRegister = dashboard.cashRegister;

  return (
    <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Financeiro</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod(7)}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${
              period === 7 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            7 dias
          </button>
          <button
            onClick={() => setPeriod(30)}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${
              period === 30 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            30 dias
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold opacity-90">Receitas ({period}d)</h3>
            <DollarSign className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-3xl font-black">{financialService.formatCurrency(periodSales)}</p>
          <p className="text-xs mt-2 opacity-75">{dashboard.period.salesCount} vendas e compras a prazo</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold opacity-90">Compras de estoque ({period}d)</h3>
            <CreditCard className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-3xl font-black">{financialService.formatCurrency(periodPurchases)}</p>
          <p className="text-xs mt-2 opacity-75">Despesas operacionais não cadastradas no sistema</p>
        </div>

        <div className={`bg-gradient-to-br p-6 rounded-xl shadow-lg text-white ${
          periodBalance >= 0
            ? 'from-green-500 to-green-600' 
            : 'from-orange-500 to-orange-600'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold opacity-90">Vendas menos compras</h3>
            {periodBalance >= 0 ? (
              <TrendingUp className="w-6 h-6 opacity-80" />
            ) : (
              <TrendingDown className="w-6 h-6 opacity-80" />
            )}
          </div>
          <p className="text-3xl font-black">{financialService.formatCurrency(periodBalance)}</p>
          <p className="text-xs mt-2 opacity-75">Não representa lucro líquido</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold opacity-90">Saldo esperado em caixa</h3>
            <PiggyBank className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-3xl font-black">
            {cashRegister ? financialService.formatCurrency(cashRegister.expectedAmount) : 'Caixa fechado'}
          </p>
          <p className="text-xs mt-2 opacity-75">
            {cashRegister ? `Abertura: ${financialService.formatCurrency(cashRegister.initialAmount)}` : 'Abra o caixa para acompanhar o saldo'}
          </p>
        </div>
      </div>

      {/* Vendas de Hoje */}
      {dashboard.today && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Vendas de Hoje</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 font-bold mb-1">Total</p>
                <p className="text-2xl font-black text-blue-900">{financialService.formatCurrency(dashboard.today.totalSales)}</p>
                <p className="text-xs text-blue-600 mt-1">{dashboard.today.salesCount} vendas</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-700 font-bold mb-1">Ticket Médio</p>
                <p className="text-2xl font-black text-green-900">{financialService.formatCurrency(dashboard.today.averageTicket)}</p>
                <p className="text-xs text-green-600 mt-1">{dashboard.today.itemsSold} itens vendidos</p>
              </div>
              <div className={`text-center p-4 rounded-lg border ${
                dashboard.today.netBalance >= 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-xs font-bold mb-1 ${
                  dashboard.today.netBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  Balanço Hoje
                </p>
                <p className={`text-2xl font-black ${
                  dashboard.today.netBalance >= 0 ? 'text-emerald-900' : 'text-red-900'
                }`}>
                  {financialService.formatCurrency(dashboard.today.netBalance)}
                </p>
                <p className={`text-xs mt-1 ${
                  dashboard.today.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  Vendas menos compras de estoque
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">O saldo diário não inclui despesas operacionais, pois não há fonte de despesas disponível nesta instalação.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Formas de Pagamento</h3>
            {paymentMethodsData.length > 0 ? (
              <div className="space-y-3">
                {paymentMethodsData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[idx] }}
                      />
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {financialService.formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 text-sm py-8">Nenhuma venda hoje</p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-gray-800">Recebimentos de crediário</h3>
            <p className="text-xs text-gray-500">Valores recebidos no período selecionado, sem somá-los novamente às vendas.</p>
          </div>
          <p className="text-xl font-black text-emerald-700">{financialService.formatCurrency(dashboard.period.receiptsTotal)}</p>
        </div>
      </div>

      {/* Gráfico de Evolução */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Vendas, compras de estoque e saldo diário</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(value: any) => typeof value === 'number' ? financialService.formatCurrency(value) : ''}
            />
            <Line type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Receitas" />
            <Line type="monotone" dataKey="compras" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Compras de estoque" />
            <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Vendas menos compras" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Alertas */}
      {dashboard.today.netBalance < 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900">Atenção: Saldo Negativo Hoje</h4>
              <p className="text-sm text-amber-800 mt-1">
                As compras de estoque superaram as vendas em {financialService.formatCurrency(Math.abs(dashboard.today.netBalance))}.
                Esse cálculo não inclui despesas operacionais.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;
