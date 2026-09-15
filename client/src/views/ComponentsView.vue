<template>
  <div class="components-view">
    <v-card elevation="1" class="rounded-0 border overflow-hidden">
      <!-- Search & Filters -->
      <div class="pa-4 bg-surface border-b">
        <!-- Row 1: Search, Categories (multi-choice), Packages (multi-choice) -->
        <v-row dense class="mb-1">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              placeholder="Search part name, marking, description..."
              density="compact"
              variant="outlined"
              hide-details
              clearable
              rounded="lg"
              @update:model-value="debounceFetch"
            />
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <v-autocomplete
              v-model="selectedCategories"
              :items="categories"
              item-title="category"
              item-value="ID"
              label="Categories (multi-choice)"
              placeholder="All categories"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              multiple
              chips
              closable-chips
              rounded="lg"
              @update:model-value="onFilterChange"
            />
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <div class="d-flex align-center" style="gap: 12px;">
              <v-autocomplete
                v-model="selectedPackages"
                :items="filteredPackagesList"
                item-title="package"
                item-value="ID"
                :label="packageMountType === 'all' ? 'Packages (multi-choice)' : `Packages (${packageMountType.toUpperCase()})`"
                placeholder="All packages"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                multiple
                chips
                closable-chips
                rounded="lg"
                class="flex-grow-1"
                @update:model-value="onFilterChange"
              >
                <template #item="{ props, item }">
                  <v-list-item v-bind="props" :title="item.raw.package">
                    <template #append>
                      <v-chip
                        size="x-small"
                        :color="item.raw.isSmd ? 'secondary' : 'default'"
                        variant="flat"
                        class="ms-2 font-weight-bold"
                      >
                        {{ item.raw.isSmd ? 'SMD' : 'THT' }}
                      </v-chip>
                    </template>
                  </v-list-item>
                </template>
              </v-autocomplete>

              <v-btn-toggle
                v-model="packageMountType"
                mandatory
                density="compact"
                variant="outlined"
                rounded="lg"
                color="primary"
                class="flex-shrink-0"
                style="height: 40px;"
                @update:model-value="onMountTypeChange"
              >
                <v-btn value="all" size="small" class="px-2 text-caption">All</v-btn>
                <v-btn value="smd" size="small" class="px-2 text-caption">SMD</v-btn>
                <v-btn value="tht" size="small" class="px-2 text-caption">THT</v-btn>
              </v-btn-toggle>
            </div>
          </v-col>
        </v-row>

        <!-- Row 2: Project, Pin Range, and Filter Summary/Reset -->
        <v-row dense align="center" class="mt-1">
          <v-col cols="12" sm="6" md="4">
            <v-autocomplete
              v-model="selectedProject"
              :items="projects"
              item-title="projectName"
              item-value="id"
              label="Used in Project"
              placeholder="Filter components in project BOM"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              rounded="lg"
              @update:model-value="onFilterChange"
            />
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <div class="d-flex align-center gap-2">
              <v-text-field
                v-model.number="minPins"
                label="Min Pins"
                type="number"
                min="0"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                rounded="lg"
                @update:model-value="debounceFetch"
              />
              <span class="text-caption text-disabled font-weight-bold px-1">—</span>
              <v-text-field
                v-model.number="maxPins"
                label="Max Pins"
                type="number"
                min="0"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                rounded="lg"
                @update:model-value="debounceFetch"
              />
            </div>
          </v-col>

          <v-col cols="12" md="4" class="d-flex align-center justify-end gap-2">
            <v-chip
              v-if="activeFilterCount > 0"
              color="primary"
              variant="tonal"
              size="small"
              class="font-weight-medium"
            >
              {{ activeFilterCount }} active {{ activeFilterCount === 1 ? 'filter' : 'filters' }}
            </v-chip>

            <v-btn
              v-if="activeFilterCount > 0"
              size="small"
              variant="text"
              color="error"
              prepend-icon="mdi-filter-off-outline"
              @click="resetFilters"
            >
              Reset Filters
            </v-btn>

            <v-btn
              icon="mdi-refresh"
              size="small"
              variant="outlined"
              :loading="loading"
              @click="fetchComponents"
              title="Refresh components"
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
          <tr v-for="c in components" :key="c.ID" :class="{ 'row-shortage': !c.qty || c.qty <= 0 }">
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
              <span v-if="c.package" class="font-mono text-body-2 font-weight-medium text-slate-800">
                {{ c.package }}
              </span>
              <span v-else class="text-disabled text-caption">—</span>
            </td>

            <!-- Description -->
            <td>
              <div class="text-body-2 text-truncate text-slate-700" style="max-width: 320px;" :title="c.description || c.shortDescription">
                {{ c.description || c.shortDescription || '—' }}
              </div>
            </td>

            <!-- Stock Quantity -->
            <td class="text-center font-mono font-weight-bold text-body-2">
              <span :class="c.qty > 0 ? 'text-slate-800' : 'text-error font-weight-bold'">
                {{ c.qty ?? 0 }}
              </span>
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
    <v-dialog v-model="showDetailsDialog" max-width="850">
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
                <v-chip size="x-small" variant="tonal" color="blue-grey" class="ms-1 font-mono" v-if="selectedComponent.pinQuantity">
                  {{ selectedComponent.pinQuantity }} pins
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
import { useComponentsStore } from '../stores/components';

