import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import { AccessLog, PaginationParams } from '../types';

export class AccessLogService {
  static create(data: Omit<AccessLog, 'id' | 'accessedAt'>): AccessLog {
    const db = getDb();
    const id = `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO access_logs (id, dashboard_id, share_id, user_id, ip, user_agent, accessed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.dashboardId,
      data.shareId || null,
      data.userId || null,
      data.ip || null,
      data.userAgent || null,
      now
    );

    return {
      id,
      dashboardId: data.dashboardId,
      shareId: data.shareId,
      userId: data.userId,
      ip: data.ip,
      userAgent: data.userAgent,
      accessedAt: now
    };
  }

  static listByDashboardId(dashboardId: string, params: PaginationParams) {
    const db = getDb();
    const { page, pageSize, sortBy = 'accessed_at', sortOrder = 'desc' } = params;
    const offset = (page - 1) * pageSize;

    const validSortFields = ['accessed_at'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'accessed_at';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const rows = db.prepare(`
      SELECT * FROM access_logs 
      WHERE dashboard_id = ?
      ORDER BY ${orderField} ${orderDirection}
      LIMIT ? OFFSET ?
    `).all(dashboardId, pageSize, offset) as any[];

    const { total } = db.prepare(`
      SELECT COUNT(*) as total FROM access_logs WHERE dashboard_id = ?
    `).get(dashboardId) as { total: number };

    return {
      items: rows.map(this.rowToAccessLog),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  static getRecentAccess(dashboardId: string, limit: number = 10): AccessLog[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM access_logs 
      WHERE dashboard_id = ?
      ORDER BY accessed_at DESC
      LIMIT ?
    `).all(dashboardId, limit) as any[];

    return rows.map(this.rowToAccessLog);
  }

  static getAccessCount(dashboardId: string): number {
    const db = getDb();
    const { count } = db.prepare(`
      SELECT COUNT(*) as count FROM access_logs WHERE dashboard_id = ?
    `).get(dashboardId) as { count: number };
    return count;
  }

  private static rowToAccessLog(row: any): AccessLog {
    return {
      id: row.id,
      dashboardId: row.dashboard_id,
      shareId: row.share_id || undefined,
      userId: row.user_id || undefined,
      ip: row.ip || undefined,
      userAgent: row.user_agent || undefined,
      accessedAt: row.accessed_at
    };
  }
}
