<template>
  <v-dialog
    v-model="dialogModel"
    max-width="780"
    persistent
    scrollable
  >
    <v-card class="rounded-0 border bg-white">
      <!-- Dialog Header -->
      <v-card-title class="bg-surface-variant py-3 px-4 d-flex align-center justify-space-between border-b">
        <div class="d-flex align-center gap-2">
          <v-icon icon="mdi-plus-box-outline" color="primary" size="24" />
          <span class="font-weight-bold text-subtitle-1 text-slate-900">
            Add New Component
          </span>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :disabled="submitting"
          @click="close"
          title="Close dialog"
        />
      </v-card-title>

      <!-- Form Content -->
      <v-card-text class="pa-4">
        <!-- Error Alert -->
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4 rounded-0"
          closable
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </v-alert>

        <v-form ref="formRef" v-model="formValid" @submit.prevent="submitForm">
          <!-- SECTION 1: IDENTITY -->
          <div class="text-caption font-weight-bold text-slate-600 text-uppercase tracking-wider mb-2 d-flex align-center gap-1">
            <v-icon icon="mdi-tag-outline" size="16" color="primary" />
            Component Identification
          </div>

          <v-row dense>
            <!-- Component / Part Name -->
            <v-col cols="12" sm="7">
              <v-text-field
                v-model="form.component"
                label="Part Name / Value *"
                placeholder="e.g. STM32F103C8T6, 100nF, AMS1117-3.3"
                density="compact"
                variant="outlined"
                rounded="lg"
                class="font-mono"
                :rules="[rules.required, rules.maxLength(50)]"
                autofocus
              />
            </v-col>

            <!-- Marking Code -->
            <v-col cols="12" sm="5">
              <v-text-field
                v-model="form.marking"
                label="Surface Marking Code"
                placeholder="e.g. A7, 104, Y1"
                density="compact"
                variant="outlined"
                rounded="lg"
                class="font-mono"
                :rules="[rules.maxLength(50)]"
              />
            </v-col>
          </v-row>

          <v-row dense class="mt-1">
            <!-- Category -->
            <v-col cols="12" sm="6">
              <v-autocomplete
                v-model="form.category_id"
                :items="categories"
                item-title="category"
                item-value="ID"
                label="Category *"
                placeholder="Select category"
                density="compact"
                variant="outlined"
                rounded="lg"
                clearable
                hide-details="auto"
                :rules="[rules.requiredSelection]"
              />
            </v-col>

            <!-- Package / Footprint -->
            <v-col cols="12" sm="6">
              <div class="d-flex align-start" style="gap: 8px;">
                <v-autocomplete
                  v-model="form.package_id"
                  :items="filteredPackagesList"
                  item-title="package"
                  item-value="ID"
                  :label="packageMountType === 'all' ? 'Package / Footprint' : `Package (${packageMountType.toUpperCase()})`"
                  placeholder="Select package"
                  density="compact"
                  variant="outlined"
                  rounded="lg"
                  clearable
                  hide-details="auto"
                  class="flex-grow-1"
                >
                  <template #item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps" :title="item.raw.package">
                      <template #append>
                        <v-chip
                          size="x-small"
                          :color="item.raw.isSmd ? 'teal-darken-1' : 'indigo-darken-1'"
                          variant="flat"
                          class="ms-2 font-weight-bold"
                        >
                          {{ item.raw.isSmd ? 'SMD' : 'THT' }}
                        </v-chip>
                        <span v-if="item.raw.pinQuantity" class="text-caption font-mono text-slate-500 ms-1">
                          {{ item.raw.pinQuantity }}p
                        </span>
                        <v-icon
                          v-if="item.raw.drawingURL"
                          icon="mdi-file-image-outline"
                          size="14"
                          color="primary"
                          class="ms-1"
                          title="Drawing available"
                        />
                      </template>
                    </v-list-item>
                  </template>
                </v-autocomplete>

                <!-- SMD / THT Quick Toggle -->
                <v-btn-toggle
                  v-model="packageMountType"
                  mandatory
                  density="compact"
                  variant="outlined"
                  rounded="lg"
                  color="primary"
                  class="flex-shrink-0"
                  style="height: 40px;"
                >
                  <v-btn value="all" size="small" class="px-2 text-caption">All</v-btn>
                  <v-btn value="smd" size="small" class="px-2 text-caption">SMD</v-btn>
                  <v-btn value="tht" size="small" class="px-2 text-caption">THT</v-btn>
                </v-btn-toggle>
              </div>
            </v-col>
          </v-row>

          <!-- Package Preview Bar (if selected) -->
          <div
            v-if="selectedPackageObj"
            class="pa-2 px-3 mb-3 bg-slate-50 border rounded d-flex align-center justify-space-between text-caption font-mono"
          >
            <div class="d-flex align-center gap-2">
              <span class="text-slate-500">Selected Footprint:</span>
              <span class="font-weight-bold text-slate-800">{{ selectedPackageObj.package }}</span>
              <v-chip
                size="x-small"
                :color="selectedPackageObj.isSmd ? 'teal-darken-1' : 'indigo-darken-1'"
                variant="flat"
              >
                {{ selectedPackageObj.isSmd ? 'SMD' : 'Through-Hole' }}
              </v-chip>
              <span v-if="selectedPackageObj.pinQuantity" class="text-slate-600">
                {{ selectedPackageObj.pinQuantity }} pins
              </span>
            </div>
            <div v-if="selectedPackageObj.drawingURL" class="text-primary d-flex align-center gap-1 font-weight-medium">
              <v-icon icon="mdi-drawing" size="14" />
              <span>Drawing: {{ selectedPackageObj.drawingURL }}</span>
            </div>
          </div>

          <!-- Short Description -->
          <v-row dense class="mt-1">
            <v-col cols="12">
              <v-text-field
                v-model="form.shortDescription"
                label="Short Description"
                placeholder="e.g. 100nF 50V X7R 0805, 3.3V 1A LDO linear regulator"
                density="compact"
                variant="outlined"
                rounded="lg"
                counter="50"
                :rules="[rules.maxLength(50)]"
              />
            </v-col>
          </v-row>

          <!-- SECTION 2: INVENTORY & STOCK -->
          <v-divider class="my-3" />

          <div class="text-caption font-weight-bold text-slate-600 text-uppercase tracking-wider mb-2 d-flex align-center gap-1">
            <v-icon icon="mdi-warehouse" size="16" color="primary" />
            Stock & Storage Location
          </div>

          <v-row dense>
            <!-- Initial Stock Quantity -->
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="form.qty"
                label="Initial In-Stock Qty"
                type="number"
                min="0"
                density="compact"
                variant="outlined"
                rounded="lg"
                class="font-mono"
                :rules="[rules.nonNegativeNumber]"
              />
            </v-col>

            <!-- Storage Location -->
            <v-col cols="12" sm="8">
              <v-autocomplete
                v-model="form.storageId"
                :items="storages"
                item-title="storage"
                item-value="ID"
                label="Warehouse Storage Location"
                placeholder="Select storage bin/box"
                density="compact"
                variant="outlined"
                rounded="lg"
                clearable
                :disabled="!form.qty || form.qty <= 0"
                :hint="form.qty > 0 ? 'Allocates initial stock to this storage location' : 'Enter stock quantity > 0 to assign location'"
                persistent-hint
              />
            </v-col>
          </v-row>

          <!-- SECTION 3: TECHNICAL SPECS & MEDIA -->
          <v-divider class="my-3" />

          <div class="text-caption font-weight-bold text-slate-600 text-uppercase tracking-wider mb-2 d-flex align-center gap-1">
            <v-icon icon="mdi-file-document-outline" size="16" color="primary" />
            Documentation & Media
          </div>

          <v-row dense>
            <!-- Detailed Description -->
            <v-col cols="12">
              <v-textarea
                v-model="form.description"
                label="Detailed Description / Electrical Specifications"
                placeholder="Full specs, pinout functions, voltage ratings, package tolerances, or procurement notes..."
                rows="2"
                density="compact"
                variant="outlined"
                rounded="lg"
                auto-grow
                counter="1000"
                :rules="[rules.maxLength(1000)]"
              />
            </v-col>
          </v-row>

          <v-row dense class="mt-1">
            <!-- Datasheet URL or filename -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.datasheetURL"
                label="Datasheet (URL or PDF filename)"
                placeholder="e.g. stm32f103.pdf or https://..."
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-file-pdf-box"
                clearable
              />
            </v-col>

            <!-- Photo URL or filename -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.photoURL"
                label="Component Photo (URL or filename)"
                placeholder="e.g. stm32.jpg or https://..."
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-camera-outline"
                clearable
              />
            </v-col>
          </v-row>

          <!-- Real-time Photo Preview (if photoURL given) -->
          <div v-if="form.photoURL" class="mt-2 pa-2 border rounded bg-slate-50 d-flex align-center gap-3">
            <v-avatar rounded="lg" size="52" class="border bg-white flex-shrink-0">
              <MediaImage
                type="component"
                :src="form.photoURL"
                height="52px"
                width="52px"
              />
            </v-avatar>
            <div>
              <div class="text-caption font-weight-bold text-slate-800">Photo Preview</div>
              <div class="text-caption font-mono text-slate-500 text-truncate" style="max-width: 500px;">
                {{ form.photoURL }}
              </div>
            </div>
          </div>
        </v-form>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions class="pa-3 px-4 bg-surface d-flex align-center justify-space-between flex-wrap gap-2">
        <!-- Add Another Checkbox -->
        <v-checkbox
          v-model="addAnother"
          label="Add another component after saving"
          density="compact"
          hide-details
          color="primary"
          class="me-auto"
        />

        <div class="d-flex align-center gap-2">
          <v-btn
            variant="outlined"
            color="slate-700"
            :disabled="submitting"
            @click="close"
          >
            Cancel
          </v-btn>

          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-check"
            :loading="submitting"
            :disabled="submitting"
            @click="submitForm"
          >
            Create Component
          </v-btn>
        </div>
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
  categories: {
    type: Array,
    default: () => []
  },
  packages: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'created']);

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const formRef = ref(null);
const formValid = ref(false);
const submitting = ref(false);
const errorMessage = ref('');
const addAnother = ref(false);
const storages = ref([]);
const packageMountType = ref('all');

