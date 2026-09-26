<template>
  <v-dialog
    :model-value="modelValue"
    max-width="620"
    scrollable
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-0 border bg-white d-flex flex-column" v-if="order">
      <!-- Header -->
      <v-card-title class="bg-slate-50 py-3 px-5 d-flex align-center justify-space-between border-b flex-shrink-0">
        <div class="d-flex align-center gap-2">
          <v-icon color="primary" size="22">mdi-pencil-box-outline</v-icon>
          <span class="text-h6 font-weight-bold text-slate-900">
            {{ t('editOrderModal.title', { id: order.id }) }}
          </span>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>

      <!-- Content -->
      <v-card-text class="pa-5 overflow-y-auto">
        <!-- Component Header Card -->
        <div class="d-flex align-center gap-3 p-3 bg-slate-50 border rounded-lg mb-4">
          <v-avatar rounded="lg" size="48" class="border bg-white flex-shrink-0">
            <MediaImage
              type="component"
              :src="order.photoURL"
              height="48px"
              width="48px"
            />
          </v-avatar>

          <div class="flex-grow-1 min-w-0">
            <div class="d-flex align-center gap-2 flex-wrap">
              <span class="font-mono font-weight-bold text-subtitle-1 text-primary text-truncate">
                {{ order.component }}
              </span>
              <v-chip
                v-if="order.marking"
                size="x-small"
                variant="tonal"
                color="slate-700"
                class="font-mono font-weight-bold"
              >
                Mark: {{ order.marking }}
              </v-chip>
            </div>
            <div class="d-flex align-center gap-2 text-caption text-slate-600 mt-1 flex-wrap">
              <span v-if="order.category">{{ order.category }}</span>
              <span v-if="order.package">• {{ order.package }}</span>
              <span>• {{ t('shoppingList.colCurrentStock') }}: <strong class="font-mono">{{ order.stockQuantity ?? 0 }} {{ t('shoppingList.pcs') }}</strong></span>
            </div>
          </div>
        </div>

        <!-- Form fields -->
        <v-form ref="formRef" v-model="formValid" @submit.prevent="save">
          <v-row dense>
            <!-- Currency -->
            <v-col cols="12" sm="3">
              <v-select
                v-model="form.currency"
                :items="currencyStore.currencyOptions"
                item-title="label"
                item-value="code"
                :label="t('purchaseModal.currency')"
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-cash"
              />
            </v-col>

            <!-- Quantity -->
            <v-col cols="12" sm="3">
              <v-text-field
                v-model.number="form.qty"
                type="number"
                min="1"
                step="1"
                :label="t('editOrderModal.quantity')"
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-counter"
                :rules="[v => !!v && v > 0 || t('purchaseModal.validationQty')]"
                required
              />
            </v-col>

            <!-- Unit Price -->
            <v-col cols="12" sm="3">
              <v-text-field
                v-model.number="form.price"
                type="number"
                min="0"
                step="0.0001"
                :label="t('editOrderModal.unitPrice')"
                :prefix="currencyStore.getSymbol(form.currency)"
                density="compact"
                variant="outlined"
                rounded="lg"
                :rules="[v => v !== null && v !== undefined && v >= 0 || t('purchaseModal.validationPrice')]"
                required
              />
            </v-col>

            <!-- Total Cost (Calculated preview) -->
            <v-col cols="12" sm="3">
              <v-text-field
                :model-value="formatCurrency(computedTotalCost, form.currency)"
                :label="t('editOrderModal.totalCost')"
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-calculator"
                readonly
                disabled
              />
            </v-col>

            <!-- Order Date -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.date"
                type="date"
                :label="t('editOrderModal.orderDate')"
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-calendar"
                required
              />
            </v-col>

            <!-- Delivery Status Selector -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.status"
                :items="statusOptions"
                item-title="title"
                item-value="value"
                :label="t('editOrderModal.deliveryStatus')"
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-truck-outline"
                required
              >
                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template #prepend>
                      <v-icon :color="item.raw.color" size="18">{{ item.raw.icon }}</v-icon>
                    </template>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>

            <!-- Delivery Date (Visible if delivered) -->
            <v-col cols="12" v-if="form.status === 'delivered'">
              <v-text-field
                v-model="form.deliveredDate"
                type="date"
                :label="t('editOrderModal.deliveredDate')"
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-calendar-check"
                required
              />
            </v-col>

            <!-- Supplier / Order URL -->
            <v-col cols="12">
              <v-text-field
                v-model="form.url"
                :label="t('editOrderModal.supplierUrl')"
                placeholder="https://..."
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-link-variant"
                clearable
              >
                <template #append-inner v-if="form.url">
                  <v-btn
                    icon="mdi-open-in-new"
                    size="x-small"
                    variant="text"
                    color="primary"
                    :href="form.url"
                    target="_blank"
                    :title="t('dialogs.openSupplierLink')"
                  />
                </template>
              </v-text-field>
            </v-col>

            <!-- Notes / Order Details -->
            <v-col cols="12">
              <v-textarea
                v-model="form.details"
                :label="t('editOrderModal.notes')"
                rows="2"
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-text"
                auto-grow
              />
            </v-col>

            <!-- Adjust Stock Checkbox -->
            <v-col cols="12">
              <v-card variant="outlined" class="pa-3 rounded-lg bg-slate-50 border">
                <v-checkbox
                  v-model="form.adjustStock"
                  color="primary"
                  hide-details
                  density="compact"
                >
                  <template #label>
                    <div>
                      <div class="text-body-2 font-weight-medium text-slate-800">
                        {{ t('editOrderModal.adjustStock') }}
                      </div>
                      <div class="text-caption text-slate-500">
                        {{ t('editOrderModal.adjustStockHint') }}
                      </div>
                    </div>
                  </template>
                </v-checkbox>
              </v-card>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <!-- Footer Actions -->
      <v-card-actions class="bg-slate-50 py-3 px-5 border-t d-flex justify-end gap-2 flex-shrink-0">
        <v-btn
          variant="outlined"
          color="slate-700"
          class="text-none font-weight-medium"
          :disabled="saving"
          @click="close"
        >
          {{ t('common.cancel') }}
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          class="text-none font-weight-bold"
          prepend-icon="mdi-content-save"
          :loading="saving"
          @click="save"
        >
          {{ t('editOrderModal.saveChanges') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import MediaImage from './MediaImage.vue';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useCurrencyStore } from '../stores/currency';

const { t } = useI18n();
const currencyStore = useCurrencyStore();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  order: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'saved']);

