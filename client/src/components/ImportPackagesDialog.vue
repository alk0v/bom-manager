<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1100"
    width="95vw"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-0 border bg-white d-flex flex-column" style="max-height: 90vh;">
      <!-- Dialog Header -->
      <v-card-item class="bg-slate-50 py-3 px-5 border-b flex-shrink-0">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-2">
            <v-icon color="primary" size="22">mdi-package-down</v-icon>
            <div>
              <div class="text-subtitle-1 font-weight-bold text-slate-900">
                {{ t('importPackagesModal.title') }}
              </div>
              <div class="text-caption text-slate-500">
                {{ t('importPackagesModal.subtitle') }}
              </div>
            </div>
          </div>

          <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
        </div>
      </v-card-item>

      <!-- Dialog Body -->
      <v-card-text class="pa-0 flex-grow-1 overflow-y-auto">
        <!-- STEP 1: Upload File -->
        <div v-if="currentStep === 1" class="pa-6">
          <div class="text-subtitle-1 font-weight-bold text-slate-900 mb-2">
            {{ t('importPackagesModal.selectFileTitle') }}
          </div>
          <p class="text-body-2 text-slate-600 mb-4">
            {{ t('importPackagesModal.selectFileSubtitle') }}
          </p>

          <v-card elevation="0" class="border rounded-0 pa-6 bg-slate-50 w-100">
            <div class="d-flex align-center mb-3">
              <v-icon color="primary" class="me-2" size="24">mdi-upload</v-icon>
              <span class="font-weight-bold text-subtitle-2 text-slate-900">
                {{ t('importPackagesModal.chooseFile') }}
              </span>
            </div>

            <v-file-input
              v-model="uploadFile"
              accept=".zip,.json"
              :label="t('importPackagesModal.chooseFile')"
              variant="outlined"
              density="comfortable"
              prepend-icon="mdi-package-variant-closed"
              class="bg-white mb-3"
              show-size
            />

            <v-btn
              color="primary"
              variant="flat"
              size="small"
              class="font-weight-bold w-100 py-2"
              prepend-icon="mdi-file-find-outline"
              :disabled="!uploadFile"
              :loading="parsing"
              @click="parseUploadedPackage"
            >
              {{ t('importPackagesModal.analyzeBtn') }}
            </v-btn>
          </v-card>
        </div>

        <!-- STEP 2: Review & Mapping -->
        <div v-else-if="currentStep === 2" class="d-flex flex-column h-100">
          <!-- Stats bar -->
          <div class="bg-slate-50 px-5 py-3 border-b flex-shrink-0 d-flex align-center justify-space-between flex-wrap gap-2">
            <div class="d-flex align-center gap-2 flex-wrap">
              <v-chip size="small" color="primary" variant="flat" class="font-weight-bold">
                {{ t('importPackagesModal.packagesToImport', { count: importedPackages.length }) }}
              </v-chip>
              <v-chip size="small" color="success" variant="tonal" class="font-weight-medium">
                <v-icon start size="14">mdi-check-circle-outline</v-icon>
                {{ t('importPackagesModal.matchedCount', { count: matchedCount }) }}
              </v-chip>
              <v-chip size="small" color="info" variant="tonal" class="font-weight-medium">
                <v-icon start size="14">mdi-plus-circle-outline</v-icon>
                {{ t('importPackagesModal.newCount', { count: newCount }) }}
              </v-chip>
              <v-chip v-if="drawingsCount > 0" size="small" color="teal" variant="tonal" class="font-weight-medium">
                <v-icon start size="14">mdi-image-outline</v-icon>
                {{ t('importPackagesModal.drawingsCount', { count: drawingsCount }) }}
              </v-chip>
            </div>

            <div class="d-flex align-center gap-2">
              <v-btn
                size="small"
                variant="outlined"
                color="primary"
                prepend-icon="mdi-check-all"
                class="font-weight-medium"
                @click="mapAllExact"
              >
                {{ t('importPackagesModal.mapExactAll') }}
              </v-btn>
              <v-btn
                size="small"
                variant="outlined"
                color="secondary"
                prepend-icon="mdi-plus-box-multiple-outline"
                class="font-weight-medium"
                @click="setAllToCreateNew"
              >
                {{ t('importPackagesModal.createAllNew') }}
              </v-btn>
            </div>
          </div>

          <!-- Filter & Select toolbar -->
          <div class="px-5 py-2 bg-white border-b d-flex align-center justify-space-between gap-3 flex-shrink-0 flex-wrap">
            <div class="d-flex align-center gap-3">
              <v-checkbox
                :model-value="allSelected"
                :indeterminate="someSelected && !allSelected"
                density="compact"
                hide-details
                color="primary"
                @update:model-value="toggleSelectAll"
              >
                <template #label>
                  <span class="text-caption font-weight-bold text-slate-800">
                    {{ t('importPackagesModal.selectedCount', { count: selectedCount, total: importedPackages.length }) }}
                  </span>
                </template>
              </v-checkbox>
            </div>

            <v-text-field
              v-model="searchFilter"
              density="compact"
              variant="outlined"
              :placeholder="t('importPackagesModal.searchImported')"
              prepend-inner-icon="mdi-magnify"
              hide-details
              clearable
              rounded="lg"
              class="bg-white"
              style="min-width: 220px; max-width: 320px;"
            />
          </div>

          <!-- Packages Mapping Table (Drawing column removed, clickable filename, streamlined Action column) -->
          <div class="flex-grow-1 overflow-y-auto">
            <v-table density="comfortable" hover class="data-table">
              <thead>
                <tr class="bg-slate-50 text-caption font-weight-bold">
                  <th style="width: 50px;" class="text-center">#</th>
                  <th class="text-left font-weight-bold" style="min-width: 200px;">
                    {{ t('manageCatalogModal.packageFootprintName') }}
                  </th>
                  <th class="text-center font-weight-bold" style="width: 140px;">
                    {{ t('manageCatalogModal.mount') }} / {{ t('manageCatalogModal.pins') }}
                  </th>
                  <th class="text-left font-weight-bold" style="width: 160px;">
                    Status
                  </th>
                  <th class="text-left font-weight-bold" style="min-width: 300px;">
                    Import Target & Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in filteredImportedPackages"
                  :key="item.importIndex"
                  :class="{ 'bg-blue-50/50': item.selected && item.action === 'update' }"
                >
                  <!-- Checkbox -->
                  <td class="text-center pa-1">
                    <v-checkbox
                      v-model="item.selected"
                      density="compact"
                      hide-details
                      color="primary"
                    />
                  </td>

                  <!-- Package Name & Clickable Drawing File -->
                  <td>
                    <div class="font-mono font-weight-bold text-body-2 text-slate-900">
                      {{ item.package }}
                    </div>

                    <!-- Clickable Drawing Filename with preview -->
                    <div v-if="item.drawingURL" class="d-flex align-center gap-1 mt-0.5">
                      <v-icon size="14" color="primary" class="flex-shrink-0">mdi-file-image-outline</v-icon>
                      <span
                        class="font-mono text-caption text-primary cursor-pointer hover-underline text-truncate"
                        style="max-width: 220px;"
                        :title="`${item.drawingURL} (${t('dialogs.viewFullSize') || 'Click to preview'})`"
                        @click.stop="openDrawingPreview(item)"
                      >
                        {{ item.drawingURL }}
                      </span>
                      <v-icon
                        size="13"
                        color="slate-400"
                        class="cursor-pointer hover-icon ms-0.5"
                        :title="t('dialogs.viewFullSize') || 'Click to preview'"
                        @click.stop="openDrawingPreview(item)"
                      >
                        mdi-magnify-plus-outline
                      </v-icon>
                    </div>
                    <div v-else class="text-caption text-slate-400 font-italic mt-0.5">
                      {{ t('manageCatalogModal.noDrawing') }}
                    </div>
                  </td>

                  <!-- Mount & Pins -->
                  <td class="text-center">
                    <div class="d-flex align-center justify-center gap-1">
                      <v-chip
                        size="x-small"
                        variant="tonal"
                        :color="item.isSmd === 1 ? 'teal-darken-1' : (item.isSmd === 2 ? 'blue-grey-darken-1' : 'indigo-darken-1')"
                        class="font-weight-bold"
                      >
                        {{ item.isSmd === 1 ? 'SMD' : (item.isSmd === 2 ? 'MECH' : 'THT') }}
                      </v-chip>
                      <v-chip
                        v-if="item.isSmd !== 2 && item.pinQuantity !== null && item.pinQuantity !== undefined"
                        size="x-small"
                        variant="outlined"
                        color="slate-600"
                        class="font-mono"
                      >
                        {{ item.pinQuantity }}p
                      </v-chip>
                    </div>
                  </td>

                  <!-- Match Status Badge -->
                  <td>
                    <v-chip
                      v-if="item.matchType === 'exact'"
                      size="small"
                      color="success"
                      variant="tonal"
                      class="font-weight-medium"
                    >
                      <v-icon start size="14">mdi-check-circle-outline</v-icon>
                      {{ t('importPackagesModal.exactMatch') }}
                    </v-chip>
                    <v-chip
                      v-else
                      size="small"
                      color="slate-600"
                      variant="tonal"
                      class="font-weight-medium"
                    >
                      <v-icon start size="14">mdi-plus-circle-outline</v-icon>
                      {{ t('importPackagesModal.newPackage') }}
                    </v-chip>
                  </td>

                  <!-- Redesigned Action & Target Column -->
                  <td>
                    <!-- If Action is 'create' -->
                    <div v-if="item.action === 'create'" class="d-flex align-center gap-2 py-1">
                      <v-chip
                        size="small"
                        color="primary"
                        variant="tonal"
                        class="font-weight-medium"
                      >
                        <v-icon start size="14">mdi-plus-circle-outline</v-icon>
                        {{ t('importPackagesModal.actionCreate') }}
                      </v-chip>

                      <v-btn
                        variant="text"
                        size="x-small"
                        color="slate-600"
                        class="text-caption font-weight-medium"
                        prepend-icon="mdi-link-variant"
                        @click="setRowToUpdate(item)"
                      >
                        {{ t('importPackagesModal.mapExisting') }}
                      </v-btn>
                    </div>

                    <!-- If Action is 'update' -->
                    <div v-else-if="item.action === 'update'" class="d-flex align-center gap-2 py-1">
                      <v-autocomplete
                        v-model="item.targetPackageId"
                        :items="existingPackages"
                        item-title="package"
                        item-value="ID"
                        density="compact"
                        variant="outlined"
                        hide-details
                        rounded="lg"
                        class="bg-white font-mono flex-grow-1 target-pkg-select"
                        prepend-inner-icon="mdi-database-sync-outline"
                        style="max-width: 280px;"
                        :placeholder="t('importPackagesModal.targetPackage')"
                      >
                        <template #selection="{ item: pkgItem }">
                          <span class="font-mono text-caption font-weight-bold text-emerald-800 text-truncate">
                            #{{ pkgItem.raw.ID }} {{ pkgItem.raw.package }}
                          </span>
                        </template>
                        <template #item="{ props: itemProps, item: pkgOption }">
                          <v-list-item
                            v-bind="itemProps"
                            :title="`#${pkgOption.raw.ID} ${pkgOption.raw.package}`"
                            :subtitle="`${pkgOption.raw.pinQuantity !== null && pkgOption.raw.pinQuantity !== undefined ? pkgOption.raw.pinQuantity + ' pins' : '—'} • ${pkgOption.raw.isSmd === 1 ? 'SMD' : (pkgOption.raw.isSmd === 2 ? 'MECH' : 'THT')}`"
                          />
                        </template>
                      </v-autocomplete>

                      <v-tooltip :text="t('importPackagesModal.actionCreate')" location="top">
                        <template #activator="{ props: tipProps }">
                          <v-btn
                            v-bind="tipProps"
                            icon="mdi-plus"
                            size="x-small"
                            variant="tonal"
                            color="primary"
                            @click="item.action = 'create'; item.targetPackageId = null"
                          />
                        </template>
                      </v-tooltip>
                    </div>
                  </td>
                </tr>

                <tr v-if="filteredImportedPackages.length === 0">
                  <td colspan="5" class="text-center py-8 text-disabled">
                    <v-icon size="36" class="mb-2">mdi-package-variant-closed</v-icon>
                    <div>{{ t('importPackagesModal.noPackagesFound') }}</div>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Dialog Footer -->
      <v-card-actions class="pa-3 px-5 bg-slate-50 d-flex justify-space-between flex-shrink-0">
        <div>
          <v-btn
            v-if="currentStep === 2"
            variant="text"
            size="small"
            prepend-icon="mdi-arrow-left"
            @click="currentStep = 1"
          >
            {{ t('importPackagesModal.backToFileSelect') }}
          </v-btn>
        </div>

        <div class="d-flex align-center gap-2">
          <v-btn variant="text" size="small" @click="closeDialog">
            {{ t('common.cancel') }}
          </v-btn>

          <v-btn
            v-if="currentStep === 2"
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold px-4"
            prepend-icon="mdi-package-down"
            :loading="importing"
            :disabled="selectedCount === 0"
            @click="executeImport"
          >
            {{ t('importPackagesModal.importBtn', { count: selectedCount }) }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>

    <!-- Full Size Drawing Lightbox for Imported Packages -->
    <MediaLightboxDialog
      v-model="lightbox.show"
      :type="lightbox.type"
      :src="lightbox.src"
      :title="lightbox.title"
    />
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import MediaLightboxDialog from './MediaLightboxDialog.vue';

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'imported']);

