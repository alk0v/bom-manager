<template>
  <div class="purchases-report-view">
    <!-- Purchases KPI Cards -->
    <v-row dense class="mb-6">
      <!-- Total Spend -->
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="1" class="rounded-0 border bg-white pa-4 h-100 d-flex align-center">
          <v-avatar color="success" variant="tonal" rounded="lg" size="48" class="me-4 flex-shrink-0">
            <v-icon size="26" color="success">mdi-currency-usd</v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">{{ t('reports.totalPurchases') }}</div>
            <div class="text-h5 font-weight-bold text-slate-900 font-mono">
              {{ formatCurrency(purchasesStats.totalSpent || 0) }}
            </div>
            <div class="text-caption text-slate-500 font-weight-medium">
              {{ t('reports.deliveredOrders') }}: {{ formatCurrency(purchasesStats.deliveredSpent || 0) }}
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Total Orders -->
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="1" class="rounded-0 border bg-white pa-4 h-100 d-flex align-center">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="48" class="me-4 flex-shrink-0">
            <v-icon size="26" color="primary">mdi-cart-check</v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">{{ t('reports.totalOrdersCount') }}</div>
            <div class="text-h5 font-weight-bold text-slate-900 font-mono">{{ purchasesStats.totalOrders || 0 }}</div>
            <div class="text-caption text-primary font-weight-medium">
              {{ purchasesStats.deliveredOrdersCount || 0 }} {{ t('reports.statusCompleted').toLowerCase() }}
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Total Units Purchased -->
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="1" class="rounded-0 border bg-white pa-4 h-100 d-flex align-center">
          <v-avatar color="info" variant="tonal" rounded="lg" size="48" class="me-4 flex-shrink-0">
            <v-icon size="26" color="info">mdi-counter</v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">{{ t('reports.totalUnitsPurchased') }}</div>
            <div class="text-h5 font-weight-bold text-slate-900 font-mono">{{ purchasesStats.totalUnits || 0 }}</div>
            <div class="text-caption text-slate-500">
              {{ purchasesStats.uniqueComponentsCount || 0 }} {{ t('reports.uniqueComponentsPurchased').toLowerCase() }}
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Pending Deliveries -->
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="1" class="rounded-0 border bg-white pa-4 h-100 d-flex align-center">
          <v-avatar color="amber-darken-3" variant="tonal" rounded="lg" size="48" class="me-4 flex-shrink-0">
            <v-icon size="26" color="amber-darken-3">mdi-truck-delivery-outline</v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">{{ t('reports.pendingDeliveries') }}</div>
            <div class="text-h5 font-weight-bold text-amber-darken-3 font-mono">
              {{ purchasesStats.pendingOrdersCount || 0 }}
            </div>
            <div class="text-caption text-slate-500">
              {{ purchasesStats.pendingUnits || 0 }} {{ t('reports.units') }} • {{ formatCurrency(purchasesStats.pendingSpent || 0) }}
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Purchases Orders Table Card -->
    <v-card elevation="1" class="rounded-0 border bg-white">
      <!-- Toolbar & Filters -->
      <div class="bg-slate-50 py-3 px-5 border-b" style="min-height: 64px;">
        <div class="d-flex flex-wrap align-center justify-space-between gap-3">
          <!-- Left: Filters -->
          <div class="d-flex flex-wrap align-center gap-3 flex-grow-1">
            <!-- Search input -->
            <v-text-field
              v-model="purchasesSearch"
              :placeholder="t('reports.searchPurchasesPlaceholder')"
              prepend-inner-icon="mdi-magnify"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              rounded="lg"
              bg-color="white"
              style="min-width: 220px; max-width: 320px;"
              @update:model-value="debounceFetchPurchases"
            />

            <!-- Status Toggle (All / Delivered / Pending) -->
            <v-btn-toggle
              v-model="purchasesStatus"
              mandatory
              density="compact"
              variant="outlined"
              rounded="lg"
              color="primary"
              class="flex-shrink-0 bg-white"
              style="height: 40px;"
              @update:model-value="loadPurchasesReport"
            >
              <v-btn value="all" size="small" class="px-3 text-caption font-weight-medium">
                {{ t('common.all') }}
              </v-btn>
              <v-btn value="delivered" size="small" class="px-2" :title="t('reports.deliveredOrders')">
                <v-icon size="18">mdi-cart-outline</v-icon>
                <v-tooltip activator="parent" location="top">{{ t('reports.deliveredOrders') }}</v-tooltip>
              </v-btn>
              <v-btn value="pending" size="small" class="px-2" :title="t('reports.pendingDeliveries')">
                <v-icon size="18">mdi-truck-delivery-outline</v-icon>
                <v-tooltip activator="parent" location="top">{{ t('reports.pendingDeliveries') }}</v-tooltip>
              </v-btn>
              <v-btn value="cancelled" size="small" class="px-2" :title="t('reports.cancelledOrders')">
                <v-icon size="18" color="error">mdi-close-circle-outline</v-icon>
                <v-tooltip activator="parent" location="top">{{ t('reports.cancelledOrders') }}</v-tooltip>
              </v-btn>
            </v-btn-toggle>

            <!-- Start Date -->
            <v-text-field
              v-model="purchasesStartDate"
              type="date"
              :label="t('reports.startDate')"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              rounded="lg"
              bg-color="white"
              style="min-width: 205px; width: 205px;"
              @update:model-value="loadPurchasesReport"
            />

            <!-- End Date -->
            <v-text-field
              v-model="purchasesEndDate"
              type="date"
              :label="t('reports.endDate')"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              rounded="lg"
              bg-color="white"
              style="min-width: 205px; width: 205px;"
              @update:model-value="loadPurchasesReport"
            />
          </div>

          <!-- Right: Reset & Refresh -->
          <div class="d-flex align-center gap-2 text-caption text-slate-500">
            <v-btn
              v-if="purchasesSearch || purchasesStatus !== 'all' || purchasesStartDate || purchasesEndDate"
              variant="text"
              size="small"
              color="primary"
              class="font-weight-medium"
              prepend-icon="mdi-filter-off-outline"
              @click="resetPurchasesFilters"
            >
              {{ t('common.reset') }}
            </v-btn>
            <v-btn
              icon="mdi-refresh"
              variant="text"
              size="small"
              color="slate-600"
              :loading="purchasesLoading"
              @click="loadPurchasesReport"
              :title="t('reports.refreshTooltip')"
            />
          </div>
        </div>
      </div>

      <!-- Orders Table -->
      <v-table density="comfortable" hover class="reports-table">
        <thead>
          <tr class="bg-slate-50">
            <th class="text-left font-weight-bold" style="width: 150px;">{{ t('reports.colOrderDate') }}</th>
            <th class="text-left font-weight-bold">{{ t('shoppingList.colComponent') }}</th>
            <th class="text-center font-weight-bold" style="width: 150px;">{{ t('common.status') }}</th>
            <th class="text-center font-weight-bold" style="width: 80px;">{{ t('reports.colQty') }}</th>
            <th class="text-right font-weight-bold" style="width: 110px;">{{ t('reports.colUnitPrice') }}</th>
            <th class="text-right font-weight-bold" style="width: 120px;">{{ t('reports.colTotalCost') }}</th>
            <th class="text-left font-weight-bold" style="width: 160px;">{{ t('reports.colSupplier') }}</th>
            <th class="text-left font-weight-bold" style="width: 140px; min-width: 140px;">{{ t('common.actions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="order in purchasesOrders" :key="order.id">
            <!-- Order Date -->
            <td>
              <div class="text-body-2 font-mono text-slate-900 font-weight-medium">
                {{ formatDate(order.date) }}
              </div>
            </td>

            <!-- Component -->
            <td>
              <div class="d-flex align-center py-1">
                <v-avatar rounded="lg" size="36" class="border me-3 bg-slate-50 flex-shrink-0">
                  <MediaImage
                    type="component"
                    :src="order.photoURL"
                    height="36px"
                    width="36px"
                  />
                </v-avatar>
                <div>
                  <div
                    class="text-body-2 font-mono font-weight-bold text-primary comp-name-link d-inline-flex align-center gap-1"
                    @click="openComponentDetails(order)"
                    :title="t('shoppingList.viewDetailsAndHistory')"
                  >
                    <span class="hover-underline">{{ order.component }}</span>
                  </div>
                  <div class="d-flex align-center gap-1 text-caption text-slate-500 mt-1">
                    <span v-if="order.marking" class="font-mono me-1 font-weight-medium text-slate-700">
                      Mark: {{ order.marking }}
                    </span>
                    <span v-if="order.package">• {{ order.package }}</span>
                  </div>
                </div>
              </div>
            </td>

            <!-- Status -->
            <td class="text-center">
              <v-chip
                v-if="order.status === 'delivered'"
                size="x-small"
                color="success"
                variant="flat"
                class="font-weight-bold"
                :title="order.deliveredDate ? `${t('reports.colDeliveryDate')}: ${formatDate(order.deliveredDate)}` : ''"
              >
                <v-icon start size="12">mdi-check-circle-outline</v-icon>
                {{ t('editOrderModal.statusDelivered') }}
              </v-chip>
              <v-chip
                v-else-if="order.status === 'cancelled'"
                size="x-small"
                color="error"
                variant="tonal"
                class="font-weight-bold"
              >
                <v-icon start size="12">mdi-close-circle-outline</v-icon>
                {{ t('editOrderModal.statusCancelled') }}
              </v-chip>
              <v-chip
                v-else
                size="x-small"
                color="amber-darken-3"
                variant="tonal"
                class="font-weight-bold"
              >
                <v-icon start size="12">mdi-clock-outline</v-icon>
                {{ t('editOrderModal.statusPending') }}
              </v-chip>
            </td>

            <!-- Qty -->
            <td class="text-center font-mono font-weight-bold text-body-2">
              {{ order.qty }}
            </td>

            <!-- Unit Price -->
            <td class="text-right font-mono text-body-2">
              {{ formatCurrency(order.price) }}
            </td>

            <!-- Total Cost -->
            <td class="text-right font-mono font-weight-bold text-body-2 text-primary">
              {{ formatCurrency(order.totalCost) }}
            </td>

            <!-- Supplier Link -->
            <td class="text-left">
              <a
                v-if="order.url"
                :href="order.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary text-decoration-none font-weight-medium d-inline-flex align-center gap-1 hover-underline text-body-2"
                :title="order.url"
              >
                <span class="text-truncate" style="max-width: 140px;">{{ extractDomain(order.url) }}</span>
                <v-icon size="13" color="primary" class="flex-shrink-0">mdi-open-in-new</v-icon>
              </a>
              <span v-else class="text-disabled text-caption">—</span>
            </td>

            <!-- Actions -->
            <td class="text-left text-no-wrap" style="width: 140px; min-width: 140px;">
              <div class="d-inline-flex align-center" style="gap: 2px;">
                <!-- Edit Order Button -->
                <v-btn
                  icon="mdi-pencil-outline"
                  size="x-small"
                  variant="text"
                  color="primary"
                  :title="t('reports.editOrder')"
                  @click="openEditOrderDialog(order)"
                />

                <!-- Confirm Delivery Button (visible only when pending, space preserved) -->
                <v-btn
                  icon="mdi-package-variant-closed-check"
                  size="x-small"
                  variant="text"
                  color="success"
                  :title="t('confirmDeliveryModal.title')"
                  :style="{
                    visibility: order.status === 'pending' ? 'visible' : 'hidden',
                    pointerEvents: order.status === 'pending' ? 'auto' : 'none'
                  }"
                  :tabindex="order.status === 'pending' ? 0 : -1"
                  :aria-hidden="order.status !== 'pending'"
                  @click="order.status === 'pending' && openConfirmDeliveryForOrder(order)"
                />

                <!-- Cancel Order Button (visible only when pending, space preserved) -->
                <v-btn
                  icon="mdi-cancel"
                  size="x-small"
                  variant="text"
                  color="warning"
                  :title="t('reports.cancelOrder')"
                  :style="{
                    visibility: order.status === 'pending' ? 'visible' : 'hidden',
                    pointerEvents: order.status === 'pending' ? 'auto' : 'none'
                  }"
                  :tabindex="order.status === 'pending' ? 0 : -1"
                  :aria-hidden="order.status !== 'pending'"
                  @click="order.status === 'pending' && openCancelOrderForOrder(order)"
                />

                <!-- Delete Order Button -->
                <v-btn
                  icon="mdi-delete-outline"
                  size="x-small"
                  variant="text"
                  color="error"
                  :title="t('reports.deleteOrder')"
                  @click="openDeleteOrderDialog(order)"
                />
              </div>
            </td>
          </tr>

          <!-- Empty state -->
          <tr v-if="!purchasesLoading && purchasesOrders.length === 0">
            <td colspan="8" class="text-center py-12">
              <v-avatar color="slate-100" size="64" class="mb-3">
                <v-icon size="32" color="slate-400">mdi-cart-off</v-icon>
              </v-avatar>
              <div class="text-body-1 font-weight-bold text-slate-700">
                {{ t('reports.noPurchasesTitle') }}
              </div>
              <div class="text-caption text-slate-400 mt-1 max-w-md mx-auto">
                {{ t('reports.noPurchasesSubtitle') }}
              </div>
            </td>
          </tr>

          <!-- Loading skeleton -->
          <tr v-if="purchasesLoading && purchasesOrders.length === 0">
            <td colspan="8" class="text-center py-12">
              <v-progress-circular indeterminate color="primary" class="mb-2" />
              <div class="text-caption text-slate-500">{{ t('reports.loadingReports') }}</div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- DIALOG: EDIT ORDER MODAL -->
    <EditOrderDialog
      v-model="showEditOrderDialog"
      :order="selectedOrderForEdit"
      @saved="onOrderSaved"
    />

    <!-- DIALOG: CONFIRM DELIVERY MODAL -->
    <ConfirmDeliveryDialog
      v-model="showConfirmDeliveryDialog"
      :item="selectedOrderForDelivery"
      @delivered="onDeliveryConfirmed"
      @notify="notify"
    />

    <!-- DIALOG: DELETE ORDER CONFIRMATION -->
    <v-dialog v-model="showDeleteOrderDialog" max-width="520">
      <v-card class="rounded-0 border bg-white" v-if="orderToDelete">
        <v-card-title class="bg-red-50 py-3 px-5 border-b d-flex align-center text-error">
          <v-icon color="error" class="me-2" size="22">mdi-delete-alert</v-icon>
          <span class="text-subtitle-1 font-weight-bold">
            {{ t('reports.deleteOrderConfirmTitle', { id: orderToDelete.id }) }}
          </span>
        </v-card-title>

        <v-card-text class="pa-5">
          <p class="text-body-1 text-slate-800 mb-3">
            {{ t('reports.deleteOrderConfirmMsg', { component: `"${orderToDelete.component}"` }) }}
          </p>

          <div class="text-caption text-slate-600 mb-4 bg-slate-50 pa-3 border rounded-lg">
            <div><strong>{{ t('shoppingList.colQty') }}:</strong> {{ orderToDelete.qty }} {{ t('shoppingList.pcs') }}</div>
            <div><strong>{{ t('reports.colUnitPrice') }}:</strong> {{ formatCurrency(orderToDelete.price) }}</div>
            <div><strong>{{ t('reports.colTotalCost') }}:</strong> {{ formatCurrency(orderToDelete.totalCost) }}</div>
            <div><strong>{{ t('common.status') }}:</strong> {{ orderToDelete.status }}</div>
          </div>

          <v-checkbox
            v-if="orderToDelete.status === 'delivered'"
            v-model="deductStockOnDelete"
            color="error"
            hide-details
            density="compact"
          >
            <template #label>
              <span class="text-caption font-weight-medium text-slate-800">
                {{ t('reports.deductStockOnDelete', { qty: orderToDelete.qty }) }}
              </span>
            </template>
          </v-checkbox>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4 bg-slate-50 d-flex align-center justify-space-between">
          <v-btn variant="outlined" color="slate-600" @click="showDeleteOrderDialog = false" :disabled="deletingOrder">
            {{ t('common.cancel') }}
          </v-btn>

          <v-btn
            color="error"
            variant="flat"
            class="font-weight-bold px-4"
            prepend-icon="mdi-delete"
            :loading="deletingOrder"
            @click="confirmDeleteOrder"
          >
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Component Details Dialog -->
    <ComponentDetailsDialog
      v-model="showCompDetailsDialog"
      :component="selectedCompForDetails"
      @updated="loadPurchasesReport"
      @deleted="loadPurchasesReport"
    />

    <!-- Cancel Order Dialog -->
    <CancelOrderDialog
      v-model="showCancelOrderDialog"
      :item="selectedOrderForCancel"
      @cancelled="onOrderCancelled"
      @notify="notify"
    />

    <!-- Notification Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import MediaImage from '../../components/MediaImage.vue';
import ComponentDetailsDialog from '../../components/ComponentDetailsDialog.vue';
import EditOrderDialog from '../../components/EditOrderDialog.vue';
import ConfirmDeliveryDialog from '../../components/ConfirmDeliveryDialog.vue';
import CancelOrderDialog from '../../components/CancelOrderDialog.vue';
import { formatCurrency } from '../../utils/formatters';

const { t } = useI18n();

const purchasesOrders = ref([]);
const purchasesStats = ref({});
const purchasesLoading = ref(false);
const purchasesSearch = ref('');
const purchasesStatus = ref('all');
const purchasesStartDate = ref('');
const purchasesEndDate = ref('');

const showEditOrderDialog = ref(false);
const selectedOrderForEdit = ref(null);

const showConfirmDeliveryDialog = ref(false);
const selectedOrderForDelivery = ref(null);

const showCancelOrderDialog = ref(false);
const selectedOrderForCancel = ref(null);

const showDeleteOrderDialog = ref(false);
const orderToDelete = ref(null);
const deductStockOnDelete = ref(true);
const deletingOrder = ref(false);

const showCompDetailsDialog = ref(false);
const selectedCompForDetails = ref(null);

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

let purchasesSearchTimer = null;
const debounceFetchPurchases = () => {
  clearTimeout(purchasesSearchTimer);
  purchasesSearchTimer = setTimeout(() => {
    loadPurchasesReport();
  }, 300);
};

const loadPurchasesReport = async () => {
  purchasesLoading.value = true;
  try {
    const params = {
      search: purchasesSearch.value,
      status: purchasesStatus.value,
      startDate: purchasesStartDate.value || undefined,
      endDate: purchasesEndDate.value || undefined,
      limit: 200,
      offset: 0
    };
    const res = await api.getPurchasesReport(params);
    purchasesOrders.value = res.orders || [];
    purchasesStats.value = res.stats || {};
  } catch (err) {
    console.error('Error loading purchases report:', err);
    notify(t('reports.loadError') + ': ' + err.message, 'error');
  } finally {
    purchasesLoading.value = false;
  }
};

const resetPurchasesFilters = () => {
  purchasesSearch.value = '';
  purchasesStatus.value = 'all';
  purchasesStartDate.value = '';
  purchasesEndDate.value = '';
  loadPurchasesReport();
};

const openEditOrderDialog = (order) => {
  selectedOrderForEdit.value = { ...order };
  showEditOrderDialog.value = true;
};

const onOrderSaved = () => {
  notify(t('reports.updateOrderSuccess'), 'success');
  loadPurchasesReport();
};

const openConfirmDeliveryForOrder = (order) => {
  selectedOrderForDelivery.value = {
    ...order,
    isComponentOrder: true
  };
  showConfirmDeliveryDialog.value = true;
};

const onDeliveryConfirmed = () => {
  loadPurchasesReport();
};

const openCancelOrderForOrder = (order) => {
  selectedOrderForCancel.value = {
    ...order,
    isComponentOrder: true
  };
  showCancelOrderDialog.value = true;
};

const onOrderCancelled = () => {
  loadPurchasesReport();
};

const openDeleteOrderDialog = (order) => {
  orderToDelete.value = order;
  deductStockOnDelete.value = order.status === 'delivered';
  showDeleteOrderDialog.value = true;
};

const confirmDeleteOrder = async () => {
  if (!orderToDelete.value?.id) return;
  deletingOrder.value = true;
  try {
    await api.deleteOrder(orderToDelete.value.id, { deductStock: deductStockOnDelete.value });
    notify(t('reports.deleteOrderSuccess'), 'success');
    showDeleteOrderDialog.value = false;
    orderToDelete.value = null;
    await loadPurchasesReport();
  } catch (err) {
    console.error('Error deleting order:', err);
    notify(t('reports.deleteOrderError') + ': ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    deletingOrder.value = false;
  }
};

const openComponentDetails = (item) => {
  selectedCompForDetails.value = {
    ID: item.componentId || item.id,
    component: item.component,
    marking: item.marking,
    category: item.category,
    package: item.package,
    datasheetURL: item.datasheetURL,
    photoURL: item.photoURL || item.componentPhotoURL,
    qty: item.stockQuantity ?? item.currentStock,
    shortDescription: item.shortDescription
  };
  showCompDetailsDialog.value = true;
};

const formatDate = (isoString) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const extractDomain = (url) => {
  if (!url) return '';
  try {
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const parsed = new URL(fullUrl);
    let host = parsed.hostname || '';
    if (host.startsWith('www.')) {
      host = host.substring(4);
    }
    return host || url;
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || url;
  }
};

onMounted(() => {
  loadPurchasesReport();
});
</script>

<style scoped>
.reports-table :deep(th) {
  background-color: #F8FAFC !important;
  font-size: 0.82rem;
  color: #475569;
}
.reports-table :deep(td) {
  padding-top: 10px;
  padding-bottom: 10px;
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
:deep(.v-field),
:deep(.v-field__outline),
:deep(.v-field__outline__notch),
:deep(.v-field-label--floating) {
  overflow: visible !important;
}
</style>
