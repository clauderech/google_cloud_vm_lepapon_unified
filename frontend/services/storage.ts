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
// Durante desenvolvimento (dev server), usar localhost
// Em produção, usar /api (mesmo servidor)
const USE_API = import.meta.env.PROD || window.location.hostname !== 'localhost';
const API_URL = import.meta.env.PROD 
  ? '/api' 
  : 'http://localhost:3000/api';

console.log('[Storage Config] USE_API:', USE_API, '| API_URL:', API_URL, '| hostname:', window.location.hostname);

const LOCAL_STORAGE_KEY = 'lanchonete_app_state_v5';

export const storageService = {
  
  // =========================================
  // CARREGAR ESTADO INICIAL
  // =========================================
  
  loadState: async (): Promise<AppState> => {
    if (USE_API) {
      try {
        console.log('[Storage] Carregando estado da API:', `${API_URL}/initial-state`);
        const response = await fetch(`${API_URL}/initial-state`);
        if (!response.ok) {
          console.error('[Storage] Erro na resposta da API:', response.status, response.statusText);
          throw new Error('Erro ao carregar estado inicial');
        }
        
        const data = await response.json();
        console.log('[Storage] Dados recebidos da API:', {
          products: data.products?.length || 0,
          suppliers: data.suppliers?.length || 0,
          customers: data.customers?.length || 0
        });
        
        // Mapear campos do banco para camelCase
        const state = {
          products: (data.products || []).map(mapProductFromDB),
          suppliers: (data.suppliers || []).map(mapSupplierFromDB),
          customers: (data.customers || []).map(mapCustomerFromDB),
          sales: (data.sales || []).map(mapSaleFromDB),
          purchases: (data.purchases || []).map(mapPurchaseFromDB),
          shoppingList: (data.shoppingList || []).map(mapShoppingListFromDB),
          activeComandas: (data.activeComandas || []).map(mapComandaFromDB)
        };
        
        console.log('[Storage] Estado mapeado:', {
          products: state.products.length,
          suppliers: state.suppliers.length,
          customers: state.customers.length
        });
        
        return state;
      } catch (e) {
        console.error("[Storage] Erro ao conectar na API:", e);
        console.log('[Storage] Fallback para localStorage');
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
      // Mapear campos do frontend para o formato do backend
      const productData = {
        id: product.id,
        name: product.name,
        type: product.type,
        category: product.category,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        min_stock: product.minStock,
        max_stock: product.maxStock,
        unit: product.unit,
        supplier_id: product.supplierId,
        description: product.description,
        barcode: product.barcode,
        is_active: product.isActive !== undefined ? product.isActive : true
      };
      
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar produto');
      }
      return response.json();
    }
    return { productId: product.id };
  },

  async updateProduct(productId: string, product: Partial<Product>): Promise<void> {
    if (USE_API) {
      // Mapear campos do frontend para o formato do backend
      const productData: any = {};
      if (product.name !== undefined) productData.name = product.name;
      if (product.type !== undefined) productData.type = product.type;
      if (product.category !== undefined) productData.category = product.category;
      if (product.price !== undefined) productData.price = product.price;
      if (product.cost !== undefined) productData.cost = product.cost;
      if (product.stock !== undefined) productData.stock = product.stock;
      if (product.minStock !== undefined) productData.min_stock = product.minStock;
      if (product.maxStock !== undefined) productData.max_stock = product.maxStock;
      if (product.unit !== undefined) productData.unit = product.unit;
      if (product.supplierId !== undefined) productData.supplier_id = product.supplierId;
      if (product.description !== undefined) productData.description = product.description;
      if (product.barcode !== undefined) productData.barcode = product.barcode;
      if (product.isActive !== undefined) productData.is_active = product.isActive;
      if (product.recipe !== undefined) productData.recipe = product.recipe;

      const response = await fetch(`${API_URL}/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar produto');
      }
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
    price: p.price != null ? parseFloat(p.price) : 0,
    cost: p.cost != null ? parseFloat(p.cost) : 0,
    stock: p.stock != null ? parseFloat(p.stock) : 0,
    minStock: p.min_stock != null ? parseFloat(p.min_stock) : 10,
    maxStock: p.max_stock ? parseFloat(p.max_stock) : undefined,
    unit: p.unit || 'un',
    supplierId: p.supplier_id || '',
    category: p.category || 'Geral',
    description: p.description,
    barcode: p.barcode,
    isActive: p.is_active !== false && p.is_active !== 0,
    recipe: p.recipe || [],
    created_at: p.created_at,
    updated_at: p.updated_at
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
