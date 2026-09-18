<template>
  <v-dialog
    :model-value="modelValue"
    width="94vw"
    max-width="1650"
    scrollable
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-0 border bg-white d-flex flex-column" style="max-height: 90vh;">
      <!-- Dialog Header -->
      <v-card-title class="bg-slate-50 py-3 px-4 d-flex align-center justify-space-between border-b flex-shrink-0">
        <div class="d-flex align-center">
          <v-icon :color="cloneModeOnly ? 'indigo' : 'primary'" class="me-2" size="22">{{ cloneModeOnly ? 'mdi-content-copy' : (pickerMode ? 'mdi-database-search-outline' : 'mdi-memory') }}</v-icon>
          <span class="text-subtitle-1 font-weight-bold text-slate-900">
            {{ title || (cloneModeOnly ? 'Find Component to Clone' : (pickerMode ? 'Select Catalog Component' : 'Add Component to BOM')) }}
            <span v-if="projectName" class="text-caption font-weight-regular text-slate-500 ms-1">
              ({{ projectName }})
            </span>
            <span v-else-if="subtitle" class="text-caption font-weight-regular text-slate-500 ms-1">
              ({{ subtitle }})
            </span>
          </span>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>

      <!-- Filter Controls Bar -->
      <div class="pa-3 bg-surface border-b flex-shrink-0">
        <!-- Row 1: Search, Categories, Packages with SMD/THT toggle -->
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

        <!-- Row 2: Pin Range, Active filter indicators, and Reset Filters -->
        <v-row dense align="center" class="mt-1">
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

          <v-col cols="12" sm="6" md="8" class="d-flex align-center justify-end gap-2">
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
              title="Refresh components list"
            />
          </v-col>
        </v-row>
      </div>

      <!-- Scrollable Components Table -->
      <v-card-text class="pa-0 overflow-y-auto" style="flex: 1 1 auto; min-height: 260px;">
        <v-table density="compact" hover class="components-table">
          <thead>
            <tr>
              <th style="width: 40px;"></th>
              <th style="width: 46px;">Photo</th>
              <th class="text-left font-weight-bold">Part Name / Marking</th>
              <th class="text-left font-weight-bold">Category</th>
              <th class="text-left font-weight-bold">Package</th>
              <th class="text-left font-weight-bold">Description</th>
              <th class="text-center font-weight-bold" style="width: 90px;">In Stock</th>
              <th v-if="pickerMode" class="text-center font-weight-bold" style="width: 80px;">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="c in components"
              :key="c.ID"
              :class="{
                'row-shortage': !c.qty || c.qty <= 0,
                'row-selected': selectedComponent?.ID === c.ID
              }"
              class="cursor-pointer"
              @click="selectComponent(c)"
              @dblclick="onRowDblClick(c)"
            >
              <!-- Radio Selection Indicator -->
              <td class="text-center pa-1">
                <v-icon
                  :color="selectedComponent?.ID === c.ID ? 'primary' : 'grey-lighten-1'"
                  size="20"
                >
                  {{ selectedComponent?.ID === c.ID ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
                </v-icon>
              </td>

              <!-- Photo Thumbnail -->
              <td>
                <v-avatar rounded="lg" size="32" class="border">
                  <MediaImage
                    type="component"
                    :src="c.photoURL"
                    height="32px"
                    width="32px"
                  />
                </v-avatar>
              </td>

              <!-- Name & Marking -->
              <td>
                <div
                  class="font-mono font-weight-bold text-body-2 text-primary comp-name-link d-inline-flex align-center gap-1"
                  @click.stop="openDetails(c)"
                  title="Click to view component details"
                >
                  <span class="hover-underline">{{ c.component }}</span>
                  <v-icon size="13" class="opacity-60 info-icon">mdi-information-outline</v-icon>
                </div>
                <div class="text-caption text-disabled font-mono" v-if="c.marking">
                  Mark: {{ c.marking }}
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
                <PackageLink :item="c" />
              </td>

              <!-- Description -->
              <td>
                <div class="text-caption text-truncate text-slate-700" style="max-width: 480px;" :title="c.description || c.shortDescription">
                  {{ c.description || c.shortDescription || '—' }}
                </div>
              </td>

              <!-- Stock Quantity -->
              <td class="text-center font-mono font-weight-bold text-body-2">
                <span :class="c.qty > 0 ? 'text-slate-800' : 'text-error font-weight-bold'">
                  {{ c.qty ?? 0 }}
                </span>
              </td>

              <!-- Action Column in Picker Mode -->
              <td v-if="pickerMode" class="text-center pa-1" @click.stop>
                <v-tooltip :text="cloneModeOnly ? 'Clone this component' : 'Clone this component for mapping'" location="top">
                  <template #activator="{ props: tipProps }">
                    <v-btn
                      v-bind="tipProps"
                      icon="mdi-content-copy"
                      size="x-small"
                      variant="tonal"
                      color="indigo"
                      @click="triggerClone(c)"
                    />
                  </template>
                </v-tooltip>
              </td>
            </tr>

            <tr v-if="components.length === 0 && !loading">
              <td :colspan="pickerMode ? 8 : 7" class="text-center py-8 text-disabled">
                <v-icon size="36" class="mb-2">mdi-memory-off</v-icon>
                <div>No components match your search.</div>
              </td>
            </tr>

            <tr v-if="loading">
              <td :colspan="pickerMode ? 8 : 7" class="text-center py-8">
                <v-progress-circular indeterminate color="primary" size="32" />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>

      <!-- Pagination Sub-footer -->
      <div class="px-3 py-2 d-flex align-center justify-space-between border-t bg-slate-50 flex-shrink-0">
        <span class="text-caption text-slate-500 font-mono">
          Showing {{ components.length }} of {{ totalComponents }} components
        </span>
        <div class="d-flex align-center gap-2">
          <v-btn
            size="x-small"
            variant="outlined"
            :disabled="offset === 0 || loading"
            @click="prevPage"
          >
            Prev
          </v-btn>
          <span class="text-caption font-mono px-1">Page {{ currentPage }}</span>
          <v-btn
            size="x-small"
            variant="outlined"
            :disabled="offset + limit >= totalComponents || loading"
            @click="nextPage"
          >
            Next
          </v-btn>
        </div>
      </div>

      <!-- Bottom Configuration / Add to BOM Bar -->
      <div class="pa-3 bg-white border-t flex-shrink-0">
        <v-slide-y-transition mode="out-in">
          <div v-if="selectedComponent" class="d-flex flex-wrap align-center justify-space-between" style="gap: 20px;">
            <!-- Selected Info Chip -->
            <div class="d-flex align-center flex-wrap" style="gap: 12px; min-width: 280px;">
              <v-chip color="primary" variant="flat" size="default" class="font-mono font-weight-bold">
                <v-icon start size="16">mdi-check-circle</v-icon>
                {{ selectedComponent.component }}
              </v-chip>
              <PackageLink :item="selectedComponent" />
              <v-chip
                size="small"
                variant="outlined"
                class="font-mono font-weight-bold"
                :color="selectedComponent.qty > 0 ? 'success' : 'error'"
              >
                Stock: {{ selectedComponent.qty ?? 0 }}
              </v-chip>
            </div>

            <!-- In Picker Mode: Just Select and Cancel -->
            <div v-if="pickerMode" class="d-flex align-center gap-2">
              <v-btn
                variant="text"
                rounded="lg"
                height="40"
                color="slate-600"
                @click="selectedComponent = null"
              >
                Cancel
              </v-btn>
              <v-btn
                v-if="!cloneModeOnly"
                color="primary"
                variant="flat"
                rounded="lg"
                height="40"
                prepend-icon="mdi-check"
                class="px-5 font-weight-bold"
                @click="confirmPick"
              >
                Select This Component
              </v-btn>
              <v-btn
                color="indigo"
                :variant="cloneModeOnly ? 'flat' : 'tonal'"
                rounded="lg"
                height="40"
                prepend-icon="mdi-content-copy"
                class="px-4 font-weight-bold"
                @click="triggerClone(selectedComponent)"
              >
                {{ cloneModeOnly ? 'Clone This Component' : 'Clone & Map' }}
              </v-btn>
            </div>

            <!-- In Add to BOM Mode: Form Inputs -->
            <div v-else class="d-flex align-center flex-wrap flex-grow-1 justify-end" style="gap: 16px;">
              <v-text-field
                v-model.number="bomForm.quantity"
                label="Required Qty"
                type="number"
                min="1"
                density="compact"
                variant="outlined"
                hide-details
                rounded="lg"
                style="width: 140px;"
              />

              <v-text-field
                v-model="bomForm.comment"
                label="Designators / Notes"
                placeholder="e.g. C1, C2, U1, 10k pull-up"
                density="compact"
                variant="outlined"
                hide-details
                rounded="lg"
                style="min-width: 260px; max-width: 450px;"
                @keyup.enter="submitAdd"
              />

              <v-btn
                color="primary"
                variant="flat"
                rounded="lg"
                height="40"
                prepend-icon="mdi-plus"
                class="px-4 font-weight-bold"
                :loading="submitting"
                :disabled="!bomForm.quantity || bomForm.quantity < 1"
                @click="submitAdd"
              >
                Add to BOM
              </v-btn>

              <v-btn
                variant="text"
                rounded="lg"
                height="40"
                color="slate-600"
                @click="selectedComponent = null"
                title="Deselect component"
              >
                Cancel
              </v-btn>
            </div>
          </div>

          <!-- Empty prompt when no component is selected -->
          <div v-else class="d-flex align-center justify-space-between py-1">
            <span class="text-caption text-slate-500 d-flex align-center">
              <v-icon start size="16" color="primary">mdi-cursor-default-click</v-icon>
              {{ cloneModeOnly
                ? 'Click any row to select a component to clone as a template, or click the clone icon.'
                : (pickerMode
                  ? 'Click any row in the table above to pick a component, or double-click to select immediately.'
                  : 'Click any row in the table above to select a component to add to this BOM.') }}
            </span>
            <v-btn variant="text" size="small" @click="close">
              Close
            </v-btn>
          </div>
        </v-slide-y-transition>
      </div>
    </v-card>

    <!-- Component Details Pop-up Re-used from Components Table -->
    <ComponentDetailsDialog
      v-model="showDetailsDialog"
      :component="detailComponent"
      :show-select-button="true"
      :select-button-text="pickerMode ? 'Pick This Component' : 'Select for BOM'"
      @select="onDetailComponentSelected"
    />
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import api from '../services/api';
import MediaImage from './MediaImage.vue';
import PackageLink from './PackageLink.vue';
import ComponentDetailsDialog from './ComponentDetailsDialog.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  projectId: {
    type: [Number, String],
    default: null
  },
  projectName: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  pickerMode: {
    type: Boolean,
    default: false
  },
  cloneModeOnly: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  initialSearch: {
    type: String,
    default: ''
  },
  initialCategories: {
    type: Array,
    default: () => []
  },
  initialPackages: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'added', 'select', 'clone']);

