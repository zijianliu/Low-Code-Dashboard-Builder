import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import { Chart, ChartConfig, ChartType } from '../types';
import { DataSourceService } from './dataSource';

export class ChartService {
  static create(data: Omit<Chart, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>, userId: string, orgId: string): Chart {
    const db = getDb();
    const id = `chart_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO charts (id, dashboard_id, title, type, data_source_id, config, filters, bound_filter_ids, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.dashboardId,
      data.title,
      data.type,
      data.dataSourceId,
      JSON.stringify(data.config),
      data.filters ? JSON.stringify(data.filters) : null,
      data.boundFilterIds ? JSON.stringify(data.boundFilterIds) : null,
      userId,
      now,
      now
    );

    return this.getById(id, orgId)!;
  }

  static getById(id: string, orgId: string): Chart | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT c.* FROM charts c
      JOIN dashboards d ON c.dashboard_id = d.id
      WHERE c.id = ? AND d.organization_id = ?
    `).get(id, orgId) as any;

    if (!row) return null;
    return this.rowToChart(row);
  }

  static getByDashboardId(dashboardId: string, orgId: string): Chart[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT c.* FROM charts c
      JOIN dashboards d ON c.dashboard_id = d.id
      WHERE c.dashboard_id = ? AND d.organization_id = ?
      ORDER BY c.created_at ASC
    `).all(dashboardId, orgId) as any[];

    return rows.map(this.rowToChart);
  }

  static update(id: string, data: Partial<Chart>, userId: string, orgId: string): Chart | null {
    const db = getDb();
    const now = new Date().toISOString();

    const existing = this.getById(id, orgId);
    if (!existing) return null;

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (data.title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(data.title);
    }
    if (data.type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(data.type);
    }
    if (data.dataSourceId !== undefined) {
      updateFields.push('data_source_id = ?');
      updateValues.push(data.dataSourceId);
    }
    if (data.config !== undefined) {
      updateFields.push('config = ?');
      updateValues.push(JSON.stringify(data.config));
    }
    if (data.filters !== undefined) {
      updateFields.push('filters = ?');
      updateValues.push(data.filters ? JSON.stringify(data.filters) : null);
    }
    if (data.boundFilterIds !== undefined) {
      updateFields.push('bound_filter_ids = ?');
      updateValues.push(data.boundFilterIds ? JSON.stringify(data.boundFilterIds) : null);
    }

    updateFields.push('updated_at = ?');
    updateValues.push(now);
    updateValues.push(id);

    db.prepare(`
      UPDATE charts SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...updateValues);

    return this.getById(id, orgId);
  }

  static delete(id: string, orgId: string): boolean {
    const db = getDb();
    const result = db.prepare(`
      DELETE FROM charts WHERE id = ?
    `).run(id);
    return result.changes > 0;
  }

  static deleteByDashboardId(dashboardId: string, orgId: string): void {
    const db = getDb();
    db.prepare(`
      DELETE FROM charts WHERE dashboard_id = ?
    `).run(dashboardId);
  }

  static validateConfig(type: ChartType, config: ChartConfig, dataSourceId: string, orgId: string): { valid: boolean; error?: string } {
    const dataSource = DataSourceService.getById(dataSourceId, 'system', orgId);
    if (!dataSource) {
      return { valid: false, error: 'Data source does not exist' };
    }

    switch (type) {
      case 'line':
      case 'bar':
        if (!config.xAxis) return { valid: false, error: 'X-axis field is required' };
        if (!config.yAxis) return { valid: false, error: 'Y-axis field is required' };
        break;
      case 'pie':
        if (!config.categoryField) return { valid: false, error: 'Category field is required' };
        if (!config.valueField) return { valid: false, error: 'Value field is required' };
        break;
      case 'metric':
        if (!config.metricField) return { valid: false, error: 'Metric field is required' };
        break;
      case 'table':
        if (!config.columns || config.columns.length === 0) {
          return { valid: false, error: 'At least one column is required' };
        }
        break;
    }

    return { valid: true };
  }

  private static rowToChart(row: any): Chart {
    return {
      id: row.id,
      dashboardId: row.dashboard_id,
      title: row.title,
      type: row.type,
      dataSourceId: row.data_source_id,
      config: JSON.parse(row.config || '{}'),
      filters: row.filters ? JSON.parse(row.filters) : undefined,
      boundFilterIds: row.bound_filter_ids ? JSON.parse(row.bound_filter_ids) : undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
