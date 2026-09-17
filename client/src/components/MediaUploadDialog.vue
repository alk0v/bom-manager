<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="580"
    scrollable
    transition="dialog-transition"
  >
    <v-card class="rounded-0 border bg-white overflow-hidden">
      <!-- Modal Header -->
      <v-card-title class="bg-slate-50 py-3 px-5 border-b d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon color="primary" class="me-2" size="22">mdi-cloud-upload-outline</v-icon>
          <span class="text-subtitle-1 font-weight-bold text-slate-900">
            Upload Media Asset
          </span>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          density="comfortable"
          @click="close"
        />
      </v-card-title>

      <!-- Modal Body -->
      <v-card-text class="pa-5 overflow-y-auto">
        <!-- Target Folder Selector -->
        <div class="mb-4">
          <div class="text-caption font-weight-bold text-slate-700 text-uppercase mb-2">
            Select Destination Folder <span class="text-error">*</span>
          </div>
          <v-row dense>
            <v-col
              v-for="opt in folderOptions"
              :key="opt.value"
              cols="6"
              sm="3"
            >
              <v-card
                variant="outlined"
                class="pa-3 text-center cursor-pointer transition-all folder-card h-100 d-flex flex-column align-center justify-center"
                :class="{ 'border-primary bg-blue-50 text-primary active-folder': selectedFolder === opt.value }"
                @click="selectedFolder = opt.value"
              >
                <v-icon :icon="opt.icon" size="28" :color="selectedFolder === opt.value ? 'primary' : 'slate-500'" class="mb-1" />
                <div class="text-caption font-weight-bold text-truncate w-100">
                  {{ opt.label }}
                </div>
                <div class="text-caption text-disabled font-mono" style="font-size: 0.65rem;">
                  media/{{ opt.value }}/
                </div>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- File Picker / Dropzone -->
        <div class="mb-4">
          <div class="text-caption font-weight-bold text-slate-700 text-uppercase mb-1">
            Select File <span class="text-error">*</span>
          </div>
          <v-file-input
            v-model="file"
            label="Choose media file..."
            density="comfortable"
            variant="outlined"
            rounded="lg"
            :accept="acceptPattern"
            prepend-icon=""
            prepend-inner-icon="mdi-paperclip"
            show-size
            hide-details="auto"
            @update:model-value="onFileSelected"
          />
          <div class="text-caption text-disabled mt-1">
            Allowed: {{ selectedFolder === 'datasheets' ? 'PDF files (.pdf)' : 'Images (.png, .jpg, .jpeg, .webp, .svg, .gif)' }}
          </div>
        </div>

        <!-- Optional Custom Filename -->
        <div class="mb-4" v-if="file">
          <div class="text-caption font-weight-bold text-slate-700 text-uppercase mb-1">
            Target Filename (Optional)
          </div>
          <v-text-field
            v-model="customFilename"
            placeholder="e.g. stm32f103.pdf or mc1502.jpg"
            density="comfortable"
            variant="outlined"
            rounded="lg"
            prepend-inner-icon="mdi-rename-box"
            hide-details="auto"
          />
          <div class="text-caption text-disabled mt-1">
            Destination: <code class="font-mono text-slate-700">media/{{ selectedFolder }}/{{ effectiveFilename || 'filename.ext' }}</code>
          </div>
        </div>

        <!-- Local Preview (before upload) -->
        <div class="mb-2" v-if="localPreviewUrl">
          <div class="text-caption font-weight-bold text-slate-700 text-uppercase mb-1">
            Local Preview
          </div>
          <div class="preview-box border rounded bg-slate-50 d-flex align-center justify-center pa-2 overflow-hidden">
            <img
              :src="localPreviewUrl"
              alt="Preview"
              style="max-height: 180px; max-width: 100%; object-fit: contain;"
            />
          </div>
        </div>

        <!-- Success Result Card -->
        <v-alert
          v-if="uploadResult"
          type="success"
          variant="tonal"
          class="rounded-lg mb-2"
          density="comfortable"
        >
          <div class="font-weight-bold text-subtitle-2 mb-1">
            Uploaded Successfully!
          </div>
          <div class="text-caption mb-2">
            File stored at: <code class="font-mono bg-white px-1 py-0.5 border rounded">media/{{ uploadResult.folder }}/{{ uploadResult.filename }}</code>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <v-btn
              size="x-small"
              variant="flat"
              color="success"
              prepend-icon="mdi-content-copy"
              @click="copyToClipboard(uploadResult.filename, 'Filename')"
            >
              Copy Filename
            </v-btn>
            <v-btn
              size="x-small"
              variant="outlined"
              color="success"
              prepend-icon="mdi-link"
              @click="copyToClipboard(uploadResult.url, 'URL')"
            >
              Copy Relative URL
            </v-btn>
            <v-btn
              size="x-small"
              variant="text"
              color="slate-700"
              :href="uploadResult.url"
              target="_blank"
              prepend-icon="mdi-open-in-new"
            >
              Open File
            </v-btn>
          </div>
        </v-alert>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions class="pa-4 bg-slate-50 d-flex align-center justify-space-between">
        <v-btn
          variant="outlined"
          color="slate-600"
          size="small"
          @click="close"
          :disabled="uploading"
        >
          {{ uploadResult ? 'Done' : 'Cancel' }}
        </v-btn>

        <div class="d-flex align-center gap-2">
          <v-btn
            v-if="uploadResult"
            variant="outlined"
            size="small"
            color="primary"
            prepend-icon="mdi-plus"
            @click="reset"
          >
            Upload Another
          </v-btn>

          <v-btn
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold"
            :loading="uploading"
            :disabled="!file"
            prepend-icon="mdi-cloud-upload"
            @click="handleUpload"
          >
            Upload to {{ selectedFolder }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>

    <!-- Copied feedback snackbar -->
    <v-snackbar v-model="copiedSnackbar" timeout="2000" color="primary" location="bottom">
      {{ copiedText }}
    </v-snackbar>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import api from '../services/api';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  initialFolder: {
    type: String,
    default: 'projects'
  }
});

