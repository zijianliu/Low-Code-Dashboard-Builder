<template>
  <div class="dashboard-list">
    <div class="page-header">
      <h2>看板管理</h2>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建看板
      </el-button>
    </div>

    <div class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索看板名称"
        clearable
        :prefix-icon="Search"
        style="width: 240px"
        @clear="loadDashboards"
        @keyup.enter="loadDashboards"
      />
      <el-select
        v-model="filterActive"
        placeholder="启用状态"
        clearable
        style="width: 140px"
        @change="loadDashboards"
      >
        <el-option label="全部" value="" />
        <el-option label="已启用" value="true" />
        <el-option label="已停用" value="false" />
      </el-select>
      <el-button type="primary" @click="loadDashboards">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <el-table :data="dashboards" v-loading="loading" stripe>
      <el-table-column prop="name" label="看板名称" min-width="160" />
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="可见范围" width="100">
        <template #default="{ row }">
          <el-tag :type="visibilityTagType(row.visibility)">
            {{ visibilityText(row.visibility) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'">
            {{ row.isActive ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发布状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isPublished ? 'success' : 'warning'">
            {{ row.isPublished ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewDetail(row)">
            <el-icon><View /></el-icon>
            查看
          </el-button>
          <el-button link type="primary" @click="editDashboard(row)">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button link type="success" @click="copyDashboard(row)">
            <el-icon><CopyDocument /></el-icon>
            复制
          </el-button>
          <el-popconfirm
            title="确定要删除这个看板吗？"
            confirm-button-text="删除"
            cancel-button-text="取消"
            @confirm="deleteDashboard(row)"
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
      @size-change="loadDashboards"
      @current-change="loadDashboards"
    />

    <el-dialog v-model="showCreateDialog" title="新建看板" width="500px">
      <el-form :model="newDashboard" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="newDashboard.name" placeholder="请输入看板名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="newDashboard.description"
            type="textarea"
            :rows="3"
            placeholder="请输入看板描述"
          />
        </el-form-item>
        <el-form-item label="可见范围">
          <el-select v-model="newDashboard.visibility">
            <el-option label="私有" value="private" />
            <el-option label="团队可见" value="team" />
            <el-option label="公开分享" value="public" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createDashboard">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { dashboardApi } from '@/api'
import type { Dashboard, DashboardVisibility } from '@/types'

const router = useRouter()
const dashboards = ref<Dashboard[]>([])
const loading = ref(false)
const searchQuery = ref('')
const filterActive = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const showCreateDialog = ref(false)
const creating = ref(false)
const newDashboard = ref({
  name: '',
  description: '',
  visibility: 'private' as DashboardVisibility
})

async function loadDashboards() {
  loading.value = true
  try {
    const response = await dashboardApi.list({
      page: currentPage.value,
      pageSize: pageSize.value,
      search: searchQuery.value || undefined,
      isActive: filterActive.value === '' ? undefined : filterActive.value === 'true'
    })
    if (response.success) {
      dashboards.value = response.data || []
      total.value = response.pagination?.total || 0
    }
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function createDashboard() {
  if (!newDashboard.value.name.trim()) {
    ElMessage.warning('请输入看板名称')
    return
  }
  creating.value = true
  try {
    const response = await dashboardApi.create({
      name: newDashboard.value.name,
      description: newDashboard.value.description,
      visibility: newDashboard.value.visibility,
      layout: { items: [], cols: 12, rowHeight: 100 },
      filters: []
    })
    if (response.success) {
      ElMessage.success('创建成功')
      showCreateDialog.value = false
      newDashboard.value = { name: '', description: '', visibility: 'private' }
      loadDashboards()
    }
  } catch (err: any) {
    ElMessage.error(err.message || '创建失败')
  } finally {
    creating.value = false
  }
}

function viewDetail(row: Dashboard) {
  router.push(`/dashboards/${row.id}`)
}

function editDashboard(row: Dashboard) {
  router.push(`/dashboards/${row.id}/edit`)
}

async function copyDashboard(row: Dashboard) {
  try {
    const response = await dashboardApi.copy(row.id)
    if (response.success) {
      ElMessage.success('复制成功')
      loadDashboards()
    }
  } catch (err: any) {
    ElMessage.error(err.message || '复制失败')
  }
}

async function deleteDashboard(row: Dashboard) {
  try {
    const response = await dashboardApi.delete(row.id)
    if (response.success) {
      ElMessage.success('删除成功')
      loadDashboards()
    }
  } catch (err: any) {
    ElMessage.error(err.message || '删除失败')
  }
}

function visibilityText(v: DashboardVisibility): string {
  const map: Record<DashboardVisibility, string> = {
    private: '私有',
    team: '团队',
    public: '公开'
  }
  return map[v]
}

function visibilityTagType(v: DashboardVisibility): string {
  const map: Record<DashboardVisibility, string> = {
    private: 'info',
    team: 'warning',
    public: 'success'
  }
  return map[v]
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  loadDashboards()
})
</script>

<style scoped>
.dashboard-list {
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
