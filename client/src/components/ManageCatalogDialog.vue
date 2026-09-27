<template>
  <v-dialog
    :model-value="modelValue"
    width="92vw"
    max-width="1100px"
    scrollable
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-0 border bg-white overflow-hidden d-flex flex-column" style="max-height: 88vh;">
      <!-- Dialog Header -->
      <v-card-title class="bg-slate-50 py-3 px-5 border-b d-flex align-center justify-space-between flex-shrink-0">
        <div class="d-flex align-center gap-2">
          <v-icon color="primary" size="22">mdi-shape-plus</v-icon>
          <span class="text-subtitle-1 font-weight-bold text-slate-900">
            {{ t('manageCatalogModal.title') }}
          </span>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>

      <!-- Tabs Navigation -->
      <div class="bg-slate-50 px-5 border-b flex-shrink-0">
        <v-tabs v-model="activeTab" color="primary" density="comfortable">
          <v-tab value="categories" class="font-weight-bold text-body-2 text-none">
            <v-icon start size="18">mdi-shape-outline</v-icon>
            {{ t('manageCatalogModal.categoriesTab', { count: categoriesList.length }) }}
          </v-tab>
          <v-tab value="packages" class="font-weight-bold text-body-2 text-none">
            <v-icon start size="18">mdi-package-variant-closed</v-icon>
            {{ t('manageCatalogModal.packagesTab', { count: packagesList.length }) }}
          </v-tab>
        </v-tabs>
      </div>

      <!-- Tab Content Area -->
      <v-card-text class="pa-0 flex-grow-1 overflow-y-auto">
        <v-window v-model="activeTab" class="h-100">
          <!-- ========================================== -->
          <!-- TAB 1: CATEGORIES                          -->
          <!-- ========================================== -->
          <v-window-item value="categories" class="pa-5">
            <!-- Toolbar: Search & Add Category -->
            <div class="d-flex flex-wrap align-center justify-space-between gap-3 mb-4">
              <v-text-field
                v-model="categorySearch"
                density="compact"
                variant="outlined"
                :placeholder="t('manageCatalogModal.searchCategories')"
                prepend-inner-icon="mdi-magnify"
                hide-details
                clearable
                rounded="lg"
                style="max-width: 360px; width: 100%;"
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

            <!-- Categories Table -->
            <v-table density="comfortable" hover class="border rounded bg-white data-table">
              <thead>
                <tr class="bg-slate-50 text-caption font-weight-bold">
                  <th style="width: 70px;" class="text-center font-weight-bold">ID</th>
                  <th class="text-left font-weight-bold">{{ t('manageCatalogModal.categoryName') }}</th>
                  <th class="text-center font-weight-bold" style="width: 170px;">{{ t('manageCatalogModal.allowedPackages') }}</th>
                  <th class="text-center font-weight-bold" style="width: 160px;">{{ t('manageCatalogModal.customFields') }}</th>
                  <th class="text-center font-weight-bold" style="width: 140px;">{{ t('manageCatalogModal.componentsCount') }}</th>
                  <th class="text-right font-weight-bold" style="width: 120px;">{{ t('common.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cat in filteredCategories" :key="cat.ID">
                  <td class="text-center font-mono text-caption text-disabled">
                    #{{ cat.ID }}
                  </td>
                  <td>
                    <div class="font-weight-bold text-body-2 text-slate-900">
                      {{ cat.category }}
                    </div>
                  </td>
                  <td class="text-center">
                    <v-chip
                      size="x-small"
                      :color="cat.packageCount > 0 ? 'info' : 'slate-600'"
                      variant="tonal"
                      class="font-mono font-weight-medium"
                    >
                      {{ cat.packageCount > 0 ? t('manageCatalogModal.packagesCount', { count: cat.packageCount }) : t('manageCatalogModal.allPackagesAllowed') }}
                    </v-chip>
                  </td>
                  <td class="text-center">
                    <v-chip
                      size="x-small"
                      :color="cat.fieldsCount > 0 ? 'secondary' : 'default'"
                      :variant="cat.fieldsCount > 0 ? 'flat' : 'outlined'"
                      class="font-mono font-weight-medium"
                    >
                      {{ cat.fieldsCount > 0 ? t('manageCatalogModal.fieldsCount', { count: cat.fieldsCount }) : '—' }}
                    </v-chip>
                  </td>
                  <td class="text-center">
                    <v-chip
                      size="x-small"
                      :color="cat.componentCount > 0 ? 'primary' : 'default'"
                      :variant="cat.componentCount > 0 ? 'tonal' : 'outlined'"
                      class="font-mono font-weight-medium"
                    >
                      {{ cat.componentCount }} {{ cat.componentCount === 1 ? t('manageCatalogModal.part') : t('manageCatalogModal.parts') }}
                    </v-chip>
                  </td>
                  <td class="text-right">
                    <v-btn
                      icon="mdi-pencil-outline"
                      size="small"
                      variant="text"
                      color="slate-600"
                      :title="t('dialogs.editCategoryTooltip')"
                      @click="openCategoryForm(cat)"
                    />
                    <v-btn
                      icon="mdi-delete-outline"
                      size="small"
                      variant="text"
                      color="error"
                      :title="t('dialogs.deleteCategoryTooltip')"
                      @click="confirmDeleteCategory(cat)"
                    />
                  </td>
                </tr>

                <tr v-if="filteredCategories.length === 0 && !loading">
                  <td colspan="6" class="text-center py-8 text-disabled">
                    <v-icon size="40" class="mb-2">mdi-shape-outline</v-icon>
                    <div>{{ t('manageCatalogModal.noCategoriesFound') }}</div>
                  </td>
                </tr>

                <tr v-if="loading">
                  <td colspan="6" class="text-center py-8">
                    <v-progress-circular indeterminate color="primary" />
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>

          <!-- ========================================== -->
          <!-- TAB 2: PACKAGES & FOOTPRINTS               -->
          <!-- ========================================== -->
          <v-window-item value="packages" class="pa-5">
            <!-- Toolbar: Search, Mount Toggle & Add Package -->
            <div class="d-flex flex-wrap align-center justify-space-between gap-3 mb-4">
              <div class="d-flex align-center gap-3 flex-grow-1" style="max-width: 600px;">
                <v-text-field
                  v-model="packageSearch"
                  density="compact"
                  variant="outlined"
                  :placeholder="t('manageCatalogModal.searchPackages')"
                  prepend-inner-icon="mdi-magnify"
                  hide-details
                  clearable
                  rounded="lg"
                  class="flex-grow-1"
                />

                <v-btn-toggle
                  v-model="packageMountFilter"
                  mandatory
                  density="compact"
                  variant="outlined"
                  rounded="lg"
                  color="primary"
                  class="flex-shrink-0"
                  style="height: 40px;"
                >
                  <v-btn value="all" size="small" class="px-2 text-caption">{{ t('manageCatalogModal.all') }}</v-btn>
                  <v-btn value="smd" size="small" class="px-2 text-caption">SMD</v-btn>
                  <v-btn value="tht" size="small" class="px-2 text-caption">{{ t('dialogs.throughHole') }}</v-btn>
                </v-btn-toggle>
              </div>

              <v-btn
                color="primary"
                variant="flat"
                size="small"
                prepend-icon="mdi-plus"
                class="font-weight-bold"
                @click="openPackageForm()"
              >
                {{ t('manageCatalogModal.addPackage') }}
              </v-btn>
            </div>

            <!-- Packages Table -->
            <v-table density="comfortable" hover class="border rounded bg-white data-table">
              <thead>
                <tr class="bg-slate-50 text-caption font-weight-bold">
                  <th style="width: 50px;">{{ t('manageCatalogModal.drawing') }}</th>
                  <th class="text-left font-weight-bold">{{ t('manageCatalogModal.packageFootprintName') }}</th>
                  <th class="text-center font-weight-bold" style="width: 110px;">{{ t('manageCatalogModal.mountType') }}</th>
                  <th class="text-center font-weight-bold" style="width: 90px;">{{ t('manageCatalogModal.pins') }}</th>
                  <th class="text-center font-weight-bold" style="width: 140px;">{{ t('manageCatalogModal.componentsCount') }}</th>
                  <th class="text-right font-weight-bold" style="width: 120px;">{{ t('common.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pkg in filteredPackages" :key="pkg.ID">
                  <!-- Drawing thumbnail -->
                  <td class="py-2">
                    <v-avatar rounded size="36" class="border bg-slate-50">
                      <MediaImage
                        type="package"
                        :src="pkg.drawingURL"
                        height="36px"
                        width="36px"
                      />
                    </v-avatar>
                  </td>

                  <!-- Package Name -->
                  <td>
                    <div class="font-mono font-weight-bold text-body-2 text-slate-900">
                      {{ pkg.package }}
                    </div>
                  </td>

                  <!-- Mount Type -->
                  <td class="text-center">
                    <v-chip
                      size="x-small"
                      :color="pkg.isSmd ? 'secondary' : 'default'"
                      variant="flat"
                      class="font-weight-bold"
                    >
                      {{ pkg.isSmd ? 'SMD' : t('dialogs.throughHole') }}
                    </v-chip>
                  </td>

                  <!-- Pins -->
                  <td class="text-center font-mono text-body-2 text-slate-800">
                    {{ pkg.pinQuantity != null ? pkg.pinQuantity : '—' }}
                  </td>

                  <!-- Components Count -->
                  <td class="text-center">
                    <v-chip
                      size="x-small"
                      :color="pkg.componentCount > 0 ? 'primary' : 'default'"
                      :variant="pkg.componentCount > 0 ? 'tonal' : 'outlined'"
                      class="font-mono font-weight-medium"
                    >
                      {{ pkg.componentCount }} {{ pkg.componentCount === 1 ? t('manageCatalogModal.part') : t('manageCatalogModal.parts') }}
                    </v-chip>
                  </td>

                  <!-- Actions -->
                  <td class="text-right">
                    <v-btn
                      icon="mdi-pencil-outline"
                      size="small"
                      variant="text"
                      color="slate-600"
                      :title="t('dialogs.editPackageTooltip')"
                      @click="openPackageForm(pkg)"
                    />
                    <v-btn
                      icon="mdi-delete-outline"
                      size="small"
                      variant="text"
                      color="error"
                      :title="t('dialogs.deletePackageTooltip')"
                      @click="confirmDeletePackage(pkg)"
                    />
                  </td>
                </tr>

                <tr v-if="filteredPackages.length === 0 && !loading">
                  <td colspan="6" class="text-center py-8 text-disabled">
                    <v-icon size="40" class="mb-2">mdi-package-variant-closed</v-icon>
                    <div>{{ t('manageCatalogModal.noPackagesFound') }}</div>
                  </td>
                </tr>

                <tr v-if="loading">
                  <td colspan="6" class="text-center py-8">
                    <v-progress-circular indeterminate color="primary" />
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-divider />

      <!-- Dialog Footer -->
      <v-card-actions class="pa-3 px-5 bg-slate-50 d-flex align-center justify-space-between flex-shrink-0">
        <div class="text-caption text-disabled">
          {{ t('manageCatalogModal.footerNote') }}
        </div>
        <v-btn variant="flat" color="slate-200" @click="close">
          {{ t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- ========================================== -->
    <!-- MODAL: ADD / EDIT CATEGORY                 -->
    <!-- ========================================== -->
    <v-dialog v-model="showCategoryDialog" width="96vw" max-width="1140px" persistent scrollable>
      <v-card class="rounded-0 border bg-white d-flex flex-column" style="max-height: 88vh;">
        <v-card-title class="bg-slate-50 py-3 px-5 border-b font-weight-bold text-subtitle-1 d-flex align-center justify-space-between flex-shrink-0">
          <div class="d-flex align-center gap-2">
            <v-icon color="primary" size="22">mdi-shape-outline</v-icon>
            <span class="text-slate-900">{{ editingCategory ? t('manageCatalogModal.editCategory') : t('manageCatalogModal.newCategory') }}</span>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showCategoryDialog = false" />
        </v-card-title>

        <!-- Category Edit Tabs -->
        <div class="bg-slate-50 px-5 border-b flex-shrink-0">
          <v-tabs v-model="categoryEditTab" color="primary" density="comfortable">
            <v-tab value="general" class="font-weight-bold text-body-2 text-none">
              <v-icon start size="18">mdi-information-outline</v-icon>
              {{ t('manageCatalogModal.tabGeneral') }}
            </v-tab>
            <v-tab value="packages" class="font-weight-bold text-body-2 text-none">
              <v-icon start size="18">mdi-package-variant-closed</v-icon>
              {{ t('manageCatalogModal.tabPackages', { count: categoryForm.packageIds.length }) }}
            </v-tab>
            <v-tab value="fields" class="font-weight-bold text-body-2 text-none">
              <v-icon start size="18">mdi-tune-vertical</v-icon>
              {{ t('manageCatalogModal.tabCustomFields', { count: categoryForm.customFields.length }) }}
            </v-tab>
          </v-tabs>
        </div>

        <v-card-text class="pa-4 overflow-y-auto">
          <v-window v-model="categoryEditTab">
            <!-- TAB 1: General Category Info -->
            <v-window-item value="general">
              <div class="mb-4">
                <v-text-field
                  v-model="categoryForm.category"
                  :label="t('manageCatalogModal.categoryNameRequired')"
                  :placeholder="t('manageCatalogModal.categoryPlaceholder')"
                  variant="outlined"
                  density="comfortable"
                  autofocus
                  :error-messages="categoryError"
                  @keydown.enter="saveCategory"
                />
              </div>

              <div class="border rounded-lg pa-3 bg-slate-50 text-caption text-slate-600">
                <div class="font-weight-bold text-slate-800 mb-1 d-flex align-center gap-1">
                  <v-icon size="16" color="primary">mdi-lightbulb-on-outline</v-icon>
                  <span>Overview</span>
                </div>
                <div>{{ t('manageCatalogModal.allowedPackagesHint') }}</div>
                <div class="mt-1">{{ t('manageCatalogModal.customFieldsHint') }}</div>
              </div>
            </v-window-item>

            <!-- TAB 2: Allowed Packages -->
            <v-window-item value="packages">
              <div class="bg-slate-50 border rounded-lg pa-3 mb-4 d-flex flex-wrap align-center justify-space-between gap-3">
                <div class="d-flex align-center gap-2 text-body-2 text-slate-700 flex-grow-1" style="min-width: 260px;">
                  <v-icon size="18" color="primary">mdi-information-outline</v-icon>
                  <span>{{ t('manageCatalogModal.allowedPackagesHint') }}</span>
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
                :label="t('manageCatalogModal.allowedPackages')"
                multiple
                chips
                closable-chips
                density="comfortable"
                variant="outlined"
                clearable
                :placeholder="t('manageCatalogModal.allPackagesAllowed')"
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
              <div class="bg-slate-50 border rounded-lg pa-3 mb-4 d-flex flex-wrap align-center justify-space-between gap-3">
                <div class="d-flex align-center gap-2 text-body-2 text-slate-700 flex-grow-1" style="min-width: 260px;">
                  <v-icon size="18" color="primary">mdi-information-outline</v-icon>
                  <span>{{ t('manageCatalogModal.customFieldsHint') }}</span>
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
                    <th class="text-center py-2 font-weight-bold" style="width: 140px;">{{ t('manageCatalogModal.fieldType') }}</th>
                    <th class="text-center py-2 font-weight-bold" style="width: 120px;">{{ t('manageCatalogModal.unit') }}</th>
                    <th class="text-center py-2 font-weight-bold" style="width: 140px;">{{ t('manageCatalogModal.componentsWithValues') }}</th>
                    <th class="text-right py-2 font-weight-bold pe-4" style="width: 120px;">{{ t('common.actions') }}</th>
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
                    <td class="text-center py-2">
                      <v-chip
                        size="x-small"
                        :color="(f.componentsCount || 0) > 0 ? 'amber-darken-3' : 'slate-500'"
                        variant="tonal"
                        class="font-mono font-weight-bold"
                        :title="(f.componentsCount || 0) > 0 ? `${f.componentsCount} components have values` : 'No components have values'"
                      >
                        <v-icon start size="12" icon="mdi-chip" />
                        {{ f.componentsCount || 0 }}
                      </v-chip>
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
                <div class="d-flex justify-center gap-2">
                  <v-btn
                    size="x-small"
                    variant="outlined"
                    color="slate-700"
                    prepend-icon="mdi-content-copy"
                    @click="openCopyCategoryFieldsModal"
                  >
                    {{ t('manageCatalogModal.copyFromCategory') }}
                  </v-btn>
                  <v-btn
                    size="x-small"
                    variant="flat"
                    color="primary"
                    prepend-icon="mdi-plus"
                    @click="openFieldEditor()"
                  >
                    {{ t('manageCatalogModal.addField') }}
                  </v-btn>
                </div>
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

    <!-- ========================================== -->
    <!-- SUB-MODAL: ADD / EDIT CUSTOM FIELD         -->
    <!-- ========================================== -->
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

    <!-- ========================================== -->
    <!-- SUB-MODAL: COPY FIELDS FROM CATEGORY       -->
    <!-- ========================================== -->
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

    <!-- ========================================== -->
    <!-- MODAL: ADD / EDIT PACKAGE                  -->
    <!-- ========================================== -->
    <v-dialog v-model="showPackageDialog" max-width="520px" persistent>
      <v-card class="rounded-0 border bg-white">
        <v-card-title class="bg-slate-50 py-3 px-4 border-b font-weight-bold text-subtitle-1">
          {{ editingPackage ? t('manageCatalogModal.editPackage') : t('manageCatalogModal.newPackage') }}
        </v-card-title>
        <v-card-text class="pa-4">
          <v-text-field
            v-model="packageForm.package"
            :label="t('manageCatalogModal.packageFootprintName')"
            :placeholder="t('manageCatalogModal.packagePlaceholder')"
            variant="outlined"
            density="comfortable"
            class="font-mono mb-3"
            autofocus
            :error-messages="packageError"
          />

          <!-- Pin Count & Mount Technology Row (Aligned Heights and Baseline) -->
          <v-row dense class="mb-3" align="center">
            <v-col cols="12" sm="5">
              <v-text-field
                v-model.number="packageForm.pinQuantity"
                :label="t('manageCatalogModal.pinPadCount')"
                type="number"
                min="1"
                :placeholder="t('manageCatalogModal.pinPlaceholder')"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" sm="7">
              <div class="border rounded-lg d-flex align-center px-3 justify-space-between bg-slate-50" style="height: 48px;">
                <span class="text-caption font-weight-medium text-slate-600 me-2 flex-shrink-0">
                  {{ t('manageCatalogModal.mount') }}
                </span>
                <v-btn-toggle
                  v-model="packageForm.isSmd"
                  mandatory
                  density="compact"
                  variant="flat"
                  rounded="md"
                  color="primary"
                  class="flex-grow-1 bg-white border"
                  style="height: 34px;"
                >
                  <v-btn :value="1" size="small" class="flex-grow-1 text-caption font-weight-bold">
                    SMD
                  </v-btn>
                  <v-btn :value="0" size="small" class="flex-grow-1 text-caption font-weight-bold">
                    {{ t('dialogs.throughHole') }}
                  </v-btn>
                </v-btn-toggle>
              </div>
            </v-col>
          </v-row>

          <!-- Drawing / Pinout Image with Live Upload and Preview -->
          <div class="d-flex align-center gap-3 mb-1">
            <v-avatar
              v-if="packageForm.drawingURL"
              rounded="lg"
              size="48"
              class="border bg-slate-50 flex-shrink-0"
            >
              <MediaImage
                type="package"
                :src="packageForm.drawingURL"
                height="48px"
                width="48px"
              />
            </v-avatar>

            <v-text-field
              v-model="packageForm.drawingURL"
              :label="t('manageCatalogModal.drawingOrPinout')"
              :placeholder="t('manageCatalogModal.drawingPlaceholder')"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-image-outline"
              clearable
              hide-details="auto"
              class="flex-grow-1"
            >
              <template #append-inner>
                <v-btn
                  variant="tonal"
                  color="primary"
                  size="small"
                  class="text-caption font-weight-bold my-n1"
                  prepend-icon="mdi-upload"
                  :loading="uploadingDrawing"
                  @click.stop="drawingInputRef?.click()"
                  :title="t('common.upload')"
                >
                  {{ t('common.upload') }}
                </v-btn>
              </template>
            </v-text-field>
            <input
              ref="drawingInputRef"
              type="file"
              accept="image/*"
              style="display: none;"
              @change="handleDrawingUpload"
            />
          </div>
          <div class="text-caption text-slate-500 mt-1 ms-1">
            {{ t('manageCatalogModal.drawingStoredHint') }}
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="text" size="small" @click="showPackageDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold px-4"
            :loading="saving"
            @click="savePackage"
          >
            {{ t('manageCatalogModal.savePackage') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- CONFIRM DELETE CUSTOM FIELD DIALOG -->
    <DeleteCustomFieldDialog
      v-model="showDeleteFieldConfirmDialog"
      :field="fieldPendingDelete"
      @confirm="confirmDeleteField"
    />

    <!-- CONFIRM DELETE CATEGORY DIALOG -->
    <DeleteCategoryDialog
      v-model="showDeleteCategoryDialog"
      :category="categoryPendingDelete"
      :loading="deletingCategory"
      @confirm="executeDeleteCategory"
    />

    <!-- Notification Snackbar inside Dialog -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.text }}
    </v-snackbar>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import MediaImage from './MediaImage.vue';
import DeleteCustomFieldDialog from './dialogs/DeleteCustomFieldDialog.vue';
import DeleteCategoryDialog from './dialogs/DeleteCategoryDialog.vue';

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  initialTab: {
    type: String,
    default: 'categories'
  }
});

const emit = defineEmits(['update:modelValue', 'updated']);

const activeTab = ref(props.initialTab);
const loading = ref(false);
const saving = ref(false);

const categoriesList = ref([]);
const packagesList = ref([]);

const categorySearch = ref('');
const packageSearch = ref('');
const packageMountFilter = ref('all');

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

// Category deletion confirmation dialog
const showDeleteCategoryDialog = ref(false);
const categoryPendingDelete = ref(null);
const deletingCategory = ref(false);

// Field deletion confirmation dialog
const showDeleteFieldConfirmDialog = ref(false);
const fieldPendingDelete = ref(null);
const fieldPendingDeleteIdx = ref(-1);

// Standard Electronics Technical Presets for quick selection
const STANDARD_FIELD_PRESETS = [
  // Transistors / MOSFETs / Diodes
  { group: 'Transistors & Diodes', fieldLabel: 'Current Gain (hFE)', fieldName: 'hfe', fieldType: 'number', unit: '', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Collector-Emitter Voltage (VCEO)', fieldName: 'v_ceo', fieldType: 'number', unit: 'V', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Collector Current (IC)', fieldName: 'i_c', fieldType: 'number', unit: 'mA', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Drain-Source Voltage (VDS)', fieldName: 'v_ds', fieldType: 'number', unit: 'V', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Drain-Source On-Resistance (RDS(on))', fieldName: 'r_ds_on', fieldType: 'number', unit: 'mΩ', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Gate Threshold Voltage (VGS(th))', fieldName: 'v_gs_th', fieldType: 'number', unit: 'V', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Drain Current (ID)', fieldName: 'i_d', fieldType: 'number', unit: 'A', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Forward Voltage (VF)', fieldName: 'v_f', fieldType: 'number', unit: 'V', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Forward Current (IF)', fieldName: 'i_f', fieldType: 'number', unit: 'mA', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Reverse Breakdown Voltage (VR)', fieldName: 'v_r', fieldType: 'number', unit: 'V', options: '' },
  { group: 'Transistors & Diodes', fieldLabel: 'Power Dissipation (Ptot)', fieldName: 'p_tot', fieldType: 'number', unit: 'mW', options: '' },
  
  // Passive Components
  { group: 'Passive Components', fieldLabel: 'Capacitance', fieldName: 'capacitance', fieldType: 'number', unit: 'µF', options: '' },
  { group: 'Passive Components', fieldLabel: 'Rated Voltage', fieldName: 'rated_voltage', fieldType: 'number', unit: 'V', options: '' },
  { group: 'Passive Components', fieldLabel: 'Dielectric / Material', fieldName: 'dielectric', fieldType: 'select', unit: '', options: 'X7R, X5R, C0G/NP0, Y5V, Aluminum Electrolytic, Tantalum, Film' },
  { group: 'Passive Components', fieldLabel: 'Resistance', fieldName: 'resistance', fieldType: 'number', unit: 'Ω', options: '' },
  { group: 'Passive Components', fieldLabel: 'Tolerance', fieldName: 'tolerance', fieldType: 'select', unit: '%', options: '±0.1%, ±0.5%, ±1%, ±2%, ±5%, ±10%, ±20%' },
  { group: 'Passive Components', fieldLabel: 'Power Rating (Pmax)', fieldName: 'power_rating', fieldType: 'number', unit: 'W', options: '' },
  { group: 'Passive Components', fieldLabel: 'Inductance', fieldName: 'inductance', fieldType: 'number', unit: 'µH', options: '' },
  { group: 'Passive Components', fieldLabel: 'Saturation Current (Isat)', fieldName: 'i_sat', fieldType: 'number', unit: 'A', options: '' },
  { group: 'Passive Components', fieldLabel: 'DC Resistance (DCR)', fieldName: 'dcr', fieldType: 'number', unit: 'mΩ', options: '' },

  // ICs & Microcontrollers
  { group: 'ICs & Microcontrollers', fieldLabel: 'Operating Voltage (VCC/VDD)', fieldName: 'supply_voltage', fieldType: 'text', unit: 'V', options: '' },
  { group: 'ICs & Microcontrollers', fieldLabel: 'Clock Frequency (fmax)', fieldName: 'clock_freq', fieldType: 'number', unit: 'MHz', options: '' },
  { group: 'ICs & Microcontrollers', fieldLabel: 'Flash Memory Size', fieldName: 'flash_size', fieldType: 'number', unit: 'KB', options: '' },
  { group: 'ICs & Microcontrollers', fieldLabel: 'RAM Size', fieldName: 'ram_size', fieldType: 'number', unit: 'KB', options: '' },
  { group: 'ICs & Microcontrollers', fieldLabel: 'Logic Family', fieldName: 'logic_family', fieldType: 'select', unit: '', options: '74HC, 74HCT, 74LS, 74AHC, 74LVC, CMOS 4000' },
  { group: 'ICs & Microcontrollers', fieldLabel: 'Operating Temperature', fieldName: 'temp_range', fieldType: 'select', unit: '°C', options: '0°C to +70°C (Commercial), -40°C to +85°C (Industrial), -40°C to +125°C (Automotive)' }
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

const showPackageDialog = ref(false);
const editingPackage = ref(null);
const packageForm = ref({
  package: '',
  pinQuantity: null,
  isSmd: 1,
  drawingURL: ''
});
const packageError = ref('');

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

// Load data
const loadCatalogData = async () => {
  loading.value = true;
  try {
    const [cats, pkgs] = await Promise.all([
      api.getCategories(),
      api.getPackages()
    ]);
    categoriesList.value = cats || [];
    packagesList.value = pkgs || [];
  } catch (err) {
    console.error('Failed to load catalog data:', err);
    notify(t('manageCatalogModal.loadError') + ': ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    activeTab.value = props.initialTab || 'categories';
    loadCatalogData();
  }
});

const close = () => {
  emit('update:modelValue', false);
};

// Filtered Lists
const filteredCategories = computed(() => {
  if (!categorySearch.value.trim()) return categoriesList.value;
  const q = categorySearch.value.toLowerCase().trim();
  return categoriesList.value.filter(c => c.category.toLowerCase().includes(q));
});

const filteredPackages = computed(() => {
  let list = packagesList.value;
  if (packageMountFilter.value === 'smd') {
    list = list.filter(p => !!p.isSmd);
  } else if (packageMountFilter.value === 'tht') {
    list = list.filter(p => !p.isSmd);
  }
  if (!packageSearch.value.trim()) return list;
  const q = packageSearch.value.toLowerCase().trim();
  return list.filter(p => p.package.toLowerCase().includes(q));
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
const openCategoryForm = async (cat = null) => {
  editingCategory.value = cat;
  categoryEditTab.value = 'general';
  deletedFieldIds.value = [];
  categoryForm.value = {
    category: cat ? cat.category : '',
    packageIds: cat && cat.packageIds ? [...cat.packageIds] : [],
    customFields: cat && cat.customFields ? JSON.parse(JSON.stringify(cat.customFields)) : []
  };
  categoryError.value = '';
  showCategoryDialog.value = true;

  // If editing, fetch fresh packages and custom fields
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
    
    // Check if already in current form
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
  if (!field.id) {
    categoryForm.value.customFields.splice(idx, 1);
    return;
  }
  fieldPendingDelete.value = field;
  fieldPendingDeleteIdx.value = idx;
  showDeleteFieldConfirmDialog.value = true;
};

const confirmDeleteField = () => {
  if (fieldPendingDelete.value && fieldPendingDeleteIdx.value >= 0) {
    if (fieldPendingDelete.value.id) {
      deletedFieldIds.value.push(fieldPendingDelete.value.id);
    }
    categoryForm.value.customFields.splice(fieldPendingDeleteIdx.value, 1);
  }
  showDeleteFieldConfirmDialog.value = false;
  fieldPendingDelete.value = null;
  fieldPendingDeleteIdx.value = -1;
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

    // Process added / updated custom fields
    for (let i = 0; i < categoryForm.value.customFields.length; i++) {
      const f = categoryForm.value.customFields[i];
      const fieldPayload = {
        fieldName: f.fieldName,
        fieldLabel: f.fieldLabel,
        fieldType: f.fieldType || 'number',
        unit: f.unit || null,
        options: f.options || null,
        sortOrder: i
      };

      if (f.id) {
        await api.updateCategoryField(catId, f.id, fieldPayload);
      } else {
        await api.addCategoryField(catId, fieldPayload);
      }
    }

    notify(editingCategory.value ? t('manageCatalogModal.categoryUpdated', { name }) : t('manageCatalogModal.categoryCreated', { name }));
    showCategoryDialog.value = false;
    await loadCatalogData();
    emit('updated');
  } catch (err) {
    categoryError.value = err.response?.data?.error || err.message;
  } finally {
    saving.value = false;
  }
};

const confirmDeleteCategory = (cat) => {
  categoryPendingDelete.value = cat;
  showDeleteCategoryDialog.value = true;
};

const executeDeleteCategory = async (cat) => {
  if (!cat || !cat.ID) return;
  deletingCategory.value = true;
  try {
    await api.deleteCategory(cat.ID);
    notify(t('manageCatalogModal.categoryDeleted', { name: cat.category }));
    showDeleteCategoryDialog.value = false;
    categoryPendingDelete.value = null;
    await loadCatalogData();
    emit('updated');
  } catch (err) {
    notify(t('manageCatalogModal.categoryDeleteError') + ': ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    deletingCategory.value = false;
  }
};

// Package Actions
const uploadingDrawing = ref(false);
const drawingInputRef = ref(null);

const handleDrawingUpload = async (event) => {
  const file = event.target?.files?.[0];
  if (!file) return;

  uploadingDrawing.value = true;
  try {
    const res = await api.uploadMedia('packages', file);
    packageForm.value.drawingURL = res.filename;
    notify(t('manageCatalogModal.drawingUploaded', { file: res.filename }));
  } catch (err) {
    console.error('Failed to upload package drawing:', err);
    notify(t('manageCatalogModal.drawingUploadError') + ': ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    uploadingDrawing.value = false;
    if (event.target) event.target.value = '';
  }
};

const openPackageForm = (pkg = null) => {
  editingPackage.value = pkg;
  packageForm.value = {
    package: pkg ? pkg.package : '',
    pinQuantity: pkg && pkg.pinQuantity != null ? pkg.pinQuantity : null,
    isSmd: pkg ? (pkg.isSmd ? 1 : 0) : 1,
    drawingURL: pkg && pkg.drawingURL ? pkg.drawingURL : ''
  };
  packageError.value = '';
  showPackageDialog.value = true;
};

const savePackage = async () => {
  const name = packageForm.value.package.trim();
  if (!name) {
    packageError.value = t('manageCatalogModal.packageRequiredErr');
    return;
  }
  saving.value = true;
  packageError.value = '';
  try {
    const payload = {
      package: name,
      pinQuantity: packageForm.value.pinQuantity,
      isSmd: packageForm.value.isSmd,
      drawingURL: packageForm.value.drawingURL.trim()
    };
    if (editingPackage.value) {
      await api.updatePackage(editingPackage.value.ID, payload);
      notify(t('manageCatalogModal.packageUpdated', { name }));
    } else {
      await api.createPackage(payload);
      notify(t('manageCatalogModal.packageCreated', { name }));
    }
    showPackageDialog.value = false;
    await loadCatalogData();
    emit('updated');
  } catch (err) {
    packageError.value = err.response?.data?.error || err.message;
  } finally {
    saving.value = false;
  }
};

const confirmDeletePackage = async (pkg) => {
  if (pkg.componentCount > 0) {
    alert(t('manageCatalogModal.packageDeleteInUse', { name: pkg.package, count: pkg.componentCount }));
    return;
  }
  if (confirm(t('manageCatalogModal.packageDeleteConfirm', { name: pkg.package }))) {
    try {
      await api.deletePackage(pkg.ID);
      notify(t('manageCatalogModal.packageDeleted', { name: pkg.package }));
      await loadCatalogData();
      emit('updated');
    } catch (err) {
      notify(t('manageCatalogModal.packageDeleteError') + ': ' + (err.response?.data?.error || err.message), 'error');
    }
  }
};
</script>

<style scoped>
.data-table :deep(th) {
  background-color: #F8FAFC !important;
  color: #475569;
}
</style>
