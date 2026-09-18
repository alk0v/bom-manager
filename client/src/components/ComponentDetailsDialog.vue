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

      <!-- Tabs to organize details without overloading the screen -->
      <v-tabs
        v-model="activeTab"
        density="compact"
        color="primary"
        class="border-b px-3 bg-slate-50 flex-shrink-0"
      >
        <v-tab value="overview" class="text-capitalize font-weight-medium">
          <v-icon start size="18">mdi-information-outline</v-icon>
          Overview & Specs
        </v-tab>
        <v-tab value="projects" class="text-capitalize font-weight-medium">
          <v-icon start size="18">mdi-folder-outline</v-icon>
          Used in Projects
          <v-badge
            v-if="projectList.length > 0"
            :content="projectList.length"
            inline
            color="primary"
            class="ms-2"
          />
        </v-tab>
        <v-tab value="orders" class="text-capitalize font-weight-medium">
          <v-icon start size="18">mdi-cash-multiple</v-icon>
          Purchases & Pricing
          <v-badge
            v-if="displayComponent.pricing?.orderCount > 0"
            :content="displayComponent.pricing.orderCount"
            inline
            color="primary"
            class="ms-2"
          />
        </v-tab>
      </v-tabs>

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

        <v-window v-model="activeTab">
          <!-- TAB 1: OVERVIEW & SPECS -->
          <v-window-item value="overview">
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

                <!-- In Stock Quantity, Min Acceptable Qty & Latest Unit Price -->
                <v-row dense class="mb-1">
                  <v-col cols="4">
                    <div class="text-caption text-disabled text-uppercase font-weight-bold">In Stock</div>
                    <div class="d-inline-flex align-center border rounded px-1 bg-white" style="height: 28px; width: 78px;">
                      <input
                        type="number"
                        min="0"
                        :value="displayComponent.qty ?? 0"
                        @change="e => saveStockQty(e.target.value)"
                        :class="[
                          'font-mono font-weight-bold text-center border-0 outline-none w-100',
                          (!displayComponent.qty || displayComponent.qty <= 0) ? 'text-error' : (displayComponent.minQty > 0 && displayComponent.qty <= displayComponent.minQty ? 'text-orange-darken-3' : 'text-slate-800')
                        ]"
                        style="font-size: 0.85rem;"
                        title="Current stock quantity (click to edit)"
                      />
                    </div>
                  </v-col>

                  <v-col cols="4">
                    <div class="text-caption text-disabled text-uppercase font-weight-bold">Min Acceptable</div>
                    <div class="d-inline-flex align-center border rounded px-1 bg-white" style="height: 28px; width: 78px;">
                      <input
                        type="number"
                        min="0"
                        :value="displayComponent.minQty ?? 0"
                        @change="e => saveMinQty(e.target.value)"
                        class="font-mono font-weight-bold text-center text-slate-800 border-0 outline-none w-100"
                        style="font-size: 0.85rem;"
                        title="Minimal acceptable quantity (click to edit)"
                      />
                    </div>
                  </v-col>

                  <v-col cols="4">
                    <div class="text-caption text-disabled text-uppercase font-weight-bold">Latest Price</div>
                    <div>
                      <v-chip
                        v-if="displayComponent.pricing?.latestPrice != null"
                        size="small"
                        color="primary"
                        variant="tonal"
                        class="font-mono font-weight-bold"
                      >
                        <v-icon start size="14">mdi-tag-outline</v-icon>
                        {{ formatCurrency(displayComponent.pricing.latestPrice) }}
                      </v-chip>
                      <span v-else class="text-caption text-disabled italic">—</span>
                    </div>
                  </v-col>
                </v-row>

                <!-- Low stock alert warning banner if near to end -->
                <v-alert
                  v-if="displayComponent.minQty > 0 && displayComponent.qty > 0 && displayComponent.qty <= displayComponent.minQty"
                  density="compact"
                  color="warning"
                  variant="tonal"
                  icon="mdi-alert-outline"
                  class="mt-2 mb-0 text-caption font-weight-medium"
                >
                  Stock is near to end: <strong>{{ displayComponent.qty }} pcs</strong> remaining (min. acceptable is <strong>{{ displayComponent.minQty }} pcs</strong>).
                </v-alert>
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
          </v-window-item>

          <!-- TAB 2: USED IN PROJECTS -->
          <v-window-item value="projects">
            <div v-if="projectList.length === 0 && !loading" class="text-center py-8 text-disabled">
              <v-icon size="48" class="mb-2">mdi-folder-open-outline</v-icon>
              <div class="text-body-1 font-weight-medium text-slate-700">Not used in any project BOM yet</div>
              <div class="text-caption text-disabled mt-1" style="max-width: 440px; margin: 0 auto;">
                When you add this component to a project's Bill of Materials, it will appear here with its required quantities and reference designators.
              </div>
            </div>

            <div v-else-if="projectList.length > 0" class="projects-tab-content">
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="text-subtitle-2 font-weight-bold text-slate-800 d-flex align-center gap-1">
                  <v-icon size="18" color="primary">mdi-folder-multiple-outline</v-icon>
                  <span>Used in {{ projectList.length }} {{ projectList.length === 1 ? 'Project' : 'Projects' }}</span>
                </div>
                <v-chip size="small" color="primary" variant="tonal" class="font-mono font-weight-bold">
                  Total Needed: {{ projectList.reduce((acc, p) => acc + (p.requiredQuantity || 0), 0) }} pcs
                </v-chip>
              </div>

              <div class="border rounded-lg overflow-hidden">
                <v-table density="comfortable" class="bg-white">
                  <thead>
                    <tr class="bg-slate-50 text-caption font-weight-bold">
                      <th class="text-left py-2" style="width: 50px;">Photo</th>
                      <th class="text-left py-2 font-weight-bold">Project Name</th>
                      <th class="text-center py-2 font-weight-bold" style="width: 110px;">Qty in BOM</th>
                      <th class="text-left py-2 font-weight-bold">Designators / Notes</th>
                      <th class="text-right py-2 font-weight-bold" style="width: 90px;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="p in projectList" :key="p.id">
                      <!-- Project Thumbnail -->
                      <td class="py-2">
                        <v-avatar rounded="lg" size="36" class="border bg-slate-50">
                          <MediaImage
                            type="project"
                            :src="p.photoUrl"
                            height="36px"
                            width="36px"
                          />
                        </v-avatar>
                      </td>

                      <!-- Project Name -->
                      <td class="py-2">
                        <div
                          class="font-weight-bold text-body-2 text-primary cursor-pointer d-flex align-center gap-1 hover-underline"
                          @click="openProject(p.id)"
                        >
                          <span>{{ p.projectName }}</span>
                          <v-icon size="14">mdi-open-in-new</v-icon>
                        </div>
                        <div class="text-caption text-disabled text-truncate" style="max-width: 260px;" :title="p.description">
                          {{ p.description || '—' }}
                        </div>
                      </td>

                      <!-- Quantity in BOM -->
                      <td class="text-center py-2">
                        <v-chip
                          size="small"
                          color="primary"
                          variant="tonal"
                          class="font-mono font-weight-bold px-2"
                        >
                          {{ p.requiredQuantity }} pcs
                        </v-chip>
                      </td>

                      <!-- Designators -->
                      <td class="py-2 font-mono text-caption text-slate-700">
                        {{ p.designators || '—' }}
                      </td>

                      <!-- Action Button -->
                      <td class="text-right py-2">
                        <v-btn
                          size="small"
                          variant="outlined"
                          color="primary"
                          @click="openProject(p.id)"
                        >
                          View
                        </v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </div>
          </v-window-item>

          <!-- TAB 3: PURCHASES & PRICING -->
          <v-window-item value="orders">
            <!-- Header Row with Buy Button -->
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="text-subtitle-2 font-weight-bold text-slate-800 d-flex align-center gap-1">
                <v-icon size="18" color="primary">mdi-cash-multiple</v-icon>
                <span>Purchasing & Financial Insights</span>
              </div>
            </div>

            <!-- Stat Cards Row -->
            <div v-if="displayComponent.pricing?.orderCount > 0" class="mb-3">
              <v-row dense>
                <v-col cols="6" sm="3">
                  <v-card variant="outlined" class="pa-2 bg-slate-50 rounded-lg">
                    <div class="text-caption text-disabled text-truncate">Latest Price</div>
                    <div class="text-subtitle-1 font-weight-bold text-primary font-mono">
                      {{ formatCurrency(displayComponent.pricing.latestPrice) }}
                    </div>
                    <div class="text-caption text-disabled text-truncate font-mono" v-if="displayComponent.pricing.latestOrderDate">
                      {{ formatDate(displayComponent.pricing.latestOrderDate) }}
                    </div>
                  </v-card>
                </v-col>
                <v-col cols="6" sm="3">
                  <v-card variant="outlined" class="pa-2 bg-slate-50 rounded-lg">
                    <div class="text-caption text-disabled text-truncate">Weighted Avg</div>
                    <div class="text-subtitle-1 font-weight-bold text-slate-800 font-mono">
                      {{ formatCurrency(displayComponent.pricing.avgPrice) }}
                    </div>
                    <div class="text-caption text-disabled text-truncate font-mono">
                      per unit
                    </div>
                  </v-card>
                </v-col>
                <v-col cols="6" sm="3">
                  <v-card variant="outlined" class="pa-2 bg-slate-50 rounded-lg">
                    <div class="text-caption text-disabled text-truncate">Total Ordered</div>
                    <div class="text-subtitle-1 font-weight-bold text-slate-800 font-mono">
                      {{ displayComponent.pricing.totalQuantityPurchased }} pcs
                    </div>
                    <div class="text-caption text-disabled text-truncate font-mono">
                      {{ displayComponent.pricing.orderCount }} {{ displayComponent.pricing.orderCount === 1 ? 'order' : 'orders' }}
                    </div>
                  </v-card>
                </v-col>
                <v-col cols="6" sm="3">
                  <v-card variant="outlined" class="pa-2 bg-slate-50 rounded-lg">
                    <div class="text-caption text-disabled text-truncate">Total Spent</div>
                    <div class="text-subtitle-1 font-weight-bold text-slate-900 font-mono">
                      {{ formatCurrency(displayComponent.pricing.totalSpent) }}
                    </div>
                    <div class="text-caption text-disabled text-truncate font-mono">
                      all purchases
                    </div>
                  </v-card>
                </v-col>
              </v-row>

              <!-- Orders Table -->
              <div class="mt-3 border rounded-lg overflow-hidden">
                <v-table density="compact" class="bg-white orders-table">
                  <thead>
                    <tr class="bg-slate-50 text-caption font-weight-bold">
                      <th class="text-left py-2 font-weight-bold">Date</th>
                      <th class="text-right py-2 font-weight-bold">Unit Price</th>
                      <th class="text-center py-2 font-weight-bold">Qty</th>
                      <th class="text-right py-2 font-weight-bold">Total</th>
                      <th class="text-left py-2 font-weight-bold">Supplier / Notes</th>
                      <th class="text-center py-2 font-weight-bold" style="width: 50px;">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="order in displayComponent.pricing.orders" :key="order.id">
                      <td class="text-caption font-mono">{{ formatDate(order.date) }}</td>
                      <td class="text-right text-caption font-mono font-weight-bold text-primary">
                        {{ formatCurrency(order.price) }}
                      </td>
                      <td class="text-center text-caption font-mono">{{ order.qty }}</td>
                      <td class="text-right text-caption font-mono font-weight-medium">
                        {{ formatCurrency(order.totalCost) }}
                      </td>
                      <td class="text-caption text-truncate" style="max-width: 180px;" :title="order.details">
                        {{ order.details || '—' }}
                      </td>
                      <td class="text-center">
                        <v-btn
                          v-if="order.url"
                          :href="order.url"
                          target="_blank"
                          icon="mdi-open-in-new"
                          size="x-small"
                          variant="text"
                          color="primary"
                          title="Open supplier link"
                        />
                        <span v-else class="text-disabled text-caption">—</span>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </div>

            <div v-else class="text-caption text-disabled italic py-8 text-center">
              <v-icon size="44" class="mb-2 text-disabled">mdi-cash-remove</v-icon>
              <div class="text-body-2 font-weight-medium text-slate-700">No purchase order records found in database.</div>
              <div class="text-caption text-disabled mt-1 mb-3">
                Record a purchase order to track pricing history, supplier links, and update inventory stock.
              </div>
              <v-btn
                color="primary"
                variant="outlined"
                size="small"
                prepend-icon="mdi-cash-plus"
                class="font-weight-bold"
                @click="openPurchaseDialog"
              >
                Buy / Record Purchase
              </v-btn>
            </div>
          </v-window-item>
        </v-window>
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

        <!-- Buy Component -->
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          prepend-icon="mdi-cash-check"
          class="font-weight-bold me-2"
          @click="openPurchaseDialog"
        >
          Buy
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

    <!-- PURCHASE CONFIRMATION DIALOG -->
    <PurchaseConfirmDialog
      v-model="showPurchaseDialog"
      :item="purchaseDialogItem"
      @purchased="handlePurchased"
      @notify="notify"
    />

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import api, { resolveMediaUrl } from '../services/api';
import MediaImage from './MediaImage.vue';
import PackageLink from './PackageLink.vue';
import PurchaseConfirmDialog from './PurchaseConfirmDialog.vue';
import { formatCurrency, formatDate } from '../utils/formatters';

