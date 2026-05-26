<template>
  <div class="dashboard-edit">
    <div class="edit-header">
      <div class="header-left">
        <el-button @click="goBack">
          <el-icon><Back /></el-icon>
          返回
        </el-button>
        <div class="title-group">
          <el-input
            v-model="dashboardForm.name"
            size="large"
            placeholder="看板名称"
            class="name-input"
          />
          <el-input
            v-model="dashboardForm.description"
            placeholder="看板描述（可选）"
            size="small"
            class="desc-input"
          />
        </div>
      </div>
      <div class="header-right">
        <el-select v-model="dashboardForm.visibility" size="small">
          <el-option label="私有" value="private" />
          <el-option label="团队可见" value="team" />
          <el-option label="公开分享" value="public" />
        </el-select>
        <el-button type="primary" :loading="saving" @click="saveDashboard">
          <el-icon><Check /></el-icon>
          保存
        </el-button>
        <el-button @click="previewDashboard">
          <el-icon><View /></el-icon>
          预览
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="edit-tabs">
      <el-tab-pane label="图表布局" name="layout">
        <div class="layout-section">
          <div class="toolbar">
            <el-button type="primary" size="small" @click="showChartDialog = true">
              <el-icon><Plus /></el-icon>
              添加图表
            </el-button>
          </div>
          <div class="grid-container" ref="gridRef">
            <div
              v-for="item in layout.items"
              :key="item.id"
              class="grid-item"
              :style="getItemStyle(item)"
              :ref="el => setItemRef(item.id, el)"
            >
              <ChartCard
                v-if="chartMap[item.id]"
                :title="chartMap[item.id].title"
                :type="chartMap[item.id].type"
                :data="chartData[item.id]?.data || []"
                :config="chartMap[item.id].config"
                :loading="chartData[item.id]?.loading"
                :error="chartData[item.id]?.error"
                :empty-text="chartMap[item.id].config.emptyText"
                :error-text="chartMap[item.id].config.errorText"
                :editable="true"
                @edit="editChart(item.id)"
                @delete="deleteChart(item.id)"
                @retry="loadChartData(item.id)"
              >
                <template v-if="chartMap[item.id].type === 'metric'">
                  <MetricCard
                    :title="chartMap[item.id].title"
                    :value="getMetricValue(item.id)"
                    :bg-color="getMetricColor(item.id)"
                  />
                </template>
                <template v-else-if="chartMap[item.id].type === 'table'">
                  <DataTable
                    :data="chartData[item.id]?.data || []"
                    :columns="chartMap[item.id].config.columns || []"
                    :table-height="item.h * 100 - 120"
                  />
                </template>
              </ChartCard>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="全局筛选器" name="filters">
        <div class="filter-section">
          <div class="toolbar">
            <el-button type="primary" size="small" @click="addFilter">
              <el-icon><Plus /></el-icon>
              添加筛选器
            </el-button>
          </div>
          <el-table :data="filters" stripe>
            <el-table-column prop="name" label="筛选器名称" min-width="120">
              <template #default="{ row }">
                <el-input v-model="row.name" size="small" />
              </template>
            </el-table-column>
            <el-table-column prop="field" label="绑定字段" width="180">
              <template #default="{ row }">
                <el-input v-model="row.field" size="small" />
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="160">
              <template #default="{ row }">
                <el-select v-model="row.type" size="small">
                  <el-option label="日期范围" value="date_range" />
                  <el-option label="地区" value="region" />
                  <el-option label="业务线" value="business_line" />
                  <el-option label="组织" value="organization" />
                  <el-option label="自定义枚举" value="enum" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column prop="defaultValue" label="默认值" width="150">
              <template #default="{ row }">
                <el-input v-model="row.defaultValue" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ $index }">
                <el-button link type="danger" size="small" @click="removeFilter($index)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showChartDialog" title="添加图表" width="600px">
      <el-form :model="newChart" label-width="100px">
        <el-form-item label="图表标题" required>
          <el-input v-model="newChart.title" placeholder="请输入图表标题" />
        </el-form-item>
        <el-form-item label="图表类型" required>
          <el-select v-model="newChart.type" placeholder="请选择图表类型">
            <el-option label="折线图" value="line" />
            <el-option label="柱状图" value="bar" />
            <el-option label="饼图" value="pie" />
            <el-option label="指标卡" value="metric" />
            <el-option label="表格" value="table" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据源" required>
          <el-select v-model="newChart.dataSourceId" placeholder="请选择数据源" filterable>
            <el-option
              v-for="ds in dataSources"
              :key="ds.id"
              :label="ds.name"
              :value="ds.id"
            />
          </el-select>
        </el-form-item>
        <template v-if="['line', 'bar'].includes(newChart.type)">
          <el-form-item label="X轴字段" required>
            <el-input v-model="newChart.config.xAxis" placeholder="请输入X轴字段名" />
          </el-form-item>
          <el-form-item label="Y轴字段" required>
            <el-input v-model="newChart.config.yAxis" placeholder="请输入Y轴字段名" />
          </el-form-item>
          <el-form-item label="分组字段">
            <el-input v-model="newChart.config.groupField" placeholder="请输入分组字段名（可选）" />
          </el-form-item>
        </template>
        <template v-if="newChart.type === 'pie'">
          <el-form-item label="分类字段" required>
            <el-input v-model="newChart.config.categoryField" placeholder="请输入分类字段名" />
          </el-form-item>
          <el-form-item label="数值字段" required>
            <el-input v-model="newChart.config.valueField" placeholder="请输入数值字段名" />
          </el-form-item>
        </template>
        <template v-if="newChart.type === 'metric'">
          <el-form-item label="指标字段" required>
            <el-input v-model="newChart.config.metricField" placeholder="请输入指标字段名" />
          </el-form-item>
        </template>
        <template v-if="newChart.type === 'table'">
          <el-form-item label="表格列" required>
            <div class="columns-editor">
              <div v-for="(col, index) in newChart.config.columns" :key="index" class="column-row">
                <el-input
                  v-model="col.field"
                  placeholder="字段名"
                  size="small"
                  style="width: 140px"
                />
                <el-input
                  v-model="col.title"
                  placeholder="显示标题"
                  size="small"
                  style="width: 140px"
                />
                <el-input-number
                  v-model="col.width"
                  placeholder="宽度"
                  size="small"
                  :min="50"
                  style="width: 100px"
                />
                <el-button link type="danger" size="small" @click="removeColumn(index)">
                  删除
                </el-button>
              </div>
              <el-button link type="primary" size="small" @click="addColumn">
                + 添加列
              </el-button>
            </div>
          </el-form-item>
        </template>
        <el-form-item label="绑定的筛选器">
          <el-select
            v-model="newChart.boundFilterIds"
            multiple
            placeholder="请选择绑定的筛选器"
            collapse-tags
          >
            <el-option
              v-for="f in filters"
              :key="f.id"
              :label="f.name"
              :value="f.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showChartDialog = false">取消</el-button>
        <el-button type="primary" @click="addChart">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { dashboardApi, chartApi, dataSourceApi } from '@/api'
