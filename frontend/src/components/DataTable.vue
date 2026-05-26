<template>
  <div class="data-table">
    <el-table
      :data="pagedData"
      :height="tableHeight"
      :stripe="true"
      style="width: 100%"
      :header-cell-style="{ background: '#fafafa' }"
    >
      <el-table-column
        v-for="col in columns"
        :key="col.field"
        :prop="col.field"
        :label="col.title"
        :width="col.width"
        :sortable="col.sortable"
      >
        <template #default="{ row }">
          <span>{{ formatCellValue(row[col.field]) }}</span>
        </template>
      </el-table-column>
    </el-table>
    <div class="table-pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="data.length"
        layout="total, sizes, prev, pager, next, jumper"
        small
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TableColumn } from '@/types'

const props = withDefaults(defineProps<{
  data: any[]
  columns: TableColumn[]
  pageSize?: number
  tableHeight?: number
}>(), {
  pageSize: 20,
  tableHeight: 400
})

const currentPage = ref(1)
const internalPageSize = ref(props.pageSize)

watch(() => props.pageSize, (val) => {
  internalPageSize.value = val
})

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * internalPageSize.value
  const end = start + internalPageSize.value
  return props.data.slice(start, end)
})

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
</script>

<style scoped>
.data-table {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-pagination {
  padding: 12px 0;
  display: flex;
  justify-content: center;
  border-top: 1px solid #f0f0f0;
  margin-top: auto;
}
</style>
