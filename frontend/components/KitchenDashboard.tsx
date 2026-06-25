import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChefHat, AlertCircle, CheckCircle, Play, Pause, MessageCircle, Trash2, RefreshCw, Bell } from 'lucide-react';
import type { CozinhaItem, CozinhaItemStatus, CozinhaPrioridade } from '../types';
import { useAuth } from '../hooks/useAuth';

// Socket.IO cliente (com fallback se não estiver disponível)
let io: any = null;
try {
  const socketIoClient = require('socket.io-client');
  io = socketIoClient;
} catch (e) {
  console.warn('[KitchenDashboard] Socket.IO cliente não disponível, funcionará sem notificações em tempo real');
}

interface KitchenDashboardProps {
  // Props serão adicionadas conforme necessário
}

const KitchenDashboard: React.FC<KitchenDashboardProps> = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<CozinhaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [newItemsCount, setNewItemsCount] = useState(0);
  const socketRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [filter, setFilter] = useState<{
    status?: CozinhaItemStatus;
    prioridade?: CozinhaPrioridade;
    responsavel?: string;
  }>({});
  
  // Conectar ao Socket.IO na inicialização
  useEffect(() => {
    if (!io) return; // Socket.IO não disponível
    
    console.log('[KitchenDashboard] Conectando ao Socket.IO...');
    
    const API_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[KitchenDashboard] Conectado ao Socket.IO');
      setConnected(true);
      socket.emit('join_kitchen');
    });

    socket.on('disconnect', () => {
      console.log('[KitchenDashboard] Desconectado do Socket.IO');
      setConnected(false);
    });

    // Evento: Novo item na cozinha
    socket.on('kitchen_new_item', (newItem: CozinhaItem) => {
      console.log('[KitchenDashboard] Novo item recebido:', newItem);
      setItems(prevItems => {
        // Evitar duplicações
        const isDuplicate = prevItems.some(item => item.id === newItem.id);
        if (isDuplicate) {
          console.warn('[KitchenDashboard] Item duplicado ignorado:', newItem.id);
          return prevItems;
        }
        console.log('[KitchenDashboard] Item adicionado à lista:', newItem.id);
        setNewItemsCount(prev => prev + 1);
        playNotificationSound();
        return [...prevItems, newItem];
      });
    });

    // Evento: Atualização de status
    socket.on('kitchen_status_update', ({ itemId, status, responsavel }: { itemId: string; status: CozinhaItemStatus; responsavel: string }) => {
      console.log(`[KitchenDashboard] Status atualizado: ${itemId} -> ${status}`);
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, status, responsavel, updated_at: new Date().toISOString() }
            : item
        )
      );
    });

    // Evento: Solicitação para recarregar lista
    socket.on('kitchen_refresh_items', () => {
      console.log('[KitchenDashboard] Solicitada atualização da lista');
      loadCozinhaItems();
    });

    return () => {
      socket.emit('leave_kitchen');
      socket.disconnect();
    };
  }, []);

  // Reproduzir som de notificação
  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => {
        console.log('[KitchenDashboard] Não foi possível reproduzir som de notificação:', e.message);
      });
    }
  };

  // Limpar contador de novos itens quando usuário visualizar
  const clearNewItemsCount = () => {
    setNewItemsCount(0);
  };
  const loadCozinhaItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.prioridade) params.append('prioridade', filter.prioridade);
      if (filter.responsavel) params.append('responsavel', filter.responsavel);
      
      const response = await fetch(`/api/cozinha/items?${params}`, {
        headers: {
          Authorization: `Bearer ${token || ''}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        console.error('Erro ao carregar itens da cozinha');
      }
    } catch (error) {
      console.error('Erro ao carregar itens da cozinha:', error);
    } finally {
      setLoading(false);
    }
  };

  // Atualizar status de item
  const updateItemStatus = async (itemId: string, newStatus: CozinhaItemStatus, responsavel: string = 'Sistema') => {
    try {
      const response = await fetch(`/api/cozinha/items/${itemId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          status: newStatus,
          responsavel,
        }),
      });

      if (response.ok) {
        // Recarregar lista
        await loadCozinhaItems();
      } else {
        alert('Erro ao atualizar status do item');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do item');
    }
  };

  // Carregar itens na inicialização e quando filtros mudam
  useEffect(() => {
    loadCozinhaItems();
  }, [filter]);

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadCozinhaItems();
    }, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  // Helper para determinar cor do status
  const getStatusColor = (status: CozinhaItemStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'em_preparo': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pronto': return 'bg-green-100 text-green-800 border-green-300';
      case 'entregue': return 'bg-gray-100 text-gray-600 border-gray-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  // Helper para determinar ícone do status
  const getStatusIcon = (status: CozinhaItemStatus) => {
    switch (status) {
      case 'pending': return Clock;
      case 'em_preparo': return ChefHat;
      case 'pronto': return CheckCircle;
      case 'entregue': return Pause;
      default: return AlertCircle;
    }
  };

  // Helper para próximo status
  const getNextStatus = (currentStatus: CozinhaItemStatus): CozinhaItemStatus | null => {
    switch (currentStatus) {
      case 'pending': return 'em_preparo';
      case 'em_preparo': return 'pronto';
      case 'pronto': return 'entregue';
      case 'entregue': return null;
      default: return null;
    }
  };

  const getNextStatusLabel = (currentStatus: CozinhaItemStatus): string => {
    switch (currentStatus) {
      case 'pending': return 'Iniciar Preparo';
      case 'em_preparo': return 'Marcar Pronto';
      case 'pronto': return 'Marcar Entregue';
      default: return '';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Painel da Cozinha</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Indicador de conexão */}
          {io && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium ${
              connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              {connected ? 'Online' : 'Offline'}
            </div>
          )}
          
          {/* Contador de novos itens */}
          {newItemsCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium">
              <Bell className="w-4 h-4" />
              {newItemsCount} novo{newItemsCount > 1 ? 's' : ''}
              <button 
                onClick={clearNewItemsCount}
                className="ml-1 text-orange-600 hover:text-orange-800"
              >
                ×
              </button>
            </div>
          )}
          
          <button
            onClick={() => { loadCozinhaItems(); clearNewItemsCount(); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value as CozinhaItemStatus || undefined }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="">Todos os Status</option>
              <option value="pending">Pendente</option>
              <option value="em_preparo">Em Preparo</option>
              <option value="pronto">Pronto</option>
              <option value="entregue">Entregue</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
            <select
              value={filter.prioridade || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, prioridade: e.target.value as CozinhaPrioridade || undefined }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="">Todas as Prioridades</option>
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
            <input
              type="text"
              value={filter.responsavel || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, responsavel: e.target.value || undefined }))}
              placeholder="Nome do responsável"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Lista de Itens */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500 font-medium">Carregando itens da cozinha...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-500 mb-2">Nenhum item na cozinha</h3>
          <p className="text-gray-400">Aguardando novos pedidos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => {
            const StatusIcon = getStatusIcon(item.status);
            const nextStatus = getNextStatus(item.status);
            const nextStatusLabel = getNextStatusLabel(item.status);
            
            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl shadow-sm border-2 p-4 transition-all duration-200 hover:shadow-md ${
                  item.prioridade === 'urgente' ? 'ring-2 ring-red-300 bg-red-50' : ''
                }`}
              >
                {/* Header do Card */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(item.status)}`}>
                    <StatusIcon className="w-3 h-3 inline mr-1" />
                    {item.status.replace('_', ' ').toUpperCase()}
                  </div>
                  {item.prioridade === 'urgente' && (
                    <div className="flex items-center text-red-600 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      URGENTE
                    </div>
                  )}
                </div>

                {/* Produto */}
                <div className="mb-3">
                  <h4 className="font-bold text-gray-900 mb-1">
                    {item.product_name || `Produto ${item.product_id}`}
                  </h4>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Qtd:</span> {item.quantidade}
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Comanda:</span> {item.comanda_customer_name || item.comanda_id}
                  </div>
                </div>

                {/* Observações */}
                {item.observacao && (
                  <div className="mb-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start gap-2">
                      <MessageCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <strong className="block font-medium">Observações:</strong>
                        {item.observacao}
                      </div>
                    </div>
                  </div>
                )}

                {/* Responsável */}
                {item.responsavel && (
                  <div className="text-xs text-gray-500 mb-3">
                    <strong>Responsável:</strong> {item.responsavel}
                  </div>
                )}

                {/* Tempo */}
                <div className="text-xs text-gray-400 mb-3">
                  Criado em: {new Date(item.created_at).toLocaleString('pt-BR')}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {nextStatus && (
                    <button
                      onClick={() => updateItemStatus(item.id, nextStatus, 'Cozinheiro')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                    >
                      {nextStatusLabel}
                    </button>
                  )}
                  
                  {item.status === 'entregue' && (
                    <div className="flex-1 bg-gray-100 text-gray-500 text-sm font-medium py-2 px-3 rounded-lg text-center">
                      Finalizado
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Audio para notificações (som de notificação simples) */}
      <audio 
        ref={audioRef} 
        preload="auto"
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjV+M3Kf9/vL94EHhO77xyLAhPB4hfaHhYiKhXmFbnmMcH1wdnJ6cnJuCUNmOEI" 
      />
    </div>
  );
};

export default KitchenDashboard;