import ChartCard from '@/components/ChartCard.vue'
import MetricCard from '@/components/MetricCard.vue'
import DataTable from '@/components/DataTable.vue'
import type { Dashboard, Chart, DataSource, LayoutConfig, FilterConfig, ChartType } from '@/types'
import { v4 as uuidv4 } from 'uuid'

const route = useRoute()
const router = useRouter()

const activeTab = ref('layout')
const saving = ref(false)
const showChartDialog = ref(false)
const dataSources = ref<DataSource[]>([])

const dashboardForm = reactive({
  name: '',
  description: '',
  visibility: 'private' as Dashboard['visibility']
})

const layout = reactive<LayoutConfig>({
  items: [],
  cols: 12,
  rowHeight: 100
})

const filters = reactive<FilterConfig[]>([])

const charts = ref<Chart[]>([])
const chartMap = computed(() => {
  const map: Record<string, Chart> = {}
  charts.value.forEach(c => {
    map[c.id] = c
  })
  return map
})

const chartData = reactive<Record<string, { loading: boolean; data: any[]; error?: string }>>({})

const newChart = reactive({
  title: '',
  type: 'line' as ChartType,
  dataSourceId: '',
  config: {
    xAxis: '',
    yAxis: '',
    groupField: '',
    categoryField: '',
    valueField: '',
    metricField: '',
    columns: [{ field: '', title: '', width: 100 }]
  },
  boundFilterIds: [] as string[]
})

let dashboardVersion = 0

async function loadDashboard() {
  try {
    const response = await dashboardApi.get(route.params.id as string)
    if (response.success && response.data) {
      const d = response.data
      dashboardForm.name = d.name
      dashboardForm.description = d.description || ''
      dashboardForm.visibility = d.visibility
      layout.items = [...d.layout.items]
      filters.splice(0, filters.length, ...d.filters)
      charts.value = d.charts || []
      dashboardVersion = d.version
    }
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  }
}

async function loadDataSources() {
  try {
    const response = await dataSourceApi.list({ pageSize: 100 })
    if (response.success) {
      dataSources.value = response.data || []
    }
  } catch (err: any) {
    console.error('加载数据源失败', err)
  }
}