const currentStep = ref(1);
const uploadFile = ref(null);
const parsing = ref(false);
const importing = ref(false);
const searchFilter = ref('');

const tempFileId = ref(null);
const importedPackages = ref([]);
const existingPackages = ref([]);

const lightbox = ref({
  show: false,
  type: 'package',
  src: null,
  title: ''
});

const openDrawingPreview = (item) => {
  const src = item.previewDataUrl || item.drawingURL;
  if (!src) return;
  lightbox.value = {
    show: true,
    type: item.previewDataUrl ? null : 'package',
    src,
    title: `${item.package} (${item.drawingURL || 'drawing'})`
  };
};

const matchedCount = computed(() => {
  return importedPackages.value.filter(p => p.matchType === 'exact').length;
});

const newCount = computed(() => {
  return importedPackages.value.filter(p => p.matchType === 'none').length;
});

const drawingsCount = computed(() => {
  return importedPackages.value.filter(p => p.hasDrawingInZip || p.drawingURL).length;
});

const selectedCount = computed(() => {
  return importedPackages.value.filter(p => p.selected && p.action !== 'skip').length;
});

const allSelected = computed(() => {
  return importedPackages.value.length > 0 && importedPackages.value.every(p => p.selected);
});

const someSelected = computed(() => {
  return importedPackages.value.some(p => p.selected);
});

