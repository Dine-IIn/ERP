import { Capacitor } from '@capacitor/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { invoke } from '@tauri-apps/api/core';

export const isTauriClient = (): boolean => {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
};

export const logToConsole = async (level: 'info' | 'warn' | 'error', message: string) => {
  if (level === 'error') {
    console.error(`[${level.toUpperCase()}] ${message}`);
  } else if (level === 'warn') {
    console.warn(`[${level.toUpperCase()}] ${message}`);
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
  if (isTauriClient()) {
    try {
      await invoke('log_message', { level, message });
    } catch (e) {
      // Ignore
    }
  }
};

export const getActiveFetch = (): typeof fetch => {
  // === DIAGNOSTIC BYPASS TEST ===
  // Toggle this flag to test standard browser fetch vs Tauri native http plugin fetch:
  // - Set useBypass to true: returns window.fetch to bypass tauri-plugin-http permissions scope validation (works on localhost port 5173).
  // - Set useBypass to false: returns tauriFetch to execute calls through Tauri's native Rust client (required for production WebView mixed content bypass).
  const useBypass = false; 

  if (isTauriClient() && !useBypass) {
    return tauriFetch;
  }
  return (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
};

import { config } from '../config';

export const getCentralServicesUrl = (): string => {
  return config.centralServicesUrl;
};


const getBaseUrl = () => {
  // Prioritize the dynamically resolved discovery URL stored in localStorage
  const savedUrl = localStorage.getItem('erp_server_url');
  if (savedUrl) {
    return savedUrl;
  }
  
  const url = config.apiUrl;
  if (Capacitor.isNativePlatform()) {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
  }
  return url;
};

// Define BASE_URL as a dynamic getter helper to avoid caching initial undefined parameters on load
export const getActiveBaseUrl = () => getBaseUrl();

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, data: any) {
    super(data.error || data.message || `Request failed with status ${status}`);
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('erp_token');
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Construct URL
  let url = endpoint.startsWith('http') ? endpoint : `${getActiveBaseUrl()}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await getActiveFetch()(url, config);

    // If unauthorized or forbidden, handle automatic logout/redirect
    if (response.status === 401 || response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
      // Dispatch a custom event to notify App.tsx or components about auth expiry
      const detail = errorData.inactiveLogout 
        ? 'inactive' 
        : (errorData.error === 'Session expired or logged out from another device' ? 'overridden' : 'expired');
      window.dispatchEvent(new CustomEvent('auth-expired', { detail }));
      throw new ApiError(response.status, errorData.error ? errorData : { error: 'Session expired or logged out. Please log in again.' });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData);
    }

    // Return JSON or empty if 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json() as T;
  } catch (error) {
    console.error(`🔴 [API Service Error] ${options.method || 'GET'} to ${endpoint} failed:`, error);
    throw error;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T>(endpoint: string, body?: any, options?: RequestOptions) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
    
  put: <T>(endpoint: string, body?: any, options?: RequestOptions) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
    
  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
    
  delete: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
    
  getBaseUrl: () => getActiveBaseUrl(),
};
