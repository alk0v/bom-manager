<template>
  <v-dialog
    :model-value="modelValue"
    width="92vw"
    max-width="1100px"
    scrollable
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-0 border bg-white overflow-hidden d-flex flex-column" style="max-height: 88vh;">
      <!-- Dialog Header -->
      <v-card-title class="bg-slate-50 py-3 px-5 border-b d-flex align-center justify-space-between flex-shrink-0">
        <div class="d-flex align-center gap-2">
          <v-icon color="primary" size="22">mdi-shape-plus</v-icon>
          <span class="text-subtitle-1 font-weight-bold text-slate-900">
            Manage Categories & Packages
          </span>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>

      <!-- Tabs Navigation -->
      <div class="bg-slate-50 px-5 border-b flex-shrink-0">
        <v-tabs v-model="activeTab" color="primary" density="comfortable">
          <v-tab value="categories" class="font-weight-bold text-body-2 text-none">
            <v-icon start size="18">mdi-shape-outline</v-icon>
            Categories ({{ categoriesList.length }})
          </v-tab>
          <v-tab value="packages" class="font-weight-bold text-body-2 text-none">
            <v-icon start size="18">mdi-package-variant-closed</v-icon>
            Packages & Footprints ({{ packagesList.length }})
          </v-tab>
        </v-tabs>
      </div>

      <!-- Tab Content Area -->
      <v-card-text class="pa-0 flex-grow-1 overflow-y-auto">
        <v-window v-model="activeTab" class="h-100">
          <!-- ========================================== -->
          <!-- TAB 1: CATEGORIES                          -->
          <!-- ========================================== -->
          <v-window-item value="categories" class="pa-5">
            <!-- Toolbar: Search & Add Category -->
            <div class="d-flex flex-wrap align-center justify-space-between gap-3 mb-4">
              <v-text-field
                v-model="categorySearch"
                density="compact"
                variant="outlined"
                placeholder="Search categories..."
                prepend-inner-icon="mdi-magnify"
                hide-details
                clearable
                rounded="lg"
                style="max-width: 360px; width: 100%;"
              />

              <v-btn
                color="primary"
                variant="flat"
                size="small"
                prepend-icon="mdi-plus"
                class="font-weight-bold"
                @click="openCategoryForm()"
              >
                Add Category
              </v-btn>
            </div>

            <!-- Categories Table -->
            <v-table density="comfortable" hover class="border rounded bg-white data-table">
              <thead>
                <tr class="bg-slate-50 text-caption font-weight-bold">
                  <th style="width: 70px;" class="text-center font-weight-bold">ID</th>
                  <th class="text-left font-weight-bold">Category Name</th>
                  <th class="text-center font-weight-bold" style="width: 160px;">Components</th>
                  <th class="text-right font-weight-bold" style="width: 120px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cat in filteredCategories" :key="cat.ID">
                  <td class="text-center font-mono text-caption text-disabled">
                    #{{ cat.ID }}
                  </td>
                  <td>
                    <div class="font-weight-bold text-body-2 text-slate-900">
                      {{ cat.category }}
                    </div>
                  </td>
                  <td class="text-center">
                    <v-chip
                      size="x-small"
                      :color="cat.componentCount > 0 ? 'primary' : 'default'"
                      :variant="cat.componentCount > 0 ? 'tonal' : 'outlined'"
                      class="font-mono font-weight-medium"
                    >
                      {{ cat.componentCount }} {{ cat.componentCount === 1 ? 'part' : 'parts' }}
                    </v-chip>
                  </td>
                  <td class="text-right">
                    <v-btn
                      icon="mdi-pencil-outline"
                      size="small"
                      variant="text"
                      color="slate-600"
                      title="Edit Category Name"
                      @click="openCategoryForm(cat)"
                    />
                    <v-btn
                      icon="mdi-delete-outline"
                      size="small"
                      variant="text"
                      color="error"
                      title="Delete Category"
                      @click="confirmDeleteCategory(cat)"
                    />
                  </td>
                </tr>

                <tr v-if="filteredCategories.length === 0 && !loading">
                  <td colspan="4" class="text-center py-8 text-disabled">
                    <v-icon size="40" class="mb-2">mdi-shape-outline</v-icon>
                    <div>No categories found matching your search.</div>
                  </td>
                </tr>

                <tr v-if="loading">
                  <td colspan="4" class="text-center py-8">
                    <v-progress-circular indeterminate color="primary" />
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>

          <!-- ========================================== -->
          <!-- TAB 2: PACKAGES & FOOTPRINTS               -->
          <!-- ========================================== -->
          <v-window-item value="packages" class="pa-5">
            <!-- Toolbar: Search, Mount Toggle & Add Package -->
            <div class="d-flex flex-wrap align-center justify-space-between gap-3 mb-4">
              <div class="d-flex align-center gap-3 flex-grow-1" style="max-width: 600px;">
                <v-text-field
                  v-model="packageSearch"
                  density="compact"
                  variant="outlined"
                  placeholder="Search package footprint name..."
                  prepend-inner-icon="mdi-magnify"
                  hide-details
                  clearable
                  rounded="lg"
                  class="flex-grow-1"
                />

                <v-btn-toggle
                  v-model="packageMountFilter"
                  mandatory
                  density="compact"
                  variant="outlined"
                  rounded="lg"
                  color="primary"
                  class="flex-shrink-0"
                  style="height: 40px;"
                >
                  <v-btn value="all" size="small" class="px-2 text-caption">All</v-btn>
                  <v-btn value="smd" size="small" class="px-2 text-caption">SMD</v-btn>
                  <v-btn value="tht" size="small" class="px-2 text-caption">THT</v-btn>
                </v-btn-toggle>
              </div>

              <v-btn
                color="primary"
                variant="flat"
                size="small"
                prepend-icon="mdi-plus"
                class="font-weight-bold"
                @click="openPackageForm()"
              >
                Add Package
              </v-btn>
            </div>

            <!-- Packages Table -->
            <v-table density="comfortable" hover class="border rounded bg-white data-table">
              <thead>
                <tr class="bg-slate-50 text-caption font-weight-bold">
                  <th style="width: 50px;">Drawing</th>
                  <th class="text-left font-weight-bold">Package Name</th>
                  <th class="text-center font-weight-bold" style="width: 110px;">Mount Type</th>
                  <th class="text-center font-weight-bold" style="width: 90px;">Pins</th>
                  <th class="text-center font-weight-bold" style="width: 140px;">Components</th>
                  <th class="text-right font-weight-bold" style="width: 120px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pkg in filteredPackages" :key="pkg.ID">
                  <!-- Drawing thumbnail -->
                  <td class="py-2">
                    <v-avatar rounded size="36" class="border bg-slate-50">
                      <MediaImage
                        type="package"
                        :src="pkg.drawingURL"
                        height="36px"
                        width="36px"
                      />
                    </v-avatar>
                  </td>

                  <!-- Package Name -->
                  <td>
                    <div class="font-mono font-weight-bold text-body-2 text-slate-900">
                      {{ pkg.package }}
                    </div>
                  </td>

                  <!-- Mount Type -->
                  <td class="text-center">
                    <v-chip
                      size="x-small"
                      :color="pkg.isSmd ? 'secondary' : 'default'"
                      variant="flat"
                      class="font-weight-bold"
                    >
                      {{ pkg.isSmd ? 'SMD' : 'Through-Hole' }}
                    </v-chip>
                  </td>

                  <!-- Pins -->
                  <td class="text-center font-mono text-body-2 text-slate-800">
                    {{ pkg.pinQuantity != null ? pkg.pinQuantity : '—' }}
                  </td>

                  <!-- Components Count -->
                  <td class="text-center">
                    <v-chip
                      size="x-small"
                      :color="pkg.componentCount > 0 ? 'primary' : 'default'"
                      :variant="pkg.componentCount > 0 ? 'tonal' : 'outlined'"
                      class="font-mono font-weight-medium"
                    >
                      {{ pkg.componentCount }} {{ pkg.componentCount === 1 ? 'part' : 'parts' }}
                    </v-chip>
                  </td>

                  <!-- Actions -->
                  <td class="text-right">
                    <v-btn
                      icon="mdi-pencil-outline"
                      size="small"
                      variant="text"
                      color="slate-600"
                      title="Edit Package Footprint"
                      @click="openPackageForm(pkg)"
                    />
                    <v-btn
                      icon="mdi-delete-outline"
                      size="small"
                      variant="text"
                      color="error"
                      title="Delete Package"
                      @click="confirmDeletePackage(pkg)"
                    />
                  </td>
                </tr>

                <tr v-if="filteredPackages.length === 0 && !loading">
                  <td colspan="6" class="text-center py-8 text-disabled">
                    <v-icon size="40" class="mb-2">mdi-package-variant-closed</v-icon>
                    <div>No packages found matching your search.</div>
                  </td>
                </tr>

                <tr v-if="loading">
                  <td colspan="6" class="text-center py-8">
                    <v-progress-circular indeterminate color="primary" />
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-divider />

      <!-- Dialog Footer -->
      <v-card-actions class="pa-3 px-5 bg-slate-50 d-flex align-center justify-space-between flex-shrink-0">
        <div class="text-caption text-disabled">
          Categories and footprints are shared globally across all catalog components.
        </div>
        <v-btn variant="flat" color="slate-200" @click="close">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- ========================================== -->
    <!-- MODAL: ADD / EDIT CATEGORY                 -->
    <!-- ========================================== -->
    <v-dialog v-model="showCategoryDialog" max-width="450px" persistent>
      <v-card class="rounded-0 border bg-white">
        <v-card-title class="bg-slate-50 py-3 px-4 border-b font-weight-bold text-subtitle-1">
          {{ editingCategory ? 'Edit Category' : 'New Category' }}
        </v-card-title>
        <v-card-text class="pa-4">
          <v-text-field
            v-model="categoryForm.category"
            label="Category Name *"
            placeholder="e.g. Capacitors, Microcontrollers, Relays"
            variant="outlined"
            density="comfortable"
            autofocus
            :error-messages="categoryError"
            @keydown.enter="saveCategory"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="text" size="small" @click="showCategoryDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold px-4"
            :loading="saving"
            @click="saveCategory"
          >
            Save Category
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ========================================== -->
    <!-- MODAL: ADD / EDIT PACKAGE                  -->
    <!-- ========================================== -->
    <v-dialog v-model="showPackageDialog" max-width="520px" persistent>
      <v-card class="rounded-0 border bg-white">
        <v-card-title class="bg-slate-50 py-3 px-4 border-b font-weight-bold text-subtitle-1">
          {{ editingPackage ? 'Edit Package Footprint' : 'New Package Footprint' }}
        </v-card-title>
        <v-card-text class="pa-4">
          <v-text-field
            v-model="packageForm.package"
            label="Package / Footprint Name *"
            placeholder="e.g. SOIC-8, LQFP-48, 0805, TO-220"
            variant="outlined"
            density="comfortable"
            class="font-mono mb-3"
            autofocus
            :error-messages="packageError"
          />

          <!-- Pin Count & Mount Technology Row (Aligned Heights and Baseline) -->
          <v-row dense class="mb-3" align="center">
            <v-col cols="12" sm="5">
              <v-text-field
                v-model.number="packageForm.pinQuantity"
                label="Pin / Pad Count"
                type="number"
                min="1"
                placeholder="e.g. 8"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" sm="7">
              <div class="border rounded-lg d-flex align-center px-3 justify-space-between bg-slate-50" style="height: 48px;">
                <span class="text-caption font-weight-medium text-slate-600 me-2 flex-shrink-0">
                  Mount:
                </span>
                <v-btn-toggle
                  v-model="packageForm.isSmd"
                  mandatory
                  density="compact"
                  variant="flat"
                  rounded="md"
                  color="primary"
                  class="flex-grow-1 bg-white border"
                  style="height: 34px;"
                >
                  <v-btn :value="1" size="small" class="flex-grow-1 text-caption font-weight-bold">
                    SMD
                  </v-btn>
                  <v-btn :value="0" size="small" class="flex-grow-1 text-caption font-weight-bold">
                    Through-Hole
                  </v-btn>
                </v-btn-toggle>
              </div>
            </v-col>
          </v-row>

          <!-- Drawing / Pinout Image with Live Upload and Preview -->
          <div class="d-flex align-center gap-3 mb-1">
            <v-avatar
              v-if="packageForm.drawingURL"
              rounded="lg"
              size="48"
              class="border bg-slate-50 flex-shrink-0"
            >
              <MediaImage
                type="package"
                :src="packageForm.drawingURL"
                height="48px"
                width="48px"
              />
            </v-avatar>

            <v-text-field
              v-model="packageForm.drawingURL"
              label="Drawing / Pinout Image (Filename or URL)"
              placeholder="e.g. soic8.png or https://..."
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-image-outline"
              clearable
              hide-details="auto"
              class="flex-grow-1"
            >
              <template #append-inner>
                <v-btn
                  variant="tonal"
                  color="primary"
                  size="small"
                  class="text-caption font-weight-bold my-n1"
                  prepend-icon="mdi-upload"
                  :loading="uploadingDrawing"
                  @click.stop="drawingInputRef?.click()"
                  title="Upload drawing image to media/packages/"
                >
                  Upload
                </v-btn>
              </template>
            </v-text-field>
            <input
              ref="drawingInputRef"
              type="file"
              accept="image/*"
              style="display: none;"
              @change="handleDrawingUpload"
            />
          </div>
          <div class="text-caption text-slate-500 mt-1 ms-1">
            Stored in <code>media/packages/</code> or specify an external image URL.
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="text" size="small" @click="showPackageDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold px-4"
            :loading="saving"
            @click="savePackage"
          >
            Save Package
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Notification Snackbar inside Dialog -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.text }}
    </v-snackbar>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import api from '../services/api';
