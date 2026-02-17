// socketConfig.js
// Configuração do Socket.IO para notificações em tempo real da cozinha
const { Server } = require('socket.io');

let io = null;

const configureSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Cliente conectado: ${socket.id}`);

    // Cliente se junta à sala da cozinha
    socket.on('join_kitchen', () => {
      socket.join('kitchen');
      console.log(`[Socket] Cliente ${socket.id} entrou na sala da cozinha`);
    });

    // Cliente sai da sala da cozinha
    socket.on('leave_kitchen', () => {
      socket.leave('kitchen');
      console.log(`[Socket] Cliente ${socket.id} saiu da sala da cozinha`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
};

// Funções para emitir eventos para a cozinha
const notifyKitchen = {
  newItem: (item) => {
    if (io) {
      console.log('[Socket] Enviando notificação de novo item para cozinha:', item.id);
      io.to('kitchen').emit('kitchen_new_item', item);
    }
  },

  statusUpdate: (itemId, status, responsavel) => {
    if (io) {
      console.log(`[Socket] Enviando atualização de status para cozinha: ${itemId} -> ${status}`);
      io.to('kitchen').emit('kitchen_status_update', { itemId, status, responsavel });
    }
  },

  itemUpdate: (item) => {
    if (io) {
      console.log('[Socket] Enviando atualização de item para cozinha:', item.id);
      io.to('kitchen').emit('kitchen_item_update', item);
    }
  },

  refreshItems: () => {
    if (io) {
      console.log('[Socket] Solicitando refresh da lista de itens da cozinha');
      io.to('kitchen').emit('kitchen_refresh_items');
    }
  }
};

module.exports = {
  configureSocket,
  notifyKitchen,
  getIO: () => io
};