const initialForm = () => ({
  component: '',
  category_id: null,
  package_id: null,
  marking: '',
  shortDescription: '',
  description: '',
  qty: 0,
  storageId: null,
  datasheetURL: '',
  photoURL: ''
});

const form = reactive(initialForm());

// Form validation rules
const rules = {
  required: (v) => (!!v && !!v.trim()) || 'This field is required',
  requiredSelection: (v) => (v !== null && v !== undefined && v !== '') || 'Please select an option',
  nonNegativeNumber: (v) => (v === null || v === undefined || v === '' || (Number(v) >= 0 && Number.isInteger(Number(v)))) || 'Must be a non-negative integer',
  maxLength: (max) => (v) => (!v || v.length <= max) || `Maximum ${max} characters`
};

// Packages filtered by SMD / THT toggle
const filteredPackagesList = computed(() => {
  if (packageMountType.value === 'smd') {
    return props.packages.filter(p => p.isSmd === 1);
  }
  if (packageMountType.value === 'tht') {
    return props.packages.filter(p => p.isSmd === 0);
  }
  return props.packages;
});

// Selected package object details
const selectedPackageObj = computed(() => {
  if (!form.package_id) return null;
  return props.packages.find(p => p.ID === form.package_id) || null;
});

// Load storages when dialog opens
const loadStorages = async () => {
  if (storages.value.length > 0) return;
  try {
    const data = await api.getStorages();
    storages.value = data || [];
    // Set default storage if available
    const defaultStorage = storages.value.find(s => s.storage.toLowerCase().includes('default'));
    if (defaultStorage && !form.storageId) {
      form.storageId = defaultStorage.ID;
    }
  } catch (err) {
    console.warn('Failed to load storages:', err);
  }
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    errorMessage.value = '';
    loadStorages();
    // Default package to DIP-8 or standard footprint if null
    if (!form.package_id && props.packages.length > 0) {
      const defaultPkg = props.packages.find(p => p.ID === 28) || props.packages[0];
      if (defaultPkg) form.package_id = defaultPkg.ID;
    }
  }
});

