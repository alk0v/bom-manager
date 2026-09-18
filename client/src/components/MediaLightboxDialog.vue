<template>
  <v-dialog
    v-model="isOpen"
    width="auto"
    max-width="95vw"
    transition="dialog-transition"
  >
    <v-card
      v-if="isOpen"
      class="rounded-0 border bg-white overflow-hidden d-flex flex-column"
      style="max-height: 92vh; max-width: 95vw;"
    >
      <!-- Top Control Bar -->
      <v-card-title class="px-5 py-3 bg-slate-50 border-b d-flex align-center justify-space-between gap-3 flex-shrink-0">
        <div class="d-flex align-center gap-2 overflow-hidden">
          <v-icon size="22" color="primary">mdi-image-outline</v-icon>
          <span class="text-subtitle-1 font-weight-bold text-slate-900 text-truncate font-mono">
            {{ title || src }}
          </span>
          <v-chip
            v-if="type"
            size="x-small"
            color="primary"
            variant="tonal"
            class="font-mono text-uppercase ms-1"
          >
            {{ type }}
          </v-chip>
        </div>

        <div class="d-flex align-center gap-2 flex-shrink-0">
          <v-btn
            v-if="resolvedUrl"
            :href="resolvedUrl"
            target="_blank"
            prepend-icon="mdi-open-in-new"
            size="small"
            variant="outlined"
            color="primary"
            class="font-weight-medium"
          >
            Open Original
          </v-btn>

          <v-btn
            icon="mdi-close"
            variant="text"
            color="slate-600"
            size="small"
            @click="close"
            title="Close"
          />
        </div>
      </v-card-title>

      <!-- Fully visible image display area (never cropped, preserves exact aspect ratio) -->
      <div class="pa-4 bg-slate-50 d-flex align-center justify-center flex-grow-1 overflow-hidden" style="min-height: 200px;">
        <img
          v-if="resolvedUrl"
          :src="resolvedUrl"
          :alt="title || 'Full size photo'"
          class="lightbox-img"
        />
        <div v-else class="text-slate-400 text-caption font-mono d-flex flex-column align-center justify-center py-12">
          <v-icon size="48" color="slate-300" class="mb-2">mdi-image-off-outline</v-icon>
          <span>No image source provided</span>
        </div>
      </div>

      <!-- Bottom Action Bar -->
      <v-card-actions class="px-5 py-3 bg-slate-50 border-t d-flex align-center justify-space-between flex-shrink-0">
        <div class="text-caption text-slate-500 font-mono text-truncate me-3" style="max-width: 600px;">
          <v-icon size="14" class="me-1">mdi-link-variant</v-icon>
          {{ resolvedUrl || '—' }}
        </div>

        <v-btn
          variant="flat"
          color="primary"
          size="small"
          class="font-weight-bold px-4"
          prepend-icon="mdi-close"
          @click="close"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { resolveMediaUrl } from '../services/api';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  src: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'component' // 'project' | 'component' | 'package' | 'datasheet'
  },
  title: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const resolvedUrl = computed(() => {
  if (!props.src) return null;
  return resolveMediaUrl(props.type, props.src);
});

const close = () => {
  isOpen.value = false;
};
</script>

<style scoped>
.lightbox-img {
  max-width: 100%;
  max-height: calc(90vh - 140px);
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  margin: 0 auto;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08);
  border-radius: 4px;
}
</style>
