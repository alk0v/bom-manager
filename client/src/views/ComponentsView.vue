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
              :placeholder="t('components.searchPlaceholder')"
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
              :label="t('common.category')"
              :placeholder="t('components.allCategories')"
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
                :label="t('common.package')"
                :placeholder="t('components.allPackages')"
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

        <!-- Row 2: Project, Stock Status, Pin Range, and Filter Summary/Reset -->
        <v-row dense align="center" class="mt-1">
          <v-col cols="12" sm="6" md="3">
            <v-autocomplete
              v-model="selectedProject"
              :items="projects"
              item-title="projectName"
              item-value="id"
              :label="t('nav.projects')"
              :placeholder="t('common.all')"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              rounded="lg"
              @update:model-value="onFilterChange"
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="stockStatus"
              :items="stockStatusOptions"
              item-title="title"
              item-value="value"
              :label="t('components.stockFilter')"
              :placeholder="t('common.all')"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              rounded="lg"
              @update:model-value="onFilterChange"
            >
              <template #selection="{ item }">
                <div class="d-flex align-center gap-1" v-if="item?.raw">
                  <v-icon size="14" :color="item.raw.color" class="me-1">{{ item.raw.icon }}</v-icon>
                  <span class="text-body-2">{{ item.raw.title }}</span>
                </div>
              </template>
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :title="item.raw.title">
                  <template #prepend>
                    <v-icon size="16" :color="item.raw.color" class="me-2">{{ item.raw.icon }}</v-icon>
                  </template>
                </v-list-item>
              </template>
            </v-select>
          </v-col>

          <v-col cols="12" sm="6" md="2">
            <div class="d-flex align-center gap-1">
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

          <v-col cols="12" sm="6" md="4" class="d-flex align-center justify-end gap-2 flex-wrap">
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
              {{ t('common.reset') }}
            </v-btn>

            <v-btn
              icon="mdi-refresh"
              size="small"
              variant="outlined"
              :loading="loading"
              @click="fetchComponents"
              :title="t('components.refreshTooltip')"
            />

            <v-btn
              variant="outlined"
              color="primary"
              size="small"
              prepend-icon="mdi-file-delimited-outline"
              class="font-weight-bold"
              @click="showImportDialog = true"
              :title="t('components.importCsvTooltip')"
            >
              {{ t('components.importCsv') }}
            </v-btn>

            <v-btn
              v-if="selectedCount > 0"
              color="primary"
              variant="tonal"
              size="small"
              prepend-icon="mdi-table-edit"
              class="font-weight-bold"
              @click="openBulkEditDialog"
            >
              {{ t('components.bulkEdit') }} ({{ selectedCount }})
            </v-btn>

            <v-btn
              color="primary"
              variant="flat"
              size="small"
              prepend-icon="mdi-plus"
              class="font-weight-bold"
              @click="openCreateComponent"
            >
              {{ t('components.newComponent') }}
            </v-btn>
          </v-col>
        </v-row>

        <!-- Row 3: Category Specifications / Attributes Dynamic Filter (When category with custom fields is selected) -->
        <v-expand-transition>
          <div v-if="activeCategoryFields.length > 0" class="mt-3">
            <div class="bg-slate-50 border border-slate-200 rounded-lg pa-3">
              <!-- Specs Filter Header Bar -->
              <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-2.5 pb-2 border-b border-slate-200">
                <div class="d-flex align-center gap-2">
                  <div class="rounded-md bg-blue-50 text-primary pa-1 d-flex align-center justify-center border border-blue-100">
                    <v-icon size="16" color="primary">mdi-tune-vertical</v-icon>
                  </div>
                  <span class="text-caption font-weight-bold text-slate-800 text-uppercase tracking-wider">
                    {{ t('components.advancedSpecsFilter') }}
                  </span>
                  <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                    {{ activeCategoryName }}
                  </v-chip>
                  <v-chip v-if="activeSpecFilterCount > 0" size="x-small" color="primary" variant="flat" class="font-weight-bold">
                    {{ activeSpecFilterCount }} {{ activeSpecFilterCount === 1 ? 'active' : 'active' }}
                  </v-chip>
                </div>

                <v-btn
                  v-if="hasActiveSpecFilters"
                  size="x-small"
                  variant="text"
                  color="error"
                  prepend-icon="mdi-filter-off-outline"
                  class="text-none font-weight-bold"
                  @click="resetSpecFilters"
                >
                  {{ t('common.reset') }}
                </v-btn>
              </div>

              <!-- Specs Filter Controls Grid -->
              <v-row dense align="center">
                <v-col
                  v-for="field in activeCategoryFields"
                  :key="field.id"
                  cols="12"
                  sm="6"
                  md="4"
                  lg="3"
                >
                  <!-- Number Range / Min-Max Filter -->
                  <div v-if="field.fieldType === 'number'" class="d-flex align-center gap-1">
                    <v-text-field
                      v-model="customFilters[field.id].min"
                      :label="`${field.fieldLabel} (${t('components.specMin')})`"
                      :suffix="field.unit || undefined"
                      type="number"
                      step="any"
                      density="compact"
                      variant="outlined"
                      bg-color="white"
                      hide-details
                      clearable
                      rounded="lg"
                      class="font-mono"
                      @update:model-value="debounceFetch"
                    />
                    <span class="text-caption text-disabled font-weight-bold px-0-5">—</span>
                    <v-text-field
                      v-model="customFilters[field.id].max"
                      :label="`${field.fieldLabel} (${t('components.specMax')})`"
                      :suffix="field.unit || undefined"
                      type="number"
                      step="any"
                      density="compact"
                      variant="outlined"
                      bg-color="white"
                      hide-details
                      clearable
                      rounded="lg"
                      class="font-mono"
                      @update:model-value="debounceFetch"
                    />
                  </div>

                  <!-- Select Filter -->
                  <v-select
                    v-else-if="field.fieldType === 'select'"
                    v-model="customFilters[field.id].value"
                    :items="parseFieldOptions(field.options)"
                    :label="field.fieldLabel"
                    :suffix="field.unit || undefined"
                    density="compact"
                    variant="outlined"
                    bg-color="white"
                    hide-details
                    clearable
                    rounded="lg"
                    @update:model-value="onFilterChange"
                  />

                  <!-- Text Filter -->
                  <v-text-field
                    v-else
                    v-model="customFilters[field.id].value"
                    :label="field.fieldLabel"
                    :suffix="field.unit || undefined"
                    density="compact"
                    variant="outlined"
                    bg-color="white"
                    hide-details
                    clearable
                    rounded="lg"
                    @update:model-value="debounceFetch"
                  />
                </v-col>
              </v-row>
            </div>
          </div>
        </v-expand-transition>
      </div>

      <v-divider />

      <!-- Bulk Selection Bar -->
      <v-slide-y-transition>
        <div v-if="selectedCount > 0" class="bg-blue-50 border-b px-5 py-3 d-flex align-center justify-space-between flex-wrap gap-3" style="min-height: 54px;">
          <div class="d-flex align-center gap-3">
            <v-chip color="primary" variant="flat" size="small" class="font-weight-bold px-3">
              {{ t('components.selectedCount', { count: selectedCount }) }}
            </v-chip>
            <span class="text-body-2 text-slate-800 font-weight-medium">
              {{ t('components.bulkActionsPrompt') }}
            </span>
          </div>
          <div class="d-flex align-center gap-2">
            <v-btn
              color="primary"
              variant="flat"
              size="small"
              prepend-icon="mdi-table-edit"
              class="font-weight-bold px-4"
              @click="openBulkEditDialog"
            >
              {{ t('components.bulkEdit') }}
            </v-btn>
            <v-btn
              size="small"
              variant="outlined"
              color="slate-600"
              class="font-weight-medium"
              @click="clearSelection"
            >
              {{ t('components.deselectAll') }}
            </v-btn>
          </div>
        </div>
      </v-slide-y-transition>

      <!-- Components Table -->
      <v-table density="comfortable" hover class="components-table">
        <thead>
          <tr>
            <th class="text-center font-weight-bold" style="width: 44px;">
              <v-checkbox-btn
                :model-value="isAllSelected"
                :indeterminate="isSomeSelected && !isAllSelected"
                color="primary"
                density="compact"
                @update:model-value="toggleSelectAll"
                :title="isAllSelected ? t('components.deselectAll') : t('components.selectAll')"
              />
            </th>
            <th class="text-left font-weight-bold" style="width: 50px;">Photo</th>
            <th class="text-left font-weight-bold">{{ t('components.colPart') }}</th>
            <th class="text-left font-weight-bold">{{ t('components.colCategory') }}</th>
            <th class="text-left font-weight-bold">{{ t('components.colPackage') }}</th>
            <th class="text-left font-weight-bold">{{ t('common.description') }}</th>
            <th class="text-center font-weight-bold" style="width: 100px;">{{ t('components.colStock') }}</th>
            <th class="text-center font-weight-bold" style="width: 100px;">Min</th>
            <th class="text-left font-weight-bold" style="width: 175px;">{{ t('common.actions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="c in components"
            :key="c.ID"
            :class="{
              'row-shortage': !c.qty || c.qty <= 0,
              'row-low-stock': c.qty > 0 && c.minQty > 0 && c.qty <= c.minQty,
              'bg-blue-50': isComponentSelected(c.ID)
            }"
          >
            <!-- Selection Checkbox -->
            <td class="text-center" @click.stop>
              <v-checkbox-btn
                :model-value="isComponentSelected(c.ID)"
                color="primary"
                density="compact"
                @update:model-value="toggleComponentSelection(c)"
              />
            </td>

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
              <div class="font-mono font-weight-bold text-body-2 text-primary cursor-pointer hover-underline" @click="viewDetails(c)">
                {{ c.component }}
              </div>
              <div class="d-flex align-center gap-1 text-caption font-mono" v-if="c.marking || c.datasheetURL">
                <span v-if="c.marking" class="text-disabled">
                  Marking: {{ c.marking }}
                </span>
                <!-- PDF Datasheet Icon after marking -->
                <v-btn
                  v-if="c.datasheetURL"
                  icon="mdi-file-pdf-box"
                  size="x-small"
                  density="compact"
                  color="red-darken-1"
                  variant="text"
                  title="View Datasheet"
                  :href="getDatasheetUrl(c.datasheetURL)"
                  target="_blank"
                  class="ms-0"
                  style="width: 22px; height: 22px;"
                  @click.stop
                />
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
              <div class="text-body-2 text-truncate text-slate-700" style="max-width: 320px;" :title="c.description || c.shortDescription">
                {{ c.shortDescription?.trim() || '—' }}
              </div>
              <div v-if="c.customFields && c.customFields.length > 0" class="d-flex align-center gap-1 flex-wrap mt-1">
                <v-chip
                  v-for="spec in c.customFields.slice(0, 3)"
                  :key="spec.fieldId"
                  size="x-small"
                  variant="tonal"
                  color="primary"
                  class="font-mono text-caption font-weight-bold px-1-5"
                  style="height: 20px; font-size: 11px;"
                  :title="`${spec.fieldLabel}: ${spec.fieldValue}${spec.unit ? ' ' + spec.unit : ''}`"
                >
                  <span class="text-slate-600 me-0-5">{{ spec.fieldLabel }}:</span>
                  {{ spec.fieldValue }}<span v-if="spec.unit" class="text-slate-500 ms-0-5">{{ spec.unit }}</span>
                </v-chip>
                <span v-if="c.customFields.length > 3" class="text-caption text-disabled font-mono" style="font-size: 10px;">
                  +{{ c.customFields.length - 3 }}
                </span>
              </div>
            </td>

            <!-- Stock Quantity (Editable) -->
            <td class="text-center">
              <div class="d-inline-flex align-center justify-center">
                <v-text-field
                  :model-value="c.qty ?? 0"
                  type="number"
                  min="0"
                  density="compact"
                  variant="outlined"
                  hide-details
                  :class="[
                    'stock-qty-input font-mono font-weight-bold',
                    (!c.qty || c.qty <= 0) ? 'stock-absent' : (c.minQty > 0 && c.qty <= c.minQty ? 'stock-low' : 'stock-ok')
                  ]"
                  style="width: 72px;"
                  title="Current on-hand stock (click to edit)"
                  @change="onStockQtyChange(c, $event.target.value)"
                  @keydown.enter="$event.target.blur()"
                />
              </div>
            </td>

            <!-- Min Acceptable Quantity (Editable) -->
            <td class="text-center">
              <div class="d-inline-flex align-center justify-center">
                <v-text-field
                  :model-value="c.minQty ?? 0"
                  type="number"
                  min="0"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="min-qty-input font-mono"
                  style="width: 72px;"
                  title="Minimal acceptable quantity (0 = unconstrained)"
                  @change="onMinQtyChange(c, $event.target.value)"
                  @keydown.enter="$event.target.blur()"
                />
              </div>
            </td>

            <!-- Actions -->
            <td class="text-left text-no-wrap">
              <!-- Add to Shopping List -->
              <v-btn
                icon="mdi-cart-plus"
                size="small"
                color="amber-darken-3"
                variant="text"
                :title="t('components.quickAddToBasket')"
                @click="addToShoppingList(c)"
              />

              <!-- Buy Component -->
              <v-btn
                icon="mdi-cash-check"
                size="small"
                color="primary"
                variant="text"
                :title="t('components.buyComponent')"
                @click="openDirectPurchase(c)"
              />

              <!-- Edit Component -->
              <v-btn
                icon="mdi-pencil-outline"
                size="small"
                color="slate-700"
                variant="text"
                :title="t('components.editComponent')"
                @click="openEditComponent(c)"
              />

              <!-- Clone Component -->
              <v-btn
                icon="mdi-content-copy"
                size="small"
                color="slate-700"
                variant="text"
                :title="t('components.cloneComponent')"
                @click="openCloneComponent(c)"
              />

              <!-- Delete Component -->
              <v-btn
                icon="mdi-delete-outline"
                size="small"
                color="error"
                variant="text"
                :title="t('components.deleteComponent')"
                @click="openDeleteDialog(c)"
              />
            </td>
          </tr>

          <tr v-if="components.length === 0 && !loading">
            <td colspan="9" class="text-center py-8 text-disabled">
              <v-icon size="40" class="mb-2">mdi-memory-off</v-icon>
              <div>{{ t('components.noComponentsMatching') }}</div>
            </td>
          </tr>

          <tr v-if="loading">
            <td colspan="9" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
            </td>
          </tr>
        </tbody>
      </v-table>

      <!-- Pagination Footer -->
      <v-divider />
      <div class="pa-3 d-flex align-center justify-space-between bg-surface">
        <span class="text-caption text-disabled">
          {{ t('common.showingOf', { count: components.length, total: totalComponents, item: t('nav.components').toLowerCase() }) }}
        </span>
        <div class="d-flex align-center gap-2">
          <v-btn
            size="small"
            variant="outlined"
            :disabled="offset === 0 || loading"
            @click="prevPage"
          >
            {{ t('common.prev') }}
          </v-btn>
          <span class="text-caption font-mono px-2">{{ t('common.page') }} {{ currentPage }}</span>
          <v-btn
            size="small"
            variant="outlined"
            :disabled="offset + limit >= totalComponents || loading"
            @click="nextPage"
          >
            {{ t('common.next') }}
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- COMPONENT DETAILS DIALOG (Re-used ComponentDetailsDialog) -->
    <ComponentDetailsDialog
      v-model="showDetailsDialog"
      :component="selectedComponent"
      @purchased="fetchComponents"
      @deleted="onComponentDeleted"
      @updated="fetchComponents"
    />

    <!-- CREATE / EDIT / CLONE / BULK COMPONENT DIALOG -->
    <CreateComponentDialog
      v-model="showCreateDialog"
      :is-edit="isEditMode"
      :is-clone="isCloneMode"
      :is-bulk-edit="isBulkEditMode"
      :bulk-components="selectedComponentsList"
      :component="selectedComponentForEdit"
      :categories="categories"
      :packages="packages"
      @created="handleComponentCreated"
      @updated="handleComponentUpdated"
      @saved="handleComponentSaved"
      @catalog-updated="onCatalogUpdated"
    />

    <!-- DIRECT PURCHASE CONFIRMATION DIALOG -->
    <PurchaseConfirmDialog
      v-model="showDirectPurchaseDialog"
      :item="directPurchaseItem"
      @purchased="handleDirectPurchased"
      @notify="notify"
    />

    <!-- DELETE COMPONENT DIALOG (WITH PROJECT USAGE WARNING) -->
    <DeleteComponentDialog
      v-model="showDeleteDialog"
      :component="componentToDelete"
      @deleted="onComponentDeleted"
    />

    <!-- IMPORT COMPONENTS FROM CSV DIALOG -->
    <ImportComponentsDialog
      v-model="showImportDialog"
      :categories="categories"
      :packages="packages"
      @imported="handleImportedComponents"
      @catalog-updated="onCatalogUpdated"
      @notify="notify"
    />

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api, { resolveMediaUrl } from '../services/api';

const { t } = useI18n();
import MediaImage from '../components/MediaImage.vue';
import PackageLink from '../components/PackageLink.vue';
import CreateComponentDialog from '../components/CreateComponentDialog.vue';
import ComponentDetailsDialog from '../components/ComponentDetailsDialog.vue';
import PurchaseConfirmDialog from '../components/PurchaseConfirmDialog.vue';
import DeleteComponentDialog from '../components/DeleteComponentDialog.vue';
import ImportComponentsDialog from '../components/ImportComponentsDialog.vue';
import { useComponentsStore } from '../stores/components';

const componentsStore = useComponentsStore();

const components = ref([]);
const categories = ref([]);
const packages = ref([]);
const projects = ref([]);
const totalComponents = ref(0);

const showCreateDialog = ref(false);
const isEditMode = ref(false);
const isCloneMode = ref(false);
const isBulkEditMode = ref(false);
const selectedComponentForEdit = ref(null);
const selectedComponentIds = ref(new Set());
const showDeleteDialog = ref(false);
const showImportDialog = ref(false);
const componentToDelete = ref(null);
const loading = ref(false);

const selectedCount = computed(() => selectedComponentIds.value.size);

const isAllSelected = computed(() => {
  if (components.value.length === 0) return false;
  return components.value.every(c => selectedComponentIds.value.has(c.ID));
});

const isSomeSelected = computed(() => {
  return components.value.some(c => selectedComponentIds.value.has(c.ID));
});

const isComponentSelected = (id) => {
  return selectedComponentIds.value.has(id);
};

const toggleComponentSelection = (component) => {
  const newSet = new Set(selectedComponentIds.value);
  if (newSet.has(component.ID)) {
    newSet.delete(component.ID);
  } else {
    newSet.add(component.ID);
  }
  selectedComponentIds.value = newSet;
};

const toggleSelectAll = () => {
  const newSet = new Set(selectedComponentIds.value);
  if (isAllSelected.value) {
    components.value.forEach(c => newSet.delete(c.ID));
  } else {
    components.value.forEach(c => newSet.add(c.ID));
  }
  selectedComponentIds.value = newSet;
};

const clearSelection = () => {
  selectedComponentIds.value = new Set();
};

const selectedComponentsList = computed(() => {
  return components.value.filter(c => selectedComponentIds.value.has(c.ID));
});

const openBulkEditDialog = () => {
  if (selectedCount.value === 0) return;
  isEditMode.value = false;
  isCloneMode.value = false;
  isBulkEditMode.value = true;
  selectedComponentForEdit.value = null;
  showCreateDialog.value = true;
};

const handleComponentSaved = (info) => {
  if (info?.isBulk) {
    notify(t('components.bulkUpdateSuccess', { count: info.count || selectedCount.value }));
    clearSelection();
  }
  fetchComponents();
};

// Filter states
const search = ref('');
const selectedCategories = ref([]);
const selectedPackages = ref([]);
const packageMountType = ref('all'); // 'all' | 'smd' | 'tht'
const selectedProject = ref(null);
const stockStatus = ref('');
const minPins = ref(null);
const maxPins = ref(null);
const customFilters = ref({});
const activeCategoryFields = ref([]);

const parseFieldOptions = (optionsStr) => {
  if (!optionsStr) return [];
  return String(optionsStr).split(',').map(s => s.trim()).filter(Boolean);
};

const activeCategoryName = computed(() => {
  if (selectedCategories.value.length === 1) {
    const cat = categories.value.find(c => c.ID === selectedCategories.value[0]);
    return cat ? cat.category : '';
  }
  return '';
});

const hasActiveSpecFilters = computed(() => {
  for (const val of Object.values(customFilters.value)) {
    if (!val) continue;
    if (typeof val === 'object') {
      if ((val.min !== undefined && val.min !== null && val.min !== '') ||
          (val.max !== undefined && val.max !== null && val.max !== '') ||
          (val.value !== undefined && val.value !== null && val.value !== '')) {
        return true;
      }
    } else if (String(val).trim() !== '') {
      return true;
    }
  }
  return false;
});

const activeSpecFilterCount = computed(() => {
  let count = 0;
  for (const val of Object.values(customFilters.value)) {
    if (!val) continue;
    if (typeof val === 'object') {
      if ((val.min !== undefined && val.min !== null && val.min !== '') ||
          (val.max !== undefined && val.max !== null && val.max !== '')) {
        count++;
      } else if (val.value !== undefined && val.value !== null && val.value !== '') {
        count++;
      }
    } else if (String(val).trim() !== '') {
      count++;
    }
  }
  return count;
});

const resetSpecFilters = () => {
  for (const field of activeCategoryFields.value) {
    customFilters.value[field.id] = { min: '', max: '', value: '' };
  }
  onFilterChange();
};

watch(() => selectedCategories.value, async (newCatIds) => {
  if (newCatIds && newCatIds.length === 1) {
    const catId = newCatIds[0];
    const cat = categories.value.find(c => c.ID === catId);
    if (cat && Array.isArray(cat.customFields) && cat.customFields.length > 0) {
      activeCategoryFields.value = cat.customFields;
    } else {
      try {
        const fields = await api.getCategoryFields(catId);
        activeCategoryFields.value = fields || [];
      } catch (err) {
        activeCategoryFields.value = [];
      }
    }
    for (const f of activeCategoryFields.value) {
      if (!customFilters.value[f.id]) {
        customFilters.value[f.id] = { min: '', max: '', value: '' };
      }
    }
  } else {
    activeCategoryFields.value = [];
    customFilters.value = {};
  }
});

const stockStatusOptions = computed(() => [
  { title: t('components.stockAbsent'), value: 'absent', icon: 'mdi-alert-circle', color: 'error' },
  { title: t('components.stockAbsentOrLow'), value: 'absent_or_low', icon: 'mdi-alert', color: 'deep-orange' },
  { title: t('components.stockLow'), value: 'low', icon: 'mdi-alert-outline', color: 'orange-darken-2' },
  { title: t('components.stockInStock'), value: 'in_stock', icon: 'mdi-check-circle-outline', color: 'success' },
]);

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
const showDirectPurchaseDialog = ref(false);
const directPurchaseItem = ref(null);

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  if (typeof text === 'object' && text !== null) {
    snackbar.value = { show: true, text: text.text || '', color: text.color || 'success' };
  } else {
    snackbar.value = { show: true, text, color };
  }
};

