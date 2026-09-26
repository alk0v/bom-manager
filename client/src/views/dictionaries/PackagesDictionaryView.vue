<template>
  <div class="packages-dictionary-view">
    <!-- Main Packages Card -->
    <v-card elevation="1" class="rounded-0 border bg-white">
      <!-- Toolbar -->
      <div class="pa-4 border-b d-flex flex-wrap align-center justify-space-between gap-3 bg-slate-50">
        <div class="d-flex flex-wrap align-center gap-3 flex-grow-1 flex-sm-grow-0">
          <!-- Search -->
          <v-text-field
            v-model="packageSearch"
            density="compact"
            variant="outlined"
            :placeholder="t('manageCatalogModal.searchPackages')"
            prepend-inner-icon="mdi-magnify"
            hide-details
            clearable
            rounded="lg"
            class="bg-white"
            style="min-width: 240px; max-width: 360px;"
          />

          <!-- Mount Technology Filter -->
          <v-btn-toggle
            v-model="packageMountFilter"
            mandatory
            density="compact"
            variant="outlined"
            color="primary"
            rounded="lg"
            class="bg-white"
          >
            <v-btn value="all" size="small" class="text-caption font-weight-bold">
              {{ t('manageCatalogModal.all') }}
            </v-btn>
            <v-btn value="smd" size="small" class="text-caption font-weight-bold">
              <v-icon start size="14">mdi-chip</v-icon>
              SMD
            </v-btn>
            <v-btn value="tht" size="small" class="text-caption font-weight-bold">
              <v-icon start size="14">mdi-circle-slice-8</v-icon>
              THT
            </v-btn>
          </v-btn-toggle>
        </div>

        <div class="d-flex align-center gap-2">
          <v-chip size="small" variant="tonal" color="primary" class="font-weight-bold font-mono">
            {{ filteredPackages.length }} {{ t('manageCatalogModal.packagesTab', { count: filteredPackages.length }).toLowerCase() }}
          </v-chip>

          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="outlined"
            :loading="loading"
            @click="loadPackages"
            :title="t('common.refresh')"
          />

          <v-btn
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="mdi-plus"
            class="font-weight-bold"
            @click="openPackageForm()"
          >
            {{ t('manageCatalogModal.addPackage') }}
          </v-btn>
        </div>
      </div>

      <!-- Packages Table -->
      <v-table density="comfortable" hover class="data-table">
        <thead>
          <tr class="bg-slate-50 text-caption font-weight-bold">
            <th style="width: 70px;" class="text-center font-weight-bold">ID</th>
            <th style="width: 70px;" class="text-center font-weight-bold">{{ t('manageCatalogModal.drawing') }}</th>
            <th class="text-left font-weight-bold">{{ t('manageCatalogModal.packageFootprintName') }}</th>
            <th class="text-center font-weight-bold" style="width: 140px;">{{ t('manageCatalogModal.mount') }}</th>
            <th class="text-center font-weight-bold" style="width: 130px;">{{ t('manageCatalogModal.pins') }}</th>
            <th class="text-center font-weight-bold" style="width: 140px;">{{ t('manageCatalogModal.componentsCount') }}</th>
            <th class="text-right font-weight-bold" style="width: 120px;">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pkg in filteredPackages" :key="pkg.ID">
            <td class="text-center font-mono text-caption text-slate-500">{{ pkg.ID }}</td>
            <!-- Drawing Icon / Thumbnail -->
            <td class="text-center pa-1">
              <div class="d-flex justify-center align-center">
                <MediaImage
                  :src="pkg.drawingURL"
                  type="packages"
                  :alt="pkg.package"
                  class="rounded border bg-white cursor-pointer"
                  style="width: 38px; height: 38px; object-fit: contain;"
                  icon-size="20px"
                  @click="openPackageForm(pkg)"
                />
              </div>
            </td>
            <!-- Footprint Name -->
            <td>
              <div class="font-mono font-weight-bold text-body-2 text-slate-900 cursor-pointer hover-underline" @click="openPackageForm(pkg)">
                {{ pkg.package }}
              </div>
            </td>
            <!-- Mount Type -->
            <td class="text-center">
              <v-chip
                size="x-small"
                variant="tonal"
                :color="pkg.isSmd ? 'primary' : 'teal'"
                class="font-weight-bold"
              >
                <v-icon start size="14">{{ pkg.isSmd ? 'mdi-chip' : 'mdi-circle-slice-8' }}</v-icon>
                {{ pkg.isSmd ? 'SMD' : 'THT' }}
              </v-chip>
            </td>
            <!-- Pin Count -->
            <td class="text-center font-mono text-body-2 text-slate-800">
              <span v-if="pkg.pinQuantity !== null && pkg.pinQuantity !== undefined" class="font-weight-bold">
                {{ pkg.pinQuantity }}
              </span>
              <span v-else class="text-disabled text-caption">—</span>
            </td>
            <!-- Components Count -->
            <td class="text-center font-mono text-body-2 text-slate-700">
              <v-chip size="x-small" variant="flat" color="slate-100" class="text-slate-800 font-mono">
                {{ pkg.componentCount || 0 }} {{ (pkg.componentCount === 1 ? t('manageCatalogModal.part') : t('manageCatalogModal.parts')) }}
              </v-chip>
            </td>
            <!-- Actions -->
            <td class="text-right">
              <v-btn
                icon="mdi-pencil-outline"
                size="small"
                variant="text"
                color="slate-600"
                @click="openPackageForm(pkg)"
                :title="t('manageCatalogModal.editPackage')"
              />
              <v-btn
                icon="mdi-delete-outline"
                size="small"
                variant="text"
                color="error"
                @click="confirmDeletePackage(pkg)"
                :title="t('common.delete')"
              />
            </td>
          </tr>
          <tr v-if="filteredPackages.length === 0 && !loading">
            <td colspan="7" class="text-center py-8 text-disabled">
              <v-icon size="40" class="mb-2">mdi-package-variant-closed</v-icon>
              <div>{{ t('manageCatalogModal.noPackagesFound') }}</div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- MODAL: ADD / EDIT PACKAGE -->
    <v-dialog v-model="showPackageDialog" max-width="540px" persistent>
      <v-card class="rounded-0 border bg-white">
        <v-card-title class="bg-slate-50 py-3 px-4 border-b font-weight-bold text-subtitle-1 d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-2">
            <v-icon color="primary" size="20">mdi-package-variant-closed</v-icon>
            <span>{{ editingPackage ? t('manageCatalogModal.editPackage') : t('manageCatalogModal.newPackage') }}</span>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showPackageDialog = false" />
        </v-card-title>
        <v-card-text class="pa-4">
          <v-text-field
            v-model="packageForm.package"
            :label="t('manageCatalogModal.packageFootprintName')"
            :placeholder="t('manageCatalogModal.packagePlaceholder')"
            variant="outlined"
            density="comfortable"
            class="font-mono mb-3"
            autofocus
            :error-messages="packageError"
          />

          <!-- Pin Count & Mount Technology Row -->
          <v-row dense class="mb-3" align="center">
            <v-col cols="12" sm="5">
              <v-text-field
                v-model.number="packageForm.pinQuantity"
                :label="t('manageCatalogModal.pinPadCount')"
                :placeholder="t('manageCatalogModal.pinPlaceholder')"
                type="number"
                min="0"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                class="font-mono"
              />
            </v-col>
            <v-col cols="12" sm="7" class="d-flex align-center justify-sm-end">
              <div class="d-flex align-center gap-2">
                <span class="text-caption font-weight-medium text-slate-600">{{ t('manageCatalogModal.mount') }}</span>
                <v-btn-toggle
                  v-model="packageForm.isSmd"
                  mandatory
                  density="comfortable"
                  variant="outlined"
                  color="primary"
                  rounded="lg"
                >
                  <v-btn :value="1" size="small" class="text-caption font-weight-bold">
                    <v-icon start size="14">mdi-chip</v-icon>
                    SMD
                  </v-btn>
                  <v-btn :value="0" size="small" class="text-caption font-weight-bold">
                    <v-icon start size="14">mdi-circle-slice-8</v-icon>
                    THT
                  </v-btn>
                </v-btn-toggle>
              </div>
            </v-col>
          </v-row>

          <!-- Drawing / Pinout Image with Inline Upload -->
          <div class="d-flex align-center gap-3 mt-2">
            <v-avatar rounded="lg" size="48" class="border bg-slate-50 flex-shrink-0">
              <MediaImage
                :src="packageForm.drawingURL"
                type="packages"
                :alt="packageForm.package"
                icon-size="24px"
              />
            </v-avatar>

            <v-text-field
              v-model="packageForm.drawingURL"
              :label="t('manageCatalogModal.drawingOrPinout')"
              :placeholder="t('manageCatalogModal.drawingPlaceholder')"
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
                  :title="t('common.upload')"
                >
                  {{ t('common.upload') }}
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
            {{ t('manageCatalogModal.drawingStoredHint') }}
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="text" size="small" @click="showPackageDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold px-4"
            :loading="saving"
            @click="savePackage"
          >
            {{ t('manageCatalogModal.savePackage') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Notification Snackbar inside View -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import MediaImage from '../../components/MediaImage.vue';

const { t } = useI18n();

const loading = ref(false);
const saving = ref(false);
const packagesList = ref([]);
const packageSearch = ref('');
const packageMountFilter = ref('all');

const showPackageDialog = ref(false);
const editingPackage = ref(null);
const packageForm = ref({
  package: '',
  pinQuantity: null,
  isSmd: 1,
  drawingURL: ''
});
const packageError = ref('');
const uploadingDrawing = ref(false);
const drawingInputRef = ref(null);

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

const loadPackages = async () => {
  loading.value = true;
  try {
    const pkgs = await api.getPackages();
    packagesList.value = pkgs || [];
  } catch (err) {
    console.error('Failed to load packages:', err);
    notify(t('manageCatalogModal.loadError') + ': ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadPackages();
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

// Package Actions
const openPackageForm = (pkg = null) => {
  editingPackage.value = pkg;
  packageForm.value = {
    package: pkg ? pkg.package : '',
    pinQuantity: pkg && pkg.pinQuantity !== null && pkg.pinQuantity !== undefined ? pkg.pinQuantity : null,
    isSmd: pkg ? (pkg.isSmd ? 1 : 0) : 1,
    drawingURL: pkg && pkg.drawingURL ? pkg.drawingURL : ''
  };
  packageError.value = '';
  showPackageDialog.value = true;
};

const handleDrawingUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  uploadingDrawing.value = true;
  try {
    const res = await api.uploadMedia(file, 'packages');
    if (res && res.filename) {
      packageForm.value.drawingURL = res.filename;
      notify(t('manageCatalogModal.drawingUploaded', { file: res.filename }));
    }
  } catch (err) {
    console.error('Failed to upload drawing:', err);
    notify(t('manageCatalogModal.drawingUploadError') + ': ' + err.message, 'error');
  } finally {
    uploadingDrawing.value = false;
    if (drawingInputRef.value) {
      drawingInputRef.value.value = '';
    }
  }
};

const savePackage = async () => {
  const name = packageForm.value.package.trim();
  if (!name) {
    packageError.value = t('manageCatalogModal.packageRequiredErr');
    return;
  }
  saving.value = true;
  packageError.value = '';
  try {
    const payload = {
      package: name,
      pinQuantity: packageForm.value.pinQuantity !== null && packageForm.value.pinQuantity !== '' ? parseInt(packageForm.value.pinQuantity, 10) : null,
      isSmd: packageForm.value.isSmd ? 1 : 0,
      drawingURL: packageForm.value.drawingURL ? packageForm.value.drawingURL.trim() : null
    };

    if (editingPackage.value) {
      await api.updatePackage(editingPackage.value.ID, payload);
      notify(t('manageCatalogModal.packageUpdated', { name }));
    } else {
      await api.createPackage(payload);
      notify(t('manageCatalogModal.packageCreated', { name }));
    }
    showPackageDialog.value = false;
    await loadPackages();
  } catch (err) {
    console.error('Failed to save package:', err);
    packageError.value = err.response?.data?.error || err.message;
  } finally {
    saving.value = false;
  }
};

const confirmDeletePackage = async (pkg) => {
  if (pkg.componentCount > 0) {
    alert(t('manageCatalogModal.packageDeleteInUse', { name: pkg.package, count: pkg.componentCount }));
    return;
  }
  if (!confirm(t('manageCatalogModal.packageDeleteConfirm', { name: pkg.package }))) {
    return;
  }
  try {
    await api.deletePackage(pkg.ID);
    notify(t('manageCatalogModal.packageDeleted', { name: pkg.package }));
    await loadPackages();
  } catch (err) {
    console.error('Failed to delete package:', err);
    notify(t('manageCatalogModal.packageDeleteError') + ': ' + (err.response?.data?.error || err.message), 'error');
  }
};
</script>

<style scoped>
.hover-underline:hover {
  text-decoration: underline;
}
</style>
