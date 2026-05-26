import { Router } from 'express';
import Joi from 'joi';
import { authMiddleware, AuthRequest, canEditDashboard, canViewDashboard } from '../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../middleware/validate';
import { success, error, notFound, forbidden } from '../utils/response';
import { DashboardService } from '../services/dashboard';
import { ChartService } from '../services/chart';
import { AccessLogService } from '../services/accessLog';

const router = Router();

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow(''),
  sortBy: Joi.string(),
  sortOrder: Joi.string().valid('asc', 'desc'),
  createdBy: Joi.string(),
  isActive: Joi.boolean()
});

const idSchema = Joi.object({
  id: Joi.string().required()
});

const dashboardSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).allow(''),
  visibility: Joi.string().valid('private', 'team', 'public').default('private'),
  teamIds: Joi.array().items(Joi.string()),
  layout: Joi.object({
    items: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      x: Joi.number().integer().min(0).required(),
      y: Joi.number().integer().min(0).required(),
      w: Joi.number().integer().min(1).required(),
      h: Joi.number().integer().min(1).required()
    })).required(),
    cols: Joi.number().integer().min(1),
    rowHeight: Joi.number().integer().min(1)
  }),
  filters: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    type: Joi.string().valid('date_range', 'region', 'business_line', 'organization', 'enum').required(),
    field: Joi.string().required(),
    defaultValue: Joi.any(),
    options: Joi.array().items(Joi.object({
      label: Joi.string().required(),
      value: Joi.any().required()
    })),
    placeholder: Joi.string()
  }))
});

router.get('/', authMiddleware, validateQuery(paginationSchema), (req: AuthRequest, res) => {
  const result = DashboardService.list({
    page: Number(req.query.page),
    pageSize: Number(req.query.pageSize),
    search: req.query.search as string,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as 'asc' | 'desc',
    createdBy: req.query.createdBy as string,
    isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
    organizationId: req.user!.organizationId
  });

  success(res, result.items, undefined, {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    totalPages: result.totalPages
  });
});

router.get('/:id', authMiddleware, validateParams(idSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.id, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!canViewDashboard(req, dashboard)) {
    forbidden(res, 'You do not have permission to view this dashboard');
    return;
  }

  const charts = ChartService.getByDashboardId(req.params.id, req.user!.organizationId);
  const chartCount = charts.length;
  const accessCount = AccessLogService.getAccessCount(req.params.id);
  const recentAccess = AccessLogService.getRecentAccess(req.params.id, 5);

  success(res, {
    ...dashboard,
    chartCount,
    accessCount,
    recentAccess,
    charts
  });

  DashboardService.updateLastAccessed(req.params.id);
  AccessLogService.create({
    dashboardId: req.params.id,
    userId: req.user!.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
});

router.post('/', authMiddleware, validateBody(dashboardSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.create(
    req.body,
    req.user!.id,
    req.user!.organizationId
  );

  success(res, dashboard, 'Dashboard created successfully');
});

router.put('/:id', authMiddleware, validateParams(idSchema), validateBody(dashboardSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.id, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!canEditDashboard(req, dashboard)) {
    forbidden(res, 'You do not have permission to edit this dashboard');
    return;
  }

  try {
    const updated = DashboardService.update(
      req.params.id,
      req.body,
      req.user!.id,
      req.user!.organizationId
    );

    success(res, updated, 'Dashboard updated successfully');
  } catch (err: any) {
    if (err.message.startsWith('CONCURRENT_UPDATE')) {
      error(res, 'Dashboard was modified by another user. Please refresh and try again.', 409);
    } else {
      error(res, err.message);
    }
  }
});

router.delete('/:id', authMiddleware, validateParams(idSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.id, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!canEditDashboard(req, dashboard)) {
    forbidden(res, 'You do not have permission to delete this dashboard');
    return;
  }

  ChartService.deleteByDashboardId(req.params.id, req.user!.organizationId);

  const deleted = DashboardService.delete(
    req.params.id,
    req.user!.id,
    req.user!.organizationId
  );

  success(res, null, 'Dashboard deleted successfully');
});

router.post('/:id/copy', authMiddleware, validateParams(idSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.id, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!canViewDashboard(req, dashboard)) {
    forbidden(res, 'You do not have permission to copy this dashboard');
    return;
  }

  const copied = DashboardService.copy(
    req.params.id,
    req.user!.id,
    req.user!.organizationId
  );

  if (!copied) {
    error(res, 'Failed to copy dashboard');
    return;
  }

  const charts = ChartService.getByDashboardId(req.params.id, req.user!.organizationId);
  charts.forEach(chart => {
    ChartService.create({
      ...chart,
      dashboardId: copied.id
    }, req.user!.id, req.user!.organizationId);
  });

  success(res, copied, 'Dashboard copied successfully');
});

router.post('/:id/publish', authMiddleware, validateParams(idSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.id, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!canEditDashboard(req, dashboard)) {
    forbidden(res, 'You do not have permission to publish this dashboard');
    return;
  }

  const updated = DashboardService.update(
    req.params.id,
    { isPublished: true },
    req.user!.id,
    req.user!.organizationId
  );

  success(res, updated, 'Dashboard published successfully');
});

router.post('/:id/unpublish', authMiddleware, validateParams(idSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.id, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!canEditDashboard(req, dashboard)) {
    forbidden(res, 'You do not have permission to unpublish this dashboard');
    return;
  }

  const updated = DashboardService.update(
    req.params.id,
    { isPublished: false },
    req.user!.id,
    req.user!.organizationId
  );

  success(res, updated, 'Dashboard unpublished successfully');
});

router.post('/:id/deactivate', authMiddleware, validateParams(idSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.id, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!canEditDashboard(req, dashboard)) {
    forbidden(res, 'You do not have permission to deactivate this dashboard');
    return;
  }

  const updated = DashboardService.update(
    req.params.id,
    { isActive: false },
    req.user!.id,
    req.user!.organizationId
  );

  success(res, updated, 'Dashboard deactivated successfully');
});

router.post('/:id/activate', authMiddleware, validateParams(idSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.id, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!canEditDashboard(req, dashboard)) {
    forbidden(res, 'You do not have permission to activate this dashboard');
    return;
  }

  const updated = DashboardService.update(
    req.params.id,
    { isActive: true },
    req.user!.id,
    req.user!.organizationId
  );

  success(res, updated, 'Dashboard activated successfully');
});

router.get('/:id/version', authMiddleware, validateParams(idSchema), (req: AuthRequest, res) => {
  const version = DashboardService.getVersion(req.params.id, req.user!.organizationId);
  if (version === null) {
    notFound(res, 'Dashboard not found');
    return;
  }
  success(res, { version });
});

export default router;