import MediaImage from './MediaImage.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  initialTab: {
    type: String,
    default: 'categories'
  }
});

const emit = defineEmits(['update:modelValue', 'updated']);

const activeTab = ref(props.initialTab);
const loading = ref(false);
const saving = ref(false);

const categoriesList = ref([]);
const packagesList = ref([]);

const categorySearch = ref('');
const packageSearch = ref('');
const packageMountFilter = ref('all');

const showCategoryDialog = ref(false);
const editingCategory = ref(null);
const categoryForm = ref({ category: '' });
const categoryError = ref('');

const showPackageDialog = ref(false);
const editingPackage = ref(null);
const packageForm = ref({
  package: '',
  pinQuantity: null,
  isSmd: 1,
  drawingURL: ''
});
const packageError = ref('');

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

// Load data
const loadCatalogData = async () => {
  loading.value = true;
  try {
    const [cats, pkgs] = await Promise.all([
      api.getCategories(),
      api.getPackages()
    ]);
    categoriesList.value = cats || [];
    packagesList.value = pkgs || [];
  } catch (err) {
    console.error('Failed to load catalog data:', err);
    notify('Failed to load catalog data: ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    activeTab.value = props.initialTab || 'categories';
    loadCatalogData();
  }
});

const close = () => {
  emit('update:modelValue', false);
};