const router = useRouter();

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

const emit = defineEmits(['update:modelValue', 'select', 'add-to-shopping-list', 'purchased']);

const activeTab = ref('overview');
const detailedComponent = ref(null);
const loading = ref(false);
const addingToShoppingList = ref(false);
const showPurchaseDialog = ref(false);
const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

// Merges incoming component prop with asynchronously fetched full details (warehouse allocations, projects, etc.)
const displayComponent = computed(() => {
  if (detailedComponent.value) {
    return detailedComponent.value;
  }
  return props.component || null;
});

const projectList = computed(() => {
  return detailedComponent.value?.projects || [];
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

const openProject = (projectId) => {
  close();
  router.push(`/projects/${projectId}`);
};

const selectAndClose = () => {
  if (displayComponent.value) {
    emit('select', displayComponent.value);
  }
  close();
};

const saveStockQty = async (newVal) => {
  const compId = displayComponent.value?.ID || displayComponent.value?.id;
  if (!compId) return;
  const parsed = parseInt(newVal, 10);
  if (isNaN(parsed) || parsed < 0) return;
  try {
    await api.updateComponentQty(compId, parsed);
    if (detailedComponent.value) {
      detailedComponent.value.qty = parsed;
    }
    if (props.component) {
      props.component.qty = parsed;
    }
    notify(`Updated stock quantity to ${parsed} pcs`);
  } catch (err) {
    notify('Failed to update stock quantity: ' + err.message, 'error');
  }
};

const saveMinQty = async (newVal) => {
  const compId = displayComponent.value?.ID || displayComponent.value?.id;
  if (!compId) return;
  const parsed = parseInt(newVal, 10);
  if (isNaN(parsed) || parsed < 0) return;
  try {
    await api.updateComponentMinQty(compId, parsed);
    if (detailedComponent.value) {
      detailedComponent.value.minQty = parsed;
    }
    if (props.component) {
      props.component.minQty = parsed;
    }
    notify(`Updated minimal acceptable quantity to ${parsed} pcs`);
  } catch (err) {
    notify('Failed to update minimal quantity: ' + err.message, 'error');
  }
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

const purchaseDialogItem = computed(() => {
  if (!displayComponent.value) return null;
  const c = displayComponent.value;
  return {
    isComponentDirect: true,
    componentId: c.ID || c.id,
    component: c.component,
    marking: c.marking,
    category: c.category,
    package: c.package,
    photoURL: c.photoURL,
    directQty: 1,
    qty: 1,
    stockQuantity: c.qty ?? 0,
    latestPrice: c.pricing?.latestPrice != null ? c.pricing.latestPrice : (c.latestPrice ?? 0),
    latestOrderDetails: c.pricing?.latestOrderDetails || '',
    latestOrderUrl: c.pricing?.latestOrderUrl || ''
  };
});

const openPurchaseDialog = () => {
  showPurchaseDialog.value = true;
};

const handlePurchased = async (res) => {
  notify(`Order #${res.orderId} created for ${res.qty} pcs! Stock updated to ${res.newStock} pcs.`, 'success');
  if (detailedComponent.value) {
    detailedComponent.value.qty = res.newStock;
  }
  if (props.component) {
    props.component.qty = res.newStock;
  }
  await loadFullDetails();
  emit('purchased', res);
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    activeTab.value = 'overview';
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
.hover-underline:hover {
  text-decoration: underline;
}
</style>
