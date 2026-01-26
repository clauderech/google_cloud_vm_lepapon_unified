import React, { useState, useEffect, useMemo } from 'react';

// Extende a interface Window para incluir __ERROR_LOGGER_INSTALLED__
declare global {
  interface Window {
    __ERROR_LOGGER_INSTALLED__?: boolean;
  }
}

// Handler global para log detalhado de erros no frontend
if (typeof window !== 'undefined' && !window.__ERROR_LOGGER_INSTALLED__) {
  window.__ERROR_LOGGER_INSTALLED__ = true;
  window.addEventListener('error', (event) => {
    console.error('[FRONTEND][ERROR][UNCAUGHT]', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error ? {
        message: event.error.message,
        stack: event.error.stack
      } : undefined,
      time: new Date().toISOString()
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[FRONTEND][ERROR][PROMISE]', {
      reason: event.reason,
      stack: event.reason && event.reason.stack,
      time: new Date().toISOString()
    });
  });
}
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Truck, 
  TrendingUp,
  Plus,
  Minus,
  Trash2,
  Save,
  Sparkles,
  AlertTriangle,
  Search,
  ClipboardList,
  CheckSquare,
  ChefHat,
  Users,
  Clock,
  Receipt,
  DollarSign,
  FileText,
  Wallet,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { 
  AppState, 
  Product, 
  Sale, 
  Purchase, 
  Supplier,
  Customer, 
  PageView, 
  CartItem, 
  ShoppingListItem,
  RecipeItem,
  Comanda
} from './types';

// Define PaymentMethod type if not imported from types
type PaymentMethod = 'cash' | 'card' | 'pix' | 'credit';
import { generateBusinessInsight, suggestRestockOrder } from './services/geminiService';
import { storageService } from './services/storage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import FinancialDashboard from './components/FinancialDashboard';
import ExpensesManager from './components/ExpensesManager';
import CashRegister from './components/CashRegister';
import ReportsView from './components/ReportsView';
import CustomersManager from './components/CustomersManager';
import LoyaltyProgram from './components/LoyaltyProgram';
import CrediarioManager from './components/CrediarioManager';
import HelpMenu from './components/HelpMenu';
import Login from './components/Login';
import { useAuth } from './hooks/useAuth';

