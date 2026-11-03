/**
 * Financial Service
 * Gerenciamento de ativos diários, despesas e caixa
 */

import type { DailyAssets, Expense, CashRegister } from '../types';
import { getAuthToken } from './authService';

const API_URL = 'http://lepapon-unified.local/api';

export interface FinancialDashboardData {
  period: {
    totalSales: number;
    totalPurchases: number;
    netBalance: number;
    salesCount: number;
    receiptsTotal: number;
  };
  daily: {
    date: string;
    totalSales: number;
    totalPurchases: number;
    netBalance: number;
    salesCount: number;
  }[];
  today: {
    date: string;
    totalSales: number;
    totalPurchases: number;
    netBalance: number;
    salesCount: number;
    averageTicket: number;
    itemsSold: number;
    receiptsTotal: number;
    salesCash: number;
    salesCard: number;
    salesPix: number;
    salesCredit: number;
  };
  cashRegister: {
    status: 'open';
    initialAmount: number;
    expectedAmount: number;
  } | null;
}

function withAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  if (!token) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${token}`
  };
}

export const financialService = {
  async getFinancialDashboard(days: 7 | 30): Promise<FinancialDashboardData> {
    const response = await fetch(`${API_URL}/reports/financial-dashboard?days=${days}`, {
      headers: withAuthHeaders()
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Erro ao carregar dashboard financeiro');
    }
    return response.json();
  },

  // =========================================
  // ATIVOS DIÁRIOS
  // =========================================
  
  async getDailyAssets(startDate?: string, endDate?: string): Promise<DailyAssets[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`${API_URL}/daily-assets?${params}`);
    if (!response.ok) throw new Error('Erro ao buscar ativos diários');
    return response.json();
  },

  async getTodayAssets(): Promise<DailyAssets | null> {
    const response = await fetch(`${API_URL}/daily-assets/today`);
    if (!response.ok) throw new Error('Erro ao buscar ativos do dia');
    return response.json();
  },

  // =========================================
  // DESPESAS
  // =========================================
  
  async addExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<{ expenseId: string }> {
    const response = await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(expense)
    });
    
    if (!response.ok) throw new Error('Erro ao adicionar despesa');
    return response.json();
  },

  async getExpenses(startDate?: string, endDate?: string, category?: string): Promise<Expense[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (category) params.append('category', category);
    
    const response = await fetch(`${API_URL}/expenses?${params}`);
    if (!response.ok) throw new Error('Erro ao buscar despesas');
    return response.json();
  },

  // =========================================
  // CAIXA
  // =========================================
  
  async openCashRegister(initialAmount: number, openedBy: string): Promise<{ registerId: string }> {
    const response = await fetch(`${API_URL}/cash-register/open`, {
      method: 'POST',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ initialAmount, openedBy })
    });
    
    if (!response.ok) throw new Error('Erro ao abrir caixa');
    return response.json();
  },

  async closeCashRegister(
    registerId: string, 
    actualAmount: number, 
    closedBy: string, 
    notes?: string
  ): Promise<{ result: CashRegister }> {
    const response = await fetch(`${API_URL}/cash-register/close`, {
      method: 'POST',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ registerId, actualAmount, closedBy, notes })
    });
    
    if (!response.ok) throw new Error('Erro ao fechar caixa');
    return response.json();
  },

  async getCurrentCashRegister(): Promise<CashRegister | null> {
    const response = await fetch(`${API_URL}/cash-register/current`);
    if (!response.ok) throw new Error('Erro ao buscar caixa atual');
    return response.json();
  },

  async getCashRegisterHistory(days: number = 30): Promise<CashRegister[]> {
    const response = await fetch(`${API_URL}/cash-register/history?days=${days}`);
    if (!response.ok) throw new Error('Erro ao buscar histórico de caixa');
    return response.json();
  },

  // =========================================
  // RELATÓRIOS
  // =========================================
  
  async getMonthlyReport(month: number, year: number): Promise<any> {
    const response = await fetch(`${API_URL}/reports/monthly?month=${month}&year=${year}`, {
      headers: withAuthHeaders()
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Erro ao gerar relatório mensal');
    }
    return response.json();
  },

  async getLowStockReport(): Promise<any[]> {
    const response = await fetch(`${API_URL}/reports/low-stock`, {
      headers: withAuthHeaders()
    });
    if (!response.ok) throw new Error('Erro ao buscar produtos com estoque baixo');
    return response.json();
  },

  async getProductionCapacityReport(): Promise<any[]> {
    const response = await fetch(`${API_URL}/reports/production-capacity`, {
      headers: withAuthHeaders()
    });
    if (!response.ok) throw new Error('Erro ao calcular capacidade de produção');
    return response.json();
  },

  async getBestSellersReport(): Promise<any[]> {
    const response = await fetch(`${API_URL}/reports/sales-by-product`, {
      headers: withAuthHeaders()
    });
    if (!response.ok) throw new Error('Erro ao buscar produtos mais vendidos');
    const sales = await response.json();
    return sales.map((item: {
      product_id: string;
      product_name: string;
      total_quantity: number | string;
      total_value: number | string;
    }) => ({
      productId: item.product_id,
      productName: item.product_name,
      totalQuantity: Number(item.total_quantity) || 0,
      totalRevenue: Number(item.total_value) || 0
    }));
  },

  async getProfitabilityReport(): Promise<any[]> {
    const response = await fetch(`${API_URL}/reports/profitability`, {
      headers: withAuthHeaders()
    });
    if (!response.ok) throw new Error('Erro ao calcular lucratividade');
    return response.json();
  },

  async getSalesByPeriod(startDate: string, endDate: string): Promise<any[]> {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    const response = await fetch(`${API_URL}/reports/sales-by-period?${params}`, {
      headers: withAuthHeaders()
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.message || error.error || 'Erro ao buscar vendas do período');
    }
    return response.json();
  },

  // =========================================
  // UTILITÁRIOS
  // =========================================
  
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('pt-BR');
  },

  formatDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('pt-BR');
  },

  calculateProfitMargin(revenue: number, cost: number): number {
    if (revenue === 0) return 0;
    return ((revenue - cost) / revenue) * 100;
  },

  getCurrentMonth(): number {
    return new Date().getMonth() + 1;
  },

  getCurrentYear(): number {
    return new Date().getFullYear();
  },

  getDateRange(days: number): { startDate: string; endDate: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }
};

export default financialService;
