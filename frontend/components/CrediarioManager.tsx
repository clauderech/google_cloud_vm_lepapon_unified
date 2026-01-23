import React, { useState, useEffect } from 'react';
import {
  CreditCard,
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
  Ban
} from 'lucide-react';

interface CrediarioManagerProps {
  customers: any[];
}

interface CrediarioData {
  id: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  installments_total: number;
  installments_paid: number;
  next_due_date?: string;
  overdue_installments: number;
  overdue_amount: number;
  status: 'active' | 'paid' | 'overdue' | 'cancelled';
  payment_progress_percent: number;
}

interface InstallmentData {
  id: number;
  installment_number: number;
  due_date: string;
  amount: number;
  amount_paid: number;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  late_days: number;
  late_fee: number;
  interest: number;
}

const CrediarioManager: React.FC<CrediarioManagerProps> = ({ customers }) => {
  const [crediarios, setCrediarios] = useState<CrediarioData[]>([]);
  const [upcomingInstallments, setUpcomingInstallments] = useState<any[]>([]);
  const [selectedCrediario, setSelectedCrediario] = useState<any | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentData | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Novo Crediário Form
  const [newCrediario, setNewCrediario] = useState({
    customerId: '',
    totalAmount: 0,
    installments: 1,
    firstDueDate: '',
    interestRate: 0
  });

  // Pagamento Form
  const [payment, setPayment] = useState({
    amount: 0,
    paymentMethod: 'cash' as 'cash' | 'card' | 'pix' | 'transfer',
    receivedBy: '',
    receiptNumber: ''
  });

  useEffect(() => {
    loadCrediarios();
    loadUpcomingInstallments();
  }, [filterStatus]);

  const loadCrediarios = async () => {
    try {
      const url = filterStatus === 'all' 
        ? '/api/crediario' 
        : `/api/crediario?status=${filterStatus}`;
      const response = await fetch(url);
      const data = await response.json();
      setCrediarios(data);
    } catch (error) {
      console.error('Erro ao carregar crediários:', error);
    }
  };

  const loadUpcomingInstallments = async () => {
    try {
      const response = await fetch('/api/crediario/upcoming-installments');
      const data = await response.json();
      setUpcomingInstallments(data);
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error);
    }
  };

  const handleCreateCrediario = async () => {
    if (!newCrediario.customerId || newCrediario.totalAmount <= 0 || newCrediario.installments < 1) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const response = await fetch('/api/crediario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: newCrediario.customerId,
          totalAmount: newCrediario.totalAmount,
          installments: newCrediario.installments,
          firstDueDate: newCrediario.firstDueDate,
          interestRate: newCrediario.interestRate,
          createdBy: 'admin' // TODO: pegar do contexto de auth
        })
      });

      if (response.ok) {
        alert('Crediário criado com sucesso!');
        setShowNewForm(false);
        setNewCrediario({ customerId: '', totalAmount: 0, installments: 1, firstDueDate: '', interestRate: 0 });
        loadCrediarios();
      }
    } catch (error) {
      console.error('Erro ao criar crediário:', error);
      alert('Erro ao criar crediário');
    }
  };

  const handleViewDetails = async (crediarioId: string) => {
    try {
      const response = await fetch(`/api/crediario/${crediarioId}`);
      const data = await response.json();
      setSelectedCrediario(data);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    }
  };

  const handlePayInstallment = async () => {
    if (!selectedInstallment || payment.amount <= 0) {
      alert('Informe o valor do pagamento');
      return;
    }

    try {
      const response = await fetch('/api/crediario/pay-installment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installmentId: selectedInstallment.id,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          receivedBy: payment.receivedBy,
          receiptNumber: payment.receiptNumber
        })
      });

      if (response.ok) {
        alert('Pagamento registrado com sucesso!');
        setShowPaymentModal(false);
        setPayment({ amount: 0, paymentMethod: 'cash', receivedBy: '', receiptNumber: '' });
        loadCrediarios();
        if (selectedCrediario) {
          handleViewDetails(selectedCrediario.crediario.id);
        }
      }
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      alert('Erro ao registrar pagamento');
    }
  };

  const handleCancelCrediario = async (id: string) => {
    if (!confirm('Deseja realmente cancelar este crediário?')) return;

    try {
      const response = await fetch(`/api/crediario/${id}/cancel`, {
        method: 'PUT'
      });

      if (response.ok) {
        alert('Crediário cancelado');
        loadCrediarios();
        setSelectedCrediario(null);
      }
    } catch (error) {
      console.error('Erro ao cancelar:', error);
    }
  };

  const filteredCrediarios = crediarios.filter(c => 
    c.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: crediarios.length,
    active: crediarios.filter(c => c.status === 'active').length,
    overdue: crediarios.filter(c => c.status === 'overdue').length,
    totalReceivable: crediarios.reduce((sum, c) => sum + c.amount_remaining, 0),
    totalOverdue: crediarios.reduce((sum, c) => sum + c.overdue_amount, 0)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'VENCIDA': return 'text-red-700 font-bold';
      case 'VENCE HOJE': return 'text-orange-700 font-bold';
      case 'VENCE EM BREVE': return 'text-yellow-700 font-bold';
      default: return 'text-gray-700';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="text-blue-600" /> Gestão de Crediário
        </h2>
        <button
          onClick={() => setShowNewForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold"
        >
          <Plus className="w-4 h-4" /> Novo Crediário
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white/90">Total Crediários</span>
            <Users className="w-4 h-4 text-white/90" />
          </div>
          <p className="text-2xl font-black">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white/90">Ativos</span>
            <CheckCircle className="w-4 h-4 text-white/90" />
          </div>
          <p className="text-2xl font-black">{stats.active}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white/90">Vencidos</span>
            <AlertTriangle className="w-4 h-4 text-white/90" />
          </div>
          <p className="text-2xl font-black">{stats.overdue}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white/90">A Receber</span>
            <DollarSign className="w-4 h-4 text-white/90" />
          </div>
          <p className="text-xl font-black">R$ {typeof stats.totalReceivable === 'number' ? stats.totalReceivable.toFixed(2) : '0.00'}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white/90">Atrasado</span>
            <Clock className="w-4 h-4 text-white/90" />
          </div>
          <p className="text-xl font-black">R$ {typeof stats.totalOverdue === 'number' ? stats.totalOverdue.toFixed(2) : '0.00'}</p>
        </div>
      </div>

      {/* Upcoming Installments Alert */}
      {upcomingInstallments.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-amber-700" />
            <h3 className="font-bold text-amber-900">Parcelas Próximas do Vencimento</h3>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {upcomingInstallments.slice(0, 5).map(inst => (
              <div key={inst.id} className="flex justify-between items-center text-sm bg-white p-2 rounded">
                <span className="font-medium text-gray-900">{inst.customer_name}</span>
                <span className={getUrgencyColor(inst.urgency_level)}>{inst.urgency_level}</span>
                <span className="text-gray-700">R$ {inst.amount_remaining.toFixed(2)}</span>
                <span className="text-gray-600">{new Date(inst.due_date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-bold text-sm ${filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2 rounded-lg font-bold text-sm ${filterStatus === 'active' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Ativos
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

          <div className="flex-1 relative">
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

      {/* Crediários List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left font-bold text-gray-900 text-sm">Cliente</th>
              <th className="p-3 text-right font-bold text-gray-900 text-sm">Valor Total</th>
              <th className="p-3 text-right font-bold text-gray-900 text-sm">Pago</th>
              <th className="p-3 text-right font-bold text-gray-900 text-sm">Restante</th>
              <th className="p-3 text-center font-bold text-gray-900 text-sm">Parcelas</th>
              <th className="p-3 text-center font-bold text-gray-900 text-sm">Progresso</th>
              <th className="p-3 text-center font-bold text-gray-900 text-sm">Status</th>
              <th className="p-3 text-center font-bold text-gray-900 text-sm">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCrediarios.map(cred => (
              <tr key={cred.id} className="hover:bg-gray-50">
                <td className="p-3">
                  <div>
                    <p className="font-bold text-gray-900">{cred.customer_name}</p>
                    {cred.customer_phone && <p className="text-xs text-gray-600">{cred.customer_phone}</p>}
                  </div>
                </td>
                <td className="p-3 text-right font-bold text-gray-900">R$ {cred.total_amount.toFixed(2)}</td>
                <td className="p-3 text-right text-green-700 font-bold">R$ {cred.amount_paid.toFixed(2)}</td>
                <td className="p-3 text-right text-red-700 font-bold">R$ {cred.amount_remaining.toFixed(2)}</td>
                <td className="p-3 text-center">
                  <span className="font-mono font-bold text-gray-900">
                    {cred.installments_paid}/{cred.installments_total}
                  </span>
                </td>
                <td className="p-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${cred.payment_progress_percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-center mt-1 text-gray-700 font-bold">{cred.payment_progress_percent.toFixed(0)}%</p>
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(cred.status)}`}>
                    {cred.status === 'active' ? 'ATIVO' : cred.status === 'overdue' ? 'VENCIDO' : cred.status === 'paid' ? 'PAGO' : 'CANCELADO'}
                  </span>
                  {cred.overdue_installments > 0 && (
                    <p className="text-xs text-red-600 font-bold mt-1">{cred.overdue_installments} atrasadas</p>
                  )}
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => handleViewDetails(cred.id)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Ver detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Crediario Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Novo Crediário</h3>
              <button onClick={() => setShowNewForm(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Cliente *</label>
                <select
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={newCrediario.customerId}
                  onChange={e => setNewCrediario({ ...newCrediario, customerId: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.sobrenome || ''} {c.fone ? `- ${c.fone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Valor Total *</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={newCrediario.totalAmount}
                  onChange={e => setNewCrediario({ ...newCrediario, totalAmount: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Número de Parcelas *</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={newCrediario.installments}
                  onChange={e => setNewCrediario({ ...newCrediario, installments: Number(e.target.value) })}
                />
                {newCrediario.totalAmount > 0 && newCrediario.installments > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    Valor por parcela: R$ {(newCrediario.totalAmount / newCrediario.installments).toFixed(2)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Primeiro Vencimento *</label>
                <input
                  type="date"
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={newCrediario.firstDueDate}
                  onChange={e => setNewCrediario({ ...newCrediario, firstDueDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Taxa de Juros Mensal (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={newCrediario.interestRate}
                  onChange={e => setNewCrediario({ ...newCrediario, interestRate: Number(e.target.value) })}
                />
              </div>

              <button
                onClick={handleCreateCrediario}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold"
              >
                Criar Crediário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedCrediario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Detalhes do Crediário</h3>
              <button onClick={() => setSelectedCrediario(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-xs text-blue-700 font-bold mb-1">Total</p>
                <p className="text-xl font-black text-blue-900">R$ {selectedCrediario.crediario.total_amount.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-xs text-green-700 font-bold mb-1">Pago</p>
                <p className="text-xl font-black text-green-900">R$ {selectedCrediario.crediario.amount_paid.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-xs text-red-700 font-bold mb-1">Restante</p>
                <p className="text-xl font-black text-red-900">R$ {selectedCrediario.crediario.amount_remaining.toFixed(2)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-xs text-purple-700 font-bold mb-1">Parcelas</p>
                <p className="text-xl font-black text-purple-900">
                  {selectedCrediario.crediario.installments_paid}/{selectedCrediario.crediario.installments_total}
                </p>
              </div>
            </div>

            {/* Installments */}
            <div className="mb-6">
              <h4 className="font-bold text-gray-900 mb-3">Parcelas</h4>
              <div className="bg-gray-50 rounded-lg max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-200 sticky top-0">
                    <tr>
                      <th className="p-2 text-left font-bold text-gray-900">#</th>
                      <th className="p-2 text-left font-bold text-gray-900">Vencimento</th>
                      <th className="p-2 text-right font-bold text-gray-900">Valor</th>
                      <th className="p-2 text-right font-bold text-gray-900">Pago</th>
                      <th className="p-2 text-center font-bold text-gray-900">Status</th>
                      <th className="p-2 text-center font-bold text-gray-900">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedCrediario.installments.map((inst: InstallmentData) => (
                      <tr key={inst.id} className="hover:bg-white">
                        <td className="p-2 font-bold text-gray-900">{inst.installment_number}</td>
                        <td className="p-2 text-gray-900">{new Date(inst.due_date).toLocaleDateString()}</td>
                        <td className="p-2 text-right font-bold text-gray-900">
                          R$ {inst.amount.toFixed(2)}
                          {(inst.late_fee > 0 || inst.interest > 0) && (
                            <span className="text-xs text-red-600 block">
                              + R$ {(inst.late_fee + inst.interest).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right text-green-700 font-bold">R$ {inst.amount_paid.toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(inst.status)}`}>
                            {inst.status.toUpperCase()}
                          </span>
                          {inst.late_days > 0 && (
                            <p className="text-xs text-red-600 mt-1">{inst.late_days} dias</p>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {inst.status !== 'paid' && (
                            <button
                              onClick={() => {
                                setSelectedInstallment(inst);
                                setPayment({ ...payment, amount: inst.amount - inst.amount_paid + inst.late_fee + inst.interest });
                                setShowPaymentModal(true);
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold"
                            >
                              Pagar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            {selectedCrediario.crediario.status !== 'cancelled' && selectedCrediario.crediario.status !== 'paid' && (
              <button
                onClick={() => handleCancelCrediario(selectedCrediario.crediario.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
              >
                <Ban className="w-4 h-4" /> Cancelar Crediário
              </button>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInstallment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Registrar Pagamento</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-900">
                <span className="font-bold">Parcela {selectedInstallment.installment_number}</span> - Vencimento: {new Date(selectedInstallment.due_date).toLocaleDateString()}
              </p>
              <p className="text-lg font-black text-blue-900 mt-1">
                Total a pagar: R$ {(selectedInstallment.amount - selectedInstallment.amount_paid + selectedInstallment.late_fee + selectedInstallment.interest).toFixed(2)}
              </p>
              {selectedInstallment.late_fee > 0 && (
                <p className="text-xs text-red-600">Multa: R$ {selectedInstallment.late_fee.toFixed(2)}</p>
              )}
              {selectedInstallment.interest > 0 && (
                <p className="text-xs text-red-600">Juros: R$ {selectedInstallment.interest.toFixed(2)}</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Valor do Pagamento *</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={payment.amount}
                  onChange={e => setPayment({ ...payment, amount: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Forma de Pagamento *</label>
                <select
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={payment.paymentMethod}
                  onChange={e => setPayment({ ...payment, paymentMethod: e.target.value as any })}
                >
                  <option value="cash">Dinheiro</option>
                  <option value="card">Cartão</option>
                  <option value="pix">PIX</option>
                  <option value="transfer">Transferência</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Recebido por</label>
                <input
                  type="text"
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={payment.receivedBy}
                  onChange={e => setPayment({ ...payment, receivedBy: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nº Recibo</label>
                <input
                  type="text"
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={payment.receiptNumber}
                  onChange={e => setPayment({ ...payment, receiptNumber: e.target.value })}
                />
              </div>

              <button
                onClick={handlePayInstallment}
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