const toggleSelectAll = (val) => {
  const target = !!val;
  importedPackages.value.forEach(p => {
    p.selected = target;
  });
};

const mapAllExact = () => {
  importedPackages.value.forEach(p => {
    if (p.matchType === 'exact') {
      p.action = 'update';
      if (!p.targetPackageId) {
        const matched = existingPackages.value.find(
          ep => ep.package.toLowerCase().trim() === (p.package || '').toLowerCase().trim()
        );
        if (matched) p.targetPackageId = matched.ID;
      }
    }
  });
};

const setAllToCreateNew = () => {
  importedPackages.value.forEach(p => {
    p.action = 'create';
    p.targetPackageId = null;
  });
};

const setRowToUpdate = (item) => {
  item.action = 'update';
  if (!item.targetPackageId) {
    const matched = existingPackages.value.find(
      ep => ep.package.toLowerCase().trim() === (item.package || '').toLowerCase().trim()
    );
    if (matched) {
      item.targetPackageId = matched.ID;
    } else if (existingPackages.value.length > 0) {
      item.targetPackageId = existingPackages.value[0].ID;
    }
  }
};

const filteredImportedPackages = computed(() => {
  if (!searchFilter.value || !searchFilter.value.trim()) {
    return importedPackages.value;
  }
  const q = searchFilter.value.toLowerCase().trim();
  return importedPackages.value.filter(p => {
    return (p.package && p.package.toLowerCase().includes(q)) ||
           (p.drawingURL && p.drawingURL.toLowerCase().includes(q));
  });
});

