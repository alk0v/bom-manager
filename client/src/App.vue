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
        title="BOM Manager"
        subtitle="Electronic Parts & Projects"
        class="py-4 brand-item text-primary"
        @click="rail = !rail"
      >
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
      <v-list density="comfortable" nav class="mt-2">
        <v-list-item
          prepend-icon="mdi-folder-cog-outline"
          title="Projects"
          value="projects"
          to="/projects"
          active-class="primary text-white"
          rounded="lg"
        />

        <v-list-item
          prepend-icon="mdi-memory"
          title="Components"
          value="components"
          to="/components"
          active-class="primary text-white"
          rounded="lg"
        />

        <v-list-item
          prepend-icon="mdi-cart-outline"
          title="Shopping List"
          value="shopping-list"
          to="/shopping-list"
          active-class="primary text-white"
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
      </v-list>
    </v-navigation-drawer>

    <!-- Top App Bar -->
    <v-app-bar flat border="b" density="comfortable" class="px-3 bg-white">
      <v-app-bar-nav-icon
        variant="text"
        @click="rail = !rail"
        class="d-md-none"
      />

      <v-app-bar-title class="font-weight-bold text-subtitle-1 text-md-h6 text-slate-800">
        <v-icon start color="primary" size="22">
          {{ currentIcon }}
        </v-icon>
        {{ currentTitle }}
      </v-app-bar-title>

      <v-spacer />

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
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from './services/api';

const route = useRoute();

const drawer = ref(true);
const rail = ref(false);
const shoppingCount = ref(0);

const currentTitle = computed(() => {
  if (route.path.startsWith('/projects')) {
    return 'Projects & Bill of Materials';
  }
  switch (route.path) {
    case '/components':
      return 'Components Catalog';
    case '/shopping-list':
      return 'Procurement Shopping List';
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
</style>
