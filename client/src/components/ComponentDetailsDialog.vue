<template>
  <v-dialog
    :model-value="modelValue"
    max-width="850"
    scrollable
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-0 border bg-white d-flex flex-column" v-if="displayComponent">
      <!-- Header -->
      <v-card-title class="bg-slate-50 py-3 px-4 d-flex align-center justify-space-between border-b flex-shrink-0">
        <div class="d-flex align-center gap-2 text-truncate">
          <v-icon color="primary" size="22">mdi-memory</v-icon>
          <span class="font-mono font-weight-bold text-subtitle-1 text-primary text-truncate">
            {{ displayComponent.component }}
          </span>
          <v-chip
            v-if="displayComponent.marking"
            size="x-small"
            color="slate-700"
            variant="tonal"
            class="font-mono font-weight-bold ms-1"
          >
            Mark: {{ displayComponent.marking }}
          </v-chip>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>

      <!-- Content -->
      <v-card-text class="pa-4 overflow-y-auto">
        <!-- Loading Progress Bar -->
        <v-progress-linear
          v-if="loading"
          indeterminate
          color="primary"
          height="2"
          class="mb-3"
        />

        <v-row>
          <!-- Photo Thumbnail -->
          <v-col cols="12" sm="5" class="d-flex flex-column align-center justify-center">
            <v-avatar rounded="lg" size="180" class="border bg-slate-50 w-100" style="max-height: 200px;">
              <MediaImage
                type="component"
                :src="displayComponent.photoURL"
                height="180px"
                width="100%"
                :cover="false"
              />
            </v-avatar>
            <span v-if="displayComponent.photoURL" class="text-caption text-slate-400 mt-1 font-mono text-truncate" style="max-width: 220px;">
              {{ displayComponent.photoURL }}
            </span>
          </v-col>

          <!-- Component Metadata -->
          <v-col cols="12" sm="7">
            <!-- Category -->
            <div class="text-caption text-disabled text-uppercase font-weight-bold">Category</div>
            <div class="text-body-2 font-weight-medium mb-2">
              <v-chip size="small" variant="tonal" color="info" v-if="displayComponent.category">
                {{ displayComponent.category }}
              </v-chip>
              <span v-else class="text-disabled">—</span>
            </div>

            <!-- Package / Footprint -->
            <div class="text-caption text-disabled text-uppercase font-weight-bold">Package / Footprint</div>
            <div class="text-body-2 font-mono mb-2 d-flex align-center gap-1 flex-wrap">
              <PackageLink :item="displayComponent" />
              <v-chip size="x-small" class="ms-1" v-if="displayComponent.package">
                {{ displayComponent.isSmd ? 'SMD' : 'Through-Hole' }}
              </v-chip>
              <v-chip
                size="x-small"
                variant="tonal"
                color="blue-grey"
                class="ms-1 font-mono"
                v-if="displayComponent.pinQuantity"
              >
                {{ displayComponent.pinQuantity }} pins
              </v-chip>
            </div>

            <!-- Marking -->
            <div class="text-caption text-disabled text-uppercase font-weight-bold">Marking Code</div>
            <div class="text-body-2 font-mono mb-2 text-slate-800">
              {{ displayComponent.marking || '—' }}
            </div>

            <!-- In Stock Quantity -->
            <div class="text-caption text-disabled text-uppercase font-weight-bold">Total Stock Quantity</div>
            <div>
              <v-chip
                size="small"
                :color="displayComponent.qty > 0 ? 'success' : 'error'"
                variant="flat"
                class="font-mono font-weight-bold"
              >
                <v-icon start size="14">
                  {{ displayComponent.qty > 0 ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline' }}
                </v-icon>
                {{ displayComponent.qty ?? 0 }} in stock
              </v-chip>
            </div>
          </v-col>
        </v-row>

        <v-divider class="my-3" />

        <!-- Description -->
        <div class="text-caption text-disabled text-uppercase font-weight-bold mb-1">Description</div>
        <p class="text-body-2 text-slate-700 mb-3" style="white-space: pre-line;">
          {{ displayComponent.description || displayComponent.shortDescription || 'No description provided.' }}
        </p>

        <!-- Warehouse Allocations -->
        <div class="mt-2">
          <div class="text-caption text-disabled text-uppercase font-weight-bold mb-1">Warehouse Storage Locations</div>
          <div v-if="displayComponent.warehouse && displayComponent.warehouse.length > 0">
            <v-chip-group class="flex-wrap">
              <v-chip
                v-for="w in displayComponent.warehouse"
                :key="w.id"
                size="small"
                variant="outlined"
                color="slate-800"
                class="font-mono"
              >
                <v-icon start size="14" color="primary">mdi-archive-outline</v-icon>
                {{ w.storage || 'Box #' + w.storageId }}: <strong class="ms-1">{{ w.quantity }} pcs</strong>
              </v-chip>
            </v-chip-group>
          </div>
          <div v-else class="text-caption text-disabled italic">
            No warehouse storage locations assigned.
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex align-center flex-shrink-0">
        <!-- Datasheet Link -->
        <v-btn
          v-if="displayComponent.datasheetURL"
          color="red-darken-1"
          variant="tonal"
          size="small"
          prepend-icon="mdi-file-pdf-box"
          class="font-weight-medium"
          :href="getDatasheetUrl(displayComponent.datasheetURL)"
          target="_blank"
        >
          Open Datasheet
        </v-btn>

        <v-spacer />

        <!-- Add to Shopping List -->
        <v-btn
          color="amber-darken-3"
          variant="tonal"
          size="small"
          prepend-icon="mdi-cart-plus"
          class="font-weight-medium me-2"
          :loading="addingToShoppingList"
          @click="addToShoppingList"
        >
          Add to Shopping List
        </v-btn>

        <!-- Optional Select Button (e.g. inside AddComponentDialog) -->
        <v-btn
          v-if="showSelectButton"
          color="primary"
          variant="flat"
          size="small"
          prepend-icon="mdi-check"
          class="font-weight-bold"
          @click="selectAndClose"
        >
          {{ selectButtonText }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import api, { resolveMediaUrl } from '../services/api';
import MediaImage from './MediaImage.vue';
import PackageLink from './PackageLink.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  component: {
    type: Object,
    default: null
  },
  componentId: {
    type: [Number, String],
    default: null
  },
  showSelectButton: {
    type: Boolean,
    default: false
  },
  selectButtonText: {
    type: String,
    default: 'Select Component'
  }
});

