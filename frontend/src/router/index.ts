import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboards'
  },
  {
    path: '/dashboards',
    name: 'DashboardList',
    component: () => import('@/views/DashboardList.vue')
  },
  {
    path: '/dashboards/:id',
    name: 'DashboardDetail',
    component: () => import('@/views/DashboardDetail.vue')
  },
  {
    path: '/dashboards/:id/edit',
    name: 'DashboardEdit',
    component: () => import('@/views/DashboardEdit.vue')
  },
  {
    path: '/dashboards/:id/preview',
    name: 'DashboardPreview',
    component: () => import('@/views/DashboardPreview.vue')
  },
  {
    path: '/data-sources',
    name: 'DataSourceList',
    component: () => import('@/views/DataSourceList.vue')
  },
  {
    path: '/data-sources/new',
    name: 'DataSourceCreate',
    component: () => import('@/views/DataSourceEdit.vue')
  },
  {
    path: '/data-sources/:id/edit',
    name: 'DataSourceEdit',
    component: () => import('@/views/DataSourceEdit.vue')
  },
  {
    path: '/share/:token',
    name: 'ShareView',
    component: () => import('@/views/ShareView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
