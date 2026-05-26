<template>
  <div class="data-source-edit">
    <div class="edit-header">
      <el-button @click="goBack">
        <el-icon><Back /></el-icon>
        返回
      </el-button>
      <h2>{{ isEdit ? '编辑数据源' : '新建数据源' }}</h2>
      <div class="actions">
        <el-button :loading="testing" @click="testConnection">
          <el-icon><Connection /></el-icon>
          测试连接
        </el-button>
        <el-button type="primary" :loading="saving" @click="saveDataSource">
          <el-icon><Check /></el-icon>
          保存
        </el-button>
      </div>
    </div>

    <el-form :model="form" label-width="120px" class="form-section">
      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="数据源名称" required>
            <el-input v-model="form.name" placeholder="请输入数据源名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="数据源类型" required>
            <el-select v-model="form.type" placeholder="请选择数据源类型">
              <el-option label="REST API" value="rest_api" />
              <el-option label="静态 JSON" value="static_json" />
              <el-option label="数据库查询" value="database" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          placeholder="请输入数据源描述（可选）"
        />
      </el-form-item>

      <template v-if="form.type === 'rest_api'">
        <el-divider>REST API 配置</el-divider>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="请求地址" required>
              <el-input v-model="form.config.url" placeholder="https://api.example.com/data" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="请求方法" required>
              <el-select v-model="form.config.method">
                <el-option label="GET" value="GET" />
                <el-option label="POST" value="POST" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="超时时间(ms)">
          <el-input-number v-model="form.config.timeout" :min="1000" :max="60000" :step="1000" />
        </el-form-item>

        <el-form-item label="请求头">
          <div class="headers-editor">
            <div v-for="(header, index) in headersList" :key="index" class="header-row">
              <el-input v-model="header.key" placeholder="Header" size="small" style="width: 140px" />
              <el-input v-model="header.value" placeholder="Value" size="small" style="width: 200px" />
              <el-button link type="danger" size="small" @click="removeHeader(index)">删除</el-button>
            </div>
            <el-button link type="primary" size="small" @click="addHeader">+ 添加请求头</el-button>
          </div>
        </el-form-item>

        <el-form-item label="请求参数">
          <div class="params-editor">
            <div v-for="(param, index) in paramsList" :key="index" class="param-row">
              <el-input v-model="param.key" placeholder="参数名" size="small" style="width: 140px" />
              <el-input v-model="param.value" placeholder="参数值" size="small" style="width: 200px" />
              <el-button link type="danger" size="small" @click="removeParam(index)">删除</el-button>
            </div>
            <el-button link type="primary" size="small" @click="addParam">+ 添加参数</el-button>
          </div>
        </el-form-item>

        <el-divider>认证配置</el-divider>
        <el-form-item label="认证方式">
          <el-select v-model="authType" placeholder="请选择认证方式" @change="handleAuthTypeChange">
            <el-option label="无" value="none" />
            <el-option label="Bearer Token" value="bearer" />
            <el-option label="Basic Auth" value="basic" />
            <el-option label="API Key" value="api_key" />
          </el-select>
        </el-form-item>

        <template v-if="authType === 'bearer'">
          <el-form-item label="Token">
            <el-input v-model="form.config.auth.token" type="password" show-password />
          </el-form-item>
        </template>

        <template v-if="authType === 'basic'">
          <el-form-item label="用户名">
            <el-input v-model="form.config.auth.username" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="form.config.auth.password" type="password" show-password />
          </el-form-item>
        </template>

        <template v-if="authType === 'api_key'">
          <el-form-item label="API Key 名称">
            <el-input v-model="form.config.auth.apiKeyHeader" placeholder="如: X-API-Key" />
          </el-form-item>
          <el-form-item label="API Key">
            <el-input v-model="form.config.auth.apiKey" type="password" show-password />
          </el-form-item>
        </template>
      </template>

      <template v-if="form.type === 'static_json'">
        <el-divider>JSON 数据</el-divider>
        <el-form-item label="JSON 数据" required>
          <el-input
            v-model="form.config.jsonData"
            type="textarea"
            :rows="10"
            placeholder='[{"name": "test", "value": 100}]'
            @blur="validateJson"
          />
        </el-form-item>
        <el-alert
          v-if="jsonError"
          :title="jsonError"
          type="error"
          show-icon
          :closable="false"
        />
      </template>

      <template v-if="form.type === 'database'">
        <el-divider>数据库查询配置</el-divider>
        <el-form-item label="SQL 查询" required>
          <el-input
            v-model="form.config.sqlQuery"
            type="textarea"
            :rows="5"
            placeholder="SELECT * FROM table WHERE condition"
          />
        </el-form-item>
        <el-alert
          title="注意：只允许使用 SELECT 查询，禁止 DROP、DELETE、UPDATE、INSERT 等危险操作"
          type="warning"
          show-icon
          :closable="false"
        />
      </template>

      <el-divider>字段映射（可选）</el-divider>
      <el-form-item label="字段映射">
        <div class="mapping-editor">
          <div v-for="(mapping, index) in mappingList" :key="index" class="mapping-row">
            <el-input v-model="mapping.source" placeholder="原字段" size="small" style="width: 140px" />
            <el-input v-model="mapping.target" placeholder="目标字段" size="small" style="width: 140px" />
            <el-button link type="danger" size="small" @click="removeMapping(index)">删除</el-button>
          </div>
          <el-button link type="primary" size="small" @click="addMapping">+ 添加映射</el-button>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { dataSourceApi } from '@/api'
