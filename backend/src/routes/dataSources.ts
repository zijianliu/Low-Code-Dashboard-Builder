import { Router } from 'express';
import Joi from 'joi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../middleware/validate';
import { success, error, notFound, forbidden } from '../utils/response';
import { DataSourceService } from '../services/dataSource';
import { DataSourceType, HttpMethod } from '../types';

const router = Router();

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow(''),
  sortBy: Joi.string(),
  sortOrder: Joi.string().valid('asc', 'desc')
});

const idSchema = Joi.object({
  id: Joi.string().required()
});

const dataSourceSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).allow(''),
  type: Joi.string().valid('rest_api', 'static_json', 'database').required(),
  config: Joi.object({
    url: Joi.string().uri(),
    method: Joi.string().valid('GET', 'POST'),
    headers: Joi.object(),
    params: Joi.object(),
    body: Joi.any(),
    auth: Joi.object({
      type: Joi.string().valid('none', 'bearer', 'basic', 'api_key'),
      token: Joi.string(),
      username: Joi.string(),
      password: Joi.string(),
      apiKey: Joi.string(),
      apiKeyHeader: Joi.string()
    }),
    timeout: Joi.number().min(1000).max(60000),
    jsonData: Joi.string(),
    sqlQuery: Joi.string(),
    fieldMapping: Joi.object()
  }).required()
});

router.get('/', authMiddleware, validateQuery(paginationSchema), (req: AuthRequest, res) => {
  const result = DataSourceService.list({
    page: Number(req.query.page),
    pageSize: Number(req.query.pageSize),
    search: req.query.search as string,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as 'asc' | 'desc',
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
  const dataSource = DataSourceService.getById(req.params.id, req.user!.id, req.user!.organizationId);
  if (!dataSource) {
    notFound(res, 'Data source not found');
    return;
  }
  success(res, dataSource);
});

router.post('/', authMiddleware, validateBody(dataSourceSchema), (req: AuthRequest, res) => {
  const { type, config } = req.body;
  
  const validation = DataSourceService.validateConfig(type, config);
  if (!validation.valid) {
    error(res, validation.error!);
    return;
  }

  const dataSource = DataSourceService.create(
    req.body,
    req.user!.id,
    req.user!.organizationId
  );

  success(res, dataSource, 'Data source created successfully');
});

router.put('/:id', authMiddleware, validateParams(idSchema), validateBody(dataSourceSchema), (req: AuthRequest, res) => {
  const { type, config } = req.body;
  
  const validation = DataSourceService.validateConfig(type, config);
  if (!validation.valid) {
    error(res, validation.error!);
    return;
  }

  const dataSource = DataSourceService.update(
    req.params.id,
    req.body,
    req.user!.id,
    req.user!.organizationId
  );

  if (!dataSource) {
    notFound(res, 'Data source not found');
    return;
  }

  success(res, dataSource, 'Data source updated successfully');
});

router.delete('/:id', authMiddleware, validateParams(idSchema), (req: AuthRequest, res) => {
  const deleted = DataSourceService.delete(
    req.params.id,
    req.user!.id,
    req.user!.organizationId
  );

  if (!deleted) {
    notFound(res, 'Data source not found');
    return;
  }

  success(res, null, 'Data source deleted successfully');
});

router.post('/:id/test', authMiddleware, validateParams(idSchema), (req: AuthRequest, res) => {
  const dataSource = DataSourceService.getById(req.params.id, req.user!.id, req.user!.organizationId);
  if (!dataSource) {
    notFound(res, 'Data source not found');
    return;
  }

  const validation = DataSourceService.validateConfig(dataSource.type, dataSource.config);
  if (!validation.valid) {
    error(res, `Connection test failed: ${validation.error}`);
    return;
  }

  success(res, { success: true }, 'Connection test passed');
});

export default router;
