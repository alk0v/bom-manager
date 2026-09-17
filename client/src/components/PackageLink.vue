<template>
  <span v-if="packageName" class="d-inline-flex align-center">
    <button
      type="button"
      class="package-link-btn font-mono text-body-2 font-weight-medium d-inline-flex align-center"
      :class="customClass"
      :title="tooltipText"
      @click.stop="handleClick"
    >
      <span class="package-name">{{ packageName }}</span>
      <v-icon
        v-if="showIcon && hasDrawing"
        icon="mdi-file-image-outline"
        size="14"
        color="primary"
        class="ms-1 drawing-icon"
      />
    </button>
  </span>
  <span v-else class="text-disabled text-caption">—</span>
</template>

<script setup>
import { computed } from 'vue';
import { usePackageDetailsStore } from '../stores/packageDetails';

const props = defineProps({
  pkg: {
    type: String,
    default: ''
  },
  item: {
    type: Object,
    default: null
  },
  showIcon: {
    type: Boolean,
    default: true
  },
  customClass: {
    type: String,
    default: ''
  }
});

const packageStore = usePackageDetailsStore();

const packageName = computed(() => {
  if (props.pkg) return props.pkg;
  if (props.item?.package) return props.item.package;
  return '';
});

const hasDrawing = computed(() => {
  if (props.item?.drawingURL) return true;
  return false;
});

const tooltipText = computed(() => {
  if (hasDrawing.value) {
    return `Package: ${packageName.value} (drawing available) - Click to view details`;
  }
  return `Package: ${packageName.value} - Click to view details`;
});

const handleClick = () => {
  if (props.item) {
    packageStore.openPackage(props.item);
  } else {
    packageStore.openPackage({ package: packageName.value });
  }
};
</script>

<style scoped>
.package-link-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #1D4ED8; /* Primary blue */
  text-align: left;
  line-height: inherit;
  transition: color 0.15s ease, text-decoration 0.15s ease;
}

.package-link-btn:hover .package-name {
  text-decoration: underline;
  color: #1E40AF; /* Darker blue */
}

.drawing-icon {
  opacity: 0.85;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.package-link-btn:hover .drawing-icon {
  opacity: 1;
  transform: scale(1.15);
}
</style>
