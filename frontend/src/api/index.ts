import axios, { AxiosInstance, AxiosRequestConfig, CancelTokenSource } from 'axios';
import type { Dashboard, DataSource, Chart, ShareLink, ApiResponse, PaginationParams } from '@/types';

const pendingRequests: Map<string, CancelTokenSource> = new Map();

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

function getRequestKey(config: AxiosRequestConfig | undefined): string {
  if (!config) {
    return `unknown:${Date.now()}`;
  }
  const method = (config.method || 'GET').toUpperCase();
  const url = config.url || '';
  return `${method}:${url}:${JSON.stringify(config.params || {})}:${JSON.stringify(config.data || {})}`;
}

api.interceptors.request.use((config) => {
  if (!config) {
    return Promise.reject(new Error('Request config is required'));
  }
  const key = getRequestKey(config);
  if (pendingRequests.has(key)) {
    pendingRequests.get(key)?.cancel('Duplicate request cancelled');
  }
  const source = axios.CancelToken.source();
  config.cancelToken = source.token;
  pendingRequests.set(key, source);
  return config;
});

api.interceptors.response.use(
  (response) => {
    const key = getRequestKey(response?.config);
    pendingRequests.delete(key);
    return response.data;
  },
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(new Error('Request cancelled'));
    }
    const key = getRequestKey(error?.config);
    pendingRequests.delete(key);
    const message = error?.response?.data?.error || error?.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export const dashboardApi = {
  list: (params: Partial<PaginationParams & { isActive?: boolean }>) =>
    api.get<any, ApiResponse<Dashboard[]>>('/dashboards', { params }),

  get: (id: string) =>
    api.get<any, ApiResponse<Dashboard>>(`/dashboards/${id}`),

  create: (data: Partial<Dashboard>) =>
    api.post<any, ApiResponse<Dashboard>>('/dashboards', data),

  update: (id: string, data: Partial<Dashboard>) =>
    api.put<any, ApiResponse<Dashboard>>(`/dashboards/${id}`, data),

  delete: (id: string) =>
    api.delete<any, ApiResponse<void>>(`/dashboards/${id}`),

  copy: (id: string) =>
    api.post<any, ApiResponse<Dashboard>>(`/dashboards/${id}/copy`),

  publish: (id: string) =>
    api.post<any, ApiResponse<Dashboard>>(`/dashboards/${id}/publish`),

  unpublish: (id: string) =>
    api.post<any, ApiResponse<Dashboard>>(`/dashboards/${id}/unpublish`),

  activate: (id: string) =>
    api.post<any, ApiResponse<Dashboard>>(`/dashboards/${id}/activate`),

  deactivate: (id: string) =>
    api.post<any, ApiResponse<Dashboard>>(`/dashboards/${id}/deactivate`),

  getVersion: (id: string) =>
    api.get<any, ApiResponse<{ version: number }>>(`/dashboards/${id}/version`)
};

export const dataSourceApi = {
  list: (params: Partial<PaginationParams>) =>
    api.get<any, ApiResponse<DataSource[]>>('/data-sources', { params }),

  get: (id: string) =>
    api.get<any, ApiResponse<DataSource>>(`/data-sources/${id}`),

  create: (data: Partial<DataSource>) =>
    api.post<any, ApiResponse<DataSource>>('/data-sources', data),

  update: (id: string, data: Partial<DataSource>) =>
    api.put<any, ApiResponse<DataSource>>(`/data-sources/${id}`, data),

  delete: (id: string) =>
    api.delete<any, ApiResponse<void>>(`/data-sources/${id}`),

  test: (id: string) =>
    api.post<any, ApiResponse<{ success: boolean }>>(`/data-sources/${id}/test`)
};

export const chartApi = {
  list: (dashboardId: string) =>
    api.get<any, ApiResponse<Chart[]>>(`/charts/${dashboardId}`),

  create: (dashboardId: string, data: Partial<Chart>) =>
    api.post<any, ApiResponse<Chart>>(`/charts/${dashboardId}`, data),

  update: (dashboardId: string, chartId: string, data: Partial<Chart>) =>
    api.put<any, ApiResponse<Chart>>(`/charts/${dashboardId}/${chartId}`, data),

  delete: (dashboardId: string, chartId: string) =>
    api.delete<any, ApiResponse<void>>(`/charts/${dashboardId}/${chartId}`)
};

export const dataQueryApi = {
  query: (dataSourceId: string, filters?: Record<string, any>) =>
    api.post<any, ApiResponse<{ data: any[]; total: number }>>(`/data-query/${dataSourceId}`, { filters }),

  queryChart: (chartId: string, filters?: Record<string, any>) =>
    api.post<any, ApiResponse<{ data: any[]; total: number; config: any }>>(`/data-query/chart/${chartId}`, { filters })
};

export const shareApi = {
  create: (dashboardId: string, expiresInHours?: number) =>
    api.post<any, ApiResponse<ShareLink>>(`/share/${dashboardId}`, { expiresInHours }),

  list: (dashboardId: string) =>
    api.get<any, ApiResponse<ShareLink[]>>(`/share/${dashboardId}`),

  revoke: (dashboardId: string, shareId: string) =>
    api.post<any, ApiResponse<void>>(`/share/${dashboardId}/revoke/${shareId}`),

  access: (token: string) =>
    api.get<any, ApiResponse<{ dashboard: Dashboard; charts: Chart[] }>>(`/share/access/${token}`),

  validate: (shareId: string) =>
    api.get<any, ApiResponse<{ isValid: boolean; expiresAt?: string; isActive: boolean }>>(`/share/${shareId}/validate`)
};

export default api;
