<template>
  <v-dialog
    :model-value="modelValue"
    width="94vw"
    max-width="1450"
    scrollable
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-0 border bg-white d-flex flex-column" style="max-height: 90vh;" v-if="project">
      <!-- Dialog Header -->
      <v-card-title class="bg-slate-50 py-3 px-5 d-flex align-center justify-space-between border-b flex-shrink-0">
        <div class="d-flex align-center">
          <v-avatar rounded="lg" size="44" class="border me-3 bg-white">
            <MediaImage
              type="project"
              :src="project.photoUrl"
              height="44px"
              width="44px"
            />
          </v-avatar>
          <div>
            <div class="d-flex align-center gap-2">
              <span class="text-h6 font-weight-bold text-slate-900">
                Produce Project: {{ project.projectName }}
              </span>
              <v-chip color="primary" variant="flat" size="x-small" class="font-weight-bold">
                Production Run
              </v-chip>
            </div>
            <div class="text-caption text-slate-500">
              Select production quantity to calculate and automatically deduct components from your warehouse stock.
            </div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>

      <!-- Production Control Bar -->
      <div class="px-5 py-4 bg-slate-50 border-b flex-shrink-0">
        <v-row dense align="center">
          <!-- Quantity Stepper & Presets -->
          <v-col cols="12" md="6">
            <div class="text-caption text-slate-700 font-weight-bold text-uppercase mb-2 d-flex align-center">
              <v-icon size="16" class="me-1 text-primary">mdi-factory</v-icon>
              Units to Produce
            </div>
            <div class="d-flex align-center flex-wrap gap-2">
              <div class="d-flex align-center border bg-white rounded-lg p-1" style="height: 40px;">
                <v-btn
                  icon="mdi-minus"
                  size="small"
                  variant="text"
                  density="comfortable"
                  :disabled="produceCount <= 1 || producing"
                  @click="decrementCount"
                />
                <input
                  type="number"
                  v-model.number="produceCount"
                  min="1"
                  step="1"
                  class="font-mono font-weight-bold text-center text-slate-900 border-0 outline-none"
                  style="width: 70px; font-size: 1.1rem;"
                  @input="normalizeCount"
                />
                <v-btn
                  icon="mdi-plus"
                  size="small"
                  variant="text"
                  density="comfortable"
                  :disabled="producing"
                  @click="incrementCount"
                />
              </div>

              <!-- Preset chips -->
              <div class="d-flex align-center gap-1">
                <v-chip
                  v-for="preset in [1, 2, 5, 10, 25]"
                  :key="preset"
                  size="small"
                  variant="outlined"
                  class="font-weight-bold cursor-pointer hover-chip"
                  :color="produceCount === preset ? 'primary' : 'slate-600'"
                  @click="setCount(preset)"
                >
                  {{ preset }} pcs
                </v-chip>

                <v-chip
                  v-if="maxProducibleCount > 0"
                  size="small"
                  variant="flat"
                  color="success"
                  class="font-weight-bold cursor-pointer"
                  title="Set to maximum units buildable with current available stock"
                  @click="setCount(maxProducibleCount)"
                >
                  Max ({{ maxProducibleCount }})
                </v-chip>
              </div>
            </div>
          </v-col>

          <!-- Production Capability Stats -->
          <v-col cols="12" md="6" class="d-flex flex-column align-md-end justify-center">
            <div class="d-flex align-center flex-wrap gap-2 mb-1 justify-md-end">
              <v-chip
                size="small"
                :color="maxProducibleCount >= produceCount ? 'success' : 'error'"
                variant="flat"
                class="font-weight-bold"
              >
                <v-icon start size="14">
                  {{ maxProducibleCount >= produceCount ? 'mdi-check-circle' : 'mdi-alert-circle-outline' }}
                </v-icon>
                Max Producible from Stock: {{ maxProducibleCount }} {{ maxProducibleCount === 1 ? 'unit' : 'units' }}
              </v-chip>

              <v-chip size="small" color="secondary" variant="tonal" class="font-weight-medium">
                {{ bomItems.length }} unique BOM parts
              </v-chip>

              <v-chip size="small" color="primary" variant="tonal" class="font-weight-bold font-mono">
                <v-icon start size="14">mdi-currency-usd</v-icon>
                Est. Batch Cost: {{ formatCurrency(totalBatchCost) }}
              </v-chip>

              <v-chip size="small" color="slate-700" variant="tonal" class="font-weight-bold font-mono">
                Total parts to consume: {{ totalComponentsToConsume }} pcs
              </v-chip>
            </div>
            <div class="text-caption text-slate-500">
              {{ shortageCount === 0 ? 'All required components are in stock.' : `${shortageCount} component(s) have stock shortages for this batch.` }}
            </div>
          </v-col>
        </v-row>
      </div>

      <!-- Shortage Warning & Shopping List Bar (if applicable) -->
      <div v-if="shortageCount > 0" class="px-5 py-3 bg-red-50 border-b d-flex flex-wrap align-center justify-space-between gap-3">
        <div class="d-flex align-center">
          <v-icon color="error" class="me-2" size="20">mdi-alert-circle</v-icon>
          <div>
            <span class="text-subtitle-2 font-weight-bold text-error">
              Stock Shortage Detected ({{ shortageCount }} of {{ bomItems.length }} parts)
            </span>
            <div class="text-caption text-slate-700">
              Total missing items across all shortage components: <strong class="text-error font-mono">{{ totalShortageUnits }} pcs</strong>
            </div>
          </div>
        </div>

        <div class="d-flex align-center gap-3">
          <v-btn
            color="amber-darken-3"
            variant="flat"
            size="small"
            class="font-weight-bold"
            prepend-icon="mdi-cart-plus"
            :loading="addingToCart"
            @click="addShortagesToShoppingList"
          >
            Add Missing to Shopping List
          </v-btn>
        </div>
      </div>

      <!-- Search / Filter bar for BOM items -->
      <div class="px-5 py-2 bg-white border-b d-flex align-center justify-space-between flex-shrink-0">
        <v-text-field
          v-model="searchQuery"
          placeholder="Filter components in deduction table..."
          prepend-inner-icon="mdi-magnify"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          rounded="lg"
          style="max-width: 320px;"
        />

        <div class="d-flex align-center gap-2">
          <v-checkbox
            v-if="shortageCount > 0"
            v-model="allowNegativeStock"
            label="Allow production with insufficient stock (deduct anyway)"
            density="compact"
            color="warning"
            hide-details
            class="ma-0 text-caption font-weight-medium"
          />
        </div>
      </div>

      <!-- Deduction Preview Table -->
      <v-card-text class="pa-0 overflow-y-auto flex-grow-1">
        <v-table density="comfortable" hover class="produce-table">
          <thead>
            <tr class="bg-slate-50">
              <th class="text-left font-weight-bold" style="width: 50px;">Photo</th>
              <th class="text-left font-weight-bold">Component / Part</th>
              <th class="text-left font-weight-bold">Category</th>
              <th class="text-left font-weight-bold">Package</th>
              <th class="text-center font-weight-bold">Per Unit</th>
              <th class="text-center font-weight-bold text-primary">Required for {{ produceCount }}x</th>
              <th class="text-center font-weight-bold">Current Stock</th>
              <th class="text-center font-weight-bold">Stock After Build</th>
              <th class="text-center font-weight-bold" style="width: 140px;">Status</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="item in filteredDeductions"
              :key="item.bomId"
              :class="{ 'row-shortage': !item.isSufficient }"
            >
              <!-- Photo Thumbnail -->
              <td>
                <v-avatar
                  rounded="lg"
                  size="36"
                  class="border bg-slate-50"
                  :class="{ 'cursor-pointer': !!item.componentPhotoURL }"
                  @click="item.componentPhotoURL && openComponentDetails(item)"
                >
                  <MediaImage
                    type="component"
                    :src="item.componentPhotoURL"
                    height="36px"
                    width="36px"
                  />
                </v-avatar>
              </td>

              <!-- Component Name & Marking -->
              <td>
                <div
                  class="font-mono font-weight-bold text-body-2 text-primary comp-name-link d-inline-flex align-center gap-1"
                  @click="openComponentDetails(item)"
                  title="Click to view full component details"
                >
                  <span class="hover-underline">{{ item.component }}</span>
                  <v-icon size="13" class="opacity-60 info-icon">mdi-information-outline</v-icon>
                </div>
                <div class="text-caption text-disabled" v-if="item.marking || item.shortDescription">
                  <span v-if="item.marking" class="font-mono me-2">Mark: {{ item.marking }}</span>
                  <span v-if="item.shortDescription">{{ item.shortDescription }}</span>
                </div>
              </td>

              <!-- Category -->
              <td>
                <v-chip size="x-small" variant="tonal" color="info" v-if="item.category">
                  {{ item.category }}
                </v-chip>
                <span v-else class="text-disabled text-caption">—</span>
              </td>

              <!-- Package -->
              <td>
                <PackageLink :item="item" />
              </td>

              <!-- Per Unit Qty -->
              <td class="text-center font-mono text-body-2">
                {{ item.requiredPerUnit }}
              </td>

              <!-- Total Required for Batch -->
              <td class="text-center font-mono font-weight-bold text-body-2 text-primary">
                {{ item.totalRequired }}
              </td>

              <!-- Current In Stock -->
              <td class="text-center font-mono font-weight-bold text-body-2">
                {{ item.currentStock }}
              </td>

              <!-- Remaining Stock After Build -->
              <td class="text-center font-mono font-weight-bold text-body-2">
                <span :class="item.isSufficient ? 'text-slate-800' : 'text-error font-weight-bold'">
                  {{ item.remainingStock }}
                </span>
              </td>

              <!-- Status Badge -->
              <td class="text-center">
                <v-chip
                  v-if="item.isSufficient"
                  size="x-small"
                  color="success"
                  variant="flat"
                  class="font-weight-bold"
                >
                  <v-icon start size="12">mdi-check</v-icon>
                  Available
                </v-chip>
                <v-chip
                  v-else
                  size="x-small"
                  color="error"
                  variant="flat"
                  class="font-weight-bold"
                >
                  <v-icon start size="12">mdi-alert-circle-outline</v-icon>
                  Missing {{ item.shortage }}
                </v-chip>
              </td>
            </tr>

            <tr v-if="filteredDeductions.length === 0 && !loading">
              <td colspan="9" class="text-center py-8 text-disabled">
                <v-icon size="36" class="mb-2">mdi-filter-variant-remove</v-icon>
                <div>No components match your search filter.</div>
              </td>
            </tr>

            <tr v-if="loading">
              <td colspan="9" class="text-center py-8">
                <v-progress-circular indeterminate color="primary" />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>

      <v-divider />

      <!-- Dialog Footer Actions -->
      <v-card-actions class="pa-4 bg-slate-50 d-flex align-center justify-space-between flex-shrink-0">
        <div class="text-body-2 text-slate-700">
          Ready to produce <strong>{{ produceCount }}</strong> {{ produceCount === 1 ? 'unit' : 'units' }} of <strong>{{ project.projectName }}</strong>
          <span v-if="unitBomCost > 0" class="ms-1 font-mono">
            (Est. BOM Cost: <strong class="text-primary">{{ formatCurrency(totalBatchCost) }}</strong>)
          </span>.
        </div>

        <div class="d-flex align-center gap-2">
          <v-btn
            variant="outlined"
            color="slate-600"
            @click="close"
            :disabled="producing"
          >
            Cancel
          </v-btn>

          <v-btn
            color="primary"
            variant="flat"
            class="font-weight-bold px-5"
            prepend-icon="mdi-factory"
            :loading="producing"
            :disabled="shortageCount > 0 && !allowNegativeStock"
            @click="confirmProduce"
          >
            Produce {{ produceCount }} {{ produceCount === 1 ? 'Unit' : 'Units' }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>

    <!-- Component Details Dialog -->
    <ComponentDetailsDialog
      v-model="showDetailsDialog"
      :component="selectedComponentForDetails"
    />
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import api from '../services/api';
import MediaImage from './MediaImage.vue';
import PackageLink from './PackageLink.vue';
import ComponentDetailsDialog from './ComponentDetailsDialog.vue';
import { formatCurrency } from '../utils/formatters';

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

const emit = defineEmits(['update:modelValue', 'produced', 'notify']);

// State
const produceCount = ref(1);
const bomItems = ref([]);
const loading = ref(false);
const producing = ref(false);
const addingToCart = ref(false);
const allowNegativeStock = ref(false);
const searchQuery = ref('');

const showDetailsDialog = ref(false);
const selectedComponentForDetails = ref(null);

// Fetch BOM when dialog opens
const loadBom = async () => {
  if (!props.project?.id) return;
  loading.value = true;
  produceCount.value = 1;
  allowNegativeStock.value = false;
  searchQuery.value = '';
  try {
    const data = await api.getProjectBom(props.project.id);
    bomItems.value = data || [];
  } catch (err) {
    console.error('Error loading BOM for production:', err);
    emit('notify', 'Failed to load project BOM: ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadBom();
  }
});

// Stepper helpers
const incrementCount = () => {
  produceCount.value = Math.max(1, (produceCount.value || 0) + 1);
};

const decrementCount = () => {
  produceCount.value = Math.max(1, (produceCount.value || 1) - 1);
};

const setCount = (val) => {
  produceCount.value = Math.max(1, parseInt(val, 10) || 1);
};

const normalizeCount = () => {
  if (!produceCount.value || produceCount.value < 1) {
    produceCount.value = 1;
  }
};

// Calculations
const deductions = computed(() => {
  const count = produceCount.value || 1;
  return bomItems.value.map(item => {
    const requiredPerUnit = item.requiredQuantity || 1;
    const totalRequired = requiredPerUnit * count;
    const currentStock = item.stockQuantity ?? 0;
    const remainingStock = currentStock - totalRequired;
    const shortage = Math.max(0, totalRequired - currentStock);

    return {
      ...item,
      requiredPerUnit,
      totalRequired,
      currentStock,
      remainingStock,
      shortage,
      isSufficient: shortage === 0
    };
  });
});

const filteredDeductions = computed(() => {
  if (!searchQuery.value.trim()) return deductions.value;
  const q = searchQuery.value.toLowerCase().trim();
  return deductions.value.filter(item =>
    (item.component && item.component.toLowerCase().includes(q)) ||
    (item.marking && item.marking.toLowerCase().includes(q)) ||
    (item.category && item.category.toLowerCase().includes(q)) ||
    (item.package && item.package.toLowerCase().includes(q)) ||
    (item.comment && item.comment.toLowerCase().includes(q))
  );
});

const maxProducibleCount = computed(() => {
  if (bomItems.value.length === 0) return 0;
  const limits = bomItems.value.map(item => {
    const req = item.requiredQuantity || 1;
    const stock = Math.max(0, item.stockQuantity ?? 0);
    return Math.floor(stock / req);
  });
  return Math.min(...limits);
});

const shortageItems = computed(() => {
  return deductions.value.filter(item => !item.isSufficient);
});

const shortageCount = computed(() => shortageItems.value.length);

const totalShortageUnits = computed(() => {
  return shortageItems.value.reduce((acc, item) => acc + item.shortage, 0);
});

const totalComponentsToConsume = computed(() => {
  return bomItems.value.reduce((acc, item) => acc + ((item.requiredQuantity || 1) * produceCount.value), 0);
});

const unitBomCost = computed(() => {
  let cost = 0;
  for (const item of bomItems.value) {
    if (item.totalItemCost != null) {
      cost += Number(item.totalItemCost);
    }
  }
  return cost;
});

const totalBatchCost = computed(() => {
  return unitBomCost.value * (produceCount.value || 1);
});

// Add shortages to shopping list
const addShortagesToShoppingList = async () => {
  if (shortageItems.value.length === 0) return;
  addingToCart.value = true;
  try {
    for (const item of shortageItems.value) {
      await api.addToShoppingList({
        componentId: item.componentId,
        qty: item.shortage
      });
    }
    emit('notify', `Added ${shortageItems.value.length} shortage items to shopping list!`, 'success');
  } catch (err) {
    emit('notify', 'Failed to add shortages to shopping list: ' + err.message, 'error');
  } finally {
    addingToCart.value = false;
  }
};

// Confirm and Execute Production
const confirmProduce = async () => {
  if (!props.project?.id) return;
  producing.value = true;
  try {
    const res = await api.produceProject(props.project.id, {
      count: produceCount.value,
      allowNegativeStock: allowNegativeStock.value
    });

    emit('notify', `Successfully produced ${res.producedCount} ${res.producedCount === 1 ? 'unit' : 'units'} of "${props.project.projectName}"! Component stocks updated.`, 'success');
    emit('produced', res);
    close();
  } catch (err) {
    console.error('Error producing project:', err);
    const errorMsg = err.response?.data?.error || err.message || 'Production failed';
    emit('notify', 'Production failed: ' + errorMsg, 'error');
  } finally {
    producing.value = false;
  }
};

const openComponentDetails = (item) => {
  selectedComponentForDetails.value = {
    ID: item.componentId,
    component: item.component,
    marking: item.marking,
    category: item.category,
    package: item.package,
    datasheetURL: item.datasheetURL,
    photoURL: item.componentPhotoURL,
    qty: item.stockQuantity,
    description: item.componentDescription,
    shortDescription: item.shortDescription
  };
  showDetailsDialog.value = true;
};

const close = () => {
  emit('update:modelValue', false);
};
</script>

<style scoped>
.produce-table :deep(th) {
  background-color: #F8FAFC !important;
  font-size: 0.82rem;
  color: #475569;
}
.produce-table :deep(td) {
  padding-top: 8px;
  padding-bottom: 8px;
}
.produce-table :deep(tr.row-shortage) {
  background-color: #FEF2F2 !important; /* soft rose/red background */
}
.produce-table :deep(tr.row-shortage:hover) {
  background-color: #FEE2E2 !important;
}
.hover-chip {
  transition: all 0.15s ease;
}
.hover-chip:hover {
  border-color: #2563eb !important;
  color: #2563eb !important;
}
.comp-name-link {
  cursor: pointer;
  transition: color 0.15s ease;
}
.comp-name-link:hover {
  color: #1d4ed8 !important;
}
.comp-name-link:hover .hover-underline {
  text-decoration: underline;
}
.comp-name-link:hover .info-icon {
  opacity: 1 !important;
}
</style>
