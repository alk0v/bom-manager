<template>
  <!-- Main Project Import Dialog -->
  <v-dialog
    :model-value="modelValue"
    max-width="1560"
    width="96vw"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-0 border bg-white d-flex flex-column" style="max-height: 92vh;">
      <!-- Dialog Header -->
      <v-card-item class="bg-slate-50 py-3 px-5 border-b flex-shrink-0">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-2">
            <v-icon color="primary" size="22">mdi-package-down</v-icon>
            <div>
              <div class="text-subtitle-1 font-weight-bold text-slate-900">
                {{ t('importProjectModal.title') }}
              </div>
              <div class="text-caption text-slate-500">
                {{ t('importProjectModal.subtitle') }}
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
            {{ t('importProjectModal.selectFileTitle') }}
          </div>
          <p class="text-body-2 text-slate-600 mb-4">
            {{ t('importProjectModal.selectFileSubtitle') }}
          </p>

          <v-card elevation="0" class="border rounded-0 pa-6 bg-slate-50" style="max-width: 640px;">
            <div class="d-flex align-center mb-3">
              <v-icon color="primary" class="me-2" size="24">mdi-upload</v-icon>
              <span class="font-weight-bold text-subtitle-2 text-slate-900">
                {{ t('importProjectModal.chooseFile') }}
              </span>
            </div>

            <v-file-input
              v-model="uploadFile"
              accept=".zip,.json"
              :label="t('importProjectModal.chooseFile')"
              variant="outlined"
              density="comfortable"
              prepend-icon="mdi-package-variant-closed"
              class="bg-white mb-3"
              show-size
              @change="onFileSelected"
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
              {{ t('importProjectModal.analyzeBtn') }}
            </v-btn>
          </v-card>
        </div>

        <!-- STEP 2: Review Project, Component Mapping & Attachments -->
        <div v-else-if="currentStep === 2" class="d-flex flex-column h-100">
          <!-- Top Sub-Navigation Tabs -->
          <div class="bg-slate-50 px-5 border-b flex-shrink-0 d-flex align-center justify-space-between flex-wrap gap-2">
            <v-tabs v-model="activeTab" color="primary" density="comfortable">
              <v-tab value="bom" class="font-weight-bold text-body-2 text-none">
                <v-icon start size="18">mdi-chip</v-icon>
                {{ t('importProjectModal.tabBom', { count: mappedItems.length }) }}
              </v-tab>
              <v-tab value="project" class="font-weight-bold text-body-2 text-none">
                <v-icon start size="18">mdi-information-outline</v-icon>
                {{ t('importProjectModal.tabProjectInfo', { count: attachmentsList.length }) }}
              </v-tab>
            </v-tabs>

            <!-- Quick stats chip badge group -->
            <div class="d-flex align-center gap-2 py-1">
              <v-chip size="small" color="primary" variant="flat" class="font-weight-bold">
                {{ projectForm.projectName || 'New Project' }}
              </v-chip>
              <v-chip size="small" color="info" variant="tonal" class="font-mono">
                {{ totalPartsCount }} pcs total
              </v-chip>
              <v-chip size="small" color="secondary" variant="tonal" v-if="attachmentsList.length > 0">
                <v-icon start size="13">mdi-paperclip</v-icon>
                {{ attachmentsList.length }} files
              </v-chip>
            </div>
          </div>

          <!-- TAB 1: BOM & COMPONENT MAPPING -->
          <div v-show="activeTab === 'bom'" class="d-flex flex-column flex-grow-1 overflow-hidden">
            <!-- Mapping Toolbar & Quick Actions -->
            <div class="px-5 py-2 bg-white border-b d-flex flex-wrap align-center justify-space-between gap-2 flex-shrink-0">
              <div class="d-flex align-center flex-wrap gap-2">
                <v-checkbox
                  v-model="selectAll"
                  density="compact"
                  hide-details
                  color="primary"
                  @change="toggleSelectAll"
                >
                  <template #label>
                    <span class="text-caption font-weight-bold text-slate-800">
                      {{ selectedCount }} of {{ mappedItems.length }} selected
                    </span>
                  </template>
                </v-checkbox>

                <v-btn
                  size="small"
                  variant="outlined"
                  color="primary"
                  class="ms-2 font-weight-medium"
                  prepend-icon="mdi-check-all"
                  @click="matchExactAll"
                >
                  {{ t('importProjectModal.selectAllExact') }}
                </v-btn>
                <v-btn
                  size="small"
                  variant="outlined"
                  color="secondary"
                  class="font-weight-medium"
                  prepend-icon="mdi-plus-box-multiple-outline"
                  @click="setAllUnmatchedToCreateNew"
                >
                  {{ t('importProjectModal.createAllUnmatched') }}
                </v-btn>
              </div>

              <!-- Filter Search -->
              <v-text-field
                v-model="searchFilter"
                placeholder="Filter by Value, Footprint, Ref..."
                prepend-inner-icon="mdi-magnify"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                rounded="lg"
                style="max-width: 320px;"
              />
            </div>

            <!-- Mapping Table -->
            <div class="flex-grow-1 overflow-y-auto">
              <v-table density="comfortable" hover class="mapping-table">
                <thead>
                  <tr class="bg-slate-50">
                    <th style="width: 40px;" class="text-center">#</th>
                    <th class="text-left font-weight-bold" style="width: 250px;">Exported Part & Package</th>
                    <th class="text-center font-weight-bold" style="width: 60px;">Qty</th>
                    <th class="text-left font-weight-bold" style="width: 120px;">Status</th>
                    <th class="text-left font-weight-bold">Target Database Component & Package</th>
                    <th class="text-center font-weight-bold" style="width: 140px;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, idx) in filteredItems"
                    :key="item.index"
                    :class="{ 'bg-blue-50': item.selected && item.createAsNew, 'opacity-50': !item.selected }"
                  >
                    <!-- Selection Checkbox -->
                    <td class="text-center">
                      <v-checkbox
                        v-model="item.selected"
                        density="compact"
                        hide-details
                        color="primary"
                      />
                    </td>

                    <!-- Exported Part Details -->
                    <td>
                      <div class="font-mono font-weight-bold text-slate-900 text-body-2">
                        {{ item.value || '(No Value)' }}
                      </div>
                      <div class="d-flex align-center gap-1 mt-0.5 flex-wrap">
                        <v-chip
                          v-if="item.footprint"
                          size="x-small"
                          color="slate-700"
                          variant="tonal"
                          class="font-mono font-weight-medium"
                        >
                          {{ item.footprint }}
                        </v-chip>
                        <v-chip
                          v-if="item.categoryName"
                          size="x-small"
                          color="secondary"
                          variant="tonal"
                        >
                          {{ item.categoryName }}
                        </v-chip>
                      </div>
                      <div class="text-caption text-primary font-mono text-truncate mt-1" :title="item.comment || item.designators" style="max-width: 240px;">
                        {{ item.comment || item.designators }}
                      </div>
                    </td>

                    <!-- Quantity -->
                    <td class="text-center font-mono font-weight-bold text-body-2">
                      {{ item.quantity }}
                    </td>

                    <!-- Mapping Status Chip -->
                    <td>
                      <v-chip
                        v-if="item.createAsNew"
                        size="x-small"
                        color="primary"
                        variant="flat"
                        class="font-weight-bold"
                      >
                        <v-icon start size="12">mdi-plus-circle-outline</v-icon>
                        New Part
                      </v-chip>
                      <v-chip
                        v-else-if="item.matchConfidence === 'exact'"
                        size="x-small"
                        color="success"
                        variant="flat"
                        class="font-weight-bold"
                      >
                        <v-icon start size="12">mdi-check-circle-outline</v-icon>
                        Exact Match
                      </v-chip>
                      <v-chip
                        v-else-if="item.matchConfidence === 'suggested'"
                        size="x-small"
                        color="amber-darken-3"
                        variant="tonal"
                        class="font-weight-bold"
                      >
                        <v-icon start size="12">mdi-lightbulb-outline</v-icon>
                        Suggested
                      </v-chip>
                      <v-chip
                        v-else
                        size="x-small"
                        color="slate-500"
                        variant="tonal"
                        class="font-weight-bold"
                      >
                        Unmapped
                      </v-chip>
                    </td>

                    <!-- Database Target Component Box & Package Chip -->
                    <td>
                      <div class="py-1">
                        <div
                          class="comp-box-outlined d-flex align-center justify-space-between px-3"
                          @click="item.createAsNew ? openNewCompModal(item) : openPickerFor(item)"
                          :title="item.createAsNew ? 'Click to configure and add new component to catalog' : 'Click to map or change database component'"
                        >
                          <!-- Left: Component Name -->
                          <div class="d-flex align-center gap-2 text-truncate me-2">
                            <span
                              class="font-mono font-weight-bold text-truncate"
                              :class="getDisplayComponentName(item) ? 'text-slate-900' : 'text-slate-400 italic'"
                            >
                              {{ getDisplayComponentName(item) || 'Click to select component...' }}
                            </span>
                          </div>

                          <!-- Right: Package Chip aligned to right border -->
                          <div class="flex-shrink-0 ms-auto">
                            <v-chip
                              v-if="getDisplayPackageName(item)"
                              size="x-small"
                              :color="item.createAsNew ? 'indigo' : 'primary'"
                              variant="tonal"
                              class="font-mono font-weight-bold"
                            >
                              {{ getDisplayPackageName(item) }}
                            </v-chip>
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Action Column (+, clone, and magnify glass, matching style) -->
                    <td class="text-center">
                      <div class="d-flex align-center justify-center gap-1">
                        <!-- Map to existing component button (magnify glass) -->
                        <v-tooltip text="Map to existing component" location="top">
                          <template #activator="{ props: tipProps }">
                            <v-btn
                              v-bind="tipProps"
                              icon="mdi-magnify"
                              size="small"
                              variant="tonal"
                              color="slate-700"
                              class="flex-shrink-0"
                              @click="openPickerFor(item)"
                            />
                          </template>
                        </v-tooltip>

                        <!-- Clone existing component to map (copy icon) -->
                        <v-tooltip text="Find & clone existing component to map" location="top">
                          <template #activator="{ props: tipProps }">
                            <v-btn
                              v-bind="tipProps"
                              icon="mdi-content-copy"
                              size="small"
                              variant="tonal"
                              color="indigo"
                              class="flex-shrink-0"
                              @click="openClonePickerFor(item)"
                            />
                          </template>
                        </v-tooltip>

                        <!-- Add new button (+) -->
                        <v-tooltip text="Configure as new component" location="top">
                          <template #activator="{ props: tipProps }">
                            <v-btn
                              v-bind="tipProps"
                              icon="mdi-plus"
                              size="small"
                              variant="tonal"
                              color="primary"
                              class="flex-shrink-0"
                              @click="openNewCompModal(item)"
                            />
                          </template>
                        </v-tooltip>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>

          <!-- TAB 2: PROJECT INFO & ATTACHMENTS -->
          <div v-show="activeTab === 'project'" class="pa-6 overflow-y-auto flex-grow-1">
            <v-row>
              <!-- Left Col: Project Details -->
              <v-col cols="12" md="7">
                <v-card elevation="0" class="border rounded-0 pa-5 bg-slate-50 mb-4">
                  <div class="text-subtitle-2 font-weight-bold text-slate-900 mb-4 d-flex align-center gap-2">
                    <v-icon color="primary" size="20">mdi-information-outline</v-icon>
                    <span>Project Properties</span>
                  </div>

                  <v-text-field
                    v-model="projectForm.projectName"
                    :label="t('importProjectModal.projectName')"
                    variant="outlined"
                    density="comfortable"
                    class="bg-white mb-3 font-weight-medium"
                    required
                  />

                  <v-textarea
                    v-model="projectForm.description"
                    :label="t('importProjectModal.projectDescription')"
                    variant="outlined"
                    density="comfortable"
                    rows="4"
                    class="bg-white mb-3"
                  />

                  <v-text-field
                    v-model="projectForm.url"
                    :label="t('importProjectModal.projectUrl')"
                    placeholder="https://github.com/..."
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-link"
                    class="bg-white mb-3"
                  />

                  <v-combobox
                    v-model="projectForm.tags"
                    :label="t('importProjectModal.projectTags')"
                    multiple
                    chips
                    closable-chips
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-tag-outline"
                    class="bg-white"
                  />
                </v-card>
              </v-col>

              <!-- Right Col: Attachments Checklist -->
              <v-col cols="12" md="5">
                <v-card elevation="0" class="border rounded-0 pa-5 bg-slate-50">
                  <div class="text-subtitle-2 font-weight-bold text-slate-900 mb-3 d-flex align-center justify-space-between">
                    <div class="d-flex align-center gap-2">
                      <v-icon color="primary" size="20">mdi-paperclip</v-icon>
                      <span>{{ t('importProjectModal.attachmentsTitle', { count: attachmentsList.length }) }}</span>
                    </div>

                    <div v-if="attachmentsList.length > 0" class="d-flex align-center gap-1">
                      <v-btn size="x-small" variant="text" color="primary" @click="attachmentsList.forEach(a => a.selected = true)">
                        All
                      </v-btn>
                      <v-btn size="x-small" variant="text" color="slate-600" @click="attachmentsList.forEach(a => a.selected = false)">
                        None
                      </v-btn>
                    </div>
                  </div>

                  <div v-if="attachmentsList.length > 0" class="border rounded bg-white overflow-hidden">
                    <v-list density="compact" class="pa-0">
                      <v-list-item
                        v-for="att in attachmentsList"
                        :key="att.fileName"
                        class="border-b px-3 py-2"
                      >
                        <template #prepend>
                          <v-checkbox
                            v-model="att.selected"
                            color="primary"
                            density="compact"
                            hide-details
                            class="me-2"
                          />
                        </template>

                        <v-list-item-title class="font-weight-medium text-body-2 d-flex align-center gap-2">
                          <v-icon size="16" :color="getFileTypeColor(att.fileType)">{{ getFileTypeIcon(att.fileType) }}</v-icon>
                          <span class="text-truncate">{{ att.originalName || att.fileName }}</span>
                        </v-list-item-title>

                        <v-list-item-subtitle class="text-caption text-slate-500 mt-0.5 d-flex align-center gap-2">
                          <v-chip size="x-small" variant="tonal" :color="getFileTypeColor(att.fileType)">{{ att.fileType }}</v-chip>
                          <span v-if="att.fileSize" class="font-mono">{{ formatFileSize(att.fileSize) }}</span>
                        </v-list-item-subtitle>
                      </v-list-item>
                    </v-list>
                  </div>

                  <div v-else class="text-center py-6 text-disabled bg-white border rounded">
                    <v-icon size="32" class="mb-1">mdi-file-outline</v-icon>
                    <div class="text-caption">{{ t('importProjectModal.noAttachments') }}</div>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </div>
      </v-card-text>

      <!-- Dialog Footer Actions -->
      <v-card-actions class="px-5 py-3 border-t bg-slate-50 d-flex align-center justify-space-between flex-shrink-0">
        <div>
          <v-btn
            v-if="currentStep === 2"
            variant="text"
            size="small"
            prepend-icon="mdi-arrow-left"
            @click="currentStep = 1"
          >
            {{ t('importProjectModal.backToFileSelect') }}
          </v-btn>
        </div>

        <div class="d-flex align-center gap-2">
          <v-btn variant="outlined" size="small" @click="closeDialog">
            {{ t('common.cancel') }}
          </v-btn>

          <v-btn
            v-if="currentStep === 2"
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold"
            prepend-icon="mdi-package-down"
            :loading="importing"
            :disabled="!projectForm.projectName.trim() || selectedCount === 0"
            @click="executeImport"
          >
            {{ t('importProjectModal.importExecuteBtn', { count: selectedCount }) }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Component Picker Re-using AddComponentDialog -->
  <AddComponentDialog
    v-model="pickerDialogOpen"
    :picker-mode="true"
    :clone-mode-only="isClonePickerMode"
    :title="pickerTitle"
    :subtitle="pickerSubtitle"
    :initial-search="pickerInitialSearch"
    :initial-categories="pickerInitialCategories"
    :initial-packages="pickerInitialPackages"
    @select="onComponentPicked"
    @clone="onComponentToClonePicked"
  />

  <!-- RE-USE CREATE COMPONENT DIALOG TO ADD NEW COMPONENT -->
  <CreateComponentDialog
    v-model="createCompDialogOpen"
    :categories="categoryOptions"
    :packages="packageOptions"
    :component="activeCloneCompSource"
    :initial-data="activeNewCompData"
    :is-clone="isCloneMode"
    :title="newCompDialogTitle"
    :subtitle="newCompDialogSubtitle"
    :hide-add-another="true"
    @created="onNewComponentCreated"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import AddComponentDialog from './AddComponentDialog.vue';
import CreateComponentDialog from './CreateComponentDialog.vue';

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'imported']);

