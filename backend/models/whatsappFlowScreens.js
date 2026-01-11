'use strict';

/**
 * Define as telas do fluxo e suas respostas
 * Cada tela contém os dados que serão enviados para o aplicativo
 */

/**
 * Mapeamento de categorias com seus product_retailer_ids
 * Sincronizado com o JSON do Flow Meta e o catálogo em files/csvs/catalog_products_2026-01-05.csv
 */
const CATEGORY_PRODUCTS = {
  xis: {
    name: 'Xis',
    products: [
      { id: '410100', name: 'Xis Bacon Coração' },
      { id: '410101', name: 'Xis Salada' },
      { id: '410102', name: 'Xis Frango' },
      { id: '410103', name: 'Xis Bacon' },
      { id: '410104', name: 'Xis Calabresa' },
      { id: '410105', name: 'Xis Coração' },
      { id: '410106', name: 'Xis Frango Bacon' },
      { id: '410107', name: 'Xis Duplo Burger' },
      { id: '410108', name: 'Xis Dois Hamburguers' },
      { id: '410109', name: 'Xis Calabresa Coração' },
      { id: '410111', name: 'Xis Duplo Bacon' },
      { id: '410112', name: 'Xis Magrão' },
      { id: '410113', name: 'Xis Hamburguer Ovo' },
      { id: '410114', name: 'Hamburguer' },
      { id: '410115', name: 'Xis Tudo' },
      { id: '410116', name: 'Xis Frango Coração' },
      { id: '410117', name: 'Xis Frango Calabresa' },
      { id: '410118', name: 'Xis Egg' },
      { id: '410119', name: 'Xis Bacon Calabresa' },
      { id: '410120', name: 'Xis Frango Cheddar' },
      { id: '410121', name: 'Xis Frango Catupiry' },
      { id: '410122', name: 'Xis Frango Acebolado' },
    ],
  },
  dogs: {
    name: 'Hot-Dogs',
    products: [
      { id: '410200', name: 'Cachorro Bacon Coração' },
      { id: '410201', name: 'Cachorro Simples' },
      { id: '410202', name: 'Cachorro Duplo' },
      { id: '410203', name: 'Cachorro Especial' },
      { id: '410204', name: 'Cachorro Duplo Especial' },
      { id: '410205', name: 'Cachorro Coração' },
      { id: '410206', name: 'Cachorro Frango' },
      { id: '410207', name: 'Cachorro 2 Queijos' },
      { id: '410208', name: 'Cachorro Coração Frango' },
      { id: '410209', name: 'Cachorro Frango Calabresa' },
      { id: '410211', name: 'Cachorro Calabresa' },
      { id: '410212', name: 'Cachorro Frango Bacon' },
      { id: '410213', name: 'Cachorro Bacon' },
      { id: '410214', name: 'Cachorro Calabresa Coração' },
      { id: '410215', name: 'Cachorro Queijo Bacon Ovo' },
      { id: '410216', name: 'Cachorro 3 Queijos' },
      { id: '410217', name: 'Cachorro 4 Queijos' },
    ],
  },
  mistos: {
    name: 'Torradas',
    products: [
      { id: '410301', name: 'Torrada Simples' },
      { id: '410302', name: 'Torrada Americana' },
      { id: '410303', name: 'Torrada Americana Hamburguer' },
      { id: '410304', name: 'Torrada Americana Bacon' },
      { id: '410305', name: 'Torrada Americana Coração' },
      { id: '410306', name: 'Torrada Americana Calabresa' },
      { id: '410307', name: 'Torrada Americana Frango' },
      { id: '410308', name: 'Torrada Dupla' },
      { id: '410309', name: 'Torrada Frango' },
    ],
  },
  pasteis: {
    name: 'Pastéis',
    products: [
      { id: '410400', name: 'Pastel Calabresa' },
      { id: '410401', name: 'Pastel Frango' },
      { id: '410402', name: 'Pastel Carne' },
      { id: '410403', name: 'Pastel Queijo Presunto' },
      { id: '410404', name: 'Pastel Queijo Coração' },
      { id: '410405', name: 'Pastel Queijo Milho' },
      { id: '410406', name: 'Pastel Queijo Frango' },
      { id: '410407', name: 'Pastel Queijo' },
      { id: '410408', name: 'Pastel Frango Calabresa' },
      { id: '410409', name: 'Enroladinho Salsicha' },
      { id: '410411', name: 'Pastel Queijo Calabresa' },
      { id: '410412', name: 'Pastel Queijo Bacon' },
      { id: '410413', name: 'Pastel Carne Bacon' },
      { id: '410414', name: 'Pastel Coração' },
      { id: '410415', name: 'Pastel Carne Queijo' },
      { id: '410416', name: 'Pastel Baton' },
      { id: '410417', name: 'Pastel Queijo Palmito' },
      { id: '410418', name: 'Pastel Frango Coração' },
    ],
  },
  sanduiches: {
    name: 'Sanduíches',
    products: [
      { id: '410501', name: 'Sanduíche Especial' },
    ],
  },
  pizzas: {
    name: 'Pizzas',
    products: [
      { id: '411000', name: 'Pizza 4 Queijos' },
      { id: '411001', name: 'Pizza Presunto' },
      { id: '411002', name: 'Pizza Muçarela' },
      { id: '411003', name: 'Pizza Portuguesa' },
      { id: '411004', name: 'Pizza Frango Catupiry' },
      { id: '411005', name: 'Pizza Frango Cheddar' },
      { id: '411006', name: 'Pizza Calabresa' },
      { id: '411007', name: 'Pizza Coração' },
      { id: '411008', name: 'Pizza Bacon' },
      { id: '411009', name: 'Pizza Atum' },
      { id: '411011', name: 'Pizza Margherita' },
      { id: '411012', name: 'Pizza Bacon Milho' },
      { id: '411013', name: 'Pizza Dois Sabores' },
      { id: '411014', name: 'Pizza Alho e Óleo' },
      { id: '411015', name: 'Pizza Brócolis Bacon' },
      { id: '411016', name: 'Pizza Americana' },
      { id: '411017', name: 'Pizza Calabresa Cheddar' },
      { id: '411018', name: 'Pizza Frango Bacon' },
    ],
  },
  cestos: {
    name: 'Picados',
    products: [
      { id: '410601', name: 'Picado Pequeno' },
      { id: '410602', name: 'Picado Médio' },
      { id: '410603', name: 'Picado Médio Especial' },
    ],
  },
  porcoes: {
    name: 'Porções',
    products: [
      { id: '410700', name: 'Porção Ovos de Codorna 100g' },
      { id: '410701', name: 'Porção Fritas 500g' },
      { id: '410702', name: 'Porção Coração 300g' },
      { id: '410703', name: 'Porção Calabresa 300g' },
      { id: '410704', name: 'Porção Frango 300g' },
      { id: '410705', name: 'Porção Bacon 200g' },
      { id: '410706', name: 'Porção Anéis de Cebola' },
      { id: '410707', name: 'Porção Queijo 100g' },
      { id: '410708', name: 'Porção Pepino 100g' },
      { id: '410709', name: 'Porção Azeitonas 100g' },
      { id: '410711', name: 'Porção Salamé 100g' },
      { id: '410712', name: 'Porção Palmito 100g' },
    ],
  },
};

