<template>
  <v-dialog
    :model-value="modelValue"
    max-width="580"
    scrollable
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-0 border bg-white d-flex flex-column" v-if="item">
      <!-- Header -->
      <v-card-title class="bg-slate-50 py-3 px-5 d-flex align-center justify-space-between border-b flex-shrink-0">
        <div class="d-flex align-center gap-2">
          <v-icon color="success" size="22">mdi-package-variant-closed-check</v-icon>
          <span class="text-h6 font-weight-bold text-slate-900">
            {{ t('confirmDeliveryModal.title') }}
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
              :src="componentPhoto"
              height="48px"
              width="48px"
            />
          </v-avatar>

          <div class="flex-grow-1 min-w-0">
            <div class="d-flex align-center gap-2 flex-wrap">
              <span class="font-mono font-weight-bold text-subtitle-1 text-primary text-truncate">
                {{ componentName }}
              </span>
              <v-chip
                v-if="componentMarking"
                size="x-small"
                variant="tonal"
                color="slate-700"
                class="font-mono font-weight-bold"
              >
                Mark: {{ componentMarking }}
              </v-chip>
            </div>
            <div class="d-flex align-center gap-2 text-caption text-slate-600 mt-1 flex-wrap">
              <span v-if="componentCategory">{{ componentCategory }}</span>
              <span v-if="componentPackage">• {{ componentPackage }}</span>
              <span>• {{ t('shoppingList.colCurrentStock') }}: <strong class="font-mono">{{ currentStock }} {{ t('shoppingList.pcs') }}</strong></span>
            </div>
          </div>
        </div>

        <!-- Order Information Summary Card -->
        <v-card variant="outlined" class="pa-3 mb-4 bg-emerald-50 border-emerald-200 rounded-lg">
          <div class="d-flex align-center justify-space-between mb-2 border-b border-emerald-200 pb-2">
            <div class="d-flex align-center gap-2 text-caption font-weight-bold text-emerald-900 text-uppercase">
              <v-icon size="16" color="success">mdi-receipt-text-outline</v-icon>
              {{ t('confirmDeliveryModal.orderedInfo') }}
            </div>
            <v-chip size="x-small" color="success" variant="flat" class="font-weight-bold">
              {{ t('confirmDeliveryModal.title') }}
            </v-chip>
          </div>

          <v-row dense class="text-caption text-slate-700">
            <v-col cols="6" sm="4" v-if="orderDate">
              <div class="text-disabled text-caption">{{ t('confirmDeliveryModal.orderedDate') }}</div>
              <div class="font-mono font-weight-bold text-slate-800">{{ formatDate(orderDate) }}</div>
            </v-col>

            <v-col cols="6" sm="4" v-if="orderPrice != null">
              <div class="text-disabled text-caption">{{ t('componentDetailsModal.colUnitPrice') }}</div>
              <div class="font-mono font-weight-bold text-primary">{{ formatCurrency(orderPrice) }}</div>
            </v-col>

            <v-col cols="6" sm="4" v-if="orderPrice != null && initialQty">
              <div class="text-disabled text-caption">{{ t('confirmDeliveryModal.totalCost') }}</div>
              <div class="font-mono font-weight-bold text-slate-900">
                {{ formatCurrency(initialQty * orderPrice) }}
              </div>
            </v-col>

            <v-col cols="12" class="mt-1" v-if="supplierNotes || supplierUrl">
              <div class="text-disabled text-caption">{{ t('confirmDeliveryModal.supplier') }}</div>
              <div class="d-flex align-center gap-2 flex-wrap">
                <span v-if="supplierNotes" class="font-weight-medium text-slate-800">{{ supplierNotes }}</span>
                <v-btn
                  v-if="supplierUrl"
                  icon="mdi-open-in-new"
                  size="x-small"
                  variant="text"
                  color="primary"
                  :href="supplierUrl"
                  target="_blank"
                  :title="t('dialogs.testLinkNewTab')"
                />
              </div>
            </v-col>
          </v-row>
        </v-card>

        <!-- Delivery Form -->
        <v-form @submit.prevent="submitDelivery" ref="formRef">
          <v-row dense>
            <!-- Received Quantity -->
            <v-col cols="12" sm="6">
              <label class="text-caption text-slate-700 font-weight-bold text-uppercase d-block mb-1">
                {{ t('confirmDeliveryModal.receivedQty') }}
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
                />
                <v-btn
                  icon="mdi-plus"
                  size="small"
                  variant="text"
                  density="comfortable"
                  @click="incrementQty"
                />
              </div>
              <div class="text-caption text-slate-500 mt-1 font-mono">
                {{ t('shoppingList.orderedQty', { qty: initialQty }) }}
              </div>
            </v-col>

            <!-- Delivery Date -->
            <v-col cols="12" sm="6">
              <label class="text-caption text-slate-700 font-weight-bold text-uppercase d-block mb-1">
                {{ t('confirmDeliveryModal.deliveryDate') }}
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

            <!-- Storage Box Selection -->
            <v-col cols="12" class="mt-2" v-if="storages.length > 0">
              <label class="text-caption text-slate-700 font-weight-bold text-uppercase d-block mb-1">
                {{ t('confirmDeliveryModal.storageLocation') }}
              </label>
              <v-select
                v-model="form.storageId"
                :items="storageItems"
                item-title="title"
                item-value="id"
                density="compact"
                variant="outlined"
                rounded="lg"
                :placeholder="t('confirmDeliveryModal.selectStorage')"
                clearable
                hide-details
                prepend-inner-icon="mdi-archive-outline"
              />
            </v-col>

            <!-- Add to Stock Checkbox -->
            <v-col cols="12" class="mt-2 pt-2 border-t">
              <v-checkbox
                v-model="form.addToStock"
                :label="t('confirmDeliveryModal.addToStock')"
                color="success"
                hide-details
                density="compact"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions class="pa-4 bg-slate-50 d-flex align-center justify-space-between flex-shrink-0">
        <v-btn
          variant="outlined"
          color="slate-600"
          @click="close"
          :disabled="submitting"
        >
          {{ t('confirmDeliveryModal.cancel') }}
        </v-btn>

        <v-btn
          color="success"
          variant="flat"
          prepend-icon="mdi-package-variant-closed-check"
          class="font-weight-bold px-4"
          :loading="submitting"
          @click="submitDelivery"
        >
          {{ t('confirmDeliveryModal.confirmDelivery') }}
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
import { formatCurrency, formatDate } from '../utils/formatters';

