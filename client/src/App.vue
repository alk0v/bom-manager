<template>
  <v-app>
    <!-- Navigation Drawer (Sidebar) -->
    <v-navigation-drawer
      v-model="drawer"
      :rail="rail"
      permanent
      elevation="1"
      class="border-e bg-white"
    >
      <!-- Brand Header -->
      <v-list-item
        prepend-icon="mdi-chip"
        class="py-3 brand-item text-primary"
        @click="rail = !rail"
      >
        <template #title>
          <div class="d-flex align-center">
            <span class="font-weight-bold">BOM Manager</span>
            <v-chip
              size="x-small"
              color="primary"
              variant="flat"
              class="ms-2 font-mono font-weight-bold"
            >
              0.3.0
            </v-chip>
          </div>
        </template>
        <template #subtitle>
          <span class="text-caption text-slate-500">{{ t('common.brandTagline') }}</span>
        </template>
        <template #append>
          <v-btn
            variant="text"
            icon="mdi-chevron-left"
            size="small"
            @click.stop="rail = !rail"
          />
        </template>
      </v-list-item>

      <v-divider />

      <!-- Main Navigation Menu -->
      <v-list density="comfortable" nav class="mt-2 nav-menu">
        <v-list-item
          prepend-icon="mdi-folder-cog-outline"
          :title="t('nav.projects')"
          value="projects"
          to="/projects"
          active-class="bg-primary text-white"
          rounded="lg"
        />

        <v-list-item
          prepend-icon="mdi-memory"
          :title="t('nav.components')"
          value="components"
          to="/components"
          active-class="bg-primary text-white"
          rounded="lg"
        />

        <v-list-item
          prepend-icon="mdi-cart-outline"
          :title="t('nav.shoppingList')"
          value="shopping-list"
          to="/shopping-list"
          active-class="bg-primary text-white"
          rounded="lg"
        >
          <template #append v-if="shoppingListStore.count > 0">
            <v-badge
              color="amber-darken-3"
              :content="shoppingListStore.count"
              inline
            />
          </template>
        </v-list-item>

        <v-list-item
          prepend-icon="mdi-chart-box-outline"
          :title="t('nav.reports')"
          value="reports"
          to="/reports"
          :active="route.path.startsWith('/reports')"
          active-class="bg-primary text-white"
          rounded="lg"
        />

        <v-list-item
          prepend-icon="mdi-cog-outline"
          :title="t('nav.settings')"
          value="settings"
          to="/settings"
          active-class="bg-primary text-white"
          rounded="lg"
        />

        <v-list-item
          prepend-icon="mdi-text-box-search-outline"
          :title="t('nav.releaseNotes')"
          value="release-notes"
          to="/release-notes"
          active-class="bg-primary text-white"
          rounded="lg"
        >
          <template #append>
            <v-chip
              size="x-small"
              color="primary"
              variant="tonal"
              class="font-mono font-weight-bold"
            >
              0.3.0
            </v-chip>
          </template>
        </v-list-item>
      </v-list>

      <template #append>
        <div class="pa-3 border-t bg-slate-50" v-if="!rail">
          <router-link
            to="/release-notes"
            class="text-decoration-none d-flex align-center justify-space-between text-caption text-slate-600"
          >
            <span>BOM Manager</span>
            <span class="font-mono font-weight-bold">v0.3.0</span>
          </router-link>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Top App Bar -->
    <v-app-bar flat border="b" density="comfortable" class="px-3 bg-white">
      <v-app-bar-nav-icon
        variant="text"
        @click="rail = !rail"
        class="d-md-none"
      />

      <v-app-bar-title class="font-weight-bold text-subtitle-1 text-md-h6 text-slate-800">
        <div class="d-flex align-center">
          <v-btn
            v-if="isReportDetail"
            icon="mdi-arrow-left"
            variant="text"
            size="small"
            class="me-1 text-slate-600"
            to="/reports"
            :title="t('reports.availableReports')"
          />
          <v-icon start color="primary" size="22">
            {{ currentIcon }}
          </v-icon>
          <template v-if="isReportDetail">
            <router-link to="/reports" class="text-decoration-none text-slate-500 hover-underline me-2">
              {{ t('header.reportsTitle') }}
            </router-link>
            <span class="text-slate-400 me-2">/</span>
            <span class="text-slate-900">{{ reportDetailTitle }}</span>
          </template>
          <template v-else>
            <span>{{ currentTitle }}</span>
          </template>
          <v-chip
            v-if="route.path === '/components'"
            size="small"
            color="primary"
            variant="flat"
            class="ms-2 font-weight-bold"
          >
            {{ componentsStore.totalComponents }} {{ t('common.items') }}
          </v-chip>
          <v-chip
            v-else-if="route.path === '/shopping-list'"
            size="small"
            color="primary"
            variant="flat"
            class="ms-2 font-weight-bold font-mono"
          >
            {{ shoppingListStore.count }} {{ t('common.items') }}
          </v-chip>
        </div>
      </v-app-bar-title>

      <v-spacer />
    </v-app-bar>

    <!-- Main Content Area -->
    <v-main class="bg-background">
      <v-container fluid class="pa-4 pa-md-6" style="max-width: 1600px;">
        <router-view />
      </v-container>
    </v-main>

    <!-- Global Package Details Modal -->
    <PackageDetailsDialog />

    <!-- Global Media Upload Modal -->
    <MediaUploadDialog v-model="showUploadDialog" />
  </v-app>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from './services/api';