// Filtered Lists
const filteredCategories = computed(() => {
  if (!categorySearch.value.trim()) return categoriesList.value;
  const q = categorySearch.value.toLowerCase().trim();
  return categoriesList.value.filter(c => c.category.toLowerCase().includes(q));
});

const filteredPackages = computed(() => {
  let list = packagesList.value;
  if (packageMountFilter.value === 'smd') {
    list = list.filter(p => !!p.isSmd);
  } else if (packageMountFilter.value === 'tht') {
    list = list.filter(p => !p.isSmd);
  }
  if (!packageSearch.value.trim()) return list;
  const q = packageSearch.value.toLowerCase().trim();
  return list.filter(p => p.package.toLowerCase().includes(q));
});

// Category Actions
const openCategoryForm = (cat = null) => {
  editingCategory.value = cat;
  categoryForm.value = {
    category: cat ? cat.category : ''
  };
  categoryError.value = '';
  showCategoryDialog.value = true;
};

const saveCategory = async () => {
  const name = categoryForm.value.category.trim();
  if (!name) {
    categoryError.value = 'Category name is required';
    return;
  }
  saving.value = true;
  categoryError.value = '';
  try {
    if (editingCategory.value) {
      await api.updateCategory(editingCategory.value.ID, { category: name });
      notify(`Updated category "${name}"`);
    } else {
      await api.createCategory({ category: name });
      notify(`Created category "${name}"`);
    }
    showCategoryDialog.value = false;
    await loadCatalogData();
    emit('updated');
  } catch (err) {
    categoryError.value = err.response?.data?.error || err.message;
  } finally {
    saving.value = false;
  }
};

