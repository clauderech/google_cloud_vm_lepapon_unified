'use strict';

const WebSocket = require('ws');
const { EventEmitter } = require('events');

/**
 * FrontendBroadcaster - Servidor WebSocket que notifica clientes frontend
 * de novos pedidos LePapon em tempo real
 */
class FrontendBroadcaster extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.port = options.port || 3002;
    this.wss = null;
    this.clients = new Set();
    this.logger = options.logger || console;
  }

  /**
   * Inicia servidor WebSocket
   */
  start() {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocket.Server({ port: this.port });

        this.wss.on('connection', (ws) => {
          this.logger.info(`[Broadcaster] Cliente conectado. Total: ${this.wss.clients.size}`);
          
          this.clients.add(ws);

          // Enviar confirmação de conexão
          ws.send(JSON.stringify({
            type: 'connection_established',
            timestamp: new Date().toISOString(),
            message: 'Conectado ao servidor de notificações'
          }));

          // Keepalive (ping/pong)
          ws.isAlive = true;
          ws.on('pong', () => {
            ws.isAlive = true;
          });

          // Mensagens recebidas (não esperamos nada, mas log se receber)
          ws.on('message', (data) => {
            try {
              const msg = JSON.parse(data);
              this.logger.debug('[Broadcaster] Mensagem do cliente:', msg);
            } catch (err) {
              this.logger.warn('[Broadcaster] Erro ao parsear mensagem:', err.message);
            }
          });

          // Desconexão
          ws.on('close', () => {
            this.clients.delete(ws);
            this.logger.info(`[Broadcaster] Cliente desconectado. Total: ${this.wss.clients.size}`);
          });

          // Erros
          ws.on('error', (error) => {
            this.logger.error('[Broadcaster] Erro no WebSocket:', error.message);
            this.clients.delete(ws);
          });
        });

        // Keepalive interval (ping a cada 30s)
        this.pingInterval = setInterval(() => {
          this.clients.forEach((ws) => {
            if (!ws.isAlive) {
              ws.terminate();
              this.clients.delete(ws);
              return;
            }
            ws.isAlive = false;
            ws.ping(() => {});
          });
        }, 30000);

        this.wss.on('error', (error) => {
          this.logger.error('[Broadcaster] Erro no servidor WebSocket:', error.message);
          reject(error);
        });

        this.logger.info(`[Broadcaster] Servidor WebSocket iniciado na porta ${this.port}`);
        resolve();
      } catch (error) {
        this.logger.error('[Broadcaster] Erro ao iniciar:', error.message);
        reject(error);
      }
    });
  }

  /**
   * Notifica novo pedido LePapon para todos clientes conectados
   */
  broadcastNewOrder(orderId, orderData = {}) {
    const payload = {
      type: 'new_lepapon_order',
      orderId,
      data: orderData,
      timestamp: new Date().toISOString()
    };

    const message = JSON.stringify(payload);
    let sentCount = 0;

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message, (error) => {
          if (error) {
            this.logger.error(`[Broadcaster] Erro ao enviar para cliente: ${error.message}`);
          } else {
            sentCount++;
          }
        });
      }
    });

    this.logger.info(`[Broadcaster] Notificação enviada para ${sentCount}/${this.clients.size} clientes. Pedido: ${orderId}`);
    return sentCount;
  }

  /**
   * Notifica atualização de status de pedido
   */
  broadcastOrderStatusUpdate(orderId, newStatus) {
    const payload = {
      type: 'lepapon_order_status_updated',
      orderId,
      status: newStatus,
      timestamp: new Date().toISOString()
    };

    const message = JSON.stringify(payload);
    let sentCount = 0;

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message, (error) => {
          if (!error) sentCount++;
        });
      }
    });

    this.logger.info(`[Broadcaster] Status update enviado para ${sentCount} clientes. Pedido: ${orderId}, Status: ${newStatus}`);
    return sentCount;
  }

  /**
   * Para servidor e fecha todas conexões
   */
  stop() {
    return new Promise((resolve) => {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
      }

      this.clients.forEach((ws) => {
        ws.close(1000, 'Server shutting down');
      });

      if (this.wss) {
        this.wss.close(() => {
          this.logger.info('[Broadcaster] Servidor WebSocket encerrado');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Retorna status do servidor
   */
  getStatus() {
    return {
      isRunning: this.wss !== null,
      port: this.port,
      connectedClients: this.clients.size,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = FrontendBroadcaster;