const SCREEN_RESPONSES = {
  START: {
    screen: 'START',
    data: {
      message: 'Bem-vindo! Clique em Continuar para acessar o menu.',
      action: 'start',
    },
  },
  OPCAO: {
    screen: 'OPCAO',
    data: {
      title: 'Opções do pedido',
      message: 'Escolha como quer receber seu pedido e observações.',
      fields: {
        observ: 'Observações do pedido',
        opt_pedido: 'Forma de recebimento',
      },
      action: 'select_option',
    },
  },
  TELE_ENTREGA_FORM: {
    screen: 'TELE_ENTREGA',
    data: {
      title: 'Pedido para tele-entrega',
      message: 'Informe seu endereço e a forma de pagamento.',
      fields: {
        endereco: 'Seu endereço',
        opt_pay: 'Forma de pagamento',
      },
      action: 'confirm_delivery',
    },
  },
  MENU_CATALOGO: {
    screen: 'MENU_CATALOGO',
    data: {
      items: [
        { id: 'burguer', name: 'Hambúrgueres', emoji: '🍔' },
        { id: 'pizza', name: 'Pizzas', emoji: '🍕' },
        { id: 'bebidas', name: 'Bebidas', emoji: '🥤' },
        { id: 'sobremesa', name: 'Sobremesas', emoji: '🍰' },
      ],
      action: 'select_category',
    },
  },
  PEDIDO: {
    screen: 'PEDIDO',
    data: {
      title: 'Seu Pedido',
      message: 'Clique em Finalizar para completar seu pedido',
      subtotal: 0,
      delivery_fee: 5.0,
      action: 'confirm_order',
    },
  },
  ATENDENTE: {
    screen: 'ATENDENTE',
    data: {
      title: 'Atendimento Personalizado',
      message: 'Um atendente irá falar com você em breve.',
      support_phone: '55 54 9 26350135',
      action: 'support',
    },
  },
  INFO_PEDIDO: {
    screen: 'INFO_PEDIDO',
    data: {
      title: 'Informações do Seu Pedido',
      status: 'processing',
      order_id: '',
      estimated_time: '30-45 minutos',
      items_count: 0,
      action: 'order_info',
    },
  },
  SUCCESS: {
    screen: 'SUCCESS',
    data: {
      response_json: {
        flow_token: 'REPLACE_FLOW_TOKEN',
        order_id: 'ORDER_ID',
        total_amount: 0,
      },
    },
  },
};