const confirmDeleteCategory = async (cat) => {
  if (cat.componentCount > 0) {
    alert(`Cannot delete category "${cat.category}".\n\nThere are currently ${cat.componentCount} component(s) assigned to this category. Please reassign those components to another category first.`);
    return;
  }
  if (confirm(`Are you sure you want to delete category "${cat.category}"?`)) {
    try {
      await api.deleteCategory(cat.ID);
      notify(`Category "${cat.category}" deleted`);
      await loadCatalogData();
      emit('updated');
    } catch (err) {
      notify('Failed to delete category: ' + (err.response?.data?.error || err.message), 'error');
    }
  }
};

// Package Actions
const uploadingDrawing = ref(false);
const drawingInputRef = ref(null);

const handleDrawingUpload = async (event) => {
  const file = event.target?.files?.[0];
  if (!file) return;

  uploadingDrawing.value = true;
  try {
    const res = await api.uploadMedia('packages', file);
    packageForm.value.drawingURL = res.filename;
    notify(`Drawing uploaded: ${res.filename}`);
  } catch (err) {
    console.error('Failed to upload package drawing:', err);
    notify('Failed to upload drawing: ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    uploadingDrawing.value = false;
    if (event.target) event.target.value = '';
  }
};

const openPackageForm = (pkg = null) => {
  editingPackage.value = pkg;
  packageForm.value = {
    package: pkg ? pkg.package : '',
    pinQuantity: pkg && pkg.pinQuantity != null ? pkg.pinQuantity : null,
    isSmd: pkg ? (pkg.isSmd ? 1 : 0) : 1,
    drawingURL: pkg && pkg.drawingURL ? pkg.drawingURL : ''
  };
  packageError.value = '';
  showPackageDialog.value = true;
};

const savePackage = async () => {
  const name = packageForm.value.package.trim();
  if (!name) {
    packageError.value = 'Package name is required';
    return;
  }
  saving.value = true;
  packageError.value = '';
  try {
    const payload = {
      package: name,
      pinQuantity: packageForm.value.pinQuantity,
      isSmd: packageForm.value.isSmd,
      drawingURL: packageForm.value.drawingURL.trim()
    };
    if (editingPackage.value) {
      await api.updatePackage(editingPackage.value.ID, payload);
      notify(`Updated package "${name}"`);
    } else {
      await api.createPackage(payload);
      notify(`Created package "${name}"`);
    }
    showPackageDialog.value = false;
    await loadCatalogData();
    emit('updated');
  } catch (err) {
    packageError.value = err.response?.data?.error || err.message;
  } finally {
    saving.value = false;
  }
};

const confirmDeletePackage = async (pkg) => {
  if (pkg.componentCount > 0) {
    alert(`Cannot delete package "${pkg.package}".\n\nThere are currently ${pkg.componentCount} component(s) using this package footprint. Please reassign those components to another package first.`);
    return;
  }
  if (confirm(`Are you sure you want to delete package footprint "${pkg.package}"?`)) {
    try {
      await api.deletePackage(pkg.ID);
      notify(`Package "${pkg.package}" deleted`);
      await loadCatalogData();
      emit('updated');
    } catch (err) {
      notify('Failed to delete package: ' + (err.response?.data?.error || err.message), 'error');
    }
  }
};
</script>

<style scoped>
.data-table :deep(th) {
  background-color: #F8FAFC !important;
  color: #475569;
}
</style>
