import request from 'supertest';
import app from '../index';

describe('Dashboard API Tests', () => {
  let dashboardId: string;
  let dataSourceId: string;

  test('Create dashboard successfully', async () => {
    const response = await request(app)
      .post('/api/dashboards')
      .send({
        name: 'Test Dashboard',
        description: 'Test Description',
        visibility: 'private',
        layout: { items: [], cols: 12, rowHeight: 100 },
        filters: []
      });

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Test Dashboard');
    dashboardId = response.body.data.id;
  });

  test('Get dashboard list with pagination', async () => {
    const response = await request(app)
      .get('/api/dashboards?page=1&pageSize=10');

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.pagination).toBeDefined();
  });

  test('Get dashboard by id', async () => {
    const response = await request(app)
      .get(`/api/dashboards/${dashboardId}`);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(dashboardId);
  });

  test('Update dashboard', async () => {
    const response = await request(app)
      .put(`/api/dashboards/${dashboardId}`)
      .send({
        name: 'Updated Dashboard',
        visibility: 'team',
        layout: { items: [], cols: 12, rowHeight: 100 },
        filters: []
      });

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Updated Dashboard');
  });

  test('Copy dashboard', async () => {
    const response = await request(app)
      .post(`/api/dashboards/${dashboardId}/copy`);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toContain('(Copy)');
  });

  test('Save and restore layout', async () => {
    const layout = {
      items: [
        { id: 'chart_1', x: 0, y: 0, w: 6, h: 4 },
        { id: 'chart_2', x: 6, y: 0, w: 6, h: 4 }
      ],
      cols: 12,
      rowHeight: 100
    };

    const updateResponse = await request(app)
      .put(`/api/dashboards/${dashboardId}`)
      .send({
        name: 'Layout Test',
        layout,
        filters: []
      });

    expect(updateResponse.body.success).toBe(true);

    const getResponse = await request(app)
      .get(`/api/dashboards/${dashboardId}`);

    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data.layout.items).toHaveLength(2);
    expect(getResponse.body.data.layout.items[0].x).toBe(0);
  });

  test('Publish dashboard', async () => {
    const response = await request(app)
      .post(`/api/dashboards/${dashboardId}/publish`);

    expect(response.body.success).toBe(true);
    expect(response.body.data.isPublished).toBe(true);
  });

  test('Deactivate dashboard', async () => {
    const response = await request(app)
      .post(`/api/dashboards/${dashboardId}/deactivate`);

    expect(response.body.success).toBe(true);
    expect(response.body.data.isActive).toBe(false);
  });

  test('Delete dashboard', async () => {
    const response = await request(app)
      .delete(`/api/dashboards/${dashboardId}`);

    expect(response.body.success).toBe(true);
  });
});

describe('Data Source API Tests', () => {
  test('Create REST API data source successfully', async () => {
    const response = await request(app)
      .post('/api/data-sources')
      .send({
        name: 'Test API Source',
        type: 'rest_api',
        config: {
          url: 'https://jsonplaceholder.typicode.com/posts',
          method: 'GET',
          timeout: 5000
        }
      });

    expect(response.body.success).toBe(true);
    expect(response.body.data.type).toBe('rest_api');
  });

  test('Static JSON format error should fail', async () => {
    const response = await request(app)
      .post('/api/data-sources')
      .send({
        name: 'Invalid JSON',
        type: 'static_json',
        config: {
          jsonData: 'invalid json {'
        }
      });

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Invalid JSON');
  });

  test('Valid static JSON should succeed', async () => {
    const response = await request(app)
      .post('/api/data-sources')
      .send({
        name: 'Valid JSON',
        type: 'static_json',
        config: {
          jsonData: '[{"name": "Test", "value": 100}]'
        }
      });

    expect(response.body.success).toBe(true);
  });
});

