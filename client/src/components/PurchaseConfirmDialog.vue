<template>
  <v-dialog
    :model-value="modelValue"
    max-width="850"
    scrollable
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-0 border bg-white d-flex flex-column" v-if="item">
      <!-- Header -->
      <v-card-title class="bg-slate-50 py-3 px-5 d-flex align-center justify-space-between border-b flex-shrink-0">
        <div class="d-flex align-center gap-2">
          <v-icon color="primary" size="22">mdi-cash-check</v-icon>
          <span class="text-h6 font-weight-bold text-slate-900">
            {{ t('purchaseModal.title') }}
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
              :src="item.photoURL"
              height="48px"
              width="48px"
            />
          </v-avatar>

          <div class="flex-grow-1 min-w-0">
            <div class="d-flex align-center gap-2 flex-wrap">
              <span class="font-mono font-weight-bold text-subtitle-1 text-primary text-truncate">
                {{ item.component }}
              </span>
              <v-chip
                v-if="item.marking"
                size="x-small"
                variant="tonal"
                color="slate-700"
                class="font-mono font-weight-bold"
              >
                Mark: {{ item.marking }}
              </v-chip>
            </div>
            <div class="d-flex align-center gap-2 text-caption text-slate-600 mt-1 flex-wrap">
              <span v-if="item.category">{{ item.category }}</span>
              <span v-if="item.package">• {{ item.package }}</span>
              <span>• {{ t('shoppingList.colCurrentStock') }}: <strong class="font-mono">{{ item.stockQuantity ?? 0 }} {{ t('shoppingList.pcs') }}</strong></span>
            </div>
          </div>
        </div>



        <v-form @submit.prevent="submitPurchase" ref="formRef">
          <v-row dense>
            <!-- Currency Selection -->
            <v-col cols="12" sm="3">
              <label class="text-caption text-slate-700 font-weight-bold text-uppercase d-block mb-1">
                {{ t('purchaseModal.currency') }}
              </label>
              <v-select
                v-model="form.currency"
                :items="currencyStore.currencyOptions"
                item-title="label"
                item-value="code"
                density="compact"
                variant="outlined"
                rounded="lg"
                hide-details
                prepend-inner-icon="mdi-cash"
              />
            </v-col>

            <!-- Quantity Purchased -->
            <v-col cols="12" sm="3">
              <label class="text-caption text-slate-700 font-weight-bold text-uppercase d-block mb-1">
                {{ t('purchaseModal.quantityPcs') }}
              </label>
              <div class="d-flex align-center border rounded-lg bg-white px-1" style="height: 40px;">
                <v-btn
                  icon="mdi-minus"
                  size="small"
                  variant="text"
                  density="comfortable"
                  :disabled="form.qty <= 1"
                  @click="decrementQty"
                />
                <input
                  type="number"
                  v-model.number="form.qty"
                  min="1"
                  step="1"
                  required
                  class="font-mono font-weight-bold text-center text-slate-900 border-0 outline-none flex-grow-1"
                  style="width: 50px; font-size: 1rem;"
                  @input="onQtyChange"
                />
                <v-btn
                  icon="mdi-plus"
                  size="small"
                  variant="text"
                  density="comfortable"
                  @click="incrementQty"
                />
              </div>
            </v-col>

            <!-- Unit Price -->
            <v-col cols="12" sm="3">
              <label class="text-caption text-slate-700 font-weight-bold text-uppercase d-block mb-1">
                {{ t('purchaseModal.unitPrice') }}
              </label>
              <v-text-field
                v-model.number="form.price"
                type="number"
                min="0"
                step="0.0001"
                :prefix="currencyStore.getSymbol(form.currency)"
                density="compact"
                variant="outlined"
                rounded="lg"
                hide-details
                placeholder="0.00"
                class="font-mono"
                @input="onUnitPriceInput"
              />
            </v-col>

            <!-- Order Sum / Total -->
            <v-col cols="12" sm="3">
              <label class="text-caption text-slate-700 font-weight-bold text-uppercase d-block mb-1">
                {{ t('purchaseModal.orderSum') }}
              </label>
              <v-text-field
                v-model.number="form.totalSum"
                type="number"
                min="0"
                step="0.01"
                :prefix="currencyStore.getSymbol(form.currency)"
                density="compact"
                variant="outlined"
                rounded="lg"
                hide-details
                placeholder="0.00"
                class="font-mono font-weight-bold"
                @input="onOrderSumInput"
              />
            </v-col>

            <!-- Total Cost Summary Box -->
            <v-col cols="12" class="my-2">
              <div class="d-flex align-center justify-space-between pa-3 px-4 bg-primary-lighten-5 border border-primary rounded-lg flex-wrap gap-2">
                <div class="d-flex align-center gap-2">
                  <v-icon color="primary" size="22">mdi-calculator</v-icon>
                  <div>
                    <span class="text-subtitle-2 font-weight-bold text-slate-800 d-block">
                      {{ t('purchaseModal.pricingBreakdown') }}
                    </span>
                    <span class="text-caption text-slate-600 font-mono">
                      {{ form.qty || 1 }} {{ t('shoppingList.pcs') }} × {{ formatCurrency(form.price || 0, form.currency) }} / {{ t('shoppingList.pcs') }}
                    </span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-caption text-disabled text-uppercase font-weight-bold">{{ t('purchaseModal.orderTotal') }}</div>
                  <div class="text-h6 font-mono font-weight-bold text-primary">
                    {{ formatCurrency(form.totalSum || 0, form.currency) }}
                  </div>
                  <div v-if="conversionPreview" class="text-caption text-slate-600 font-mono mt-0.5">
                    ≈ {{ formatCurrency(conversionPreview.convertedTotal, currencyStore.defaultCurrency) }}
                    <span class="text-slate-400 ms-1">(1 {{ form.currency }} = {{ conversionPreview.rate }} {{ currencyStore.defaultCurrency }})</span>
                  </div>
                </div>
              </div>
            </v-col>

            <!-- Purchase Date -->
            <v-col cols="12" sm="5">
              <label class="text-caption text-slate-700 font-weight-bold text-uppercase d-block mb-1">
                {{ t('purchaseModal.purchaseDate') }}
              </label>
              <v-text-field
                v-model="form.date"
                type="date"
                density="compact"
                variant="outlined"
                rounded="lg"
                hide-details
                required
              />
            </v-col>

            <!-- Supplier Product URL -->
            <v-col cols="12" sm="7">
              <label class="text-caption text-slate-700 font-weight-bold text-uppercase d-block mb-1">
                {{ t('purchaseModal.supplierUrl') }}
              </label>
              <v-text-field
                v-model="form.url"
                :placeholder="t('purchaseModal.urlPlaceholder')"
                density="compact"
                variant="outlined"
                rounded="lg"
                hide-details
                prepend-inner-icon="mdi-link-variant"
                clearable
              >
                <template #append v-if="form.url">
                  <v-btn
                    icon="mdi-open-in-new"
                    size="small"
                    variant="text"
                    color="primary"
                    :href="form.url"
                    target="_blank"
                    :title="t('dialogs.testLinkNewTab')"
                  />
                </template>
              </v-text-field>
            </v-col>

            <!-- Notes (Full width input box) -->
            <v-col cols="12" class="mt-2">
              <label class="text-caption text-slate-700 font-weight-bold text-uppercase d-block mb-1">
                {{ t('purchaseModal.notes') }}
              </label>
              <v-text-field
                v-model="form.details"
                :placeholder="t('purchaseModal.notesPlaceholder')"
                density="compact"
                variant="outlined"
                rounded="lg"
                hide-details
                prepend-inner-icon="mdi-note-text-outline"
                clearable
              />
            </v-col>

            <!-- Delivery Status Option -->
            <v-col cols="12" class="mt-2 pt-3 border-t">
              <label class="text-caption text-slate-700 font-weight-bold text-uppercase d-block mb-1">
                {{ t('purchaseModal.deliveryStatus') }}
              </label>
              <div class="d-flex align-center flex-wrap gap-x-4 gap-y-1">
                <v-radio-group v-model="form.deliveryStatus" inline hide-details density="compact">
                  <v-radio
                    value="pending"
                    :label="t('purchaseModal.statusPending')"
                    color="warning"
                    class="me-4"
                  />
                  <v-radio
                    value="delivered"
                    :label="t('purchaseModal.statusDelivered')"
                    color="success"
                  />
                </v-radio-group>

                <!-- Delivered: Checkbox to add stock -->
                <v-checkbox
                  v-if="form.deliveryStatus === 'delivered'"
                  v-model="form.addToStock"
                  :label="t('purchaseModal.addToStock')"
                  color="primary"
                  hide-details
                  density="compact"
                  class="ms-2"
                />

                <!-- Pending: Informational text on the same place -->
                <div
                  v-else-if="form.deliveryStatus === 'pending'"
                  class="text-body-2 text-slate-700 d-flex align-center ms-2"
                  style="min-height: 40px;"
                >
                  <v-icon size="18" color="warning" class="me-1.5 flex-shrink-0">mdi-truck-delivery-outline</v-icon>
                  <span>{{ t('purchaseModal.stockPendingHint') }}</span>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions class="pa-4 bg-slate-50 d-flex align-center justify-space-between flex-shrink-0">
        <div class="d-flex align-center gap-2">
          <v-btn
            variant="outlined"
            color="slate-600"
            @click="close"
            :disabled="submitting"
          >
            {{ t('purchaseModal.cancel') }}
          </v-btn>

          <v-btn
            variant="text"
            color="slate-600"
            prepend-icon="mdi-broom"
            @click="clearForm"
            :disabled="submitting"
            :title="t('dialogs.clearFormTooltip')"
          >
            {{ t('purchaseModal.clear') }}
          </v-btn>
        </div>

        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-cash-check"
          class="font-weight-bold px-4"
          :loading="submitting"
          @click="submitPurchase"
        >
          {{ t('purchaseModal.confirmButton') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import MediaImage from './MediaImage.vue';
import { formatCurrency } from '../utils/formatters';
import { useCurrencyStore } from '../stores/currency';

const { t } = useI18n();
const currencyStore = useCurrencyStore();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  item: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'purchased', 'notify']);

