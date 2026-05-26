import { Router } from 'express';
import Joi from 'joi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { success, error, notFound, forbidden } from '../utils/response';
import { DataSourceService } from '../services/dataSource';
import { DataQueryService } from '../services/dataQuery';
import { ChartService } from '../services/chart';

const router = Router();

const idSchema = Joi.object({
  id: Joi.string().required()
});

const querySchema = Joi.object({
  filters: Joi.object(),
  page: Joi.number().integer().min(1),
  pageSize: Joi.number().integer().min(1).max(1000)
});

router.post('/:id', authMiddleware, validateParams(idSchema), validateBody(querySchema), async (req: AuthRequest, res) => {
  const dataSource = DataSourceService.getById(req.params.id, req.user!.id, req.user!.organizationId);
  if (!dataSource) {
    notFound(res, 'Data source not found');
    return;
  }

  try {
    const result = await DataQueryService.query(
      dataSource,
      req.body.filters,
      dataSource.config.timeout || 10000
    );

    if (!result.success) {
      error(res, result.error || 'Query failed', 500);
      return;
    }

    const page = req.body.page || 1;
    const pageSize = req.body.pageSize || 100;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    const paginatedData = result.data!.slice(start, end);

    success(res, {
      data: paginatedData,
      total: result.data!.length,
      page,
      pageSize,
      hasMore: end < result.data!.length
    });
  } catch (err: any) {
    error(res, err.message || 'Query failed', 500);
  }
});

router.post('/chart/:chartId', authMiddleware, validateParams(idSchema), validateBody(querySchema), async (req: AuthRequest, res) => {
  const chart = ChartService.getById(req.params.chartId, req.user!.organizationId);
  if (!chart) {
    notFound(res, 'Chart not found');
    return;
  }

  const dataSource = DataSourceService.getById(chart.dataSourceId, req.user!.id, req.user!.organizationId);
  if (!dataSource) {
    notFound(res, 'Data source not found');
    return;
  }

  try {
    const result = await DataQueryService.query(
      dataSource,
      req.body.filters,
      dataSource.config.timeout || 10000
    );

    if (!result.success) {
      error(res, result.error || 'Query failed', 500);
      return;
    }

    let data = result.data || [];

    if (chart.filters && chart.filters.length > 0) {
      const filterObj: Record<string, any> = {};
      chart.filters.forEach(f => {
        filterObj[f.field] = f.value;
      });
      data = DataQueryService.filterData(data, filterObj);
    }

    if (chart.config.sortField) {
      data.sort((a: any, b: any) => {
        const aVal = a[chart.config.sortField!];
        const bVal = b[chart.config.sortField!];
        const order = chart.config.sortOrder === 'asc' ? 1 : -1;
        if (aVal < bVal) return -1 * order;
        if (aVal > bVal) return 1 * order;
        return 0;
      });
    }

    success(res, {
      data,
      total: data.length,
      config: chart.config
    });
  } catch (err: any) {
    error(res, err.message || 'Query failed', 500);
  }
});

export default router;