const currentStep = ref(1);
const activeTab = ref('bom');
const parsing = ref(false);
const importing = ref(false);
const uploadFile = ref(null);

// Temp import identifier
const tempFileId = ref(null);

// Project Form
const projectForm = ref({
  projectName: '',
  description: '',
  url: '',
  photoUrl: '',
  tags: []
});

// BOM & Mapped Items
const mappedItems = ref([]);
const searchFilter = ref('');
const selectAll = ref(true);
const attachmentsList = ref([]);

// Reference Catalog Data
const catalogComponents = ref([]);
const categoryOptions = ref([]);
const packageOptions = ref([]);

// Picker state (re-using AddComponentDialog)
const pickerDialogOpen = ref(false);
const isClonePickerMode = ref(false);
const activeMapItem = ref(null);
const pickerInitialSearch = ref('');
const pickerInitialCategories = ref([]);
const pickerInitialPackages = ref([]);

// Configure New Component Modal state (re-using CreateComponentDialog)
const createCompDialogOpen = ref(false);
const isCloneMode = ref(false);
const activeCloneCompSource = ref(null);
const activeNewCompItem = ref(null);
const activeNewCompItemIndex = ref(null);
const activeNewCompData = ref(null);
const newCompDialogTitle = ref('Add New Component');
const newCompDialogSubtitle = ref('');

