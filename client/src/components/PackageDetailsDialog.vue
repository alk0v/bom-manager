<template>
  <v-dialog
    v-model="packageStore.isOpen"
    max-width="680"
    scrollable
  >
    <v-card class="rounded-0 border bg-white" v-if="packageStore.packageData">
      <!-- Header -->
      <v-card-title class="bg-surface-variant py-3 px-4 d-flex align-center justify-space-between border-b">
        <div class="d-flex align-center gap-2 flex-wrap">
          <v-icon icon="mdi-package-variant-closed" color="primary" class="me-1" />
          <span class="font-mono font-weight-bold text-subtitle-1 text-slate-900">
            {{ packageStore.packageData.package || 'Package Details' }}
          </span>

          <!-- SMD / THT badge -->
          <v-chip
            v-if="packageStore.packageData.isSmd !== null && packageStore.packageData.isSmd !== undefined"
            size="small"
            variant="flat"
            :color="packageStore.packageData.isSmd ? 'teal-darken-1' : 'indigo-darken-1'"
            class="font-weight-bold text-caption ms-1"
          >
            {{ packageStore.packageData.isSmd ? 'SMD' : 'Through-Hole' }}
          </v-chip>

          <!-- Pin Count badge -->
          <v-chip
            v-if="packageStore.packageData.pinQuantity !== null && packageStore.packageData.pinQuantity !== undefined"
            size="small"
            variant="tonal"
            color="blue-grey"
            class="font-mono text-caption"
          >
            {{ packageStore.packageData.pinQuantity }} pins
          </v-chip>
        </div>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="packageStore.close"
          :title="t('common.close')"
        />
      </v-card-title>

      <!-- Body Content -->
      <v-card-text class="pa-4">
        <!-- Loading State -->
        <div v-if="packageStore.loading" class="d-flex justify-center align-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <div v-else>
          <!-- Drawing Section -->
          <div class="mb-4">
            <div class="text-caption font-weight-bold text-slate-700 text-uppercase tracking-wider mb-2 d-flex align-center justify-space-between">
              <span class="d-flex align-center gap-1">
                <v-icon icon="mdi-drawing" size="16" color="primary" />
                Technical Drawing / Footprint Layout
              </span>
              <v-btn
                v-if="packageStore.packageData.drawingURL"
                variant="text"
                size="x-small"
                color="primary"
                prepend-icon="mdi-magnify-plus-outline"
                @click="showDrawingLightbox = true"
              >
                {{ t('dialogs.viewFullSize') }}
              </v-btn>
            </div>

            <!-- With Drawing Image (Click to zoom, no automatic blur) -->
            <div
              v-if="packageStore.packageData.drawingURL"
              class="border rounded bg-slate-50 overflow-hidden d-flex flex-column align-center justify-center p-3 position-relative cursor-pointer drawing-zoom-wrapper"
              :title="t('dialogs.viewDrawingFullSize')"
              @click="showDrawingLightbox = true"
            >
              <div class="w-100 d-flex align-center justify-center py-2" style="min-height: 240px; max-height: 380px;">
                <MediaImage
                  type="package"
                  :src="packageStore.packageData.drawingURL"
                  height="300px"
                  width="100%"
                  :cover="false"
                />
              </div>

              <!-- Subtle floating zoom hint chip (top right) -->
              <div class="zoom-badge-container">
                <v-chip
                  size="x-small"
                  color="grey-darken-3"
                  variant="flat"
                  class="font-weight-medium shadow-sm opacity-80"
                  prepend-icon="mdi-magnify-plus-outline"
                >
                  Zoom
                </v-chip>
              </div>

              <!-- Drawing File Info Bar -->
              <div class="w-100 bg-white border-t px-3 py-2 d-flex align-center justify-space-between text-caption font-mono text-slate-600">
                <span class="d-flex align-center gap-1">
                  <v-icon icon="mdi-file-image-outline" size="14" color="slate-500" />
                  {{ packageStore.packageData.drawingURL }}
                </span>
                <span class="text-slate-400 text-xs">Footprint Dimension / Pinout</span>
              </div>
            </div>

            <!-- No Drawing Empty State -->
            <div
              v-else
              class="border border-dashed rounded bg-slate-50 pa-6 text-center"
            >
              <v-icon icon="mdi-drawing-box" size="48" color="slate-300" class="mb-2" />
              <div class="text-subtitle-2 font-weight-medium text-slate-700 mb-1">
                No Technical Drawing Available
              </div>
              <p class="text-caption text-slate-500 max-w-md mx-auto mb-0">
                A mechanical drawing or pinout diagram has not been uploaded for package footprint
                <span class="font-mono font-weight-bold text-slate-700">{{ packageStore.packageData.package }}</span>.
              </p>
            </div>
          </div>

          <!-- Specifications Summary -->
          <v-divider class="my-4" />

          <div>
            <div class="text-caption font-weight-bold text-slate-700 text-uppercase tracking-wider mb-2 d-flex align-center gap-1">
              <v-icon icon="mdi-information-outline" size="16" color="primary" />
              Package Specifications
            </div>

            <v-table density="compact" class="border rounded text-body-2">
              <tbody>
                <tr>
                  <td class="text-slate-500 font-weight-medium" style="width: 180px;">Package Name</td>
                  <td class="font-mono font-weight-bold text-slate-900">
                    {{ packageStore.packageData.package || '—' }}
                  </td>
                </tr>
                <tr>
                  <td class="text-slate-500 font-weight-medium">Mounting Technology</td>
                  <td>
                    <span v-if="packageStore.packageData.isSmd === 1" class="text-teal-darken-2 font-weight-medium">
                      Surface Mount Device (SMD)
                    </span>
                    <span v-else-if="packageStore.packageData.isSmd === 0" class="text-indigo-darken-2 font-weight-medium">
                      Through-Hole Technology (THT)
                    </span>
                    <span v-else class="text-disabled">—</span>
                  </td>
                </tr>
                <tr>
                  <td class="text-slate-500 font-weight-medium">Pin / Lead Count</td>
                  <td class="font-mono">
                    {{ packageStore.packageData.pinQuantity != null ? `${packageStore.packageData.pinQuantity} pins` : '—' }}
                  </td>
                </tr>
                <tr>
                  <td class="text-slate-500 font-weight-medium">Drawing File</td>
                  <td class="font-mono">
                    <span v-if="packageStore.packageData.drawingURL" class="text-primary font-weight-medium">
                      {{ packageStore.packageData.drawingURL }}
                    </span>
                    <span v-else class="text-disabled">Not available</span>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions class="pa-3 bg-surface d-flex justify-space-between align-center">
        <v-btn
          variant="tonal"
          color="primary"
          prepend-icon="mdi-pencil-outline"
          :disabled="!packageStore.packageData.ID && packageStore.loading"
          @click="openEditDialog"
        >
          {{ t('manageCatalogModal.editPackage') }}
        </v-btn>

        <v-btn
          variant="outlined"
          color="slate-700"
          @click="packageStore.close"
        >
          {{ t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- FULL SIZE MEDIA LIGHTBOX DIALOG -->
    <MediaLightboxDialog
      v-model="showDrawingLightbox"
      type="package"
      :src="packageStore.packageData?.drawingURL"
      :title="packageStore.packageData?.package"
    />

    <!-- EDIT PACKAGE MODAL -->
    <v-dialog v-model="showEditDialog" max-width="520px" persistent>
      <v-card class="rounded-0 border bg-white">
        <v-card-title class="bg-slate-50 py-3 px-4 border-b font-weight-bold text-subtitle-1 d-flex align-center justify-space-between">
          <span class="d-flex align-center gap-2">
            <v-icon icon="mdi-pencil-outline" size="20" color="primary" />
            {{ t('manageCatalogModal.editPackage') }}
          </span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showEditDialog = false" />
        </v-card-title>
        <v-card-text class="pa-4">
          <v-text-field
            v-model="editForm.package"
            :label="t('manageCatalogModal.packageFootprintName')"
            :placeholder="t('manageCatalogModal.packagePlaceholder')"
            variant="outlined"
            density="comfortable"
            class="font-mono mb-3"
            autofocus
            :error-messages="editError"
          />

          <!-- Pin Count & Mount Technology Row -->
          <v-row dense class="mb-3" align="center">
            <v-col cols="12" sm="5">
              <v-text-field
                v-model.number="editForm.pinQuantity"
                :label="t('manageCatalogModal.pinPadCount')"
                type="number"
                min="1"
                :placeholder="t('manageCatalogModal.pinPlaceholder')"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" sm="7">
              <div class="border rounded-lg d-flex align-center px-3 justify-space-between bg-slate-50" style="height: 48px;">
                <span class="text-caption font-weight-medium text-slate-600 me-2 flex-shrink-0">
                  {{ t('manageCatalogModal.mount') }}
                </span>
                <v-btn-toggle
                  v-model="editForm.isSmd"
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
                    {{ t('dialogs.throughHole') }}
                  </v-btn>
                </v-btn-toggle>
              </div>
            </v-col>
          </v-row>

          <!-- Drawing / Pinout Image with Live Upload and Preview -->
          <div class="d-flex align-center gap-3 mb-1">
            <v-avatar
              v-if="editForm.drawingURL"
              rounded="lg"
              size="48"
              class="border bg-slate-50 flex-shrink-0"
            >
              <MediaImage
                type="package"
                :src="editForm.drawingURL"
                height="48px"
                width="48px"
              />
            </v-avatar>

            <v-text-field
              v-model="editForm.drawingURL"
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
                  @click.stop="fileInputRef?.click()"
                  :title="t('common.upload')"
                >
                  {{ t('common.upload') }}
                </v-btn>
              </template>
            </v-text-field>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              style="display: none;"
              @change="handleFileUpload"
            />
          </div>
          <div class="text-caption text-slate-500 mt-1 ms-1">
            {{ t('manageCatalogModal.drawingStoredHint') }}
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="text" size="small" @click="showEditDialog = false">{{ t('common.cancel') }}</v-btn>
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
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePackageDetailsStore } from '../stores/packageDetails';
import MediaImage from './MediaImage.vue';
import MediaLightboxDialog from './MediaLightboxDialog.vue';
import api, { resolveMediaUrl } from '../services/api';

const { t } = useI18n();
const packageStore = usePackageDetailsStore();
const showDrawingLightbox = ref(false);

// Edit state
const showEditDialog = ref(false);
const saving = ref(false);
const uploadingDrawing = ref(false);
const editError = ref('');
const fileInputRef = ref(null);
const editForm = ref({
  package: '',
  pinQuantity: null,
  isSmd: 1,
  drawingURL: ''
});

const openEditDialog = () => {
  const current = packageStore.packageData || {};
  editForm.value = {
    package: current.package || '',
    pinQuantity: current.pinQuantity != null ? current.pinQuantity : null,
    isSmd: current.isSmd === 0 ? 0 : 1,
    drawingURL: current.drawingURL || ''
  };
  editError.value = '';
  showEditDialog.value = true;
};

const handleFileUpload = async (event) => {
  const file = event.target?.files?.[0];
  if (!file) return;

  uploadingDrawing.value = true;
  try {
    const res = await api.uploadMedia('packages', file);
    editForm.value.drawingURL = res.filename;
  } catch (err) {
    console.error('Failed to upload package drawing:', err);
    editError.value = t('manageCatalogModal.drawingUploadError') + ': ' + (err.response?.data?.error || err.message);
  } finally {
    uploadingDrawing.value = false;
    if (event.target) event.target.value = '';
  }
};

const savePackage = async () => {
  const name = editForm.value.package?.trim();
  if (!name) {
    editError.value = t('manageCatalogModal.packageRequiredErr');
    return;
  }

  const pkgId = packageStore.packageData?.ID;
  if (!pkgId) {
    editError.value = 'Package ID not found';
    return;
  }

  saving.value = true;
  editError.value = '';
  try {
    const payload = {
      package: name,
      pinQuantity: editForm.value.pinQuantity,
      isSmd: editForm.value.isSmd,
      drawingURL: (editForm.value.drawingURL || '').trim()
    };

    await api.updatePackage(pkgId, payload);

    // Update store state so the details modal immediately reflects changes
    packageStore.packageData = {
      ...packageStore.packageData,
      ...payload
    };
    packageStore.invalidateCache();

    showEditDialog.value = false;

    // Dispatch custom event so other components (e.g. Catalog, BOM) can refresh if needed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('package-updated', { detail: { id: pkgId, ...payload } }));
    }
  } catch (err) {
    console.error('Failed to update package:', err);
    editError.value = err.response?.data?.error || err.message || 'Failed to update package';
  } finally {
    saving.value = false;
  }
};

const drawingFullUrl = computed(() => {
  if (!packageStore.packageData?.drawingURL) return null;
  return resolveMediaUrl('package', packageStore.packageData.drawingURL);
});
</script>

<style scoped>
.tracking-wider {
  letter-spacing: 0.05em;
}
.drawing-zoom-wrapper {
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.drawing-zoom-wrapper:hover {
  border-color: rgba(var(--v-theme-primary), 0.5) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.zoom-badge-container {
  position: absolute;
  top: 10px;
  right: 10px;
  pointer-events: none;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.drawing-zoom-wrapper:hover .zoom-badge-container {
  transform: scale(1.05);
}
</style>
