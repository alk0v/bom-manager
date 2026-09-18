<template>
  <div class="shopping-list-view">
    <!-- Top Header Card -->
    <v-card elevation="1" class="rounded-0 border bg-white mb-4">
      <v-card-item class="bg-slate-50 py-3 px-5 border-b">
        <div class="d-flex flex-wrap align-center justify-space-between gap-3">
          <div class="d-flex align-center">
            <v-icon color="primary" size="24" class="me-2">mdi-cart-outline</v-icon>
            <div>
              <div class="d-flex align-center gap-2">
                <span class="text-h6 font-weight-bold text-slate-900">
                  Procurement Shopping List
                </span>
                <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold font-mono">
                  {{ items.length }} items
                </v-chip>
              </div>
              <div class="text-caption text-slate-500">
                Manage planned part purchases, replenish shortages, and log purchase orders into database
              </div>
            </div>
          </div>

          <div class="d-flex align-center gap-2">
            <v-btn
              prepend-icon="mdi-content-copy"
              size="small"
              variant="outlined"
              color="slate-700"
              class="font-weight-medium"
              :disabled="items.length === 0"
              @click="copyShoppingList"
            >
              Copy List
            </v-btn>

            <v-btn
              icon="mdi-refresh"
              size="small"
              variant="text"
              color="slate-600"
              :loading="loading"
              title="Refresh shopping list"
              @click="loadShoppingList"
            />
          </div>
        </div>
      </v-card-item>

      <!-- KPI Summary Cards -->
      <div class="px-5 py-3 bg-white border-b">
        <v-row dense>
          <v-col cols="12" sm="4">
            <v-card variant="outlined" class="pa-3 bg-slate-50 rounded-lg">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-caption text-disabled text-uppercase font-weight-bold">Distinct Parts</div>
                  <div class="text-h5 font-weight-bold text-slate-900 font-mono mt-1">
                    {{ items.length }}
                  </div>
                </div>
                <v-avatar color="primary" variant="tonal" rounded="lg" size="40">
                  <v-icon size="22">mdi-chip</v-icon>
                </v-avatar>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" sm="4">
            <v-card variant="outlined" class="pa-3 bg-slate-50 rounded-lg">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-caption text-disabled text-uppercase font-weight-bold">Total Units to Buy</div>
                  <div class="text-h5 font-weight-bold text-slate-900 font-mono mt-1">
                    {{ totalUnitsNeeded }} pcs
                  </div>
                </div>
                <v-avatar color="secondary" variant="tonal" rounded="lg" size="40">
                  <v-icon size="22">mdi-numeric</v-icon>
                </v-avatar>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" sm="4">
            <v-card variant="outlined" class="pa-3 bg-slate-50 rounded-lg">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-caption text-disabled text-uppercase font-weight-bold">Est. Procurement Cost</div>
                  <div class="text-h5 font-weight-bold text-primary font-mono mt-1">
                    {{ formatCurrency(estimatedTotalCost) }}
                  </div>
                </div>
                <v-avatar color="success" variant="tonal" rounded="lg" size="40">
                  <v-icon size="22">mdi-currency-usd</v-icon>
                </v-avatar>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Filter / Search Toolbar -->
      <div class="px-5 py-3 bg-white d-flex align-center justify-space-between flex-wrap gap-3">
        <v-text-field
          v-model="searchQuery"
          placeholder="Filter shopping list by name, package, marking, or store..."
          prepend-inner-icon="mdi-magnify"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          rounded="lg"
          style="max-width: 420px; width: 100%;"
        />

        <div class="text-caption text-disabled font-mono">
          Showing {{ filteredItems.length }} of {{ items.length }} items
        </div>
      </div>

      <v-divider />

      <!-- Shopping List Table -->
      <v-table density="comfortable" hover class="shopping-table">
        <thead>
          <tr class="bg-slate-50">
            <th class="text-left font-weight-bold" style="width: 50px;">Photo</th>
            <th class="text-left font-weight-bold">Component / Part</th>
            <th class="text-left font-weight-bold">Category</th>
            <th class="text-left font-weight-bold">Package</th>
            <th class="text-center font-weight-bold">Current Stock</th>
            <th class="text-center font-weight-bold" style="width: 140px;">Quantity to Buy</th>
            <th class="text-right font-weight-bold">Est. Unit Price</th>
            <th class="text-right font-weight-bold">Est. Total</th>
            <th class="text-center font-weight-bold">Date Added</th>
            <th class="text-right font-weight-bold" style="width: 90px;">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="item in filteredItems" :key="item.id">
            <!-- Photo Thumbnail (clickable) -->
            <td>
              <v-avatar
                rounded="lg"
                size="36"
                class="border bg-slate-50"
                :class="{ 'cursor-pointer hover-zoom': !!item.photoURL }"
                :title="item.photoURL ? 'Click to view photo in full size' : ''"
                @click="item.photoURL ? openImageLightbox(item) : openComponentDetails(item)"
              >
                <MediaImage
                  type="component"
                  :src="item.photoURL"
                  height="36px"
                  width="36px"
                />
              </v-avatar>
            </td>

            <!-- Component Name & Marking (clickable link) -->
            <td>
              <div
                class="font-mono font-weight-bold text-body-2 text-primary comp-name-link d-inline-flex align-center gap-1 cursor-pointer"
                @click="openComponentDetails(item)"
                title="Click to view component details & purchase history"
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

            <!-- Package (clickable PackageLink) -->
            <td>
              <PackageLink :item="item" />
            </td>

            <!-- Current Stock (No chips, consistent color typography) -->
            <td class="text-center font-mono font-weight-bold text-body-2">
              <span
                :class="[
                  (!item.stockQuantity || item.stockQuantity <= 0)
                    ? 'text-error'
                    : (item.minQty > 0 && item.stockQuantity <= item.minQty ? 'text-orange-darken-2' : 'text-slate-800')
                ]"
              >
                {{ item.stockQuantity ?? 0 }}
              </span>
            </td>

            <!-- Aligned Quantity Selector (standard fixed width) -->
            <td class="text-center">
              <div class="d-inline-flex align-center border bg-white rounded-lg px-1 justify-space-between quantity-stepper" style="height: 32px; width: 116px;">
                <v-btn
                  icon="mdi-minus"
                  size="x-small"
                  variant="text"
                  density="compact"
                  :disabled="item.qty <= 1"
                  title="Decrease quantity"
                  @click="updateQuantity(item, item.qty - 1)"
                />
                <input
                  type="number"
                  min="1"
                  :value="item.qty"
                  @change="e => onQtyInputChange(item, e.target.value)"
                  class="font-mono font-weight-bold text-center text-slate-900 border-0 outline-none"
                  style="width: 44px; font-size: 0.9rem;"
                />
                <v-btn
                  icon="mdi-plus"
                  size="x-small"
                  variant="text"
                  density="compact"
                  title="Increase quantity"
                  @click="updateQuantity(item, item.qty + 1)"
                />
              </div>
            </td>

            <!-- Est. Unit Price -->
            <td class="text-right font-mono text-body-2">
              <span
                v-if="item.latestPrice != null"
                class="text-slate-800"
                :title="item.latestOrderDate ? `Last purchase on ${formatDate(item.latestOrderDate)}` : ''"
              >
                {{ formatCurrency(item.latestPrice) }}
              </span>
              <span v-else class="text-disabled text-caption italic">—</span>
            </td>

            <!-- Est. Total -->
            <td class="text-right font-mono text-body-2 font-weight-bold">
              <span v-if="item.latestPrice != null" class="text-primary">
                {{ formatCurrency(item.qty * item.latestPrice) }}
              </span>
              <span v-else class="text-disabled text-caption italic">—</span>
            </td>

            <!-- Date Added -->
            <td class="text-center text-caption text-disabled font-mono">
              {{ formatDate(item.date) }}
            </td>

            <!-- Actions -->
            <td class="text-right text-no-wrap">
              <!-- Buy Component -->
              <v-btn
                icon="mdi-cash-check"
                size="small"
                color="primary"
                variant="text"
                title="Buy Component"
                @click="openPurchaseDialog(item)"
              />

              <!-- Remove without buying -->
              <v-btn
                icon="mdi-delete-outline"
                size="small"
                color="error"
                variant="text"
                title="Remove from shopping list"
                @click="removeItem(item)"
              />
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-if="filteredItems.length === 0 && !loading">
            <td colspan="10" class="text-center py-10 text-disabled">
              <v-icon size="48" class="mb-2">mdi-cart-check</v-icon>
              <div class="text-subtitle-1 text-slate-800 font-weight-medium">
                {{ searchQuery ? 'No shopping list items match your filter' : 'Your procurement shopping list is empty' }}
              </div>
              <div class="text-caption mt-1">
                {{ searchQuery ? 'Try adjusting your search terms' : 'Add shortage parts from project BOMs or from the component catalog.' }}
              </div>
            </td>
          </tr>

          <!-- Loading State -->
          <tr v-if="loading">
            <td colspan="10" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
            </td>
          </tr>
        </tbody>

        <!-- Table Footer / Totals -->
        <tfoot v-if="filteredItems.length > 0">
          <tr class="bg-slate-50 font-weight-bold border-t">
            <td colspan="5" class="py-3 px-4 text-subtitle-2 font-weight-bold text-slate-800">
              Total Shopping List Requirements
              <span class="text-caption text-disabled ms-2 font-normal">
                ({{ filteredItems.length }} components listed)
              </span>
            </td>
            <td class="text-center font-mono font-weight-bold py-3 text-body-2">
              {{ totalFilteredUnits }} pcs
            </td>
            <td></td>
            <td class="text-right font-mono font-weight-bold text-subtitle-2 text-primary py-3">
              {{ formatCurrency(totalFilteredCost) }}
            </td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </v-table>
    </v-card>

    <!-- Modal: Purchase Confirmation & Order Creation -->
    <PurchaseConfirmDialog
      v-model="showPurchaseDialog"
      :item="selectedItemForPurchase"
      @purchased="onItemPurchased"
      @notify="notify"
    />

    <!-- Modal: Component Details -->
    <ComponentDetailsDialog
      v-model="showDetailsDialog"
      :component="selectedItemForDetails"
      @notify="notify"
    />

    <!-- Modal: Photo Lightbox -->
    <v-dialog v-model="lightbox.show" max-width="800">
      <v-card class="rounded-0 border bg-white overflow-hidden">
        <v-card-title class="bg-slate-50 py-3 px-4 border-b d-flex align-center justify-space-between">
          <div class="font-mono font-weight-bold text-subtitle-1 text-slate-900">
            {{ lightbox.title }}
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="lightbox.show = false" />
        </v-card-title>
        <v-card-text class="pa-4 d-flex align-center justify-center bg-slate-50" style="min-height: 350px;">
          <MediaImage
            type="component"
            :src="lightbox.src"
            height="auto"
            width="100%"
            style="max-height: 600px; object-fit: contain;"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Notification Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3500">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../services/api';
