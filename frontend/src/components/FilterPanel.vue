<template>
  <div class="filter-panel">
    <div v-for="filter in filters" :key="filter.id" class="filter-item">
      <label class="filter-label">{{ filter.name }}</label>
      <div class="filter-control">
        <el-date-picker
          v-if="filter.type === 'date_range'"
          v-model="localValues[filter.id]"
          type="daterange"
          :placeholder="filter.placeholder || '选择日期范围'"
          unlink-panels
          size="small"
          @change="handleFilterChange(filter.id)"
        />
        <el-select
          v-else-if="['region', 'business_line', 'organization', 'enum'].includes(filter.type)"
          v-model="localValues[filter.id]"
          :placeholder="filter.placeholder || `请选择${filter.name}`"
          size="small"
          :multiple="filter.type === 'region' || filter.type === 'organization'"
          clearable
          @change="handleFilterChange(filter.id)"
        >
          <el-option
            v-for="option in filter.options || []"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>
    </div>
    <el-button v-if="filters.length > 0" size="small" @click="resetFilters">
      <el-icon><Refresh /></el-icon>
      重置
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import type { FilterConfig } from '@/types'

const props = defineProps<{
  filters: FilterConfig[]
  modelValue: Record<string, any>
}>()

const emit = defineEmits(['update:modelValue', 'filter-change'])

const localValues = reactive<Record<string, any>>({})

watch(
  () => props.filters,
  (filters) => {
    filters.forEach(f => {
      if (localValues[f.id] === undefined) {
        localValues[f.id] = f.defaultValue !== undefined ? f.defaultValue : (f.type === 'date_range' ? null : '')
      }
    })
  },
  { immediate: true, deep: true }
)

watch(
  () => props.modelValue,
  (val) => {
    Object.entries(val).forEach(([key, value]) => {
      if (localValues[key] !== value) {
        localValues[key] = value
      }
    })
  },
  { deep: true }
)

function handleFilterChange(filterId: string) {
  emit('update:modelValue', { ...localValues })
  emit('filter-change', filterId)
}

function resetFilters() {
  props.filters.forEach(f => {
    localValues[f.id] = f.defaultValue !== undefined ? f.defaultValue : (f.type === 'date_range' ? null : '')
  })
  emit('update:modelValue', { ...localValues })
  emit('filter-change', 'all')
}
</script>

<style scoped>
.filter-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}

.filter-control {
  min-width: 200px;
}
</style>
