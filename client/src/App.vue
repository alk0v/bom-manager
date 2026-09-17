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
              0.1.3
            </v-chip>
          </div>
        </template>
        <template #subtitle>
          <span class="text-caption text-slate-500">Electronic Parts & Projects</span>
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
          title="Projects"
          value="projects"
          to="/projects"
          active-class="bg-primary text-white"
          rounded="lg"
        />

        <v-list-item
          prepend-icon="mdi-memory"
          title="Components"
          value="components"
          to="/components"
          active-class="bg-primary text-white"
          rounded="lg"
        />

        <v-list-item
          prepend-icon="mdi-cart-outline"
          title="Shopping List"
          value="shopping-list"
          to="/shopping-list"
          active-class="bg-primary text-white"
          rounded="lg"
        >
          <template #append v-if="shoppingCount > 0">
            <v-badge
              color="amber-darken-3"
              :content="shoppingCount"
              inline
            />
          </template>
        </v-list-item>

        <v-list-item
          prepend-icon="mdi-text-box-search-outline"
          title="Release Notes"
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
              0.1.3
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
            <span class="d-flex align-center font-mono">
              <v-icon size="14" color="primary" class="me-1">mdi-tag-outline</v-icon>
              Version 0.1.3
            </span>
            <span class="text-primary font-weight-medium">Notes &rarr;</span>
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
          <v-icon start color="primary" size="22">
            {{ currentIcon }}
          </v-icon>
          <span>{{ currentTitle }}</span>
          <v-chip
            v-if="route.path === '/components'"
            size="small"
            color="primary"
            variant="flat"
            class="ms-2 font-weight-bold"
          >
            {{ componentsStore.totalComponents }} items
          </v-chip>
        </div>
      </v-app-bar-title>

      <v-spacer />

      <v-btn
        variant="tonal"
        color="primary"
        size="small"
        prepend-icon="mdi-cloud-upload-outline"
        class="me-3 font-weight-medium"
        @click="showUploadDialog = true"
      >
        Upload Media
      </v-btn>

      <v-chip
        size="small"
        color="primary"
        variant="tonal"
        class="font-mono me-2"
      >
        <v-icon start size="14">mdi-database-check</v-icon>
        MySQL (retool_bommanager)
      </v-chip>
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
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from './services/api';
import { useComponentsStore } from './stores/components';
import PackageDetailsDialog from './components/PackageDetailsDialog.vue';
import MediaUploadDialog from './components/MediaUploadDialog.vue';

const route = useRoute();
const componentsStore = useComponentsStore();

const drawer = ref(true);
const rail = ref(false);
const shoppingCount = ref(0);
const showUploadDialog = ref(false);

const currentTitle = computed(() => {
  if (route.path.startsWith('/projects')) {
    return 'Projects & Bill of Materials';
  }
  switch (route.path) {
    case '/components':
      return 'Components Catalog';
    case '/shopping-list':
      return 'Procurement Shopping List';
    case '/release-notes':
      return 'Release Notes (v0.1.3)';
    default:
      return 'BOM Manager';
  }
});

const currentIcon = computed(() => {
  if (route.path.startsWith('/projects')) {
    return 'mdi-folder-cog-outline';
  }
  switch (route.path) {
    case '/components':
      return 'mdi-memory';
    case '/shopping-list':
      return 'mdi-cart-outline';
    case '/release-notes':
      return 'mdi-tag-outline';
    default:
      return 'mdi-chip';
  }
});

const loadShoppingCount = async () => {
  try {
    const list = await api.getShoppingList();
    shoppingCount.value = list.length;
  } catch (err) {
    console.error('Failed to load shopping list count:', err);
  }
};

onMounted(() => {
  loadShoppingCount();
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