const pickerTitle = computed(() => {
  if (isClonePickerMode.value) {
    return `Find Component to Clone for ${activeMapItem.value?.value || 'Project Part'}`;
  }
  return `Map Component for ${activeMapItem.value?.value || 'Project Part'}`;
});

const pickerSubtitle = computed(() => {
  if (!activeMapItem.value) return '';
  return `Row #${activeMapItem.value.index} · Package: ${activeMapItem.value.footprint || 'N/A'} · Qty: ${activeMapItem.value.quantity}`;
});

// Map of components by ID for O(1) lookups
const componentMap = computed(() => {
  const map = new Map();
  catalogComponents.value.forEach(c => {
    const id = Number(c.ID || c.id);
    if (!isNaN(id)) {
      map.set(id, c);
    }
  });
  return map;
});

function getPackageName(pkgId) {
  if (!pkgId) return '';
  const pkg = packageOptions.value.find(p => p.ID === pkgId);
  return pkg ? pkg.package : '';
}

function getDisplayComponentName(item) {
  if (!item) return '';
  if (item.createAsNew) {
    return item.newCompData?.component || item.value || '';
  }
  if (item.selectedComponentId) {
    const comp = componentMap.value.get(Number(item.selectedComponentId)) || item.matchedComponent;
    if (comp) return comp.component;
  }
  if (item.matchedComponent) {
    return item.matchedComponent.component;
  }
  return item.value || '';
}

