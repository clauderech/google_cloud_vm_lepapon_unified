/// <reference types="vite/client" />

/**
 * API Service
 * Cliente HTTP centralizado com suporte a token JWT
 */

import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Construir headers padrão com token JWT
   */
  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authService.getAuthHeader(),
      ...customHeaders,
    };
    return headers;
  }

  /**
   * Tratamento de erros de resposta
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        // Token expirou ou inválido
        authService.logout();
        window.location.href = '/login';
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const error = await response.json().catch(() => ({}));
      const message = error.message || error.error || `Erro ${response.status}`;
      throw new Error(message);
    }

    const data = await response.json();
    return data.data || data;
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      ...options,
      headers: this.getHeaders(options.headers as Record<string, string>),
    });
    return this.handleResponse<T>(response);
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      ...options,
      headers: this.getHeaders(options.headers as Record<string, string>),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      ...options,
      headers: this.getHeaders(options.headers as Record<string, string>),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      ...options,
      headers: this.getHeaders(options.headers as Record<string, string>),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      ...options,
      headers: this.getHeaders(options.headers as Record<string, string>),
    });
    return this.handleResponse<T>(response);
  }
}

export const apiService = new ApiService();

// ============================================================================
// Serviços específicos de domínio usando apiService
// ============================================================================

export class ComandaService {
  static async create(data: any) {
    return apiService.post('/api/comandas', data);
  }

  static async list(filters?: any) {
    const query = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return apiService.get(`/api/comandas${query}`);
  }

  static async listOpen() {
    return apiService.get('/api/comandas/open');
  }

  static async getById(id: string) {
    return apiService.get(`/api/comandas/${id}`);
  }

  static async addItem(comandaId: string, itemData: any) {
    return apiService.post(`/api/comandas/${comandaId}/items`, itemData);
  }

  static async updateItem(comandaId: string, itemId: string, data: any) {
    return apiService.put(`/api/comandas/${comandaId}/items/${itemId}`, data);
  }

  static async removeItem(comandaId: string, itemId: string) {
    return apiService.delete(`/api/comandas/${comandaId}/items/${itemId}`);
  }

  static async close(comandaId: string, paymentData: any) {
    return apiService.post(`/api/comandas/${comandaId}/close`, paymentData);
  }

  static async cancel(comandaId: string) {
    return apiService.post(`/api/comandas/${comandaId}/cancel`, {});
  }

  static async update(id: string, data: any) {
    return apiService.put(`/api/comandas/${id}`, data);
  }

  static async delete(id: string) {
    return apiService.delete(`/api/comandas/${id}`);
  }
}

export class StockMovementService {
  static async create(data: any) {
    return apiService.post('/api/stock-movements', data);
  }

  static async list(filters?: any) {
    const query = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return apiService.get(`/api/stock-movements${query}`);
  }

  static async getById(id: string) {
    return apiService.get(`/api/stock-movements/${id}`);
  }

  static async getSummary() {
    return apiService.get('/api/stock-movements/summary');
  }

  static async update(id: string, data: any) {
    return apiService.put(`/api/stock-movements/${id}`, data);
  }

  static async delete(id: string) {
    return apiService.delete(`/api/stock-movements/${id}`);
  }
}

export class RecipeService {
  static async create(data: any) {
    return apiService.post('/api/recipes', data);
  }

  static async list(filters?: any) {
    const query = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return apiService.get(`/api/recipes${query}`);
  }

  static async getById(id: string) {
    return apiService.get(`/api/recipes/${id}`);
  }

  static async getByProductId(productId: string) {
    return apiService.get(`/api/recipes/product/${productId}`);
  }

  static async addIngredient(recipeId: string, ingredientData: any) {
    return apiService.post(`/api/recipes/${recipeId}/ingredients`, ingredientData);
  }

  static async updateIngredient(recipeId: string, ingredientId: string, data: any) {
    return apiService.put(`/api/recipes/${recipeId}/ingredients/${ingredientId}`, data);
  }

  static async removeIngredient(recipeId: string, ingredientId: string) {
    return apiService.delete(`/api/recipes/${recipeId}/ingredients/${ingredientId}`);
  }

  static async getProductionCapacity(recipeId: string) {
    return apiService.get(`/api/recipes/${recipeId}/production-capacity`);
  }

  static async validateStock(recipeId: string, quantity: number) {
    return apiService.get(`/api/recipes/${recipeId}/validate-stock?quantity=${quantity}`);
  }

  static async update(id: string, data: any) {
    return apiService.put(`/api/recipes/${id}`, data);
  }

  static async delete(id: string) {
    return apiService.delete(`/api/recipes/${id}`);
  }
}

export class LoyaltyService {
  static async create(data: any) {
    return apiService.post('/api/loyalty-transactions', data);
  }

  static async list(filters?: any) {
    const query = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return apiService.get(`/api/loyalty-transactions${query}`);
  }

  static async getById(id: string) {
    return apiService.get(`/api/loyalty-transactions/${id}`);
  }

  static async listByCustomer(customerId: string) {
    return apiService.get(`/api/loyalty-transactions/customer/${customerId}`);
  }

  static async getBalance(customerId: string) {
    return apiService.get(`/api/loyalty-transactions/customer/${customerId}/balance`);
  }

  static async addPoints(customerId: string, points: number, reason: string) {
    return apiService.post('/api/loyalty-transactions/add-points', {
      customer_id: customerId,
      points,
      reason,
    });
  }

  static async redeemPoints(customerId: string, points: number) {
    return apiService.post('/api/loyalty-transactions/redeem-points', {
      customer_id: customerId,
      points,
    });
  }

  static async adjustPoints(id: string, data: any) {
    return apiService.put(`/api/loyalty-transactions/${id}/adjust`, data);
  }
}

export class UserService {
  static async getMe() {
    return apiService.get('/api/users/me');
  }

  static async list() {
    return apiService.get('/api/users');
  }

  static async update(id: string, data: any) {
    return apiService.put(`/api/users/${id}`, data);
  }

  static async delete(id: string) {
    return apiService.delete(`/api/users/${id}`);
  }
}
