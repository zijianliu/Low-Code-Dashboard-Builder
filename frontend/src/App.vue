<template>
  <el-container class="app-container">
    <el-header v-if="!isSharePage" class="app-header">
      <div class="header-content">
        <h1 class="logo">
          <el-icon><DataBoard /></el-icon>
          低代码数据看板
        </h1>
        <el-menu mode="horizontal" :router="true" class="header-menu">
          <el-menu-item index="/dashboards">
            <el-icon><Monitor /></el-icon>
            <span>看板管理</span>
          </el-menu-item>
          <el-menu-item index="/data-sources">
            <el-icon><Coin /></el-icon>
            <span>数据源</span>
          </el-menu-item>
        </el-menu>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isSharePage = computed(() => route.path.startsWith('/share/'))
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: #f5f7fa;
}

.app-header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0 24px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  align-items: center;
  width: 100%;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1890ff;
}

.header-menu {
  flex: 1;
  margin-left: 24px;
}

.app-main {
  padding: 24px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