const componentsStore = useComponentsStore();

const components = ref([]);
const categories = ref([]);
const packages = ref([]);
const projects = ref([]);
const totalComponents = ref(0);
const loading = ref(false);

// Filter states
const search = ref('');
const selectedCategories = ref([]);
const selectedPackages = ref([]);
const packageMountType = ref('all'); // 'all' | 'smd' | 'tht'
const selectedProject = ref(null);
const minPins = ref(null);
const maxPins = ref(null);

const filteredPackagesList = computed(() => {
  if (packageMountType.value === 'smd') {
    return packages.value.filter(p => p.isSmd === 1);
  }
  if (packageMountType.value === 'tht') {
    return packages.value.filter(p => p.isSmd === 0);
  }
  return packages.value;
});

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

const activeFilterCount = computed(() => {
  let count = 0;
  if (search.value && search.value.trim()) count++;
  if (selectedCategories.value && selectedCategories.value.length > 0) count++;
  if (selectedPackages.value && selectedPackages.value.length > 0) count++;
  if (packageMountType.value !== 'all') count++;
  if (selectedProject.value !== null && selectedProject.value !== undefined) count++;
  if (minPins.value !== null && minPins.value !== undefined && minPins.value !== '') count++;
  if (maxPins.value !== null && maxPins.value !== undefined && maxPins.value !== '') count++;
  return count;
});

let debounceTimer = null;
const debounceFetch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    offset.value = 0;
    fetchComponents();
  }, 350);
};

const onFilterChange = () => {
  offset.value = 0;
  fetchComponents();
};

const onMountTypeChange = () => {
  if (packageMountType.value !== 'all') {
    const validIds = new Set(filteredPackagesList.value.map(p => p.ID));
    selectedPackages.value = selectedPackages.value.filter(id => validIds.has(id));
  }
  offset.value = 0;
  fetchComponents();
};

const resetFilters = () => {
  search.value = '';
  selectedCategories.value = [];
  selectedPackages.value = [];
  packageMountType.value = 'all';
  selectedProject.value = null;
  minPins.value = null;
  maxPins.value = null;
  offset.value = 0;
  fetchComponents();
};

const fetchComponents = async () => {
  loading.value = true;
  try {
    const res = await api.getComponents({
      search: search.value,
      categoryIds: selectedCategories.value,
      packageIds: selectedPackages.value,
      projectId: selectedProject.value,
      isSmd: packageMountType.value === 'smd' ? 1 : (packageMountType.value === 'tht' ? 0 : undefined),
      minPins: minPins.value,
      maxPins: maxPins.value,
      limit: limit.value,
      offset: offset.value
    });
    components.value = res.items;
    totalComponents.value = res.total;
    componentsStore.setTotalComponents(res.total);
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
    const [cats, pkgs, projs] = await Promise.all([
      api.getCategories(),
      api.getPackages(),
      api.getProjects()
    ]);
    categories.value = cats || [];
    packages.value = pkgs || [];
    projects.value = projs || [];
  } catch (err) {
    console.error('Failed to load metadata for filters:', err);
  }
  fetchComponents();
});
</script>

<style scoped>
.components-table :deep(th) {
  background-color: var(--v-theme-surface-variant);
  color: #0F172A !important;
  font-weight: 700 !important;
  font-size: 0.82rem;
}

.row-shortage {
  background-color: #FEF2F2 !important;
}

.row-shortage:hover {
  background-color: #FEE2E2 !important;
}
</style>
