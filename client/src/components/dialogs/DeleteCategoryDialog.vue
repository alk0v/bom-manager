<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520px"
    persistent
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-lg border bg-white elevation-4" v-if="category">
      <!-- Modal Header -->
      <div class="px-5 py-4 bg-slate-50 border-b d-flex align-center justify-space-between flex-shrink-0">
        <div class="d-flex align-center gap-2 text-subtitle-1 font-weight-bold text-slate-900">
          <v-icon :color="isBlockedByUsage ? 'amber-darken-3' : 'error'" size="22">
            {{ isBlockedByUsage ? 'mdi-alert-outline' : 'mdi-delete-alert-outline' }}
          </v-icon>
          <span>{{ t('manageCatalogModal.deleteCategoryTitle') }}</span>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" color="slate-500" :disabled="loading" @click="close" />
      </div>

      <!-- Modal Content -->
      <v-card-text class="pa-5">
        <!-- Category Summary Box -->
        <div class="pa-3 bg-slate-50 border rounded-lg mb-4 d-flex align-center justify-space-between flex-wrap gap-2">
          <div class="d-flex align-center gap-2">
            <v-icon color="primary" size="20">mdi-shape-outline</v-icon>
            <span class="font-weight-bold text-body-1 text-slate-900">{{ category.category }}</span>
          </div>
          <div class="d-flex align-center gap-1">
            <v-chip size="x-small" variant="tonal" color="indigo-darken-1" v-if="category.groupName">
              <v-icon start size="12">mdi-folder-outline</v-icon>
              {{ category.groupName }}
            </v-chip>
            <v-chip size="x-small" variant="tonal" color="teal-darken-2" v-if="customFieldsCount > 0">
              <v-icon start size="12">mdi-tune-vertical</v-icon>
              {{ t('manageCatalogModal.fieldsCount', { count: customFieldsCount }) }}
            </v-chip>
          </div>
        </div>

        <!-- Case 1: Category is in use (blocked) -->
        <div v-if="isBlockedByUsage">
          <v-alert
            type="warning"
            variant="tonal"
            border="start"
            density="comfortable"
            class="bg-amber-50 border-amber-300 text-slate-900 rounded-lg mb-2"
            icon="mdi-alert-circle-outline"
          >
            <div class="text-body-2 font-weight-medium mb-1 text-slate-900">
              {{ t('manageCatalogModal.categoryDeleteInUse', { name: category.category, count: category.componentCount }) }}
            </div>
          </v-alert>
        </div>

        <!-- Case 2: Category can be safely deleted -->
        <div v-else>
          <p class="text-body-2 text-slate-800 mb-3">
            {{ t('manageCatalogModal.categoryDeleteConfirm', { name: category.category }) }}
          </p>

          <div class="text-caption text-slate-500 bg-slate-50 pa-3 rounded border">
            {{ t('manageCatalogModal.deleteCategoryWarning') }}
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex justify-end gap-2">
        <v-btn
          variant="text"
          size="small"
          color="slate-600"
          :disabled="loading"
          @click="close"
        >
          {{ isBlockedByUsage ? t('common.close') : t('common.cancel') }}
        </v-btn>
        
        <v-btn
          v-if="!isBlockedByUsage"
          color="error"
          variant="flat"
          size="small"
          class="font-weight-bold"
          :loading="loading"
          prepend-icon="mdi-delete-outline"
          @click="confirm"
        >
          {{ t('manageCatalogModal.deleteCategoryBtn') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  category: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const isBlockedByUsage = computed(() => {
  return (props.category?.componentCount || 0) > 0;
});

const customFieldsCount = computed(() => {
  if (Array.isArray(props.category?.customFields)) {
    return props.category.customFields.length;
  }
  return props.category?.fieldsCount || 0;
});

const close = () => {
  emit('update:modelValue', false);
  emit('cancel');
};

const confirm = () => {
  emit('confirm', props.category);
};
</script>
