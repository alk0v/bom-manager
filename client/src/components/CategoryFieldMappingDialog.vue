<template>
  <v-dialog
    v-model="dialogModel"
    max-width="720"
    width="95vw"
    persistent
    scrollable
  >
    <v-card class="rounded-lg border bg-white elevation-4 d-flex flex-column" style="max-height: 85vh;">
      <!-- Header -->
      <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 d-flex align-center justify-space-between flex-shrink-0">
        <div class="d-flex align-center gap-3">
          <div class="rounded-lg bg-amber-50 text-amber-700 pa-2 d-flex align-center justify-center border border-amber-200">
            <v-icon icon="mdi-swap-horizontal-bold" size="24" color="amber-darken-3" />
          </div>
          <div>
            <div class="text-h6 font-weight-bold text-slate-900 leading-tight">
              {{ t('categoryMapping.dialogTitle') }}
            </div>
            <div class="text-caption text-slate-500 mt-0-5">
              {{ isBulk ? t('categoryMapping.dialogSubtitleBulk', { count: componentCount, target: targetCategoryName }) : t('categoryMapping.dialogSubtitleSingle', { target: targetCategoryName }) }}
            </div>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          color="slate-500"
          :disabled="processing"
          @click="cancel"
        />
      </div>

      <!-- Content -->
      <v-card-text class="pa-6 overflow-y-auto">
        <!-- Explanatory note -->
        <div class="text-body-2 text-slate-700 mb-4 line-height-relaxed">
          {{ t('categoryMapping.description') }}
        </div>

        <!-- Warning Alert if any field is set to 'delete' -->
        <v-alert
          v-if="hasDeletedFields"
          type="warning"
          variant="tonal"
          border="start"
          density="comfortable"
          class="mb-4 bg-amber-50 border-amber-300 text-slate-900 rounded-lg"
          icon="mdi-alert-outline"
        >
          <div class="text-subtitle-2 font-weight-bold text-amber-900 mb-1">
            {{ t('categoryMapping.deleteWarningTitle') }}
          </div>
          <div class="text-caption text-slate-700">
            {{ isBulk 
                ? t('categoryMapping.deleteWarningTextBulk', { count: componentCount, fields: deletedFieldNames.join(', ') }) 
                : t('categoryMapping.deleteWarningTextSingle', { fields: deletedFieldNames.join(', ') }) 
            }}
          </div>
        </v-alert>

        <!-- Fields Mapping List -->
        <div class="d-flex flex-column gap-3">
          <div
            v-for="item in mappingItems"
            :key="item.sourceFieldId"
            class="pa-4 border rounded-lg transition-all"
            :class="item.action === 'delete' ? 'bg-red-50/40 border-red-200' : 'bg-white border-slate-200'"
          >
            <!-- Source Field Header -->
            <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-3 pb-2 border-b border-slate-100">
              <div class="d-flex align-center gap-2">
                <v-icon icon="mdi-tune-vertical" size="18" color="primary" />
                <span class="font-weight-bold text-subtitle-2 text-slate-900">
                  {{ item.sourceLabel || item.sourceName }}
                </span>
                <v-chip size="x-small" color="slate-600" variant="tonal" class="font-mono" v-if="item.sourceUnit">
                  {{ item.sourceUnit }}
                </v-chip>
                <v-chip size="x-small" color="blue-grey" variant="outlined" class="text-caption">
                  {{ item.sourceType }}
                </v-chip>
              </div>

              <div class="d-flex align-center gap-2">
                <span v-if="item.sampleValue" class="text-caption font-mono text-slate-600 bg-slate-100 px-2 py-0-5 rounded">
                  {{ t('categoryMapping.sampleValue', { value: item.sampleValue }) }}
                </span>
                <span v-else-if="item.valuesCount" class="text-caption font-mono text-slate-500">
                  {{ t('categoryMapping.componentsCount', { count: item.valuesCount }) }}
                </span>

                <v-chip
                  size="x-small"
                  :color="item.isAutoMatched ? 'success' : 'warning'"
                  variant="flat"
                  class="font-weight-bold"
                >
                  <v-icon start size="12" :icon="item.isAutoMatched ? 'mdi-check-circle' : 'mdi-help-circle'" />
                  {{ item.isAutoMatched ? t('categoryMapping.autoMatched') : t('categoryMapping.unmapped') }}
                </v-chip>
              </div>
            </div>

            <!-- Action Controls -->
            <v-row dense align="center">
              <v-col cols="12" :md="item.action === 'map' ? 5 : 12">
                <v-radio-group
                  v-model="item.action"
                  inline
                  density="compact"
                  hide-details
                  class="mt-0"
                  color="primary"
                >
                  <v-radio
                    value="create"
                    color="success"
                    class="me-4"
                  >
                    <template #label>
                      <span class="text-caption font-weight-medium d-flex align-center gap-1 text-slate-800">
                        <v-icon size="16" color="success">mdi-plus-circle-outline</v-icon>
                        {{ t('categoryMapping.actionCreate') }}
                      </span>
                    </template>
                  </v-radio>

                  <v-radio
                    value="map"
                    color="primary"
                    class="me-4"
                    :disabled="targetFields.length === 0"
                  >
                    <template #label>
                      <span class="text-caption font-weight-medium d-flex align-center gap-1 text-slate-800">
                        <v-icon size="16" color="primary">mdi-swap-horizontal</v-icon>
                        {{ t('categoryMapping.actionMap') }}
                      </span>
                    </template>
                  </v-radio>

                  <v-radio
                    value="delete"
                    color="error"
                  >
                    <template #label>
                      <span class="text-caption font-weight-medium d-flex align-center gap-1 text-error">
                        <v-icon size="16" color="error">mdi-trash-can-outline</v-icon>
                        {{ t('categoryMapping.actionDelete') }}
                      </span>
                    </template>
                  </v-radio>
                </v-radio-group>
              </v-col>

              <!-- Map target field select -->
              <v-col cols="12" md="7" v-if="item.action === 'map'">
                <v-select
                  v-model="item.targetFieldId"
                  :items="targetFields"
                  item-title="fieldLabel"
                  item-value="id"
                  :placeholder="t('categoryMapping.selectTargetField')"
                  density="compact"
                  variant="outlined"
                  rounded="lg"
                  hide-details
                  class="text-caption"
                >
                  <template #item="{ props: itemProps, item: targetItem }">
                    <v-list-item v-bind="itemProps" :title="targetItem.raw.fieldLabel">
                      <template #append>
                        <v-chip size="x-small" color="slate-500" variant="tonal" class="ms-1" v-if="targetItem.raw.unit">
                          {{ targetItem.raw.unit }}
                        </v-chip>
                        <span class="text-caption text-disabled ms-1">({{ targetItem.raw.fieldType }})</span>
                      </template>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>
            </v-row>
          </div>
        </div>
      </v-card-text>

      <!-- Footer Actions -->
      <v-card-actions class="px-6 py-4 bg-slate-50 border-t border-slate-200 d-flex align-center justify-space-between">
        <v-btn
          variant="outlined"
          color="slate-600"
          :disabled="processing"
          @click="cancel"
        >
          {{ t('common.cancel') }}
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          :loading="processing"
          prepend-icon="mdi-check"
          class="font-weight-bold"
          @click="confirm"
        >
          {{ t('categoryMapping.applyBtn') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  sourceCategoryName: {
    type: String,
    default: ''
  },
  targetCategoryName: {
    type: String,
    default: ''
  },
  targetCategoryId: {
    type: [Number, String],
    required: true
  },
  targetFields: {
    type: Array,
    default: () => []
  },
  sourceFields: {
    type: Array,
    default: () => []
  },
  isBulk: {
    type: Boolean,
    default: false
  },
  componentCount: {
    type: Number,
    default: 1
  }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const processing = ref(false);
const mappingItems = ref([]);

const normalizeStr = (s) => {
  if (!s) return '';
  return String(s).toLowerCase().trim().replace(/[\s_\-]+/g, '');
};

const initializeMappings = () => {
  const items = [];
  const targetFieldsList = props.targetFields || [];

  for (const src of props.sourceFields) {
    const srcNameNorm = normalizeStr(src.fieldName);
    const srcLabelNorm = normalizeStr(src.fieldLabel);

    // Try finding direct match in target fields
    const matchedTarget = targetFieldsList.find(tf => {
      const tfNameNorm = normalizeStr(tf.fieldName);
      const tfLabelNorm = normalizeStr(tf.fieldLabel);
      return (
        (srcNameNorm && tfNameNorm && srcNameNorm === tfNameNorm) ||
        (srcLabelNorm && tfLabelNorm && srcLabelNorm === tfLabelNorm) ||
        (srcNameNorm && tfLabelNorm && srcNameNorm === tfLabelNorm) ||
        (srcLabelNorm && tfNameNorm && srcLabelNorm === tfNameNorm)
      );
    });

    if (matchedTarget) {
      items.push({
        sourceFieldId: src.id || src.fieldId,
        sourceName: src.fieldName,
        sourceLabel: src.fieldLabel,
        sourceType: src.fieldType || 'text',
        sourceUnit: src.unit || null,
        sourceOptions: src.options || null,
        sampleValue: src.sampleValue || null,
        valuesCount: src.valuesCount || null,
        isAutoMatched: true,
        action: 'map',
        targetFieldId: matchedTarget.id,
        newFieldData: null
      });
    } else {
      // Unmapped: default recommendation is 'create' in target category
      items.push({
        sourceFieldId: src.id || src.fieldId,
        sourceName: src.fieldName,
        sourceLabel: src.fieldLabel,
        sourceType: src.fieldType || 'text',
        sourceUnit: src.unit || null,
        sourceOptions: src.options || null,
        sampleValue: src.sampleValue || null,
        valuesCount: src.valuesCount || null,
        isAutoMatched: false,
        action: 'create',
        targetFieldId: targetFieldsList.length > 0 ? targetFieldsList[0].id : null,
        newFieldData: {
          fieldName: src.fieldName,
          fieldLabel: src.fieldLabel,
          fieldType: src.fieldType || 'text',
          unit: src.unit || null,
          options: src.options || null
        }
      });
    }
  }

  mappingItems.value = items;
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    initializeMappings();
  }
});

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const hasDeletedFields = computed(() => {
  return mappingItems.value.some(m => m.action === 'delete');
});

const deletedFieldNames = computed(() => {
  return mappingItems.value
    .filter(m => m.action === 'delete')
    .map(m => `"${m.sourceLabel || m.sourceName}"`);
});

const cancel = () => {
  emit('cancel');
  dialogModel.value = false;
};

const confirm = () => {
  const resultMappings = mappingItems.value.map(item => ({
    sourceFieldId: item.sourceFieldId,
    sourceName: item.sourceName,
    sourceLabel: item.sourceLabel,
    action: item.action,
    targetFieldId: item.action === 'map' ? item.targetFieldId : null,
    newFieldData: item.action === 'create' ? {
      fieldName: item.sourceName,
      fieldLabel: item.sourceLabel,
      fieldType: item.sourceType,
      unit: item.sourceUnit,
      options: item.sourceOptions
    } : null
  }));

  emit('confirm', {
    targetCategoryId: props.targetCategoryId,
    mappings: resultMappings
  });
};
</script>
