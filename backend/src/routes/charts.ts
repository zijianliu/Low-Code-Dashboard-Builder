import { Router } from 'express';
import Joi from 'joi';
import { authMiddleware, AuthRequest, canEditDashboard } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { success, error, notFound, forbidden } from '../utils/response';
import { ChartService } from '../services/chart';
import { DashboardService } from '../services/dashboard';
import { ChartType } from '../types';

const router = Router();

const dashboardIdSchema = Joi.object({
  dashboardId: Joi.string().required()
});

const chartIdSchema = Joi.object({
  dashboardId: Joi.string().required(),
  chartId: Joi.string().required()
});

const chartSchema = Joi.object({
  title: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid('line', 'bar', 'pie', 'metric', 'table').required(),
  dataSourceId: Joi.string().required(),
  config: Joi.object().required(),
  filters: Joi.array().items(Joi.object({
    field: Joi.string().required(),
    operator: Joi.string().valid('eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'contains').required(),
    value: Joi.any().required()
  })),
  boundFilterIds: Joi.array().items(Joi.string())
});

router.get('/:dashboardId', authMiddleware, validateParams(dashboardIdSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.dashboardId, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  const charts = ChartService.getByDashboardId(req.params.dashboardId, req.user!.organizationId);
  success(res, charts);
});

router.post('/:dashboardId', authMiddleware, validateParams(dashboardIdSchema), validateBody(chartSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.dashboardId, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!canEditDashboard(req, dashboard)) {
    forbidden(res, 'You do not have permission to add charts to this dashboard');
    return;
  }

  const { type, config, dataSourceId } = req.body;
  const validation = ChartService.validateConfig(type, config, dataSourceId, req.user!.organizationId);
  if (!validation.valid) {
    error(res, validation.error!);
    return;
  }

  const chart = ChartService.create(
    { ...req.body, dashboardId: req.params.dashboardId },
    req.user!.id,
    req.user!.organizationId
  );

  success(res, chart, 'Chart created successfully');
});

router.put('/:dashboardId/:chartId', authMiddleware, validateParams(chartIdSchema), validateBody(chartSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.dashboardId, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!canEditDashboard(req, dashboard)) {
    forbidden(res, 'You do not have permission to edit charts in this dashboard');
    return;
  }

  const { type, config, dataSourceId } = req.body;
  const validation = ChartService.validateConfig(type, config, dataSourceId, req.user!.organizationId);
  if (!validation.valid) {
    error(res, validation.error!);
    return;
  }

  const chart = ChartService.update(
    req.params.chartId,
    req.body,
    req.user!.id,
    req.user!.organizationId
  );

  if (!chart) {
    notFound(res, 'Chart not found');
    return;
  }

  success(res, chart, 'Chart updated successfully');
});

router.delete('/:dashboardId/:chartId', authMiddleware, validateParams(chartIdSchema), (req: AuthRequest, res) => {
  const dashboard = DashboardService.getById(req.params.dashboardId, req.user!.id, req.user!.organizationId);
  if (!dashboard) {
    notFound(res, 'Dashboard not found');
    return;
  }

  if (!canEditDashboard(req, dashboard)) {
    forbidden(res, 'You do not have permission to delete charts from this dashboard');
    return;
  }

  const deleted = ChartService.delete(req.params.chartId, req.user!.organizationId);
  if (!deleted) {
    notFound(res, 'Chart not found');
    return;
  }

  success(res, null, 'Chart deleted successfully');
});

export default router;