const emit = defineEmits(['update:modelValue', 'uploaded']);

const folderOptions = [
  { value: 'projects', label: 'Projects', icon: 'mdi-folder-image' },
  { value: 'components', label: 'Components', icon: 'mdi-integrated-circuit-chip' },
  { value: 'datasheets', label: 'Datasheets', icon: 'mdi-file-pdf-box' },
  { value: 'packages', label: 'Packages', icon: 'mdi-package-variant' }
];

const selectedFolder = ref(props.initialFolder || 'projects');
const file = ref(null);
const customFilename = ref('');
const localPreviewUrl = ref('');
const uploading = ref(false);
const uploadResult = ref(null);

const copiedSnackbar = ref(false);
const copiedText = ref('');

const acceptPattern = computed(() => {
  if (selectedFolder.value === 'datasheets') {
    return '.pdf,application/pdf';
  }
  return 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif,.png,.jpg,.jpeg,.webp,.svg,.gif';
});

const effectiveFilename = computed(() => {
  if (customFilename.value.trim()) {
    return customFilename.value.trim();
  }
  const f = Array.isArray(file.value) ? file.value[0] : file.value;
  return f ? f.name : '';
});

watch(
  () => props.initialFolder,
  (val) => {
    if (val) selectedFolder.value = val;
  }
);

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      if (props.initialFolder) selectedFolder.value = props.initialFolder;
      uploadResult.value = null;
    } else {
      clearPreview();
    }
  }
);

const onFileSelected = (newFile) => {
  const actualFile = Array.isArray(newFile) ? newFile[0] : newFile;
  clearPreview();
  if (actualFile) {
    customFilename.value = actualFile.name;
    if (actualFile.type.startsWith('image/')) {
      localPreviewUrl.value = URL.createObjectURL(actualFile);
    }
  } else {
    customFilename.value = '';
  }
};

const clearPreview = () => {
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value);
    localPreviewUrl.value = '';
  }
};

const reset = () => {
  file.value = null;
  customFilename.value = '';
  uploadResult.value = null;
  clearPreview();
};

const close = () => {
  emit('update:modelValue', false);
};

const handleUpload = async () => {
  const actualFile = Array.isArray(file.value) ? file.value[0] : file.value;
  if (!actualFile) return;

  uploading.value = true;
  try {
    const res = await api.uploadMedia(selectedFolder.value, actualFile, customFilename.value.trim() || undefined);
    uploadResult.value = res;
    emit('uploaded', res);
  } catch (err) {
    console.error('Upload failed:', err);
    alert('Upload failed: ' + (err.response?.data?.error || err.message));
  } finally {
    uploading.value = false;
  }
};

const copyToClipboard = async (text, label) => {
  try {
    await navigator.clipboard.writeText(text);
    copiedText.value = `${label} copied to clipboard!`;
    copiedSnackbar.value = true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
  }
};
</script>

<style scoped>
.folder-card {
  transition: all 0.2s ease;
  border-radius: 8px;
}
.folder-card:hover {
  border-color: rgb(var(--v-theme-primary));
}
.active-folder {
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}
.preview-box {
  min-height: 120px;
}
</style>