/**
 * Define a lógica de navegação entre telas
 * Retorna a próxima tela baseada na ação do usuário
 */
class FlowScreenNavigator {
  constructor() {
    this.screens = SCREEN_RESPONSES;
    this.userState = new Map(); // sessionId -> { screen, data }
  }

  /**
   * Inicia um novo fluxo
   */
  startFlow(sessionId) {
    this.userState.set(sessionId, {
      screen: 'START',
      data: this.screens.START.data,
      history: ['START'],
    });
    return this.screens.START;
  }

  /**
   * Inicia o fluxo de opções do pedido (quando recebe order do catálogo)
   */
  startOrderFlow(sessionId) {
    this.userState.set(sessionId, {
      screen: 'OPCAO',
      data: this.screens.OPCAO.data,
      history: ['OPCAO'],
    });
    return this.screens.OPCAO;
  }

  /**
   * Navega para a próxima tela baseada em ação e contexto
   */
  navigateToScreen(sessionId, action, payload = {}) {
    const state = this.userState.get(sessionId) || {};
    const currentScreen = state.screen || 'START';
    let nextScreen = currentScreen;

    console.log(`[Flow] Navegação: ${currentScreen} -> ação: ${action}`);

    // Lógica de navegação baseada na ação
    switch (action) {
      case 'start':
      case 'home':
        // Por enquanto, ficar na mesma tela (MENU_CATALOGO não existe no flow ainda)
        nextScreen = currentScreen;
        break;

      case 'OPCAO':
      case 'select_option':
        // Iniciar fluxo de opções do pedido
        nextScreen = 'OPCAO';
        break;

      case 'MENU_CATALOGO':
      case 'menu':
        nextScreen = 'MENU_CATALOGO';
        break;

      case 'PEDIDO':
      case 'select_category':
        // Usuário selecionou uma categoria
        nextScreen = 'PEDIDO';
        break;

      case 'INFO_PEDIDO':
      case 'order_info':
        // Usuário pediu info do pedido
        nextScreen = 'INFO_PEDIDO';
        break;

      // Fluxo de pedido (quando recebe order)
      case 'TELE_ENTREGA':
      case 'RETIRAR':
        // Usuário escolheu forma de recebimento
        if (action === 'TELE_ENTREGA') {
          // Se escolheu tele-entrega, vai para formulário de endereço
          nextScreen = 'TELE_ENTREGA_FORM';
        } else if (action === 'RETIRAR') {
          // Se escolheu retirar, vai para sucesso
          nextScreen = 'SUCCESS';
        }
        break;

      case 'confirm_order':
        // Usuário confirmou o pedido
        nextScreen = 'TELE_ENTREGA';
        break;

      case 'confirm_delivery':
        // Usuário confirmou entrega
        if (currentScreen === 'TELE_ENTREGA_FORM') {
          // Vindo do formulário de tele-entrega
          nextScreen = 'SUCCESS';
        } else {
          // Fallback
          nextScreen = 'INFO_PEDIDO';
        }
        break;

      case 'ATENDENTE':
      case 'contact_support':
        // Usuário pediu atendimento
        nextScreen = 'ATENDENTE';
        break;

      case 'support':
        // Usuário em atendimento
        nextScreen = 'SUCCESS';
        break;

      case 'SUCCESS':
      case 'exit':
      case 'success':
        nextScreen = 'SUCCESS';
        break;

      case 'back':
        // Voltar para a tela anterior
        if (state.history && state.history.length > 1) {
          state.history.pop(); // Remove tela atual
          nextScreen = state.history[state.history.length - 1];
        }
        break;

      default:
        console.warn(`[Flow] Ação desconhecida: ${action}`);
        nextScreen = currentScreen;
    }

    // Atualizar estado do usuário
    if (nextScreen !== currentScreen) {
      const history = state.history || [currentScreen];
      if (!history.includes(nextScreen)) {
        history.push(nextScreen);
      }
      this.userState.set(sessionId, {
        screen: nextScreen,
        data: { ...this.screens[nextScreen].data, ...payload },
        history,
      });
    }

    console.log(`[Flow] Nova tela: ${nextScreen}`);
    return this.getScreenResponse(nextScreen, payload);
  }

