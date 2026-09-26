<template>
  <div class="categories-dictionary-view">
    <!-- Main Categories Card -->
    <v-card elevation="1" class="rounded-0 border bg-white">
      <!-- Toolbar -->
      <div class="pa-4 border-b d-flex flex-wrap align-center justify-space-between gap-3 bg-slate-50">
        <div class="d-flex align-center gap-3 flex-grow-1 flex-sm-grow-0" style="min-width: 280px; max-width: 420px;">
          <v-text-field
            v-model="categorySearch"
            density="compact"
            variant="outlined"
            :placeholder="t('manageCatalogModal.searchCategories')"
            prepend-inner-icon="mdi-magnify"
            hide-details
            clearable
            rounded="lg"
            class="bg-white"
          />
        </div>

        <div class="d-flex align-center gap-2">
          <v-chip size="small" variant="tonal" color="primary" class="font-weight-bold font-mono">
            {{ filteredCategories.length }} {{ t('manageCatalogModal.categoriesTab', { count: filteredCategories.length }).toLowerCase() }}
          </v-chip>

          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="outlined"
            :loading="loading"
            @click="loadCategories"
            :title="t('common.refresh')"
          />

          <v-btn
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="mdi-plus"
            class="font-weight-bold"
            @click="openCategoryForm()"
          >
            {{ t('manageCatalogModal.addCategory') }}
          </v-btn>
        </div>
      </div>

      <!-- Categories Table -->
      <v-table density="comfortable" hover class="data-table">
        <thead>
          <tr class="bg-slate-50 text-caption font-weight-bold">
            <th style="width: 70px;" class="text-center font-weight-bold">ID</th>
            <th class="text-left font-weight-bold">{{ t('manageCatalogModal.categoryName') }}</th>
            <th class="text-center font-weight-bold" style="width: 220px;">{{ t('manageCatalogModal.allowedPackages') }}</th>
            <th class="text-center font-weight-bold" style="width: 240px;">{{ t('manageCatalogModal.customFields') }}</th>
            <th class="text-center font-weight-bold" style="width: 140px;">{{ t('manageCatalogModal.componentsCount') }}</th>
            <th class="text-right font-weight-bold" style="width: 120px;">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cat in filteredCategories" :key="cat.ID">
            <td class="text-center font-mono text-caption text-slate-500">{{ cat.ID }}</td>
            <td>
              <div class="font-weight-bold text-body-2 text-slate-900 cursor-pointer hover-underline" @click="openCategoryForm(cat)">
                {{ cat.category }}
              </div>
            </td>
            <!-- Allowed Packages -->
            <td class="text-center">
              <v-chip
                v-if="cat.packageCount && cat.packageCount > 0"
                size="x-small"
                variant="tonal"
                color="primary"
                class="font-mono font-weight-bold cursor-pointer"
                @click="openCategoryForm(cat, 'packages')"
              >
                <v-icon start size="14">mdi-package-variant-closed</v-icon>
                {{ t('manageCatalogModal.packagesCount', { count: cat.packageCount }) }}
              </v-chip>
              <span v-else class="text-caption text-slate-500">
                {{ t('manageCatalogModal.allPackagesAllowed') }}
              </span>
            </td>
            <!-- Custom Fields -->
            <td class="text-center">
              <div v-if="cat.customFields && cat.customFields.length > 0" class="d-flex align-center justify-center gap-1 flex-wrap">
                <v-chip
                  size="x-small"
                  variant="tonal"
                  color="teal-darken-2"
                  class="font-mono font-weight-bold cursor-pointer"
                  @click="openCategoryForm(cat, 'fields')"
                  :title="cat.customFields.map(f => f.fieldLabel).join(', ')"
                >
                  <v-icon start size="14">mdi-tune-vertical</v-icon>
                  {{ t('manageCatalogModal.fieldsCount', { count: cat.customFields.length }) }}
                </v-chip>
              </div>
              <span v-else class="text-caption text-disabled">—</span>
            </td>
            <!-- Components Count -->
            <td class="text-center font-mono text-body-2 text-slate-700">
              <v-chip size="x-small" variant="flat" color="slate-100" class="text-slate-800 font-mono">
                {{ cat.componentCount || 0 }} {{ (cat.componentCount === 1 ? t('manageCatalogModal.part') : t('manageCatalogModal.parts')) }}
              </v-chip>
            </td>
            <!-- Actions -->
            <td class="text-right">
              <v-btn
                icon="mdi-pencil-outline"
                size="small"
                variant="text"
                color="slate-600"
                @click="openCategoryForm(cat)"
                :title="t('manageCatalogModal.editCategory')"
              />
              <v-btn
                icon="mdi-delete-outline"
                size="small"
                variant="text"
                color="error"
                @click="confirmDeleteCategory(cat)"
                :title="t('common.delete')"
              />
            </td>
          </tr>
          <tr v-if="filteredCategories.length === 0 && !loading">
            <td colspan="6" class="text-center py-8 text-disabled">
              <v-icon size="40" class="mb-2">mdi-shape-outline</v-icon>
              <div>{{ t('manageCatalogModal.noCategoriesFound') }}</div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- MODAL: ADD / EDIT CATEGORY -->
    <v-dialog v-model="showCategoryDialog" width="96vw" max-width="1140px" persistent scrollable>
      <v-card class="rounded-0 border bg-white overflow-hidden d-flex flex-column" style="max-height: 90vh;">
        <v-card-title class="bg-slate-50 py-3 px-5 border-b font-weight-bold text-subtitle-1 d-flex align-center justify-space-between flex-shrink-0">
          <div class="d-flex align-center gap-2">
            <v-icon color="primary" size="22">mdi-shape-outline</v-icon>
            <span class="text-slate-900">{{ editingCategory ? t('manageCatalogModal.editCategory') : t('manageCatalogModal.newCategory') }}</span>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showCategoryDialog = false" />
        </v-card-title>

        <!-- Category Modal Tabs -->
        <div class="bg-slate-50 px-5 border-b flex-shrink-0">
          <v-tabs v-model="categoryEditTab" color="primary" density="comfortable">
            <v-tab value="general" class="text-none font-weight-bold text-body-2">
              <v-icon start size="18">mdi-information-outline</v-icon>
              {{ t('manageCatalogModal.tabGeneral') }}
            </v-tab>
            <v-tab value="packages" class="text-none font-weight-bold text-body-2">
              <v-icon start size="18">mdi-package-variant-closed</v-icon>
              {{ t('manageCatalogModal.tabPackages', { count: categoryForm.packageIds.length }) }}
            </v-tab>
            <v-tab value="fields" class="text-none font-weight-bold text-body-2">
              <v-icon start size="18">mdi-tune-vertical</v-icon>
              {{ t('manageCatalogModal.tabCustomFields', { count: categoryForm.customFields.length }) }}
            </v-tab>
          </v-tabs>
        </div>

        <v-card-text class="pa-5 flex-grow-1 overflow-y-auto">
          <v-window v-model="categoryEditTab">
            <!-- TAB 1: General Category Info -->
            <v-window-item value="general">
              <div class="bg-slate-50 border rounded-lg pa-4 mb-4 d-flex align-start gap-3 text-body-2 text-slate-700">
                <v-icon size="20" color="primary" class="mt-0-5 flex-shrink-0">mdi-information-outline</v-icon>
                <div class="line-height-relaxed">{{ t('manageCatalogModal.footerNote') }}</div>
              </div>

              <v-text-field
                v-model="categoryForm.category"
                :label="t('manageCatalogModal.categoryNameRequired')"
                :placeholder="t('manageCatalogModal.categoryPlaceholder')"
                variant="outlined"
                density="comfortable"
                class="font-weight-medium mb-3"
                autofocus
                :error-messages="categoryError"
                @keyup.enter="saveCategory"
              />
            </v-window-item>

            <!-- TAB 2: Allowed Footprints / Packages -->
            <v-window-item value="packages">
              <div class="bg-slate-50 border rounded-lg pa-4 mb-4 d-flex flex-wrap align-center justify-space-between gap-3">
                <div class="d-flex align-start gap-3 text-body-2 text-slate-700 flex-grow-1" style="min-width: 320px;">
                  <v-icon size="20" color="primary" class="mt-0-5 flex-shrink-0">mdi-information-outline</v-icon>
                  <div class="line-height-relaxed">{{ t('manageCatalogModal.allowedPackagesHint') }}</div>
                </div>
                <div class="d-flex align-center gap-2 flex-shrink-0">
                  <v-btn size="small" variant="outlined" color="primary" class="font-weight-bold" @click="selectAllSmdPackages">
                    {{ t('manageCatalogModal.selectAllSmd') }}
                  </v-btn>
                  <v-btn size="small" variant="outlined" color="primary" class="font-weight-bold" @click="selectAllThtPackages">
                    {{ t('manageCatalogModal.selectAllTht') }}
                  </v-btn>
                  <v-btn size="small" variant="text" color="slate-600" @click="categoryForm.packageIds = []">
                    {{ t('manageCatalogModal.clearAll') }}
                  </v-btn>
                </div>
              </div>

              <v-autocomplete
                v-model="categoryForm.packageIds"
                :items="packagesList"
                item-title="package"
                item-value="ID"
                multiple
                chips
                closable-chips
                density="comfortable"
                variant="outlined"
                :label="t('manageCatalogModal.allowedPackages')"
                :placeholder="t('manageCatalogModal.allPackagesAllowed')"
                clearable
              >
                <template #chip="{ props, item }">
                  <v-chip v-bind="props" size="small" variant="tonal" color="primary" class="font-mono font-weight-bold">
                    <v-icon start size="14">{{ item.raw.isSmd ? 'mdi-chip' : 'mdi-circle-slice-8' }}</v-icon>
                    {{ item.raw.package }}
                  </v-chip>
                </template>
                <template #item="{ props, item }">
                  <v-list-item v-bind="props" :title="item.raw.package" :subtitle="`${item.raw.isSmd ? 'SMD' : 'THT'} • ${item.raw.pinQuantity || '?'} pins`">
                    <template #prepend>
                      <v-icon size="small" :color="item.raw.isSmd ? 'primary' : 'teal'">
                        {{ item.raw.isSmd ? 'mdi-chip' : 'mdi-circle-slice-8' }}
                      </v-icon>
                    </template>
                  </v-list-item>
                </template>
              </v-autocomplete>
            </v-window-item>

            <!-- TAB 3: Specifications & Custom Fields -->
            <v-window-item value="fields">
              <div class="bg-slate-50 border rounded-lg pa-4 mb-4 d-flex flex-wrap align-center justify-space-between gap-3">
                <div class="d-flex align-start gap-3 text-body-2 text-slate-700 flex-grow-1" style="min-width: 320px;">
                  <v-icon size="20" color="primary" class="mt-0-5 flex-shrink-0">mdi-information-outline</v-icon>
                  <div class="line-height-relaxed">{{ t('manageCatalogModal.customFieldsHint') }}</div>
                </div>
                <div class="d-flex align-center gap-2 flex-shrink-0">
                  <v-btn
                    size="small"
                    color="slate-700"
                    variant="outlined"
                    prepend-icon="mdi-content-copy"
                    class="font-weight-bold"
                    @click="openCopyCategoryFieldsModal"
                  >
                    {{ t('manageCatalogModal.copyFromCategory') }}
                  </v-btn>
                  <v-btn
                    size="small"
                    color="primary"
                    variant="flat"
                    prepend-icon="mdi-plus"
                    class="font-weight-bold"
                    @click="openFieldEditor()"
                  >
                    {{ t('manageCatalogModal.addField') }}
                  </v-btn>
                </div>
              </div>

              <!-- Custom Fields List -->
              <v-table density="compact" class="border rounded bg-white" v-if="categoryForm.customFields.length > 0">
                <thead>
                  <tr class="bg-slate-50 text-caption font-weight-bold">
                    <th class="text-left py-2 font-weight-bold">{{ t('manageCatalogModal.fieldLabel') }}</th>
                    <th class="text-center py-2 font-weight-bold" style="width: 160px;">{{ t('manageCatalogModal.fieldType') }}</th>
                    <th class="text-center py-2 font-weight-bold" style="width: 160px;">{{ t('manageCatalogModal.unit') }}</th>
                    <th class="text-right py-2 font-weight-bold pe-4" style="width: 140px;">{{ t('common.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(f, idx) in categoryForm.customFields" :key="f.id || idx">
                    <td class="font-weight-bold text-body-2 text-slate-900 py-2">
                      {{ f.fieldLabel }}
                    </td>
                    <td class="text-center py-2">
                      <v-chip size="small" variant="tonal" color="primary">
                        {{ f.fieldType }}
                      </v-chip>
                    </td>
                    <td class="text-center font-mono text-body-2 text-slate-800 py-2">
                      {{ f.unit || '—' }}
                    </td>
                    <td class="text-right py-2 pe-3">
                      <div class="d-inline-flex align-center justify-end gap-1">
                        <v-btn
                          icon="mdi-pencil-outline"
                          size="small"
                          variant="text"
                          color="slate-600"
                          @click="openFieldEditor(f, idx)"
                        />
                        <v-btn
                          icon="mdi-delete-outline"
                          size="small"
                          variant="text"
                          color="error"
                          @click="removeField(f, idx)"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <div v-else class="text-center py-6 text-disabled border rounded-lg bg-slate-50">
                <v-icon size="36" class="mb-1">mdi-tune-vertical</v-icon>
                <div class="text-caption mb-2">{{ t('manageCatalogModal.noFieldsDefined') }}</div>
              </div>
            </v-window-item>
          </v-window>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex justify-end gap-2 flex-shrink-0">
          <v-btn variant="text" size="small" @click="showCategoryDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold px-4"
            :loading="saving"
            @click="saveCategory"
          >
            {{ t('manageCatalogModal.saveCategory') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- SUB-MODAL: ADD / EDIT CUSTOM FIELD -->
    <v-dialog v-model="showFieldDialog" max-width="520px" persistent>
      <v-card class="rounded-0 border bg-white">
        <v-card-title class="bg-slate-50 py-3 px-4 border-b font-weight-bold text-subtitle-1">
          {{ editingFieldIdx !== -1 ? t('manageCatalogModal.editField') : t('manageCatalogModal.newField') }}
        </v-card-title>
        <v-card-text class="pa-4">
          <!-- Quick Preset / Re-use Selector -->
          <div class="mb-3" v-if="editingFieldIdx === -1">
            <v-autocomplete
              v-model="selectedPresetOrExisting"
              :items="allFieldTemplatesAndExisting"
              item-title="fieldLabel"
              return-object
              :placeholder="t('manageCatalogModal.reuseExistingOrPreset')"
              density="compact"
              variant="outlined"
              clearable
              prepend-inner-icon="mdi-auto-fix"
              hide-details
              @update:model-value="onPresetOrExistingSelected"
            >
              <template #item="{ props, item }">
                <v-list-item
                  v-bind="props"
                  :title="item.raw.fieldLabel"
                  :subtitle="item.raw.group ? `${item.raw.group} • ${item.raw.fieldType}${item.raw.unit ? ' (' + item.raw.unit + ')' : ''}` : `${item.raw.fieldType}${item.raw.unit ? ' (' + item.raw.unit + ')' : ''}`"
                >
                  <template #prepend>
                    <v-icon size="small" :color="item.raw.isExistingInCatalog ? 'primary' : 'slate-500'">
                      {{ item.raw.isExistingInCatalog ? 'mdi-shape-outline' : 'mdi-lightning-bolt-outline' }}
                    </v-icon>
                  </template>
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>

          <v-text-field
            v-model="fieldForm.fieldLabel"
            :label="t('manageCatalogModal.fieldLabel')"
            :placeholder="t('manageCatalogModal.fieldLabelHint')"
            variant="outlined"
            density="compact"
            class="mb-3"
            autofocus
            @update:model-value="autoGenerateFieldName"
          />

          <v-text-field
            v-model="fieldForm.fieldName"
            :label="t('manageCatalogModal.fieldName')"
            :placeholder="t('manageCatalogModal.fieldNameHint')"
            variant="outlined"
            density="compact"
            class="font-mono mb-3"
          />

          <v-row dense class="mb-3">
            <v-col cols="12" sm="6">
              <v-select
                v-model="fieldForm.fieldType"
                :items="fieldTypeOptions"
                item-title="title"
                item-value="value"
                :label="t('manageCatalogModal.fieldType')"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="fieldForm.unit"
                :label="t('manageCatalogModal.unit')"
                :placeholder="t('manageCatalogModal.unitPlaceholder')"
                variant="outlined"
                density="compact"
                hide-details
                class="font-mono"
              />
            </v-col>
          </v-row>

          <v-text-field
            v-if="fieldForm.fieldType === 'select'"
            v-model="fieldForm.options"
            :label="t('manageCatalogModal.options')"
            :placeholder="t('manageCatalogModal.optionsPlaceholder')"
            variant="outlined"
            density="compact"
            hint="Separate choices with commas"
            persistent-hint
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="text" size="small" @click="showFieldDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold"
            @click="saveFieldEditor"
          >
            {{ t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- SUB-MODAL: COPY FIELDS FROM CATEGORY -->
    <v-dialog v-model="showCopyFieldsDialog" max-width="580px" persistent>
      <v-card class="rounded-0 border bg-white">
        <v-card-title class="bg-slate-50 py-3 px-4 border-b font-weight-bold text-subtitle-1 d-flex align-center gap-2">
          <v-icon color="primary" size="20">mdi-content-copy</v-icon>
          <span>{{ t('manageCatalogModal.copyFieldsTitle') }}</span>
        </v-card-title>
        <v-card-text class="pa-4">
          <div class="text-caption text-slate-600 mb-3">
            {{ t('manageCatalogModal.copyFieldsSubtitle') }}
          </div>

          <!-- Source Category Select -->
          <v-select
            v-model="copySourceCategoryId"
            :items="categoriesWithFieldsOptions"
            item-title="title"
            item-value="value"
            :label="t('manageCatalogModal.sourceCategory')"
            :placeholder="t('manageCatalogModal.sourceCategoryPlaceholder')"
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details
            :no-data-text="t('manageCatalogModal.noOtherCategoriesWithFields')"
          />

          <!-- Fields in Selected Source Category -->
          <div v-if="sourceCategoryFields.length > 0" class="border rounded bg-white mt-3 overflow-hidden">
            <div class="bg-slate-50 px-3 py-2 border-b d-flex align-center justify-space-between">
              <span class="text-caption font-weight-bold text-slate-700">
                {{ t('manageCatalogModal.tabCustomFields', { count: sourceCategoryFields.length }) }}
              </span>
              <div class="d-flex align-center gap-1">
                <v-btn size="x-small" variant="text" color="primary" @click="selectAllCopyFields">
                  {{ t('manageCatalogModal.selectAll') }}
                </v-btn>
                <span class="text-disabled">|</span>
                <v-btn size="x-small" variant="text" color="slate-600" @click="deselectAllCopyFields">
                  {{ t('manageCatalogModal.deselectAll') }}
                </v-btn>
              </div>
            </div>

            <v-list density="compact" class="pa-0">
              <v-list-item
                v-for="field in sourceCategoryFields"
                :key="field.id || field.fieldName"
                class="border-b px-3 py-1"
                @click="toggleCopyFieldSelection(field)"
              >
                <template #prepend>
                  <v-checkbox-btn
                    :model-value="isCopyFieldSelected(field)"
                    color="primary"
                    density="compact"
                    class="me-2"
                  />
                </template>
                <v-list-item-title class="font-weight-bold text-body-2">
                  {{ field.fieldLabel }}
                  <span class="font-mono text-caption text-slate-500 ms-1">({{ field.fieldName }})</span>
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption text-slate-600 d-flex align-center gap-2 mt-0-5">
                  <v-chip size="x-small" variant="tonal" color="primary">{{ field.fieldType }}</v-chip>
                  <span v-if="field.unit" class="font-mono">{{ t('manageCatalogModal.unit') }}: {{ field.unit }}</span>
                  <span v-if="isFieldAlreadyInCurrentCategory(field.fieldName)" class="text-warning text-caption font-weight-bold">
                    (already exists)
                  </span>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>

          <div v-else-if="copySourceCategoryId" class="text-center py-6 text-disabled border rounded bg-slate-50 mt-3">
            {{ t('manageCatalogModal.noFieldsInSourceCategory') }}
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="text" size="small" @click="showCopyFieldsDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold px-4"
            :disabled="selectedCopyFields.length === 0"
            @click="executeCopyFields"
          >
            {{ t('manageCatalogModal.importFields', { count: selectedCopyFields.length }) }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Notification Snackbar inside View -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';

const { t } = useI18n();

const loading = ref(false);
const saving = ref(false);
const categoriesList = ref([]);
const packagesList = ref([]);
const categorySearch = ref('');

const showCategoryDialog = ref(false);
const editingCategory = ref(null);
const categoryEditTab = ref('general');
const categoryForm = ref({
  category: '',
  packageIds: [],
  customFields: []
});
const deletedFieldIds = ref([]);
const categoryError = ref('');

// Standard Electronics Technical Presets for quick selection
const STANDARD_FIELD_PRESETS = [
  { group: 'Transistors & Diodes', fieldLabel: 'Current Gain (hFE)', fieldName: 'hfe', fieldType: 'number', unit: '', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Collector-Emitter Voltage (VCEO)', fieldName: 'v_ceo', fieldType: 'number', unit: 'V', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Collector Current (IC)', fieldName: 'i_c', fieldType: 'number', unit: 'mA', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Drain-Source Voltage (VDS)', fieldName: 'v_ds', fieldType: 'number', unit: 'V', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Drain-Source On-Resistance (RDS(on))', fieldName: 'r_ds_on', fieldType: 'number', unit: 'mΩ', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Gate Threshold Voltage (VGS(th))', fieldName: 'v_gs_th', fieldType: 'number', unit: 'V', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Drain Current (ID)', fieldName: 'i_d', fieldType: 'number', unit: 'A', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Forward Voltage (VF)', fieldName: 'v_f', fieldType: 'number', unit: 'V', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Forward Current (IF)', fieldName: 'i_f', fieldType: 'number', unit: 'mA', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Power Dissipation (Ptot)', fieldName: 'p_tot', fieldType: 'number', unit: 'mW', options: '' },
  { group: 'Passive Components', fieldLabel: 'Capacitance', fieldName: 'capacitance', fieldType: 'number', unit: 'µF', options: '' },
  { group: 'Passive Components', fieldLabel: 'Rated Voltage', fieldName: 'rated_voltage', fieldType: 'number', unit: 'V', options: '' },
  { group: 'Passive Components', fieldLabel: 'Dielectric / Material', fieldName: 'dielectric', fieldType: 'select', unit: '', options: 'X7R, X5R, C0G/NP0, Y5V, Aluminum Electrolytic, Tantalum, Film' },
  { group: 'Passive Components', fieldLabel: 'Resistance', fieldName: 'resistance', fieldType: 'number', unit: 'Ω', options: '' },
  { group: 'Passive Components', fieldLabel: 'Tolerance', fieldName: 'tolerance', fieldType: 'select', unit: '%', options: '±0.1%, ±0.5%, ±1%, ±2%, ±5%, ±10%, ±20%' },
  { group: 'Passive Components', fieldLabel: 'Power Rating (Pmax)', fieldName: 'power_rating', fieldType: 'number', unit: 'W', options: '' },
  { group: 'Passive Components', fieldLabel: 'Inductance', fieldName: 'inductance', fieldType: 'number', unit: 'µH', options: '' },
  { group: 'ICs & Microcontrollers', fieldLabel: 'Operating Voltage (VCC/VDD)', fieldName: 'supply_voltage', fieldType: 'text', unit: 'V', options: '' },
  { group: 'ICs & Microcontrollers', fieldLabel: 'Clock Frequency (fmax)', fieldName: 'clock_freq', fieldType: 'number', unit: 'MHz', options: '' },
  { group: 'ICs & Microcontrollers', fieldLabel: 'Flash Memory Size', fieldName: 'flash_size', fieldType: 'number', unit: 'KB', options: '' },
  { group: 'ICs & Microcontrollers', fieldLabel: 'RAM Size', fieldName: 'ram_size', fieldType: 'number', unit: 'KB', options: '' }
];

// Custom field subdialog
const showFieldDialog = ref(false);
const editingFieldIdx = ref(-1);
const selectedPresetOrExisting = ref(null);
const fieldForm = ref({
  fieldName: '',
  fieldLabel: '',
  fieldType: 'number',
  unit: '',
  options: '',
  sortOrder: 0
});

// Copy fields subdialog
const showCopyFieldsDialog = ref(false);
const copySourceCategoryId = ref(null);
const selectedCopyFields = ref([]);

const fieldTypeOptions = computed(() => [
  { title: t('manageCatalogModal.typeNumber'), value: 'number' },
  { title: t('manageCatalogModal.typeText'), value: 'text' },
  { title: t('manageCatalogModal.typeSelect'), value: 'select' }
]);

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

// All existing distinct custom fields across all categories
const allExistingCategoryFields = computed(() => {
  const map = new Map();
  for (const cat of categoriesList.value) {
    if (Array.isArray(cat.customFields)) {
      for (const f of cat.customFields) {
        const key = (f.fieldName || f.fieldLabel || '').toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, {
            fieldLabel: f.fieldLabel,
            fieldName: f.fieldName,
            fieldType: f.fieldType || 'number',
            unit: f.unit || '',
            options: f.options ? (Array.isArray(f.options) ? f.options.join(', ') : f.options) : '',
            group: `${t('manageCatalogModal.presetCatalogGroup')} (${cat.category})`,
            isExistingInCatalog: true
          });
        }
      }
    }
  }
  return Array.from(map.values());
});

// Merged preset and existing fields for the autocomplete
const allFieldTemplatesAndExisting = computed(() => {
  const existing = allExistingCategoryFields.value;
  const standard = STANDARD_FIELD_PRESETS.map(p => ({
    ...p,
    group: `${t('manageCatalogModal.presetStandardGroup')} - ${p.group}`,
    isExistingInCatalog: false
  }));
  return [...existing, ...standard];
});

// Options for source categories that have fields
const categoriesWithFieldsOptions = computed(() => {
  const currentCatId = editingCategory.value?.ID;
  return categoriesList.value
    .filter(c => c.ID !== currentCatId && Array.isArray(c.customFields) && c.customFields.length > 0)
    .map(c => ({
      title: `${c.category} (${c.customFields.length} parameters)`,
      value: c.ID
    }));
});

// Fields in selected source category
const sourceCategoryFields = computed(() => {
  if (!copySourceCategoryId.value) return [];
  const cat = categoriesList.value.find(c => c.ID === copySourceCategoryId.value);
  return cat && Array.isArray(cat.customFields) ? cat.customFields : [];
});

const loadCategories = async () => {
  loading.value = true;
  try {
    const [cats, pkgs] = await Promise.all([
      api.getCategories(),
      api.getPackages()
    ]);
    categoriesList.value = cats || [];
    packagesList.value = pkgs || [];
  } catch (err) {
    console.error('Failed to load categories:', err);
    notify(t('manageCatalogModal.loadError') + ': ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadCategories();
});

const filteredCategories = computed(() => {
  if (!categorySearch.value.trim()) return categoriesList.value;
  const q = categorySearch.value.toLowerCase().trim();
  return categoriesList.value.filter(c => c.category.toLowerCase().includes(q));
});

// Category Package Selection Helpers
const selectAllSmdPackages = () => {
  const smdIds = packagesList.value.filter(p => p.isSmd === 1).map(p => p.ID);
  const combined = new Set([...categoryForm.value.packageIds, ...smdIds]);
  categoryForm.value.packageIds = Array.from(combined);
};

const selectAllThtPackages = () => {
  const thtIds = packagesList.value.filter(p => p.isSmd === 0).map(p => p.ID);
  const combined = new Set([...categoryForm.value.packageIds, ...thtIds]);
  categoryForm.value.packageIds = Array.from(combined);
};

// Category Actions
const openCategoryForm = async (cat = null, initialTab = 'general') => {
  editingCategory.value = cat;
  categoryEditTab.value = initialTab;
  deletedFieldIds.value = [];
  categoryForm.value = {
    category: cat ? cat.category : '',
    packageIds: cat && cat.packageIds ? [...cat.packageIds] : [],
    customFields: cat && cat.customFields ? JSON.parse(JSON.stringify(cat.customFields)) : []
  };
  categoryError.value = '';
  showCategoryDialog.value = true;

  if (cat && cat.ID) {
    try {
      const [pkgsRes, fieldsRes] = await Promise.all([
        api.getCategoryPackages(cat.ID),
        api.getCategoryFields(cat.ID)
      ]);
      categoryForm.value.packageIds = pkgsRes.packageIds || [];
      categoryForm.value.customFields = fieldsRes || [];
    } catch (err) {
      console.warn('Failed to load fresh category details:', err.message);
    }
  }
};

// Custom Field Editor
const autoGenerateFieldName = (val) => {
  if (editingFieldIdx.value === -1 && val) {
    fieldForm.value.fieldName = val.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
  }
};

const onPresetOrExistingSelected = (item) => {
  if (!item) return;
  fieldForm.value.fieldLabel = item.fieldLabel || '';
  fieldForm.value.fieldName = item.fieldName || '';
  fieldForm.value.fieldType = item.fieldType || 'number';
  fieldForm.value.unit = item.unit || '';
  fieldForm.value.options = item.options ? (Array.isArray(item.options) ? item.options.join(', ') : item.options) : '';
  notify(t('manageCatalogModal.presetApplied', { name: item.fieldLabel }));
};

const openFieldEditor = (field = null, idx = -1) => {
  editingFieldIdx.value = idx;
  selectedPresetOrExisting.value = null;
  if (field) {
    fieldForm.value = {
      id: field.id,
      fieldName: field.fieldName || '',
      fieldLabel: field.fieldLabel || '',
      fieldType: field.fieldType || 'number',
      unit: field.unit || '',
      options: field.options || '',
      sortOrder: field.sortOrder || 0
    };
  } else {
    fieldForm.value = {
      fieldName: '',
      fieldLabel: '',
      fieldType: 'number',
      unit: '',
      options: '',
      sortOrder: categoryForm.value.customFields.length
    };
  }
  showFieldDialog.value = true;
};

// Copy Fields from another category logic
const openCopyCategoryFieldsModal = () => {
  const options = categoriesWithFieldsOptions.value;
  if (options.length > 0) {
    copySourceCategoryId.value = options[0].value;
    selectAllCopyFields();
  } else {
    copySourceCategoryId.value = null;
    selectedCopyFields.value = [];
  }
  showCopyFieldsDialog.value = true;
};

watch(copySourceCategoryId, () => {
  selectAllCopyFields();
});

const isCopyFieldSelected = (field) => {
  const key = field.fieldName || field.fieldLabel;
  return selectedCopyFields.value.some(f => (f.fieldName || f.fieldLabel) === key);
};

const toggleCopyFieldSelection = (field) => {
  const key = field.fieldName || field.fieldLabel;
  const idx = selectedCopyFields.value.findIndex(f => (f.fieldName || f.fieldLabel) === key);
  if (idx >= 0) {
    selectedCopyFields.value.splice(idx, 1);
  } else {
    selectedCopyFields.value.push(field);
  }
};

const selectAllCopyFields = () => {
  selectedCopyFields.value = [...sourceCategoryFields.value];
};

const deselectAllCopyFields = () => {
  selectedCopyFields.value = [];
};

const isFieldAlreadyInCurrentCategory = (fieldName) => {
  if (!fieldName) return false;
  return categoryForm.value.customFields.some(
    f => (f.fieldName || '').toLowerCase() === fieldName.toLowerCase()
  );
};

const executeCopyFields = () => {
  let importedCount = 0;
  let skippedCount = 0;

  for (const field of selectedCopyFields.value) {
    let targetName = field.fieldName || field.fieldLabel.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    const exists = categoryForm.value.customFields.some(
      f => (f.fieldName || '').toLowerCase() === targetName.toLowerCase()
    );

    if (exists) {
      skippedCount++;
      continue;
    }

    categoryForm.value.customFields.push({
      fieldName: targetName,
      fieldLabel: field.fieldLabel,
      fieldType: field.fieldType || 'number',
      unit: field.unit || '',
      options: field.options ? (Array.isArray(field.options) ? field.options.join(', ') : field.options) : (field.rawOptions || ''),
      sortOrder: categoryForm.value.customFields.length
    });
    importedCount++;
  }

  showCopyFieldsDialog.value = false;

  const sourceCat = categoriesList.value.find(c => c.ID === copySourceCategoryId.value);
  const sourceName = sourceCat ? sourceCat.category : '';

  if (importedCount > 0) {
    notify(t('manageCatalogModal.fieldsImportedSuccess', { count: importedCount, category: sourceName }));
  }
  if (skippedCount > 0) {
    notify(t('manageCatalogModal.duplicateFieldSkipped', { count: skippedCount }), 'warning');
  }
};

const saveFieldEditor = () => {
  const label = (fieldForm.value.fieldLabel || '').trim();
  let name = (fieldForm.value.fieldName || '').trim();
  if (!label) {
    alert('Display Label is required');
    return;
  }
  if (!name) {
    name = label.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
  }

  const payload = {
    ...fieldForm.value,
    fieldLabel: label,
    fieldName: name,
    unit: (fieldForm.value.unit || '').trim() || null,
    options: (fieldForm.value.options || '').trim() || null
  };

  if (editingFieldIdx.value >= 0) {
    categoryForm.value.customFields[editingFieldIdx.value] = payload;
  } else {
    categoryForm.value.customFields.push(payload);
  }

  showFieldDialog.value = false;
};

const removeField = (field, idx) => {
  if (field.id) {
    deletedFieldIds.value.push(field.id);
  }
  categoryForm.value.customFields.splice(idx, 1);
};

const saveCategory = async () => {
  const name = categoryForm.value.category.trim();
  if (!name) {
    categoryError.value = t('manageCatalogModal.categoryRequiredErr');
    return;
  }
  saving.value = true;
  categoryError.value = '';
  try {
    let catId = null;
    if (editingCategory.value) {
      catId = editingCategory.value.ID;
      await api.updateCategory(catId, { category: name });
    } else {
      const res = await api.createCategory({ category: name });
      catId = res.ID || res.id || res.insertId;
    }

    // Save allowed package associations
    await api.updateCategoryPackages(catId, categoryForm.value.packageIds || []);

    // Process deleted custom fields
    for (const delId of deletedFieldIds.value) {
      try {
        await api.deleteCategoryField(catId, delId);
      } catch (err) {
        console.warn('Failed to delete category field:', err.message);
      }
    }

    // Process created / updated custom fields
    for (let i = 0; i < categoryForm.value.customFields.length; i++) {
      const f = categoryForm.value.customFields[i];
      const payload = {
        fieldName: f.fieldName,
        fieldLabel: f.fieldLabel,
        fieldType: f.fieldType,
        unit: f.unit || null,
        options: f.options || null,
        sortOrder: i
      };
      try {
        if (f.id) {
          await api.updateCategoryField(catId, f.id, payload);
        } else {
          await api.addCategoryField(catId, payload);
        }
      } catch (err) {
        console.warn('Failed to save category field:', err.message);
      }
    }

    notify(editingCategory.value ? t('manageCatalogModal.categoryUpdated', { name }) : t('manageCatalogModal.categoryCreated', { name }));
    showCategoryDialog.value = false;
    await loadCategories();
  } catch (err) {
    console.error('Failed to save category:', err);
    categoryError.value = err.response?.data?.error || err.message;
  } finally {
    saving.value = false;
  }
};

const confirmDeleteCategory = async (cat) => {
  if (cat.componentCount > 0) {
    alert(t('manageCatalogModal.categoryDeleteInUse', { name: cat.category, count: cat.componentCount }));
    return;
  }
  if (!confirm(t('manageCatalogModal.categoryDeleteConfirm', { name: cat.category }))) {
    return;
  }
  try {
    await api.deleteCategory(cat.ID);
    notify(t('manageCatalogModal.categoryDeleted', { name: cat.category }));
    await loadCategories();
  } catch (err) {
    console.error('Failed to delete category:', err);
    notify(t('manageCatalogModal.categoryDeleteError') + ': ' + (err.response?.data?.error || err.message), 'error');
  }
};
</script>

<style scoped>
.hover-underline:hover {
  text-decoration: underline;
}
</style>
