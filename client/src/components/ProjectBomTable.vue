<template>
  <div class="project-bom-table-container">
    <!-- Filter Toolbar -->
    <div class="px-5 py-3 border-b bg-white d-flex flex-wrap align-center justify-space-between gap-3">
      <v-text-field
        v-model="bomSearch"
        :placeholder="t('projectDetail.searchBom')"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        rounded="lg"
        style="width: 340px; max-width: 400px;"
      />

      <div class="d-flex align-center gap-2">
        <span class="text-caption text-disabled me-2">
          {{ filteredBomItems.length }} {{ t('common.items') }}
        </span>

        <!-- Slot for parent actions (e.g. Add Component, Import iBOM) -->
        <slot name="toolbar-actions" />
      </div>
    </div>

    <!-- Table Body -->
    <div :style="maxHeight ? { maxHeight: maxHeight, overflowY: 'auto' } : {}">
      <v-table density="comfortable" hover class="bom-table">
        <thead>
          <tr class="bg-slate-50">
            <th class="text-left font-weight-bold" style="width: 50px;">{{ t('projectDetail.colPhoto') }}</th>
            <th class="text-left font-weight-bold">{{ t('projectDetail.colComponent') }}</th>
            <th class="text-left font-weight-bold">{{ t('projectDetail.colCategory') }}</th>
            <th class="text-left font-weight-bold">{{ t('projectDetail.colPackage') }}</th>
            <th class="text-center font-weight-bold">{{ t('projectDetail.colRequired') }}</th>
            <th class="text-center font-weight-bold">{{ t('projectDetail.colStock') }}</th>
            <th class="text-right font-weight-bold">{{ t('dialogs.unitPrice') }}</th>
            <th class="text-right font-weight-bold">{{ t('common.total') }}</th>
            <th class="text-left font-weight-bold">{{ t('projectDetail.colDesignators') }}</th>
            <th class="text-left font-weight-bold" style="width: 130px;">{{ t('projectDetail.colActions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="item in filteredBomItems"
            :key="item.bomId"
            :class="{ 'row-shortage': isShortage(item) }"
          >
            <!-- Photo -->
            <td>
              <v-avatar
                rounded="lg"
                size="36"
                class="border bg-slate-50"
                :class="{ 'cursor-pointer hover-zoom': !!item.componentPhotoURL }"
                :title="item.componentPhotoURL ? t('dialogs.viewFullSize') : ''"
                @click="item.componentPhotoURL && $emit('open-photo', { type: 'component', src: item.componentPhotoURL, title: item.component })"
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
                class="font-mono font-weight-bold text-body-2 text-primary comp-name-link d-inline-flex align-center gap-1 cursor-pointer"
                @click="$emit('open-component-details', item)"
                :title="t('dialogs.clickDetails')"
              >
                <span class="hover-underline">{{ item.component }}</span>
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

            <!-- Required Quantity -->
            <td class="text-center font-mono font-weight-bold text-body-2">
              {{ item.requiredQuantity }}
            </td>

            <!-- In Stock -->
            <td class="text-center font-mono font-weight-bold text-body-2">
              <span :class="!isShortage(item) ? 'text-slate-800' : 'text-error font-weight-bold'">
                {{ getDisplayStock(item) }}
              </span>
            </td>

            <!-- Unit Price -->
            <td class="text-right font-mono text-body-2">
              <span
                v-if="item.unitPrice != null"
                class="text-slate-800"
                :title="item.latestOrderDate ? t('projectDetail.purchasedDate', { date: formatDate(item.latestOrderDate) }) : ''"
              >
                {{ formatCurrency(item.unitPrice) }}
              </span>
              <span v-else class="text-disabled text-caption italic">—</span>
            </td>

            <!-- Total Item Cost -->
            <td class="text-right font-mono text-body-2 font-weight-bold">
              <span v-if="item.totalItemCost != null" class="text-primary">
                {{ formatCurrency(item.totalItemCost) }}
              </span>
              <span v-else class="text-disabled text-caption italic">—</span>
            </td>

            <!-- Circuit Comment / Designators -->
            <td>
              <span v-if="item.comment" class="text-body-2 font-mono text-slate-700">
                {{ item.comment }}
              </span>
              <span v-else class="text-disabled text-caption italic">{{ t('projectDetail.noNotes') }}</span>
            </td>

            <!-- Actions -->
            <td class="text-left">
              <div class="d-inline-flex align-center" style="gap: 2px;">
                <!-- Add Shortage to Basket -->
                <v-btn
                  icon="mdi-cart-plus"
                  size="x-small"
                  color="amber-darken-3"
                  variant="text"
                  :title="t('projectDetail.addToBasket')"
                  :style="{
                    visibility: isShortage(item) ? 'visible' : 'hidden',
                    pointerEvents: isShortage(item) ? 'auto' : 'none'
                  }"
                  :tabindex="isShortage(item) ? 0 : -1"
                  :aria-hidden="!isShortage(item)"
                  @click="isShortage(item) && $emit('add-to-cart', item)"
                />

                <!-- Manage Analogs / Substitutes -->
                <v-btn
                  icon="mdi-swap-horizontal"
                  size="x-small"
                  :color="item.substitutes && item.substitutes.length > 0 ? 'success' : 'slate-500'"
                  :variant="item.substitutes && item.substitutes.length > 0 ? 'flat' : 'text'"
                  :title="item.substitutes && item.substitutes.length > 0 ? t('bomAnalogs.configuredAnalogs', { count: item.substitutes.length }) : t('bomAnalogs.manageAnalogs')"
                  @click="$emit('manage-analogs', item)"
                />

                <!-- Edit Quantity -->
                <v-btn
                  icon="mdi-pencil-outline"
                  size="x-small"
                  variant="text"
                  :title="t('projectDetail.editQuantity')"
                  @click="$emit('edit-item', item)"
                />

                <!-- Remove Component -->
                <v-btn
                  icon="mdi-delete-outline"
                  size="x-small"
                  color="error"
                  variant="text"
                  :title="t('projectDetail.removeComponent')"
                  @click="$emit('delete-item', item)"
                />
              </div>
            </td>
          </tr>

          <!-- Empty State: No components in project at all -->
          <tr v-if="items.length === 0 && !loading">
            <td colspan="10" class="text-center py-10">
              <v-icon size="48" color="primary" class="mb-3 opacity-60">mdi-package-variant-closed-plus</v-icon>
              <div class="text-subtitle-1 font-weight-bold text-slate-800 mb-1">
                {{ t('projectDetail.emptyBomMessage') }}
              </div>
              <div class="d-flex align-center justify-center mt-3" style="gap: 12px;" v-if="showEmptyActions">
                <v-btn
                  color="primary"
                  variant="flat"
                  size="small"
                  class="font-weight-bold"
                  prepend-icon="mdi-plus"
                  @click="$emit('add-component')"
                >
                  {{ t('projectDetail.addComponent') }}
                </v-btn>
                <v-btn
                  color="primary"
                  variant="tonal"
                  size="small"
                  class="font-weight-bold"
                  prepend-icon="mdi-database-import-outline"
                  @click="$emit('import-ibom')"
                >
                  {{ t('projectDetail.importIbom') }}
                </v-btn>
              </div>
            </td>
          </tr>

          <!-- Empty State: Filter yielded no matches -->
          <tr v-else-if="filteredBomItems.length === 0 && !loading">
            <td colspan="10" class="text-center py-8 text-disabled">
              <v-icon size="40" class="mb-2">mdi-cube-off-outline</v-icon>
              <div class="text-subtitle-2 text-slate-700 mb-2">{{ t('projectDetail.noComponentsMatchFilter') }}</div>
              <v-btn
                variant="outlined"
                color="primary"
                size="small"
                @click="bomSearch = ''"
              >
                {{ t('common.clear') }}
              </v-btn>
            </td>
          </tr>

          <!-- Loading State -->
          <tr v-if="loading">
            <td colspan="10" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
            </td>
          </tr>
        </tbody>

        <!-- Table Footer with Totals -->
        <tfoot v-if="filteredBomItems.length > 0">
          <tr class="bg-slate-50 font-weight-bold border-t">
            <td colspan="4" class="py-3 px-4 text-subtitle-2 font-weight-bold text-slate-800">
              {{ t('projectDetail.totalEstimatedBomCost') }}
              <span class="text-caption text-disabled ms-2 font-normal">
                {{ t('projectDetail.partsPricedCount', { priced: bomCost.pricedCount, total: items.length }) }}
              </span>
            </td>
            <td class="text-center font-mono font-weight-bold py-3 text-body-2">
              {{ totalRequiredQty }}
            </td>
            <td colspan="2"></td>
            <td class="text-right font-mono font-weight-bold text-subtitle-2 text-primary py-3">
              {{ formatCurrency(bomCost.totalCost) }}
            </td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </v-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import MediaImage from './MediaImage.vue';
import PackageLink from './PackageLink.vue';
import { formatCurrency, formatDate } from '../utils/formatters';

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  maxHeight: {
    type: String,
    default: null
  },
  showEmptyActions: {
    type: Boolean,
    default: false
  }
});