import MediaImage from '../components/MediaImage.vue';
import PackageLink from '../components/PackageLink.vue';
import PurchaseConfirmDialog from '../components/PurchaseConfirmDialog.vue';
import ComponentDetailsDialog from '../components/ComponentDetailsDialog.vue';
import { formatCurrency, formatDate } from '../utils/formatters';

const items = ref([]);
const loading = ref(false);
const searchQuery = ref('');

const showPurchaseDialog = ref(false);
const selectedItemForPurchase = ref(null);

const showDetailsDialog = ref(false);
const selectedItemForDetails = ref(null);

const lightbox = ref({
  show: false,
  src: null,
  title: ''
});

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

// Computed statistics
const totalUnitsNeeded = computed(() => {
  return items.value.reduce((acc, i) => acc + (Number(i.qty) || 0), 0);
});

const estimatedTotalCost = computed(() => {
  let cost = 0;
  for (const item of items.value) {
    if (item.latestPrice != null) {
      cost += (Number(item.qty) || 0) * Number(item.latestPrice);
    }
  }
  return cost;
});

const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return items.value;
  const q = searchQuery.value.toLowerCase().trim();
  return items.value.filter(item =>
    (item.component && item.component.toLowerCase().includes(q)) ||
    (item.marking && item.marking.toLowerCase().includes(q)) ||
    (item.description && item.description.toLowerCase().includes(q)) ||
    (item.shortDescription && item.shortDescription.toLowerCase().includes(q)) ||
    (item.category && item.category.toLowerCase().includes(q)) ||
    (item.package && item.package.toLowerCase().includes(q)) ||
    (item.latestOrderDetails && item.latestOrderDetails.toLowerCase().includes(q))
  );
});