function getDisplayPackageName(item) {
  if (!item) return '';
  if (item.createAsNew) {
    if (item.newCompData?.package_id) {
      const pkg = getPackageName(item.newCompData.package_id);
      if (pkg && pkg.toLowerCase() !== 'unknown') return pkg;
    }
    return item.footprint || '';
  }
  if (item.selectedComponentId) {
    const comp = componentMap.value.get(Number(item.selectedComponentId)) || item.matchedComponent;
    if (comp) return comp.package || getPackageName(comp.package_id);
  }
  if (item.matchedComponent) {
    return item.matchedComponent.package || getPackageName(item.matchedComponent.package_id);
  }
  return item.footprint || '';
}

const selectedCount = computed(() => {
  return mappedItems.value.filter(it => it.selected).length;
});

const totalPartsCount = computed(() => {
  return mappedItems.value.reduce((sum, it) => sum + (it.quantity || 0), 0);
});

const filteredItems = computed(() => {
  if (!searchFilter.value || !searchFilter.value.trim()) {
    return mappedItems.value;
  }
  const q = searchFilter.value.toLowerCase().trim();
  return mappedItems.value.filter(it => {
    return (it.value || '').toLowerCase().includes(q) ||
           (it.footprint || '').toLowerCase().includes(q) ||
           (it.comment || '').toLowerCase().includes(q) ||
           (it.categoryName || '').toLowerCase().includes(q);
  });
});