const { t } = useI18n();

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

const emit = defineEmits(['update:modelValue', 'delivered', 'notify']);

const submitting = ref(false);
const storages = ref([]);

const form = ref({
  qty: 1,
  date: new Date().toISOString().slice(0, 10),
  storageId: null,
  addToStock: true
});

const componentName = computed(() => {
  return props.item?.component || props.item?.componentName || props.item?.name || '—';
});

const componentMarking = computed(() => {
  return props.item?.marking || '';
});

const componentCategory = computed(() => {
  return props.item?.category || '';
});

const componentPackage = computed(() => {
  return props.item?.package || '';
});

const componentPhoto = computed(() => {
  return props.item?.photoURL || props.item?.photoUrl || null;
});

const currentStock = computed(() => {
  return props.item?.stockQuantity ?? props.item?.currentStock ?? 0;
});

const orderDate = computed(() => {
  return props.item?.activeOrderDate || props.item?.date || null;
});

const orderPrice = computed(() => {
  return props.item?.activeOrderPrice ?? props.item?.price ?? null;
});

const supplierNotes = computed(() => {
  return props.item?.activeOrderDetails || props.item?.details || '';
});

const supplierUrl = computed(() => {
  return props.item?.activeOrderUrl || props.item?.url || '';
});

const initialQty = computed(() => {
  return Number(props.item?.activeOrderQty || props.item?.qty || 1);
});

const storageItems = computed(() => {
  return storages.value.map(s => ({
    id: s.ID || s.id,
    title: `${s.storage || 'Box #' + (s.ID || s.id)} (${s.description || 'General'})`
  }));
});

const decrementQty = () => {
  form.value.qty = Math.max(1, (Number(form.value.qty) || 1) - 1);
};

const incrementQty = () => {
  form.value.qty = (Number(form.value.qty) || 0) + 1;
};

const loadStorages = async () => {
  try {
    storages.value = await api.getStorages();
  } catch (err) {
    console.warn('Failed to load storages for confirm delivery dialog:', err);
  }
};

const initForm = () => {
  if (!props.item) return;

  const defaultQty = Number(props.item.activeOrderQty || props.item.qty || 1);
  const defaultStorage = props.item.activeOrderStorageId || props.item.storageId || null;

  form.value = {
    qty: defaultQty > 0 ? defaultQty : 1,
    date: new Date().toISOString().slice(0, 10),
    storageId: defaultStorage,
    addToStock: true
  };
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

const close = () => {
  emit('update:modelValue', false);
};

const submitDelivery = async () => {
  if (!props.item) return;
  if (!form.value.qty || form.value.qty < 1) {
    emit('notify', t('purchaseModal.invalidQty'), 'error');
    return;
  }

  submitting.value = true;
  try {
    let res;
    // Check if this is a component order directly (has order id and isComponentOrder flag)
    if (props.item.isComponentOrder && props.item.id) {
      res = await api.confirmOrderDelivery(props.item.id, {
        qty: form.value.qty,
        deliveryDate: form.value.date,
        storageId: form.value.storageId,
        addToStock: form.value.addToStock
      });
    } else if (props.item.orderId && !props.item.isComponentOrder) {
      // Shopping list item with active order
      res = await api.confirmDelivery(props.item.id, {
        qty: form.value.qty,
        deliveryDate: form.value.date,
        storageId: form.value.storageId,
        addToStock: form.value.addToStock
      });
    } else if (props.item.id) {
      // Fallback: shopping list confirm delivery
      res = await api.confirmDelivery(props.item.id, {
        qty: form.value.qty,
        deliveryDate: form.value.date,
        storageId: form.value.storageId,
        addToStock: form.value.addToStock
      });
    }

    emit('notify', t('confirmDeliveryModal.success', {
      qty: res?.deliveredQty || form.value.qty,
      component: componentName.value,
      newStock: res?.newStock ?? (currentStock.value + form.value.qty)
    }), 'success');

    emit('delivered', res);
    close();
  } catch (err) {
    console.error('Failed to confirm delivery:', err);
    emit('notify', t('confirmDeliveryModal.error', {
      error: err.response?.data?.error || err.message
    }), 'error');
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
.bg-emerald-50 {
  background-color: #ecfdf5 !important;
}
.border-emerald-200 {
  border-color: #a7f3d0 !important;
}
.border-b {
  border-bottom: 1px solid #e2e8f0 !important;
}
</style>
