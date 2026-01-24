import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  X,
  ChevronRight,
  BookOpen,
  Video,
  MessageCircle,
  FileText,
  Lightbulb,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  CreditCard,
  BarChart3,
  Settings,
  Keyboard
} from 'lucide-react';

interface HelpMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpTopic {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  content: string[];
  quickTips?: string[];
}

const HelpMenu: React.FC<HelpMenuProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);

  const helpTopics: HelpTopic[] = [
    {
      id: 'getting-started',
      title: 'Primeiros Passos',
      icon: BookOpen,
      description: 'Como começar a usar o sistema',
      content: [
        '1. Faça login com seu usuário e senha',
        '2. Configure seus fornecedores em "Fornecedores"',
        '3. Cadastre seus insumos (matérias-primas)',
        '4. Crie suas receitas de pratos e drinks',
        '5. Cadastre seus clientes frequentes',
        '6. Abra o caixa e comece a vender!'
      ],
      quickTips: [
        'Comece cadastrando os insumos mais usados',
        'Use categorias para organizar melhor',
        'Configure o estoque mínimo de cada insumo'
      ]
    },
    {
      id: 'pdv',
      title: 'PDV - Vendas',
      icon: ShoppingCart,
      description: 'Como usar o ponto de venda',
      content: [
        '**Venda Rápida**: Para atendimento balcão/delivery',
        '- Selecione os produtos no cardápio',
        '- (Opcional) Escolha o cliente para fidelidade',
        '- Clique em "Finalizar Venda Rápida"',
        '',
        '**Comandas**: Para mesas e atendimento demorado',
        '- Abra uma comanda com nome/mesa',
        '- Adicione produtos conforme pedidos',
        '- Salve várias vezes se necessário',
        '- Feche a conta quando cliente for pagar'
      ],
      quickTips: [
        'Use Comandas para mesas, Venda Rápida para balcão',
        'Verifique o estoque antes de confirmar',
        'Cadastre clientes para ganhar pontos de fidelidade'
      ]
    },
    {
      id: 'inventory',
      title: 'Gestão de Estoque',
      icon: Package,
      description: 'Controle de insumos e receitas',
      content: [
        '**Insumos**: Produtos que você COMPRA',
        '- Cadastre com nome, custo, fornecedor',
        '- Defina estoque mínimo e máximo',
        '- Sistema alerta quando estiver baixo',
        '',
        '**Pratos/Drinks**: Produtos que você VENDE',
        '- Cadastre com nome, preço de venda',
        '- Monte a receita (ficha técnica)',
        '- Estoque calculado automaticamente',
        '',
        '**Exemplo de Receita - X-Burger:**',
        '- Pão: 1 un',
        '- Carne: 0.15 kg',
        '- Queijo: 0.03 kg',
        '- Alface: 0.05 kg'
      ],
      quickTips: [
        'Seja preciso nas quantidades da receita',
        'Use a mesma unidade de medida sempre',
        'Atualize receitas se mudar ingredientes'
      ]
    },
    {
      id: 'customers',
      title: 'Clientes e Fidelidade',
      icon: Users,
      description: 'Cadastro e programa de pontos',
      content: [
        '**Cadastrar Cliente:**',
        '- Nome, sobrenome e telefone',
        '- Sistema gera ID automático',
        '',
        '**Programa de Fidelidade:**',
        '- Cliente ganha 1 ponto a cada R$ 10',
        '- Pode trocar pontos por desconto:',
        '  • 50 pontos = 5% desconto',
        '  • 100 pontos = 10% desconto',
        '  • 200 pontos = 20% desconto',
        '',
        '**Histórico:**',
        '- Veja todas as compras do cliente',
        '- Total gasto e frequência'
      ],
      quickTips: [
        'Incentive cadastro oferecendo desconto na primeira compra',
        'Lembre clientes sobre seus pontos',
        'Use o histórico para promoções personalizadas'
      ]
    },
    {
      id: 'shopping-list',
      title: 'Lista de Compras',
      icon: FileText,
      description: 'Organize suas compras',
      content: [
        '**Auto Preencher:**',
        '- Clique no botão "Auto Preencher"',
        '- Sistema adiciona itens com estoque baixo',
        '- Quantidade sugerida automaticamente',
        '',
        '**Manual:**',
        '- Selecione o insumo',
        '- Digite a quantidade',
        '- Adicione à lista',
        '',
        '**Finalizar:**',
        '- Marque os itens que vai comprar',
        '- Escolha o fornecedor',
        '- Confirme a entrada',
        '- Estoque atualizado automaticamente'
      ],
      quickTips: [
        'Use auto preencher semanalmente',
        'Agrupe compras por fornecedor',
        'Sempre confirme entrada de notas'
      ]
    },
    {
      id: 'crediario',
      title: 'Crediário (Fiado)',
      icon: CreditCard,
      description: 'Vendas a prazo e parcelas',
      content: [
        '**Criar Crediário:**',
        '- Selecione o cliente (obrigatório)',
        '- Informe valor total e parcelas',
        '- Defina data primeiro vencimento',
        '- Configure taxa de juros (opcional)',
        '',
        '**Acompanhar:**',
        '- Filtre por status (Ativo/Vencido/Pago)',
        '- Veja parcelas a vencer',
        '- Alertas automáticos',
        '',
        '**Registrar Pagamento:**',
        '- Clique em ver detalhes',
        '- Clique em "Pagar" na parcela',
        '- Sistema calcula juros/multa automaticamente',
        '- Confirme o pagamento'
      ],
      quickTips: [
        'Use apenas para clientes conhecidos',
        'Configure juros adequados (ex: 2% ao mês)',
        'Acompanhe vencimentos diariamente',
        'Cobre pontualmente'
      ]
    },
    {
      id: 'financial',
      title: 'Controle Financeiro',
      icon: TrendingUp,
      description: 'Daily Assets e análises',
      content: [
        '**Daily Assets (Ativos Diários):**',
        '- Atualizado automaticamente',
        '- Receitas por forma de pagamento',
        '- Despesas (compras + operacionais)',
        '- Saldo líquido do dia',
        '',
        '**Gráficos:**',
        '- Evolução do saldo',
        '- Receitas vs Despesas',
        '- Formas de pagamento',
        '',
        '**Métricas:**',
        '- Ticket médio',
        '- Número de vendas',
        '- Itens vendidos'
      ],
      quickTips: [
        'Consulte diariamente',
        'Compare com dias anteriores',
        'Identifique dias de melhor performance'
      ]
    },
    {
      id: 'cash-register',
      title: 'Caixa',
      icon: DollarSign,
      description: 'Abertura e fechamento',
      content: [
        '**Abertura (Início do Dia):**',
        '- Informe valor inicial (troco)',
        '- Digite quem está abrindo',
        '- Clique em "Abrir Caixa"',
        '',
        '**Durante o Expediente:**',
        '- Vendas em dinheiro são registradas',
        '- Valor esperado calculado automaticamente',
        '',
        '**Fechamento (Fim do Dia):**',
        '- Conte o dinheiro físico',
        '- Informe o valor contado',
        '- Sistema mostra diferença',
        '- Registre observações se necessário'
      ],
      quickTips: [
        'Abra o caixa no início do expediente',
        'Feche sempre ao final do dia',
        'Investigue diferenças imediatamente',
        'Nunca misture dinheiro pessoal'
      ]
    },
    {
      id: 'reports',
      title: 'Relatórios',
      icon: BarChart3,
      description: 'Análises e insights',
      content: [
        '**Tipos Disponíveis:**',
        '',
        '1. Relatório Mensal',
        '   - Resumo completo do mês',
        '   - Top 10 produtos',
        '   - Lucro líquido',
        '',
        '2. Produtos Mais Vendidos',
        '   - Ranking por receita',
        '   - Quantidade vendida',
        '',
        '3. Estoque Crítico',
        '   - Itens abaixo do mínimo',
        '   - Urgência',
        '',
        '4. Lucratividade',
        '   - Margem por produto',
        '   - Performance últimos 30 dias'
      ],
      quickTips: [
        'Gere relatórios mensalmente',
        'Use para tomar decisões',
        'Compare meses diferentes',
        'Identifique produtos lucrativos'
      ]
    },
    {
      id: 'ai-insights',
      title: 'Consultor IA',
      icon: Lightbulb,
      description: 'Análises inteligentes',
      content: [
        '**Como usar:**',
        '- Acesse o Dashboard',
        '- Clique em "Gerar Análise"',
        '- Aguarde processamento (5-10 seg)',
        '',
        '**O que a IA analisa:**',
        '- Estoque crítico prioritário',
        '- Tendências de vendas',
        '- Produtos em alta/baixa',
        '- Sugestões de ações',
        '',
        '**Exemplos de Sugestões:**',
        '- "Repor urgente: Carne Moída (3 dias)"',
        '- "X-Bacon vendeu 40% mais esta semana"',
        '- "Considere promoção em Refrigerantes"'
      ],
      quickTips: [
        'Use diariamente para insights',
        'Siga as recomendações de reposição',
        'Aproveite tendências identificadas',
        'Clique em "Atualizar" para nova análise'
      ]
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Atalhos de Teclado',
      icon: Keyboard,
      description: 'Acelere sua navegação',
      content: [
        '**Navegação:**',
        'Ctrl + D - Dashboard',
        'Ctrl + V - PDV (Vendas)',
        'Ctrl + E - Estoque',
        'Ctrl + C - Clientes',
        'Ctrl + F - Financeiro',
        'Ctrl + R - Relatórios',
        '',
        '**Ações:**',
        'F1 - Abrir Ajuda',
        'ESC - Fechar modal/voltar',
        'Ctrl + S - Salvar (em formulários)',
        '',
        '**PDV:**',
        'F2 - Nova Comanda',
        'F3 - Venda Rápida',
        'F4 - Fechar Conta'
      ],
      quickTips: [
        'Memorize os principais atalhos',
        'Use F1 sempre que tiver dúvida',
        'ESC fecha qualquer modal'
      ]
    },
    {
      id: 'best-practices',
      title: 'Boas Práticas',
      icon: Settings,
      description: 'Dicas para melhor uso',
      content: [
        '**Estoque:**',
        '✓ Cadastre todos os insumos',
        '✓ Defina estoque mínimo realista',
        '✓ Verifique semanalmente',
        '✗ Não deixe sem fornecedor',
        '',
        '**Vendas:**',
        '✓ Use Comandas para mesas',
        '✓ Cadastre clientes frequentes',
        '✓ Feche comandas sempre',
        '✗ Não misture comandas',
        '',
        '**Financeiro:**',
        '✓ Abra/Feche caixa diariamente',
        '✓ Registre todas despesas',
        '✓ Consulte Dashboard sempre',
        '✗ Não misture dinheiro pessoal',
        '',
        '**Segurança:**',
        '✓ Troque senha regularmente',
        '✓ Faça backup do banco',
        '✓ Defina permissões corretas',
        '✗ Não compartilhe senha admin'
      ],
      quickTips: [
        'Consistência é fundamental',
        'Registre tudo no momento que ocorre',
        'Revise dados semanalmente'
      ]
    }
  ];

  const filteredTopics = helpTopics.filter(topic =>
    topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-xl text-white">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Central de Ajuda</h2>
                <p className="text-sm text-blue-100">Tudo que você precisa saber</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar ajuda..."
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/20 backdrop-blur text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Topics List */}
          <div className={`${selectedTopic ? 'hidden md:block' : 'block'} w-full md:w-1/3 border-r border-gray-200 overflow-y-auto`}>
            <div className="p-4 space-y-2">
              {filteredTopics.map(topic => {
                const Icon = topic.icon;
                return (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic)}
                    className={`w-full text-left p-3 rounded-lg transition-all hover:bg-blue-50 group ${
                      selectedTopic?.id === topic.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 ${
                        selectedTopic?.id === topic.id ? 'text-blue-600' : 'text-gray-600'
                      } group-hover:text-blue-600`} />
                      <div className="flex-1">
                        <h3 className={`font-bold text-sm ${
                          selectedTopic?.id === topic.id ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {topic.title}
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">{topic.description}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${
                        selectedTopic?.id === topic.id ? 'text-blue-600' : 'text-gray-400'
                      } group-hover:text-blue-600`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic Detail */}
          <div className={`${selectedTopic ? 'block' : 'hidden md:block'} w-full md:w-2/3 overflow-y-auto`}>
            {selectedTopic ? (
              <div className="p-6">
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="md:hidden mb-4 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  ← Voltar
                </button>

                <div className="flex items-start gap-3 mb-6">
                  {React.createElement(selectedTopic.icon, { className: 'w-8 h-8 text-blue-600' })}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedTopic.title}</h3>
                    <p className="text-gray-600">{selectedTopic.description}</p>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none mb-6">
                  {selectedTopic.content.map((line, index) => {
                    if (line === '') return <br key={index} />;
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <h4 key={index} className="font-bold text-gray-900 mt-4 mb-2">{line.replace(/\*\*/g, '')}</h4>;
                    }
                    if (line.startsWith('- ')) {
                      return <li key={index} className="ml-4 text-gray-700">{line.substring(2)}</li>;
                    }
                    if (line.startsWith('  • ')) {
                      return <li key={index} className="ml-8 text-gray-700 list-disc">{line.substring(4)}</li>;
                    }
                    if (line.match(/^[✓✗]/)) {
                      const isGood = line.startsWith('✓');
                      return (
                        <p key={index} className={`ml-4 ${isGood ? 'text-green-700' : 'text-red-700'}`}>
                          {line}
                        </p>
                      );
                    }
                    return <p key={index} className="text-gray-700">{line}</p>;
                  })}
                </div>

                {selectedTopic.quickTips && selectedTopic.quickTips.length > 0 && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-5 h-5 text-amber-700" />
                      <h4 className="font-bold text-amber-900">Dicas Rápidas</h4>
                    </div>
                    <ul className="space-y-1">
                      {selectedTopic.quickTips.map((tip, index) => (
                        <li key={index} className="text-sm text-amber-900 ml-4">• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Selecione um tópico para começar</p>
                  <p className="text-sm mt-2">Ou use a busca acima</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 rounded-b-xl border-t border-gray-200">
          <div className="flex flex-wrap gap-4 justify-center items-center text-sm">
            <a href="#" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
              <Video className="w-4 h-4" />
              Vídeo Tutoriais
            </a>
            <a href="#" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
              <MessageCircle className="w-4 h-4" />
              Chat Suporte
            </a>
            <a href="/MANUAL_USUARIO.md" target="_blank" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
              <FileText className="w-4 h-4" />
              Manual Completo
            </a>
            <span className="text-gray-500 text-xs">Pressione F1 para abrir ajuda | ESC para fechar</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpMenu;