defineEmits([
  'add-to-cart',
  'edit-item',
  'delete-item',
  'open-component-details',
  'open-photo',
  'add-component',
  'import-ibom',
  'manage-analogs',
  'find-analog'
]);

const { t } = useI18n();
const bomSearch = ref('');

const filteredBomItems = computed(() => {
  if (!bomSearch.value.trim()) return props.items;
  const q = bomSearch.value.toLowerCase();
  return props.items.filter(item =>
    item.component.toLowerCase().includes(q) ||
    (item.comment && item.comment.toLowerCase().includes(q)) ||
    (item.category && item.category.toLowerCase().includes(q)) ||
    (item.marking && item.marking.toLowerCase().includes(q))
  );
});

const totalRequiredQty = computed(() => {
  return props.items.reduce((acc, i) => acc + (Number(i.requiredQuantity) || 0), 0);
});

const bomCost = computed(() => {
  let totalCost = 0;
  let pricedCount = 0;
  for (const item of props.items) {
    if (item.totalItemCost != null) {
      totalCost += Number(item.totalItemCost);
      pricedCount++;
    }
  }
  return {
    totalCost: Math.round(totalCost * 100) / 100,
    pricedCount,
    unpricedCount: props.items.length - pricedCount
  };
});

const getDisplayStock = (item) => Math.max(0, item.stockQuantity ?? 0);