async function saveDashboard() {
  if (!dashboardForm.name.trim()) {
    ElMessage.warning('请输入看板名称')
    return
  }

  saving.value = true
  try {
    const response = await dashboardApi.update(route.params.id as string, {
      name: dashboardForm.name,
      description: dashboardForm.description,
      visibility: dashboardForm.visibility,
      layout,
      filters
    })

    if (response.success) {
      ElMessage.success('保存成功')
      if (response.data) {
        dashboardVersion = response.data.version
      }
    }
  } catch (err: any) {
    if (err.status === 409) {
      ElMessage.error('看板已被其他用户修改，请刷新后重试')
    } else {
      ElMessage.error(err.message || '保存失败')
    }
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.back()
}

function previewDashboard() {
  router.push(`/dashboards/${route.params.id}/preview`)
}

function getItemStyle(item: { x: number; y: number; w: number; h: number }) {
  return {
    left: `${item.x * (100 / (layout.cols || 12))}%`,
    top: `${item.y * (layout.rowHeight || 100)}px`,
    width: `${item.w * (100 / (layout.cols || 12))}%`,
    height: `${item.h * (layout.rowHeight || 100)}px`
  }
}

function addFilter() {
  filters.push({
    id: `filter_${uuidv4().replace(/-/g, '').slice(0, 8)}`,
    name: '新筛选器',
    type: 'enum',
    field: '',
    defaultValue: ''
  })
}

function removeFilter(index: number) {
  filters.splice(index, 1)
}

function addColumn() {
  newChart.config.columns.push({ field: '', title: '', width: 100 })
}

function removeColumn(index: number) {
  newChart.config.columns.splice(index, 1)
}

async function addChart() {
  if (!newChart.title.trim() || !newChart.dataSourceId) {
    ElMessage.warning('请填写必要信息')
    return
  }

  try {
    const response = await chartApi.create(route.params.id as string, {
      title: newChart.title,
      type: newChart.type,
      dataSourceId: newChart.dataSourceId,
      config: newChart.config,
      boundFilterIds: newChart.boundFilterIds
    })

    if (response.success && response.data) {
      const chart = response.data
      charts.value.push(chart)
      layout.items.push({
        id: chart.id,
        x: 0,
        y: layout.items.length * 4,
        w: 6,
        h: 4
      })
      ElMessage.success('图表添加成功')
      showChartDialog.value = false
      resetNewChart()
    }
  } catch (err: any) {
    ElMessage.error(err.message || '添加图表失败')
  }
}

function resetNewChart() {
  newChart.title = ''
  newChart.type = 'line'
  newChart.dataSourceId = ''
  newChart.config = {
    xAxis: '',
    yAxis: '',
    groupField: '',
    categoryField: '',
    valueField: '',
    metricField: '',
    columns: [{ field: '', title: '', width: 100 }]
  }
  newChart.boundFilterIds = []
}

function editChart(chartId: string) {
  ElMessage.info('编辑功能待完善')
}

async function deleteChart(chartId: string) {
  try {
    await chartApi.delete(route.params.id as string, chartId)
    charts.value = charts.value.filter(c => c.id !== chartId)
    layout.items = layout.items.filter(i => i.id !== chartId)
    ElMessage.success('图表已删除')
  } catch (err: any) {
    ElMessage.error(err.message || '删除失败')
  }
}

async function loadChartData(chartId: string) {
  const chart = chartMap.value[chartId]
  if (!chart) return

  chartData[chartId] = { loading: true, data: [] }

  try {
    const { dataQueryApi } = await import('@/api')
    const response = await dataQueryApi.queryChart(chartId)
    
    if (response.success) {
      chartData[chartId] = {
        loading: false,
        data: response.data?.data || []
      }
    } else {
      chartData[chartId] = {
        loading: false,
        data: [],
        error: response.error || '加载失败'
      }
    }
  } catch (err: any) {
    chartData[chartId] = {
      loading: false,
      data: [],
      error: err.message || '加载失败'
    }
  }
}

function getMetricValue(chartId: string): number {
  const chart = chartMap.value[chartId]
  const data = chartData[chartId]?.data || []
  if (!data.length || !chart?.config.metricField) return 0
  
  const values = data.map(item => Number(item[chart.config.metricField!]))
  return values.reduce((sum, v) => sum + (isNaN(v) ? 0 : v), 0)
}

function getMetricColor(chartId: string): string {
  const colors = ['#1890ff', '#67c23a', '#e6a23c', '#f56c6c', '#909399']
  const index = layout.items.findIndex(i => i.id === chartId)
  return colors[index % colors.length]
}

const itemRefs = ref<Record<string, HTMLElement | null>>({})
function setItemRef(id: string, el: any) {
  itemRefs.value[id] = el as HTMLElement
}

onMounted(() => {
  loadDashboard()
  loadDataSources()
})
</script>

<style scoped>
.dashboard-edit {
  max-width: 1600px;
  margin: 0 auto;
}

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex: 1;
}

.title-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.name-input {
  width: 300px;
  font-size: 16px;
  font-weight: 600;
}

.desc-input {
  width: 400px;
}

.header-right {
  display: flex;
  gap: 8px;
}

.edit-tabs {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.toolbar {
  margin-bottom: 16px;
}

.grid-container {
  position: relative;
  min-height: 400px;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 8px;
}

.grid-item {
  position: absolute;
  padding: 8px;
  transition: left 0.3s, top 0.3s, width 0.3s, height 0.3s;
}

.filter-section {
  padding: 16px 0;
}

.columns-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