const components = ref([]);
const categories = ref([]);
const packages = ref([]);
const totalComponents = ref(0);
const loading = ref(false);
const submitting = ref(false);

// Filter states
const search = ref('');
const selectedCategories = ref([]);
const selectedPackages = ref([]);
const packageMountType = ref('all'); // 'all' | 'smd' | 'tht'
const minPins = ref(null);
const maxPins = ref(null);

const limit = ref(25);
const offset = ref(0);

// Selected Component & Form
const selectedComponent = ref(null);
const bomForm = ref({
  quantity: 1,
  comment: ''
});

const filteredPackagesList = computed(() => {
  if (packageMountType.value === 'smd') {
    return packages.value.filter(p => p.isSmd === 1);
  }
  if (packageMountType.value === 'tht') {
    return packages.value.filter(p => p.isSmd === 0);
  }
  return packages.value;
});

const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1);

const activeFilterCount = computed(() => {
  let count = 0;
  if (search.value && search.value.trim()) count++;
  if (selectedCategories.value && selectedCategories.value.length > 0) count++;
  if (selectedPackages.value && selectedPackages.value.length > 0) count++;
  if (packageMountType.value !== 'all') count++;
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
      isSmd: packageMountType.value === 'smd' ? 1 : (packageMountType.value === 'tht' ? 0 : undefined),
      minPins: minPins.value,
      maxPins: maxPins.value,
      limit: limit.value,
      offset: offset.value
    });
    components.value = res.items || [];
    totalComponents.value = res.total || 0;
  } catch (err) {
    console.error('Failed to load components for dialog:', err);
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

const showDetailsDialog = ref(false);
const detailComponent = ref(null);

const openDetails = (c) => {
  detailComponent.value = c;
  selectComponent(c);
  showDetailsDialog.value = true;
};

const onDetailComponentSelected = (c) => {
  selectComponent(c);
  if (props.pickerMode) {
    confirmPick();
  }
};

const selectComponent = (c) => {
  selectedComponent.value = c;
};

const submitAdd = async () => {
  if (!selectedComponent.value || !props.projectId) return;

  submitting.value = true;
  try {
    const result = await api.addComponentToBom(props.projectId, {
      componentId: selectedComponent.value.ID,
      quantity: bomForm.value.quantity || 1,
      comment: bomForm.value.comment || ''
    });

    emit('added', {
      ...result,
      component: selectedComponent.value.component,
      package: selectedComponent.value.package,
      stockQuantity: selectedComponent.value.qty,
      requiredQuantity: bomForm.value.quantity
    });

    // Reset form for next addition or close
    selectedComponent.value = null;
    bomForm.value = { quantity: 1, comment: '' };
    close();
  } catch (err) {
    console.error('Failed to add component to BOM:', err);
  } finally {
    submitting.value = false;
  }
};

const confirmPick = () => {
  if (!selectedComponent.value) return;
  emit('select', selectedComponent.value);
  close();
};

const triggerClone = (c) => {
  if (!c) return;
  emit('clone', c);
  close();
};

const onRowDblClick = (c) => {
  if (props.cloneModeOnly) {
    triggerClone(c);
  } else if (props.pickerMode) {
    selectedComponent.value = c;
    confirmPick();
  }
};

const close = () => {
  emit('update:modelValue', false);
};

// Re-fetch or reset when opened
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    selectedComponent.value = null;
    bomForm.value = { quantity: 1, comment: '' };
    offset.value = 0;
    if (props.pickerMode) {
      search.value = props.initialSearch || '';
      selectedCategories.value = Array.isArray(props.initialCategories) ? [...props.initialCategories] : [];
      selectedPackages.value = Array.isArray(props.initialPackages) ? [...props.initialPackages] : [];
    }
    fetchComponents();
  }
});

onMounted(async () => {
  try {
    const [cats, pkgs] = await Promise.all([
      api.getCategories(),
      api.getPackages()
    ]);
    categories.value = cats || [];
    packages.value = pkgs || [];
  } catch (err) {
    console.error('Failed to load metadata in AddComponentDialog:', err);
  }
});
</script>

<style scoped>
.components-table :deep(th) {
  background-color: var(--v-theme-surface-variant);
  color: #0F172A !important;
  font-weight: 700 !important;
  font-size: 0.82rem;
  position: sticky;
  top: 0;
  z-index: 2;
}

.row-shortage {
  background-color: #FEF2F2 !important;
}

.row-shortage:hover {
  background-color: #FEE2E2 !important;
}

.row-selected {
  background-color: #EFF6FF !important; /* Soft light blue */
}

.row-selected:hover {
  background-color: #DBEAFE !important;
}

.comp-name-link {
  cursor: pointer;
  transition: color 0.15s ease;
}

.comp-name-link:hover {
  color: #1d4ed8 !important;
}

.comp-name-link:hover .hover-underline {
  text-decoration: underline;
}

.comp-name-link:hover .info-icon {
  opacity: 1 !important;
}
</style>