function getFileTypeIcon(type) {
  switch (type) {
    case 'ibom': return 'mdi-view-dashboard-outline';
    case 'image': return 'mdi-image-outline';
    case 'archive': return 'mdi-folder-zip-outline';
    case 'firmware': return 'mdi-chip';
    case 'document': return 'mdi-file-document-outline';
    case 'schematic': return 'mdi-vector-polyline';
    default: return 'mdi-file-outline';
  }
}

function getFileTypeColor(type) {
  switch (type) {
    case 'ibom': return 'primary';
    case 'image': return 'teal-darken-1';
    case 'archive': return 'amber-darken-3';
    case 'firmware': return 'purple-darken-1';
    case 'document': return 'blue-grey-darken-1';
    case 'schematic': return 'indigo-darken-1';
    default: return 'slate-600';
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadCatalogData();
  } else {
    resetDialog();
  }
});

async function loadCatalogData() {
  try {
    const [comps, cats, pkgs] = await Promise.all([
      api.getComponents({ limit: 5000 }),
      api.getCategories(),
      api.getPackages()
    ]);
    catalogComponents.value = comps?.items || (Array.isArray(comps) ? comps : []);
    categoryOptions.value = Array.isArray(cats) ? cats : (cats?.items || []);
    packageOptions.value = Array.isArray(pkgs) ? pkgs : (pkgs?.items || []);
  } catch (err) {
    console.error('Failed to load catalog reference data:', err);
  }
}

