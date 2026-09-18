<template>
  <div class="media-image-wrapper d-flex align-center justify-center" :style="{ width, height }">
    <v-img
      v-if="resolvedUrl"
      :src="resolvedUrl"
      :aspect-ratio="aspectRatio"
      :cover="cover"
      class="rounded-0 fill-height w-100"
      :class="customClass"
      @error="hasError = true"
    >
      <template #placeholder>
        <div class="d-flex align-center justify-center fill-height bg-slate-50">
          <v-progress-circular indeterminate color="primary" size="24" />
        </div>
      </template>
    </v-img>

    <div
      v-if="!resolvedUrl || hasError"
      class="d-flex flex-column align-center justify-center fill-height w-100 bg-slate-50 rounded-0 text-disabled pa-2 text-center"
      :style="{ minHeight: height || '120px' }"
    >
      <v-icon size="36" color="slate-400" class="mb-1">{{ fallbackIcon }}</v-icon>
      <span class="text-caption font-weight-medium text-slate-400">No Image</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { resolveMediaUrl } from '../services/api';

const props = defineProps({
  type: {
    type: String,
    default: 'project' // 'project' | 'component' | 'package'
  },
  src: {
    type: String,
    default: null
  },
  aspectRatio: {
    type: [Number, String],
    default: undefined
  },
  cover: {
    type: Boolean,
    default: false // Default to fit/contain so photos are never cropped
  },
  width: {
    type: String,
    default: '100%'
  },
  height: {
    type: String,
    default: 'auto'
  },
  customClass: {
    type: String,
    default: ''
  }
});

const hasError = ref(false);

const resolvedUrl = computed(() => {
  if (!props.src || hasError.value) return null;
  return resolveMediaUrl(props.type, props.src);
});

const fallbackIcon = computed(() => {
  switch (props.type) {
    case 'project':
      return 'mdi-folder-image';
    case 'component':
      return 'mdi-integrated-circuit-chip';
    case 'package':
      return 'mdi-package-variant';
    default:
      return 'mdi-image-off-outline';
  }
});
</script>

<style scoped>
.media-image-wrapper {
  overflow: hidden;
  position: relative;
  background-color: #F8FAFC;
}
:deep(.v-img__img--contain) {
  object-fit: contain !important;
}
</style>
