import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Dashboard, Chart, LayoutConfig, FilterConfig } from '@/types';
import { dashboardApi, chartApi, dataQueryApi } from '@/api';

export const useDashboardStore = defineStore('dashboard', () => {
  const currentDashboard = ref<Dashboard | null>(null);
  const charts = ref<Chart[]>([]);
  const layout = ref<LayoutConfig>({ items: [], cols: 12, rowHeight: 100 });
  const filters = ref<FilterConfig[]>([]);
  const filterValues = ref<Record<string, any>>({});
  const chartData = ref<Record<string, { loading: boolean; data: any[]; error?: string }>>({});
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const chartMap = computed(() => {
    return charts.value.reduce((acc, chart) => {
      acc[chart.id] = chart;
      return acc;
    }, {} as Record<string, Chart>);
  });

  async function loadDashboard(id: string) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await dashboardApi.get(id);
      if (response.success && response.data) {
        currentDashboard.value = response.data;
        charts.value = response.data.charts || [];
        layout.value = response.data.layout;
        filters.value = response.data.filters || [];
        
        filterValues.value = {};
        filters.value.forEach(f => {
          if (f.defaultValue !== undefined) {
            filterValues.value[f.id] = f.defaultValue;
          }
        });

        await loadAllChartData();
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to load dashboard';
    } finally {
      isLoading.value = false;
    }
  }

  async function loadAllChartData() {
    const promises = charts.value.map(chart => loadChartData(chart.id));
    await Promise.allSettled(promises);
  }

  async function loadChartData(chartId: string, additionalFilters?: Record<string, any>) {
    const chart = charts.value.find(c => c.id === chartId);
    if (!chart) return;

    chartData.value[chartId] = { loading: true, data: [] };

    try {
      const appliedFilters: Record<string, any> = {};
      
      if (chart.boundFilterIds) {
        chart.boundFilterIds.forEach(filterId => {
          const filterConfig = filters.value.find(f => f.id === filterId);
          if (filterConfig && filterValues.value[filterId] !== undefined) {
            appliedFilters[filterConfig.field] = filterValues.value[filterId];
          }
        });
      }

      if (additionalFilters) {
        Object.assign(appliedFilters, additionalFilters);
      }

      const response = await dataQueryApi.queryChart(chartId, appliedFilters);
      
      if (response.success) {
        chartData.value[chartId] = {
          loading: false,
          data: response.data?.data || []
        };
      } else {
        chartData.value[chartId] = {
          loading: false,
          data: [],
          error: response.error || 'Failed to load data'
        };
      }
    } catch (err: any) {
      chartData.value[chartId] = {
        loading: false,
        data: [],
        error: err.message || 'Failed to load data'
      };
    }
  }

  function updateFilterValue(filterId: string, value: any) {
    filterValues.value[filterId] = value;
    
    const affectedCharts = charts.value.filter(chart => 
      chart.boundFilterIds?.includes(filterId)
    );
    
    affectedCharts.forEach(chart => {
      loadChartData(chart.id);
    });
  }

  async function saveLayout(newLayout: LayoutConfig) {
    if (!currentDashboard.value) return;
    
    try {
      await dashboardApi.update(currentDashboard.value.id, {
        ...currentDashboard.value,
        layout: newLayout
      });
      layout.value = newLayout;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save layout');
    }
  }

  function reset() {
    currentDashboard.value = null;
    charts.value = [];
    layout.value = { items: [], cols: 12, rowHeight: 100 };
    filters.value = [];
    filterValues.value = {};
    chartData.value = {};
    isLoading.value = false;
    error.value = null;
  }

  return {
    currentDashboard,
    charts,
    layout,
    filters,
    filterValues,
    chartData,
    isLoading,
    error,
    chartMap,
    loadDashboard,
    loadChartData,
    updateFilterValue,
    saveLayout,
    reset
  };
});
