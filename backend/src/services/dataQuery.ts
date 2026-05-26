import axios, { AxiosRequestConfig, CancelTokenSource } from 'axios';
import { DataSource, DataSourceConfig } from '../types';

interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
}

interface QueryCache {
  [key: string]: {
    data: any[];
    timestamp: number;
  };
}

const queryCache: QueryCache = {};
const CACHE_TTL = 30000;

const pendingRequests: Map<string, CancelTokenSource> = new Map();

export class DataQueryService {
  static async query(dataSource: DataSource, filters?: Record<string, any>, timeout: number = 10000): Promise<QueryResult> {
    const cacheKey = this.generateCacheKey(dataSource.id, filters);
    
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    this.cancelPendingRequest(cacheKey);

    try {
      let result: QueryResult;

      switch (dataSource.type) {
        case 'rest_api':
          result = await this.queryRestApi(dataSource.config, filters, timeout, cacheKey);
          break;
        case 'static_json':
          result = this.queryStaticJson(dataSource.config);
          break;
        case 'database':
          result = await this.queryDatabase(dataSource.config, filters, timeout);
          break;
        default:
          result = { success: false, error: 'Unsupported data source type' };
      }

      if (result.success && result.data) {
        this.setCache(cacheKey, result.data);
      }

      return result;
    } catch (error: any) {
      if (axios.isCancel(error)) {
        return { success: false, error: 'Request cancelled' };
      }
      return { success: false, error: error.message || 'Query failed' };
    } finally {
      pendingRequests.delete(cacheKey);
    }
  }

  private static async queryRestApi(config: DataSourceConfig, filters?: Record<string, any>, timeout: number = 10000, cacheKey?: string): Promise<QueryResult> {
    const source = axios.CancelToken.source();
    if (cacheKey) {
      pendingRequests.set(cacheKey, source);
    }

    try {
      const axiosConfig: AxiosRequestConfig = {
        method: config.method || 'GET',
        url: config.url,
        timeout: config.timeout || timeout,
        cancelToken: source.token,
        headers: {
          ...config.headers
        },
        params: {
          ...config.params,
          ...filters
        }
      };

      if (config.auth) {
        switch (config.auth.type) {
          case 'bearer':
            axiosConfig.headers = {
              ...axiosConfig.headers,
              'Authorization': `Bearer ${config.auth.token}`
            };
            break;
          case 'basic':
            axiosConfig.auth = {
              username: config.auth.username || '',
              password: config.auth.password || ''
            };
            break;
          case 'api_key':
            if (config.auth.apiKeyHeader) {
              axiosConfig.headers = {
                ...axiosConfig.headers,
                [config.auth.apiKeyHeader]: config.auth.apiKey
              };
            }
            break;
        }
      }

      if (config.method === 'POST') {
        axiosConfig.data = config.body;
      }

      const response = await axios(axiosConfig);
      let data = response.data;

      if (config.fieldMapping) {
        data = this.applyFieldMapping(data, config.fieldMapping);
      }

      if (!Array.isArray(data)) {
        if (data.data && Array.isArray(data.data)) {
          data = data.data;
        } else if (data.items && Array.isArray(data.items)) {
          data = data.items;
        } else {
          data = [data];
        }
      }

      return { success: true, data };
    } catch (error: any) {
      if (axios.isCancel(error)) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        return { success: false, error: 'Request timeout' };
      }
      return { success: false, error: error.response?.data?.message || error.message || 'API request failed' };
    }
  }

  private static queryStaticJson(config: DataSourceConfig): QueryResult {
    try {
      if (!config.jsonData) {
        return { success: false, error: 'No JSON data configured' };
      }
      
      let data = JSON.parse(config.jsonData);
      
      if (config.fieldMapping) {
        data = this.applyFieldMapping(data, config.fieldMapping);
      }

      if (!Array.isArray(data)) {
        data = [data];
      }

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: `JSON parse error: ${error.message}` };
    }
  }

  private static async queryDatabase(config: DataSourceConfig, filters?: Record<string, any>, timeout: number = 10000): Promise<QueryResult> {
    return { success: true, data: [] };
  }

  private static applyFieldMapping(data: any, mapping: Record<string, string>): any {
    if (Array.isArray(data)) {
      return data.map(item => this.applyFieldMapping(item, mapping));
    }
    
    if (typeof data === 'object' && data !== null) {
      const mapped: Record<string, any> = {};
      for (const [sourceKey, targetKey] of Object.entries(mapping)) {
        if (data[sourceKey] !== undefined) {
          mapped[targetKey] = data[sourceKey];
        }
      }
      return Object.keys(mapped).length > 0 ? mapped : data;
    }
    
    return data;
  }

  private static generateCacheKey(dataSourceId: string, filters?: Record<string, any>): string {
    return `${dataSourceId}:${JSON.stringify(filters || {})}`;
  }

  private static getFromCache(key: string): any[] | null {
    const cached = queryCache[key];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    delete queryCache[key];
    return null;
  }

  private static setCache(key: string, data: any[]): void {
    queryCache[key] = {
      data,
      timestamp: Date.now()
    };
  }

  private static cancelPendingRequest(key: string): void {
    const source = pendingRequests.get(key);
    if (source) {
      source.cancel('Request superseded by new request');
      pendingRequests.delete(key);
    }
  }

  static clearCache(): void {
    Object.keys(queryCache).forEach(key => delete queryCache[key]);
  }

  static filterData(data: any[], filters: Record<string, any>): any[] {
    return data.filter(item => {
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '') continue;
        
        const itemValue = item[key];
        
        if (Array.isArray(value)) {
          if (!value.includes(itemValue)) return false;
        } else if (typeof value === 'object' && value !== null) {
          if (value.gte !== undefined && itemValue < value.gte) return false;
          if (value.gt !== undefined && itemValue <= value.gt) return false;
          if (value.lte !== undefined && itemValue > value.lte) return false;
          if (value.lt !== undefined && itemValue >= value.lt) return false;
        } else {
          if (itemValue !== value) return false;
        }
      }
      return true;
    });
  }
}