  /**
   * Retorna a resposta formatada de uma tela
   */
  getScreenResponse(screenName, payload = {}) {
    const screen = this.screens[screenName];
    if (!screen) {
      console.warn(`[Flow] Tela não encontrada: ${screenName}`);
      return this.screens.START;
    }

    return {
      screen: screen.screen,
      data: { ...screen.data, ...payload },
    };
  }

  /**
   * Processa ação do usuário no fluxo
   */
  processUserAction(sessionId, userPayload) {
    const action = userPayload.action || 'start';
    const payload = userPayload.payload || {};

    const response = this.navigateToScreen(sessionId, action, payload);
    return response;
  }

  /**
   * Limpa o estado do usuário
   */
  clearUserState(sessionId) {
    this.userState.delete(sessionId);
  }

  /**
   * Gera o payload do template de catálogo MPM (Multi-Product Messages)
   * Baseado na categoria selecionada pelo usuário
   * 
   * TEMPORÁRIO (24h): Usa template fixo 'catalogo_xis' para todas as categorias
   * TODO: Criar templates individuais catalogo_dogs, catalogo_pizzas, etc
   */
  generateCatalogTemplatePayload(phoneNumber, categoryId) {
    const categoryData = CATEGORY_PRODUCTS[categoryId];

    if (!categoryData) {
      console.warn(`[Flow] Categoria não encontrada: ${categoryId}`);
      return null;
    }

    // Construir lista de produtos
    const productItems = categoryData.products.map((product) => ({
      product_retailer_id: product.id,
    }));

    // TEMPORÁRIO: Usar template fixo para todas as categorias
    const templateName = 'catalogo_xis';
    const languageCode = 'en';

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components: [
          {
            type: 'button',
            sub_type: 'mpm',
            index: 0,
            parameters: [
              {
                type: 'action',
                action: {
                  thumbnail_product_retailer_id: productItems[0].product_retailer_id,
                  sections: [
                    {
                      title: categoryData.name,
                      product_items: productItems,
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    console.log(`[Flow] Catálogo gerado para: ${categoryData.name}`);
    console.log(`[Flow] Template name: ${templateName} (temporário para todas as categorias)`);
    console.log(`[Flow] Telefone: ${phoneNumber}`);
    console.log(`[Flow] Produtos: ${productItems.length} itens`);
    console.log(`[Flow] Idioma: ${languageCode}`);
    return payload;
  }

  /**
   * Processa dados do formulário OPCAO quando cliente escolhe RETIRAR
   * Captura: telefone, nome, pedido, observações
   */
  processRetiroData(phoneNumber, formData, orderItems = []) {
    const result = {
      tipo_pedido: 'RETIRAR',
      telefone: phoneNumber,
      nome: formData?.nome || 'Sem nome',
      observacoes: formData?.observ || '',
      items: orderItems,
      timestamp: new Date().toISOString(),
    };
    
    console.log(`[Flow] Pedido RETIRAR processado:`);
    console.log(`  - Telefone: ${result.telefone}`);
    console.log(`  - Nome: ${result.nome}`);
    console.log(`  - Observações: ${result.observacoes}`);
    console.log(`  - Itens: ${orderItems.length}`);
    
    return result;
  }

  /**
   * Processa dados do formulário TELE_ENTREGA
   * Captura: endereço, forma de pagamento, observações anteriores
   */
  processTeleEntregaData(phoneNumber, formData, previousData = {}) {
    const result = {
      tipo_pedido: 'TELE_ENTREGA',
      telefone: phoneNumber,
      observacoes: previousData?.observacoes || '',
      endereco: formData?.endereco || '',
      forma_pagamento: formData?.opt_pay || '',
      timestamp: new Date().toISOString(),
    };
    
    console.log(`[Flow] Pedido TELE_ENTREGA processado:`);
    console.log(`  - Telefone: ${result.telefone}`);
    console.log(`  - Endereço: ${result.endereco}`);
    console.log(`  - Forma de pagamento: ${result.forma_pagamento}`);
    console.log(`  - Observações: ${result.observacoes}`);
    
    return result;
  }

  /**
   * Obtém o estado atual do usuário
   */
  getUserState(sessionId) {
    return this.userState.get(sessionId);
  }
}

module.exports = {
  SCREEN_RESPONSES,
  FlowScreenNavigator,
  CATEGORY_PRODUCTS,
  createFlowScreenNavigator: () => new FlowScreenNavigator(),
};