const submitting = ref(false);
const storages = ref([]);

const form = ref({
  currency: currencyStore.defaultCurrency,
  qty: 1,
  price: 0,
  totalSum: 0,
  date: new Date().toISOString().slice(0, 10),
  details: '',
  url: '',
  deliveryStatus: 'pending',
  addToStock: true,
  storageId: null
});

const isForeignCurrency = computed(() => {
  return form.value.currency && form.value.currency !== currencyStore.defaultCurrency;
});

const conversionPreview = computed(() => {
  if (!isForeignCurrency.value) return null;
  const rateInfo = currencyStore.getNearestRate(form.value.currency, currencyStore.defaultCurrency, form.value.date);
  const total = Number(form.value.totalSum) || 0;
  const convertedTotal = Math.round(total * rateInfo.rate * 100) / 100;
  return {
    convertedTotal,
    rate: rateInfo.rate,
    rateDate: rateInfo.rateDate
  };
});

const lastEdited = ref('price');

const onUnitPriceInput = () => {
  lastEdited.value = 'price';
  const qty = Number(form.value.qty) || 1;
  const p = form.value.price;
  if (p !== null && p !== '' && !isNaN(Number(p)) && Number(p) >= 0) {
    const rawTotal = qty * Number(p);
    form.value.totalSum = Math.round((rawTotal + Number.EPSILON) * 100) / 100;
  } else {
    form.value.totalSum = null;
  }
};