import { useComponentsStore } from './stores/components';
import { useShoppingListStore } from './stores/shoppingList';
import { useCurrencyStore } from './stores/currency';
import PackageDetailsDialog from './components/PackageDetailsDialog.vue';
import MediaUploadDialog from './components/MediaUploadDialog.vue';

const route = useRoute();
const { t } = useI18n();
const componentsStore = useComponentsStore();
const shoppingListStore = useShoppingListStore();
const currencyStore = useCurrencyStore();

const drawer = ref(true);
const rail = ref(false);
const showUploadDialog = ref(false);

const isReportDetail = computed(() => {
  return route.path === '/reports/production' || route.path === '/reports/purchases';
});

const reportDetailTitle = computed(() => {
  if (route.path === '/reports/production') {
    return t('reports.productionReport');
  }
  if (route.path === '/reports/purchases') {
    return t('reports.purchasesReport');
  }
  return '';
});

const currentTitle = computed(() => {
  if (route.path.startsWith('/projects')) {
    return t('header.projectsTitle');
  }
  if (route.path === '/reports/production') {
    return t('reports.productionReport');
  }
  if (route.path === '/reports/purchases') {
    return t('reports.purchasesReport');
  }
  switch (route.path) {
    case '/components':
      return t('header.componentsTitle');
    case '/shopping-list':
      return t('header.shoppingListTitle');
    case '/reports':
      return t('header.reportsTitle');
    case '/settings':
      return t('header.settingsTitle');
    case '/release-notes':
      return `${t('header.releaseNotesTitle')} (v0.3.0)`;
    default:
      return t('common.appName');
  }
});

const currentIcon = computed(() => {
  if (route.path.startsWith('/projects')) {
    return 'mdi-folder-cog-outline';
  }
  if (route.path === '/reports/production') {
    return 'mdi-factory';
  }
  if (route.path === '/reports/purchases') {
    return 'mdi-cart-arrow-down';
  }
  switch (route.path) {
    case '/components':
      return 'mdi-memory';
    case '/shopping-list':
      return 'mdi-cart-outline';
    case '/reports':
      return 'mdi-chart-box-outline';
    case '/settings':
      return 'mdi-cog-outline';
    case '/release-notes':
      return 'mdi-tag-outline';
    default:
      return 'mdi-chip';
  }
});

watch(() => route.path, () => {
  shoppingListStore.refreshCount();
});

onMounted(() => {
  shoppingListStore.refreshCount();
  currencyStore.loadCurrencies();
});
</script>

<style scoped>
.brand-item :deep(.v-list-item-title) {
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: -0.01em;
}

.nav-menu :deep(.v-list-item--active) {
  background-color: rgb(var(--v-theme-primary)) !important;
  color: #ffffff !important;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(29, 78, 216, 0.25);
}

.nav-menu :deep(.v-list-item--active .v-icon) {
  color: #ffffff !important;
}

.nav-menu :deep(.v-list-item--active .v-list-item-title) {
  color: #ffffff !important;
  font-weight: 600;
}
</style>
