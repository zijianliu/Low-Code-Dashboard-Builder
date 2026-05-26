<template>
  <div class="share-view" v-loading="loading">
    <template v-if="!error">
      <template v-if="dashboard">
        <div class="share-header">
          <div>
            <h1>{{ dashboard.name }}</h1>
            <p v-if="dashboard.description" class="description">{{ dashboard.description }}</p>
          </div>
          <el-tag type="success">
            <el-icon><Link /></el-icon>
            分享视图
          </el-tag>
        </div>

        <FilterPanel
          v-if="filters.length > 0"
          :filters="filters"
          v-model="filterValues"
          @filter-change="handleFilterChange"
        />

        <div class="charts-grid">
          <div
            v-for="item in layout.items"
            :key="item.id"
            class="chart-wrapper"
            :style="getItemStyle(item)"
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
              :error-text="chartData[item.id].config.errorText"
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
      </template>

      <el-empty v-else-if="!loading" :description="errorMessage || '分享链接无效或已过期'" />
    </template>

    <el-result
      v-else
      :icon="errorType"
      :title="errorTitle"
      :sub-title="errorMessage"
    >
      <template #extra>
        <el-button type="primary" @click="goHome">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { shareApi } from '@/api'
import ChartCard from '@/components/ChartCard.vue'
import MetricCard from '@/components/MetricCard.vue'
import DataTable from '@/components/DataTable.vue'
import FilterPanel from '@/components/FilterPanel.vue'
import type { Dashboard, Chart, LayoutConfig, FilterConfig } from '@/types'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref(false)
const errorType = ref<'info' | 'success' | 'warning' | 'error'>('error')
const errorTitle = ref('访问失败')
const errorMessage = ref('')

const dashboard = ref<Dashboard | null>(null)
const layout = ref<LayoutConfig>({ items: [], cols: 12, rowHeight: 100 })
const filters = ref<FilterConfig[]>([])
const charts = ref<Chart[]>([])
const filterValues = reactive<Record<string, any>>({})

const chartMap = computed(() => {
  const map: Record<string, Chart> = {}
  charts.value.forEach(c => {
    map[c.id] = c
  })
  return map
})

const chartData = reactive<Record<string, { loading: boolean; data: any[]; error?: string }>>({})

async function loadShareDashboard() {
  loading.value = true
  error.value = false
  
  try {
    const token = route.params.token as string
    const response = await shareApi.access(token)
    
    if (response.success && response.data) {
      const { dashboard: dash, charts: chartList } = response.data
      dashboard.value = dash
      layout.value = dash.layout
      filters.value = dash.filters || []
      charts.value = chartList || []
      
      filters.value.forEach(f => {
        if (f.defaultValue !== undefined) {
          filterValues[f.id] = f.defaultValue
        }
      })
      
      await loadAllChartData()
    } else {
      error.value = true
      errorMessage.value = response.error || '分享链接无效或已过期'
    }
  } catch (err: any) {
    error.value = true
    if (err.status === 403) {
      errorType.value = 'warning'
      errorTitle.value = '访问受限'
      errorMessage.value = err.message || '您没有权限访问此看板'
    } else {
      errorMessage.value = err.message || '加载失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}

async function loadAllChartData() {
  const promises = charts.value.map(chart => loadChartData(chart.id))
  await Promise.allSettled(promises)
}

async function loadChartData(chartId: string, additionalFilters?: Record<string, any>) {
  const chart = chartMap.value[chartId]
  if (!chart) return

  chartData[chartId] = { loading: true, data: [] }

  try {
    const { dataQueryApi } = await import('@/api')
    const appliedFilters: Record<string, any> = {}
    
    if (chart.boundFilterIds) {
      chart.boundFilterIds.forEach(filterId => {
        const filterConfig = filters.value.find(f => f.id === filterId)
        if (filterConfig && filterValues[filterId] !== undefined && filterValues[filterId] !== '') {
          appliedFilters[filterConfig.field] = filterValues[filterId]
        }
      })
    }

    if (additionalFilters) {
      Object.assign(appliedFilters, additionalFilters)
    }

    const response = await dataQueryApi.queryChart(chartId, appliedFilters)
    
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

function handleFilterChange(filterId: string) {
  const affectedCharts = charts.value.filter(chart => 
    chart.boundFilterIds?.includes(filterId)
  )
  
  affectedCharts.forEach(chart => {
    loadChartData(chart.id)
  })
}

function getItemStyle(item: { x: number; y: number; w: number; h: number }) {
  return {
    left: `${item.x * (100 / (layout.value.cols || 12))}%`,
    top: `${item.y * (layout.value.rowHeight || 100)}px`,
    width: `${item.w * (100 / (layout.value.cols || 12))}%`,
    height: `${item.h * (layout.value.rowHeight || 100)}px`
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
  const index = layout.value.items.findIndex(i => i.id === chartId)
  return colors[index % colors.length]
}

function goHome() {
  router.push('/')
}

onMounted(() => {
  loadShareDashboard()
})
</script>

<style scoped>
.share-view {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
  background: #f5f7fa;
}

.share-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
}

.share-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #303133;
}

.description {
  margin: 0;
  color: #606266;
}

.charts-grid {
  position: relative;
  min-height: 600px;
  background: #fff;
  border-radius: 8px;
  padding: 8px;
}

.chart-wrapper {
  position: absolute;
  padding: 8px;
}
</style>
