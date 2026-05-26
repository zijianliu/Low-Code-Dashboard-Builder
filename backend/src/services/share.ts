import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import { ShareLink } from '../types';
import dayjs from 'dayjs';

export class ShareService {
  static create(dashboardId: string, userId: string, expiresInHours?: number): ShareLink {
    const db = getDb();
    const id = `share_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const token = this.generateToken();
    const now = new Date().toISOString();
    const expiresAt = expiresInHours 
      ? dayjs().add(expiresInHours, 'hour').toISOString()
      : undefined;

    db.prepare(`
      INSERT INTO share_links (id, dashboard_id, token, expires_at, is_active, created_by, created_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(id, dashboardId, token, expiresAt || null, userId, now);

    return this.getById(id)!;
  }

  static getById(id: string): ShareLink | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM share_links WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.rowToShareLink(row);
  }

  static getByToken(token: string): ShareLink | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM share_links WHERE token = ?').get(token) as any;
    if (!row) return null;
    return this.rowToShareLink(row);
  }

  static listByDashboardId(dashboardId: string, userId: string) {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM share_links 
      WHERE dashboard_id = ? AND created_by = ?
      ORDER BY created_at DESC
    `).all(dashboardId, userId) as any[];

    return rows.map(this.rowToShareLink);
  }

  static revoke(id: string, userId: string): boolean {
    const db = getDb();
    const result = db.prepare(`
      UPDATE share_links SET is_active = 0
      WHERE id = ? AND created_by = ?
    `).run(id, userId);
    return result.changes > 0;
  }

  static isValid(shareLink: ShareLink): boolean {
    if (!shareLink.isActive) return false;
    if (shareLink.expiresAt) {
      return dayjs().isBefore(shareLink.expiresAt);
    }
    return true;
  }

  private static generateToken(): string {
    return uuidv4().replace(/-/g, '');
  }

  private static rowToShareLink(row: any): ShareLink {
    return {
      id: row.id,
      dashboardId: row.dashboard_id,
      token: row.token,
      expiresAt: row.expires_at || undefined,
      isActive: row.is_active === 1,
      createdBy: row.created_by,
      createdAt: row.created_at
    };
  }
}
