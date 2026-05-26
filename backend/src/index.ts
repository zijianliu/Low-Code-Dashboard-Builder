import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dataSourcesRouter from './routes/dataSources';
import dashboardsRouter from './routes/dashboards';
import chartsRouter from './routes/charts';
import dataQueryRouter from './routes/dataQuery';
import shareRouter from './routes/share';

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

app.use('/api/data-sources', dataSourcesRouter);
app.use('/api/dashboards', dashboardsRouter);
app.use('/api/charts', chartsRouter);
app.use('/api/data-query', dataQueryRouter);
app.use('/api/share', shareRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
