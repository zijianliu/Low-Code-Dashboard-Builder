import { Router } from 'express';
import Joi from 'joi';
import { authMiddleware, AuthRequest, canEditDashboard } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { success, error, notFound, forbidden } from '../utils/response';
import { ShareService } from '../services/share';
import { DashboardService } from '../services/dashboard';
import { ChartService } from '../services/chart';
import { AccessLogService } from '../services/accessLog';

const router = Router();

const dashboardIdSchema = Joi.object({
  dashboardId: Joi.string().required()
});

const tokenSchema = Joi.object({
  token: Joi.string().required()
});

const shareIdSchema = Joi.object({
  shareId: Joi.string().required()
});

const shareSchema = Joi.object({
  expiresInHours: Joi.number().integer().min(1).max(8760)
});

router.post('/:dashboardId', authMiddleware, validateParams(dashboardIdSchema), validateBody(shareSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.dashboardId, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!canEditDashboard(req, dashboard)) {
    forbidden(res, 'You do not have permission to share this dashboard');
    return;
  }

  const shareLink = ShareService.create(
    req.params.dashboardId,
    req.user!.id,
    req.body.expiresInHours
  );

  success(res, shareLink, 'Share link created successfully');
});

router.get('/:dashboardId', authMiddleware, validateParams(dashboardIdSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.dashboardId, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!canEditDashboard(req, dashboard)) {
    forbidden(res, 'You do not have permission to view share links for this dashboard');
    return;
  }

  const shareLinks = ShareService.listByDashboardId(req.params.dashboardId, req.user!.id);
  success(res, shareLinks);
});

router.post('/:dashboardId/revoke/:shareId', authMiddleware, (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.dashboardId, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!canEditDashboard(req, dashboard)) {
    forbidden(res, 'You do not have permission to revoke share links');
    return;
  }

  const revoked = ShareService.revoke(req.params.shareId, req.user!.id);
  if (!revoked) {
    notFound(res, 'Share link not found');
    return;
  }

  success(res, null, 'Share link revoked successfully');
});

router.get('/access/:token', validateParams(tokenSchema), async (req, res) => {
  const shareLink = ShareService.getByToken(req.params.token);
  if (!shareLink) {
    notFound(res, 'Share link not found');
    return;
  }

  if (!ShareService.isValid(shareLink)) {
    error(res, shareLink.expiresAt ? 'Share link has expired' : 'Share link has been revoked', 403);
    return;
  }

  const dashboard = DashboardService.getByIdForShare(shareLink.dashboardId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!dashboard.isActive) {
    error(res, 'Dashboard is no longer available', 403);
    return;
  }

  if (!dashboard.isPublished) {
    error(res, 'Dashboard is not published', 403);
    return;
  }

  const charts = ChartService.getByDashboardId(shareLink.dashboardId, dashboard.organizationId);

  AccessLogService.create({
    dashboardId: shareLink.dashboardId,
    shareId: shareLink.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  DashboardService.updateLastAccessed(shareLink.dashboardId);

  success(res, {
    dashboard: {
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      layout: dashboard.layout,
      filters: dashboard.filters
    },
    charts
  });
});

router.get('/:shareId/validate', validateParams(shareIdSchema), (req, res) => {
  const shareLink = ShareService.getById(req.params.shareId);
  if (!shareLink) {
    notFound(res, 'Share link not found');
    return;
  }

  const isValid = ShareService.isValid(shareLink);
  success(res, {
    isValid,
    expiresAt: shareLink.expiresAt,
    isActive: shareLink.isActive
  });
});

export default router;
