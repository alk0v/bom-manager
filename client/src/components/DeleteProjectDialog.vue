<template>
  <v-dialog
    :model-value="modelValue"
    max-width="560px"
    scrollable
    persistent
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-0 border bg-white overflow-hidden" v-if="project">
      <!-- Modal Header -->
      <v-card-title class="bg-slate-50 py-3 px-4 border-b d-flex align-center justify-space-between flex-shrink-0">
        <div class="d-flex align-center gap-2">
          <v-icon color="error" size="22">mdi-delete-alert-outline</v-icon>
          <span class="text-subtitle-1 font-weight-bold text-slate-900">
            Delete Hardware Project
          </span>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :disabled="deleting"
          @click="close"
        />
      </v-card-title>

      <!-- Project Identity Snapshot -->
      <div class="pa-4 bg-slate-50 border-b d-flex align-center gap-3 flex-shrink-0">
        <v-avatar rounded="lg" size="52" class="border bg-white flex-shrink-0">
          <MediaImage
            type="project"
            :src="project.photoUrl"
            height="52px"
            width="52px"
            :cover="false"
          />
        </v-avatar>
        <div class="flex-grow-1 overflow-hidden">
          <div class="text-subtitle-1 font-weight-bold text-slate-900 text-truncate">
            {{ project.projectName }}
          </div>
          <div class="d-flex align-center gap-2 flex-wrap mt-1">
            <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-medium">
              <v-icon start size="13">mdi-chip</v-icon>
              {{ project.bomItemCount ?? 0 }} BOM parts
            </v-chip>
            <v-chip
              v-if="project.filesCount > 0"
              size="x-small"
              color="secondary"
              variant="tonal"
              class="font-weight-medium"
            >
              <v-icon start size="13">mdi-paperclip</v-icon>
              {{ project.filesCount }} files
            </v-chip>
            <span v-if="project.url" class="text-caption text-slate-400 text-truncate" style="max-width: 200px;">
              {{ project.url }}
            </span>
          </div>
        </div>
      </div>

      <!-- Main Body: Warning & Details -->
      <v-card-text class="pa-4 overflow-y-auto">
        <div class="pa-3 mb-4 rounded border border-red-200 bg-red-50 text-red-900 d-flex align-start gap-3">
          <v-icon color="error" size="24" class="flex-shrink-0 mt-0.5">mdi-alert-circle-outline</v-icon>
          <div>
            <div class="font-weight-bold text-subtitle-2 text-red-950">
              Permanent Deletion Warning
            </div>
            <div class="text-body-2 text-red-900 mt-1">
              Are you sure you want to delete <strong class="font-weight-bold">"{{ project.projectName }}"</strong>?
              This action <span class="font-weight-bold text-decoration-underline">cannot be undone</span>.
            </div>
          </div>
        </div>

        <div class="text-body-2 text-slate-600 mb-3">
          Deleting this project will permanently remove:
        </div>

        <v-list density="compact" class="border rounded bg-slate-50 py-1 mb-2">
          <v-list-item class="py-1">
            <template #prepend>
              <v-icon icon="mdi-trash-can-outline" size="18" color="error" class="me-3" />
            </template>
            <v-list-item-title class="text-body-2 text-slate-800">
              Project record and description metadata
            </v-list-item-title>
          </v-list-item>

          <v-list-item class="py-1">
            <template #prepend>
              <v-icon icon="mdi-trash-can-outline" size="18" color="error" class="me-3" />
            </template>
            <v-list-item-title class="text-body-2 text-slate-800">
              All constituent Bill of Materials items (<strong>{{ project.bomItemCount ?? 0 }}</strong> part requirements)
            </v-list-item-title>
          </v-list-item>

          <v-list-item class="py-1" v-if="(project.filesCount ?? 0) > 0">
            <template #prepend>
              <v-icon icon="mdi-trash-can-outline" size="18" color="error" class="me-3" />
            </template>
            <v-list-item-title class="text-body-2 text-slate-800">
              All attached project files and iBOM documents (<strong>{{ project.filesCount }}</strong> files)
            </v-list-item-title>
          </v-list-item>

          <v-list-item class="py-1">
            <template #prepend>
              <v-icon icon="mdi-shield-check-outline" size="18" color="success" class="me-3" />
            </template>
            <v-list-item-title class="text-body-2 text-slate-600 font-italic">
              Catalog components will NOT be deleted; their warehouse stock remains safe.
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions class="pa-4 bg-slate-50 d-flex align-center justify-space-between flex-shrink-0">
        <v-btn
          variant="outlined"
          color="slate-600"
          size="small"
          :disabled="deleting"
          @click="close"
        >
          Cancel
        </v-btn>

        <v-btn
          color="error"
          variant="flat"
          size="small"
          class="font-weight-bold"
          prepend-icon="mdi-delete"
          :loading="deleting"
          @click="handleDelete"
        >
          Delete Project
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue';
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

const emit = defineEmits(['update:modelValue', 'deleted']);

const deleting = ref(false);

function close() {
  if (deleting.value) return;
  emit('update:modelValue', false);
}

async function handleDelete() {
  if (!props.project?.id) return;

  deleting.value = true;
  try {
    const res = await api.deleteProject(props.project.id);
    deleting.value = false;
    emit('update:modelValue', false);
    emit('deleted', { ...props.project, ...res });
  } catch (err) {
    deleting.value = false;
    console.error('Failed to delete project:', err);
    alert('Failed to delete project: ' + (err.response?.data?.details || err.message));
  }
}
</script>
