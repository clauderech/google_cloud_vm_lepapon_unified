/**
 * Storage Service
 * Gerencia comunicação com backend API ou localStorage
 * Integrado com database_unified.sql
 */

import type { 
  AppState, 
  Product, 
  Supplier, 
  Customer,
  Sale, 
  Purchase, 
  ShoppingListItem, 
  Comanda,
  CartItem
} from '../types';

// CONFIGURAÇÃO: Automático baseado no ambiente
const USE_API = process.env.NODE_ENV === 'production';
const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

const LOCAL_STORAGE_KEY = 'lanchonete_app_state_v5';

export const storageService = {
  
  // =========================================
  // CARREGAR ESTADO INICIAL
  // =========================================
  
  loadState: async (): Promise<AppState> => {
    if (USE_API) {
      try {
        const response = await fetch(`${API_URL}/initial-state`);
        if (!response.ok) throw new Error('Erro ao carregar estado inicial');
        
        const data = await response.json();
        
        // Mapear campos do banco para camelCase
        return {
          products: data.products.map(mapProductFromDB),
          suppliers: data.suppliers.map(mapSupplierFromDB),
          customers: data.customers?.map(mapCustomerFromDB) || [],
          sales: data.sales?.map(mapSaleFromDB) || [],
          purchases: data.purchases?.map(mapPurchaseFromDB) || [],
          shoppingList: data.shoppingList?.map(mapShoppingListFromDB) || [],
          activeComandas: data.activeComandas?.map(mapComandaFromDB) || []
        };
      } catch (e) {
        console.error("Erro ao conectar na API:", e);
        return loadFromLocalStorage();
      }
    } else {
      return loadFromLocalStorage();
    }
  },

  // =========================================
  // SALVAR ESTADO (LocalStorage apenas)
  // =========================================
  
  saveState: async (state: AppState): Promise<void> => {
    if (!USE_API) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    }
    // Em modo API, salvamento é granular por endpoint
  },

  // =========================================
  // VENDAS
  // =========================================
  
  async saveSale(sale: Sale): Promise<{ saleId: string }> {
    if (USE_API) {
      const response = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: sale.items,
          total: sale.total,
          subtotal: sale.subtotal,
          discount: sale.discount || 0,
          paymentMethod: sale.paymentMethod,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          comandaId: sale.comandaId,
          notes: sale.notes
        })
      });
      
      if (!response.ok) throw new Error('Erro ao salvar venda');
      return response.json();
    }
    return { saleId: sale.id };
  },

  // =========================================
  // COMANDAS
  // =========================================
  
  async createComanda(customerName: string, tableNumber?: string): Promise<{ comandaId: string }> {
    if (USE_API) {
      const response = await fetch(`${API_URL}/comandas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, tableNumber })
      });
      
      if (!response.ok) throw new Error('Erro ao criar comanda');
      return response.json();
    }
    return { comandaId: `comanda_${Date.now()}` };
  },

  async updateComanda(comandaId: string, items: CartItem[]): Promise<void> {
    if (USE_API) {
      const response = await fetch(`${API_URL}/comandas/${comandaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      
      if (!response.ok) throw new Error('Erro ao atualizar comanda');
    }
  },

  async closeComanda(comandaId: string, paymentMethod: string): Promise<{ saleId: string }> {
    if (USE_API) {
      const response = await fetch(`${API_URL}/comandas/${comandaId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod })
      });
      
      if (!response.ok) throw new Error('Erro ao fechar comanda');
      return response.json();
    }
    return { saleId: `sale_${Date.now()}` };
  },

  // =========================================
  // COMPRAS
  // =========================================
  
  async savePurchase(purchase: Purchase): Promise<{ purchaseId: string }> {
    if (USE_API) {
      const response = await fetch(`${API_URL}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: purchase.supplierId,
          items: purchase.items,
          total: purchase.total,
          invoiceNumber: purchase.invoiceNumber,
          paymentMethod: purchase.paymentMethod,
          notes: purchase.notes
        })
      });
      
      if (!response.ok) throw new Error('Erro ao salvar compra');
      return response.json();
    }
    return { purchaseId: purchase.id };
  },

  // =========================================
  // PRODUTOS
  // =========================================
  
  async saveProduct(product: Product): Promise<{ productId: string }> {
    if (USE_API) {
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      
      if (!response.ok) throw new Error('Erro ao salvar produto');
      return response.json();
    }
    return { productId: product.id };
  },

  // =========================================
  // FORNECEDORES
  // =========================================
  
  async saveSupplier(supplier: Supplier): Promise<{ supplierId: string }> {
    if (USE_API) {
      const response = await fetch(`${API_URL}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplier)
      });
      
      if (!response.ok) throw new Error('Erro ao salvar fornecedor');
      return response.json();
    }
    return { supplierId: supplier.id };
  },

  // =========================================
  // LISTA DE COMPRAS
  // =========================================
  
  async addToShoppingList(item: ShoppingListItem): Promise<{ itemId: string }> {
    if (USE_API) {
      const response = await fetch(`${API_URL}/shopping-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: item.productId,
          quantity: item.quantity,
          priority: item.priority,
          notes: item.notes
        })
      });
      
      if (!response.ok) throw new Error('Erro ao adicionar à lista');
      return response.json();
    }
    return { itemId: item.id };
  },

  async removeFromShoppingList(itemId: string): Promise<void> {
    if (USE_API) {
      const response = await fetch(`${API_URL}/shopping-list/${itemId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Erro ao remover da lista');
    }
  }
};

// =========================================
// FUNÇÕES AUXILIARES - MAPEAMENTO
// =========================================

function mapProductFromDB(p: any): Product {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    price: parseFloat(p.price),
    cost: parseFloat(p.cost),
    stock: parseFloat(p.stock),
    minStock: parseFloat(p.min_stock),
    maxStock: p.max_stock ? parseFloat(p.max_stock) : undefined,
    unit: p.unit,
    supplierId: p.supplier_id || '',
    category: p.category,
    description: p.description,
    barcode: p.barcode,
    isActive: p.is_active !== false,
    recipe: p.recipe || []
  };
}

function mapSupplierFromDB(s: any): Supplier {
  return {
    id: s.id,
    name: s.name,
    contact: s.contact,
    email: s.email,
    cnpj: s.cnpj,
    address: s.address,
    city: s.city,
    state: s.state
  };
}

function mapCustomerFromDB(c: any): Customer {
  return {
    id: c.id,
    nome: c.nome,
    fone: c.fone,
    email: c.email,
    endereco: c.endereco,
    dataCadastro: c.data_cadastro,
    loyaltyPoints: c.loyalty_points || 0
  };
}

function mapSaleFromDB(s: any): Sale {
  return {
    id: s.id,
    date: s.date,
    items: s.items || [],
    total: parseFloat(s.total),
    subtotal: parseFloat(s.subtotal),
    discount: s.discount ? parseFloat(s.discount) : 0,
    paymentMethod: s.payment_method,
    customerName: s.customer_name,
    customerPhone: s.customer_phone,
    comandaId: s.comanda_id,
    notes: s.notes
  };
}

function mapPurchaseFromDB(p: any): Purchase {
  return {
    id: p.id,
    date: p.date,
    supplierId: p.supplier_id,
    items: p.items || [],
    total: parseFloat(p.total),
    status: p.status,
    invoiceNumber: p.invoice_number,
    paymentMethod: p.payment_method,
    paymentDate: p.payment_date,
    notes: p.notes
  };
}

function mapShoppingListFromDB(i: any): ShoppingListItem {
  return {
    id: i.id,
    productId: i.product_id,
    quantity: parseFloat(i.quantity),
    priority: i.priority,
    isPurchased: i.is_purchased,
    purchasedAt: i.purchased_at,
    notes: i.notes
  };
}

function mapComandaFromDB(c: any): Comanda {
  return {
    id: c.id,
    customerName: c.customer_name,
    tableNumber: c.table_number,
    openedAt: c.opened_at,
    closedAt: c.closed_at,
    items: c.items || [],
    total: parseFloat(c.total),
    status: c.status,
    paymentMethod: c.payment_method,
    notes: c.notes
  };
}

// =========================================
// LOCALSTORAGE FALLBACK
// =========================================

function loadFromLocalStorage(): AppState {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      products: parsed.products || [],
      suppliers: parsed.suppliers || [],
      customers: parsed.customers || [],
      sales: parsed.sales || [],
      purchases: parsed.purchases || [],
      shoppingList: parsed.shoppingList || [],
      activeComandas: parsed.activeComandas || []
    };
  }
  
  // Estado inicial vazio
  return {
    products: [],
    suppliers: [],
    customers: [],
    sales: [],
    purchases: [],
    shoppingList: [],
    activeComandas: []
  };
}

export default storageService;
