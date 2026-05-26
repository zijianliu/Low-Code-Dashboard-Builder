<template>
  <div class="chart-card">
    <div class="chart-header">
      <span class="chart-title">{{ title }}</span>
      <el-dropdown v-if="editable" trigger="click" @command="handleCommand">
        <el-button class="chart-actions" size="small" text>
          <el-icon><MoreFilled /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="edit">
              <el-icon><Edit /></el-icon>
              编辑
            </el-dropdown-item>
            <el-dropdown-item command="delete" divided>
              <el-icon><Delete /></el-icon>
              删除
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <div class="chart-body">
      <div v-if="loading" class="chart-loading">
        <el-icon class="loading-icon" :size="32"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="error" class="chart-error">
        <el-icon class="error-icon" :size="32"><WarningFilled /></el-icon>
        <span>{{ errorText || '数据加载失败' }}</span>
        <el-button size="small" @click="$emit('retry')">重试</el-button>
      </div>
      <div v-else-if="!data || data.length === 0" class="chart-empty">
        <el-icon class="empty-icon" :size="48"><Empty /></el-icon>
        <span>{{ emptyText || '暂无数据' }}</span>
      </div>
      <div v-else class="chart-content" ref="chartRef">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { ChartType, ChartConfig } from '@/types'

const props = defineProps<{
  title: string
  type: ChartType
  data: any[]
  config: ChartConfig
  loading?: boolean
  error?: string
  emptyText?: string
  errorText?: string
  editable?: boolean
}>()

const emit = defineEmits(['edit', 'delete', 'retry'])

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const showChart = computed(() => !props.loading && !props.error && props.data && props.data.length > 0)

function handleCommand(command: string) {
  if (command === 'edit') emit('edit')
  if (command === 'delete') emit('delete')
}

function getChartOption(): echarts.EChartsOption | null {
  const { type, data, config } = props

  switch (type) {
    case 'line':
    case 'bar':
      return generateXYChartOption(type, data, config)
    case 'pie':
      return generatePieOption(data, config)
    case 'metric':
      return null
    default:
      return null
  }
}

function generateXYChartOption(type: ChartType, data: any[], config: ChartConfig): echarts.EChartsOption {
  const categories = [...new Set(data.map(item => item[config.xAxis!]))]
  const seriesData: Record<string, number[]> = {}

  data.forEach(item => {
    const groupKey = config.groupField ? item[config.groupField] : 'total'
    if (!seriesData[groupKey]) {
      seriesData[groupKey] = new Array(categories.length).fill(0)
    }
    const categoryIndex = categories.indexOf(item[config.xAxis!])
    if (categoryIndex !== -1) {
      seriesData[groupKey][categoryIndex] = item[config.yAxis!] || 0
    }
  })

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: config.groupField ? { data: Object.keys(seriesData) } : undefined,
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { rotate: categories.length > 10 ? 30 : 0 }
    },
    yAxis: {
      type: 'value'
    },
    series: Object.entries(seriesData).map(([name, values]) => ({
      name,
      type: type === 'line' ? 'line' : 'bar',
      smooth: type === 'line',
      data: values
    }))
  }
}

function generatePieOption(data: any[], config: ChartConfig): echarts.EChartsOption {
  const pieData = data.map(item => ({
    name: item[config.categoryField!],
    value: item[config.valueField!]
  }))

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      type: 'scroll'
    },
    series: [{
      name: config.categoryField,
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}: {d}%'
      },
      data: pieData
    }]
  }
}

function initChart() {
  if (chartRef.value && showChart.value && ['line', 'bar', 'pie'].includes(props.type)) {
    if (chartInstance) {
      chartInstance.dispose()
    }
    chartInstance = echarts.init(chartRef.value)
    const option = getChartOption()
    if (option) {
      chartInstance.setOption(option)
    }
  }
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  nextTick(() => {
    initChart()
  })
  window.addEventListener('resize', handleResize)
})

watch(
  () => [props.data, props.config, props.loading, props.error],
  () => {
    nextTick(() => {
      initChart()
    })
  },
  { deep: true }
)
</script>

<style scoped>
.chart-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.chart-actions {
  padding: 4px;
}

.chart-body {
  flex: 1;
  position: relative;
  padding: 12px;
  min-height: 200px;
}

.chart-loading,
.chart-error,
.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  color: #999;
  font-size: 14px;
}

.loading-icon {
  animation: spin 1s linear infinite;
  color: #1890ff;
}

.error-icon {
  color: #f56c6c;
}

.empty-icon {
  color: #d9d9d9;
}

.chart-error button {
  margin-top: 8px;
}

.chart-content {
  width: 100%;
  height: 100%;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