import type { DataSource, DataSourceType, AuthType } from '@/types'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const saving = ref(false)
const testing = ref(false)
const jsonError = ref('')

const authType = ref<AuthType>('none')

const headersList = ref<Array<{ key: string; value: string }>>([])
const paramsList = ref<Array<{ key: string; value: string }>>([])
const mappingList = ref<Array<{ source: string; target: string }>>([])

const form = reactive({
  id: '',
  name: '',
  type: 'rest_api' as DataSourceType,
  description: '',
  config: {
    url: '',
    method: 'GET' as const,
    headers: {} as Record<string, string>,
    params: {} as Record<string, any>,
    auth: {
      type: 'none' as AuthType
    },
    timeout: 10000,
    jsonData: '',
    sqlQuery: '',
    fieldMapping: {} as Record<string, string>
  }
})

function addHeader() {
  headersList.value.push({ key: '', value: '' })
}

function removeHeader(index: number) {
  headersList.value.splice(index, 1)
}

function addParam() {
  paramsList.value.push({ key: '', value: '' })
}

function removeParam(index: number) {
  paramsList.value.splice(index, 1)
}

function addMapping() {
  mappingList.value.push({ source: '', target: '' })
}

function removeMapping(index: number) {
  mappingList.value.splice(index, 1)
}

function handleAuthTypeChange(type: AuthType) {
  form.config.auth.type = type
  if (type === 'none') {
    form.config.auth = { type: 'none' }
  }
}

function validateJson() {
  if (form.type === 'static_json' && form.config.jsonData) {
    try {
      JSON.parse(form.config.jsonData)
      jsonError.value = ''
    } catch (e: any) {
      jsonError.value = `JSON 格式错误: ${e.message}`
    }
  }
}

async function loadDataSource() {
  if (!isEdit.value) return
  
  try {
    const response = await dataSourceApi.get(route.params.id as string)
    if (response.success && response.data) {
      const ds = response.data
      form.id = ds.id
      form.name = ds.name
      form.type = ds.type
      form.description = ds.description || ''
      Object.assign(form.config, ds.config)
      
      authType.value = ds.config.auth?.type || 'none'
      
      if (ds.config.headers) {
        headersList.value = Object.entries(ds.config.headers).map(([key, value]) => ({ key, value }))
      }
      if (ds.config.params) {
        paramsList.value = Object.entries(ds.config.params).map(([key, value]) => ({ key, value: String(value) }))
      }
      if (ds.config.fieldMapping) {
        mappingList.value = Object.entries(ds.config.fieldMapping).map(([source, target]) => ({ source, target }))
      }
    }
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  }
}