const onOrderSumInput = () => {
  lastEdited.value = 'totalSum';
  const qty = Number(form.value.qty) || 1;
  const t = form.value.totalSum;
  if (t !== null && t !== '' && !isNaN(Number(t)) && Number(t) >= 0 && qty > 0) {
    const rawUnit = Number(t) / qty;
    form.value.price = Math.round((rawUnit + Number.EPSILON) * 10000) / 10000;
  } else {
    form.value.price = null;
  }
};

const onQtyChange = () => {
  const qty = Number(form.value.qty) || 1;
  if (lastEdited.value === 'totalSum' && form.value.totalSum !== null && form.value.totalSum !== '' && !isNaN(Number(form.value.totalSum))) {
    const rawUnit = Number(form.value.totalSum) / qty;
    form.value.price = Math.round((rawUnit + Number.EPSILON) * 10000) / 10000;
  } else if (form.value.price !== null && form.value.price !== '' && !isNaN(Number(form.value.price))) {
    const rawTotal = qty * Number(form.value.price);
    form.value.totalSum = Math.round((rawTotal + Number.EPSILON) * 100) / 100;
  }
};

const decrementQty = () => {
  form.value.qty = Math.max(1, (Number(form.value.qty) || 1) - 1);
  onQtyChange();
};

const incrementQty = () => {
  form.value.qty = (Number(form.value.qty) || 0) + 1;
  onQtyChange();
};

