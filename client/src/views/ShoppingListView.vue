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
        <div class="d-flex align-center flex-wrap gap-3" style="flex: 1 1 auto; min-width: 0;">
          <v-text-field
            v-model="searchQuery"
            :placeholder="t('shoppingList.searchPlaceholder')"
            prepend-inner-icon="mdi-magnify"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            rounded="lg"
            style="min-width: 240px; max-width: 440px; flex: 1 1 280px;"
          />

          <v-autocomplete
            v-model="selectedProject"
            :items="availableProjectsWithShoppingItems"
            item-title="projectName"
            item-value="id"
            :label="t('nav.projects')"
            :placeholder="t('common.all')"
            prepend-inner-icon="mdi-folder-outline"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            rounded="lg"
            style="min-width: 240px; max-width: 380px; flex: 1 1 260px;"
            @update:model-value="onProjectFilterChange"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props" :title="item.raw.projectName">
                <template #append>
                  <v-chip
                    size="x-small"
                    color="primary"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    {{ item.raw.shoppingItemCount }}
                  </v-chip>
                </template>
              </v-list-item>
            </template>
          </v-autocomplete>

          <!-- Status Filter Toggle (All, cart icon, delivery icon) -->
          <v-btn-toggle
            v-model="statusFilter"
            mandatory
            density="compact"
            color="primary"
            variant="outlined"
            rounded="lg"
            class="flex-shrink-0"
            style="height: 40px;"
          >
            <v-btn value="all" size="small" class="text-none px-3 font-weight-medium">
              {{ t('shoppingList.statusFilterAll') }}
            </v-btn>
            <v-btn value="to_buy" size="small" class="px-2" :title="t('shoppingList.statusToBuy')">
              <v-icon size="18">mdi-cart-outline</v-icon>
              <v-tooltip activator="parent" location="top">{{ t('shoppingList.statusToBuy') }}</v-tooltip>
            </v-btn>
            <v-btn value="pending" size="small" class="px-2" :title="t('shoppingList.totalAwaitingDelivery')">
              <v-icon size="18">mdi-truck-delivery-outline</v-icon>
              <v-tooltip activator="parent" location="top">{{ t('shoppingList.totalAwaitingDelivery') }}</v-tooltip>
            </v-btn>
          </v-btn-toggle>

          <!-- View BOM button when project is selected -->
          <v-btn
            v-if="selectedProject"
            color="primary"
            variant="tonal"
            class="font-weight-medium text-none flex-shrink-0"
            prepend-icon="mdi-format-list-bulleted-square"
            style="height: 40px;"
            @click="openSelectedProjectBom"
          >
            {{ t('projects.viewBom') }}
          </v-btn>
        </div>

        <div class="d-flex align-center gap-2 flex-shrink-0 ms-auto">
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

            <!-- Component -->
            <th
              class="text-left font-weight-bold cursor-pointer user-select-none hover-header"
              :title="getHeaderTitle('component', t('shoppingList.colComponent'))"
              @click="toggleSort('component')"
            >
              <div class="d-inline-flex align-center gap-1">
                <span :class="{ 'text-primary font-weight-black': sortBy === 'component' }">
                  {{ t('shoppingList.colComponent') }}
                </span>
                <v-icon
                  v-if="sortBy === 'component'"
                  size="16"
                  color="primary"
                >
                  {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
                <v-icon
                  v-else
                  size="14"
                  class="text-slate-300 sort-indicator"
                >
                  mdi-unfold-more-horizontal
                </v-icon>
              </div>
            </th>

            <!-- Category -->
            <th
              class="text-left font-weight-bold cursor-pointer user-select-none hover-header"
              :title="getHeaderTitle('category', t('common.category'))"
              @click="toggleSort('category')"
            >
              <div class="d-inline-flex align-center gap-1">
                <span :class="{ 'text-primary font-weight-black': sortBy === 'category' }">
                  {{ t('common.category') }}
                </span>
                <v-icon
                  v-if="sortBy === 'category'"
                  size="16"
                  color="primary"
                >
                  {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
                <v-icon
                  v-else
                  size="14"
                  class="text-slate-300 sort-indicator"
                >
                  mdi-unfold-more-horizontal
                </v-icon>
              </div>
            </th>

            <!-- Package -->
            <th
              class="text-left font-weight-bold cursor-pointer user-select-none hover-header"
              style="width: 140px; min-width: 140px;"
              :title="getHeaderTitle('package', t('common.package'))"
              @click="toggleSort('package')"
            >
              <div class="d-inline-flex align-center gap-1">
                <span :class="{ 'text-primary font-weight-black': sortBy === 'package' }">
                  {{ t('common.package') }}
                </span>
                <v-icon
                  v-if="sortBy === 'package'"
                  size="16"
                  color="primary"
                >
                  {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
                <v-icon
                  v-else
                  size="14"
                  class="text-slate-300 sort-indicator"
                >
                  mdi-unfold-more-horizontal
                </v-icon>
              </div>
            </th>

            <!-- In Stock -->
            <th
              class="text-center font-weight-bold cursor-pointer user-select-none hover-header"
              :title="getHeaderTitle('stockQuantity', t('shoppingList.colCurrentStock'))"
              @click="toggleSort('stockQuantity')"
            >
              <div class="d-inline-flex align-center justify-center gap-1">
                <span :class="{ 'text-primary font-weight-black': sortBy === 'stockQuantity' }">
                  {{ t('shoppingList.colCurrentStock') }}
                </span>
                <v-icon
                  v-if="sortBy === 'stockQuantity'"
                  size="16"
                  color="primary"
                >
                  {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
                <v-icon
                  v-else
                  size="14"
                  class="text-slate-300 sort-indicator"
                >
                  mdi-unfold-more-horizontal
                </v-icon>
              </div>
            </th>

            <!-- Needed -->
            <th
              class="text-center font-weight-bold cursor-pointer user-select-none hover-header"
              style="width: 140px;"
              :title="getHeaderTitle('qty', t('shoppingList.colNeeded'))"
              @click="toggleSort('qty')"
            >
              <div class="d-inline-flex align-center justify-center gap-1">
                <span :class="{ 'text-primary font-weight-black': sortBy === 'qty' }">
                  {{ t('shoppingList.colNeeded') }}
                </span>
                <v-icon
                  v-if="sortBy === 'qty'"
                  size="16"
                  color="primary"
                >
                  {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
                <v-icon
                  v-else
                  size="14"
                  class="text-slate-300 sort-indicator"
                >
                  mdi-unfold-more-horizontal
                </v-icon>
              </div>
            </th>

            <!-- Unit Price -->
            <th
              class="text-right font-weight-bold cursor-pointer user-select-none hover-header"
              :title="getHeaderTitle('latestPrice', t('dialogs.unitPrice'))"
              @click="toggleSort('latestPrice')"
            >
              <div class="d-inline-flex align-center justify-end gap-1">
                <span :class="{ 'text-primary font-weight-black': sortBy === 'latestPrice' }">
                  {{ t('dialogs.unitPrice') }}
                </span>
                <v-icon
                  v-if="sortBy === 'latestPrice'"
                  size="16"
                  color="primary"
                >
                  {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
                <v-icon
                  v-else
                  size="14"
                  class="text-slate-300 sort-indicator"
                >
                  mdi-unfold-more-horizontal
                </v-icon>
              </div>
            </th>

            <!-- Total -->
            <th
              class="text-right font-weight-bold cursor-pointer user-select-none hover-header"
              :title="getHeaderTitle('total', t('common.total'))"
              @click="toggleSort('total')"
            >
              <div class="d-inline-flex align-center justify-end gap-1">
                <span :class="{ 'text-primary font-weight-black': sortBy === 'total' }">
                  {{ t('common.total') }}
                </span>
                <v-icon
                  v-if="sortBy === 'total'"
                  size="16"
                  color="primary"
                >
                  {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
                <v-icon
                  v-else
                  size="14"
                  class="text-slate-300 sort-indicator"
                >
                  mdi-unfold-more-horizontal
                </v-icon>
              </div>
            </th>

            <!-- Date Added -->
            <th
              class="text-center font-weight-bold cursor-pointer user-select-none hover-header"
              :title="getHeaderTitle('date', t('shoppingList.colDateAdded'))"
              @click="toggleSort('date')"
            >
              <div class="d-inline-flex align-center justify-center gap-1">
                <span :class="{ 'text-primary font-weight-black': sortBy === 'date' }">
                  {{ t('shoppingList.colDateAdded') }}
                </span>
                <v-icon
                  v-if="sortBy === 'date'"
                  size="16"
                  color="primary"
                >
                  {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
                <v-icon
                  v-else
                  size="14"
                  class="text-slate-300 sort-indicator"
                >
                  mdi-unfold-more-horizontal
                </v-icon>
              </div>
            </th>

            <!-- Actions -->
            <th
              class="text-left font-weight-bold"
              :style="{
                width: hasAnyPendingOrders ? '120px' : '80px',
                minWidth: hasAnyPendingOrders ? '120px' : '80px'
              }"
            >
              {{ t('shoppingList.colActions') }}
            </th>
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
              <div class="d-flex align-center gap-1 flex-wrap">
                <div
                  class="font-mono font-weight-bold text-body-2 text-primary comp-name-link d-inline-flex align-center gap-1 cursor-pointer"
                  @click="openComponentDetails(item)"
                  :title="t('shoppingList.viewDetailsAndHistory')"
                >
                  <span class="hover-underline">{{ item.component }}</span>
                  <v-icon size="13" class="opacity-60 info-icon">mdi-information-outline</v-icon>
                </div>
              </div>
              <div class="text-caption text-disabled" v-if="item.marking || item.shortDescription || ((item.activeOrderStatus === 'pending' || item.orderId) && item.activeOrderDate)">
                <span v-if="item.marking" class="font-mono me-2">Mark: {{ item.marking }}</span>
                <span v-if="item.shortDescription" class="me-2">{{ item.shortDescription }}</span>
                <span v-if="(item.activeOrderStatus === 'pending' || item.orderId) && item.activeOrderDate" class="text-amber-800 font-mono">
                  • {{ t('shoppingList.orderedOn', { date: formatDate(item.activeOrderDate) }) }}
                </span>
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
              <!-- When awaiting delivery: show ordered qty with truck badge -->
              <div
                v-if="item.activeOrderStatus === 'pending' || item.orderId"
                class="d-inline-flex align-center justify-center border bg-amber-50 rounded-lg px-2"
                style="height: 32px; min-width: 90px;"
                :title="t('shoppingList.orderedQty', { qty: item.qty })"
              >
                <v-icon size="14" color="amber-darken-3" class="me-1">mdi-truck-outline</v-icon>
                <span class="font-mono font-weight-bold text-amber-900" style="font-size: 0.9rem;">
                  {{ item.qty }}
                </span>
              </div>

              <!-- Standard Quantity Stepper when not yet ordered -->
              <div
                v-else
                class="d-inline-flex align-center border bg-white rounded-lg px-1 justify-space-between quantity-stepper"
                style="height: 32px; width: 116px;"
              >
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
            <td
              class="text-left text-no-wrap"
              :style="{
                width: hasAnyPendingOrders ? '120px' : '80px',
                minWidth: hasAnyPendingOrders ? '120px' : '80px'
              }"
            >
              <div class="d-inline-flex align-center" style="gap: 2px;">
                <!-- Slot 1: Primary Action (Confirm Delivery when awaiting, Buy Component when to buy) -->
                <v-btn
                  v-if="item.activeOrderStatus === 'pending' || item.orderId"
                  icon="mdi-package-variant-closed-check"
                  size="small"
                  color="success"
                  variant="text"
                  :title="t('shoppingList.confirmDelivery')"
                  @click="openConfirmDeliveryDialog(item)"
                />
                <v-btn
                  v-else
                  icon="mdi-cash-check"
                  size="small"
                  color="primary"
                  variant="text"
                  :title="t('shoppingList.buyComponent')"
                  @click="openPurchaseDialog(item)"
                />

                <!-- Slot 2: Cancel Order (rendered ONLY when at least one item has an awaiting order) -->
                <template v-if="hasAnyPendingOrders">
                  <!-- Active Cancel button if this row is awaiting delivery -->
                  <v-btn
                    v-if="item.activeOrderStatus === 'pending' || item.orderId"
                    icon="mdi-cancel"
                    size="small"
                    color="warning"
                    variant="text"
                    :title="t('shoppingList.cancelOrder')"
                    @click="openCancelOrderDialog(item)"
                  />
                  <!-- Inactive (light grey) button to preserve slot alignment without an awkward empty gap -->
                  <v-btn
                    v-else
                    icon="mdi-cancel"
                    size="small"
                    variant="text"
                    disabled
                    color="slate-300"
                    class="opacity-25"
                    tabindex="-1"
                    aria-hidden="true"
                    style="pointer-events: none;"
                  />
                </template>

                <!-- Slot 3: Remove from list (always aligned in 3rd slot) -->
                <v-btn
                  icon="mdi-delete-outline"
                  size="small"
                  color="error"
                  variant="text"
                  :title="t('shoppingList.removeFromList')"
                  @click="removeItem(item)"
                />
              </div>
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

    <!-- Modal: Confirm Delivery -->
    <ConfirmDeliveryDialog
      v-model="showConfirmDeliveryDialog"
      :item="selectedItemForDelivery"
      @delivered="onItemDelivered"
      @notify="notify"
    />

    <!-- Modal: Cancel Order -->
    <CancelOrderDialog
      v-model="showCancelOrderDialog"
      :item="selectedItemForCancel"
      @cancelled="onOrderCancelled"
      @notify="notify"
    />

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
      :type="lightbox.type || 'component'"
      :src="lightbox.src"
      :title="lightbox.title"
    />

    <!-- Reusable Project BOM Preview Modal -->
    <ProjectBomDialog
      v-model="showBomDialog"
      :project="activeProject"
      @updated="onBomUpdated"
      @notify="notify"
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
import ConfirmDeliveryDialog from '../components/ConfirmDeliveryDialog.vue';
import CancelOrderDialog from '../components/CancelOrderDialog.vue';
import ComponentDetailsDialog from '../components/ComponentDetailsDialog.vue';
import ProjectBomDialog from '../components/ProjectBomDialog.vue';
import { useShoppingListStore } from '../stores/shoppingList';
import { formatCurrency, formatDate } from '../utils/formatters';

const shoppingListStore = useShoppingListStore();

const items = ref([]);
const projects = ref([]);
const selectedProject = ref(null);
const loading = ref(false);
const searchQuery = ref('');
const statusFilter = ref('all');

// Project BOM Modal State
const activeProject = ref(null);
const showBomDialog = ref(false);

const showPurchaseDialog = ref(false);
const selectedItemForPurchase = ref(null);

const showConfirmDeliveryDialog = ref(false);
const selectedItemForDelivery = ref(null);

const showCancelOrderDialog = ref(false);
const selectedItemForCancel = ref(null);

const showDetailsDialog = ref(false);
const selectedItemForDetails = ref(null);

const lightbox = ref({
  show: false,
  type: 'component',
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

const toBuyCount = computed(() => {
  return items.value.filter(i => !i.orderId && i.activeOrderStatus !== 'pending').length;
});

const awaitingDeliveryCount = computed(() => {
  return items.value.filter(i => !!i.orderId || i.activeOrderStatus === 'pending').length;
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

// Sorting state
const sortBy = ref('date');
const sortOrder = ref('desc');

const getHeaderTitle = (key, label) => {
  if (sortBy.value === key) {
    return `${label}: ${sortOrder.value === 'asc' ? t('shoppingList.sortedAsc') : t('shoppingList.sortedDesc')}`;
  }
  return `${label} (${t('shoppingList.clickToSort')})`;
};

const toggleSort = (key) => {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    if (['stockQuantity', 'qty', 'latestPrice', 'total', 'date'].includes(key)) {
      sortOrder.value = 'desc';
    } else {
      sortOrder.value = 'asc';
    }
  }
};

const filteredItems = computed(() => {
  let list = items.value;

  if (statusFilter.value === 'to_buy') {
    list = list.filter(item => !item.orderId && item.activeOrderStatus !== 'pending');
  } else if (statusFilter.value === 'pending') {
    list = list.filter(item => !!item.orderId || item.activeOrderStatus === 'pending');
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(item =>
      (item.component && item.component.toLowerCase().includes(q)) ||
      (item.marking && item.marking.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.shortDescription && item.shortDescription.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.package && item.package.toLowerCase().includes(q)) ||
      (item.latestOrderDetails && item.latestOrderDetails.toLowerCase().includes(q))
    );
  }

  if (!sortBy.value) return list;

  const key = sortBy.value;
  const orderMultiplier = sortOrder.value === 'desc' ? -1 : 1;

  return [...list].sort((a, b) => {
    let valA, valB;

    switch (key) {
      case 'component':
        valA = (a.component || '').toLowerCase();
        valB = (b.component || '').toLowerCase();
        return valA.localeCompare(valB) * orderMultiplier;

      case 'category':
        valA = (a.category || '').toLowerCase();
        valB = (b.category || '').toLowerCase();
        if (!valA && valB) return 1;
        if (valA && !valB) return -1;
        return valA.localeCompare(valB) * orderMultiplier;

      case 'package':
        valA = (a.package || '').toLowerCase();
        valB = (b.package || '').toLowerCase();
        if (!valA && valB) return 1;
        if (valA && !valB) return -1;
        return valA.localeCompare(valB) * orderMultiplier;

      case 'stockQuantity':
        valA = a.stockQuantity == null ? -999999999 : Number(a.stockQuantity);
        valB = b.stockQuantity == null ? -999999999 : Number(b.stockQuantity);
        return (valA - valB) * orderMultiplier;

      case 'qty':
        valA = Number(a.qty) || 0;
        valB = Number(b.qty) || 0;
        return (valA - valB) * orderMultiplier;

      case 'latestPrice':
        valA = a.latestPrice != null ? Number(a.latestPrice) : -1;
        valB = b.latestPrice != null ? Number(b.latestPrice) : -1;
        return (valA - valB) * orderMultiplier;

      case 'total':
        valA = a.latestPrice != null ? (Number(a.qty) || 0) * Number(a.latestPrice) : -1;
        valB = b.latestPrice != null ? (Number(b.qty) || 0) * Number(b.latestPrice) : -1;
        return (valA - valB) * orderMultiplier;

      case 'date':
        valA = a.date ? new Date(a.date).getTime() : 0;
        valB = b.date ? new Date(b.date).getTime() : 0;
        if (valA === valB) {
          return ((Number(a.id) || 0) - (Number(b.id) || 0)) * orderMultiplier;
        }
        return (valA - valB) * orderMultiplier;

      default:
        return 0;
    }
  });
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

const hasAnyPendingOrders = computed(() => {
  return filteredItems.value.some(item => !!item.orderId || item.activeOrderStatus === 'pending');
});

// Load shopping list from API
const loadShoppingList = async () => {
  loading.value = true;
  try {
    const params = {};
    if (selectedProject.value) {
      params.projectId = selectedProject.value;
    }
    items.value = await api.getShoppingList(params);
    // Only update the global navbar badge store when fetching full unfiltered list
    if (!selectedProject.value) {
      shoppingListStore.setItems(items.value);
    }
  } catch (err) {
    notify('Failed to load shopping list: ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

const onProjectFilterChange = () => {
  loadShoppingList();
};

const loadProjects = async () => {
  try {
    const projs = await api.getProjects();
    // Only include projects that have components currently in the shopping list
    projects.value = (projs || []).filter(p => Number(p.shoppingItemCount) > 0);
  } catch (err) {
    console.error('Failed to load projects for filter:', err);
  }
};

const availableProjectsWithShoppingItems = computed(() => {
  return projects.value.filter(p => Number(p.shoppingItemCount) > 0);
});

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

const openConfirmDeliveryDialog = (item) => {
  selectedItemForDelivery.value = { ...item };
  showConfirmDeliveryDialog.value = true;
};

const onItemDelivered = async () => {
  await Promise.all([loadShoppingList(), loadProjects()]);
};

const openCancelOrderDialog = (item) => {
  selectedItemForCancel.value = { ...item };
  showCancelOrderDialog.value = true;
};

const onOrderCancelled = async () => {
  await Promise.all([loadShoppingList(), loadProjects()]);
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
  if (!item?.photoURL) return;
  lightbox.value = {
    show: true,
    type: 'component',
    src: item.photoURL,
    title: item.component
  };
};

const openSelectedProjectBom = async () => {
  if (!selectedProject.value) return;
  let proj = projects.value.find(p => p.id === selectedProject.value);
  if (!proj) {
    try {
      proj = await api.getProject(selectedProject.value);
    } catch (err) {
      notify('Failed to load project details: ' + err.message, 'error');
      return;
    }
  }
  activeProject.value = proj;
  showBomDialog.value = true;
};

const onBomUpdated = async () => {
  await Promise.all([loadShoppingList(), loadProjects()]);
};

// Purchase completion callback
const onItemPurchased = async () => {
  // Refresh shopping list to ensure pending/delivered order statuses, quantities, and stock levels are synchronized
  await Promise.all([loadShoppingList(), loadProjects()]);
};

const removeItem = async (item) => {
  try {
    await api.deleteShoppingListItem(item.id);
    items.value = items.value.filter(i => i.id !== item.id);
    notify(`Removed ${item.component} from shopping list`);
    loadProjects();
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
  loadProjects();
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
.hover-header {
  transition: background-color 0.15s ease-in-out, color 0.15s ease-in-out;
}
.hover-header:hover {
  background-color: #f1f5f9 !important;
}
.hover-header:hover .sort-indicator {
  color: #64748b !important;
  opacity: 1 !important;
}
.sort-indicator {
  opacity: 0.35;
  transition: opacity 0.15s, color 0.15s;
}
.user-select-none {
  user-select: none;
}
</style>
