import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  DollarSign, 
  Filter,
  Download,
  Trash2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { financialService } from '../services/financialService';
import type { Expense } from '../types';

const CATEGORY_LABELS: Record<Expense['category'], string> = {
  salarios: 'Salários',
  aluguel: 'Aluguel',
  energia: 'Energia',
  agua: 'Água',
  gas: 'Gás',
  telefone: 'Telefone/Internet',
  manutencao: 'Manutenção',
  impostos: 'Impostos',
  outros: 'Outros'
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

export const ExpensesManager: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    category: '' as Expense['category'] | '',
    startDate: '',
    endDate: ''
  });

  const [formData, setFormData] = useState<Omit<Expense, 'id' | 'createdAt'>>({
    date: new Date().toISOString().split('T')[0],
    category: 'outros',
    description: '',
    amount: 0,
    paymentMethod: 'dinheiro',
    supplier: '',
    reference: ''
  });

  useEffect(() => {
    loadExpenses();
  }, [filters]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await financialService.getExpenses(filters);
      setExpenses(data);
    } catch (err) {
      console.error('Erro ao carregar despesas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || formData.amount <= 0) {
      alert('Preencha descrição e valor válido');
      return;
    }

    try {
      await financialService.addExpense(formData);
      setShowForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'outros',
        description: '',
        amount: 0,
        paymentMethod: 'dinheiro',
        supplier: '',
        reference: ''
      });
      loadExpenses();
    } catch (err) {
      console.error('Erro ao adicionar despesa:', err);
      alert('Erro ao salvar despesa');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir esta despesa?')) return;
    
    try {
      // TODO: Implementar rota DELETE no backend
      alert('Funcionalidade de exclusão será implementada no backend');
    } catch (err) {
      console.error('Erro ao excluir despesa:', err);
    }
  };

  const categoryTotals = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(categoryTotals).map(([category, amount]) => ({
    name: CATEGORY_LABELS[category as Expense['category']],
    value: amount
  })).sort((a, b) => b.value - a.value);

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciamento de Despesas</h2>
          <p className="text-sm text-gray-600 mt-1">
            Total: <span className="font-bold text-red-600">{financialService.formatCurrency(totalExpenses)}</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Nova Despesa
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-blue-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Registrar Nova Despesa</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Data</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Expense['category'] })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                required
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Descrição</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Conta de luz - Janeiro"
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Valor</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0,00"
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Forma de Pagamento</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
                <option value="transferencia">Transferência</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Fornecedor (opcional)</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Nome do fornecedor"
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Referência (opcional)</label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Nº nota, documento"
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
              />
            </div>

            <div className="col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors"
              >
                Salvar Despesa
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value as any })}
            className="p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
          >
            <option value="">Todas as Categorias</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
            placeholder="Data inicial"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
            placeholder="Data final"
          />
          {(filters.category || filters.startDate || filters.endDate) && (
            <button
              onClick={() => setFilters({ category: '', startDate: '', endDate: '' })}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Gráfico de Categorias */}
      {chartData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Despesas por Categoria</h3>
          <div className="grid grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={100} />
                <YAxis tickFormatter={(value) => financialService.formatCurrency(value)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => financialService.formatCurrency(value)} />
                <Bar dataKey="value" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-2">
              {chartData.map((item, idx) => {
                const percentage = ((item.value / totalExpenses) * 100).toFixed(1);
                return (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-sm font-bold text-gray-700">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">{financialService.formatCurrency(item.value)}</p>
                      <p className="text-xs text-gray-600">{percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Despesas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">Histórico de Despesas ({expenses.length})</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-600">Carregando...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-gray-600">Nenhuma despesa registrada</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3 font-bold text-gray-700 text-sm">Data</th>
                  <th className="text-left p-3 font-bold text-gray-700 text-sm">Categoria</th>
                  <th className="text-left p-3 font-bold text-gray-700 text-sm">Descrição</th>
                  <th className="text-right p-3 font-bold text-gray-700 text-sm">Valor</th>
                  <th className="text-left p-3 font-bold text-gray-700 text-sm">Pagamento</th>
                  <th className="text-left p-3 font-bold text-gray-700 text-sm">Fornecedor</th>
                  <th className="text-center p-3 font-bold text-gray-700 text-sm">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-sm font-medium text-gray-900">
                      {financialService.formatDate(expense.date)}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                        {CATEGORY_LABELS[expense.category]}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-900">{expense.description}</td>
                    <td className="p-3 text-right text-sm font-black text-red-600">
                      {financialService.formatCurrency(expense.amount)}
                    </td>
                    <td className="p-3 text-sm text-gray-600 capitalize">{expense.paymentMethod}</td>
                    <td className="p-3 text-sm text-gray-600">{expense.supplier || '-'}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => expense.id && handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpensesManager;
