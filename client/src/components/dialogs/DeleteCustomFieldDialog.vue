<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500px"
    persistent
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-lg border bg-white elevation-4" v-if="field">
      <div class="px-5 py-4 bg-slate-50 border-b d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2 text-subtitle-1 font-weight-bold text-slate-900">
          <v-icon color="error" size="22">mdi-alert-circle-outline</v-icon>
          {{ t('manageCatalogModal.deleteFieldTitle') }}
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" color="slate-500" :disabled="loading" @click="close" />
      </div>

      <v-card-text class="pa-5">
        <p class="text-body-2 text-slate-800 mb-3">
          {{ t('manageCatalogModal.deleteFieldConfirm', { name: field.fieldLabel || field.fieldName }) }}
        </p>

        <v-alert
          v-if="(field.componentsCount || 0) > 0"
          type="warning"
          variant="tonal"
          border="start"
          density="comfortable"
          class="bg-amber-50 border-amber-300 text-slate-900 rounded-lg mb-0"
          icon="mdi-alert-outline"
        >
          <div class="text-caption font-weight-medium">
            {{ t('manageCatalogModal.deleteFieldWarning', { count: field.componentsCount }) }}
          </div>
        </v-alert>

        <div v-else class="text-caption text-slate-500 bg-slate-50 pa-3 rounded border">
          {{ t('manageCatalogModal.deleteFieldNoValues') }}
        </div>
      </v-card-text>

      <v-divider />
      <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex justify-end gap-2">
        <v-btn variant="text" size="small" color="slate-600" :disabled="loading" @click="close">
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          size="small"
          class="font-weight-bold"
          :loading="loading"
          @click="confirm"
        >
          {{ t('manageCatalogModal.confirmDeleteFieldBtn') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  field: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const close = () => {
  emit('update:modelValue', false);
  emit('cancel');
};

const confirm = () => {
  emit('confirm', props.field);
};
</script>
