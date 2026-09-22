<template>
  <div class="reports-hub-view">
    <!-- Reports Hub Header Banner -->


    <!-- Full-Width Reports List -->
    <v-card elevation="1" class="rounded-0 border bg-white overflow-hidden">
      <v-list lines="two" class="pa-0">
        <template v-for="(item, index) in reportItems" :key="item.route">
          <v-list-item
            :to="item.route"
            class="pa-4 pa-md-5 report-list-item"
            :ripple="true"
          >
            <!-- Report Icon Avatar -->
            <template #prepend>
              <v-avatar
                :color="item.avatarColor"
                variant="tonal"
                rounded="lg"
                size="48"
                class="me-4 flex-shrink-0"
              >
                <v-icon size="26" :color="item.avatarColor">{{ item.icon }}</v-icon>
              </v-avatar>
            </template>

            <!-- Report Details -->
            <div class="d-flex flex-column flex-grow-1 me-4">
              <div class="d-flex align-center gap-2 flex-wrap mb-1">
                <span class="text-subtitle-1 font-weight-bold text-slate-900 report-title">
                  {{ item.title }}
                </span>
                <v-chip
                  v-for="tag in item.tags"
                  :key="tag"
                  size="x-small"
                  variant="outlined"
                  color="slate-600"
                  class="font-weight-medium"
                >
                  {{ tag }}
                </v-chip>
              </div>

              <div class="text-body-2 text-slate-600">
                {{ item.description }}
              </div>
            </div>

            <!-- Open Button & Arrow -->
            <template #append>
              <div class="d-flex align-center gap-2 flex-shrink-0">
                <v-btn
                  variant="tonal"
                  color="primary"
                  class="font-weight-bold text-none d-none d-sm-inline-flex"
                  size="small"
                  append-icon="mdi-arrow-right"
                >
                  {{ t('reports.openReport') }}
                </v-btn>
                <v-icon color="slate-400" size="22" class="d-sm-none">mdi-chevron-right</v-icon>
              </div>
            </template>
          </v-list-item>

          <v-divider v-if="index < reportItems.length - 1" />
        </template>
      </v-list>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const reportItems = computed(() => [
  {
    title: t('reports.productionReport'),
    description: t('reports.productionReportDesc'),
    icon: 'mdi-factory',
    avatarColor: 'primary',
    route: '/reports/production',
    tags: [
      t('reports.tagManufacturing'),
      t('reports.tagPartsConsumption'),
      t('reports.tagBatchHistory')
    ]
  },
  {
    title: t('reports.purchasesReport'),
    description: t('reports.purchasesReportDesc'),
    icon: 'mdi-cart-arrow-down',
    avatarColor: 'success',
    route: '/reports/purchases',
    tags: [
      t('reports.tagOrders'),
      t('reports.tagSpendAnalytics'),
      t('reports.tagDeliveryStatus')
    ]
  }
]);
</script>

<style scoped>
.report-list-item {
  transition: background-color 0.15s ease, transform 0.15s ease;
  cursor: pointer;
}
.report-list-item:hover {
  background-color: #F8FAFC !important;
}
.report-list-item:hover .report-title {
  color: #1d4ed8 !important;
}
</style>
