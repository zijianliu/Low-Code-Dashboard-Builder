import { Request, Response, NextFunction } from 'express';
import { unauthorized, forbidden } from '../utils/response';
import { User } from '../types';

export interface AuthRequest extends Request {
  user?: User;
}

const MOCK_USER: User = {
  id: 'user_001',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
  organizationId: 'org_001'
};

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader && process.env.NODE_ENV !== 'test') {
    req.user = MOCK_USER;
    next();
    return;
  }
  
  req.user = MOCK_USER;
  next();
}

export function requireRole(...roles: User['role'][]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      unauthorized(res);
      return;
    }
    
    if (!roles.includes(req.user.role) && req.user.role !== 'admin') {
      forbidden(res, 'Insufficient permissions');
      return;
    }
    
    next();
  };
}

export function canEditDashboard(req: AuthRequest, dashboard: { createdBy: string; organizationId: string }): boolean {
  if (!req.user) return false;
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'editor' && req.user.organizationId === dashboard.organizationId) return true;
  if (req.user.id === dashboard.createdBy) return true;
  return false;
}

export function canViewDashboard(req: AuthRequest, dashboard: { visibility: string; createdBy: string; organizationId: string; teamIds?: string[] }): boolean {
  if (!req.user) return false;
  if (req.user.role === 'admin') return true;
  if (dashboard.visibility === 'public') return true;
  if (req.user.organizationId === dashboard.organizationId) {
    if (dashboard.visibility === 'team') return true;
    if (dashboard.visibility === 'private' && req.user.id === dashboard.createdBy) return true;
  }
  return false;
}
