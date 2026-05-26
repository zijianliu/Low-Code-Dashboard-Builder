export type DataSourceType = 'rest_api' | 'static_json' | 'database';
export type ChartType = 'line' | 'bar' | 'pie' | 'metric' | 'table';
export type HttpMethod = 'GET' | 'POST';
export type AuthType = 'none' | 'bearer' | 'basic' | 'api_key';
export type DashboardVisibility = 'private' | 'team' | 'public';
export type FilterType = 'date_range' | 'region' | 'business_line' | 'organization' | 'enum';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  organizationId: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  description?: string;
  config: DataSourceConfig;
  createdBy: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataSourceConfig {
  url?: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  body?: any;
  auth?: {
    type: AuthType;
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  timeout?: number;
  jsonData?: string;
  sqlQuery?: string;
  fieldMapping?: Record<string, string>;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  visibility: DashboardVisibility;
  isActive: boolean;
  isPublished: boolean;
  version: number;
  createdBy: string;
  organizationId: string;
  teamIds?: string[];
  layout: LayoutConfig;
  filters: FilterConfig[];
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
}

export interface LayoutConfig {
  items: LayoutItem[];
  cols?: number;
  rowHeight?: number;
}

export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FilterConfig {
  id: string;
  name: string;
  type: FilterType;
  field: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
}

export interface Chart {
  id: string;
  dashboardId: string;
  title: string;
  type: ChartType;
  dataSourceId: string;
  config: ChartConfig;
  filters?: ChartFilter[];
  boundFilterIds?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartConfig {
  xAxis?: string;
  yAxis?: string;
  categoryField?: string;
  valueField?: string;
  groupField?: string;
  metricField?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  emptyText?: string;
  errorText?: string;
  columns?: TableColumn[];
  pageSize?: number;
  [key: string]: any;
}

export interface TableColumn {
  field: string;
  title: string;
  width?: number;
  sortable?: boolean;
}

export interface ChartFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface ShareLink {
  id: string;
  dashboardId: string;
  token: string;
  expiresAt?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface AccessLog {
  id: string;
  dashboardId: string;
  shareId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  accessedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  createdBy?: string;
}
