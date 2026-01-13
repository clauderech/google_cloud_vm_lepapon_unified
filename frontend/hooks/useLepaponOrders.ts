import { useState, useEffect, useCallback, useRef } from 'react';

interface LepaponOrder {
  id: number;
  order_id: number;
  customerName: string;
  lepapon_session_id: string;
  lepapon_order_id: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  status: 'open' | 'closed' | 'cancelled';
  paymentStatus: 'pending' | 'approved' | 'rejected' | 'refunded';
  orderStatus: string;
  source: 'lepapon';
  created_at: string;
  updated_at: string;
}

interface UseLepaponOrdersOptions {
  wsUrl?: string;
  apiBaseUrl?: string;
  autoConnect?: boolean;
  pollInterval?: number; // ms
}

/**
 * Hook useLepaponOrders
 * Conecta ao WebSocket do backend para receber notificações de novos pedidos LePapon
 * e sincroniza com API para obter dados completos
 */
export function useLepaponOrders(options: UseLepaponOrdersOptions = {}) {
  const {
    wsUrl = `ws://${window.location.hostname}:3002`,
    apiBaseUrl = '/api',
    autoConnect = true,
    pollInterval = 5000
  } = options;

  const [orders, setOrders] = useState<LepaponOrder[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(Date.now());

  const wsRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Busca pedidos da API
   */
  const fetchLepaponOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        status: 'pending',
        since: String(lastFetchTime),
        limit: '50'
      });

      const response = await fetch(`${apiBaseUrl}/lepapon-orders?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar pedidos: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        // Atualizar ou adicionar pedidos
        setOrders(prevOrders => {
          const newOrders = [...prevOrders];
          
          data.data.forEach((newOrder: LepaponOrder) => {
            const existingIndex = newOrders.findIndex(o => o.id === newOrder.id);
            if (existingIndex >= 0) {
              // Atualizar pedido existente
              newOrders[existingIndex] = newOrder;
            } else {
              // Adicionar novo pedido
              newOrders.unshift(newOrder);
            }
          });

          return newOrders;
        });

        setLastFetchTime(Date.now());
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      console.error('[useLepaponOrders] Erro ao buscar pedidos:', errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, lastFetchTime]);

  /**
   * Conecta ao WebSocket do backend
   */
  const connectWebSocket = useCallback(() => {
    try {
      console.log('[useLepaponOrders] Conectando ao WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);

      ws.addEventListener('open', () => {
        console.log('[useLepaponOrders] WebSocket conectado');
        setIsConnected(true);
        setError(null);
      });

      ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[useLepaponOrders] Mensagem recebida:', message.type);

          // Quando há novo pedido, buscar da API
          if (message.type === 'new_lepapon_order') {
            console.log('[useLepaponOrders] Novo pedido LePapon recebido, sincronizando...');
            fetchLepaponOrders();
          }
        } catch (err) {
          console.error('[useLepaponOrders] Erro ao processar mensagem:', err);
        }
      });

      ws.addEventListener('close', () => {
        console.log('[useLepaponOrders] WebSocket desconectado');
        setIsConnected(false);
        
        // Tentar reconectar após 5s
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      });

      ws.addEventListener('error', (event) => {
        console.error('[useLepaponOrders] Erro no WebSocket:', event);
        setError('Erro na conexão WebSocket');
      });

      wsRef.current = ws;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao conectar';
      setError(errorMsg);
      console.error('[useLepaponOrders] Erro:', errorMsg);
    }
  }, [wsUrl, fetchLepaponOrders]);

  /**
   * Atualiza status de um pedido
   */
  const updateOrderStatus = useCallback(
    async (orderId: number, status: string, paymentStatus?: string) => {
      try {
        const response = await fetch(`${apiBaseUrl}/lepapon-orders/${orderId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status,
            payment_status: paymentStatus
          })
        });

        if (!response.ok) {
          throw new Error(`Erro ao atualizar: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          // Atualizar estado local
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId
                ? { ...order, orderStatus: status }
                : order
            )
          );
        }

        return data.success;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMsg);
        console.error('[useLepaponOrders] Erro ao atualizar:', errorMsg);
        return false;
      }
    },
    [apiBaseUrl]
  );

  /**
   * Inicialização e limpeza
   */
  useEffect(() => {
    if (!autoConnect) return;

    // Conectar ao WebSocket
    connectWebSocket();

    // Buscar pedidos iniciais
    fetchLepaponOrders();

    // Setup polling para sincronização periódica
    pollTimerRef.current = setInterval(() => {
      fetchLepaponOrders();
    }, pollInterval);

    // Cleanup
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [autoConnect, connectWebSocket, fetchLepaponOrders, pollInterval]);

  return {
    orders,
    isConnected,
    isLoading,
    error,
    fetchLepaponOrders,
    updateOrderStatus,
    connectWebSocket
  };
}
