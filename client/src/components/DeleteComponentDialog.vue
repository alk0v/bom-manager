<template>
  <v-dialog
    :model-value="modelValue"
    max-width="680px"
    scrollable
    persistent
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-0 border bg-white overflow-hidden" v-if="component">
      <!-- Modal Header -->
      <v-card-title class="bg-slate-50 py-3 px-4 border-b d-flex align-center justify-space-between flex-shrink-0">
        <div class="d-flex align-center gap-2">
          <v-icon color="error" size="22">mdi-delete-alert-outline</v-icon>
          <span class="text-subtitle-1 font-weight-bold text-slate-900">
            Delete Component
          </span>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" :disabled="deleting" @click="close" />
      </v-card-title>

      <!-- Component Identity Snapshot -->
      <div class="pa-4 bg-slate-50 border-b d-flex align-center gap-3 flex-shrink-0">
        <v-avatar rounded="lg" size="48" class="border bg-white flex-shrink-0">
          <MediaImage
            type="component"
            :src="component.photoURL"
            height="48px"
            width="48px"
          />
        </v-avatar>
        <div class="flex-grow-1 overflow-hidden">
          <div class="d-flex align-center gap-2 flex-wrap">
            <span class="text-subtitle-1 font-mono font-weight-bold text-primary text-truncate">
              {{ component.component }}
            </span>
            <v-chip size="x-small" variant="tonal" color="info" v-if="component.category">
              {{ component.category }}
            </v-chip>
            <v-chip size="x-small" variant="tonal" color="secondary" v-if="component.package">
              {{ component.package }}
            </v-chip>
          </div>
          <div class="text-caption text-slate-500 d-flex align-center gap-2 mt-1">
            <span v-if="component.marking" class="font-mono">Mark: {{ component.marking }}</span>
            <span v-if="component.marking && component.shortDescription">•</span>
            <span v-if="component.shortDescription" class="text-truncate">{{ component.shortDescription }}</span>
            <span>•</span>
            <span class="font-mono font-weight-medium">Stock: {{ component.qty ?? 0 }} pcs</span>
          </div>
        </div>
      </div>

      <!-- Main Body: Warning & Affected Projects -->
      <v-card-text class="pa-4 overflow-y-auto" style="max-height: 60vh;">
        <!-- Loading State -->
        <div v-if="loadingUsage" class="py-8 text-center">
          <v-progress-circular indeterminate color="primary" size="32" class="mb-2" />
          <div class="text-caption text-disabled">Checking project dependencies...</div>
        </div>

        <!-- Component IS used in projects: HIGH VISIBILITY WARNING -->
        <div v-else-if="usedProjects.length > 0">
          <div class="pa-3 mb-4 rounded border border-amber-300 bg-amber-50 text-amber-900 d-flex align-start gap-3">
            <v-icon color="amber-darken-3" size="24" class="flex-shrink-0 mt-0.5">mdi-alert</v-icon>
            <div>
              <div class="font-weight-bold text-subtitle-2 text-amber-950">
                Warning: Component is used in {{ usedProjects.length }} project{{ usedProjects.length > 1 ? 's' : '' }}
              </div>
              <div class="text-caption text-amber-900 mt-1">
                This component is actively required in the Bill of Materials (BOM) below. 
                Deleting it will <strong>permanently remove</strong> this part from all associated projects.
              </div>
            </div>
          </div>

          <!-- Affected Projects List -->
          <div class="text-caption font-weight-bold text-slate-700 text-uppercase tracking-wider mb-2">
            Affected Hardware Projects ({{ usedProjects.length }}):
          </div>

          <v-table density="compact" class="border rounded bg-white projects-table">
            <thead>
              <tr class="bg-slate-50 text-caption font-weight-bold">
                <th style="width: 44px;">Photo</th>
                <th class="text-left py-2 font-weight-bold">Project Name</th>
                <th class="text-center py-2 font-weight-bold" style="width: 100px;">Required</th>
                <th class="text-left py-2 font-weight-bold">Designators / Comment</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in usedProjects" :key="p.id">
                <!-- Project Photo -->
                <td class="py-2">
                  <v-avatar rounded size="32" class="border bg-slate-50">
                    <MediaImage
                      type="project"
                      :src="p.photoUrl"
                      height="32px"
                      width="32px"
                    />
                  </v-avatar>
                </td>
                <!-- Project Name -->
                <td class="py-2">
                  <div class="font-weight-bold text-body-2 text-slate-900">
                    {{ p.projectName }}
                  </div>
                  <div class="text-caption text-disabled" v-if="p.description">
                    {{ p.description.slice(0, 60) }}{{ p.description.length > 60 ? '...' : '' }}
                  </div>
                </td>
                <!-- Required Qty -->
                <td class="text-center font-mono font-weight-bold text-body-2 text-slate-800 py-2">
                  {{ p.requiredQuantity }} pcs
                </td>
                <!-- Designators -->
                <td class="text-caption font-mono text-slate-600 py-2">
                  {{ p.designators || '—' }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <!-- Component is NOT used in any projects: Simple Confirmation -->
        <div v-else class="py-4 text-center">
          <v-icon size="48" color="slate-400" class="mb-3">mdi-trash-can-outline</v-icon>
          <div class="text-subtitle-1 font-weight-bold text-slate-800">
            Confirm Component Deletion
          </div>
          <div class="text-body-2 text-slate-600 mt-2" style="max-width: 480px; margin: 0 auto;">
            Are you sure you want to permanently delete <strong class="font-mono text-primary">{{ component.component }}</strong> from your catalog?
            This component is not used in any projects.
          </div>
        </div>

        <!-- Error Message Banner -->
        <div v-if="errorMessage" class="mt-4 pa-3 rounded border border-red-300 bg-red-50 text-red-800 text-caption">
          {{ errorMessage }}
        </div>
      </v-card-text>

      <v-divider />

      <!-- Modal Footer -->
      <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex align-center justify-space-between flex-shrink-0">
        <v-btn
          variant="text"
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
          class="font-weight-bold px-4"
          prepend-icon="mdi-delete"
          :loading="deleting"
          :disabled="loadingUsage"
          @click="performDelete"
        >
          {{ usedProjects.length > 0 ? 'Force Delete & Remove from Projects' : 'Delete Component' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import api from '../services/api';
import MediaImage from './MediaImage.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  component: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'deleted']);

const loadingUsage = ref(false);
const deleting = ref(false);
const usedProjects = ref([]);
const errorMessage = ref('');

const checkUsage = async () => {
  if (!props.component) return;
  const compId = props.component.ID || props.component.id;
  if (!compId) return;

  loadingUsage.value = true;
  errorMessage.value = '';
  usedProjects.value = [];

  try {
    const res = await api.getComponentUsage(compId);
    usedProjects.value = res.projects || [];
  } catch (err) {
    console.error('Failed to load component project usage:', err);
    // Fallback to project array on component object if present
    if (props.component.projects && Array.isArray(props.component.projects)) {
      usedProjects.value = props.component.projects;
    }
  } finally {
    loadingUsage.value = false;
  }
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen && props.component) {
    checkUsage();
  } else {
    usedProjects.value = [];
    errorMessage.value = '';
    deleting.value = false;
  }
});

const close = () => {
  if (!deleting.value) {
    emit('update:modelValue', false);
  }
};

const performDelete = async () => {
  if (!props.component) return;
  const compId = props.component.ID || props.component.id;
  const compName = props.component.component;

  deleting.value = true;
  errorMessage.value = '';

  try {
    const isForced = usedProjects.value.length > 0;
    await api.deleteComponent(compId, isForced);
    emit('deleted', { id: compId, component: compName });
    emit('update:modelValue', false);
  } catch (err) {
    console.error('Failed to delete component:', err);
    errorMessage.value = err.response?.data?.message || err.response?.data?.error || err.message;
  } finally {
    deleting.value = false;
  }
};
</script>

<style scoped>
.projects-table :deep(th) {
  background-color: #F8FAFC !important;
  color: #475569;
}
.projects-table :deep(td) {
  vertical-align: middle;
}
</style>