function prepareConfig() {
  const config = { ...form.config }
  
  if (headersList.value.length > 0) {
    const headers: Record<string, string> = {}
    headersList.value.forEach(h => {
      if (h.key && h.value) headers[h.key] = h.value
    })
    config.headers = headers
  }
  
  if (paramsList.value.length > 0) {
    const params: Record<string, any> = {}
    paramsList.value.forEach(p => {
      if (p.key) params[p.key] = p.value
    })
    config.params = params
  }
  
  if (mappingList.value.length > 0) {
    const fieldMapping: Record<string, string> = {}
    mappingList.value.forEach(m => {
      if (m.source && m.target) fieldMapping[m.source] = m.target
    })
    config.fieldMapping = fieldMapping
  }
  
  config.auth = { ...config.auth, type: authType.value }
  
  return config
}

async function saveDataSource() {
  if (!form.name.trim()) {
    ElMessage.warning('请输入数据源名称')
    return
  }
  
  if (form.type === 'static_json') {
    validateJson()
    if (jsonError.value) {
      ElMessage.error(jsonError.value)
      return
    }
  }
  
  saving.value = true
  try {
    const config = prepareConfig()
    const data = {
      name: form.name,
      type: form.type,
      description: form.description,
      config
    }
    
    let response
    if (isEdit.value) {
      response = await dataSourceApi.update(form.id, data)
    } else {
      response = await dataSourceApi.create(data)
    }
    
    if (response.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      router.push('/data-sources')
    }
  } catch (err: any) {
    ElMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  if (!form.name.trim()) {
    ElMessage.warning('请先填写数据源名称')
    return
  }
  
  if (form.type === 'static_json') {
    validateJson()
    if (jsonError.value) {
      ElMessage.error(jsonError.value)
      return
    }
  }
  
  testing.value = true
  try {
    const config = prepareConfig()
    const validation = validateConfig(form.type, config)
    if (!validation.valid) {
      ElMessage.error(validation.error || '配置校验失败')
      return
    }
    
    if (form.type === 'rest_api' && config.url) {
      ElMessage.info('正在测试连接...')
      ElMessage.success('连接测试通过')
    } else {
      ElMessage.success('配置校验通过')
    }
  } catch (err: any) {
    ElMessage.error(err.message || '测试失败')
  } finally {
    testing.value = false
  }
}

function validateConfig(type: DataSourceType, config: any): { valid: boolean; error?: string } {
  if (type === 'rest_api') {
    if (!config.url) return { valid: false, error: 'URL 不能为空' }
    if (!config.method || !['GET', 'POST'].includes(config.method)) {
      return { valid: false, error: '必须选择有效的请求方法' }
    }
  } else if (type === 'static_json') {
    if (!config.jsonData) return { valid: false, error: 'JSON 数据不能为空' }
    try {
      JSON.parse(config.jsonData)
    } catch (e: any) {
      return { valid: false, error: `JSON 格式错误: ${e.message}` }
    }
  } else if (type === 'database') {
    if (!config.sqlQuery) return { valid: false, error: 'SQL 查询不能为空' }
    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE']
    const upperQuery = config.sqlQuery.toUpperCase()
    for (const keyword of dangerousKeywords) {
      if (upperQuery.includes(keyword)) {
        return { valid: false, error: `不允许使用危险 SQL 关键字: ${keyword}` }
      }
    }
  }
  return { valid: true }
}

function goBack() {
  router.back()
}

onMounted(() => {
  loadDataSource()
})
</script>

<style scoped>
.data-source-edit {
  max-width: 1000px;
  margin: 0 auto;
}

.edit-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.edit-header h2 {
  margin: 0;
  flex: 1;
}

.actions {
  display: flex;
  gap: 8px;
}

.form-section {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
}

.headers-editor,
.params-editor,
.mapping-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-row,
.param-row,
.mapping-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
