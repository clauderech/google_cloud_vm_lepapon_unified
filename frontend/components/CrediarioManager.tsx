import React, { useState, useEffect } from 'react';
import {
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  FileText,
  Plus,
  Search,
  X,
  Eye,
  Check,
  ShoppingCart
} from 'lucide-react';

interface CrediarioManagerProps {
  customers: any[];
}

interface MonthlyAccount {
  id: number;
  customer_id: string;
  customer_name?: string;
  customer_nome?: string;
  customer_sobrenome?: string;
  customer_fone?: string;
  month_year: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  due_date?: string;
  status: 'open' | 'closed' | 'paid' | 'overdue';
  late_fee: number;
  interest: number;
  payment_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  purchases?: Purchase[];
  payments?: Payment[];
}

interface Purchase {
  id: number;
  monthly_account_id: number;
  sale_id?: string;
  purchase_date: string;
  description: string;
  amount: number;
  items_json?: string;
  created_at?: string;
}

interface Payment {
  id: number;
  monthly_account_id: number;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'pix' | 'transfer';
  receipt_number?: string;
  received_by?: string;
  notes?: string;
  created_at?: string;
}

interface Dashboard {
  activeAccounts: number;
  totalToReceive: number;
  overdueAccounts: number;
  overdueAmount: number;
  currentMonthAccounts: number;
}

