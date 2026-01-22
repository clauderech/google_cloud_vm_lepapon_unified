/**
 * Financial Service
 * Gerenciamento de ativos diários, despesas e caixa
 */

import type { DailyAssets, Expense, CashRegister } from '../types';

const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

export const financialService = {
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
    const response = await fetch(`${API_URL}/reports/monthly?month=${month}&year=${year}`);
    if (!response.ok) throw new Error('Erro ao gerar relatório mensal');
    return response.json();
  },

  async getLowStockReport(): Promise<any[]> {
    const response = await fetch(`${API_URL}/reports/low-stock`);
    if (!response.ok) throw new Error('Erro ao buscar produtos com estoque baixo');
    return response.json();
  },

  async getProductionCapacityReport(): Promise<any[]> {
    const response = await fetch(`${API_URL}/reports/production-capacity`);
    if (!response.ok) throw new Error('Erro ao calcular capacidade de produção');
    return response.json();
  },

  async getBestSellersReport(): Promise<any[]> {
    const response = await fetch(`${API_URL}/reports/best-sellers`);
    if (!response.ok) throw new Error('Erro ao buscar produtos mais vendidos');
    return response.json();
  },

  async getProfitabilityReport(): Promise<any[]> {
    const response = await fetch(`${API_URL}/reports/profitability`);
    if (!response.ok) throw new Error('Erro ao calcular lucratividade');
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