const resetFormFields = () => {
  const defaults = initialForm();
  Object.keys(defaults).forEach(key => {
    form[key] = defaults[key];
  });
  // Maintain default package if available
  if (props.packages.length > 0) {
    const defaultPkg = props.packages.find(p => p.ID === 28) || props.packages[0];
    if (defaultPkg) form.package_id = defaultPkg.ID;
  }
  if (formRef.value) {
    formRef.value.resetValidation();
  }
};

const close = () => {
  dialogModel.value = false;
  resetFormFields();
};

const submitForm = async () => {
  if (!formRef.value) return;
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  try {
    submitting.value = true;
    errorMessage.value = '';

    const payload = {
      component: form.component.trim(),
      category_id: form.category_id,
      package_id: form.package_id || 28,
      marking: form.marking ? form.marking.trim() : '',
      shortDescription: form.shortDescription ? form.shortDescription.trim() : '',
      description: form.description ? form.description.trim() : '',
      qty: parseInt(form.qty, 10) || 0,
      storageId: form.qty > 0 && form.storageId ? form.storageId : null,
      datasheetURL: form.datasheetURL ? form.datasheetURL.trim() : null,
      photoURL: form.photoURL ? form.photoURL.trim() : null
    };

    const newComponent = await api.createComponent(payload);

    emit('created', newComponent);

    if (addAnother.value) {
      // Clear fields but keep category, package, initial stock qty, and storage location for kits & rapid entry
      const prevCategory = form.category_id;
      const prevPackage = form.package_id;
      const prevQty = form.qty;
      const prevStorage = form.storageId;
      resetFormFields();
      form.category_id = prevCategory;
      form.package_id = prevPackage;
      form.qty = prevQty;
      form.storageId = prevStorage;
    } else {
      close();
    }
  } catch (err) {
    console.error('Error creating component:', err);
    errorMessage.value = err.response?.data?.error || err.message || 'Failed to create component';
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.tracking-wider {
  letter-spacing: 0.05em;
}
</style>
