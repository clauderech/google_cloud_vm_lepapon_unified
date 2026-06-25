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
  CustomerDropdownItem,
  Sale, 
  Purchase, 
  ShoppingListItem, 
  Comanda,
  CartItem
} from '../types';
import { getAuthToken } from './authService';

// CONFIGURAÇÃO: Automático baseado no ambiente
const USE_API = process.env.NODE_ENV === 'production';
const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

const LOCAL_STORAGE_KEY = 'lanchonete_app_state_v5';

function withAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  if (!token) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${token}`
  };
}

export function calculateMaxProduciableFor(productId: string, allProducts: Product[]): number {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return 0;
  if (product.type === 'insumo' || product.type === 'insumo_bebida' || product.type === 'revenda') {
    return Number(product.stock) || 0;
  }
  if (!product.recipe || product.recipe.length === 0) return 0;

  let maxCount = Infinity;
  for (const item of product.recipe) {
    const qtyNeeded = Number(item.quantity);
    if (!qtyNeeded || qtyNeeded <= 0) return 0;
    const ingredient = allProducts.find(p => p.id === item.ingredientId);
    if (!ingredient) return 0;
    const possible = Math.floor((Number(ingredient.stock) || 0) / qtyNeeded);
    if (possible < maxCount) maxCount = possible;
  }

  return maxCount === Infinity ? 0 : maxCount;
}

export const storageService = {
    async updateProduct(product: Product): Promise<void> {
      if (USE_API) {
        // Enviar todos os campos relevantes, incluindo recipe
        const payload = {
          id: product.id,
          name: product.name,
          type: product.type,
          price: product.price,
          cost: product.cost,
          stock: product.stock,
          min_stock: product.minStock,
          max_stock: product.maxStock,
          unit: product.unit,
          supplier_id: product.supplierId && product.supplierId !== '' ? product.supplierId : null,
          category: product.category,
          description: product.description,
          barcode: product.barcode,
          is_active: product.is_active,
          recipe: product.recipe || []
        };
        const response = await fetch(`${API_URL}/products/${product.id}`, {
          method: 'PUT',
          headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Erro ao atualizar produto');
      }
    },
  
  // =========================================
  // CARREGAR ESTADO INICIAL
  // =========================================
  
  loadState: async (): Promise<AppState> => {
    if (USE_API) {
      try {
        const response = await fetch(`${API_URL}/initial-state`, {
          headers: withAuthHeaders()
        });
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
      console.log('[FRONTEND][SAVE_SALE][REQ]', { 
        itemsCount: sale.items?.length || 0,
        total: sale.total,
        paymentMethod: sale.paymentMethod
      });
      
      const payload = {
        items: sale.items || [],
        total: sale.total || 0,
        subtotal: sale.subtotal || 0,
        discount: sale.discount || 0,
        paymentMethod: sale.paymentMethod,
        customerName: sale.customerName || null,
        customerPhone: sale.customerPhone || null,
        customerId: sale.customerId || null,
        comandaId: sale.comandaId || null,
        notes: sale.notes || null,
        date: sale.date || new Date().toISOString()
      };
      
      console.log('[FRONTEND][SAVE_SALE][PAYLOAD]', payload);
      
      const response = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[FRONTEND][SAVE_SALE][ERROR]', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Erro ao salvar venda: ${errorData.details || response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[FRONTEND][SAVE_SALE][SUCCESS]', result);
      return { saleId: result.saleId };
    }
    return { saleId: sale.id };
  },

  // =========================================
  // CLIENTES
  // =========================================
  
  async saveCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }> {
    if (USE_API) {
      const response = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(customer)
      });
      if (!response.ok) throw new Error('Erro ao criar cliente');
      return response.json();
    }
    return { id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
  },

  // =========================================
  // COMANDAS
  // =========================================
  
  async createComanda(customerName: string, tableNumber?: string, customerId?: string): Promise<{ comandaId: string }> {
    if (USE_API) {
      // Gerar id único: timestamp + random
      const id = `comanda_${Date.now()}_${Math.floor(Math.random()*100000)}`;
      const payload = {
        id,
        customer_name: customerName,
        customer_id: customerId || null,
        table_number: tableNumber,
        status: 'open',
        source: 'pos'
      };
      const response = await fetch(`${API_URL}/comandas`, {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Erro ao criar comanda');
      return { comandaId: id };
    }
    // Fallback local
    return { comandaId: `comanda_${Date.now()}_${Math.floor(Math.random()*100000)}` };
  },

  async updateComanda(comandaId: string, items: CartItem[], customerId?: string): Promise<void> {
    if (USE_API) {
      const payload: any = { items };
      if (customerId !== undefined) {
        payload.customer_id = customerId || null;
      }
      
      const response = await fetch(`${API_URL}/comandas/${comandaId}`, {
        method: 'PUT',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Erro ao atualizar comanda');
    }
  },

  async closeComanda(comandaId: string, paymentMethod: string, customerId?: string): Promise<{ saleId: string }> {
    if (USE_API) {
      const response = await fetch(`${API_URL}/comandas/${comandaId}/close`, {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ paymentMethod, customerId })
      });
      
      if (!response.ok) throw new Error('Erro ao fechar comanda');
      return response.json();
    }
    return { saleId: `sale_${Date.now()}` };
  },

  async cancelComanda(comandaId: string): Promise<{ success: boolean; message?: string; itemsReverted?: number }> {
    if (USE_API) {
      const response = await fetch(`${API_URL}/comandas/${comandaId}`, {
        method: 'DELETE',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao cancelar comanda');
      }
      
      return response.json();
    }
    return { success: true, message: 'Comanda cancelada (modo local)' };
  },

  async getCustomersDropdown(): Promise<CustomerDropdownItem[]> {
    console.log('[DEBUG] getCustomersDropdown - USE_API:', USE_API);
    if (USE_API) {
      try {
        console.log('[DEBUG] Tentando buscar via API:', `${API_URL}/customers/dropdown`);
        const response = await fetch(`${API_URL}/customers/dropdown`, {
          headers: withAuthHeaders()
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const result = await response.json();
        console.log('[DEBUG] Resultado da API:', result);
        return result;
      } catch (error) {
        console.error('[DEBUG] Erro na API, usando fallback local:', error);
      }
    }
    // Fallback local: formatar clientes existentes
    console.log('[DEBUG] Usando fallback local');
    const state = await this.loadState();
    console.log('[DEBUG] Estado carregado:', state);
    const customers = state.customers || [];
    console.log('[DEBUG] Clientes encontrados:', customers);
    
    const formatted = customers.map(customer => ({
      id: customer.id,
      displayName: `${customer.id}_${customer.nome}${customer.sobrenome ? '_' + customer.sobrenome : ''}`.replace(/\s+/g, '_'),
      originalData: customer
    }));
    console.log('[DEBUG] Clientes formatados:', formatted);
    return formatted;
  },

  // =========================================
  // COMPRAS
  // =========================================
  
  async savePurchase(purchase: Purchase): Promise<{ purchaseId: string }> {
    if (USE_API) {
      const response = await fetch(`${API_URL}/purchases`, {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          supplierId: purchase.supplierId,
          items: purchase.items,
          total: purchase.total,
          invoiceNumber: purchase.invoiceNumber
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
  
  async getProducts(): Promise<Product[]> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_URL}/products`, {
          headers: withAuthHeaders()
        });
        if (!response.ok) throw new Error('Erro ao buscar produtos');
        
        const products = await response.json();
        return products.map(mapProductFromDB);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        throw error;
      }
    } else {
      // LocalStorage fallback
      const state = loadFromLocalStorage();
      return state.products;
    }
  },
  
  async saveProduct(product: Product): Promise<{ productId: string }> {
    if (USE_API) {
      // Mapear camelCase para snake_case (padrão do banco)
      const payload = {
        id: product.id,
        name: product.name,
        type: product.type,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        min_stock: product.minStock,
        max_stock: product.maxStock,
        unit: product.unit,
        supplier_id: product.supplierId && product.supplierId !== '' ? product.supplierId : null,
        category: product.category,
        description: product.description,
        barcode: product.barcode,
        is_active: product.is_active,
        recipe: product.recipe || []
      };
      
      console.log('[STORAGE][SAVE_PRODUCT][PAYLOAD]', {
        id: payload.id,
        name: payload.name,
        min_stock: payload.min_stock,
        supplier_id: payload.supplier_id
      });
      
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[STORAGE][SAVE_PRODUCT][ERROR]', {
          status: response.status,
          error: errorData
        });
        throw new Error(`Erro ao salvar produto: ${errorData.details || response.statusText}`);
      }
      
      return response.json();
    }
    return { productId: product.id };
  },
  // Função para atualizar stock no Lepapon para o gemini
  async patchProductStockToLepapon(productId: string, stock: number): Promise<void> {
    const url = `${API_URL}/products/${encodeURIComponent(productId)}/lepapon-stock`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ stock })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Lepapon update failed: ${res.status} ${res.statusText} ${body}`);
    }
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
  },

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
    is_active: p.is_active === 1 || p.is_active === "1",
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
    sobrenome: c.sobrenome,
    fone: c.fone,
    created_at: c.created_at,
    updated_at: c.updated_at,
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
    created_at: p.created_at
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
  const items = Array.isArray(c.items) ? c.items.map((item: any) => ({
    ...item,
    quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity),
    unitPrice: typeof item.unit_price === 'number' ? item.unit_price : parseFloat(item.unit_price),
    productId: item.product_id,
    productName: item.product_name,
    status: item.status,
    notes: item.notes
  })) : [];
  const total = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
  return {
    id: c.id,
    customerName: c.customer_name,
    tableNumber: c.table_number,
    openedAt: c.opened_at,
    closedAt: c.closed_at,
    items,
    total,
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
