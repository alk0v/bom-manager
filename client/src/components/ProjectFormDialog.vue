<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    width="92vw"
    max-width="850"
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
            {{ isEdit ? t('dialogs.editProject') : t('dialogs.newProject') }}
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
              {{ t('dialogs.projectName') }} <span class="text-error">*</span>
            </div>
            <v-text-field
              v-model="form.projectName"
              :placeholder="t('dialogs.projectNamePlaceholder')"
              density="comfortable"
              variant="outlined"
              :rules="[v => !!v?.trim() || t('dialogs.projectNameRequired')]"
              rounded="lg"
              hide-details="auto"
              autofocus
            />
          </div>

          <!-- Description -->
          <div class="mb-4">
            <div class="text-caption font-weight-bold text-slate-700 text-uppercase mb-1">
              {{ t('dialogs.projectDescription') }}
            </div>
            <v-textarea
              v-model="form.description"
              :placeholder="t('dialogs.projectDescriptionPlaceholder')"
              density="comfortable"
              variant="outlined"
              rows="3"
              auto-grow
              rounded="lg"
              hide-details="auto"
            />
          </div>

          <!-- Project Tags -->
          <div class="mb-4">
            <div class="text-caption font-weight-bold text-slate-700 text-uppercase mb-1">
              {{ t('dialogs.projectTags') }}
            </div>
            <v-combobox
              v-model="form.tags"
              v-model:search="tagSearchInput"
              :items="availableTagNames"
              :placeholder="t('dialogs.projectTagsPlaceholder')"
              multiple
              chips
              closable-chips
              density="comfortable"
              variant="outlined"
              rounded="lg"
              prepend-inner-icon="mdi-tag-multiple-outline"
              hide-details="auto"
              :hint="t('projects.addTagHint')"
              persistent-hint
              @blur="handleTagBlur"
              @keydown.enter.prevent.stop="handleTagKeydown"
            >
              <template #chip="{ props, item }">
                <v-chip
                  v-bind="props"
                  size="small"
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-tag-outline"
                  class="font-weight-medium ps-2 pe-3"
                >
                  {{ item.raw }}
                </v-chip>
              </template>
            </v-combobox>
          </div>

          <!-- Documentation / Repository Link -->
          <div class="mb-4">
            <div class="text-caption font-weight-bold text-slate-700 text-uppercase mb-1">
              {{ t('dialogs.projectUrl') }}
            </div>
            <v-text-field
              v-model="form.url"
              :placeholder="t('dialogs.projectUrlPlaceholder')"
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
                  :title="t('dialogs.testLinkNewTab')"
                  @click.stop
                />
              </template>
            </v-text-field>
          </div>

          <!-- Photo URL / Filename -->
          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption font-weight-bold text-slate-700 text-uppercase">
                {{ t('dialogs.photoFilenameOrUrl') }}
              </span>
              <span class="text-caption text-slate-400">
                {{ t('dialogs.photoFolderHint', { folder: 'media/projects/' }) }}
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
                :title="t('common.upload')"
              >
                {{ t('common.upload') }}
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
              {{ t('dialogs.photoUploadHint', { folder: 'media/projects/' }) }}
            </div>
          </div>

          <!-- Live Image Preview -->
          <div class="mb-2">
            <div class="text-caption font-weight-bold text-slate-700 text-uppercase mb-1">
              {{ t('dialogs.photoPreview') }}
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
                  {{ t('dialogs.photoPreviewPlaceholder') }}
                </div>
              </div>
            </div>
          </div>
        </v-form>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions class="pa-4 bg-slate-50 d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2">
          <v-btn
            variant="outlined"
            color="slate-600"
            size="small"
            @click="close"
            :disabled="submitting"
          >
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            v-if="isEdit"
            variant="text"
            color="error"
            size="small"
            prepend-icon="mdi-delete-outline"
            @click="emit('delete')"
          >
            {{ t('common.delete') }}
          </v-btn>
        </div>

        <v-btn
          color="primary"
          variant="flat"
          size="small"
          class="font-weight-bold"
          :loading="submitting"
          @click="handleSubmit"
        >
          {{ isEdit ? t('common.save') : t('dialogs.newProject') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import MediaImage from './MediaImage.vue';

const { t } = useI18n();

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

const emit = defineEmits(['update:modelValue', 'saved', 'delete']);

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
    alert(`${t('dialogs.failedUploadPhoto')}: ${err.response?.data?.error || err.message}`);
  } finally {
    uploadingPhoto.value = false;
    if (event.target) event.target.value = '';
  }
};

