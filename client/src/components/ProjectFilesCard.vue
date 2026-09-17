<template>
  <v-card elevation="1" class="rounded-0 border bg-white overflow-hidden project-files-card">
    <!-- Header -->
    <v-card-item class="bg-slate-50 py-3 px-5 border-b">
      <div class="d-flex flex-wrap align-center justify-space-between gap-3">
        <div class="d-flex align-center">
          <v-icon color="primary" class="me-2">mdi-paperclip</v-icon>
          <div>
            <div class="text-subtitle-1 font-weight-bold text-slate-900 d-flex align-center">
              <span>Project Files & Attachments</span>
              <v-chip size="x-small" color="secondary" variant="tonal" class="ms-2 font-weight-bold">
                {{ files.length }} {{ files.length === 1 ? 'file' : 'files' }}
              </v-chip>
            </div>
            <div class="text-caption text-disabled">
              Attach KiCAD iBOM HTML, Gerber ZIPs, ROM firmware, schematics, and project documentation
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
            Upload File
          </v-btn>
          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="outlined"
            :loading="loading"
            title="Refresh files"
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
        No files attached yet
      </div>
      <div class="text-caption text-slate-500 mb-4" style="max-width: 480px; margin: 0 auto;">
        Keep your hardware project files together: attach KiCAD Interactive HTML BOMs, Gerber zip archives, ROM/firmware files, and schematics.
      </div>
      <v-btn
        color="primary"
        variant="flat"
        size="small"
        prepend-icon="mdi-upload"
        class="font-weight-bold"
        @click="openUploadDialog"
      >
        Upload First File
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
          <th class="text-left font-weight-bold" style="width: 140px;">Type</th>
          <th class="text-left font-weight-bold">File Name</th>
          <th class="text-left font-weight-bold">Description</th>
          <th class="text-center font-weight-bold" style="width: 110px;">Size</th>
          <th class="text-center font-weight-bold" style="width: 140px;">Uploaded</th>
          <th class="text-right font-weight-bold" style="width: 240px;">Actions</th>
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
          <td class="text-right">
            <div class="d-flex align-center justify-end gap-1">
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
                  title="Open KiCAD Interactive BOM in a new browser window"
                >
                  View iBOM
                </v-btn>

                <v-btn
                  size="small"
                  variant="flat"
                  color="primary"
                  prepend-icon="mdi-database-import-outline"
                  class="font-weight-bold me-1"
                  title="Import parts from this iBOM into project BOM"
                  @click="$emit('import-ibom', file)"
                >
                  Import BOM
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
                title="Download file"
              />

              <!-- Delete Button -->
              <v-btn
                icon="mdi-delete-outline"
                size="small"
                variant="text"
                color="error"
                title="Delete attachment"
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
              <span class="text-subtitle-1 font-weight-bold text-slate-900">Attach File to Project</span>
            </div>
            <v-btn icon="mdi-close" variant="text" size="small" @click="closeUploadDialog" />
          </div>
        </v-card-item>

        <v-card-text class="pa-5">
          <!-- File Input -->
          <v-file-input
            v-model="uploadFile"
            label="Select file *"
            variant="outlined"
            density="comfortable"
            prepend-icon="mdi-paperclip"
            show-size
            class="mb-3"
            :rules="[v => !!v || 'Please select a file']"
            @update:model-value="onFileSelected"
          />

          <!-- Detected or Chosen File Type -->
          <v-select
            v-model="selectedFileType"
            :items="fileTypeOptions"
            item-title="label"
            item-value="value"
            label="File Type / Category"
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
            label="Description / Notes (optional)"
            placeholder="e.g. KiCAD v8 interactive board BOM, Gerber v1.2..."
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
            KiCAD Interactive HTML BOMs allow interactive visual assembly in browser and can be imported directly into the project BOM.
          </v-alert>
        </v-card-text>

        <v-card-actions class="px-5 py-3 border-t bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="outlined" size="small" @click="closeUploadDialog">
            Cancel
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
            Upload File
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
            <span class="text-subtitle-1 font-weight-bold text-slate-900">Confirm Deletion</span>
          </div>
        </v-card-item>
        <v-card-text class="pa-5 text-body-2 text-slate-700">
          Are you sure you want to delete <strong class="text-slate-900">{{ fileToDelete?.originalName }}</strong>?
          This file will be permanently removed from disk.
        </v-card-text>
        <v-card-actions class="px-5 py-3 border-t bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="outlined" size="small" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" size="small" class="font-weight-bold" :loading="deleting" @click="executeDelete">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../services/api';

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

const fileTypeOptions = [
  { value: 'ibom', label: 'KiCAD iBOM (Interactive BOM)', icon: 'mdi-chip', color: 'success' },
  { value: 'archive', label: 'Gerbers / Archive (.zip, .7z)', icon: 'mdi-folder-zip-outline', color: 'amber-darken-3' },
  { value: 'firmware', label: 'ROM / Firmware (.bin, .hex)', icon: 'mdi-memory', color: 'purple-darken-2' },
  { value: 'document', label: 'Datasheet / Document (.pdf)', icon: 'mdi-file-document-outline', color: 'info' },
  { value: 'schematic', label: 'CAD / Schematic (.sch, .pcb)', icon: 'mdi-drawing-box', color: 'teal-darken-2' },
  { value: 'other', label: 'Other File', icon: 'mdi-file-outline', color: 'slate-600' }
];

const currentTypeIcon = computed(() => {
  const opt = fileTypeOptions.find(o => o.value === selectedFileType.value);
  return opt ? opt.icon : 'mdi-file-outline';
});

function getTypeMeta(type) {
  const opt = fileTypeOptions.find(o => o.value === type);
  if (opt) return opt;
  return { label: type || 'Other', icon: 'mdi-file-outline', color: 'slate-600' };
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