function resetDialog() {
  currentStep.value = 1;
  activeTab.value = 'bom';
  parsing.value = false;
  importing.value = false;
  uploadFile.value = null;
  tempFileId.value = null;
  projectForm.value = {
    projectName: '',
    description: '',
    url: '',
    photoUrl: '',
    tags: []
  };
  mappedItems.value = [];
  attachmentsList.value = [];
  searchFilter.value = '';
}

function closeDialog() {
  emit('update:modelValue', false);
}

function onFileSelected(event) {
  const file = event?.target?.files?.[0] || uploadFile.value;
  if (file) {
    uploadFile.value = file;
  }
}

async function parseUploadedPackage() {
  if (!uploadFile.value) return;
  const fileObj = Array.isArray(uploadFile.value) ? uploadFile.value[0] : uploadFile.value;
  if (!fileObj) return;

  parsing.value = true;
  try {
    const formData = new FormData();
    formData.append('file', fileObj);

    const res = await api.parseProjectImport(formData);

    tempFileId.value = res.tempFileId;
    projectForm.value = {
      projectName: res.project?.projectName || '',
      description: res.project?.description || '',
      url: res.project?.url || '',
      photoUrl: res.project?.photoUrl || '',
      tags: res.project?.tags || []
    };

    mappedItems.value = res.items || [];
    attachmentsList.value = res.attachments || [];

    currentStep.value = 2;
  } catch (err) {
    console.error('Error parsing project import package:', err);
    alert(err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to parse project package');
  } finally {
    parsing.value = false;
  }
}

// Open Component Picker (re-using AddComponentDialog)
function openPickerFor(item) {
  activeMapItem.value = item;
  isClonePickerMode.value = false;
  pickerInitialSearch.value = item.value || '';
  pickerInitialCategories.value = item.suggestedCategoryId ? [item.suggestedCategoryId] : [];
  pickerInitialPackages.value = item.suggestedPackageId ? [item.suggestedPackageId] : [];
  pickerDialogOpen.value = true;
}

// Open Component Picker in Clone Mode
function openClonePickerFor(item) {
  activeMapItem.value = item;
  isClonePickerMode.value = true;
  pickerInitialSearch.value = item.value || '';
  pickerInitialCategories.value = item.suggestedCategoryId ? [item.suggestedCategoryId] : [];
  pickerInitialPackages.value = item.suggestedPackageId ? [item.suggestedPackageId] : [];
  pickerDialogOpen.value = true;
}

// Callback when user picks a component from AddComponentDialog
function onComponentPicked(comp) {
  if (!activeMapItem.value || !comp) return;

  activeMapItem.value.selectedComponentId = comp.ID;
  activeMapItem.value.createAsNew = false;
  activeMapItem.value.matchConfidence = 'exact';
  activeMapItem.value.matchReason = 'Manually selected';

  if (!catalogComponents.value.some(c => c.ID === comp.ID)) {
    catalogComponents.value.unshift(comp);
  }

  pickerDialogOpen.value = false;
  activeMapItem.value = null;
}

// Callback when user picks a component to clone as a template
function onComponentToClonePicked(comp) {
  if (!activeMapItem.value || !comp) return;

  const targetItem = activeMapItem.value;
  activeNewCompItem.value = targetItem;
  activeNewCompItemIndex.value = targetItem.index;

  activeCloneCompSource.value = comp;
  isCloneMode.value = true;

  activeNewCompData.value = {
    component: targetItem.value || `${comp.component} (Copy)`,
    category_id: comp.category_id || targetItem.suggestedCategoryId || null,
    package_id: comp.package_id || targetItem.suggestedPackageId || (packageOptions.value.find(p => p.package.toLowerCase() === 'unknown')?.ID || 1),
    marking: comp.marking || targetItem.value || '',
    shortDescription: comp.shortDescription || '',
    description: comp.description || '',
    datasheetURL: comp.datasheetURL || '',
    photoURL: comp.photoURL || '',
    qty: 0
  };

  newCompDialogTitle.value = `Clone Component for ${targetItem.value}`;
  newCompDialogSubtitle.value = `Cloning from #${comp.ID} ${comp.component}`;

  pickerDialogOpen.value = false;
  createCompDialogOpen.value = true;
}

// Open Modal to Configure / Create New Component
function openNewCompModal(item) {
  activeNewCompItem.value = item;
  activeNewCompItemIndex.value = item.index;
  activeCloneCompSource.value = null;
  isCloneMode.value = false;

  const rawOrig = item.originalComponentData || {};

  activeNewCompData.value = {
    component: item.newCompData?.component || item.value || '',
    category_id: item.newCompData?.category_id || item.suggestedCategoryId || null,
    package_id: item.newCompData?.package_id || item.suggestedPackageId || (packageOptions.value.find(p => p.package.toLowerCase() === 'unknown')?.ID || 1),
    marking: item.newCompData?.marking || rawOrig.marking || '',
    shortDescription: item.newCompData?.shortDescription || rawOrig.shortDescription || '',
    description: item.newCompData?.description || rawOrig.description || '',
    datasheetURL: item.newCompData?.datasheetURL || rawOrig.datasheetURL || '',
    photoURL: item.newCompData?.photoURL || rawOrig.photoURL || '',
    qty: item.newCompData?.qty || 0
  };

  newCompDialogTitle.value = `Configure Component: ${item.value}`;
  newCompDialogSubtitle.value = `For Row #${item.index} · Package: ${item.footprint || 'N/A'}`;

  createCompDialogOpen.value = true;
}

// Callback when user saves new component from CreateComponentDialog
function onNewComponentCreated(createdComp) {
  if (!createdComp) return;

  if (activeNewCompItem.value) {
    activeNewCompItem.value.selectedComponentId = createdComp.ID || createdComp.id;
    activeNewCompItem.value.createAsNew = false;
    activeNewCompItem.value.matchConfidence = 'exact';
    activeNewCompItem.value.matchReason = 'Created in catalog';
    activeNewCompItem.value.matchedComponent = createdComp;
  }

  if (!catalogComponents.value.some(c => c.ID === (createdComp.ID || createdComp.id))) {
    catalogComponents.value.unshift(createdComp);
  }

  createCompDialogOpen.value = false;
  activeNewCompItem.value = null;
}

function matchExactAll() {
  mappedItems.value.forEach(item => {
    if (item.matchConfidence === 'exact') {
      item.selected = true;
      item.createAsNew = false;
    }
  });
}

function setAllUnmatchedToCreateNew() {
  mappedItems.value.forEach(item => {
    if (!item.selectedComponentId) {
      item.createAsNew = true;
      item.selected = true;
    }
  });
}

function toggleSelectAll() {
  const val = selectAll.value;
  mappedItems.value.forEach(it => { it.selected = val; });
}

// Execute Final Import
async function executeImport() {
  if (!projectForm.value.projectName.trim()) {
    alert(t('projects.projectNameRequired'));
    return;
  }

  const selectedItems = mappedItems.value.filter(it => it.selected);
  if (selectedItems.length === 0) {
    alert('Please select at least one component to import');
    return;
  }

  importing.value = true;
  try {
    const payload = {
      tempFileId: tempFileId.value,
      project: {
        projectName: projectForm.value.projectName.trim(),
        description: projectForm.value.description ? projectForm.value.description.trim() : null,
        url: projectForm.value.url ? projectForm.value.url.trim() : null,
        photoUrl: projectForm.value.photoUrl || null,
        tags: projectForm.value.tags || []
      },
      items: selectedItems,
      attachments: attachmentsList.value.filter(a => a.selected)
    };

    const result = await api.executeProjectImport(payload);

    emit('imported', result);
    closeDialog();
  } catch (err) {
    console.error('Failed to execute project import:', err);
    alert(err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to import project');
  } finally {
    importing.value = false;
  }
}

onMounted(() => {
  if (props.modelValue) {
    loadCatalogData();
  }
});
</script>

<style scoped>
.mapping-table :deep(tr:hover) {
  background-color: #f8fafc !important;
}

.bg-blue-50 {
  background-color: #eff6ff !important;
}

.bg-slate-50 {
  background-color: #f8fafc !important;
}

.border-b {
  border-bottom: 1px solid #e2e8f0 !important;
}

.border-t {
  border-top: 1px solid #e2e8f0 !important;
}

.comp-box-outlined {
  height: 40px;
  min-height: 40px;
  background-color: #f8fafc;
  border: 1px solid rgba(0, 0, 0, 0.38);
  border-radius: 8px;
  cursor: pointer;
  box-sizing: border-box;
  transition: all 0.15s ease-in-out;
}

.comp-box-outlined:hover {
  background-color: #f1f5f9;
  border-color: #1976d2;
}
</style>
