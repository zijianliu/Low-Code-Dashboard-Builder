import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import { DataSource, DataSourceConfig, PaginationParams } from '../types';

export class DataSourceService {
  static create(data: Omit<DataSource, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'organizationId'>, userId: string, orgId: string): DataSource {
    const db = getDb();
    const id = `ds_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO data_sources (id, name, type, description, config, created_by, organization_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.type, data.description || null, JSON.stringify(data.config), userId, orgId, now, now);

    return this.getById(id, userId, orgId)!;
  }

  static getById(id: string, userId: string, orgId: string): DataSource | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT * FROM data_sources 
      WHERE id = ? AND organization_id = ?
    `).get(id, orgId) as any;

    if (!row) return null;
    return this.rowToDataSource(row);
  }

  static list(params: PaginationParams & { organizationId: string }) {
    const db = getDb();
    const { page, pageSize, search, sortBy = 'created_at', sortOrder = 'desc', organizationId } = params;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE organization_id = ?';
    const queryParams: any[] = [organizationId];

    if (search) {
      whereClause += ' AND (name LIKE ? OR description LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const validSortFields = ['name', 'type', 'created_at', 'updated_at'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const rows = db.prepare(`
      SELECT * FROM data_sources ${whereClause}
      ORDER BY ${orderField} ${orderDirection}
      LIMIT ? OFFSET ?
    `).all(...queryParams, pageSize, offset) as any[];

    const { total } = db.prepare(`
      SELECT COUNT(*) as total FROM data_sources ${whereClause}
    `).get(...queryParams) as { total: number };

    return {
      items: rows.map(this.rowToDataSource),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  static update(id: string, data: Partial<DataSource>, userId: string, orgId: string): DataSource | null {
    const db = getDb();
    const now = new Date().toISOString();

    const existing = this.getById(id, userId, orgId);
    if (!existing) return null;

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (data.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(data.name);
    }
    if (data.description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(data.description);
    }
    if (data.config !== undefined) {
      updateFields.push('config = ?');
      updateValues.push(JSON.stringify(data.config));
    }

    updateFields.push('updated_at = ?');
    updateValues.push(now);
    updateValues.push(id, orgId);

    db.prepare(`
      UPDATE data_sources SET ${updateFields.join(', ')}
      WHERE id = ? AND organization_id = ?
    `).run(...updateValues);

    return this.getById(id, userId, orgId);
  }

  static delete(id: string, userId: string, orgId: string): boolean {
    const db = getDb();
    const result = db.prepare(`
      DELETE FROM data_sources WHERE id = ? AND organization_id = ?
    `).run(id, orgId);
    return result.changes > 0;
  }

  private static rowToDataSource(row: any): DataSource {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description || undefined,
      config: JSON.parse(row.config),
      createdBy: row.created_by,
      organizationId: row.organization_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static validateConfig(type: string, config: DataSourceConfig): { valid: boolean; error?: string } {
    if (type === 'rest_api') {
      if (!config.url) return { valid: false, error: 'URL is required for REST API data source' };
      if (!config.method || !['GET', 'POST'].includes(config.method)) {
        return { valid: false, error: 'Valid HTTP method is required' };
      }
    } else if (type === 'static_json') {
      if (!config.jsonData) return { valid: false, error: 'JSON data is required' };
      try {
        JSON.parse(config.jsonData);
      } catch (e) {
        return { valid: false, error: 'Invalid JSON format' };
      }
    } else if (type === 'database') {
      if (!config.sqlQuery) return { valid: false, error: 'SQL query is required' };
      const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE'];
      const upperQuery = config.sqlQuery.toUpperCase();
      for (const keyword of dangerousKeywords) {
        if (upperQuery.includes(keyword)) {
          return { valid: false, error: `Dangerous SQL keyword not allowed: ${keyword}` };
        }
      }
    }
    return { valid: true };
  }
}
