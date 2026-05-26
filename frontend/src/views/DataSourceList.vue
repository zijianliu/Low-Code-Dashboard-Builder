<template>
  <div class="data-source-list">
    <div class="page-header">
      <h2>数据源管理</h2>
      <el-button type="primary" @click="goToCreate">
        <el-icon><Plus /></el-icon>
        新建数据源
      </el-button>
    </div>

    <div class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索数据源名称"
        clearable
        :prefix-icon="Search"
        style="width: 240px"
        @clear="loadDataSources"
        @keyup.enter="loadDataSources"
      />
      <el-button type="primary" @click="loadDataSources">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <el-table :data="dataSources" v-loading="loading" stripe>
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column prop="type" label="类型" width="120">
        <template #default="{ row }">
          <el-tag :type="typeTagType(row.type)">
            {{ typeText(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column prop="updatedAt" label="更新时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="testConnection(row)">
            <el-icon><Connection /></el-icon>
            测试
          </el-button>
          <el-button link type="primary" @click="editDataSource(row)">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-popconfirm
            title="确定要删除这个数据源吗？"
            confirm-button-text="删除"
            cancel-button-text="取消"
            @confirm="deleteDataSource(row)"
          >
            <template #reference>
              <el-button link type="danger">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pagination"
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :page-sizes="[10, 20, 50, 100]"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="loadDataSources"
      @current-change="loadDataSources"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { dataSourceApi } from '@/api'
import type { DataSource, DataSourceType } from '@/types'

const router = useRouter()
const dataSources = ref<DataSource[]>([])
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

async function loadDataSources() {
  loading.value = true
  try {
    const response = await dataSourceApi.list({
      page: currentPage.value,
      pageSize: pageSize.value,
      search: searchQuery.value || undefined
    })
    if (response.success) {
      dataSources.value = response.data || []
      total.value = response.pagination?.total || 0
    }
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function goToCreate() {
  router.push('/data-sources/new')
}

function editDataSource(row: DataSource) {
  router.push(`/data-sources/${row.id}/edit`)
}

async function testConnection(row: DataSource) {
  try {
    const response = await dataSourceApi.test(row.id)
    if (response.success) {
      ElMessage.success('连接测试成功')
    } else {
      ElMessage.error(response.error || '连接测试失败')
    }
  } catch (err: any) {
    ElMessage.error(err.message || '连接测试失败')
  }
}

async function deleteDataSource(row: DataSource) {
  try {
    const response = await dataSourceApi.delete(row.id)
    if (response.success) {
      ElMessage.success('删除成功')
      loadDataSources()
    }
  } catch (err: any) {
    ElMessage.error(err.message || '删除失败')
  }
}

function typeText(t: DataSourceType): string {
  const map: Record<DataSourceType, string> = {
    rest_api: 'REST API',
    static_json: '静态 JSON',
    database: '数据库'
  }
  return map[t] || t
}

function typeTagType(t: DataSourceType): string {
  const map: Record<DataSourceType, string> = {
    rest_api: 'primary',
    static_json: 'success',
    database: 'warning'
  }
  return map[t] || 'info'
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  loadDataSources()
})
</script>

<style scoped>
.data-source-list {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.pagination {
  justify-content: center;
  margin-top: 16px;
}
</style>
