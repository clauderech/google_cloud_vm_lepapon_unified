import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  CreditCard,
  Wallet,
  PiggyBank,
  AlertCircle
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { financialService } from '../services/financialService';
import type { DailyAssets } from '../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export const FinancialDashboard: React.FC = () => {
  const [assets, setAssets] = useState<DailyAssets[]>([]);
  const [todayAssets, setTodayAssets] = useState<DailyAssets | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30>(7);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const range = financialService.getDateRange(period);
      const [assetsData, today] = await Promise.all([
        financialService.getDailyAssets(range.startDate, range.endDate),
        financialService.getTodayAssets()
      ]);
      
      setAssets(assetsData);
      setTodayAssets(today);
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = assets.map(a => ({
    date: financialService.formatDate(a.date).slice(0, 5),
    receitas: a.totalSales,
    despesas: a.totalExpenses,
    lucro: a.netBalance
  })).reverse();

  const paymentMethodsData = todayAssets ? [
    { name: 'Dinheiro', value: todayAssets.salesCash },
    { name: 'Cartão', value: todayAssets.salesCard },
    { name: 'PIX', value: todayAssets.salesPix },
    { name: 'Crédito', value: todayAssets.salesCredit }
  ].filter(d => d.value > 0) : [];

  const totalPeriod = assets.reduce((acc, a) => ({
    sales: acc.sales + a.totalSales,
    expenses: acc.expenses + a.totalExpenses,
    profit: acc.profit + a.netBalance
  }), { sales: 0, expenses: 0, profit: 0 });

  const profitMargin = totalPeriod.sales > 0 
    ? ((totalPeriod.profit / totalPeriod.sales) * 100).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 font-medium">Carregando dados financeiros...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold opacity-90">Receitas ({period}d)</h3>
            <DollarSign className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-3xl font-black">{financialService.formatCurrency(totalPeriod.sales)}</p>
          <p className="text-xs mt-2 opacity-75">{assets.length} dias registrados</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold opacity-90">Despesas ({period}d)</h3>
            <CreditCard className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-3xl font-black">{financialService.formatCurrency(totalPeriod.expenses)}</p>
          <p className="text-xs mt-2 opacity-75">Compras + Operacional</p>
        </div>

        <div className={`bg-gradient-to-br p-6 rounded-xl shadow-lg text-white ${
          totalPeriod.profit >= 0 
            ? 'from-green-500 to-green-600' 
            : 'from-orange-500 to-orange-600'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold opacity-90">Lucro Líquido</h3>
            {totalPeriod.profit >= 0 ? (
              <TrendingUp className="w-6 h-6 opacity-80" />
            ) : (
              <TrendingDown className="w-6 h-6 opacity-80" />
            )}
          </div>
          <p className="text-3xl font-black">{financialService.formatCurrency(totalPeriod.profit)}</p>
          <p className="text-xs mt-2 opacity-75">Margem: {profitMargin}%</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold opacity-90">Saldo Atual</h3>
            <PiggyBank className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-3xl font-black">
            {todayAssets ? financialService.formatCurrency(todayAssets.totalFinal) : 'R$ 0,00'}
          </p>
          <p className="text-xs mt-2 opacity-75">
            Início: {todayAssets ? financialService.formatCurrency(todayAssets.totalInicial) : 'R$ 0,00'}
          </p>
        </div>
      </div>

      {/* Vendas de Hoje */}
      {todayAssets && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Vendas de Hoje</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 font-bold mb-1">Total</p>
                <p className="text-2xl font-black text-blue-900">{financialService.formatCurrency(todayAssets.totalSales)}</p>
                <p className="text-xs text-blue-600 mt-1">{todayAssets.salesCount} vendas</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-700 font-bold mb-1">Ticket Médio</p>
                <p className="text-2xl font-black text-green-900">{financialService.formatCurrency(todayAssets.averageTicket)}</p>
                <p className="text-xs text-green-600 mt-1">{todayAssets.itemsSold} itens</p>
              </div>
              <div className={`text-center p-4 rounded-lg border ${
                todayAssets.netBalance >= 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-xs font-bold mb-1 ${
                  todayAssets.netBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  Balanço Hoje
                </p>
                <p className={`text-2xl font-black ${
                  todayAssets.netBalance >= 0 ? 'text-emerald-900' : 'text-red-900'
                }`}>
                  {financialService.formatCurrency(todayAssets.netBalance)}
                </p>
                <p className={`text-xs mt-1 ${
                  todayAssets.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {todayAssets.netBalance >= 0 ? 'Lucro' : 'Prejuízo'}
                </p>
              </div>
            </div>
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

      {/* Gráfico de Evolução */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Evolução Financeira</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(value: number) => financialService.formatCurrency(value)}
            />
            <Line type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Receitas" />
            <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Despesas" />
            <Line type="monotone" dataKey="lucro" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Lucro" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Alertas */}
      {todayAssets && todayAssets.netBalance < 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900">Atenção: Saldo Negativo Hoje</h4>
              <p className="text-sm text-amber-800 mt-1">
                As despesas superaram as receitas em {financialService.formatCurrency(Math.abs(todayAssets.netBalance))}.
                Revise os custos operacionais e vendas.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;
