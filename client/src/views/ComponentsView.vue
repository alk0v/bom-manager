<template>
  <div class="components-view">
    <v-card elevation="1" class="rounded-0 border overflow-hidden">
      <v-card-item class="bg-surface-variant py-3 px-4">
        <div class="d-flex flex-wrap align-center justify-space-between gap-3">
          <div class="d-flex align-center">
            <v-icon color="primary" class="me-2">mdi-memory</v-icon>
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                Components Catalog
                <v-chip size="x-small" color="primary" class="ms-1 font-weight-bold">
                  {{ totalComponents }} items
                </v-chip>
              </div>
              <div class="text-caption text-disabled">
                Electronic components, ICs, passives, datasheets, and stock levels
              </div>
            </div>
          </div>

          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="text"
            :loading="loading"
            @click="fetchComponents"
          />
        </div>
      </v-card-item>

      <v-divider />

      <!-- Search & Filters -->
      <div class="pa-4 bg-surface">
        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              placeholder="Search component name, marking, description..."
              density="compact"
              variant="outlined"
              hide-details
              clearable
              rounded="lg"
              @update:model-value="debounceFetch"
            />
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <v-select
              v-model="selectedCategory"
              :items="categories"
              item-title="category"
              item-value="ID"
              label="Filter by Category"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              rounded="lg"
              @update:model-value="fetchComponents"
            />
          </v-col>
        </v-row>
      </div>

      <v-divider />

      <!-- Components Table -->
      <v-table density="comfortable" hover class="components-table">
        <thead>
          <tr>
            <th class="text-left font-weight-bold" style="width: 50px;">Photo</th>
            <th class="text-left font-weight-bold">Part Name / Marking</th>
            <th class="text-left font-weight-bold">Category</th>
            <th class="text-left font-weight-bold">Package</th>
            <th class="text-left font-weight-bold">Description</th>
            <th class="text-center font-weight-bold">In Stock</th>
            <th class="text-right font-weight-bold" style="width: 140px;">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="c in components" :key="c.ID">
            <!-- Photo Thumbnail -->
            <td>
              <v-avatar rounded="lg" size="38" class="border">
                <MediaImage
                  type="component"
                  :src="c.photoURL"
                  height="38px"
                  width="38px"
                />
              </v-avatar>
            </td>

            <!-- Name & Marking -->
            <td>
              <div class="font-mono font-weight-bold text-body-2 text-primary cursor-pointer" @click="viewDetails(c)">
                {{ c.component }}
              </div>
              <div class="text-caption text-disabled font-mono" v-if="c.marking">
                Marking: {{ c.marking }}
              </div>
            </td>

            <!-- Category -->
            <td>
              <v-chip size="x-small" variant="tonal" color="info" v-if="c.category">
                {{ c.category }}
              </v-chip>
              <span v-else class="text-disabled text-caption">—</span>
            </td>

            <!-- Package -->
            <td>
              <div v-if="c.package" class="d-flex align-center">
                <span class="font-mono text-caption">{{ c.package }}</span>
                <v-chip
                  size="x-small"
                  :color="c.isSmd ? 'secondary' : 'default'"
                  variant="flat"
                  class="ms-1"
                >
                  {{ c.isSmd ? 'SMD' : 'THT' }}
                </v-chip>
              </div>
              <span v-else class="text-disabled text-caption">—</span>
            </td>

            <!-- Description -->
            <td>
              <div class="text-body-2 text-truncate" style="max-width: 320px;" :title="c.description || c.shortDescription">
                {{ c.description || c.shortDescription || '—' }}
              </div>
            </td>

            <!-- Stock Quantity -->
            <td class="text-center">
              <v-chip
                size="small"
                :color="c.qty > 0 ? 'success' : 'default'"
                variant="flat"
                class="font-mono font-weight-bold"
              >
                {{ c.qty }}
              </v-chip>
            </td>

            <!-- Actions -->
            <td class="text-right">
              <!-- Datasheet Button -->
              <v-btn
                v-if="c.datasheetURL"
                icon="mdi-file-pdf-box"
                size="small"
                color="red-darken-1"
                variant="text"
                title="View Datasheet"
                :href="getDatasheetUrl(c.datasheetURL)"
                target="_blank"
              />

              <!-- Add to Shopping List -->
              <v-btn
                icon="mdi-cart-plus"
                size="small"
                color="amber-darken-3"
                variant="text"
                title="Add to Shopping List"
                @click="addToShoppingList(c)"
              />

              <!-- View Details -->
              <v-btn
                icon="mdi-information-outline"
                size="small"
                variant="text"
                title="Component details"
                @click="viewDetails(c)"
              />
            </td>
          </tr>

          <tr v-if="components.length === 0 && !loading">
            <td colspan="7" class="text-center py-8 text-disabled">
              <v-icon size="40" class="mb-2">mdi-memory-off</v-icon>
              <div>No components found matching your search.</div>
            </td>
          </tr>

          <tr v-if="loading">
            <td colspan="7" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
            </td>
          </tr>
        </tbody>
      </v-table>

      <!-- Pagination Footer -->
      <v-divider />
      <div class="pa-3 d-flex align-center justify-space-between bg-surface">
        <span class="text-caption text-disabled">
          Showing {{ components.length }} of {{ totalComponents }} components
        </span>
        <div class="d-flex align-center gap-2">
          <v-btn
            size="small"
            variant="outlined"
            :disabled="offset === 0 || loading"
            @click="prevPage"
          >
            Previous
          </v-btn>
          <span class="text-caption font-mono px-2">Page {{ currentPage }}</span>
          <v-btn
            size="small"
            variant="outlined"
            :disabled="offset + limit >= totalComponents || loading"
            @click="nextPage"
          >
            Next
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- COMPONENT DETAILS DIALOG -->
    <v-dialog v-model="showDetailsDialog" max-width="650">
      <v-card class="rounded-0 border" v-if="selectedComponent">
        <v-card-title class="bg-surface-variant py-3 px-4 d-flex align-center justify-space-between">
          <div class="font-mono font-weight-bold text-subtitle-1 text-primary">
            {{ selectedComponent.component }}
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showDetailsDialog = false" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12" sm="5" class="d-flex justify-center">
              <MediaImage
                type="component"
                :src="selectedComponent.photoURL"
                height="180px"
                width="100%"
                :cover="false"
              />
            </v-col>
            <v-col cols="12" sm="7">
              <div class="text-caption text-disabled text-uppercase">Category</div>
              <div class="text-body-2 font-weight-medium mb-2">{{ selectedComponent.category || '—' }}</div>

              <div class="text-caption text-disabled text-uppercase">Package / Footprint</div>
              <div class="text-body-2 font-mono mb-2">
                {{ selectedComponent.package || '—' }}
                <v-chip size="x-small" class="ms-1" v-if="selectedComponent.package">
                  {{ selectedComponent.isSmd ? 'SMD' : 'Through-Hole' }}
                </v-chip>
              </div>

              <div class="text-caption text-disabled text-uppercase">Marking</div>
              <div class="text-body-2 font-mono mb-2">{{ selectedComponent.marking || '—' }}</div>

              <div class="text-caption text-disabled text-uppercase">Total Stock Quantity</div>
              <v-chip size="small" color="success" class="font-mono font-weight-bold">
                {{ selectedComponent.qty }} in stock
              </v-chip>
            </v-col>
          </v-row>

          <v-divider class="my-3" />

          <div class="text-caption text-disabled text-uppercase mb-1">Description</div>
          <p class="text-body-2 mb-3">
            {{ selectedComponent.description || selectedComponent.shortDescription || 'No description provided.' }}
          </p>

          <!-- Warehouse allocations -->
          <div v-if="selectedComponent.warehouse && selectedComponent.warehouse.length > 0">
            <div class="text-caption text-disabled text-uppercase mb-1">Warehouse Storage Locations</div>
            <v-chip-group>
              <v-chip
                v-for="w in selectedComponent.warehouse"
                :key="w.id"
                size="small"
                variant="outlined"
              >
                <v-icon start size="14">mdi-archive-outline</v-icon>
                {{ w.storage || 'Box #' + w.storageId }}: {{ w.quantity }} pcs
              </v-chip>
            </v-chip-group>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-3">
          <v-btn
            v-if="selectedComponent.datasheetURL"
            color="red-darken-1"
            variant="text"
            prepend-icon="mdi-file-pdf-box"
            :href="getDatasheetUrl(selectedComponent.datasheetURL)"
            target="_blank"
          >
            Open Datasheet
          </v-btn>
          <v-spacer />
          <v-btn
            color="amber-darken-3"
            variant="tonal"
            prepend-icon="mdi-cart-plus"
            @click="addToShoppingList(selectedComponent)"
          >
            Add to Shopping List
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api, { resolveMediaUrl } from '../services/api';
import MediaImage from '../components/MediaImage.vue';