const storageItems = computed(() => {
  return storages.value.map(s => ({
    id: s.ID || s.id,
    title: `${s.storage || 'Box #' + (s.ID || s.id)} (${s.description || 'General'})`
  }));
});

const loadStorages = async () => {
  try {
    storages.value = await api.getStorages();
  } catch (err) {
    console.warn('Failed to load storages for purchase dialog:', err);
  }
};

const STORAGE_KEY = 'bommanager_last_purchase';

const getLastPurchase = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

const saveLastPurchase = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save last purchase state:', e);
  }
};

const clearLastPurchase = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
};

const hasRestoredValues = ref(false);

const close = () => {
  emit('update:modelValue', false);
};

const clearForm = () => {
  clearLastPurchase();
  hasRestoredValues.value = false;

  const initialQty = props.item?.isComponentDirect
    ? (props.item?.quantity || props.item?.directQty || 1)
    : (props.item?.qty || 1);
  const defaultPrice = props.item?.latestPrice != null ? Number(props.item.latestPrice) : 0;
  const defaultTotal = Math.round((initialQty * defaultPrice + Number.EPSILON) * 100) / 100;

  form.value = {
    currency: currencyStore.defaultCurrency,
    qty: initialQty,
    price: defaultPrice,
    totalSum: defaultTotal,
    date: new Date().toISOString().slice(0, 10),
    details: '',
    url: '',
    deliveryStatus: 'pending',
    addToStock: true,
    storageId: null
  };
  lastEdited.value = 'price';
  emit('notify', t('purchaseModal.kitValuesCleared'), 'info');
};

const initForm = () => {
  if (!props.item) return;

  const last = getLastPurchase();

  if (last) {
    hasRestoredValues.value = true;
    lastEdited.value = last.lastEdited || 'price';

    const restoredQty = last.qty != null ? last.qty : (props.item.isComponentDirect ? (props.item.quantity || props.item.directQty || 1) : (props.item.qty || 1));
    const restoredPrice = last.price != null ? Number(last.price) : (props.item.latestPrice != null ? Number(props.item.latestPrice) : 0);
    let restoredTotal = last.totalSum != null ? Number(last.totalSum) : 0;
    if (!restoredTotal && restoredPrice && restoredQty) {
      restoredTotal = Math.round((restoredQty * restoredPrice + Number.EPSILON) * 100) / 100;
    }

    form.value = {
      currency: last.currency || props.item.activeOrderCurrency || currencyStore.defaultCurrency,
      qty: restoredQty,
      price: restoredPrice,
      totalSum: restoredTotal,
      date: last.date || new Date().toISOString().slice(0, 10),
      details: last.details || '',
      url: last.url || '',
      deliveryStatus: last.deliveryStatus || 'pending',
      addToStock: last.addToStock !== undefined ? last.addToStock : true,
      storageId: last.storageId !== undefined ? last.storageId : null
    };
  } else {
    hasRestoredValues.value = false;
    const initialQty = props.item.isComponentDirect
      ? (props.item.quantity || props.item.directQty || 1)
      : (props.item.qty || 1);
    const initialPrice = props.item.latestPrice != null ? Number(props.item.latestPrice) : 0;
    const initialTotal = Math.round((initialQty * initialPrice + Number.EPSILON) * 100) / 100;

    form.value = {
      currency: props.item.activeOrderCurrency || currencyStore.defaultCurrency,
      qty: initialQty,
      price: initialPrice,
      totalSum: initialTotal,
      date: new Date().toISOString().slice(0, 10),
      details: props.item.latestOrderDetails || '',
      url: props.item.latestOrderUrl || '',
      deliveryStatus: 'pending',
      addToStock: true,
      storageId: null
    };
    lastEdited.value = 'price';
  }
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    initForm();
    if (storages.value.length === 0) {
      loadStorages();
    }
  }
});