const getShortage = (item) => Math.max(0, item.requiredQuantity - getDisplayStock(item));

const isShortage = (item) => getDisplayStock(item) < item.requiredQuantity;

const hasInStockAnalog = (item) => {
  if (!item.substitutes || item.substitutes.length === 0) return false;
  return item.substitutes.some(s => Math.max(0, s.stockQuantity ?? 0) >= item.requiredQuantity);
};

const getBestInStockAnalog = (item) => {
  if (!item.substitutes || item.substitutes.length === 0) return null;
  return item.substitutes.find(s => Math.max(0, s.stockQuantity ?? 0) >= item.requiredQuantity) || item.substitutes[0];
};
</script>

<style scoped>
.bom-table :deep(th) {
  background-color: #F8FAFC !important;
  font-size: 0.82rem;
  letter-spacing: 0.02em;
}

/* Light Red shortage row highlighting */
.bom-table :deep(tr.row-shortage td),
.bom-table tr.row-shortage td,
.bom-table :deep(tr.row-shortage),
.bom-table tr.row-shortage {
  background-color: #FEF2F2 !important; /* Soft rose / light red */
}

.bom-table :deep(tr.row-shortage:hover td),
.bom-table tr.row-shortage:hover td,
.bom-table :deep(tr.row-shortage:hover),
.bom-table tr.row-shortage:hover {
  background-color: #FEE2E2 !important; /* Slightly deeper rose-100 on hover */
}

.comp-name-link {
  cursor: pointer;
}

.comp-name-link:hover .hover-underline {
  text-decoration: underline;
}

.hover-zoom {
  transition: transform 0.15s ease-in-out;
}

.hover-zoom:hover {
  transform: scale(1.08);
}
</style>