const components = ref([]);
const categories = ref([]);
const totalComponents = ref(0);
const loading = ref(false);

const search = ref('');
const selectedCategory = ref(null);
const limit = ref(50);
const offset = ref(0);

const selectedComponent = ref(null);
const showDetailsDialog = ref(false);

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1);

let debounceTimer = null;
const debounceFetch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    offset.value = 0;
    fetchComponents();
  }, 350);
};

const fetchComponents = async () => {
  loading.value = true;
  try {
    const res = await api.getComponents({
      search: search.value,
      categoryId: selectedCategory.value,
      limit: limit.value,
      offset: offset.value
    });
    components.value = res.items;
    totalComponents.value = res.total;
  } catch (err) {
    notify('Failed to load components: ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

const prevPage = () => {
  if (offset.value >= limit.value) {
    offset.value -= limit.value;
    fetchComponents();
  }
};

const nextPage = () => {
  if (offset.value + limit.value < totalComponents.value) {
    offset.value += limit.value;
    fetchComponents();
  }
};

const viewDetails = async (c) => {
  try {
    selectedComponent.value = await api.getComponent(c.ID);
    showDetailsDialog.value = true;
  } catch (err) {
    notify('Failed to load component details', 'error');
  }
};

const addToShoppingList = async (c) => {
  try {
    await api.addToShoppingList({ componentId: c.ID, qty: 5 });
    notify(`Added 5 pcs of ${c.component} to shopping list!`);
  } catch (err) {
    notify('Failed to add to shopping list: ' + err.message, 'error');
  }
};

const getDatasheetUrl = (url) => {
  return resolveMediaUrl('datasheet', url);
};

onMounted(async () => {
  try {
    categories.value = await api.getCategories();
  } catch (err) {
    console.error(err);
  }
  fetchComponents();
});
</script>

<style scoped>
.components-table :deep(th) {
  background-color: var(--v-theme-surface-variant);
  font-size: 0.82rem;
}
</style>
