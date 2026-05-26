<template>
  <div class="metric-card" :style="{ backgroundColor: bgColor }">
    <div class="metric-content">
      <div class="metric-label">{{ title }}</div>
      <div class="metric-value">
        <span class="value">{{ formattedValue }}</span>
        <span v-if="suffix" class="suffix">{{ suffix }}</span>
      </div>
      <div v-if="trend !== undefined" class="metric-trend" :class="trendClass">
        <el-icon>
          <component :is="trend > 0 ? 'CaretTop' : 'CaretBottom'" />
        </el-icon>
        <span>{{ Math.abs(trend) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  value: number | string
  prefix?: string
  suffix?: string
  trend?: number
  bgColor?: string
  precision?: number
}>(), {
  bgColor: '#1890ff',
  precision: 0
})

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString('zh-CN', {
      minimumFractionDigits: props.precision,
      maximumFractionDigits: props.precision
    })
  }
  return props.value
})

const trendClass = computed(() => ({
  positive: props.trend !== undefined && props.trend > 0,
  negative: props.trend !== undefined && props.trend < 0
}))
</script>

<style scoped>
.metric-card {
  height: 100%;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.metric-content {
  text-align: center;
}

.metric-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.value {
  line-height: 1;
}

.suffix {
  font-size: 18px;
  opacity: 0.8;
}

.metric-trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 13px;
}

.metric-trend.positive {
  color: #67c23a;
}

.metric-trend.negative {
  color: #f56c6c;
}
</style>