const CrediarioManager: React.FC<CrediarioManagerProps> = ({ customers }) => {
  const [accounts, setAccounts] = useState<MonthlyAccount[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<MonthlyAccount | null>(null);
  const [showCloseMonthModal, setShowCloseMonthModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [closeMonthData, setCloseMonthData] = useState({ due_date: '', notes: '' });
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'cash' as 'cash' | 'card' | 'pix' | 'transfer',
    receipt_number: '',
    received_by: '',
    notes: ''
  });

  useEffect(() => {
    loadDashboard();
    loadAccounts();
  }, [filterStatus]);

  const loadDashboard = async () => {
    try {
      const response = await fetch('/api/monthly-account/dashboard');
      const result = await response.json();
      if (result.success) {
        setDashboard(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const url = filterStatus === 'all' 
        ? '/api/monthly-account' 
        : `/api/monthly-account?status=${filterStatus}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setAccounts(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  };

  const loadAccountDetails = async (accountId: number) => {
    try {
      const response = await fetch(`/api/monthly-account/${accountId}`);
      const result = await response.json();
      if (result.success) {
        setSelectedAccount(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    }
  };

  const handleCloseMonth = async () => {
    if (!selectedAccount || !closeMonthData.due_date) {
      alert('Data de vencimento é obrigatória');
      return;
    }

    try {
      const response = await fetch(`/api/monthly-account/${selectedAccount.id}/close-month`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(closeMonthData)
      });

      const result = await response.json();
      if (result.success) {
        alert('Mês fechado! Boleto gerado com sucesso.');
        setShowCloseMonthModal(false);
        setCloseMonthData({ due_date: '', notes: '' });
        loadAccounts();
        loadDashboard();
        if (selectedAccount) {
          loadAccountDetails(selectedAccount.id);
        }
      } else {
        alert(result.error || 'Erro ao fechar mês');
      }
    } catch (error) {
      console.error('Erro ao fechar mês:', error);
      alert('Erro ao fechar mês');
    }
  };

  const handlePayment = async () => {
    if (!selectedAccount || paymentData.amount <= 0) {
      alert('Informe o valor do pagamento');
      return;
    }

    try {
      const response = await fetch(`/api/monthly-account/${selectedAccount.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();
      if (result.success) {
        alert('Pagamento registrado com sucesso!');
        setShowPaymentModal(false);
        setPaymentData({
          amount: 0,
          payment_method: 'cash',
          receipt_number: '',
          received_by: '',
          notes: ''
        });
        loadAccounts();
        loadDashboard();
        if (selectedAccount) {
          loadAccountDetails(selectedAccount.id);
        }
      } else {
        alert(result.error || 'Erro ao registrar pagamento');
      }
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      alert('Erro ao registrar pagamento');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'EM ABERTO';
      case 'closed': return 'FECHADO';
      case 'paid': return 'PAGO';
      case 'overdue': return 'VENCIDO';
      default: return status.toUpperCase();
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const customerName = acc.customer_name || `${acc.customer_nome} ${acc.customer_sobrenome || ''}`.trim();
    return customerName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]}/${year}`;
  };

  // Obter próxima data de vencimento padrão (dia 5 do próximo mês)
  const getDefaultDueDate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 5);
    return nextMonth.toISOString().split('T')[0];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="text-blue-600" /> Crediário Mensal (Caderno)
        </h2>
        <div className="text-sm text-gray-600">
          <span className="font-bold">Sistema de fiado mensal</span> - Cliente compra durante o mês e paga no final
        </div>
      </div>

      {/* Statistics Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white/90">Contas Ativas</span>
              <Users className="w-4 h-4 text-white/90" />
            </div>
            <p className="text-2xl font-black">{dashboard.activeAccounts}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white/90">Mês Atual</span>
              <Calendar className="w-4 h-4 text-white/90" />
            </div>
            <p className="text-2xl font-black">{dashboard.currentMonthAccounts}</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white/90">Vencidos</span>
              <AlertTriangle className="w-4 h-4 text-white/90" />
            </div>
            <p className="text-2xl font-black">{dashboard.overdueAccounts}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white/90">A Receber</span>
              <TrendingUp className="w-4 h-4 text-white/90" />
            </div>
            <p className="text-xl font-black">R$ {dashboard.totalToReceive.toFixed(2)}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white/90">Em Atraso</span>
              <Clock className="w-4 h-4 text-white/90" />
            </div>
            <p className="text-xl font-black">R$ {dashboard.overdueAmount.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-bold text-sm ${filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('open')}
              className={`px-4 py-2 rounded-lg font-bold text-sm ${filterStatus === 'open' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Em Aberto
            </button>
            <button
              onClick={() => setFilterStatus('closed')}
              className={`px-4 py-2 rounded-lg font-bold text-sm ${filterStatus === 'closed' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Fechados
            </button>
            <button
              onClick={() => setFilterStatus('overdue')}
              className={`px-4 py-2 rounded-lg font-bold text-sm ${filterStatus === 'overdue' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Vencidos
            </button>
            <button
              onClick={() => setFilterStatus('paid')}
              className={`px-4 py-2 rounded-lg font-bold text-sm ${filterStatus === 'paid' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Pagos
            </button>
          </div>

          <div className="flex-1 relative min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="w-full pl-10 pr-4 py-2 border border-gray-400 rounded-lg text-black bg-white placeholder-gray-600"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left font-bold text-gray-900 text-sm">Cliente</th>
              <th className="p-3 text-center font-bold text-gray-900 text-sm">Mês/Ano</th>
              <th className="p-3 text-right font-bold text-gray-900 text-sm">Total</th>
              <th className="p-3 text-right font-bold text-gray-900 text-sm">Pago</th>
              <th className="p-3 text-right font-bold text-gray-900 text-sm">Saldo</th>
              <th className="p-3 text-center font-bold text-gray-900 text-sm">Vencimento</th>
              <th className="p-3 text-center font-bold text-gray-900 text-sm">Status</th>
              <th className="p-3 text-center font-bold text-gray-900 text-sm">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAccounts.map(acc => {
              const customerName = acc.customer_name || `${acc.customer_nome} ${acc.customer_sobrenome || ''}`.trim();
              return (
                <tr key={acc.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div>
                      <p className="font-bold text-gray-900">{customerName}</p>
                      {acc.customer_fone && <p className="text-xs text-gray-600">{acc.customer_fone}</p>}
                    </div>
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-gray-900">
                    {formatMonthYear(acc.month_year)}
                  </td>
                  <td className="p-3 text-right font-bold text-gray-900">R$ {acc.total_amount.toFixed(2)}</td>
                  <td className="p-3 text-right text-green-700 font-bold">R$ {acc.amount_paid.toFixed(2)}</td>
                  <td className="p-3 text-right text-red-700 font-bold">R$ {acc.balance.toFixed(2)}</td>
                  <td className="p-3 text-center text-sm text-gray-900">
                    {acc.due_date ? new Date(acc.due_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(acc.status)}`}>
                      {getStatusLabel(acc.status)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => loadAccountDetails(acc.id)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredAccounts.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  Nenhuma conta encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Account Details Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 my-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedAccount.customer_name || `${selectedAccount.customer_nome} ${selectedAccount.customer_sobrenome || ''}`.trim()}
                </h3>
                <p className="text-sm text-gray-600">
                  {formatMonthYear(selectedAccount.month_year)} - 
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${getStatusColor(selectedAccount.status)}`}>
                    {getStatusLabel(selectedAccount.status)}
                  </span>
                </p>
              </div>
              <button onClick={() => setSelectedAccount(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-xs text-blue-700 font-bold mb-1">Total do Mês</p>
                <p className="text-2xl font-black text-blue-900">R$ {selectedAccount.total_amount.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-xs text-green-700 font-bold mb-1">Já Pago</p>
                <p className="text-2xl font-black text-green-900">R$ {selectedAccount.amount_paid.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-xs text-red-700 font-bold mb-1">Saldo Devedor</p>
                <p className="text-2xl font-black text-red-900">R$ {selectedAccount.balance.toFixed(2)}</p>
              </div>
            </div>

            {selectedAccount.due_date && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-lg mb-6">
                <p className="text-sm text-yellow-900">
                  <strong>Vencimento:</strong> {new Date(selectedAccount.due_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}

            {/* Purchases */}
            <div className="mb-6">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Compras do Mês ({selectedAccount.purchases?.length || 0})
              </h4>
              <div className="bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                {selectedAccount.purchases && selectedAccount.purchases.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-200 sticky top-0">
                      <tr>
                        <th className="p-2 text-left font-bold text-gray-900">Data</th>
                        <th className="p-2 text-left font-bold text-gray-900">Descrição</th>
                        <th className="p-2 text-right font-bold text-gray-900">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedAccount.purchases.map(purchase => (
                        <tr key={purchase.id} className="hover:bg-white">
                          <td className="p-2 text-gray-900">{new Date(purchase.purchase_date).toLocaleDateString()}</td>
                          <td className="p-2 text-gray-900">{purchase.description}</td>
                          <td className="p-2 text-right font-bold text-gray-900">R$ {purchase.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-4 text-center text-gray-500">Nenhuma compra registrada</p>
                )}
              </div>
            </div>

            {/* Payments */}
            <div className="mb-6">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Pagamentos ({selectedAccount.payments?.length || 0})
              </h4>
              <div className="bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                {selectedAccount.payments && selectedAccount.payments.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-200 sticky top-0">
                      <tr>
                        <th className="p-2 text-left font-bold text-gray-900">Data</th>
                        <th className="p-2 text-left font-bold text-gray-900">Forma</th>
                        <th className="p-2 text-right font-bold text-gray-900">Valor</th>
                        <th className="p-2 text-left font-bold text-gray-900">Recibo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedAccount.payments.map(payment => (
                        <tr key={payment.id} className="hover:bg-white">
                          <td className="p-2 text-gray-900">{new Date(payment.payment_date).toLocaleDateString()}</td>
                          <td className="p-2 text-gray-900">{payment.payment_method.toUpperCase()}</td>
                          <td className="p-2 text-right font-bold text-green-700">R$ {payment.amount.toFixed(2)}</td>
                          <td className="p-2 text-gray-700">{payment.receipt_number || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-4 text-center text-gray-500">Nenhum pagamento registrado</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              {selectedAccount.status === 'open' && selectedAccount.balance > 0 && (
                <button
                  onClick={() => {
                    setCloseMonthData({ due_date: getDefaultDueDate(), notes: '' });
                    setShowCloseMonthModal(true);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Fechar Mês e Gerar Boleto
                </button>
              )}
              
              {(selectedAccount.status === 'closed' || selectedAccount.status === 'overdue') && selectedAccount.balance > 0 && (
                <button
                  onClick={() => {
                    setPaymentData({ ...paymentData, amount: selectedAccount.balance });
                    setShowPaymentModal(true);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-4 h-4" /> Registrar Pagamento
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Close Month Modal */}
      {showCloseMonthModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Fechar Mês</h3>
              <button onClick={() => setShowCloseMonthModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-900 mb-1">
                Cliente: <strong>{selectedAccount.customer_name || `${selectedAccount.customer_nome} ${selectedAccount.customer_sobrenome || ''}`.trim()}</strong>
              </p>
              <p className="text-sm text-blue-900 mb-1">
                Mês: <strong>{formatMonthYear(selectedAccount.month_year)}</strong>
              </p>
              <p className="text-lg font-black text-blue-900">
                Total: R$ {selectedAccount.balance.toFixed(2)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Data de Vencimento *</label>
                <input
                  type="date"
                  className="w-full border border-gray-400 p-3 rounded-lg text-black bg-white"
                  value={closeMonthData.due_date}
                  onChange={e => setCloseMonthData({ ...closeMonthData, due_date: e.target.value })}
                />
                <p className="text-xs text-gray-600 mt-1">Sugestão: dia 5 do próximo mês</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Observações</label>
                <textarea
                  className="w-full border border-gray-400 p-3 rounded-lg text-black bg-white"
                  rows={3}
                  value={closeMonthData.notes}
                  onChange={e => setCloseMonthData({ ...closeMonthData, notes: e.target.value })}
                  placeholder="Observações opcionais..."
                />
              </div>

              <button
                onClick={handleCloseMonth}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold"
              >
                Confirmar e Gerar Boleto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Registrar Pagamento</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-green-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-green-900 mb-1">
                Cliente: <strong>{selectedAccount.customer_name || `${selectedAccount.customer_nome} ${selectedAccount.customer_sobrenome || ''}`.trim()}</strong>
              </p>
              <p className="text-sm text-green-900 mb-1">
                Mês: <strong>{formatMonthYear(selectedAccount.month_year)}</strong>
              </p>
              <p className="text-lg font-black text-green-900">
                Saldo: R$ {selectedAccount.balance.toFixed(2)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Valor do Pagamento *</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-400 p-3 rounded-lg text-black bg-white"
                  value={paymentData.amount}
                  onChange={e => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Forma de Pagamento *</label>
                <select
                  className="w-full border border-gray-400 p-3 rounded-lg text-black bg-white"
                  value={paymentData.payment_method}
                  onChange={e => setPaymentData({ ...paymentData, payment_method: e.target.value as any })}
                >
                  <option value="cash">Dinheiro</option>
                  <option value="card">Cartão</option>
                  <option value="pix">PIX</option>
                  <option value="transfer">Transferência</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nº Recibo</label>
                <input
                  type="text"
                  className="w-full border border-gray-400 p-3 rounded-lg text-black bg-white"
                  value={paymentData.receipt_number}
                  onChange={e => setPaymentData({ ...paymentData, receipt_number: e.target.value })}
                  placeholder="Ex: REC-001"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Recebido por</label>
                <input
                  type="text"
                  className="w-full border border-gray-400 p-3 rounded-lg text-black bg-white"
                  value={paymentData.received_by}
                  onChange={e => setPaymentData({ ...paymentData, received_by: e.target.value })}
                  placeholder="Nome do atendente"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Observações</label>
                <textarea
                  className="w-full border border-gray-400 p-3 rounded-lg text-black bg-white"
                  rows={2}
                  value={paymentData.notes}
                  onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="Observações opcionais..."
                />
              </div>

              <button
                onClick={handlePayment}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrediarioManager;
