<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="620"
    scrollable
    transition="dialog-transition"
  >
    <v-card class="rounded-0 border bg-white overflow-hidden">
      <!-- Header -->
      <v-card-title class="bg-slate-50 py-3 px-5 border-b d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon color="primary" class="me-2" size="22">
            {{ isEdit ? 'mdi-folder-edit-outline' : 'mdi-folder-plus-outline' }}
          </v-icon>
          <span class="text-subtitle-1 font-weight-bold text-slate-900">
            {{ isEdit ? 'Edit Project' : 'New Hardware Project' }}
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

      <!-- Form Body -->
      <v-card-text class="pa-5 overflow-y-auto">
        <v-form ref="formRef" @submit.prevent="handleSubmit">
          <!-- Project Name (Required) -->
          <div class="mb-4">
            <div class="text-caption font-weight-bold text-slate-700 text-uppercase mb-1">
              Project Name <span class="text-error">*</span>
            </div>
            <v-text-field
              v-model="form.projectName"
              placeholder="e.g. MC-1502 RAM Module, BlueSCSI v2"
              density="comfortable"
              variant="outlined"
              :rules="[v => !!v?.trim() || 'Project name is required']"
              rounded="lg"
              hide-details="auto"
              autofocus
            />
          </div>

          <!-- Description -->
          <div class="mb-4">
            <div class="text-caption font-weight-bold text-slate-700 text-uppercase mb-1">
              Description / Notes
            </div>
            <v-textarea
              v-model="form.description"
              placeholder="Architecture summary, revisions, board features, or build notes..."
              density="comfortable"
              variant="outlined"
              rows="3"
              auto-grow
              rounded="lg"
              hide-details="auto"
            />
          </div>

          <!-- Documentation / Repository Link -->
          <div class="mb-4">
            <div class="text-caption font-weight-bold text-slate-700 text-uppercase mb-1">
              Project URL
            </div>
            <v-text-field
              v-model="form.url"
              placeholder="https://github.com/username/project"
              density="comfortable"
              variant="outlined"
              prepend-inner-icon="mdi-link-variant"
              rounded="lg"
              hide-details="auto"
            >
              <template #append-inner v-if="form.url">
                <v-btn
                  icon="mdi-open-in-new"
                  size="x-small"
                  variant="text"
                  color="primary"
                  :href="form.url"
                  target="_blank"
                  title="Open link preview in new tab"
                  @click.stop
                />
              </template>
            </v-text-field>
          </div>

          <!-- Photo URL / Filename -->
          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption font-weight-bold text-slate-700 text-uppercase">
                Photo Filename or URL
              </span>
              <span class="text-caption text-slate-400">
                Folder: media/projects/
              </span>
            </div>
            <div class="d-flex align-center gap-2">
              <v-text-field
                v-model="form.photoUrl"
                placeholder="e.g. mc1502.jpg or https://..."
                density="comfortable"
                variant="outlined"
                prepend-inner-icon="mdi-camera-outline"
                rounded="lg"
                hide-details="auto"
                clearable
                class="flex-grow-1"
              />
              <v-btn
                variant="tonal"
                color="primary"
                size="default"
                prepend-icon="mdi-upload"
                :loading="uploadingPhoto"
                @click="fileInputRef?.click()"
                title="Upload image to media/projects/"
              >
                Upload
              </v-btn>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                style="display: none;"
                @change="handlePhotoUpload"
              />
            </div>
            <div class="text-caption text-disabled mt-1">
              Upload an image or enter a relative filename in <code class="font-mono text-slate-600">media/projects/</code>.
            </div>
          </div>

          <!-- Live Image Preview -->
          <div class="mb-2">
            <div class="text-caption font-weight-bold text-slate-700 text-uppercase mb-1">
              Photo Preview
            </div>
            <div class="photo-preview-box rounded border bg-slate-50 d-flex align-center justify-center overflow-hidden">
              <MediaImage
                v-if="form.photoUrl?.trim()"
                type="project"
                :src="form.photoUrl.trim()"
                height="170px"
                width="100%"
                :cover="false"
              />
              <div v-else class="text-center py-8 text-disabled">
                <v-icon size="40" class="mb-2 text-slate-300">mdi-image-outline</v-icon>
                <div class="text-caption text-slate-400">
                  Enter a filename or URL above to preview image
                </div>
              </div>
            </div>
          </div>
        </v-form>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions class="pa-4 bg-slate-50 d-flex align-center justify-space-between">
        <v-btn
          variant="outlined"
          color="slate-600"
          size="small"
          @click="close"
          :disabled="submitting"
        >
          Cancel
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          size="small"
          class="font-weight-bold"
          :loading="submitting"
          :prepend-icon="isEdit ? 'mdi-check' : 'mdi-plus'"
          @click="handleSubmit"
        >
          {{ isEdit ? 'Save Changes' : 'Create Project' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import api from '../services/api';
import MediaImage from './MediaImage.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  project: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'saved']);

const formRef = ref(null);
const fileInputRef = ref(null);
const submitting = ref(false);
const uploadingPhoto = ref(false);

const handlePhotoUpload = async (event) => {
  const selected = event.target?.files?.[0];
  if (!selected) return;

  uploadingPhoto.value = true;
  try {
    const res = await api.uploadMedia('projects', selected);
    form.photoUrl = res.filename;
  } catch (err) {
    console.error('Failed to upload project photo:', err);
    alert('Failed to upload photo: ' + (err.response?.data?.error || err.message));
  } finally {
    uploadingPhoto.value = false;
    if (event.target) event.target.value = '';
  }
};

const isEdit = computed(() => !!props.project && !!props.project.id);

const form = reactive({
  projectName: '',
  description: '',
  url: '',
  photoUrl: ''
});

const resetForm = () => {
  if (props.project) {
    form.projectName = props.project.projectName || '';
    form.description = props.project.description || '';
    form.url = props.project.url || '';
    form.photoUrl = props.project.photoUrl || '';
  } else {
    form.projectName = '';
    form.description = '';
    form.url = '';
    form.photoUrl = '';
  }
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      resetForm();
    }
  }
);

watch(
  () => props.project,
  () => {
    if (props.modelValue) {
      resetForm();
    }
  }
);

const close = () => {
  emit('update:modelValue', false);
};

const handleSubmit = async () => {
  if (formRef.value) {
    const { valid } = await formRef.value.validate();
    if (!valid) return;
  }

  if (!form.projectName.trim()) return;

  submitting.value = true;
  try {
    const payload = {
      projectName: form.projectName.trim(),
      description: (form.description || '').trim(),
      url: (form.url || '').trim(),
      photoUrl: (form.photoUrl || '').trim()
    };

    let savedProject;
    if (isEdit.value) {
      await api.updateProject(props.project.id, payload);
      savedProject = { ...props.project, ...payload };
    } else {
      savedProject = await api.createProject(payload);
    }

    emit('saved', { project: savedProject, isEdit: isEdit.value });
    close();
  } catch (err) {
    console.error('Error saving project:', err);
    alert('Failed to save project: ' + (err.response?.data?.details || err.message));
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.photo-preview-box {
  min-height: 170px;
  background-color: #F8FAFC;
}
</style>