describe('Chart Validation Tests', () => {
  let dashboardId: string;
  let dataSourceId: string;

  beforeAll(async () => {
    const dashboardResponse = await request(app)
      .post('/api/dashboards')
      .send({
        name: 'Chart Test Dashboard',
        layout: { items: [], cols: 12, rowHeight: 100 },
        filters: []
      });
    dashboardId = dashboardResponse.body.data.id;

    const dataSourceResponse = await request(app)
      .post('/api/data-sources')
      .send({
        name: 'Chart Test Source',
        type: 'static_json',
        config: {
          jsonData: '[{"month": "Jan", "sales": 100, "category": "A"}]'
        }
      });
    dataSourceId = dataSourceResponse.body.data.id;
  });

  test('Line chart without X/Y axis should fail', async () => {
    const response = await request(app)
      .post(`/api/charts/${dashboardId}`)
      .send({
        title: 'Invalid Line Chart',
        type: 'line',
        dataSourceId,
        config: {}
      });

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('X-axis');
  });

  test('Pie chart without category/value fields should fail', async () => {
    const response = await request(app)
      .post(`/api/charts/${dashboardId}`)
      .send({
        title: 'Invalid Pie Chart',
        type: 'pie',
        dataSourceId,
        config: {}
      });

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Category');
  });

  test('Metric card without metric field should fail', async () => {
    const response = await request(app)
      .post(`/api/charts/${dashboardId}`)
      .send({
        title: 'Invalid Metric',
        type: 'metric',
        dataSourceId,
        config: {}
      });

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Metric');
  });

  test('Chart with non-existent data source should fail', async () => {
    const response = await request(app)
      .post(`/api/charts/${dashboardId}`)
      .send({
        title: 'Bad Data Source',
        type: 'bar',
        dataSourceId: 'non_existent',
        config: {
          xAxis: 'month',
          yAxis: 'sales'
        }
      });

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not exist');
  });

  test('Valid line chart should succeed', async () => {
    const response = await request(app)
      .post(`/api/charts/${dashboardId}`)
      .send({
        title: 'Valid Line Chart',
        type: 'line',
        dataSourceId,
        config: {
          xAxis: 'month',
          yAxis: 'sales'
        }
      });

    expect(response.body.success).toBe(true);
  });
});

describe('Share Link Tests', () => {
  let dashboardId: string;

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/dashboards')
      .send({
        name: 'Share Test Dashboard',
        layout: { items: [], cols: 12, rowHeight: 100 },
        filters: []
      });
    dashboardId = response.body.data.id;

    await request(app)
      .post(`/api/dashboards/${dashboardId}/publish`);
  });

  test('Create share link', async () => {
    const response = await request(app)
      .post(`/api/share/${dashboardId}`)
      .send({ expiresInHours: 24 });

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.expiresAt).toBeDefined();
  });

  test('Access share link', async () => {
    const createResponse = await request(app)
      .post(`/api/share/${dashboardId}`)
      .send({});

    const token = createResponse.body.data.token;
    const accessResponse = await request(app)
      .get(`/api/share/access/${token}`);

    expect(accessResponse.body.success).toBe(true);
    expect(accessResponse.body.data.dashboard.id).toBe(dashboardId);
  });

  test('Revoke share link', async () => {
    const createResponse = await request(app)
      .post(`/api/share/${dashboardId}`)
      .send({});
    
    const shareId = createResponse.body.data.id;
    const token = createResponse.body.data.token;

    await request(app)
      .post(`/api/share/${dashboardId}/revoke/${shareId}`);

    const accessResponse = await request(app)
      .get(`/api/share/access/${token}`);

    expect(accessResponse.body.success).toBe(false);
  });

  test('Deactivated dashboard share link should fail', async () => {
    await request(app)
      .post(`/api/dashboards/${dashboardId}/deactivate`);

    const createResponse = await request(app)
      .post(`/api/share/${dashboardId}`)
      .send({});
    
    const token = createResponse.body.data.token;

    const accessResponse = await request(app)
      .get(`/api/share/access/${token}`);

    expect(accessResponse.body.success).toBe(false);
    expect(accessResponse.body.error).toContain('no longer available');
  });
});