const totalFilteredUnits = computed(() => {
  return filteredItems.value.reduce((acc, i) => acc + (Number(i.qty) || 0), 0);
});

const totalFilteredCost = computed(() => {
  let cost = 0;
  for (const item of filteredItems.value) {
    if (item.latestPrice != null) {
      cost += (Number(item.qty) || 0) * Number(item.latestPrice);
    }
  }
  return cost;
});

// Load shopping list from API
const loadShoppingList = async () => {
  loading.value = true;
  try {
    items.value = await api.getShoppingList();
  } catch (err) {
    notify('Failed to load shopping list: ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

// Quantity stepper handlers
const updateQuantity = async (item, newQty) => {
  const parsed = parseInt(newQty, 10);
  if (isNaN(parsed) || parsed < 1) return;
  try {
    await api.updateShoppingListItem(item.id, { qty: parsed });
    item.qty = parsed;
  } catch (err) {
    notify('Failed to update quantity: ' + err.message, 'error');
  }
};

const onQtyInputChange = (item, rawVal) => {
  const parsed = parseInt(rawVal, 10);
  if (isNaN(parsed) || parsed < 1) {
    // Revert to current qty
    item.qty = item.qty || 1;
    return;
  }
  updateQuantity(item, parsed);
};

// Dialog openers
const openPurchaseDialog = (item) => {
  selectedItemForPurchase.value = { ...item };
  showPurchaseDialog.value = true;
};

const openComponentDetails = (item) => {
  selectedItemForDetails.value = {
    ...item,
    ID: item.componentId || item.id,
    id: item.componentId || item.id
  };
  showDetailsDialog.value = true;
};

const openImageLightbox = (item) => {
  lightbox.value = {
    show: true,
    src: item.photoURL,
    title: item.component
  };
};

// Purchase completion callback
const onItemPurchased = async (result) => {
  // If remaining in basket is 0, remove locally; otherwise update qty
  if (result.remainingInBasket === 0) {
    items.value = items.value.filter(i => i.id !== selectedItemForPurchase.value?.id);
  } else {
    const found = items.value.find(i => i.id === selectedItemForPurchase.value?.id);
    if (found) {
      found.qty = result.remainingInBasket;
    }
  }
  // Refresh shopping list to ensure stock levels and order data are synchronized
  await loadShoppingList();
};

const removeItem = async (item) => {
  try {
    await api.deleteShoppingListItem(item.id);
    items.value = items.value.filter(i => i.id !== item.id);
    notify(`Removed ${item.component} from shopping list`);
  } catch (err) {
    notify('Failed to remove item: ' + err.message, 'error');
  }
};

const copyShoppingList = () => {
  const text = items.value
    .map(i => `${i.component} (${i.package || 'N/A'}) - Qty: ${i.qty}`)
    .join('\n');
  navigator.clipboard.writeText(text);
  notify('Shopping list copied to clipboard!');
};

onMounted(() => {
  loadShoppingList();
});
</script>

<style scoped>
.bg-slate-50 {
  background-color: #f8fafc !important;
}
.border-b {
  border-bottom: 1px solid #e2e8f0 !important;
}
.shopping-table :deep(th) {
  background-color: #f8fafc !important;
  color: #0F172A !important;
  font-weight: 700 !important;
  font-size: 0.82rem;
}
.comp-name-link {
  transition: opacity 0.15s ease;
}
.comp-name-link:hover .hover-underline {
  text-decoration: underline;
}
.hover-zoom {
  transition: transform 0.15s ease;
}
.hover-zoom:hover {
  transform: scale(1.1);
}
.quantity-stepper {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
</style>