const formRef = ref(null);
const formValid = ref(true);
const saving = ref(false);
const loadingBoxes = ref(false);
const storageBoxes = ref([]);

const form = ref({
  currency: currencyStore.defaultCurrency,
  qty: 1,
  price: 0,
  date: '',
  status: 'delivered',
  deliveredDate: '',
  storageId: null,
  url: '',
  details: '',
  adjustStock: true
});

const statusOptions = computed(() => [
  {
    value: 'delivered',
    title: t('editOrderModal.statusDelivered'),
    icon: 'mdi-check-circle-outline',
    color: 'success'
  },
  {
    value: 'pending',
    title: t('editOrderModal.statusPending'),
    icon: 'mdi-clock-outline',
    color: 'amber-darken-3'
  },
  {
    value: 'cancelled',
    title: t('editOrderModal.statusCancelled'),
    icon: 'mdi-close-circle-outline',
    color: 'error'
  }
]);

const computedTotalCost = computed(() => {
  const q = Number(form.value.qty) || 0;
  const p = Number(form.value.price) || 0;
  return Math.round(q * p * 100) / 100;
});

// Format date to YYYY-MM-DD
const formatDateForInput = (d) => {
  if (!d) return '';
  return String(d).split('T')[0];
};

// Load storage boxes from API
const loadStorageBoxes = async () => {
  try {
    loadingBoxes.value = true;
    const res = await api.getWarehouseBoxes();
    storageBoxes.value = res || [];
  } catch (err) {
    console.error('Failed to load storage boxes:', err);
  } finally {
    loadingBoxes.value = false;
  }
};

// Populate form when order changes or dialog opens
watch(() => props.order, (newOrder) => {
  if (newOrder) {
    form.value = {
      currency: newOrder.currency || currencyStore.defaultCurrency,
      qty: Number(newOrder.qty) || 1,
      price: Number(newOrder.originalPrice ?? newOrder.price) || 0,
      date: formatDateForInput(newOrder.date) || new Date().toISOString().slice(0, 10),
      status: newOrder.status || 'delivered',
      deliveredDate: formatDateForInput(newOrder.deliveredDate) || (newOrder.status === 'delivered' ? formatDateForInput(newOrder.date) : ''),
      storageId: newOrder.storageId || null,
      url: newOrder.url || '',
      details: newOrder.details || '',
      adjustStock: true
    };
  }
}, { immediate: true });

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadStorageBoxes();
  }
});

const close = () => {
  emit('update:modelValue', false);
};

const save = async () => {
  if (formRef.value) {
    const { valid } = await formRef.value.validate();
    if (!valid) return;
  }

  try {
    saving.value = true;
    const payload = {
      currency: form.value.currency,
      qty: Number(form.value.qty),
      price: Number(form.value.price),
      date: form.value.date,
      status: form.value.status,
      deliveredDate: form.value.status === 'delivered' ? (form.value.deliveredDate || form.value.date) : null,
      storageId: form.value.storageId || null,
      url: form.value.url,
      details: form.value.details,
      adjustStock: form.value.adjustStock
    };

    const updated = await api.updateOrder(props.order.id, payload);
    emit('saved', updated);
    close();
  } catch (err) {
    console.error('Error saving order:', err);
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.min-w-0 {
  min-width: 0;
}
</style>
