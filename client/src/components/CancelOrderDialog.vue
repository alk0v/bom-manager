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
          <v-icon color="warning" size="22">mdi-cancel</v-icon>
          <span class="text-h6 font-weight-bold text-slate-900">
            {{ t('cancelOrderModal.title') }}
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

        <!-- Warning Information Alert -->
        <v-card variant="outlined" class="pa-3 mb-4 bg-amber-50 border-amber-200 rounded-lg">
          <div class="d-flex align-start gap-2">
            <v-icon color="amber-darken-3" size="20" class="mt-0.5 flex-shrink-0">mdi-alert-circle-outline</v-icon>
            <div class="text-caption text-amber-900 leading-relaxed">
              {{ t('cancelOrderModal.warningText') }}
            </div>
          </div>
        </v-card>

        <!-- Order Information Summary Card -->
        <v-card variant="outlined" class="pa-3 mb-4 bg-slate-50 border-slate-200 rounded-lg">
          <div class="d-flex align-center justify-space-between mb-2 border-b border-slate-200 pb-2">
            <div class="d-flex align-center gap-2 text-caption font-weight-bold text-slate-700 text-uppercase">
              <v-icon size="16" color="primary">mdi-receipt-text-outline</v-icon>
              {{ t('cancelOrderModal.orderInfo') }}
            </div>
            <v-chip size="x-small" color="amber-darken-3" variant="tonal" class="font-weight-bold">
              {{ t('editOrderModal.statusPending') }}
            </v-chip>
          </div>

          <v-row dense class="text-caption text-slate-700">
            <v-col cols="6" sm="3" v-if="orderDate">
              <div class="text-disabled text-caption">{{ t('cancelOrderModal.orderedDate') }}</div>
              <div class="font-mono font-weight-bold text-slate-800">{{ formatDate(orderDate) }}</div>
            </v-col>

            <v-col cols="6" sm="3">
              <div class="text-disabled text-caption">{{ t('cancelOrderModal.orderedQty') }}</div>
              <div class="font-mono font-weight-bold text-slate-900">{{ initialQty }} {{ t('shoppingList.pcs') }}</div>
            </v-col>

            <v-col cols="6" sm="3" v-if="orderPrice != null">
              <div class="text-disabled text-caption">{{ t('cancelOrderModal.unitPrice') }}</div>
              <div class="font-mono font-weight-bold text-primary">{{ formatCurrency(orderPrice) }}</div>
            </v-col>

            <v-col cols="6" sm="3" v-if="orderPrice != null">
              <div class="text-disabled text-caption">{{ t('cancelOrderModal.totalCost') }}</div>
              <div class="font-mono font-weight-bold text-slate-900">
                {{ formatCurrency(initialQty * orderPrice) }}
              </div>
            </v-col>

            <v-col cols="12" class="mt-1" v-if="supplierNotes || supplierUrl">
              <div class="text-disabled text-caption">{{ t('cancelOrderModal.supplier') }}</div>
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

        <!-- Cancellation Options Form -->
        <v-form @submit.prevent="submitCancel">
          <!-- Return to Shopping List Checkbox -->
          <v-card variant="outlined" class="pa-3 mb-4 rounded-lg bg-blue-50 border-blue-200">
            <v-checkbox
              v-model="returnToShoppingList"
              color="primary"
              hide-details
              density="compact"
            >
              <template #label>
                <div>
                  <div class="text-body-2 font-weight-bold text-slate-900">
                    {{ t('cancelOrderModal.returnToShoppingList') }}
                  </div>
                  <div class="text-caption text-slate-600 mt-0.5">
                    {{ t('cancelOrderModal.returnToShoppingListHint') }}
                  </div>
                </div>
              </template>
            </v-checkbox>
          </v-card>

          <!-- Reason / Notes input -->
          <div class="mb-2">
            <label class="text-caption text-slate-700 font-weight-bold text-uppercase d-block mb-1">
              {{ t('cancelOrderModal.reason') }}
            </label>
            <v-textarea
              v-model="reason"
              rows="2"
              density="compact"
              variant="outlined"
              rounded="lg"
              auto-grow
              hide-details="auto"
              prepend-inner-icon="mdi-comment-text-outline"
              :placeholder="t('cancelOrderModal.reasonPlaceholder')"
              clearable
            />
          </div>

          <!-- Quick suggestions chips -->
          <div class="d-flex align-center gap-1 flex-wrap mt-2">
            <span class="text-caption text-disabled me-1">{{ t('common.select') }}:</span>
            <v-chip
              size="x-small"
              variant="outlined"
              color="slate-700"
              class="cursor-pointer"
              @click="reason = t('cancelOrderModal.defaultReason')"
            >
              {{ t('cancelOrderModal.defaultReason') }}
            </v-chip>
            <v-chip
              size="x-small"
              variant="outlined"
              color="slate-700"
              class="cursor-pointer"
              @click="reason = t('cancelOrderModal.reasonOutOfStock')"
            >
              {{ t('cancelOrderModal.reasonOutOfStock') }}
            </v-chip>
            <v-chip
              size="x-small"
              variant="outlined"
              color="slate-700"
              class="cursor-pointer"
              @click="reason = t('cancelOrderModal.reasonRefunded')"
            >
              {{ t('cancelOrderModal.reasonRefunded') }}
            </v-chip>
          </div>
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
          {{ t('cancelOrderModal.cancel') }}
        </v-btn>

        <v-btn
          color="error"
          variant="flat"
          prepend-icon="mdi-cancel"
          class="font-weight-bold px-4"
          :loading="submitting"
          @click="submitCancel"
        >
          {{ t('cancelOrderModal.confirmCancel') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
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

const emit = defineEmits(['update:modelValue', 'cancelled', 'notify']);

const submitting = ref(false);
const returnToShoppingList = ref(true);
const reason = ref('');

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
  return props.item?.photoURL || props.item?.photoUrl || props.item?.componentPhotoURL || null;
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

const initForm = () => {
  returnToShoppingList.value = true;
  reason.value = t('cancelOrderModal.defaultReason');
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    initForm();
  }
});

