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

            <!-- With Drawing Image (Click to zoom) -->
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
              <div class="photo-overlay d-flex align-center justify-center">
                <v-icon icon="mdi-magnify-plus-outline" size="32" color="slate-800" />
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
      <v-card-actions class="pa-3 bg-surface d-flex justify-end">
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
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePackageDetailsStore } from '../stores/packageDetails';
import MediaImage from './MediaImage.vue';
import MediaLightboxDialog from './MediaLightboxDialog.vue';
import { resolveMediaUrl } from '../services/api';

const { t } = useI18n();
const packageStore = usePackageDetailsStore();
const showDrawingLightbox = ref(false);

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
}
.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(2px);
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  pointer-events: none;
}
.drawing-zoom-wrapper:hover .photo-overlay {
  opacity: 1;
}
</style>
