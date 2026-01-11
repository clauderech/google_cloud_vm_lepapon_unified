import React, { useState, useEffect } from 'react';
import { DollarSign, Lock, Unlock, AlertTriangle, History, User } from 'lucide-react';
import { financialService } from '../services/financialService';
import type { CashRegister } from '../types';

export const CashRegisterComponent: React.FC = () => {
  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null);
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const [openForm, setOpenForm] = useState({
    initialAmount: 0,
    responsibleUser: ''
  });

  const [closeForm, setCloseForm] = useState({
    actualAmount: 0,
    observations: ''
  });

  useEffect(() => {
    loadCashRegister();
  }, []);

  const loadCashRegister = async () => {
    try {
      setLoading(true);
      const [current, hist] = await Promise.all([
        financialService.getCurrentCashRegister(),
        financialService.getCashRegisterHistory(30)
      ]);
      setCurrentRegister(current);
      setHistory(hist);
    } catch (err) {
      console.error('Erro ao carregar caixa:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (openForm.initialAmount < 0) {
      alert('Valor inicial inválido');
      return;
    }

    if (!openForm.responsibleUser.trim()) {
      alert('Informe o responsável pela abertura');
      return;
    }

    try {
      await financialService.openCashRegister(openForm.initialAmount, openForm.responsibleUser);
      setOpenForm({ initialAmount: 0, responsibleUser: '' });
      loadCashRegister();
      alert('Caixa aberto com sucesso!');
    } catch (err) {
      console.error('Erro ao abrir caixa:', err);
      alert('Erro ao abrir caixa');
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentRegister?.id) return;

    if (closeForm.actualAmount < 0) {
      alert('Valor final inválido');
      return;
    }

    const confirmMsg = currentRegister.difference !== 0
      ? `Há uma diferença de ${financialService.formatCurrency(Math.abs(currentRegister.difference))}. Deseja realmente fechar o caixa?`
      : 'Deseja fechar o caixa?';

    if (!confirm(confirmMsg)) return;

    try {
      await financialService.closeCashRegister(
        currentRegister.id,
        closeForm.actualAmount,
        currentRegister.responsibleUser,
        closeForm.observations
      );
      setCloseForm({ actualAmount: 0, observations: '' });
      loadCashRegister();
      alert('Caixa fechado com sucesso!');
    } catch (err) {
      console.error('Erro ao fechar caixa:', err);
      alert('Erro ao fechar caixa');
    }
  };

  const updateExpectedAmount = (actualAmount: number) => {
    if (currentRegister) {
      const difference = actualAmount - currentRegister.expectedAmount;
      setCurrentRegister({
        ...currentRegister,
        actualAmount,
        difference
      });
      setCloseForm({ ...closeForm, actualAmount });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 font-medium">Carregando caixa...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Controle de Caixa</h2>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
        >
          <History className="w-5 h-5" />
          {showHistory ? 'Ocultar' : 'Ver'} Histórico
        </button>
      </div>

      {/* Status do Caixa */}
      <div className={`p-6 rounded-xl shadow-lg border-2 ${
        currentRegister?.status === 'open' 
          ? 'bg-green-50 border-green-300' 
          : 'bg-red-50 border-red-300'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          {currentRegister?.status === 'open' ? (
            <Unlock className="w-8 h-8 text-green-600" />
          ) : (
            <Lock className="w-8 h-8 text-red-600" />
          )}
          <div>
            <h3 className="text-xl font-black text-gray-900">
              {currentRegister?.status === 'open' ? 'Caixa Aberto' : 'Caixa Fechado'}
            </h3>
            {currentRegister && (
              <p className="text-sm text-gray-600">
                Responsável: <span className="font-bold">{currentRegister.responsibleUser}</span>
              </p>
            )}
          </div>
        </div>

        {currentRegister?.status === 'open' && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 font-bold mb-1">Valor Inicial</p>
              <p className="text-2xl font-black text-gray-900">
                {financialService.formatCurrency(currentRegister.initialAmount)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 font-bold mb-1">Valor Esperado</p>
              <p className="text-2xl font-black text-blue-600">
                {financialService.formatCurrency(currentRegister.expectedAmount)}
              </p>
            </div>
            <div className={`p-4 rounded-lg border-2 ${
              currentRegister.difference === 0 
                ? 'bg-gray-50 border-gray-300' 
                : currentRegister.difference > 0
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
            }`}>
              <p className="text-xs font-bold mb-1">Diferença</p>
              <p className={`text-2xl font-black ${
                currentRegister.difference === 0 
                  ? 'text-gray-700' 
                  : currentRegister.difference > 0
                    ? 'text-green-700'
                    : 'text-red-700'
              }`}>
                {currentRegister.difference >= 0 ? '+' : ''}
                {financialService.formatCurrency(currentRegister.difference)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Formulário de Abertura */}
      {!currentRegister || currentRegister.status === 'closed' ? (
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-blue-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Unlock className="w-5 h-5 text-blue-600" />
            Abrir Caixa
          </h3>
          <form onSubmit={handleOpen} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Valor Inicial
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openForm.initialAmount || ''}
                  onChange={(e) => setOpenForm({ ...openForm, initialAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Responsável
                </label>
                <input
                  type="text"
                  value={openForm.responsibleUser}
                  onChange={(e) => setOpenForm({ ...openForm, responsibleUser: e.target.value })}
                  placeholder="Nome do operador"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Unlock className="w-5 h-5" />
              Abrir Caixa
            </button>
          </form>
        </div>
      ) : (
        /* Formulário de Fechamento */
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-orange-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-orange-600" />
            Fechar Caixa
          </h3>
          <form onSubmit={handleClose} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Valor Real no Caixa
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={closeForm.actualAmount || ''}
                onChange={(e) => updateExpectedAmount(parseFloat(e.target.value) || 0)}
                placeholder="Contar dinheiro e digitar valor"
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                required
              />
              {currentRegister.difference !== 0 && (
                <div className={`mt-2 p-3 rounded-lg flex items-center gap-2 ${
                  currentRegister.difference > 0 
                    ? 'bg-green-50 text-green-800' 
                    : 'bg-red-50 text-red-800'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm font-bold">
                    {currentRegister.difference > 0 ? 'Sobra' : 'Falta'} de {financialService.formatCurrency(Math.abs(currentRegister.difference))}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Observações (opcional)
              </label>
              <textarea
                value={closeForm.observations}
                onChange={(e) => setCloseForm({ ...closeForm, observations: e.target.value })}
                placeholder="Motivo de diferenças, notas adicionais..."
                rows={3}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-5 h-5" />
              Fechar Caixa
            </button>
          </form>
        </div>
      )}

      {/* Histórico */}
      {showHistory && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">Histórico de Caixa (Últimos 30 dias)</h3>
          </div>
          <div className="overflow-x-auto">
            {history.length === 0 ? (
              <div className="p-8 text-center text-gray-600">Nenhum registro de caixa encontrado</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-3 font-bold text-gray-700 text-sm">Abertura</th>
                    <th className="text-left p-3 font-bold text-gray-700 text-sm">Fechamento</th>
                    <th className="text-left p-3 font-bold text-gray-700 text-sm">Responsável</th>
                    <th className="text-right p-3 font-bold text-gray-700 text-sm">Inicial</th>
                    <th className="text-right p-3 font-bold text-gray-700 text-sm">Esperado</th>
                    <th className="text-right p-3 font-bold text-gray-700 text-sm">Real</th>
                    <th className="text-right p-3 font-bold text-gray-700 text-sm">Diferença</th>
                    <th className="text-center p-3 font-bold text-gray-700 text-sm">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {history.map((register) => (
                    <tr key={register.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 text-sm font-medium text-gray-900">
                        {financialService.formatDate(register.openedAt)}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {register.closedAt ? financialService.formatDate(register.closedAt) : '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-900 flex items-center gap-1">
                        <User className="w-4 h-4 text-gray-500" />
                        {register.responsibleUser}
                      </td>
                      <td className="p-3 text-right text-sm font-bold text-gray-900">
                        {financialService.formatCurrency(register.initialAmount)}
                      </td>
                      <td className="p-3 text-right text-sm font-bold text-blue-600">
                        {financialService.formatCurrency(register.expectedAmount)}
                      </td>
                      <td className="p-3 text-right text-sm font-bold text-gray-900">
                        {register.actualAmount ? financialService.formatCurrency(register.actualAmount) : '-'}
                      </td>
                      <td className={`p-3 text-right text-sm font-black ${
                        register.difference === 0 
                          ? 'text-gray-700' 
                          : register.difference > 0
                            ? 'text-green-700'
                            : 'text-red-700'
                      }`}>
                        {register.difference >= 0 ? '+' : ''}
                        {financialService.formatCurrency(register.difference)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          register.status === 'open'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {register.status === 'open' ? 'Aberto' : 'Fechado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CashRegisterComponent;
