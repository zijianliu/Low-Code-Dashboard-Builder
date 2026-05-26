<template>
  <div class="dashboard-detail" v-loading="loading">
    <template v-if="dashboard">
      <div class="detail-header">
        <div>
          <h2>{{ dashboard.name }}</h2>
          <p class="description" v-if="dashboard.description">{{ dashboard.description }}</p>
          <div class="meta-info">
            <el-tag size="small">{{ visibilityText(dashboard.visibility) }}</el-tag>
            <el-tag :type="dashboard.isActive ? 'success' : 'info'" size="small">
              {{ dashboard.isActive ? '启用' : '停用' }}
            </el-tag>
            <el-tag :type="dashboard.isPublished ? 'success' : 'warning'" size="small">
              {{ dashboard.isPublished ? '已发布' : '草稿' }}
            </el-tag>
          </div>
        </div>
        <div class="actions">
          <el-button @click="goBack">
            <el-icon><Back /></el-icon>
            返回
          </el-button>
          <el-button type="primary" @click="editDashboard">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button @click="previewDashboard">
            <el-icon><View /></el-icon>
            预览
          </el-button>
          <el-button type="success" @click="handlePublish" v-if="!dashboard.isPublished">
            <el-icon><Promotion /></el-icon>
            发布
          </el-button>
          <el-button type="warning" @click="handleToggleActive">
            <el-icon><CloseBold /></el-icon>
            {{ dashboard.isActive ? '停用' : '启用' }}
          </el-button>
        </div>
      </div>

      <el-row :gutter="16" class="stats-row">
        <el-col :span="6">
          <el-card>
            <div class="stat-item">
              <span class="label">图表数量</span>
              <span class="value">{{ dashboard.chartCount || 0 }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card>
            <div class="stat-item">
              <span class="label">访问次数</span>
              <span class="value">{{ dashboard.accessCount || 0 }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card>
            <div class="stat-item">
              <span class="label">最近更新</span>
              <span class="value">{{ formatDate(dashboard.updatedAt) }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card>
            <div class="stat-item">
              <span class="label">版本号</span>
              <span class="value">v{{ dashboard.version }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-tabs v-model="activeTab" class="detail-tabs">
        <el-tab-pane label="图表列表" name="charts">
          <el-table :data="dashboard.charts || []" stripe>
            <el-table-column prop="title" label="图表标题" min-width="160" />
            <el-table-column prop="type" label="图表类型" width="120">
              <template #default="{ row }">
                {{ chartTypeText(row.type) }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="访问记录" name="access">
          <el-table :data="dashboard.recentAccess || []" stripe>
            <el-table-column prop="accessedAt" label="访问时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.accessedAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="userId" label="用户ID" width="200" />
            <el-table-column prop="ip" label="IP地址" width="140" />
            <el-table-column prop="userAgent" label="浏览器" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="分享链接" name="share">
          <div class="share-section">
            <el-button type="primary" @click="createShareLink">
              <el-icon><Link /></el-icon>
              生成分享链接
            </el-button>
            <el-table :data="shareLinks" stripe style="margin-top: 16px">
              <el-table-column prop="token" label="分享Token" min-width="200" />
              <el-table-column prop="expiresAt" label="过期时间" width="180">
                <template #default="{ row }">
                  {{ row.expiresAt ? formatDate(row.expiresAt) : '永不过期' }}
                </template>
              </el-table-column>
              <el-table-column prop="isActive" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.isActive ? 'success' : 'info'">
                    {{ row.isActive ? '有效' : '已撤销' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button link type="primary" @click="copyLink(row.token)">
                    复制链接
                  </el-button>
                  <el-button link type="danger" @click="revokeLink(row)" v-if="row.isActive">
                    撤销
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>

    <el-empty v-else description="看板不存在" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { dashboardApi, shareApi } from '@/api'
import type { Dashboard, ShareLink, ChartType } from '@/types'

const route = useRoute()
const router = useRouter()

const dashboard = ref<Dashboard | null>(null)
const shareLinks = ref<ShareLink[]>([])
const loading = ref(false)
const activeTab = ref('charts')

async function loadDashboard() {
  loading.value = true
  try {
    const response = await dashboardApi.get(route.params.id as string)
    if (response.success && response.data) {
      dashboard.value = response.data
    }
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadShareLinks() {
  try {
    const response = await shareApi.list(route.params.id as string)
    if (response.success) {
      shareLinks.value = response.data || []
    }
  } catch (err: any) {
    console.error('加载分享链接失败', err)
  }
}

function goBack() {
  router.back()
}

function editDashboard() {
  router.push(`/dashboards/${dashboard.value?.id}/edit`)
}

function previewDashboard() {
  router.push(`/dashboards/${dashboard.value?.id}/preview`)
}

async function handlePublish() {
  if (!dashboard.value) return
  try {
    const response = await dashboardApi.publish(dashboard.value.id)
    if (response.success) {
      ElMessage.success('发布成功')
      loadDashboard()
    }
  } catch (err: any) {
    ElMessage.error(err.message || '发布失败')
  }
}

async function handleToggleActive() {
  if (!dashboard.value) return
  try {
    const response = dashboard.value.isActive
      ? await dashboardApi.deactivate(dashboard.value.id)
      : await dashboardApi.activate(dashboard.value.id)
    if (response.success) {
      ElMessage.success(dashboard.value.isActive ? '已停用' : '已启用')
      loadDashboard()
    }
  } catch (err: any) {
    ElMessage.error(err.message || '操作失败')
  }
}

async function createShareLink() {
  if (!dashboard.value) return
  try {
    const response = await shareApi.create(dashboard.value.id, 24)
    if (response.success && response.data) {
      ElMessage.success('分享链接已生成')
      copyLink(response.data.token)
      loadShareLinks()
    }
  } catch (err: any) {
    ElMessage.error(err.message || '创建分享链接失败')
  }
}

function copyLink(token: string) {
  const link = `${window.location.origin}/share/${token}`
  navigator.clipboard.writeText(link).then(() => {
    ElMessage.success('链接已复制到剪贴板')
  }).catch(() => {
    ElMessage.info(`分享链接: ${link}`)
  })
}

async function revokeLink(link: ShareLink) {
  if (!dashboard.value) return
  try {
    const response = await shareApi.revoke(dashboard.value.id, link.id)
    if (response.success) {
      ElMessage.success('链接已撤销')
      loadShareLinks()
    }
  } catch (err: any) {
    ElMessage.error(err.message || '撤销失败')
  }
}

function visibilityText(v: string): string {
  const map: Record<string, string> = {
    private: '私有',
    team: '团队可见',
    public: '公开分享'
  }
  return map[v] || v
}

function chartTypeText(t: ChartType): string {
  const map: Record<ChartType, string> = {
    line: '折线图',
    bar: '柱状图',
    pie: '饼图',
    metric: '指标卡',
    table: '表格'
  }
  return map[t] || t
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  loadDashboard()
  loadShareLinks()
})
</script>

<style scoped>
.dashboard-detail {
  max-width: 1400px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
}

.detail-header h2 {
  margin: 0 0 8px 0;
  font-size: 22px;
  color: #303133;
}

.description {
  color: #606266;
  margin: 0 0 12px 0;
}

.meta-info {
  display: flex;
  gap: 8px;
}

.actions {
  display: flex;
  gap: 8px;
}

.stats-row {
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
}

.stat-item .label {
  display: block;
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-item .value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.detail-tabs {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
}

.share-section {
  padding: 16px 0;
}
</style>