const parseUploadedPackage = async () => {
  if (!uploadFile.value) return;

  parsing.value = true;
  try {
    const file = Array.isArray(uploadFile.value) ? uploadFile.value[0] : uploadFile.value;
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.parsePackagesImport(formData);
    if (res && res.packages) {
      tempFileId.value = res.tempFileId || null;
      importedPackages.value = res.packages || [];
      existingPackages.value = res.existingPackages || [];
      currentStep.value = 2;
    }
  } catch (err) {
    console.error('Failed to parse packages package:', err);
    alert(err.response?.data?.details || err.response?.data?.error || err.message);
  } finally {
    parsing.value = false;
  }
};

const executeImport = async () => {
  if (selectedCount.value === 0) return;

  importing.value = true;
  try {
    const payload = {
      tempFileId: tempFileId.value,
      packages: importedPackages.value.map(p => ({
        selected: p.selected,
        action: p.action,
        targetPackageId: p.targetPackageId,
        package: p.package,
        pinQuantity: p.pinQuantity,
        isSmd: p.isSmd,
        drawingURL: p.drawingURL
      }))
    };

    const res = await api.executePackagesImport(payload);
    emit('imported', res);
    closeDialog();
  } catch (err) {
    console.error('Failed to execute package import:', err);
    alert(err.response?.data?.details || err.response?.data?.error || err.message);
  } finally {
    importing.value = false;
  }
};

const closeDialog = () => {
  emit('update:modelValue', false);
  setTimeout(() => {
    currentStep.value = 1;
    uploadFile.value = null;
    importedPackages.value = [];
    existingPackages.value = [];
    tempFileId.value = null;
    searchFilter.value = '';
  }, 200);
};
</script>

<style scoped>
.hover-underline:hover {
  text-decoration: underline;
}

.hover-icon:hover {
  color: #1976d2 !important;
}

:deep(.target-pkg-select .v-field) {
  min-height: 34px !important;
  height: 34px !important;
  font-size: 0.8125rem !important;
}

:deep(.target-pkg-select .v-field__input) {
  min-height: 34px !important;
  height: 34px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
</style>
