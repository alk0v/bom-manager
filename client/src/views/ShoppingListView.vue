<template>
  <div class="shopping-list-view">
    <!-- Main Shopping List Card -->
    <v-card elevation="1" class="rounded-0 border bg-white mb-4">
      <!-- KPI Summary Cards -->
      <div class="px-5 py-3 bg-white border-b">
        <v-row dense>
          <v-col cols="12" sm="4">
            <v-card variant="outlined" class="pa-3 bg-slate-50 rounded-lg">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-caption text-disabled text-uppercase font-weight-bold">
                    {{ t('shoppingList.distinctParts') }}
                  </div>
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
                  <div class="text-caption text-disabled text-uppercase font-weight-bold">
                    {{ t('shoppingList.totalUnitsToBuy') }}
                  </div>
                  <div class="text-h5 font-weight-bold text-slate-900 font-mono mt-1">
                    {{ totalUnitsNeeded }} {{ t('shoppingList.pcs') }}
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
                  <div class="text-caption text-disabled text-uppercase font-weight-bold">
                    {{ t('shoppingList.estProcurementCost') }}
                  </div>
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

      <!-- Filter / Search & Actions Toolbar -->
      <div class="px-5 py-3 bg-white d-flex align-center justify-space-between flex-wrap gap-3">
        <v-text-field
          v-model="searchQuery"
          :placeholder="t('shoppingList.searchPlaceholder')"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          rounded="lg"
          style="max-width: 420px; width: 100%;"
        />

        <div class="d-flex align-center gap-2">
          <div class="text-caption text-disabled font-mono me-2">
            {{ t('common.showingOf', { count: filteredItems.length, total: items.length, item: t('common.items') }) }}
          </div>

          <v-btn
            prepend-icon="mdi-content-copy"
            size="small"
            variant="outlined"
            color="slate-700"
            class="font-weight-medium"
            :disabled="items.length === 0"
            @click="copyShoppingList"
          >
            {{ t('shoppingList.copyList') }}
          </v-btn>

          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="text"
            color="slate-600"
            :loading="loading"
            :title="t('shoppingList.refreshTooltip')"
            @click="loadShoppingList"
          />
        </div>
      </div>

      <v-divider />

      <!-- Shopping List Table -->
      <v-table density="comfortable" hover class="shopping-table">
        <thead>
          <tr class="bg-slate-50">
            <th class="text-left font-weight-bold" style="width: 50px;">Photo</th>
            <th class="text-left font-weight-bold">{{ t('shoppingList.colComponent') }}</th>
            <th class="text-left font-weight-bold">{{ t('common.category') }}</th>
            <th class="text-left font-weight-bold">{{ t('common.package') }}</th>
            <th class="text-center font-weight-bold">{{ t('shoppingList.colCurrentStock') }}</th>
            <th class="text-center font-weight-bold" style="width: 140px;">{{ t('shoppingList.colNeeded') }}</th>
            <th class="text-right font-weight-bold">{{ t('dialogs.unitPrice') }}</th>
            <th class="text-right font-weight-bold">{{ t('common.total') }}</th>
            <th class="text-center font-weight-bold">{{ t('shoppingList.colDateAdded') }}</th>
            <th class="text-left font-weight-bold" style="width: 100px;">{{ t('shoppingList.colActions') }}</th>
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
                :title="item.photoURL ? t('dialogs.viewFullSize') : ''"
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
                :title="t('shoppingList.viewDetailsAndHistory')"
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
                  :title="t('shoppingList.decreaseQty')"
                  @click="updateQuantity(item, item.qty - 1)"
                />
                <input
                  type="number"
                  min="1"
                  :value="item.qty"
                  @change="e => onQtyInputChange(item, e.target.value)"
                  class="font-mono font-weight-bold text-center text-slate-900 border-0 outline-none quantity-input"
                  style="width: 48px; font-size: 0.9rem;"
                />
                <v-btn
                  icon="mdi-plus"
                  size="x-small"
                  variant="text"
                  density="compact"
                  :title="t('shoppingList.increaseQty')"
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
            <td class="text-left text-no-wrap">
              <!-- Buy Component -->
              <v-btn
                icon="mdi-cash-check"
                size="small"
                color="primary"
                variant="text"
                :title="t('shoppingList.buyComponent')"
                @click="openPurchaseDialog(item)"
              />

              <!-- Remove without buying -->
              <v-btn
                icon="mdi-delete-outline"
                size="small"
                color="error"
                variant="text"
                :title="t('shoppingList.removeFromList')"
                @click="removeItem(item)"
              />
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-if="filteredItems.length === 0 && !loading">
            <td colspan="10" class="text-center py-10 text-disabled">
              <v-icon size="48" class="mb-2">mdi-cart-check</v-icon>
              <div class="text-subtitle-1 text-slate-800 font-weight-medium">
                {{ searchQuery ? t('shoppingList.noMatch') : t('shoppingList.emptyTitle') }}
              </div>
              <div class="text-caption mt-1">
                {{ searchQuery ? t('shoppingList.adjustSearch') : t('shoppingList.emptySubtitle') }}
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
              {{ t('shoppingList.totalRequirements') }}
              <span class="text-caption text-disabled ms-2 font-normal">
                ({{ t('shoppingList.componentsListed', { count: filteredItems.length }) }})
              </span>
            </td>
            <td class="text-center font-mono font-weight-bold py-3 text-body-2">
              {{ totalFilteredUnits }} {{ t('shoppingList.pcs') }}
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
      @updated="loadShoppingList"
      @deleted="loadShoppingList"
      @notify="notify"
    />

    <!-- Modal: Photo Lightbox -->
    <MediaLightboxDialog
      v-model="lightbox.show"
      type="component"
      :src="lightbox.src"
      :title="lightbox.title"
    />

    <!-- Notification Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3500">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';

const { t } = useI18n();
import MediaImage from '../components/MediaImage.vue';
import MediaLightboxDialog from '../components/MediaLightboxDialog.vue';
import PackageLink from '../components/PackageLink.vue';
import PurchaseConfirmDialog from '../components/PurchaseConfirmDialog.vue';
import ComponentDetailsDialog from '../components/ComponentDetailsDialog.vue';
import { useShoppingListStore } from '../stores/shoppingList';
import { formatCurrency, formatDate } from '../utils/formatters';

const shoppingListStore = useShoppingListStore();

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
    shoppingListStore.setCount(items.value.length);
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
  notify(t('shoppingList.listCopied'));
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
.quantity-input::-webkit-outer-spin-button,
.quantity-input::-webkit-inner-spin-button,
.quantity-stepper input[type=number]::-webkit-outer-spin-button,
.quantity-stepper input[type=number]::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
}
.quantity-input,
.quantity-stepper input[type=number] {
  -moz-appearance: textfield !important;
}
</style>
