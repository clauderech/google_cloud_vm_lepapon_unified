import React, { useState, useEffect } from 'react';
import { Search, X, Send, MessageSquare, Eye } from 'lucide-react';

interface WhatsAppAccountSenderProps {
  onClose: () => void;
}

const WhatsAppAccountSender: React.FC<WhatsAppAccountSenderProps> = ({ onClose }) => {
  // Estados específicos para envio de contas WhatsApp
  const [whatsappLoading, setWhatsappLoading] = useState<{[key: string]: boolean}>({});
  const [accountsReadyToSend, setAccountsReadyToSend] = useState<any[]>([]);
  const [whatsappMessages, setWhatsappMessages] = useState<any[]>([]);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [accountsFilter, setAccountsFilter] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [selectedAccountForPreview, setSelectedAccountForPreview] = useState<any>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [selectedMonthlyAccount, setSelectedMonthlyAccount] = useState<any>(null);

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

  // Visualizar prévia da imagem da conta
  const previewAccountImage = async (account: any) => {
    try {
      setSelectedAccountForPreview(account);
      setWhatsappLoading(prev => ({ ...prev, [`preview_${account.id}`]: true }));
      
      // Limpar prévia anterior
      setPreviewImageUrl(null);
      setImageLoading(true);
      
      const imageUrl = `/api/comandas/crediario/${account.id}/preview-image?t=${Date.now()}`;
      setPreviewImageUrl(imageUrl);
      setShowPreviewModal(true);
    } catch (error) {
      console.error('Erro ao carregar prévia:', error);
      alert(`Erro ao carregar prévia: ${error.message}`);
      setShowPreviewModal(false);
    } finally {
      setWhatsappLoading(prev => ({ ...prev, [`preview_${account.id}`]: false }));
    }
  };

  // Fechar modal de prévia
  const closePreviewModal = () => {
    setShowPreviewModal(false);
    setPreviewImageUrl(null);
    setSelectedAccountForPreview(null);
    setImageLoading(false);
  };

  useEffect(() => {
    loadAccountsReadyToSend();
  }, []);

  // Filtros
  const filteredAccountsReadyToSend = accountsReadyToSend.filter(acc => {
    const fullName = `${acc.customer_name} ${acc.customer_surname || ''}`.toLowerCase();
    return fullName.includes(accountsFilter.toLowerCase()) || 
           acc.reference_month.toLowerCase().includes(accountsFilter.toLowerCase()) ||
           (acc.customer_phone && acc.customer_phone.includes(accountsFilter));
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Enviar Contas via WhatsApp</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Contas Prontas para Envio</h3>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => previewAccountImage(account)}
                          disabled={whatsappLoading[`preview_${account.id}`]}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 justify-start"
                        >
                          <Eye className="w-4 h-4" />
                          {whatsappLoading[`preview_${account.id}`] ? 'Carregando...' : 'Visualizar'}
                        </button>
                        <button
                          onClick={() => sendAccountWhatsApp(account.id)}
                          disabled={whatsappLoading[`send_${account.id}`]}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 justify-start"
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
                          className="text-gray-600 hover:text-gray-900 flex items-center gap-1 justify-start"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Histórico
                        </button>
                      </div>
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

        {/* Modal de prévia da imagem */}
        {showPreviewModal && selectedAccountForPreview && previewImageUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    Prévia do Recibo - {selectedAccountForPreview.customer_name} {selectedAccountForPreview.customer_surname || ''}
                  </h3>
                  <button
                    onClick={closePreviewModal}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Referência: {selectedAccountForPreview.reference_month} • Saldo: R$ {parseFloat(selectedAccountForPreview.balance).toFixed(2)}
                </p>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto flex justify-center items-center bg-gray-50">
                {imageLoading && (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-500 text-sm">Gerando prévia da imagem...</p>
                  </div>
                )}
                <div className="bg-white shadow-lg rounded-lg overflow-hidden max-w-full" 
                     style={{ display: imageLoading ? 'none' : 'block' }}>
                  <img 
                    src={previewImageUrl || ''}
                    alt="Prévia do recibo"
                    className="max-w-full h-auto"
                    style={{ maxHeight: '60vh' }}
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      alert('Erro ao carregar prévia da imagem');
                      closePreviewModal();
                    }}
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200">
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closePreviewModal}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      sendAccountWhatsApp(selectedAccountForPreview.id);
                      closePreviewModal();
                    }}
                    disabled={whatsappLoading[`send_${selectedAccountForPreview.id}`]}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {whatsappLoading[`send_${selectedAccountForPreview.id}`] ? 'Enviando...' : 'Enviar via WhatsApp'}
                  </button>
                </div>
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
                            {msg.message_type === 'account_receipt' ? 'Recibo da Conta' : 
                             msg.message_type === 'reminder' ? 'Lembrete' : 
                             msg.message_type === 'response' ? 'Resposta' : msg.message_type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{msg.message_content}</p>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Para: {msg.whatsapp_phone}</span>
                          <span className={`px-2 py-1 rounded-full ${
                            msg.send_status === 'sent' ? 'bg-green-100 text-green-700' :
                            msg.send_status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {msg.send_status === 'sent' ? 'Enviado' :
                             msg.send_status === 'failed' ? 'Falhou' : 'Pendente'}
                          </span>
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
    </div>
  );
};

export default WhatsAppAccountSender;