const App = () => {
  // --- Authentication ---
  const { user, isAuthenticated, login, logout, hasPermission } = useAuth();
  
  // --- State Management ---
  const [view, setView] = useState<PageView>('dashboard');
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [state, setState] = useState<AppState>({
    products: [],
    suppliers: [],
    customers: [],
    sales: [],
    purchases: [],
    shoppingList: [],
    activeComandas: []
  });

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      const data = await storageService.loadState();
      // Logar como está vindo o campo is_active do banco
      if (data.products && data.products.length > 0) {
        console.log('Produtos recebidos do DB (is_active):', data.products.map(p => ({ id: p.id, name: p.name, isActive: p.isActive })));
      }
      // Converter isActive numérico para booleano
      const products = (data.products || []).map((p: any) => ({
        ...p,
        isActive: p.isActive === 1 || p.isActive === "1"
      }));
      setState({ ...data, products });
      setLoading(false);
    };
    init();
  }, []);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 - Help
      if (e.key === 'F1') {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // ESC - Close modals
      if (e.key === 'Escape') {
        setShowHelp(false);
        return;
      }

      // Only process Ctrl shortcuts
      if (!e.ctrlKey) return;

      switch (e.key.toLowerCase()) {
        case 'd':
          e.preventDefault();
          setView('dashboard');
          break;
        case 'v':
          e.preventDefault();
          if (hasPermission('view_pos')) setView('pos');
          break;
        case 'e':
          e.preventDefault();
          if (hasPermission('view_inventory')) setView('inventory');
          break;
        case 'c':
          e.preventDefault();
          if (hasPermission('manage_products')) setView('customers');
          break;
        case 'f':
          e.preventDefault();
          if (hasPermission('view_financial')) setView('financial');
          break;
        case 'r':
          e.preventDefault();
          if (hasPermission('view_reports')) setView('reports');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPermission]);

  // --- Persistence ---
  useEffect(() => {
    if (!loading) {
      storageService.saveState(state);
    }
  }, [state, loading]);

  // --- Helper: Calculate Max Possible Stock for a Recipe Product ---
  const calculateMaxProduciable = (product: Product, allProducts: Product[]): number => {
    if (product.type === 'insumo' || product.type === 'insumo_bebida' || product.type === 'revenda') return product.stock;
    if (!product.recipe || product.recipe.length === 0) return 0;

    let maxCount = Infinity;
    
    product.recipe.forEach(item => {
      const ingredient = allProducts.find(p => p.id === item.ingredientId);
      if (ingredient) {
        const possibleWithThisIng = Math.floor(ingredient.stock / item.quantity);
        if (possibleWithThisIng < maxCount) maxCount = possibleWithThisIng;
      }
    });

    return maxCount === Infinity ? 0 : maxCount;
  };

  // --- Actions ---
  const addSale = (
    items: CartItem[], 
    paymentMethod: Sale['paymentMethod'], 
    customerName?: string,
    customerId?: string,
    discountPercent?: number,
    loyaltyPointsUsed?: number
  ) => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discount = discountPercent ? (subtotal * discountPercent) / 100 : 0;
    const total = subtotal - discount;
    const loyaltyPointsEarned = Math.floor(total / 10);
    
    const newSale: Sale = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items,
      subtotal,
      total,
      discount,
      discountPercent,
      loyaltyPointsUsed,
      loyaltyPointsEarned,
      paymentMethod,
      customerName,
      customerId
    };

    // If using API, we would call storageService.syncSale(newSale) here

    setState(prev => {
      // Create a copy of products to mutate stocks
      const productsMap = new Map<string, Product>(prev.products.map(p => [p.id, { ...p }]));

      items.forEach(cartItem => {
        const productSold = productsMap.get(cartItem.productId);
        if (!productSold) return;

        if (productSold.type === 'prato' && productSold.recipe) {
          // Deduct ingredients
          productSold.recipe.forEach(recipeItem => {
            const ingredient = productsMap.get(recipeItem.ingredientId);
            if (ingredient) {
              ingredient.stock -= (recipeItem.quantity * cartItem.quantity);
            }
          });
        } else if (productSold.type === 'insumo' || productSold.type === 'insumo_bebida') {
          // Venda direta de insumo ou insumo_bebida
          productSold.stock -= cartItem.quantity;
        }
      });

      // Atualizar pontos de fidelidade do cliente
      const updatedCustomers = customerId 
        ? prev.customers.map(c => {
            if (c.id === customerId) {
              const currentPoints = c.loyaltyPoints || 0;
              const usedPoints = loyaltyPointsUsed || 0;
              const earnedPoints = loyaltyPointsEarned || 0;
              return {
                ...c,
                loyaltyPoints: currentPoints - usedPoints + earnedPoints
              };
            }
            return c;
          })
        : prev.customers;

      return {
        ...prev,
        sales: [...prev.sales, newSale],
        products: Array.from(productsMap.values()),
        customers: updatedCustomers
      };
    });
  };

  const addPurchase = (supplierId: string, items: CartItem[]) => {
    const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const newPurchase: Purchase = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      supplierId,
      items,
      total,
      status: 'received'
    };

    setState(prev => {
      const updatedProducts = prev.products.map(p => {
        const purchasedItem = items.find(i => i.productId === p.id);
        if (purchasedItem) {
          return { ...p, stock: p.stock + purchasedItem.quantity };
        }
        return p;
      });

      return {
        ...prev,
        purchases: [...prev.purchases, newPurchase],
        products: updatedProducts
      };
    });
  };

  const addProduct = (product: Product) => {
    setState(prev => ({ ...prev, products: [...prev.products, product] }));
  };

  const addCustomer = (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: `customer_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setState(prev => ({ ...prev, customers: [...prev.customers, newCustomer] }));
  };

  const updateCustomer = (id: string, data: Partial<Customer>) => {
    setState(prev => ({
      ...prev,
      customers: prev.customers.map(c => 
        c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c
      )
    }));
  };

  const deleteCustomer = (id: string) => {
    if (confirm('Deseja realmente excluir este cliente?')) {
      setState(prev => ({ ...prev, customers: prev.customers.filter(c => c.id !== id) }));
    }
  };

  // --- Comanda Actions ---
  const openComanda = (customerName: string) => {
    const newComanda: Comanda = {
      id: Date.now().toString(),
      customerName,
      openedAt: new Date().toISOString(),
      items: [],
      total: 0,
      status: 'open'
    };
    setState(prev => ({ ...prev, activeComandas: [...prev.activeComandas, newComanda] }));
    return newComanda.id;
  };

  const updateComanda = (comandaId: string, items: CartItem[]) => {
    storageService.updateComanda(comandaId, items)
      .then(() => {
        setState(prev => ({
          ...prev,
          activeComandas: prev.activeComandas.map(c => {
            if (c.id === comandaId) {
              const total = items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
              return { ...c, items, total };
            }
            return c;
          })
        }));
      })
      .catch((err) => {
        alert('Erro ao atualizar comanda: ' + (err?.message || err));
      });
  };

  const closeComanda = async (comandaId: string, paymentMethod: Sale['paymentMethod']) => {
    const comanda = state.activeComandas.find(c => c.id === comandaId);
    if (!comanda) return;

    try {
      await storageService.closeComanda(comandaId, paymentMethod);
      setState(prev => ({
        ...prev,
        activeComandas: prev.activeComandas.filter(c => c.id !== comandaId)
      }));
      alert('Comanda fechada com sucesso!');
    } catch (err: any) {
      alert('Erro ao fechar comanda: ' + (err?.message || err));
    }
  };

  // --- Shopping List Actions ---
  const addToShoppingList = (productId: string, quantity: number) => {
    setState(prev => {
      const existing = prev.shoppingList.find(i => i.productId === productId);
      if (existing) {
        return {
          ...prev,
          shoppingList: prev.shoppingList.map(i => 
            i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i
          )
        };
      }
      return {
        ...prev,
        shoppingList: [...prev.shoppingList, { id: Date.now().toString(), productId, quantity }]
      };
    });
  };

  const removeFromShoppingList = (ids: string[]) => {
    setState(prev => ({
      ...prev,
      shoppingList: prev.shoppingList.filter(item => !ids.includes(item.id))
    }));
  };

  const fillShoppingListWithLowStock = () => {
    const lowStockItems = state.products.filter(p => p.type === 'insumo' && p.stock <= p.minStock);
    let count = 0;
    
    setState(prev => {
      const newList = [...prev.shoppingList];
      lowStockItems.forEach(p => {
        const existing = newList.find(i => i.productId === p.id);
        const suggestQty = (p.minStock * 2) - p.stock; 
        if (suggestQty > 0) {
          if (!existing) {
            newList.push({ id: Date.now().toString() + p.id, productId: p.id, quantity: suggestQty });
            count++;
          }
        }
      });
      return { ...prev, shoppingList: newList };
    });
    
    if(count > 0) alert(`${count} insumos com estoque baixo adicionados à lista!`);
    else alert("Nenhum insumo novo com estoque baixo encontrado.");
  };

  const processShoppingListToPurchase = (itemsToBuy: ShoppingListItem[], supplierId: string) => {
    const purchaseItems: CartItem[] = itemsToBuy.map(item => {
      const product = state.products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name || 'Unknown',
        quantity: item.quantity,
        unitPrice: product?.cost || 0
      };
    });
    addPurchase(supplierId, purchaseItems);
    removeFromShoppingList(itemsToBuy.map(i => i.id));
  };

  // --- Logout Handler ---
  const handleLogout = () => {
    if (confirm('Deseja realmente sair do sistema?')) {
      logout();
      setView('dashboard');
    }
  };

  // --- Render Login if not authenticated ---
  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }


  // --- Sub-Components ---
  const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
    <button
      onClick={onClick}
      className={`flex items-center w-full p-3 mb-2 rounded-lg transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-100'
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      <span className="font-semibold">{label}</span>
    </button>
  );

  // --- Pages ---

  const Dashboard = () => {
    const [insight, setInsight] = useState<string>("");
    const [loadingInsight, setLoadingInsight] = useState(false);

    const totalSales = state.sales.reduce((acc, s) => acc + s.total, 0);
    const totalPurchases = state.purchases.reduce((acc, p) => acc + p.total, 0);
    const lowStockCount = state.products.filter(p => p.type === 'insumo' && p.stock <= p.minStock).length;
    const avgTicket = state.sales.length > 0 ? totalSales / state.sales.length : 0;
    
    const salesData = useMemo(() => {
      const last7Days = new Array(7).fill(0).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      return last7Days.map(date => {
        const dailyTotal = state.sales
          .filter(s => s.date.startsWith(date))
          .reduce((acc, s) => acc + s.total, 0);
        return { date: date.slice(5), total: dailyTotal };
      });
    }, [state.sales]);

    // Top produtos vendidos
    const topProducts = useMemo(() => {
      const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
      
      state.sales.forEach(sale => {
        sale.items.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
          }
          productSales[item.productId].quantity += item.quantity;
          productSales[item.productId].revenue += item.quantity * item.unitPrice;
        });
      });

      return Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    }, [state.sales]);

    // Vendas por categoria
    const salesByCategory = useMemo(() => {
      const categoryData: Record<string, number> = {};
      
      state.sales.forEach(sale => {
        sale.items.forEach(item => {
          const product = state.products.find(p => p.id === item.productId);
          const category = product?.category || 'Outros';
          categoryData[category] = (categoryData[category] || 0) + (item.quantity * item.unitPrice);
        });
      });

      return Object.entries(categoryData).map(([name, value]) => ({ name, value }));
    }, [state.sales, state.products]);

    // Vendas por forma de pagamento
    const paymentMethodData = useMemo(() => {
      const methods: Record<string, number> = { cash: 0, card: 0, pix: 0, credit: 0 };
      
      state.sales.forEach(sale => {
        methods[sale.paymentMethod] = (methods[sale.paymentMethod] || 0) + sale.total;
      });

      return Object.entries(methods)
        .map(([name, value]) => ({ 
          name: name === 'cash' ? 'Dinheiro' : name === 'card' ? 'Cartão' : name === 'pix' ? 'PIX' : 'Crédito', 
          value 
        }))
        .filter(item => item.value > 0);
    }, [state.sales]);

    const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

    const handleGenerateInsight = async () => {
      setLoadingInsight(true);
      const result = await generateBusinessInsight(state.products, state.sales, state.purchases);
      setInsight(result);
      setLoadingInsight(false);
    };

    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Painel de Controle</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white/90 text-sm font-bold">Vendas Totais</h3>
              <TrendingUp className="text-white/90 w-6 h-6" />
            </div>
            <p className="text-3xl font-bold">R$ {totalSales.toFixed(2)}</p>
            <p className="text-xs text-white/80 mt-1 font-medium">{state.sales.length} transações</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white/90 text-sm font-bold">Ticket Médio</h3>
              <Receipt className="text-white/90 w-6 h-6" />
            </div>
            <p className="text-3xl font-bold">R$ {avgTicket.toFixed(2)}</p>
            <p className="text-xs text-white/80 mt-1 font-medium">Por venda</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white/90 text-sm font-bold">Insumos Críticos</h3>
              <AlertTriangle className="text-white/90 w-6 h-6" />
            </div>
            <p className="text-3xl font-bold">{lowStockCount}</p>
            <p className="text-xs text-white/80 mt-1 font-medium">Abaixo do mínimo</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white/90 text-sm font-bold">Comandas Abertas</h3>
              <Users className="text-white/90 w-6 h-6" />
            </div>
            <p className="text-3xl font-bold">{state.activeComandas.length}</p>
            <p className="text-xs text-white/80 mt-1 font-medium">Em atendimento</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <h3 className="text-lg font-bold text-gray-800 mb-4">Vendas da Semana</h3>
             <ResponsiveContainer width="100%" height={250}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#4b5563' }} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value}`} tick={{ fill: '#4b5563' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#000' }} />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
             </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Top 5 Produtos Vendidos</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#4b5563', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value}`} tick={{ fill: '#4b5563' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Vendas por Categoria</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={salesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {salesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-700" />
              <h3 className="text-lg font-bold text-indigo-900">Consultor IA</h3>
            </div>
            {!insight ? (
              <div className="text-center py-8">
                <p className="text-indigo-800 text-sm mb-4 font-medium">Obtenha insights sobre seu estoque e vendas.</p>
                <button 
                  onClick={handleGenerateInsight}
                  disabled={loadingInsight}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {loadingInsight ? "Analisando..." : "Gerar Análise"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-indigo-900 font-medium leading-relaxed whitespace-pre-line bg-white/80 p-4 rounded-lg border border-indigo-200 h-48 overflow-y-auto">
                  {insight}
                </div>
                <button onClick={handleGenerateInsight} className="text-xs text-indigo-700 font-bold hover:underline">
                  Atualizar Análise
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const POS = () => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'quick' | 'comandas'>('comandas');
    
    // Comanda State
    const [selectedComandaId, setSelectedComandaId] = useState<string | null>(null);
    const [newCustomerName, setNewCustomerName] = useState('');
    
    // Customer Selection and Loyalty
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [appliedDiscount, setAppliedDiscount] = useState<{ percent: number; pointsUsed: number } | null>(null);

    // Reset cart when switching modes or comandas
    useEffect(() => {
      if (activeTab === 'comandas' && selectedComandaId) {
        const comanda = state.activeComandas.find(c => c.id === selectedComandaId);
        if (comanda) setCart(comanda.items);
        else setCart([]);
      } else if (activeTab === 'quick') {
        setCart([]);
        setSelectedComandaId(null);
      }
    }, [activeTab, selectedComandaId, state.activeComandas]);

    // Exibir produtos ativos por tipo com abas no cardápio
    const [pdvTab, setPdvTab] = useState<'prato' | 'drink' | 'revenda'>('prato');
    const tabLabels = [
      { key: 'prato', label: 'Pratos' },
      { key: 'drink', label: 'Drink' },
      { key: 'revenda', label: 'Revenda' },
    ];
    const cardapioProdutos = state.products.filter(p => p.isActive === true && p.type === pdvTab);
    const filteredProducts = cardapioProdutos.filter(p => {
      const termo = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(termo) ||
        (p.category && p.category.toLowerCase().includes(termo))
      );
    });

    const addToCart = (product: Product, maxStock: number) => {
      setCart(prev => {
        const existing = prev.find(item => item.productId === product.id);
        if (existing) {
          if (existing.quantity >= maxStock) return prev;
          return prev.map(item => 
            item.productId === product.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        if (maxStock <= 0) return prev;
        return [...prev, { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.price }];
      });
    };

    const removeFromCart = (productId: string) => {
      setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const handleQuickCheckout = () => {
      if (cart.length === 0) return;
      
      const customer = state.customers.find(c => c.id === selectedCustomerId);
      const customerName = customer ? `${customer.nome} ${customer.sobrenome || ''}`.trim() : undefined;
      
      addSale(
        cart, 
        'cash', 
        customerName,
        selectedCustomerId || undefined,
        appliedDiscount?.percent,
        appliedDiscount?.pointsUsed
      );
      
      setCart([]);
      setSelectedCustomerId('');
      setAppliedDiscount(null);
      alert("Venda Rápida finalizada!");
    };
    
    const handleApplyDiscount = (discountPercent: number, pointsToDeduct: number) => {
      setAppliedDiscount({ percent: discountPercent, pointsUsed: pointsToDeduct });
    };

    const handleCreateComanda = () => {
      if (!newCustomerName.trim()) return alert("Nome do cliente obrigatório");
      storageService.createComanda(newCustomerName)
        .then(({ comandaId }) => {
          // Adiciona ao estado local após sucesso no backend
          const newComanda: Comanda = {
            id: comandaId,
            customerName: newCustomerName,
            customerId: selectedCustomerId || undefined,
            openedAt: new Date().toISOString(),
            items: [],
            total: 0,
            status: 'open'
          };
          setState(prev => ({ ...prev, activeComandas: [...prev.activeComandas, newComanda] }));
          setNewCustomerName('');
          setSelectedCustomerId('');
          setSelectedComandaId(comandaId);
        })
        .catch((err) => {
          alert('Erro ao criar comanda: ' + (err?.message || err));
        });
    };

    const handleSaveComanda = () => {
      if (selectedComandaId) {
        updateComanda(selectedComandaId, cart);
        alert("Comanda atualizada!");
        setSelectedComandaId(null); // Go back to list
      }
    };


    // Modal de pagamento
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

    const handleCloseComanda = () => {
      if (selectedComandaId) {
        setShowPaymentModal(true);
      }
    };

    const handleConfirmPayment = async () => {
      if (selectedComandaId) {
        await closeComanda(selectedComandaId, paymentMethod);
        setShowPaymentModal(false);
        setSelectedComandaId(null);
      }
    };

    const cartSubtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const cartDiscount = appliedDiscount ? (cartSubtotal * appliedDiscount.percent) / 100 : 0;
    const cartTotal = cartSubtotal - cartDiscount;
    const selectedComanda = state.activeComandas.find(c => c.id === selectedComandaId);
    const selectedCustomer = state.customers.find(c => c.id === selectedCustomerId);
    const customerLoyaltyPoints = selectedCustomer?.loyaltyPoints || 0;

    return (
      <div className="h-screen flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Products */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50 border-r border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Cardápio</h2>
            <div className="flex gap-2">
              {tabLabels.map(tab => (
                <button
                  key={tab.key}
                  className={`px-3 py-1 rounded-t border-b-2 ${pdvTab === tab.key ? 'border-blue-600 bg-blue-100 font-bold' : 'border-transparent bg-gray-100'}`}
                  onClick={() => setPdvTab(tab.key as 'prato' | 'drink' | 'revenda')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input 
                type="text"
                placeholder={`Buscar ${tabLabels.find(t => t.key === pdvTab)?.label.toLowerCase()}...`}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white placeholder-gray-600 w-64"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {/* Product Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              const maxStock = calculateMaxProduciable(product, state.products);
              const currentInCart = cart.find(c => c.productId === product.id)?.quantity || 0;
              const available = maxStock - currentInCart;
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product, maxStock)}
                  disabled={available <= 0 || (activeTab === 'comandas' && !selectedComandaId)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    available <= 0 || (activeTab === 'comandas' && !selectedComandaId)
                      ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                      : 'bg-white border-gray-200 hover:shadow-md hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-gray-900 line-clamp-1">{product.name}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      available <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {available} un
                    </span>
                  </div>
                  <p className="text-lg font-black text-blue-700">R$ {product.price.toFixed(2)}</p>
                  <p className="text-xs text-gray-600 mt-1 font-medium">{product.category}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Order Management */}
        <div className="w-full md:w-[400px] bg-white flex flex-col h-full shadow-xl z-10">
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('comandas')}
              className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 ${activeTab === 'comandas' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Receipt className="w-4 h-4" /> Comandas
            </button>
            <button 
              onClick={() => setActiveTab('quick')}
              className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 ${activeTab === 'quick' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <ShoppingCart className="w-4 h-4" /> Venda Rápida
            </button>
          </div>

          {/* Content based on Tab */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            
            {activeTab === 'comandas' && !selectedComandaId && (
              <div className="p-4 space-y-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3">Nova Comanda</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Cliente (opcional)
                      </label>
                      <select
                        className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white"
                        value={selectedCustomerId}
                        onChange={e => {
                          setSelectedCustomerId(e.target.value);
                          const customer = state.customers.find(c => c.id === e.target.value);
                          if (customer) {
                            setNewCustomerName(`${customer.nome} ${customer.sobrenome || ''}`.trim());
                          } else {
                            setNewCustomerName('');
                          }
                        }}
                      >
                        <option value="">Sem cadastro</option>
                        {state.customers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.nome} {c.sobrenome || ''} {c.fone ? `- ${c.fone}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nome / Mesa
                      </label>
                      <input 
                        type="text" 
                        placeholder="Nome do Cliente / Mesa" 
                        className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white placeholder-gray-600"
                        value={newCustomerName}
                        onChange={e => setNewCustomerName(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={handleCreateComanda}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
                    >
                      Abrir Comanda
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {state.activeComandas.map(comanda => (
                    <button 
                      key={comanda.id}
                      onClick={() => setSelectedComandaId(comanda.id)}
                      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-400 text-left group transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-gray-900 text-lg group-hover:text-blue-700">{comanda.customerName}</span>
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">Aberta</span>
                      </div>
                      <div className="flex justify-between items-end text-sm text-gray-600">
                         <div className="flex items-center gap-1">
                           <Clock className="w-3 h-3" />
                           {new Date(comanda.openedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </div>
                         <span className="font-black text-gray-900 text-lg">R$ {comanda.total.toFixed(2)}</span>
                      </div>
                    </button>
                  ))}
                  {state.activeComandas.length === 0 && (
                    <p className="text-center text-gray-400 mt-8">Nenhuma comanda aberta.</p>
                  )}
                </div>
              </div>
            )}

            {/* Cart View (Used for Quick Sale OR Selected Comanda) */}
            {(activeTab === 'quick' || selectedComandaId) && (
              <div className="flex flex-col h-full">
                 {activeTab === 'comandas' && selectedComanda && (
                   <div className="bg-blue-100 p-3 flex justify-between items-center border-b border-blue-200">
                      <span className="font-bold text-blue-900">{selectedComanda.customerName}</span>
                      <button onClick={() => setSelectedComandaId(null)} className="text-xs font-bold text-blue-700 hover:underline">Voltar</button>
                   </div>
                 )}
                 
                 <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                      <p className="text-center text-gray-400 mt-10">Carrinho vazio</p>
                    ) : (
                      cart.map(item => (
                        <div key={item.productId} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-sm">{item.productName}</p>
                            <p className="text-xs text-gray-700 font-medium">R$ {item.unitPrice.toFixed(2)} x {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 mb-1">R$ {(item.quantity * item.unitPrice).toFixed(2)}</p>
                            <button onClick={() => removeFromCart(item.productId)} className="text-red-500 hover:text-red-700 text-xs font-bold">
                              Remover
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                 </div>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          {(activeTab === 'quick' || selectedComandaId) && (
            <div className="p-6 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] space-y-4">
              {activeTab === 'quick' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Cliente (opcional)
                    </label>
                    <select
                      className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white text-sm"
                      value={selectedCustomerId}
                      onChange={e => {
                        setSelectedCustomerId(e.target.value);
                        setAppliedDiscount(null); // Reset discount when changing customer
                      }}
                    >
                      <option value="">Sem cadastro</option>
                      {state.customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nome} {c.sobrenome || ''} {c.fone ? `- ${c.fone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedCustomerId && cart.length > 0 && (
                    <LoyaltyProgram 
                      loyaltyPoints={customerLoyaltyPoints}
                      onApplyDiscount={handleApplyDiscount}
                      cartTotal={cartSubtotal}
                    />
                  )}
                </>
              )}
              
              <div>
                {appliedDiscount && (
                  <div className="mb-2 space-y-1">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-medium">R$ {cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600 font-bold">
                      <span>Desconto ({appliedDiscount.percent}%)</span>
                      <span>- R$ {cartDiscount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Total</span>
                  <span className="text-3xl font-black text-gray-900">R$ {cartTotal.toFixed(2)}</span>
                </div>
              </div>
              
              {activeTab === 'quick' ? (
                <button
                  onClick={handleQuickCheckout}
                  disabled={cart.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 disabled:opacity-50 transition-all"
                >
                  Finalizar Venda Rápida
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleSaveComanda}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-xl font-bold transition-all border border-gray-300"
                  >
                    Salvar Pedido
                  </button>
                  <button
                    onClick={handleCloseComanda}
                    disabled={cart.length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-200 disabled:opacity-50 transition-all"
                  >
                    Fechar Conta
                  </button>
                      {/* Modal de Forma de Pagamento */}
                      {showPaymentModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                          <div className="bg-white rounded-xl shadow-2xl max-w-xs w-full p-6">
                            <h3 className="text-lg font-bold mb-4 text-gray-900">Selecione a forma de pagamento</h3>
                            <div className="space-y-3 mb-4">
                              <label className="flex items-center space-x-2">
                                <input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
                                <span>Dinheiro</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input type="radio" name="paymentMethod" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                                <span>Cartão</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input type="radio" name="paymentMethod" value="pix" checked={paymentMethod === 'pix'} onChange={() => setPaymentMethod('pix')} />
                                <span>Pix</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input type="radio" name="paymentMethod" value="credit" checked={paymentMethod === 'credit'} onChange={() => setPaymentMethod('credit')} />
                                <span>Crédito</span>
                              </label>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-bold">Cancelar</button>
                              <button onClick={handleConfirmPayment} className="px-4 py-2 rounded bg-green-600 text-white font-bold">Confirmar</button>
                            </div>
                          </div>
                        </div>
                      )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const Inventory = () => {
    const [mode, setMode] = useState<'insumo' | 'insumo_bebida' | 'prato' | 'drink'>('insumo');
    const [newProd, setNewProd] = useState<Partial<Product>>({ 
      category: 'Geral', 
      minStock: 10,
      unit: 'un',
      recipe: [] 
    });
    const [showForm, setShowForm] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editProd, setEditProd] = useState<Partial<Product> | null>(null);
    const [editMode, setEditMode] = useState<'insumo' | 'insumo_bebida' | 'prato' | 'drink'>('insumo');
        const handleEditProduct = (product: Product) => {
          setEditProd({ ...product });
          setEditMode(product.type);
          setEditModalOpen(true);
        };

        const handleEditSave = async () => {
          if (!editProd?.name) return alert("Nome é obrigatório");
          const updated: Product = {
            ...editProd,
            type: editMode,
            price: Number(editProd.price || 0),
            cost: Number(editProd.cost || 0),
            minStock: Number(editProd.minStock || 0),
            stock: Number(editProd.stock || 0),
            supplierId: editProd.supplierId || '',
            unit: editProd.unit || 'un',
            category: editProd.category || '',
            recipe: editProd.recipe || [],
            isActive: editProd.isActive ? 1 : 0,
          } as Product;
          setState(prev => ({
            ...prev,
            products: prev.products.map(p => p.id === updated.id ? updated : p)
          }));
          try {
            await storageService.updateProduct(updated);
          } catch (err) {
            alert('Erro ao salvar produto no banco!');
          }
          setEditModalOpen(false);
          setEditProd(null);
        };
    
    // Recipe Builder States
    const [recipeIngId, setRecipeIngId] = useState('');
    const [recipeQty, setRecipeQty] = useState(0);

    const handleAddRecipeItem = () => {
      if (recipeIngId && recipeQty > 0) {
        const existing = newProd.recipe || [];
        setNewProd({
           ...newProd, 
           recipe: [...existing, { ingredientId: recipeIngId, quantity: recipeQty }]
        });
        setRecipeIngId('');
        setRecipeQty(0);
      }
    };

    const handleSave = () => {
      if (!newProd.name) return alert("Nome é obrigatório");
      
      const productToSave: Product = {
        ...newProd,
        id: Date.now().toString(),
        type: mode,
        stock: (mode === 'prato' || mode === 'drink') ? 0 : (newProd.stock || 0),
        price: Number(newProd.price || 0),
        cost: Number(newProd.cost || 0),
        supplierId: newProd.supplierId || '',
        isActive: newProd.isActive ? 1 : 0,
      } as Product;

      addProduct(productToSave);
      setShowForm(false);
      setNewProd({ category: 'Geral', minStock: 10, unit: 'un', recipe: [] });
    };

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Cadastro & Estoque</h2>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
          >
            <Plus className="w-4 h-4" /> Novo Item
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex gap-4 mb-4 border-b pb-4">
              <button 
                onClick={() => setMode('insumo')} 
                className={`px-4 py-2 rounded-lg font-bold ${mode === 'insumo' ? 'bg-blue-100 text-blue-800' : 'text-gray-600'}`}
              >
                Insumo (Comida)
              </button>
              <button 
                onClick={() => setMode('insumo_bebida')} 
                className={`px-4 py-2 rounded-lg font-bold ${mode === 'insumo_bebida' ? 'bg-blue-100 text-blue-800' : 'text-gray-600'}`}
              >
                Insumo (Bebida)
              </button>
              <button 
                onClick={() => setMode('prato')} 
                className={`px-4 py-2 rounded-lg font-bold ${mode === 'prato' ? 'bg-blue-100 text-blue-800' : 'text-gray-600'}`}
              >
                Prato (Venda / Receita)
              </button>
              <button 
                onClick={() => setMode('drink')} 
                className={`px-4 py-2 rounded-lg font-bold ${mode === 'drink' ? 'bg-blue-100 text-blue-800' : 'text-gray-600'}`}
              >
                Drink (Receita)
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <input placeholder="Nome" className="border border-gray-400 p-2 rounded text-black bg-white placeholder-gray-600" value={newProd.name || ''} onChange={e => setNewProd({...newProd, name: e.target.value})} />
              <input placeholder="Categoria" className="border border-gray-400 p-2 rounded text-black bg-white placeholder-gray-600" value={newProd.category || ''} onChange={e => setNewProd({...newProd, category: e.target.value})} />
              
              {(mode === 'insumo' || mode === 'insumo_bebida') && (
                <>
                  <select className="border border-gray-400 p-2 rounded text-black bg-white" value={newProd.unit} onChange={e => setNewProd({...newProd, unit: e.target.value as any})}>
                    <option value="un">Unidade</option>
                    <option value="kg">Kg</option>
                    <option value="g">Gramas</option>
                    <option value="l">Litros</option>
                    <option value="ml">Ml</option>
                  </select>
                  <input type="number" placeholder="Custo de Compra" className="border border-gray-400 p-2 rounded text-black bg-white placeholder-gray-600" onChange={e => setNewProd({...newProd, cost: Number(e.target.value)})} />
                  <input type="number" placeholder="Estoque Inicial" className="border border-gray-400 p-2 rounded text-black bg-white placeholder-gray-600" onChange={e => setNewProd({...newProd, stock: Number(e.target.value)})} />
                  <input type="number" placeholder="Estoque Mínimo" className="border border-gray-400 p-2 rounded text-black bg-white placeholder-gray-600" value={newProd.minStock} onChange={e => setNewProd({...newProd, minStock: Number(e.target.value)})} />
                  <select className="border border-gray-400 p-2 rounded text-black bg-white" value={newProd.supplierId || ''} onChange={e => setNewProd({...newProd, supplierId: e.target.value})}>
                    <option value="">Fornecedor</option>
                    {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </>
              )}

              {(mode === 'prato' || mode === 'drink') && (
                <>
                  <input type="number" placeholder="Preço de Venda" className="border border-gray-400 p-2 rounded font-bold text-black bg-white placeholder-gray-600" onChange={e => setNewProd({...newProd, price: Number(e.target.value)})} />
                </>
              )}
            </div>

            {(mode === 'prato' || mode === 'drink') && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                <h4 className="font-bold text-gray-800 mb-2">Ficha Técnica (Receita)</h4>
                <div className="flex gap-2 mb-2">
                  <select 
                    className="flex-1 border border-gray-400 p-2 rounded text-black bg-white"
                    value={recipeIngId}
                    onChange={e => setRecipeIngId(e.target.value)}
                  >
                    <option value="">Adicionar Insumo...</option>
                    {state.products.filter(p => p.type === 'insumo' || p.type === 'insumo_bebida' || p.type === 'drink' || p.type === 'revenda').map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    placeholder="Qtd" 
                    className="w-24 border border-gray-400 p-2 rounded text-black bg-white placeholder-gray-600"
                    value={recipeQty}
                    onChange={e => setRecipeQty(Number(e.target.value))}
                  />
                  <button onClick={handleAddRecipeItem} className="bg-blue-600 text-white px-3 rounded font-bold">Add</button>
                </div>
                <div className="space-y-1">
                  {newProd.recipe?.map((item, idx) => {
                    const ingName = state.products.find(p => p.id === item.ingredientId)?.name;
                    return (
                      <div key={idx} className="flex justify-between text-sm bg-white p-2 rounded border text-gray-800 font-medium">
                        <span>{ingName}</span>
                        <span>{item.quantity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={handleSave} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">
              Salvar {mode === 'insumo' ? 'Insumo' : mode === 'prato' ? 'Prato' : 'Drink'}
            </button>
          </div>
        )}

        {/* List View */}
        <div className="space-y-8">
          <section>
             <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><Package className="w-5 h-5" /> Insumos (Estoque Controlado)</h3>
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-900 font-bold text-sm">
                    <tr>
                      <th className="p-3">Nome</th>
                      <th className="p-3 text-right">Estoque</th>
                      <th className="p-3">Unidade</th>
                      <th className="p-3 text-right">Custo</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {state.products.filter(p => p.type === 'insumo' || p.type === 'revenda').map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 text-gray-900">
                        <td className="p-3 font-medium">{p.name}</td>
                        <td className="p-3 text-right font-mono font-bold">
                          <input
                            type="number"
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-right font-mono font-bold bg-white"
                            value={p.stock}
                            min={0}
                            onChange={async e => {
                              const newStock = Number(e.target.value);
                              setState(prev => ({
                                ...prev,
                                products: prev.products.map(prod => prod.id === p.id ? { ...prod, stock: newStock } : prod)
                              }));
                              try {
                                await storageService.updateProduct({ ...p, stock: newStock });
                              } catch (err) {
                                alert('Erro ao salvar estoque no banco!');
                              }
                            }}
                          />
                        </td>
                        <td className="p-3 text-sm text-gray-700 font-bold uppercase">{p.unit}</td>
                        <td className="p-3 text-right font-medium">
                          <input
                            type="number"
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-right font-mono font-bold bg-white"
                            value={p.cost}
                            min={0}
                            step={0.01}
                            onChange={async e => {
                              const newCost = Number(e.target.value);
                              setState(prev => ({
                                ...prev,
                                products: prev.products.map(prod => prod.id === p.id ? { ...prod, cost: newCost } : prod)
                              }));
                              try {
                                await storageService.updateProduct({ ...p, cost: newCost });
                              } catch (err) {
                                alert('Erro ao salvar custo no banco!');
                              }
                            }}
                          />
                        </td>
                        <td className="p-3">
                          {p.stock <= p.minStock ? 
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">Baixo</span> : 
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">OK</span>}
                        </td>
                        <td className="p-3">
                          <button className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold hover:bg-blue-200" onClick={() => handleEditProduct(p)}>Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </section>

          <section>
             <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><ChefHat className="w-5 h-5" /> Pratos / Drink (Estoque Calculado)</h3>
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-900 font-bold text-sm">
                    <tr>
                      <th className="p-3">Nome</th>
                      <th className="p-3 text-right">Preço Venda</th>
                      <th className="p-3 text-right">Produção Max. Est.</th>
                      <th className="p-3">Ingredientes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {state.products.filter(p => p.type === 'prato' || p.type === 'drink').map(p => {
                      const maxProd = calculateMaxProduciable(p, state.products);
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 text-gray-900">
                          <td className="p-3 font-bold">{p.name}</td>
                          <td className="p-3 text-right text-green-700 font-bold">R$ {p.price.toFixed(2)}</td>
                          <td className="p-3 text-right">
                             <span className={`px-2 py-1 rounded text-xs font-bold ${maxProd < 5 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                               ~ {maxProd} un
                             </span>
                          </td>
                          <td className="p-3 text-sm text-gray-700 font-medium max-w-xs truncate">
                            {p.recipe?.map(r => state.products.find(i => i.id === r.ingredientId)?.name).join(', ')}
                          </td>
                          <td className="p-3">
                            <button className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold hover:bg-blue-200" onClick={() => handleEditProduct(p)}>Editar</button>
                          </td>
                        </tr>
                      );
                    })}
                          {/* Modal de edição de produto */}
                          {editModalOpen && editProd && (
                            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 border border-blue-200">
                                <h3 className="text-xl font-bold mb-4 text-blue-900">Editar Produto</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div className="flex items-center col-span-2">
                                    <input type="checkbox" id="isActiveEdit" checked={!!editProd.isActive} onChange={e => setEditProd({...editProd, isActive: e.target.checked})} className="mr-2" />
                                    <label htmlFor="isActiveEdit" className="font-bold text-gray-700">Produto Ativo</label>
                                  </div>
                                  <input placeholder="Nome" className="border border-gray-400 p-2 rounded text-black bg-white placeholder-gray-600" value={editProd.name || ''} onChange={e => setEditProd({...editProd, name: e.target.value})} />
                                  <input placeholder="Categoria" className="border border-gray-400 p-2 rounded text-black bg-white placeholder-gray-600" value={editProd.category || ''} onChange={e => setEditProd({...editProd, category: e.target.value})} />
                                  <select className="border border-gray-400 p-2 rounded text-black bg-white" value={editMode} onChange={e => setEditMode(e.target.value as any)}>
                                    <option value="insumo">Insumo</option>
                                    <option value="prato">Prato</option>
                                    <option value="drink">Drink</option>
                                  </select>
                                  <input placeholder="Unidade" className="border border-gray-400 p-2 rounded text-black bg-white placeholder-gray-600" value={editProd.unit || ''} onChange={e => setEditProd({...editProd, unit: e.target.value as any})} />
                                  <input type="number" placeholder="Preço de Venda" className="border border-gray-400 p-2 rounded font-bold text-black bg-white placeholder-gray-600" value={editProd.price || ''} onChange={e => setEditProd({...editProd, price: Number(e.target.value)})} />
                                  <input type="number" placeholder="Custo de Compra" className="border border-gray-400 p-2 rounded text-black bg-white placeholder-gray-600" value={editProd.cost || ''} onChange={e => setEditProd({...editProd, cost: Number(e.target.value)})} />
                                  <input type="number" placeholder="Estoque" className="border border-gray-400 p-2 rounded text-black bg-white placeholder-gray-600" value={editProd.stock || ''} onChange={e => setEditProd({...editProd, stock: Number(e.target.value)})} />
                                  <input type="number" placeholder="Estoque Mínimo" className="border border-gray-400 p-2 rounded text-black bg-white placeholder-gray-600" value={editProd.minStock || ''} onChange={e => setEditProd({...editProd, minStock: Number(e.target.value)})} />
                                  <select className="border border-gray-400 p-2 rounded text-black bg-white" value={editProd.supplierId || ''} onChange={e => setEditProd({...editProd, supplierId: e.target.value})}>
                                    <option value="">Fornecedor</option>
                                    {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                </div>
                                {(editMode === 'prato' || editMode === 'drink') && (
                                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                                    <h4 className="font-bold text-gray-800 mb-2">Ficha Técnica (Receita)</h4>
                                    <div className="flex gap-2 mb-2">
                                      <select 
                                        className="flex-1 border border-gray-400 p-2 rounded text-black bg-white"
                                        value={''}
                                        onChange={e => {
                                          const ingId = e.target.value;
                                          if (ingId) {
                                            setEditProd(prev => ({
                                              ...prev!,
                                              recipe: [...(prev?.recipe || []), { ingredientId: ingId, quantity: 1 }]
                                            }));
                                          }
                                        }}
                                      >
                                        <option value="">Adicionar Insumo...</option>
                                        {state.products.filter(p => p.type === 'insumo' || p.type === 'insumo_bebida').map(p => (
                                          <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      {editProd.recipe?.map((item, idx) => {
                                        const ingName = state.products.find(p => p.id === item.ingredientId)?.name;
                                        return (
                                          <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border text-gray-800 font-medium">
                                            <span>{ingName}</span>
                                            <input type="number" className="w-20 border border-gray-300 rounded px-2 py-1 text-right font-mono font-bold bg-white" value={item.quantity} min={0} onChange={e => {
                                              const qty = Number(e.target.value);
                                              setEditProd(prev => ({
                                                ...prev!,
                                                recipe: prev?.recipe?.map((r, i) => i === idx ? { ...r, quantity: qty } : r)
                                              }));
                                            }} />
                                            <button className="text-red-500 px-2" onClick={() => setEditProd(prev => ({
                                              ...prev!,
                                              recipe: prev?.recipe?.filter((_, i) => i !== idx)
                                            }))}>Remover</button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                <div className="flex justify-end gap-2 mt-4">
                                  <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-bold" onClick={() => {setEditModalOpen(false); setEditProd(null);}}>Cancelar</button>
                                  <button className="px-4 py-2 rounded bg-green-600 text-white font-bold" onClick={handleEditSave}>Salvar</button>
                                </div>
                              </div>
                            </div>
                          )}
                  </tbody>
                </table>
             </div>
          </section>
        </div>
      </div>
    );
  };

  const ShoppingListView = () => {
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [targetSupplier, setTargetSupplier] = useState('');
    const [newItemId, setNewItemId] = useState('');
    const [newItemQty, setNewItemQty] = useState(1);

    const handleProcessPurchase = () => {
      if (!targetSupplier) return alert("Selecione um fornecedor!");
      if (selectedItems.length === 0) return alert("Selecione itens!");
      processShoppingListToPurchase(state.shoppingList.filter(i => selectedItems.includes(i.id)), targetSupplier);
      setSelectedItems([]);
      setTargetSupplier('');
      alert("Estoque atualizado!");
    };

    const toggleSelect = (id: string) => {
      if (selectedItems.includes(id)) setSelectedItems(prev => prev.filter(i => i !== id));
      else setSelectedItems(prev => [...prev, id]);
    };

    const estimatedCost = state.shoppingList
      .filter(i => selectedItems.includes(i.id))
      .reduce((acc, item) => {
        const prod = state.products.find(p => p.id === item.productId);
        return acc + (item.quantity * (prod?.cost || 0));
      }, 0);

    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="text-purple-700" /> Lista de Compras
          </h2>
          <button 
            onClick={fillShoppingListWithLowStock}
            className="bg-amber-100 text-amber-900 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-amber-200 border border-amber-200"
          >
            <AlertTriangle className="w-4 h-4" /> Auto Preencher (Estoque Baixo)
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-4 items-end">
           <div className="flex-1">
             <label className="block text-xs font-bold text-gray-700 mb-1">Insumo</label>
             <select className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white font-medium" value={newItemId} onChange={e => setNewItemId(e.target.value)}>
               <option value="">Selecione...</option>
               {state.products.filter(p => p.type === 'insumo' || p.type === 'revenda').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
           </div>
           <div className="w-24">
             <label className="block text-xs font-bold text-gray-700 mb-1">Qtd</label>
             <input type="number" className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white font-medium" min="1" value={newItemQty} onChange={e => setNewItemQty(Number(e.target.value))} />
           </div>
           <button onClick={() => { if(newItemId) { addToShoppingList(newItemId, newItemQty); setNewItemId(''); setNewItemQty(1); } }} className="bg-purple-600 text-white px-6 py-2 rounded-lg h-[42px] font-bold">Adicionar</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="divide-y divide-gray-200">
               {state.shoppingList.length === 0 && <p className="p-8 text-center text-gray-500 font-medium">Lista vazia.</p>}
               {state.shoppingList.map(item => {
                 const product = state.products.find(p => p.id === item.productId);
                 return (
                   <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                     <input type="checkbox" className="w-5 h-5 cursor-pointer" checked={selectedItems.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                     <div className="flex-1">
                       <p className="font-bold text-gray-900 text-lg">{product?.name}</p>
                       <p className="text-sm text-gray-700 font-medium">{product?.supplierId ? state.suppliers.find(s => s.id === product.supplierId)?.name : 'Sem fornecedor fixo'}</p>
                     </div>
                     <div className="text-right mr-4">
                       <p className="font-black text-gray-900 text-lg">{item.quantity} {product?.unit}</p>
                       <p className="text-sm text-gray-700 font-medium">R$ {((product?.cost || 0) * item.quantity).toFixed(2)}</p>
                     </div>
                     <button onClick={() => removeFromShoppingList([item.id])} className="text-red-500 hover:text-red-700 p-2"><Trash2 className="w-5 h-5" /></button>
                   </div>
                 );
               })}
             </div>
          </div>

          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
            <h3 className="font-bold text-gray-900 mb-4 text-lg">Finalizar Compra</h3>
            <div className="space-y-4">
              <select className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white font-medium" value={targetSupplier} onChange={e => setTargetSupplier(e.target.value)}>
                <option value="">Selecione Fornecedor...</option>
                {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="bg-gray-100 p-3 rounded-lg flex justify-between text-gray-800"><span className="text-sm font-bold">Itens:</span><span className="font-black">{selectedItems.length}</span></div>
              <div className="bg-gray-100 p-3 rounded-lg flex justify-between text-gray-800"><span className="text-sm font-bold">Total Est.:</span><span className="font-black text-green-700">R$ {estimatedCost.toFixed(2)}</span></div>
              <button onClick={handleProcessPurchase} disabled={selectedItems.length === 0} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 text-lg shadow-md">Confirmar Entrada</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Purchases = () => {
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [purchaseCart, setPurchaseCart] = useState<CartItem[]>([]);
    const [aiSuggestion, setAiSuggestion] = useState('');

    const handleAddPurchase = () => {
      if (!selectedSupplier || purchaseCart.length === 0) return;
      addPurchase(selectedSupplier, purchaseCart);
      setPurchaseCart([]);
      alert("Estoque atualizado!");
    };

    const getAiSuggestion = async () => {
      if (!selectedSupplier) return;
      const text = await suggestRestockOrder(state.products.filter(p => p.type === 'insumo'), selectedSupplier);
      setAiSuggestion(text);
    };

    // Only filter 'insumo' (ingredients) for purchasing
    const availableProducts = state.products.filter(p => p.supplierId === selectedSupplier && p.type === 'insumo');

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Entrada de Nota / Compras</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <label className="block text-sm font-bold text-gray-800 mb-2">Fornecedor</label>
              <select className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white" value={selectedSupplier} onChange={e => { setSelectedSupplier(e.target.value); setPurchaseCart([]); setAiSuggestion(''); }}>
                <option value="">Selecione...</option>
                {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {selectedSupplier && (
                <button onClick={getAiSuggestion} className="mt-4 w-full bg-purple-50 text-purple-800 border border-purple-200 py-2 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-purple-100 font-bold">
                  <Sparkles className="w-4 h-4" /> Sugerir Pedido
                </button>
              )}
            </div>
            {aiSuggestion && <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 text-sm text-purple-900 whitespace-pre-line font-medium">{aiSuggestion}</div>}
          </div>

          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            {selectedSupplier ? (
              <>
                <h3 className="font-bold text-gray-800 mb-4">Itens do Fornecedor</h3>
                <div className="flex gap-2 mb-4">
                  <select id="prodSelect" className="flex-1 border border-gray-400 p-2 rounded-lg text-black bg-white">
                    {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name} (Atual: {p.stock} {p.unit})</option>)}
                  </select>
                  <input id="qtyInput" type="number" placeholder="Qtd" className="w-20 border border-gray-400 p-2 rounded-lg text-black bg-white placeholder-gray-600" />
                  <button onClick={() => {
                      const sel = document.getElementById('prodSelect') as HTMLSelectElement;
                      const qty = document.getElementById('qtyInput') as HTMLInputElement;
                      const prod = availableProducts.find(p => p.id === sel.value);
                      if (prod && Number(qty.value) > 0) {
                        setPurchaseCart([...purchaseCart, { productId: prod.id, productName: prod.name, quantity: Number(qty.value), unitPrice: prod.cost }]);
                        qty.value = '';
                      }
                    }} className="bg-blue-600 text-white px-4 rounded-lg font-bold">Add</button>
                </div>
                <div className="space-y-2 mb-6">
                  {purchaseCart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-100 p-3 rounded border border-gray-200">
                      <span className="text-gray-900 font-bold">{item.productName} (x{item.quantity})</span>
                      <span className="text-gray-800 font-medium">R$ {(item.quantity * item.unitPrice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center border-t border-gray-200 pt-4">
                   <span className="font-black text-xl text-gray-900">Total: R$ {purchaseCart.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0).toFixed(2)}</span>
                   <button onClick={handleAddPurchase} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-bold shadow-md">Confirmar</button>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 font-medium">Selecione um fornecedor.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f1f5f9]">
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-black text-blue-700 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">L</div>
            Lanchonete AI
          </h1>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs font-bold text-gray-600">Usuário:</p>
            <p className="text-sm font-black text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize mt-1">{user?.role}</p>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="mt-3 w-full bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-purple-200"
          >
            <HelpCircle className="w-4 h-4" />
            Ajuda (F1)
          </button>
        </div>
        <nav className="flex-1 p-4">
          {hasPermission('view_dashboard') && <SidebarItem icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />}
          {hasPermission('view_pos') && <SidebarItem icon={ShoppingCart} label="PDV (Vendas)" active={view === 'pos'} onClick={() => setView('pos')} />}
          {hasPermission('view_inventory') && <SidebarItem icon={Package} label="Estoque / Receitas" active={view === 'inventory'} onClick={() => setView('inventory')} />}
          {hasPermission('manage_products') && <SidebarItem icon={Users} label="Clientes" active={view === 'customers'} onClick={() => setView('customers')} />}
          {hasPermission('view_shopping_list') && <SidebarItem icon={ClipboardList} label="Lista de Compras" active={view === 'shopping-list'} onClick={() => setView('shopping-list')} />}
          {hasPermission('view_purchases') && <SidebarItem icon={Truck} label="Entrada de Notas" active={view === 'purchases'} onClick={() => setView('purchases')} />}
          <div className="my-2 border-t border-gray-200"></div>
          {hasPermission('view_financial') && <SidebarItem icon={TrendingUp} label="Financeiro" active={view === 'financial'} onClick={() => setView('financial')} />}
          {hasPermission('view_expenses') && <SidebarItem icon={Receipt} label="Despesas" active={view === 'expenses'} onClick={() => setView('expenses')} />}
          {hasPermission('view_cash_register') && <SidebarItem icon={Wallet} label="Caixa" active={view === 'cash-register'} onClick={() => setView('cash-register')} />}
          {hasPermission('view_reports') && <SidebarItem icon={FileText} label="Relatórios" active={view === 'reports'} onClick={() => setView('reports')} />}
          <div className="my-2 border-t border-gray-200"></div>
          {hasPermission('view_financial') && <SidebarItem icon={DollarSign} label="Crediário" active={view === 'crediario'} onClick={() => setView('crediario')} />}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors font-semibold"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {loading ? (
           <div className="flex h-full items-center justify-center text-blue-600 font-bold text-xl">Carregando Sistema...</div>
        ) : (
           <>
            {view === 'dashboard' && <Dashboard />}
            {view === 'pos' && <POS />}
            {view === 'inventory' && <Inventory />}
            {view === 'customers' && <CustomersManager customers={state.customers} sales={state.sales} onAddCustomer={addCustomer} onUpdateCustomer={updateCustomer} onDeleteCustomer={deleteCustomer} />}
            {view === 'shopping-list' && <ShoppingListView />}
            {view === 'purchases' && <Purchases />}
            {view === 'financial' && <FinancialDashboard />}
            {view === 'expenses' && <ExpensesManager />}
            {view === 'cash-register' && <CashRegister />}
            {view === 'reports' && <ReportsView />}
            {view === 'crediario' && <CrediarioManager customers={state.customers} />}
           </>
        )}
      </main>

      {/* Help Menu */}
      <HelpMenu isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};

export default App;