watch(() => props.item, () => {
  if (props.modelValue) {
    initForm();
  }
});

const submitPurchase = async () => {
  const compId = props.item?.componentId || props.item?.ID || props.item?.id;
  if (!compId) return;
  if (!form.value.qty || form.value.qty < 1) {
    emit('notify', t('purchaseModal.invalidQty'), 'error');
    return;
  }

  // Ensure price is computed if totalSum was provided
  if ((form.value.price == null || form.value.price === '' || isNaN(form.value.price)) && form.value.totalSum != null && form.value.totalSum !== '') {
    const qty = Number(form.value.qty) || 1;
    form.value.price = Math.round(((Number(form.value.totalSum) / qty) + Number.EPSILON) * 10000) / 10000;
  }

  const finalPrice = form.value.price != null && !isNaN(Number(form.value.price)) ? Number(form.value.price) : 0;

  submitting.value = true;
  try {
    let res;
    if (!props.item.isComponentDirect && props.item.id && props.item.componentId) {
      // Shopping list purchase
      res = await api.purchaseShoppingListItem(props.item.id, {
        currency: form.value.currency,
        qty: form.value.qty,
        price: finalPrice,
        date: form.value.date,
        url: form.value.url,
        details: form.value.details,
        deliveryStatus: form.value.deliveryStatus,
        addToStock: form.value.addToStock,
        storageId: form.value.storageId
      });
    } else {
      // Direct component purchase
      res = await api.purchaseComponent(compId, {
        currency: form.value.currency,
        qty: form.value.qty,
        price: finalPrice,
        date: form.value.date,
        url: form.value.url,
        details: form.value.details,
        deliveryStatus: form.value.deliveryStatus,
        addToStock: form.value.addToStock,
        storageId: form.value.storageId
      });
    }

    // Save successful purchase values for kit orders
    saveLastPurchase({
      currency: form.value.currency,
      qty: form.value.qty,
      price: finalPrice,
      totalSum: form.value.totalSum,
      date: form.value.date,
      details: form.value.details,
      url: form.value.url,
      deliveryStatus: form.value.deliveryStatus,
      addToStock: form.value.addToStock,
      storageId: form.value.storageId,
      lastEdited: lastEdited.value
    });

    if (form.value.deliveryStatus === 'pending') {
      emit('notify', t('purchaseModal.orderSuccess', {
        orderId: res.orderId,
        qty: res.qty,
        component: res.component
      }), 'success');
    } else {
      emit('notify', t('purchaseModal.orderSuccessStock', {
        orderId: res.orderId,
        qty: res.qty,
        component: res.component,
        newStock: res.newStock
      }), 'success');
    }

    emit('purchased', res);
    close();
  } catch (err) {
    console.error('Failed to confirm purchase:', err);
    emit('notify', 'Failed to confirm purchase: ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadStorages();
});
</script>

<style scoped>
.bg-slate-50 {
  background-color: #f8fafc !important;
}
.bg-primary-lighten-5 {
  background-color: #eff6ff !important;
}
.border-b {
  border-bottom: 1px solid #e2e8f0 !important;
}
</style>
