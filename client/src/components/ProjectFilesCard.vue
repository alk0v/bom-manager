<template>
  <v-card elevation="1" class="rounded-0 border bg-white overflow-hidden project-files-card">
    <!-- Header -->
    <v-card-item class="bg-slate-50 py-3 px-5 border-b">
      <div class="d-flex flex-wrap align-center justify-space-between gap-3">
        <div class="d-flex align-center">
          <v-icon color="primary" class="me-2">mdi-paperclip</v-icon>
          <div>
            <div class="text-subtitle-1 font-weight-bold text-slate-900 d-flex align-center">
              <span>{{ t('projectFiles.title') }}</span>
              <v-chip size="x-small" color="secondary" variant="tonal" class="ms-2 font-weight-bold">
                {{ files.length }} {{ files.length === 1 ? t('projectFiles.fileOne') : t('projectFiles.fileMany') }}
              </v-chip>
            </div>
            <div class="text-caption text-disabled">
              {{ t('projectFiles.subtitle') }}
            </div>
          </div>
        </div>

        <div class="d-flex align-center gap-2">
          <v-btn
            color="primary"
            prepend-icon="mdi-upload"
            size="small"
            class="font-weight-bold"
            @click="openUploadDialog"
          >
            {{ t('projectFiles.uploadFile') }}
          </v-btn>
          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="outlined"
            :loading="loading"
            :title="t('dialogs.refreshFiles')"
            @click="loadFiles"
          />
        </div>
      </div>
    </v-card-item>

    <!-- Empty State -->
    <div v-if="!loading && files.length === 0" class="pa-8 text-center bg-white">
      <v-avatar size="56" color="slate-100" class="mb-3 text-slate-400">
        <v-icon size="28">mdi-folder-upload-outline</v-icon>
      </v-avatar>
      <div class="text-subtitle-1 font-weight-medium text-slate-800 mb-1">
        {{ t('projectFiles.emptyTitle') }}
      </div>
      <div class="text-caption text-slate-500 mb-4" style="max-width: 480px; margin: 0 auto;">
        {{ t('projectFiles.emptySubtitle') }}
      </div>
      <v-btn
        color="primary"
        variant="flat"
        size="small"
        prepend-icon="mdi-upload"
        class="font-weight-bold"
        @click="openUploadDialog"
      >
        {{ t('projectFiles.uploadFirstFile') }}
      </v-btn>
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="loading && files.length === 0" class="pa-4">
      <v-skeleton-loader type="table-row-divider@3" />
    </div>

    <!-- Files Table -->
    <v-table v-else density="comfortable" hover class="files-table">
      <thead>
        <tr class="bg-slate-50">
          <th class="text-left font-weight-bold" style="width: 140px;">{{ t('projectFiles.colType') }}</th>
          <th class="text-left font-weight-bold">{{ t('projectFiles.colFileName') }}</th>
          <th class="text-left font-weight-bold">{{ t('projectFiles.colDescription') }}</th>
          <th class="text-center font-weight-bold" style="width: 110px;">{{ t('projectFiles.colSize') }}</th>
          <th class="text-center font-weight-bold" style="width: 140px;">{{ t('projectFiles.colUploaded') }}</th>
          <th class="text-left font-weight-bold" style="width: 240px;">{{ t('projectFiles.colActions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="file in files" :key="file.id" class="file-row">
          <!-- File Type Badge -->
          <td>
            <v-chip
              size="small"
              :color="getTypeMeta(file.fileType).color"
              variant="tonal"
              class="font-weight-medium"
            >
              <v-icon start size="14">{{ getTypeMeta(file.fileType).icon }}</v-icon>
              {{ getTypeMeta(file.fileType).label }}
            </v-chip>
          </td>

          <!-- File Name -->
          <td>
            <div class="d-flex align-center">
              <span class="font-weight-medium text-slate-900 file-name-text" :title="file.originalName">
                {{ file.originalName }}
              </span>
              <v-chip
                v-if="file.fileType === 'ibom'"
                size="x-small"
                color="success"
                variant="flat"
                class="ms-2 font-weight-bold"
              >
                KiCAD
              </v-chip>
            </div>
          </td>

          <!-- Description -->
          <td>
            <span v-if="file.description" class="text-body-2 text-slate-600">
              {{ file.description }}
            </span>
            <span v-else class="text-disabled text-caption">—</span>
          </td>

          <!-- Size -->
          <td class="text-center font-mono text-caption text-slate-700">
            {{ formatFileSize(file.fileSize) }}
          </td>

          <!-- Uploaded Date -->
          <td class="text-center text-caption text-slate-500">
            {{ formatDate(file.uploadedAt) }}
          </td>

          <!-- Actions -->
          <td class="text-left">
            <div class="d-flex align-center justify-start gap-1">
              <!-- Special iBOM Actions -->
              <template v-if="file.fileType === 'ibom'">
                <v-btn
                  v-if="file.url"
                  :href="file.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  variant="tonal"
                  color="success"
                  prepend-icon="mdi-open-in-new"
                  class="font-weight-bold me-1"
                  :title="t('dialogs.viewIbomTooltip')"
                >
                  {{ t('projectFiles.viewIbom') }}
                </v-btn>

                <v-btn
                  size="small"
                  variant="flat"
                  color="primary"
                  prepend-icon="mdi-database-import-outline"
                  class="font-weight-bold me-1"
                  :title="t('dialogs.importIbomTooltip')"
                  @click="$emit('import-ibom', file)"
                >
                  {{ t('projectFiles.importBom') }}
                </v-btn>
              </template>

              <!-- Download Button -->
              <v-btn
                :href="`/api/projects/${projectId}/files/${file.id}/download`"
                download
                icon="mdi-download"
                size="small"
                variant="text"
                color="primary"
                :title="t('dialogs.downloadFile')"
              />

              <!-- Delete Button -->
              <v-btn
                icon="mdi-delete-outline"
                size="small"
                variant="text"
                color="error"
                :title="t('dialogs.deleteAttachment')"
                @click="confirmDelete(file)"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Upload Dialog -->
    <v-dialog v-model="uploadDialog" max-width="520" persistent>
      <v-card class="rounded-0 border bg-white">
        <v-card-item class="bg-slate-50 py-3 px-5 border-b">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon color="primary" class="me-2">mdi-upload</v-icon>
              <span class="text-subtitle-1 font-weight-bold text-slate-900">{{ t('projectFiles.attachModalTitle') }}</span>
            </div>
            <v-btn icon="mdi-close" variant="text" size="small" @click="closeUploadDialog" />
          </div>
        </v-card-item>

        <v-card-text class="pa-5">
          <!-- File Input -->
          <v-file-input
            v-model="uploadFile"
            :label="t('projectFiles.selectFile')"
            variant="outlined"
            density="comfortable"
            prepend-icon="mdi-paperclip"
            show-size
            class="mb-3"
            :rules="[v => !!v || t('projectFiles.pleaseSelectFile')]"
            @update:model-value="onFileSelected"
          />

          <!-- Detected or Chosen File Type -->
          <v-select
            v-model="selectedFileType"
            :items="fileTypeOptions"
            item-title="label"
            item-value="value"
            :label="t('projectFiles.fileTypeCategory')"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props" :prepend-icon="item.raw.icon" />
            </template>
            <template #prepend-inner>
              <v-icon size="20" color="primary">{{ currentTypeIcon }}</v-icon>
            </template>
          </v-select>

          <!-- Description -->
          <v-text-field
            v-model="uploadDescription"
            :label="t('projectFiles.descriptionNotesOptional')"
            :placeholder="t('projectFiles.descriptionPlaceholder')"
            variant="outlined"
            density="comfortable"
            counter="500"
          />

          <!-- Helpful note -->
          <v-alert
            v-if="selectedFileType === 'ibom'"
            type="info"
            variant="tonal"
            density="compact"
            class="mt-2 text-caption"
            icon="mdi-information-outline"
          >
            {{ t('projectFiles.ibomHint') }}
          </v-alert>
        </v-card-text>

        <v-card-actions class="px-5 py-3 border-t bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="outlined" size="small" @click="closeUploadDialog">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold"
            prepend-icon="mdi-upload"
            :loading="uploading"
            :disabled="!uploadFile"
            @click="submitUpload"
          >
            {{ t('projectFiles.uploadFile') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card class="rounded-0 border bg-white">
        <v-card-item class="bg-slate-50 py-3 px-5 border-b">
          <div class="d-flex align-center">
            <v-icon color="error" class="me-2">mdi-alert-circle-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold text-slate-900">{{ t('projectFiles.deleteConfirmTitle') }}</span>
          </div>
        </v-card-item>
        <v-card-text class="pa-5 text-body-2 text-slate-700">
          {{ t('projectFiles.deleteConfirmMessage', { name: fileToDelete?.originalName }) }}
        </v-card-text>
        <v-card-actions class="px-5 py-3 border-t bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="outlined" size="small" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="flat" size="small" class="font-weight-bold" :loading="deleting" @click="executeDelete">
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from '../services/api';

const { t } = useI18n();

const props = defineProps({
  projectId: {
    type: Number,
    required: true
  },
  projectName: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['import-ibom', 'files-updated']);

const files = ref([]);
const loading = ref(false);

// Upload state
const uploadDialog = ref(false);
const uploadFile = ref(null);
const selectedFileType = ref('other');
const uploadDescription = ref('');
const uploading = ref(false);

// Delete state
const deleteDialog = ref(false);
const fileToDelete = ref(null);
const deleting = ref(false);

const fileTypeOptions = computed(() => [
  { value: 'ibom', label: t('projectFiles.typeIbom'), icon: 'mdi-chip', color: 'success' },
  { value: 'archive', label: t('projectFiles.typeArchive'), icon: 'mdi-folder-zip-outline', color: 'amber-darken-3' },
  { value: 'firmware', label: t('projectFiles.typeFirmware'), icon: 'mdi-memory', color: 'purple-darken-2' },
  { value: 'document', label: t('projectFiles.typeDocument'), icon: 'mdi-file-document-outline', color: 'info' },
  { value: 'schematic', label: t('projectFiles.typeSchematic'), icon: 'mdi-drawing-box', color: 'teal-darken-2' },
  { value: 'other', label: t('projectFiles.typeOther'), icon: 'mdi-file-outline', color: 'slate-600' }
]);

const currentTypeIcon = computed(() => {
  const opt = fileTypeOptions.value.find(o => o.value === selectedFileType.value);
  return opt ? opt.icon : 'mdi-file-outline';
});

function getTypeMeta(type) {
  const opt = fileTypeOptions.value.find(o => o.value === type);
  if (opt) return opt;
  return { label: type || t('common.other'), icon: 'mdi-file-outline', color: 'slate-600' };
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (_) {
    return isoString;
  }
}

async function loadFiles() {
  if (!props.projectId) return;
  loading.value = true;
  try {
    const data = await api.getProjectFiles(props.projectId);
    files.value = data || [];
    emit('files-updated', files.value);
  } catch (error) {
    console.error('Failed to load project files:', error);
  } finally {
    loading.value = false;
  }
}

function openUploadDialog() {
  uploadFile.value = null;
  selectedFileType.value = 'other';
  uploadDescription.value = '';
  uploadDialog.value = true;
}

function closeUploadDialog() {
  uploadDialog.value = false;
  uploadFile.value = null;
}

function onFileSelected(val) {
  if (!val) return;
  const fileObj = Array.isArray(val) ? val[0] : val;
  if (!fileObj || !fileObj.name) return;

  const name = fileObj.name.toLowerCase();
  if (name.includes('ibom') || (name.endsWith('.html') && name.includes('bom'))) {
    selectedFileType.value = 'ibom';
  } else if (name.endsWith('.zip') || name.endsWith('.7z') || name.endsWith('.tar') || name.endsWith('.gz')) {
    selectedFileType.value = 'archive';
  } else if (name.endsWith('.bin') || name.endsWith('.hex') || name.endsWith('.rom') || name.endsWith('.elf')) {
    selectedFileType.value = 'firmware';
  } else if (name.endsWith('.pdf')) {
    selectedFileType.value = 'document';
  } else if (name.endsWith('.kicad_pcb') || name.endsWith('.kicad_sch') || name.endsWith('.sch') || name.endsWith('.brd')) {
    selectedFileType.value = 'schematic';
  } else if (name.endsWith('.html') || name.endsWith('.htm')) {
    selectedFileType.value = 'ibom';
  } else {
    selectedFileType.value = 'other';
  }
}

async function submitUpload() {
  if (!uploadFile.value || !props.projectId) return;

  const fileObj = Array.isArray(uploadFile.value) ? uploadFile.value[0] : uploadFile.value;
  if (!fileObj) return;

  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', fileObj);
    formData.append('fileType', selectedFileType.value);
    formData.append('description', uploadDescription.value);

    await api.uploadProjectFile(props.projectId, formData);
    closeUploadDialog();
    await loadFiles();
  } catch (error) {
    console.error('File upload failed:', error);
    alert(error.response?.data?.error || error.message || 'File upload failed');
  } finally {
    uploading.value = false;
  }
}

function confirmDelete(file) {
  fileToDelete.value = file;
  deleteDialog.value = true;
}

async function executeDelete() {
  if (!fileToDelete.value || !props.projectId) return;
  deleting.value = true;
  try {
    await api.deleteProjectFile(props.projectId, fileToDelete.value.id);
    deleteDialog.value = false;
    fileToDelete.value = null;
    await loadFiles();
  } catch (error) {
    console.error('Failed to delete file:', error);
    alert(error.response?.data?.error || error.message || 'Failed to delete file');
  } finally {
    deleting.value = false;
  }
}

defineExpose({
  loadFiles,
  files
});

onMounted(() => {
  loadFiles();
});
</script>

<style scoped>
.file-name-text {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.files-table :deep(tr:hover) {
  background-color: #f8fafc !important;
}
</style>