const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1);

const activeFilterCount = computed(() => {
  let count = 0;
  if (search.value && search.value.trim()) count++;
  if (selectedCategories.value && selectedCategories.value.length > 0) count++;
  if (selectedPackages.value && selectedPackages.value.length > 0) count++;
  if (packageMountType.value !== 'all') count++;
  if (selectedProject.value !== null && selectedProject.value !== undefined && selectedProject.value !== '') count++;
  if (stockStatus.value) count++;
  if (minPins.value !== null && minPins.value !== undefined && minPins.value !== '') count++;
  if (maxPins.value !== null && maxPins.value !== undefined && maxPins.value !== '') count++;
  if (hasActiveSpecFilters.value) count++;
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
  stockStatus.value = '';
  minPins.value = null;
  maxPins.value = null;
  customFilters.value = {};
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
      projectId: selectedProject.value || undefined,
      stockStatus: stockStatus.value || undefined,
      isSmd: packageMountType.value === 'smd' ? 1 : (packageMountType.value === 'tht' ? 0 : undefined),
      minPins: minPins.value,
      maxPins: maxPins.value,
      customFilters: hasActiveSpecFilters.value ? JSON.stringify(customFilters.value) : undefined,
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

const onStockQtyChange = async (c, newVal) => {
  const parsed = parseInt(newVal, 10);
  const targetVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
  if (targetVal === (c.qty ?? 0)) return;
  const oldVal = c.qty ?? 0;
  c.qty = targetVal;
  try {
    await api.updateComponentQty(c.ID, targetVal);
    notify(`Updated stock for ${c.component} to ${targetVal} pcs`);
  } catch (err) {
    c.qty = oldVal;
    notify('Failed to update stock: ' + err.message, 'error');
  }
};

const onMinQtyChange = async (c, newVal) => {
  const parsed = parseInt(newVal, 10);
  const targetVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
  if (targetVal === (c.minQty ?? 0)) return;
  const oldVal = c.minQty ?? 0;
  c.minQty = targetVal;
  try {
    await api.updateComponentMinQty(c.ID, targetVal);
    notify(`Updated min qty for ${c.component} to ${targetVal}`);
  } catch (err) {
    c.minQty = oldVal;
    notify('Failed to update min qty: ' + err.message, 'error');
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

const viewDetails = (c) => {
  selectedComponent.value = c;
  showDetailsDialog.value = true;
};

const addToShoppingList = async (c) => {
  try {
    await api.addToShoppingList({ componentId: c.ID, qty: 5 });
    notify(`Added 5 pcs of ${c.component} to shopping list!`);
  } catch (err) {
    notify('Failed to add to shopping list: ' + err.message, 'error');
  }
};

const openDirectPurchase = (c) => {
  directPurchaseItem.value = {
    isComponentDirect: true,
    componentId: c.ID,
    componentName: c.component,
    packageName: c.package,
    quantity: c.minQty && c.minQty > (c.qty || 0) ? (c.minQty - (c.qty || 0)) : 10,
    latestPrice: null
  };
  showDirectPurchaseDialog.value = true;
};

const handleDirectPurchased = (result) => {
  notify(`Purchase recorded: ${result.qty} pcs added to orders`);
  fetchComponents();
};

const getDatasheetUrl = (url) => {
  return resolveMediaUrl('datasheet', url);
};

const openDeleteDialog = (c) => {
  componentToDelete.value = c;
  showDeleteDialog.value = true;
};

const onComponentDeleted = ({ id, component }) => {
  notify(`Component "${component}" deleted successfully`);
  if (selectedComponent.value && (selectedComponent.value.ID === id || selectedComponent.value.id === id)) {
    showDetailsDialog.value = false;
  }
  fetchComponents();
};

const openCreateComponent = () => {
  isEditMode.value = false;
  isCloneMode.value = false;
  isBulkEditMode.value = false;
  selectedComponentForEdit.value = null;
  showCreateDialog.value = true;
};

const openEditComponent = (c) => {
  isEditMode.value = true;
  isCloneMode.value = false;
  isBulkEditMode.value = false;
  selectedComponentForEdit.value = c;
  showCreateDialog.value = true;
};

const openCloneComponent = (c) => {
  isEditMode.value = false;
  isCloneMode.value = true;
  isBulkEditMode.value = false;
  selectedComponentForEdit.value = c;
  showCreateDialog.value = true;
};

const handleComponentCreated = (newComp) => {
  notify(`Component "${newComp.component}" added to catalog!`);
  fetchComponents();
};

const handleComponentUpdated = (updatedComp) => {
  notify(`Component "${updatedComp.component}" updated successfully!`);
  fetchComponents();
};

const loadMeta = async () => {
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
};

const onCatalogUpdated = async () => {
  await loadMeta();
  fetchComponents();
};

const handleImportedComponents = async () => {
  await loadMeta();
  fetchComponents();
};

onMounted(async () => {
  await loadMeta();
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

.row-low-stock {
  background-color: #FFF7ED !important;
  border-left: 3px solid #F97316 !important;
}

.row-low-stock:hover {
  background-color: #FFEDD5 !important;
}

.text-low-stock {
  color: #EA580C !important;
}

.stock-qty-input :deep(input),
.min-qty-input :deep(input) {
  text-align: center;
  padding-top: 4px;
  padding-bottom: 4px;
  font-size: 0.85rem;
}

.stock-absent :deep(input) {
  color: #DC2626 !important;
  font-weight: 700;
}

.stock-low :deep(input) {
  color: #EA580C !important;
  font-weight: 700;
}

.stock-ok :deep(input) {
  color: #1E293B !important;
  font-weight: 700;
}

.hover-underline:hover {
  text-decoration: underline;
}
</style>
