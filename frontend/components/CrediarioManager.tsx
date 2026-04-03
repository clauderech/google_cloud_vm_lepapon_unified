import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, X, FileText, Download, MessageSquare, Send, Clock, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import type { MonthlyAccount, MonthlyPurchase, MonthlyPayment } from '../types';

interface CrediarioManagerProps {
  customers: any[];
}

const CrediarioManager: React.FC<CrediarioManagerProps> = ({ customers }) => {
  // Estados para contas mensais
  const [monthlyAccounts, setMonthlyAccounts] = useState<MonthlyAccount[]>([]);
  const [selectedMonthlyAccount, setSelectedMonthlyAccount] = useState<MonthlyAccount | null>(null);
  const [monthlyPurchases, setMonthlyPurchases] = useState<MonthlyPurchase[]>([]);
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([]);
  const [showMonthlyPaymentModal, setShowMonthlyPaymentModal] = useState(false);
  const [monthlyPayment, setMonthlyPayment] = useState({
    amount: 0,
    paymentMethod: 'cash' as const,
    paymentDate: '',
    receiptNumber: '',
    receivedBy: '',
    notes: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [pdfLoading, setPdfLoading] = useState<{[key: string]: boolean}>({});

  // Estados WhatsApp
  const [whatsappTab, setWhatsappTab] = useState<'accounts' | 'scheduler' | 'customers'>('accounts');
  const [whatsappLoading, setWhatsappLoading] = useState<{[key: string]: boolean}>({});
  const [accountsReadyToSend, setAccountsReadyToSend] = useState<any[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);
  const [customersWithWhatsApp, setCustomersWithWhatsApp] = useState<any[]>([]);
  const [whatsappMessages, setWhatsappMessages] = useState<any[]>([]);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [showPhoneConfigModal, setShowPhoneConfigModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [phoneConfig, setPhoneConfig] = useState({ phone: '' });
  const [sendingBatch, setSendingBatch] = useState(false);
  const [accountsFilter, setAccountsFilter] = useState('');
  const [customersFilter, setCustomersFilter] = useState('');

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

  // Gerar PDF da conta mensal
  const handleGeneratePDF = async (customerId: string, monthYear: string) => {
    const loadingKey = `${customerId}_${monthYear}`;
    
    try {
      setPdfLoading(prev => ({ ...prev, [loadingKey]: true }));
      
      const res = await fetch('/api/comandas/crediario/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          monthYear,
          generatedBy: 'Usuário Sistema' // Pode ser obtido do contexto de autenticação
        })
      });
      
      if (!res.ok) {
        throw new Error('Erro na geração do PDF');
      }
      
      const data = await res.json();
      
      // Download automático do PDF
      const downloadUrl = data.downloadUrl;
      window.open(downloadUrl, '_blank');
      
      // Opcionalmente, pode mostrar uma mensagem de sucesso
      // alert('PDF gerado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Formatar itens de uma compra
  const formatPurchaseItems = (itemsJson: string | null) => {
    if (!itemsJson) return null;
    
    try {
      const items = JSON.parse(itemsJson);
      if (Array.isArray(items) && items.length > 0) {
        return items.map(item => {
          const qty = item.quantity || 1;
          const name = item.product_name || item.name || 'Item';
          const price = item.price || item.unit_price || 0;
          return `${qty} ${name} (R$ ${parseFloat(price).toFixed(2)})`;
        }).join(', ');
      }
    } catch (error) {
      console.warn('Erro ao processar items_json:', error);
    }
    
    return null;
  };

  // ================================
  // FUNÇÕES WHATSAPP
  // ================================

  // Buscar contas prontas para envio WhatsApp
  const loadAccountsReadyToSend = async () => {
    try {
      const res = await fetch('/api/comandas/crediario/accounts/ready-to-send');
      const data = await res.json();
      setAccountsReadyToSend(data);
    } catch (error) {
      console.error('Erro ao carregar contas prontas para envio:', error);
    }
  };

  // Buscar status do scheduler
  const loadSchedulerStatus = async () => {
    try {
      const res = await fetch('/api/comandas/crediario/scheduler/status');
      const data = await res.json();
      setSchedulerStatus(data);
    } catch (error) {
      console.error('Erro ao carregar status do scheduler:', error);
    }
  };

  // Buscar clientes com WhatsApp
  const loadCustomersWithWhatsApp = async () => {
    try {
      const res = await fetch('/api/comandas/crediario/customers/whatsapp');
      const data = await res.json();
      setCustomersWithWhatsApp(data);
    } catch (error) {
      console.error('Erro ao carregar clientes com WhatsApp:', error);
    }
  };

  // Buscar histórico de mensagens WhatsApp
  const loadWhatsappMessages = async (monthlyAccountId: number) => {
    try {
      const res = await fetch(`/api/comandas/crediario/${monthlyAccountId}/whatsapp-messages`);
      const data = await res.json();
      setWhatsappMessages(data);
    } catch (error) {
      console.error('Erro ao carregar mensagens WhatsApp:', error);
      setWhatsappMessages([]);
    }
  };

  // Enviar conta individual via WhatsApp
  const sendAccountWhatsApp = async (accountId: number, messageType = 'account_receipt') => {
    const loadingKey = `send_${accountId}`;
    try {
      setWhatsappLoading(prev => ({ ...prev, [loadingKey]: true }));
      
      const res = await fetch(`/api/comandas/crediario/${accountId}/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageType })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('Conta enviada via WhatsApp com sucesso!');
        loadAccountsReadyToSend();
        loadMonthlyAccounts();
      } else {
        throw new Error(data.details || 'Erro ao enviar');
      }
    } catch (error) {
      console.error('Erro ao enviar conta via WhatsApp:', error);
      alert(`Erro ao enviar conta: ${error.message}`);
    } finally {
      setWhatsappLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Enviar múltiplas contas via WhatsApp
  const sendBatchWhatsApp = async () => {
    if (filteredAccountsReadyToSend.length === 0) {
      alert('Nenhuma conta disponível para envio');
      return;
    }

    const accountIds = filteredAccountsReadyToSend.slice(0, 10).map(acc => acc.id); // Máximo 10
    
    try {
      setSendingBatch(true);
      
      const res = await fetch('/api/comandas/crediario/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountIds })
      });
      
      const data = await res.json();
      
      if (data.success) {
        const { success, failed, total } = data.summary;
        alert(`Envio em lote concluído!\n\nTotal: ${total}\nSucesso: ${success}\nFalhas: ${failed}`);
        loadAccountsReadyToSend();
        loadMonthlyAccounts();
      } else {
        throw new Error('Erro no envio em lote');
      }
    } catch (error) {
      console.error('Erro ao enviar lote via WhatsApp:', error);
      alert(`Erro no envio em lote: ${error.message}`);
    } finally {
      setSendingBatch(false);
    }
  };

  // Executar lembretes manualmente
  const runRemindersNow = async () => {
    try {
      setWhatsappLoading(prev => ({ ...prev, 'reminders': true }));
      
      const res = await fetch('/api/comandas/crediario/scheduler/run-now', {
        method: 'POST'
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('Lembretes iniciados em background. Verifique os logs para acompanhar o progresso.');
        loadSchedulerStatus();
      } else {
        throw new Error('Erro ao executar lembretes');
      }
    } catch (error) {
      console.error('Erro ao executar lembretes:', error);
      alert(`Erro ao executar lembretes: ${error.message}`);
    } finally {
      setWhatsappLoading(prev => ({ ...prev, 'reminders': false }));
    }
  };

  // Configurar telefone do cliente
  const configureCustomerPhone = async () => {
    if (!selectedCustomer || !phoneConfig.phone) return;
    
    try {
      setWhatsappLoading(prev => ({ ...prev, 'phone_config': true }));
      
      const res = await fetch(`/api/comandas/crediario/customers/${selectedCustomer.id}/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappPhone: phoneConfig.phone })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('Telefone configurado com sucesso!');
        setShowPhoneConfigModal(false);
        setPhoneConfig({ phone: '' });
        loadCustomersWithWhatsApp();
        loadAccountsReadyToSend();
      } else {
        throw new Error(data.details || 'Erro ao configurar telefone');
      }
    } catch (error) {
      console.error('Erro ao configurar telefone:', error);
      alert(`Erro ao configurar telefone: ${error.message}`);
    } finally {
      setWhatsappLoading(prev => ({ ...prev, 'phone_config': false }));
    }
  };

  useEffect(() => {
    loadMonthlyAccounts();
  }, []);

  // Carregar dados WhatsApp when tab changes
  useEffect(() => {
    if (whatsappTab === 'accounts') {
      loadAccountsReadyToSend();
    } else if (whatsappTab === 'scheduler') {
      loadSchedulerStatus();
    } else if (whatsappTab === 'customers') {
      loadCustomersWithWhatsApp();
    }
  }, [whatsappTab]);

  // Filtros
  const filteredAccounts = monthlyAccounts.filter(acc => {
    const fullName = `${acc.customer_name} ${acc.customer_surname || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const filteredAccountsReadyToSend = accountsReadyToSend.filter(acc => {
    const fullName = `${acc.customer_name} ${acc.customer_surname || ''}`.toLowerCase();
    return fullName.includes(accountsFilter.toLowerCase()) || 
           acc.reference_month.toLowerCase().includes(accountsFilter.toLowerCase()) ||
           (acc.customer_phone && acc.customer_phone.includes(accountsFilter));
  });

  const filteredCustomers = customersWithWhatsApp.filter(customer => {
    const fullName = `${customer.customer_name} ${customer.customer_surname || ''}`.toLowerCase();
    return fullName.includes(customersFilter.toLowerCase()) ||
           (customer.customer_phone && customer.customer_phone.includes(customersFilter));
  });
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistema de Crediário</h1>
        <p className="text-gray-600">Gerencie contas mensais, compras e pagamentos dos clientes</p>
      </div>

      {/* Tabs de navegação */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setWhatsappTab('accounts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              whatsappTab === 'accounts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MessageSquare className="inline-block w-4 h-4 mr-2" />
            Contas WhatsApp
          </button>
          <button
            onClick={() => setWhatsappTab('scheduler')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              whatsappTab === 'scheduler'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="inline-block w-4 h-4 mr-2" />
            Scheduler
          </button>
          <button
            onClick={() => setWhatsappTab('customers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              whatsappTab === 'customers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="inline-block w-4 h-4 mr-2" />
            Clientes
          </button>
        </nav>
      </div>

      {/* Conteúdo das abas */}
      {whatsappTab === 'accounts' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Contas Prontas para Envio</h2>
            <div className="space-x-2">
              <button
                onClick={loadAccountsReadyToSend}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                Atualizar
              </button>
              <button
                onClick={sendBatchWhatsApp}
                disabled={sendingBatch || filteredAccountsReadyToSend.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {sendingBatch ? 'Enviando...' : `Enviar Lote (${Math.min(filteredAccountsReadyToSend.length, 10)})`}
              </button>
            </div>
          </div>

          {/* Campo de filtro */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, referência ou telefone..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={accountsFilter}
                  onChange={e => setAccountsFilter(e.target.value)}
                />
              </div>
              {accountsFilter && (
                <button
                  onClick={() => setAccountsFilter('')}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <span className="text-sm text-gray-500">
                {filteredAccountsReadyToSend.length} de {accountsReadyToSend.length} contas
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referência</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAccountsReadyToSend.map((account) => (
                  <tr key={account.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {account.customer_name} {account.customer_surname || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.reference_month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {parseFloat(account.balance).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.customer_phone || 'Não informado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => sendAccountWhatsApp(account.id)}
                        disabled={whatsappLoading[`send_${account.id}`]}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Send className="w-4 h-4" />
                        {whatsappLoading[`send_${account.id}`] ? 'Enviando...' : 'Enviar'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMonthlyAccount(account);
                          loadWhatsappMessages(account.id);
                          setShowWhatsappModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Histórico
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAccountsReadyToSend.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                {accountsFilter ? 'Nenhuma conta encontrada com os filtros aplicados' : 'Nenhuma conta pronta para envio via WhatsApp'}
              </div>
            )}
          </div>
        </div>
      )}

      {whatsappTab === 'scheduler' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Agendamento de Lembretes</h2>
            <button
              onClick={loadSchedulerStatus}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
            >
              Atualizar Status
            </button>
          </div>

          {schedulerStatus && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Status Geral
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`font-medium ${schedulerStatus.active ? 'text-green-600' : 'text-red-600'}`}>
                        {schedulerStatus.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total de Jobs:</span>
                      <span>{schedulerStatus.totalJobs}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    Próximas Execuções
                  </h3>
                  <div className="space-y-2">
                    {schedulerStatus.jobs && schedulerStatus.jobs.map((job, index) => (
                      <div key={index} className="text-sm">
                        <div className="font-medium">{job.name}</div>
                        <div className="text-gray-500">
                          Próxima execução: {job.nextDates[0] || 'Não definida'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={runRemindersNow}
                  disabled={whatsappLoading['reminders']}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {whatsappLoading['reminders'] ? 'Executando...' : 'Executar Lembretes Agora'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {whatsappTab === 'customers' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Configuração de Clientes</h2>
            <button
              onClick={loadCustomersWithWhatsApp}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
            >
              Atualizar
            </button>
          </div>

          {/* Campo de filtro para clientes */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou telefone..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={customersFilter}
                  onChange={e => setCustomersFilter(e.target.value)}
                />
              </div>
              {customersFilter && (
                <button
                  onClick={() => setCustomersFilter('')}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <span className="text-sm text-gray-500">
                {filteredCustomers.length} de {customersWithWhatsApp.length} clientes
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status WhatsApp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.customer_name} {customer.customer_surname || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.customer_phone || 'Não informado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.customer_phone 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {customer.customer_phone ? 'Configurado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setPhoneConfig({ phone: customer.customer_phone || '' });
                          setShowPhoneConfigModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Configurar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCustomers.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                {customersFilter ? 'Nenhum cliente encontrado com os filtros aplicados' : 'Nenhum cliente encontrado'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de configuração de telefone */}
      {showPhoneConfigModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Configurar WhatsApp - {selectedCustomer.customer_name} {selectedCustomer.customer_surname || ''}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do WhatsApp
                </label>
                <input
                  type="text"
                  value={phoneConfig.phone}
                  onChange={(e) => setPhoneConfig({ phone: e.target.value })}
                  placeholder="5511999999999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: código do país + DDD + número (sem espaços ou símbolos)
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={configureCustomerPhone}
                disabled={whatsappLoading['phone_config'] || !phoneConfig.phone}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {whatsappLoading['phone_config'] ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => {
                  setShowPhoneConfigModal(false);
                  setPhoneConfig({ phone: '' });
                  setSelectedCustomer(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de histórico WhatsApp */}
      {showWhatsappModal && selectedMonthlyAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                Histórico WhatsApp - {selectedMonthlyAccount.customer_name} {selectedMonthlyAccount.customer_surname || ''}
              </h3>
              <p className="text-sm text-gray-600">
                Referência: {selectedMonthlyAccount.reference_month}
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-72">
              {whatsappMessages.length > 0 ? (
                <div className="space-y-3">
                  {whatsappMessages.map((msg, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {msg.message_type === 'account_receipt' ? 'Conta Enviada' : 
                           msg.message_type === 'overdue_reminder' ? 'Lembrete' : msg.message_type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.sent_at).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(msg.sent_at).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          msg.status === 'sent' ? 'bg-green-100 text-green-800' :
                          msg.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {msg.status === 'sent' ? 'Enviado' : 
                           msg.status === 'failed' ? 'Falha' : msg.status}
                        </span>
                        {msg.phone && (
                          <span className="text-xs text-gray-500">
                            {msg.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma mensagem WhatsApp encontrada para esta conta
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowWhatsappModal(false);
                  setSelectedMonthlyAccount(null);
                  setWhatsappMessages([]);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrediarioManager;
