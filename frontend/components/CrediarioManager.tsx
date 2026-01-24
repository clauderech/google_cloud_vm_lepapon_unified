import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, X } from 'lucide-react';

interface CrediarioManagerProps {
  customers: any[];
}

const CrediarioManager: React.FC<CrediarioManagerProps> = ({ customers }) => {
  // Estados para contas mensais
  const [monthlyAccounts, setMonthlyAccounts] = useState<any[]>([]);
  const [selectedMonthlyAccount, setSelectedMonthlyAccount] = useState<any | null>(null);
  const [monthlyPurchases, setMonthlyPurchases] = useState<any[]>([]);
  const [monthlyPayments, setMonthlyPayments] = useState<any[]>([]);
  const [showMonthlyPaymentModal, setShowMonthlyPaymentModal] = useState(false);
  const [monthlyPayment, setMonthlyPayment] = useState({
    amount: 0,
    paymentMethod: 'cash',
    paymentDate: '',
    receiptNumber: '',
    receivedBy: '',
    notes: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Buscar contas mensais
  const loadMonthlyAccounts = async (customerId?: string, monthYear?: string) => {
    let url = '/api/comandas/crediario/accounts';
    const params = [];
    if (customerId) params.push(`customerId=${customerId}`);
    if (monthYear) params.push(`monthYear=${monthYear}`);
    if (params.length) url += '?' + params.join('&');
    const res = await fetch(url);
    const data = await res.json();
    setMonthlyAccounts(data);
  };

  // Buscar compras mensais
  const loadMonthlyPurchases = async (monthlyAccountId: number) => {
    const res = await fetch(`/api/comandas/crediario/${monthlyAccountId}/purchases`);
    const data = await res.json();
    setMonthlyPurchases(data);
  };

  // Buscar pagamentos mensais
  const loadMonthlyPayments = async (monthlyAccountId: number) => {
    const res = await fetch(`/api/comandas/crediario/${monthlyAccountId}/payments`);
    const data = await res.json();
    setMonthlyPayments(data);
  };

  // Registrar pagamento mensal
  const handleMonthlyPayment = async () => {
    if (!selectedMonthlyAccount) return;
    const res = await fetch(`/api/comandas/crediario/${selectedMonthlyAccount.id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(monthlyPayment)
    });
    if (res.ok) {
      alert('Pagamento mensal registrado com sucesso!');
      setShowMonthlyPaymentModal(false);
      setMonthlyPayment({ amount: 0, paymentMethod: 'cash', paymentDate: '', receiptNumber: '', receivedBy: '', notes: '' });
      loadMonthlyAccounts();
      loadMonthlyPayments(selectedMonthlyAccount.id);
    } else {
      alert('Erro ao registrar pagamento mensal');
    }
  };

  useEffect(() => {
    loadMonthlyAccounts();
  }, []);

  // Filtro de busca
  const filteredAccounts = monthlyAccounts.filter(acc =>
    acc.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="text-blue-600" /> Gestão de Crediário Mensal
        </h2>
      </div>

      {/* Filtro de busca */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex gap-4 items-center">
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

      {/* Lista de contas mensais */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left font-bold text-gray-900 text-sm">Cliente</th>
              <th className="p-3 text-right font-bold text-gray-900 text-sm">Valor Total</th>
              <th className="p-3 text-right font-bold text-gray-900 text-sm">Pago</th>
              <th className="p-3 text-right font-bold text-gray-900 text-sm">Restante</th>
              <th className="p-3 text-center font-bold text-gray-900 text-sm">Status</th>
              <th className="p-3 text-center font-bold text-gray-900 text-sm">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAccounts.map(acc => (
              <tr key={acc.id} className="hover:bg-gray-50">
                <td className="p-3">
                  <div>
                    <p className="font-bold text-gray-900">{acc.customer_name}</p>
                    {acc.customer_phone && <p className="text-xs text-gray-600">{acc.customer_phone}</p>}
                  </div>
                </td>
                <td className="p-3 text-right font-bold text-gray-900">R$ {acc.total_amount.toFixed(2)}</td>
                <td className="p-3 text-right text-green-700 font-bold">R$ {acc.amount_paid.toFixed(2)}</td>
                <td className="p-3 text-right text-red-700 font-bold">R$ {acc.amount_remaining.toFixed(2)}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${acc.status === 'paid' ? 'bg-green-100 text-green-800' : acc.status === 'active' ? 'bg-blue-100 text-blue-800' : acc.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                    {acc.status === 'active' ? 'ATIVO' : acc.status === 'overdue' ? 'VENCIDO' : acc.status === 'paid' ? 'PAGO' : 'CANCELADO'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => {
                      setSelectedMonthlyAccount(acc);
                      loadMonthlyPurchases(acc.id);
                      loadMonthlyPayments(acc.id);
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Ver detalhes"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de detalhes da conta mensal */}
      {selectedMonthlyAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Conta Mensal de {selectedMonthlyAccount.customer_name}</h3>
              <button onClick={() => setSelectedMonthlyAccount(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-xs text-blue-700 font-bold mb-1">Total</p>
                <p className="text-xl font-black text-blue-900">R$ {selectedMonthlyAccount.total_amount.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-xs text-green-700 font-bold mb-1">Pago</p>
                <p className="text-xl font-black text-green-900">R$ {selectedMonthlyAccount.amount_paid.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-xs text-red-700 font-bold mb-1">Restante</p>
                <p className="text-xl font-black text-red-900">R$ {selectedMonthlyAccount.amount_remaining.toFixed(2)}</p>
              </div>
            </div>

            {/* Compras mensais */}
            <div className="mb-6">
              <h4 className="font-bold text-gray-900 mb-3">Compras do mês</h4>
              <div className="bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-200 sticky top-0">
                    <tr>
                      <th className="p-2 text-left font-bold text-gray-900">Data</th>
                      <th className="p-2 text-left font-bold text-gray-900">Descrição</th>
                      <th className="p-2 text-right font-bold text-gray-900">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {monthlyPurchases.map((purchase: any) => (
                      <tr key={purchase.id} className="hover:bg-white">
                        <td className="p-2 text-gray-900">{new Date(purchase.date).toLocaleDateString()}</td>
                        <td className="p-2 text-gray-900">{purchase.description}</td>
                        <td className="p-2 text-right font-bold text-gray-900">R$ {purchase.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagamentos mensais */}
            <div className="mb-6">
              <h4 className="font-bold text-gray-900 mb-3">Pagamentos do mês</h4>
              <div className="bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-200 sticky top-0">
                    <tr>
                      <th className="p-2 text-left font-bold text-gray-900">Data</th>
                      <th className="p-2 text-left font-bold text-gray-900">Forma</th>
                      <th className="p-2 text-right font-bold text-gray-900">Valor</th>
                      <th className="p-2 text-left font-bold text-gray-900">Recibo</th>
                      <th className="p-2 text-left font-bold text-gray-900">Recebido por</th>
                      <th className="p-2 text-left font-bold text-gray-900">Obs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {monthlyPayments.map((paymen: any) => (
                      <tr key={paymen.id} className="hover:bg-white">
                        <td className="p-2 text-gray-900">{new Date(paymen.paymentDate).toLocaleDateString()}</td>
                        <td className="p-2 text-gray-900">{paymen.paymentMethod}</td>
                        <td className="p-2 text-right font-bold text-green-700">R$ {paymen.amount.toFixed(2)}</td>
                        <td className="p-2 text-gray-900">{paymen.receiptNumber}</td>
                        <td className="p-2 text-gray-900">{paymen.receivedBy}</td>
                        <td className="p-2 text-gray-900">{paymen.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Botão registrar pagamento mensal */}
            <button
              onClick={() => setShowMonthlyPaymentModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold mb-2"
            >
              Registrar Pagamento Mensal
            </button>
          </div>
        </div>
      )}

      {/* Modal registrar pagamento mensal */}
      {showMonthlyPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Registrar Pagamento Mensal</h3>
              <button onClick={() => setShowMonthlyPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Valor do Pagamento *</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={monthlyPayment.amount}
                  onChange={e => setMonthlyPayment({ ...monthlyPayment, amount: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Forma de Pagamento *</label>
                <select
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={monthlyPayment.paymentMethod}
                  onChange={e => setMonthlyPayment({ ...monthlyPayment, paymentMethod: e.target.value })}
                >
                  <option value="cash">Dinheiro</option>
                  <option value="card">Cartão</option>
                  <option value="pix">PIX</option>
                  <option value="transfer">Transferência</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Data do Pagamento</label>
                <input
                  type="date"
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={monthlyPayment.paymentDate}
                  onChange={e => setMonthlyPayment({ ...monthlyPayment, paymentDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nº Recibo</label>
                <input
                  type="text"
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={monthlyPayment.receiptNumber}
                  onChange={e => setMonthlyPayment({ ...monthlyPayment, receiptNumber: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Recebido por</label>
                <input
                  type="text"
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={monthlyPayment.receivedBy}
                  onChange={e => setMonthlyPayment({ ...monthlyPayment, receivedBy: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Observações</label>
                <input
                  type="text"
                  className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                  value={monthlyPayment.notes}
                  onChange={e => setMonthlyPayment({ ...monthlyPayment, notes: e.target.value })}
                />
              </div>

              <button
                onClick={handleMonthlyPayment}
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
