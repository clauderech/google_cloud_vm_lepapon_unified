import React, { useState, useMemo } from 'react';
import { TrendingUp, Receipt, AlertTriangle, Users, Sparkles } from 'lucide-react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Product, Sale, Purchase } from '../types';

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  activeComandas: any[];
}

const Dashboard: React.FC<DashboardProps> = ({ products, sales, purchases, activeComandas }) => {
  const [insight, setInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);

  const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
  const totalPurchases = purchases.reduce((acc, p) => acc + p.total, 0);
  const lowStockCount = products.filter(p => p.type === 'insumo' && p.stock <= p.minStock).length;
  const avgTicket = sales.length > 0 ? totalSales / sales.length : 0;
  
  const salesData = useMemo(() => {
    const last7Days = new Array(7).fill(0).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dailyTotal = sales
        .filter(s => s.date.startsWith(date))
        .reduce((acc, s) => acc + s.total, 0);
      return { date: date.slice(5), total: dailyTotal };
    });
  }, [sales]);

  // Top produtos vendidos
  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.quantity * item.unitPrice;
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [sales]);

  // Vendas por categoria
  const salesByCategory = useMemo(() => {
    const categoryData: Record<string, number> = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const category = product?.category || 'Outros';
        categoryData[category] = (categoryData[category] || 0) + (item.quantity * item.unitPrice);
      });
    });

    return Object.entries(categoryData).map(([name, value]) => ({ name, value }));
  }, [sales, products]);

  // Vendas por forma de pagamento
  const paymentMethodData = useMemo(() => {
    const methods: Record<string, number> = { cash: 0, card: 0, pix: 0, credit: 0 };
    
    sales.forEach(sale => {
      methods[sale.paymentMethod] = (methods[sale.paymentMethod] || 0) + sale.total;
    });

    return Object.entries(methods)
      .map(([name, value]) => ({ 
        name: name === 'cash' ? 'Dinheiro' : name === 'card' ? 'Cartão' : name === 'pix' ? 'PIX' : 'Crédito', 
        value 
      }))
      .filter(item => item.value > 0);
  }, [sales]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  const handleGenerateInsight = async () => {
    setLoadingInsight(true);
    try {
      // Dynamic import do gerador de insights
      const { generateBusinessInsight } = await import('../utils/businessInsights');
      const result = await generateBusinessInsight(products, sales, purchases);
      setInsight(result);
    } catch (error) {
      console.error('Erro ao gerar insights:', error);
      setInsight('Erro ao gerar análise. Tente novamente.');
    } finally {
      setLoadingInsight(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Painel de Controle</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white/90 text-sm font-bold">Vendas Totais</h3>
            <TrendingUp className="text-white/90 w-6 h-6" />
          </div>
          <p className="text-3xl font-bold">R$ {totalSales.toFixed(2)}</p>
          <p className="text-xs text-white/80 mt-1 font-medium">{sales.length} transações</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white/90 text-sm font-bold">Ticket Médio</h3>
            <Receipt className="text-white/90 w-6 h-6" />
          </div>
          <p className="text-3xl font-bold">R$ {avgTicket.toFixed(2)}</p>
          <p className="text-xs text-white/80 mt-1 font-medium">Por venda</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white/90 text-sm font-bold">Insumos Críticos</h3>
            <AlertTriangle className="text-white/90 w-6 h-6" />
          </div>
          <p className="text-3xl font-bold">{lowStockCount}</p>
          <p className="text-xs text-white/80 mt-1 font-medium">Abaixo do mínimo</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white/90 text-sm font-bold">Comandas Abertas</h3>
            <Users className="text-white/90 w-6 h-6" />
          </div>
          <p className="text-3xl font-bold">{activeComandas.length}</p>
          <p className="text-xs text-white/80 mt-1 font-medium">Em atendimento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
           <h3 className="text-lg font-bold text-gray-800 mb-4">Vendas da Semana</h3>
           <ResponsiveContainer width="100%" height={250}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#4b5563' }} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value}`} tick={{ fill: '#4b5563' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#000' }} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
           </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Top 5 Produtos Vendidos</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#4b5563', fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value}`} tick={{ fill: '#4b5563' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Vendas por Categoria</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={salesByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {salesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-700" />
            <h3 className="text-lg font-bold text-indigo-900">Consultor IA</h3>
          </div>
          {!insight ? (
            <div className="text-center py-8">
              <p className="text-indigo-800 text-sm mb-4 font-medium">Obtenha insights sobre seu estoque e vendas.</p>
              <button 
                onClick={handleGenerateInsight}
                disabled={loadingInsight}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                {loadingInsight ? "Analisando..." : "Gerar Análise"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-indigo-900 font-medium leading-relaxed whitespace-pre-line bg-white/80 p-4 rounded-lg border border-indigo-200 h-48 overflow-y-auto">
                {insight}
              </div>
              <button onClick={handleGenerateInsight} className="text-xs text-indigo-700 font-bold hover:underline">
                Atualizar Análise
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;