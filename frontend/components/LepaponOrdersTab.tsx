import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Package, Phone, Wallet } from 'lucide-react';
import { useLepaponOrders } from '../hooks/useLepaponOrders';
import { Comanda } from '../types';

interface LepaponOrdersTabProps {
  onSelectOrder: (order: Comanda) => void;
  onUpdateOrder: (orderId: number, status: string) => void;
}

/**
 * Componente: Aba de Pedidos LePapon
 * Exibe lista de pedidos recebidos via WebSocket e sincronização em tempo real
 */
export const LepaponOrdersTab: React.FC<LepaponOrdersTabProps> = ({ 
  onSelectOrder, 
  onUpdateOrder 
}) => {
  const {
    orders,
    isConnected,
    isLoading,
    error,
    updateOrderStatus
  } = useLepaponOrders({
    wsUrl: `ws://${window.location.hostname}:3002`,
    apiBaseUrl: '/api',
    autoConnect: true,
    pollInterval: 5000
  });

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const handleSelectOrder = (order: any) => {
    const comanda: Comanda = {
      id: String(order.id),
      customerName: order.customerName || `Session ${order.lepapon_session_id}`,
      openedAt: order.created_at || new Date().toISOString(),
      items: order.items || [],
      total: order.total || 0,
      status: 'open',
      source: 'lepapon',
      lepapon_session_id: order.lepapon_session_id,
      lepapon_order_id: order.lepapon_order_id,
      order_status: order.orderStatus,
      payment_status: order.paymentStatus
    };

    onSelectOrder(comanda);
    setSelectedOrderId(order.id);
  };

  const handleConfirmOrder = async (orderId: number) => {
    const success = await updateOrderStatus(orderId, 'confirmed');
    if (success) {
      onUpdateOrder(orderId, 'confirmed');
      alert('Pedido confirmado!');
    } else {
      alert('Erro ao confirmar pedido');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'ready':
        return <Package className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header com Status de Conexão */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-900 text-lg">Pedidos LePapon</h3>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs font-semibold text-gray-600">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-2 rounded-lg flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Lista de Pedidos */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && orders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Carregando pedidos...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Nenhum pedido pendente</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => handleSelectOrder(order)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedOrderId === order.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {/* Cabeçalho do Pedido */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900">
                        Pedido {order.lepapon_order_id}
                      </h4>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${getStatusColor(order.orderStatus)}`}>
                        {getStatusIcon(order.orderStatus)}
                        {order.orderStatus.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {order.lepapon_session_id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-600">
                      R$ {order.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Itens do Pedido */}
                <div className="space-y-2 mb-3 pb-3 border-b border-gray-200">
                  {order.items?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="text-xs flex justify-between text-gray-700">
                      <span>{item.productName || item.productId}</span>
                      <span className="font-semibold">
                        {item.quantity}x R$ {item.unitPrice?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  ))}
                  {order.items && order.items.length > 3 && (
                    <p className="text-xs text-gray-600 font-semibold">
                      +{order.items.length - 3} itens
                    </p>
                  )}
                </div>

                {/* Status de Pagamento e Ações */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs">
                    <Wallet className="w-3 h-3" />
                    <span className={`px-2 py-1 rounded font-semibold ${
                      order.paymentStatus === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.paymentStatus?.toUpperCase() || 'PENDENTE'}
                    </span>
                  </div>

                  {order.orderStatus === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmOrder(order.id);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1 rounded-lg transition-colors"
                    >
                      Confirmar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LepaponOrdersTab;