const isEdit = computed(() => !!props.project && !!props.project.id);

const availableTags = ref([]);
const availableTagNames = computed(() => availableTags.value.map(t => t.name));
const tagSearchInput = ref('');

const loadAvailableTags = async () => {
  try {
    const list = await api.getTags();
    availableTags.value = list;
  } catch (err) {
    console.warn('Failed to load tags for autocomplete:', err);
  }
};
const handleTagBlur = () => {
  const val = (tagSearchInput.value || '').trim();
  if (val) {
    if (!form.tags.some(t => (typeof t === 'string' ? t : t.name).toLowerCase() === val.toLowerCase())) {
      form.tags.push(val);
    }
    tagSearchInput.value = '';
  }
};

const handleTagKeydown = (e) => {
  const val = (tagSearchInput.value || '').trim();
  if (val) {
    if (!form.tags.some(t => (typeof t === 'string' ? t : t.name).toLowerCase() === val.toLowerCase())) {
      form.tags.push(val);
    }
    tagSearchInput.value = '';
  }
};

const form = reactive({
  projectName: '',
  description: '',
  url: '',
  photoUrl: '',
  tags: []
});

const resetForm = () => {
  if (props.project) {
    form.projectName = props.project.projectName || '';
    form.description = props.project.description || '';
    form.url = props.project.url || '';
    form.photoUrl = props.project.photoUrl || '';
    form.tags = Array.isArray(props.project.tags)
      ? props.project.tags.map(t => typeof t === 'string' ? t : t.name)
      : [];
  } else {
    form.projectName = '';
    form.description = '';
    form.url = '';
    form.photoUrl = '';
    form.tags = [];
  }
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      loadAvailableTags();
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

const handleDelete = () => {
  close();
  emit('delete', props.project);
};

const handleSubmit = async () => {
  if (formRef.value) {
    const { valid } = await formRef.value.validate();
    if (!valid) return;
  }

  if (!form.projectName.trim()) return;

  // Flush any pending tag in search input
  const pendingTag = (tagSearchInput.value || '').trim();
  if (pendingTag && !form.tags.some(t => (typeof t === 'string' ? t : t.name).toLowerCase() === pendingTag.toLowerCase())) {
    form.tags.push(pendingTag);
    tagSearchInput.value = '';
  }

  submitting.value = true;
  try {
    // Normalize tags
    const normalizedTags = (form.tags || [])
      .map(t => typeof t === 'string' ? t.trim().toLowerCase() : (t?.name || '').trim().toLowerCase())
      .filter(Boolean);

    const payload = {
      projectName: form.projectName.trim(),
      description: (form.description || '').trim(),
      url: (form.url || '').trim(),
      photoUrl: (form.photoUrl || '').trim(),
      tags: normalizedTags
    };

    let savedProject;
    if (isEdit.value) {
      const res = await api.updateProject(props.project.id, payload);
      savedProject = { ...props.project, ...payload, tags: res.tags || normalizedTags.map(name => ({ name })) };
    } else {
      savedProject = await api.createProject(payload);
    }

    emit('saved', { project: savedProject, isEdit: isEdit.value });
    close();
  } catch (err) {
    console.error('Error saving project:', err);
    alert(`${t('dialogs.failedSaveProject')}: ${err.response?.data?.details || err.message}`);
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