const close = () => {
  emit('update:modelValue', false);
};

const submitCancel = async () => {
  if (!props.item) return;

  submitting.value = true;
  try {
    let res;
    const targetOrderId = props.item.isComponentOrder 
      ? props.item.id 
      : (props.item.orderId || props.item.id);

    // If order has an explicit order ID in t_orders
    if (props.item.orderId) {
      res = await api.cancelOrder(props.item.orderId, {
        returnToShoppingList: returnToShoppingList.value,
        reason: reason.value
      });
    } else if (props.item.isComponentOrder && props.item.id) {
      res = await api.cancelOrder(props.item.id, {
        returnToShoppingList: returnToShoppingList.value,
        reason: reason.value
      });
    } else if (props.item.id) {
      // Direct shopping list item cancel
      res = await api.cancelShoppingListOrder(props.item.id, {
        returnToShoppingList: returnToShoppingList.value,
        reason: reason.value
      });
    }

    emit('notify', t('cancelOrderModal.success', {
      id: targetOrderId || '',
      component: componentName.value
    }), 'success');

    emit('cancelled', res);
    close();
  } catch (err) {
    console.error('Failed to cancel order:', err);
    emit('notify', t('cancelOrderModal.error', {
      error: err.response?.data?.error || err.message
    }), 'error');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.bg-slate-50 {
  background-color: #f8fafc !important;
}
.bg-blue-50 {
  background-color: #eff6ff !important;
}
.border-blue-200 {
  border-color: #bfdbfe !important;
}
.bg-amber-50 {
  background-color: #fffbeb !important;
}
.border-amber-200 {
  border-color: #fde68a !important;
}
.border-b {
  border-bottom: 1px solid #e2e8f0 !important;
}
.min-w-0 {
  min-width: 0;
}
</style>
