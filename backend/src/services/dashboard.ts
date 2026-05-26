import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import { Dashboard, LayoutConfig, FilterConfig, PaginationParams } from '../types';

export class DashboardService {
  static create(data: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'isActive' | 'isPublished' | 'createdBy' | 'organizationId' | 'lastAccessedAt'>, userId: string, orgId: string): Dashboard {
    const db = getDb();
    const id = `dash_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();

    const defaultLayout: LayoutConfig = { items: [], cols: 12, rowHeight: 100 };
    const defaultFilters: FilterConfig[] = [];

    db.prepare(`
      INSERT INTO dashboards (id, name, description, visibility, is_active, is_published, version, created_by, organization_id, team_ids, layout, filters, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, 0, 1, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      data.name, 
      data.description || null, 
      data.visibility || 'private', 
      userId, 
      orgId,
      data.teamIds ? JSON.stringify(data.teamIds) : null,
      JSON.stringify(defaultLayout),
      JSON.stringify(defaultFilters),
      now, 
      now
    );

    return this.getById(id, userId, orgId)!;
  }

  static getById(id: string, userId: string, orgId: string): Dashboard | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT * FROM dashboards 
      WHERE id = ? AND organization_id = ?
    `).get(id, orgId) as any;

    if (!row) return null;
    return this.rowToDashboard(row);
  }

  static getByIdForShare(id: string): Dashboard | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT * FROM dashboards WHERE id = ?
    `).get(id) as any;

    if (!row) return null;
    return this.rowToDashboard(row);
  }

  static list(params: PaginationParams & { organizationId: string; isActive?: boolean; createdBy?: string }) {
    const db = getDb();
    const { page, pageSize, search, sortBy = 'updated_at', sortOrder = 'desc', organizationId, isActive, createdBy } = params;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE organization_id = ?';
    const queryParams: any[] = [organizationId];

    if (search) {
      whereClause += ' AND (name LIKE ? OR description LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (isActive !== undefined) {
      whereClause += ' AND is_active = ?';
      queryParams.push(isActive ? 1 : 0);
    }

    if (createdBy) {
      whereClause += ' AND created_by = ?';
      queryParams.push(createdBy);
    }

    const validSortFields = ['name', 'created_at', 'updated_at', 'last_accessed_at'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'updated_at';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const rows = db.prepare(`
      SELECT * FROM dashboards ${whereClause}
      ORDER BY ${orderField} ${orderDirection}
      LIMIT ? OFFSET ?
    `).all(...queryParams, pageSize, offset) as any[];

    const { total } = db.prepare(`
      SELECT COUNT(*) as total FROM dashboards ${whereClause}
    `).get(...queryParams) as { total: number };

    return {
      items: rows.map(this.rowToDashboard),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  static update(id: string, data: Partial<Dashboard>, userId: string, orgId: string): Dashboard | null {
    const db = getDb();
    const existing = this.getById(id, userId, orgId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const newVersion = existing.version + 1;

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
    if (data.visibility !== undefined) {
      updateFields.push('visibility = ?');
      updateValues.push(data.visibility);
    }
    if (data.isActive !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(data.isActive ? 1 : 0);
    }
    if (data.isPublished !== undefined) {
      updateFields.push('is_published = ?');
      updateValues.push(data.isPublished ? 1 : 0);
    }
    if (data.teamIds !== undefined) {
      updateFields.push('team_ids = ?');
      updateValues.push(data.teamIds ? JSON.stringify(data.teamIds) : null);
    }
    if (data.layout !== undefined) {
      updateFields.push('layout = ?');
      updateValues.push(JSON.stringify(data.layout));
    }
    if (data.filters !== undefined) {
      updateFields.push('filters = ?');
      updateValues.push(JSON.stringify(data.filters));
    }

    updateFields.push('version = ?');
    updateValues.push(newVersion);
    updateFields.push('updated_at = ?');
    updateValues.push(now);
    updateValues.push(id, orgId, existing.version);

    const result = db.prepare(`
      UPDATE dashboards SET ${updateFields.join(', ')}
      WHERE id = ? AND organization_id = ? AND version = ?
    `).run(...updateValues);

    if (result.changes === 0) {
      throw new Error('CONCURRENT_UPDATE: Dashboard was modified by another user');
    }

    return this.getById(id, userId, orgId);
  }

  static delete(id: string, userId: string, orgId: string): boolean {
    const db = getDb();
    const result = db.prepare(`
      DELETE FROM dashboards WHERE id = ? AND organization_id = ?
    `).run(id, orgId);
    return result.changes > 0;
  }

  static copy(id: string, userId: string, orgId: string): Dashboard | null {
    const existing = this.getById(id, userId, orgId);
    if (!existing) return null;

    return this.create({
      name: `${existing.name} (Copy)`,
      description: existing.description,
      visibility: 'private',
      teamIds: [],
      layout: existing.layout,
      filters: existing.filters
    }, userId, orgId);
  }

  static updateLastAccessed(id: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE dashboards SET last_accessed_at = ? WHERE id = ?
    `).run(now, id);
  }

  static getVersion(id: string, orgId: string): number | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT version FROM dashboards WHERE id = ? AND organization_id = ?
    `).get(id, orgId) as { version: number } | undefined;
    return row?.version || null;
  }

  private static rowToDashboard(row: any): Dashboard {
    let layout: LayoutConfig;
    let filters: FilterConfig[];

    try {
      layout = JSON.parse(row.layout || '{"items":[]}');
    } catch {
      layout = { items: [], cols: 12, rowHeight: 100 };
    }

    try {
      filters = JSON.parse(row.filters || '[]');
    } catch {
      filters = [];
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      visibility: row.visibility,
      isActive: row.is_active === 1,
      isPublished: row.is_published === 1,
      version: row.version,
      createdBy: row.created_by,
      organizationId: row.organization_id,
      teamIds: row.team_ids ? JSON.parse(row.team_ids) : undefined,
      layout,
      filters,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastAccessedAt: row.last_accessed_at || undefined
    };
  }
}
