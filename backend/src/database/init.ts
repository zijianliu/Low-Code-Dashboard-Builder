import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/dashboard.db');

export function initDatabase(): Database.Database {
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      organization_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS data_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      config TEXT NOT NULL,
      created_by TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE IF NOT EXISTS dashboards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      visibility TEXT NOT NULL DEFAULT 'private',
      is_active INTEGER NOT NULL DEFAULT 1,
      is_published INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      team_ids TEXT,
      layout TEXT,
      filters TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_accessed_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE IF NOT EXISTS charts (
      id TEXT PRIMARY KEY,
      dashboard_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      data_source_id TEXT NOT NULL,
      config TEXT NOT NULL,
      filters TEXT,
      bound_filter_ids TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE,
      FOREIGN KEY (data_source_id) REFERENCES data_sources(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS share_links (
      id TEXT PRIMARY KEY,
      dashboard_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS access_logs (
      id TEXT PRIMARY KEY,
      dashboard_id TEXT NOT NULL,
      share_id TEXT,
      user_id TEXT,
      ip TEXT,
      user_agent TEXT,
      accessed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE,
      FOREIGN KEY (share_id) REFERENCES share_links(id)
    );

    CREATE INDEX IF NOT EXISTS idx_dashboards_created_by ON dashboards(created_by);
    CREATE INDEX IF NOT EXISTS idx_dashboards_organization ON dashboards(organization_id);
    CREATE INDEX IF NOT EXISTS idx_charts_dashboard ON charts(dashboard_id);
    CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
    CREATE INDEX IF NOT EXISTS idx_access_logs_dashboard ON access_logs(dashboard_id);
  `);

  const orgCount = db.prepare('SELECT COUNT(*) as count FROM organizations').get() as { count: number };
  if (orgCount.count === 0) {
    const orgId = 'org_001';
    const userId = 'user_001';
    
    db.prepare('INSERT INTO organizations (id, name) VALUES (?, ?)').run(orgId, 'Default Organization');
    db.prepare(`
      INSERT INTO users (id, name, email, password, role, organization_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, 'Admin User', 'admin@example.com', 'hashed_password_placeholder', 'admin', orgId);
  }

  return db;
}

export default initDatabase;
