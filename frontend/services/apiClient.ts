/**
 * Cliente de API com suporte a autenticação
 * Intercepta todas as requisições para adicionar token automaticamente
 */

import { getAuthHeaders, getAuthToken } from './authService';

export interface ApiRequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
  statusText: string;
}

/**
 * Faz uma requisição HTTP com autenticação automática
 */
export const apiCall = async <T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> => {
  try {
    // Preparar URL com query params
    let finalUrl = url;
    if (options.params) {
      const queryParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      const query = queryParams.toString();
      finalUrl = query ? `${url}?${query}` : url;
    }

    // Preparar headers com autenticação
    const headers = {
      ...getAuthHeaders(),
      ...options.headers
    };

    // Preparar body
    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    console.log(`[API] ${options.method || 'GET'} ${url}`, {
      authenticated: !!getAuthToken(),
      headers: {
        ...headers,
        Authorization: headers.Authorization ? 'Bearer ***' : undefined
      }
    });

    const response = await fetch(finalUrl, fetchOptions);
    
    let data: T | undefined;
    let error: string | undefined;

    try {
      const responseData = await response.json();
      if (response.ok) {
        data = responseData;
      } else {
        error = responseData.message || responseData.error || 'Unknown error';
      }
    } catch {
      if (!response.ok) {
        error = `HTTP ${response.status}: ${response.statusText}`;
      }
    }

    const result: ApiResponse<T> = {
      status: response.status,
      statusText: response.statusText,
      data,
      error
    };

    console.log(`[API] Response:`, {
      url,
      status: response.status,
      success: response.ok,
      error
    });

    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Network error';
    console.error(`[API] Error:`, errorMessage);

    return {
      status: 0,
      statusText: 'Network Error',
      error: errorMessage
    };
  }
};

/**
 * Helper para GET
 */
export const get = <T = any>(url: string, options: ApiRequestOptions = {}) => {
  return apiCall<T>(url, { ...options, method: 'GET' });
};

/**
 * Helper para POST
 */
export const post = <T = any>(
  url: string,
  body?: any,
  options: ApiRequestOptions = {}
) => {
  return apiCall<T>(url, { ...options, method: 'POST', body });
};

/**
 * Helper para PUT
 */
export const put = <T = any>(
  url: string,
  body?: any,
  options: ApiRequestOptions = {}
) => {
  return apiCall<T>(url, { ...options, method: 'PUT', body });
};

/**
 * Helper para DELETE
 */
export const del = <T = any>(url: string, options: ApiRequestOptions = {}) => {
  return apiCall<T>(url, { ...options, method: 'DELETE' });
};

export default {
  get,
  post,
  put,
  delete: del,
  apiCall
};