const emit = defineEmits(['update:modelValue', 'select', 'add-to-shopping-list']);

const detailedComponent = ref(null);
const loading = ref(false);
const addingToShoppingList = ref(false);
const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

// Merges incoming component prop with asynchronously fetched full details (warehouse allocations, etc.)
const displayComponent = computed(() => {
  if (detailedComponent.value) {
    return detailedComponent.value;
  }
  return props.component || null;
});

const getDatasheetUrl = (url) => {
  return resolveMediaUrl('datasheet', url);
};

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

const close = () => {
  emit('update:modelValue', false);
};

const selectAndClose = () => {
  if (displayComponent.value) {
    emit('select', displayComponent.value);
  }
  close();
};

const addToShoppingList = async () => {
  if (!displayComponent.value?.ID) return;
  addingToShoppingList.value = true;
  try {
    await api.addToShoppingList({ componentId: displayComponent.value.ID, qty: 5 });
    notify(`Added 5 pcs of ${displayComponent.value.component} to shopping list!`);
    emit('add-to-shopping-list', displayComponent.value);
  } catch (err) {
    console.error('Failed to add to shopping list:', err);
    notify('Failed to add to shopping list: ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    addingToShoppingList.value = false;
  }
};

const loadFullDetails = async () => {
  const compId = props.component?.ID || props.component?.id || props.componentId;
  if (!compId) return;

  loading.value = true;
  try {
    const data = await api.getComponent(compId);
    detailedComponent.value = data;
  } catch (err) {
    console.warn('Failed to load full component details:', err);
  } finally {
    loading.value = false;
  }
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    detailedComponent.value = null;
    loadFullDetails();
  } else {
    detailedComponent.value = null;
  }
});

watch(() => props.component, () => {
  if (props.modelValue) {
    loadFullDetails();
  }
});
</script>

<style scoped>
.bg-slate-50 {
  background-color: #f8fafc !important;
}
.border-b {
  border-bottom: 1px solid #e2e8f0 !important;
}
</style>
