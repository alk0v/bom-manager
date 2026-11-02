<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1240"
    width="95vw"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-0 border bg-white d-flex flex-column" style="max-height: 90vh;">
      <!-- Dialog Header -->
      <v-card-item class="bg-slate-50 py-3 px-5 border-b flex-shrink-0">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-2">
            <v-icon color="primary" size="24">mdi-package-down</v-icon>
            <div>
              <div class="text-subtitle-1 font-weight-bold text-slate-900">
                {{ t('importComponentsPackageModal.title') }}
              </div>
              <div class="text-caption text-slate-500">
                {{ t('importComponentsPackageModal.subtitle') }}
              </div>
            </div>
          </div>

          <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
        </div>
      </v-card-item>

      <!-- Step Navigation Indicator -->
      <div class="bg-white border-b px-5 py-2 flex-shrink-0">
        <div class="d-flex align-center gap-4">
          <!-- Step 1 Indicator -->
          <div
            class="d-flex align-center cursor-pointer py-1 px-2 rounded"
            :class="currentStep === 1 ? 'bg-primary-lighten-5 font-weight-bold text-primary' : 'text-slate-600'"
            @click="goToStep(1)"
          >
            <v-avatar
              size="24"
              :color="currentStep === 1 ? 'primary' : (currentStep > 1 ? 'success' : 'grey-lighten-2')"
              class="me-2 text-caption text-white font-weight-bold"
            >
              <v-icon v-if="currentStep > 1" size="16">mdi-check</v-icon>
              <span v-else>1</span>
            </v-avatar>
            <div>
              <div class="text-caption font-weight-bold leading-tight">{{ t('importComponentsPackageModal.step1Title') }}</div>
              <div class="text-caption text-disabled text-truncate" style="font-size: 11px;">{{ t('importComponentsPackageModal.step1Subtitle') }}</div>
            </div>
          </div>

          <v-icon color="grey-lighten-2" size="16">mdi-chevron-right</v-icon>

          <!-- Step 2 Indicator: Pick & Map Components -->
          <div
            class="d-flex align-center py-1 px-2 rounded"
            :class="[
              currentStep === 2 ? 'bg-primary-lighten-5 font-weight-bold text-primary' : 'text-slate-600',
              importedComponents.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            ]"
            @click="importedComponents.length > 0 && goToStep(2)"
          >
            <v-avatar
              size="24"
              :color="currentStep === 2 ? 'primary' : (currentStep > 2 ? 'success' : 'grey-lighten-2')"
              class="me-2 text-caption text-white font-weight-bold"
            >
              <v-icon v-if="currentStep > 2" size="16">mdi-check</v-icon>
              <span v-else>2</span>
            </v-avatar>
            <div>
              <div class="text-caption font-weight-bold leading-tight">{{ t('importComponentsPackageModal.step2Title') }}</div>
              <div class="text-caption text-disabled text-truncate" style="font-size: 11px;">{{ t('importComponentsPackageModal.step2Subtitle') }}</div>
            </div>
          </div>

          <v-icon color="grey-lighten-2" size="16">mdi-chevron-right</v-icon>

          <!-- Step 3 Indicator: Match Packages -->
          <div
            class="d-flex align-center py-1 px-2 rounded"
            :class="[
              currentStep === 3 ? 'bg-primary-lighten-5 font-weight-bold text-primary' : 'text-slate-600',
              importedComponents.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            ]"
            @click="importedComponents.length > 0 && goToStep(3)"
          >
            <v-avatar
              size="24"
              :color="currentStep === 3 ? 'primary' : 'grey-lighten-2'"
              class="me-2 text-caption text-white font-weight-bold"
            >
              <span>3</span>
            </v-avatar>
            <div>
              <div class="text-caption font-weight-bold leading-tight">{{ t('importComponentsPackageModal.step3Title') }}</div>
              <div class="text-caption text-disabled text-truncate" style="font-size: 11px;">{{ t('importComponentsPackageModal.step3Subtitle') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dialog Body -->
      <v-card-text class="pa-0 flex-grow-1 overflow-y-auto">
        <!-- STEP 1: Upload File -->
        <div v-if="currentStep === 1" class="pa-6">
          <div class="text-subtitle-1 font-weight-bold text-slate-900 mb-2">
            {{ t('importComponentsPackageModal.selectFileTitle') }}
          </div>
          <p class="text-body-2 text-slate-600 mb-4">
            {{ t('importComponentsPackageModal.selectFileSubtitle') }}
          </p>

          <v-card elevation="0" class="border rounded-0 pa-6 bg-slate-50 w-100">
            <div class="d-flex align-center mb-3">
              <v-icon color="primary" class="me-2" size="24">mdi-upload</v-icon>
              <span class="font-weight-bold text-subtitle-2 text-slate-900">
                {{ t('importComponentsPackageModal.chooseFile') }}
              </span>
            </div>

            <v-file-input
              v-model="uploadFile"
              accept=".zip,.json"
              :label="t('importComponentsPackageModal.chooseFile')"
              variant="outlined"
              density="comfortable"
              prepend-icon="mdi-package-variant-closed"
              class="bg-white mb-3"
              show-size
            />

            <v-btn
              color="primary"
              variant="flat"
              size="small"
              class="font-weight-bold w-100 py-2"
              prepend-icon="mdi-file-find-outline"
              :disabled="!uploadFile"
              :loading="parsing"
              @click="parseUploadedArchive"
            >
              {{ t('importComponentsPackageModal.analyzeBtn') }}
            </v-btn>
          </v-card>
        </div>

        <!-- STEP 2: Pick & Map Components -->
        <div v-else-if="currentStep === 2" class="d-flex flex-column h-100">
          <!-- Stats & Quick Actions Bar -->
          <div class="bg-slate-50 px-5 py-3 border-b flex-shrink-0 d-flex align-center justify-space-between flex-wrap gap-2">
            <div class="d-flex align-center gap-2 flex-wrap">
              <v-chip size="small" color="primary" variant="flat" class="font-weight-bold">
                {{ t('importComponentsPackageModal.componentsToImport', { count: importedComponents.length }) }}
              </v-chip>
              <v-chip size="small" color="success" variant="tonal" class="font-weight-medium">
                <v-icon start size="14">mdi-check-circle-outline</v-icon>
                {{ t('importComponentsPackageModal.matchedCount', { count: matchedComponentsCount }) }}
              </v-chip>
              <v-chip size="small" color="info" variant="tonal" class="font-weight-medium">
                <v-icon start size="14">mdi-plus-circle-outline</v-icon>
                {{ t('importComponentsPackageModal.newCount', { count: newComponentsCount }) }}
              </v-chip>
              <v-chip v-if="photosCount > 0" size="small" color="teal" variant="tonal" class="font-weight-medium">
                <v-icon start size="14">mdi-image-outline</v-icon>
                {{ t('importComponentsPackageModal.photosCount', { count: photosCount }) }}
              </v-chip>
            </div>

            <div class="d-flex align-center gap-2 flex-wrap">
              <v-checkbox
                v-model="importStock"
                density="compact"
                hide-details
                color="primary"
                class="me-2"
              >
                <template #label>
                  <span class="text-caption font-weight-bold text-slate-700">
                    {{ t('importComponentsPackageModal.importStockToggle') }}
                  </span>
                </template>
              </v-checkbox>

              <v-btn
                size="small"
                variant="outlined"
                color="primary"
                prepend-icon="mdi-check-all"
                class="font-weight-medium"
                @click="mapAllExactComponents"
              >
                {{ t('importComponentsPackageModal.mapExactAll') }}
              </v-btn>
              <v-btn
                size="small"
                variant="outlined"
                color="secondary"
                prepend-icon="mdi-plus-box-multiple-outline"
                class="font-weight-medium"
                @click="setAllComponentsToCreateNew"
              >
                {{ t('importComponentsPackageModal.createAllNew') }}
              </v-btn>
            </div>
          </div>

          <!-- Filter & Select All Toolbar -->
          <div class="px-5 py-2 bg-white border-b d-flex align-center justify-space-between gap-3 flex-shrink-0 flex-wrap">
            <div class="d-flex align-center gap-3">
              <v-checkbox
                :model-value="allComponentsSelected"
                :indeterminate="someComponentsSelected && !allComponentsSelected"
                density="compact"
                hide-details
                color="primary"
                @update:model-value="toggleSelectAllComponents"
              >
                <template #label>
                  <span class="text-caption font-weight-bold text-slate-800">
                    {{ t('importComponentsPackageModal.selectedCount', { count: selectedComponentsCount, total: importedComponents.length }) }}
                  </span>
                </template>
              </v-checkbox>
            </div>

            <v-text-field
              v-model="componentSearch"
              density="compact"
              variant="outlined"
              :placeholder="t('importComponentsPackageModal.searchComponents')"
              prepend-inner-icon="mdi-magnify"
              hide-details
              clearable
              rounded="lg"
              class="bg-white"
              style="min-width: 260px; max-width: 360px;"
            />
          </div>

          <!-- Components Mapping Table -->
          <div class="flex-grow-1 overflow-y-auto">
            <v-table density="comfortable" hover class="data-table">
              <thead>
                <tr class="bg-slate-50 text-caption font-weight-bold">
                  <th style="width: 44px;" class="text-center">#</th>
                  <th class="text-left font-weight-bold" style="width: 54px;">
                    {{ t('importComponentsPackageModal.colPhoto') }}
                  </th>
                  <th class="text-left font-weight-bold" style="min-width: 210px;">
                    {{ t('importComponentsPackageModal.colComponent') }}
                  </th>
                  <th class="text-left font-weight-bold" style="min-width: 180px;">
                    {{ t('importComponentsPackageModal.colCategoryPackage') }}
                  </th>
                  <th class="text-center font-weight-bold" style="width: 90px;">
                    {{ t('importComponentsPackageModal.colStock') }}
                  </th>
                  <th class="text-left font-weight-bold" style="width: 140px;">
                    {{ t('importComponentsPackageModal.colStatus') }}
                  </th>
                  <th class="text-left font-weight-bold" style="min-width: 310px;">
                    {{ t('importComponentsPackageModal.colTargetAction') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in filteredComponents"
                  :key="item.importIndex"
                  :class="{
                    'bg-blue-50/40': item.selected && item.action === 'update',
                    'opacity-50': !item.selected
                  }"
                >
                  <!-- Checkbox -->
                  <td class="text-center pa-1">
                    <v-checkbox
                      v-model="item.selected"
                      density="compact"
                      hide-details
                      color="primary"
                    />
                  </td>

                  <!-- Photo Thumbnail (clickable preview) -->
                  <td>
                    <v-avatar
                      rounded="lg"
                      size="36"
                      class="border bg-slate-50"
                      :class="{ 'cursor-pointer hover-zoom': !!(item.photoPreviewDataUrl || item.photoURL) }"
                      :title="(item.photoPreviewDataUrl || item.photoURL) ? t('dialogs.viewFullSize') : ''"
                      @click.stop="(item.photoPreviewDataUrl || item.photoURL) && openComponentPhotoPreview(item)"
                    >
                      <img
                        v-if="item.photoPreviewDataUrl"
                        :src="item.photoPreviewDataUrl"
                        :alt="item.component"
                        style="width: 36px; height: 36px; object-fit: cover;"
                      />
                      <MediaImage
                        v-else
                        type="component"
                        :src="item.photoURL"
                        height="36px"
                        width="36px"
                      />
                    </v-avatar>
                  </td>

                  <!-- Component Name, Marking, Datasheet & Description -->
                  <td>
                    <div class="font-mono font-weight-bold text-body-2 text-slate-900">
                      {{ item.component }}
                    </div>
                    <div class="d-flex align-center gap-2 text-caption font-mono mt-0.5" v-if="item.marking || item.datasheetURL">
                      <span v-if="item.marking" class="text-slate-500">
                        Marking: {{ item.marking }}
                      </span>
                      <v-chip
                        v-if="item.datasheetURL"
                        size="x-small"
                        color="primary"
                        variant="tonal"
                        class="px-1.5"
                        :title="item.datasheetURL"
                      >
                        <v-icon start size="11">mdi-file-pdf-box</v-icon>
                        PDF
                      </v-chip>
                    </div>
                    <div
                      v-if="item.shortDescription || item.description"
                      class="text-caption text-slate-500 text-truncate mt-0.5"
                      style="max-width: 240px;"
                      :title="item.description || item.shortDescription"
                    >
                      {{ item.shortDescription || item.description }}
                    </div>
                  </td>

                  <!-- Category, Package & Custom Specs -->
                  <td>
                    <div class="d-flex align-center gap-1 flex-wrap">
                      <v-chip
                        v-if="item.category"
                        size="x-small"
                        color="secondary"
                        variant="tonal"
                        class="font-weight-medium"
                      >
                        {{ item.category }}
                      </v-chip>
                      <v-chip
                        v-if="item.package"
                        size="x-small"
                        color="slate-700"
                        variant="outlined"
                        class="font-mono font-weight-bold"
                      >
                        {{ item.package }}
                      </v-chip>
                    </div>

                    <div v-if="item.customFields && item.customFields.length > 0" class="mt-1">
                      <v-tooltip
                        :text="formatCustomFieldsTooltip(item.customFields)"
                        location="top"
                      >
                        <template #activator="{ props: specTip }">
                          <v-chip
                            v-bind="specTip"
                            size="x-small"
                            color="teal"
                            variant="tonal"
                            class="font-mono"
                          >
                            <v-icon start size="11">mdi-tune-variant</v-icon>
                            {{ t('importComponentsPackageModal.specsCount', { count: item.customFields.length }) }}
                          </v-chip>
                        </template>
                      </v-tooltip>
                    </div>
                  </td>

                  <!-- Stock -->
                  <td class="text-center font-mono">
                    <div class="font-weight-bold text-body-2 text-slate-800">
                      {{ item.qty }}
                    </div>
                    <div v-if="item.minQty > 0" class="text-caption text-slate-400">
                      min: {{ item.minQty }}
                    </div>
                  </td>

                  <!-- Match Status Badge -->
                  <td>
                    <v-chip
                      v-if="item.matchType === 'exact'"
                      size="small"
                      color="success"
                      variant="tonal"
                      class="font-weight-medium"
                      :title="item.matchReason"
                    >
                      <v-icon start size="14">mdi-check-circle-outline</v-icon>
                      {{ t('importComponentsPackageModal.exactMatch') }}
                    </v-chip>
                    <v-chip
                      v-else-if="item.matchType === 'suggested'"
                      size="small"
                      color="warning"
                      variant="tonal"
                      class="font-weight-medium"
                      :title="item.matchReason"
                    >
                      <v-icon start size="14">mdi-lightbulb-outline</v-icon>
                      {{ t('importComponentsPackageModal.suggestedMatch') }}
                    </v-chip>
                    <v-chip
                      v-else
                      size="small"
                      color="slate-600"
                      variant="tonal"
                      class="font-weight-medium"
                    >
                      <v-icon start size="14">mdi-plus-circle-outline</v-icon>
                      {{ t('importComponentsPackageModal.newComponent') }}
                    </v-chip>
                  </td>

                  <!-- Target Component & Action Column -->
                  <td>
                    <!-- If Action is 'create' -->
                    <div v-if="item.action === 'create'" class="d-flex align-center gap-2 py-1">
                      <v-chip
                        size="small"
                        color="primary"
                        variant="tonal"
                        class="font-weight-medium"
                      >
                        <v-icon start size="14">mdi-plus-circle-outline</v-icon>
                        {{ t('importComponentsPackageModal.actionCreate') }}
                      </v-chip>

                      <v-btn
                        variant="text"
                        size="x-small"
                        color="slate-600"
                        class="text-caption font-weight-medium"
                        prepend-icon="mdi-link-variant"
                        @click="setComponentRowToUpdate(item)"
                      >
                        {{ t('importComponentsPackageModal.mapExisting') }}
                      </v-btn>
                    </div>

                    <!-- If Action is 'update' -->
                    <div v-else-if="item.action === 'update'" class="d-flex align-center gap-2 py-1">
                      <v-autocomplete
                        v-model="item.targetComponentId"
                        :items="existingComponents"
                        item-title="component"
                        item-value="ID"
                        density="compact"
                        variant="outlined"
                        hide-details
                        rounded="lg"
                        class="bg-white font-mono flex-grow-1 target-select"
                        prepend-inner-icon="mdi-database-sync-outline"
                        style="max-width: 290px;"
                        :placeholder="t('importComponentsPackageModal.targetComponent')"
                      >
                        <template #selection="{ item: compItem }">
                          <span class="font-mono text-caption font-weight-bold text-emerald-800 text-truncate">
                            #{{ compItem.raw.ID }} {{ compItem.raw.component }}
                            <span v-if="compItem.raw.package" class="text-slate-500 font-weight-regular">({{ compItem.raw.package }})</span>
                          </span>
                        </template>
                        <template #item="{ props: itemProps, item: compOption }">
                          <v-list-item
                            v-bind="itemProps"
                            :title="`#${compOption.raw.ID} ${compOption.raw.component}`"
                            :subtitle="`${compOption.raw.package || '—'} • ${compOption.raw.category || '—'} • Stock: ${compOption.raw.qty ?? 0}`"
                          />
                        </template>
                      </v-autocomplete>

                      <v-tooltip :text="t('importComponentsPackageModal.actionCreate')" location="top">
                        <template #activator="{ props: tipProps }">
                          <v-btn
                            v-bind="tipProps"
                            icon="mdi-plus"
                            size="x-small"
                            variant="tonal"
                            color="primary"
                            @click="item.action = 'create'; item.targetComponentId = null"
                          />
                        </template>
                      </v-tooltip>
                    </div>
                  </td>
                </tr>

                <tr v-if="filteredComponents.length === 0">
                  <td colspan="7" class="text-center py-8 text-disabled">
                    <v-icon size="36" class="mb-2">mdi-memory</v-icon>
                    <div>{{ t('importComponentsPackageModal.noComponentsFound') }}</div>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </div>

        <!-- STEP 3: Match Packages for Selected Components -->
        <div v-else-if="currentStep === 3" class="d-flex flex-column h-100">
          <!-- Stats & Quick Actions Bar -->
          <div class="bg-slate-50 px-5 py-3 border-b flex-shrink-0 d-flex align-center justify-space-between flex-wrap gap-2">
            <div class="d-flex align-center gap-2 flex-wrap">
              <v-chip size="small" color="primary" variant="flat" class="font-weight-bold">
                {{ t('importComponentsPackageModal.packagesToMatch', { count: relevantPackages.length }) }}
              </v-chip>
              <v-chip size="small" color="success" variant="tonal" class="font-weight-medium">
                <v-icon start size="14">mdi-check-circle-outline</v-icon>
                {{ t('importComponentsPackageModal.matchedCount', { count: matchedPackagesCount }) }}
              </v-chip>
              <v-chip size="small" color="info" variant="tonal" class="font-weight-medium">
                <v-icon start size="14">mdi-plus-circle-outline</v-icon>
                {{ t('importComponentsPackageModal.newCount', { count: newPackagesCount }) }}
              </v-chip>
              <v-chip v-if="drawingsCount > 0" size="small" color="teal" variant="tonal" class="font-weight-medium">
                <v-icon start size="14">mdi-image-outline</v-icon>
                {{ t('importComponentsPackageModal.drawingsCount', { count: drawingsCount }) }}
              </v-chip>
            </div>

            <div class="d-flex align-center gap-2">
              <v-btn
                size="small"
                variant="outlined"
                color="primary"
                prepend-icon="mdi-check-all"
                class="font-weight-medium"
                @click="mapAllExactPackages"
              >
                {{ t('importComponentsPackageModal.mapExactAll') }}
              </v-btn>
              <v-btn
                size="small"
                variant="outlined"
                color="secondary"
                prepend-icon="mdi-plus-box-multiple-outline"
                class="font-weight-medium"
                @click="setAllPackagesToCreateNew"
              >
                {{ t('importComponentsPackageModal.createAllNew') }}
              </v-btn>
            </div>
          </div>

          <!-- Filter Toolbar -->
          <div class="px-5 py-2 bg-white border-b d-flex align-center justify-end gap-3 flex-shrink-0">
            <v-text-field
              v-model="packageSearch"
              density="compact"
              variant="outlined"
              :placeholder="t('importComponentsPackageModal.searchPackages')"
              prepend-inner-icon="mdi-magnify"
              hide-details
              clearable
              rounded="lg"
              class="bg-white"
              style="min-width: 240px; max-width: 320px;"
            />
          </div>

          <!-- Packages Mapping Table -->
          <div class="flex-grow-1 overflow-y-auto">
            <v-table density="comfortable" hover class="data-table">
              <thead>
                <tr class="bg-slate-50 text-caption font-weight-bold">
                  <th class="text-left font-weight-bold" style="min-width: 220px;">
                    {{ t('manageCatalogModal.packageFootprintName') }}
                  </th>
                  <th class="text-center font-weight-bold" style="width: 150px;">
                    {{ t('manageCatalogModal.mount') }} / {{ t('manageCatalogModal.pins') }}
                  </th>
                  <th class="text-left font-weight-bold" style="width: 160px;">
                    {{ t('importComponentsPackageModal.colStatus') }}
                  </th>
                  <th class="text-left font-weight-bold" style="min-width: 310px;">
                    {{ t('importComponentsPackageModal.colTargetAction') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="pkg in filteredPackages"
                  :key="pkg.importIndex"
                  :class="{ 'bg-blue-50/40': pkg.action === 'update' }"
                >
                  <!-- Package Name & Clickable Drawing File -->
                  <td>
                    <div class="font-mono font-weight-bold text-body-2 text-slate-900">
                      {{ pkg.package }}
                    </div>

                    <div v-if="pkg.drawingURL" class="d-flex align-center gap-1 mt-0.5">
                      <v-icon size="14" color="primary" class="flex-shrink-0">mdi-file-image-outline</v-icon>
                      <span
                        class="font-mono text-caption text-primary cursor-pointer hover-underline text-truncate"
                        style="max-width: 220px;"
                        :title="`${pkg.drawingURL} (${t('dialogs.viewFullSize')})`"
                        @click.stop="openPackageDrawingPreview(pkg)"
                      >
                        {{ pkg.drawingURL }}
                      </span>
                      <v-icon
                        size="13"
                        color="slate-400"
                        class="cursor-pointer hover-icon ms-0.5"
                        :title="t('dialogs.viewFullSize')"
                        @click.stop="openPackageDrawingPreview(pkg)"
                      >
                        mdi-magnify-plus-outline
                      </v-icon>
                    </div>
                    <div v-else class="text-caption text-slate-400 font-italic mt-0.5">
                      {{ t('manageCatalogModal.noDrawing') }}
                    </div>
                  </td>

                  <!-- Mount & Pins -->
                  <td class="text-center">
                    <div class="d-flex align-center justify-center gap-1">
                      <v-chip
                        size="x-small"
                        variant="tonal"
                        :color="pkg.isSmd === 1 ? 'teal-darken-1' : (pkg.isSmd === 2 ? 'blue-grey-darken-1' : 'indigo-darken-1')"
                        class="font-weight-bold"
                      >
                        {{ pkg.isSmd === 1 ? 'SMD' : (pkg.isSmd === 2 ? 'MECH' : 'THT') }}
                      </v-chip>
                      <v-chip
                        v-if="pkg.isSmd !== 2 && pkg.pinQuantity !== null && pkg.pinQuantity !== undefined"
                        size="x-small"
                        variant="outlined"
                        color="slate-600"
                        class="font-mono"
                      >
                        {{ pkg.pinQuantity }}p
                      </v-chip>
                    </div>
                  </td>

                  <!-- Match Status Badge -->
                  <td>
                    <v-chip
                      v-if="pkg.matchType === 'exact'"
                      size="small"
                      color="success"
                      variant="tonal"
                      class="font-weight-medium"
                    >
                      <v-icon start size="14">mdi-check-circle-outline</v-icon>
                      {{ t('importComponentsPackageModal.exactMatch') }}
                    </v-chip>
                    <v-chip
                      v-else-if="pkg.matchType === 'suggested'"
                      size="small"
                      color="warning"
                      variant="tonal"
                      class="font-weight-medium"
                    >
                      <v-icon start size="14">mdi-lightbulb-outline</v-icon>
                      {{ t('importComponentsPackageModal.suggestedMatch') }}
                    </v-chip>
                    <v-chip
                      v-else
                      size="small"
                      color="slate-600"
                      variant="tonal"
                      class="font-weight-medium"
                    >
                      <v-icon start size="14">mdi-plus-circle-outline</v-icon>
                      {{ t('importComponentsPackageModal.newPackage') }}
                    </v-chip>
                  </td>

                  <!-- Action & Target Package Column -->
                  <td>
                    <!-- If Action is 'create' -->
                    <div v-if="pkg.action === 'create'" class="d-flex align-center gap-2 py-1">
                      <v-chip
                        size="small"
                        color="primary"
                        variant="tonal"
                        class="font-weight-medium"
                      >
                        <v-icon start size="14">mdi-plus-circle-outline</v-icon>
                        {{ t('importComponentsPackageModal.actionCreate') }}
                      </v-chip>

                      <v-btn
                        variant="text"
                        size="x-small"
                        color="slate-600"
                        class="text-caption font-weight-medium"
                        prepend-icon="mdi-link-variant"
                        @click="setPackageRowToUpdate(pkg)"
                      >
                        {{ t('importComponentsPackageModal.mapExisting') }}
                      </v-btn>
                    </div>

                    <!-- If Action is 'update' -->
                    <div v-else-if="pkg.action === 'update'" class="d-flex align-center gap-2 py-1">
                      <v-autocomplete
                        v-model="pkg.targetPackageId"
                        :items="existingPackages"
                        item-title="package"
                        item-value="ID"
                        density="compact"
                        variant="outlined"
                        hide-details
                        rounded="lg"
                        class="bg-white font-mono flex-grow-1 target-select"
                        prepend-inner-icon="mdi-database-sync-outline"
                        style="max-width: 280px;"
                        :placeholder="t('importComponentsPackageModal.targetPackage')"
                      >
                        <template #selection="{ item: pkgItem }">
                          <span class="font-mono text-caption font-weight-bold text-emerald-800 text-truncate">
                            #{{ pkgItem.raw.ID }} {{ pkgItem.raw.package }}
                          </span>
                        </template>
                        <template #item="{ props: itemProps, item: pkgOption }">
                          <v-list-item
                            v-bind="itemProps"
                            :title="`#${pkgOption.raw.ID} ${pkgOption.raw.package}`"
                            :subtitle="`${pkgOption.raw.pinQuantity !== null && pkgOption.raw.pinQuantity !== undefined ? pkgOption.raw.pinQuantity + ' pins' : '—'} • ${pkgOption.raw.isSmd === 1 ? 'SMD' : (pkgOption.raw.isSmd === 2 ? 'MECH' : 'THT')}`"
                          />
                        </template>
                      </v-autocomplete>

                      <v-tooltip :text="t('importComponentsPackageModal.actionCreate')" location="top">
                        <template #activator="{ props: tipProps }">
                          <v-btn
                            v-bind="tipProps"
                            icon="mdi-plus"
                            size="x-small"
                            variant="tonal"
                            color="primary"
                            @click="pkg.action = 'create'; pkg.targetPackageId = null"
                          />
                        </template>
                      </v-tooltip>
                    </div>
                  </td>
                </tr>

                <tr v-if="filteredPackages.length === 0">
                  <td colspan="4" class="text-center py-8 text-disabled">
                    <v-icon size="36" class="mb-2">mdi-package-variant-closed</v-icon>
                    <div>{{ t('importComponentsPackageModal.noPackagesFound') }}</div>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Dialog Footer -->
      <v-card-actions class="pa-3 px-5 bg-slate-50 d-flex justify-space-between flex-shrink-0">
        <div>
          <v-btn
            v-if="currentStep === 2"
            variant="text"
            size="small"
            prepend-icon="mdi-arrow-left"
            @click="currentStep = 1"
          >
            {{ t('importComponentsPackageModal.backToFileSelect') }}
          </v-btn>
          <v-btn
            v-else-if="currentStep === 3"
            variant="text"
            size="small"
            prepend-icon="mdi-arrow-left"
            @click="currentStep = 2"
          >
            {{ t('importComponentsPackageModal.backToComponents') }}
          </v-btn>
        </div>

        <div class="d-flex align-center gap-2">
          <v-btn variant="text" size="small" @click="closeDialog">
            {{ t('common.cancel') }}
          </v-btn>

          <v-btn
            v-if="currentStep === 2 && relevantPackages.length > 0"
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold px-4"
            append-icon="mdi-arrow-right"
            :disabled="selectedComponentsCount === 0"
            @click="currentStep = 3"
          >
            {{ t('importComponentsPackageModal.nextMatchPackages', { count: relevantPackages.length }) }}
          </v-btn>

          <v-btn
            v-if="currentStep === 3 || (currentStep === 2 && relevantPackages.length === 0)"
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold px-4"
            prepend-icon="mdi-package-down"
            :loading="importing"
            :disabled="selectedComponentsCount === 0"
            @click="executeImport"
          >
            {{ t('importComponentsPackageModal.importBtn', { count: selectedComponentsCount }) }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>

    <!-- Full Size Lightbox for Component Photos and Package Drawings -->
    <MediaLightboxDialog
      v-model="lightbox.show"
      :type="lightbox.type"
      :src="lightbox.src"
      :title="lightbox.title"
    />
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import MediaImage from './MediaImage.vue';
import MediaLightboxDialog from './MediaLightboxDialog.vue';

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'imported']);

const currentStep = ref(1);
const uploadFile = ref(null);
const parsing = ref(false);
const importing = ref(false);
const importStock = ref(true);

const tempFileId = ref(null);
const importedComponents = ref([]);
const importedPackages = ref([]);
const existingComponents = ref([]);
const existingPackages = ref([]);

const componentSearch = ref('');
const packageSearch = ref('');

// Lightbox state for component photos & package drawings
const lightbox = ref({
  show: false,
  type: 'component',
  src: null,
  title: ''
});

const openComponentPhotoPreview = (item) => {
  const src = item.photoPreviewDataUrl || item.photoURL;
  if (!src) return;
  lightbox.value = {
    show: true,
    type: 'component',
    src,
    title: item.component
  };
};

const openPackageDrawingPreview = (pkg) => {
  const src = pkg.previewDataUrl || pkg.drawingURL;
  if (!src) return;
  lightbox.value = {
    show: true,
    type: 'package',
    src,
    title: `${pkg.package} (${pkg.drawingURL || 'drawing'})`
  };
};

const formatCustomFieldsTooltip = (fields) => {
  if (!Array.isArray(fields)) return '';
  return fields
    .map(f => `${f.fieldLabel || f.fieldName}: ${f.fieldValue}${f.unit ? ' ' + f.unit : ''}`)
    .join(' • ');
};

// Component Computed Stats & Filtering
const filteredComponents = computed(() => {
  const q = (componentSearch.value || '').trim().toLowerCase();
  if (!q) return importedComponents.value;
  return importedComponents.value.filter(c =>
    (c.component || '').toLowerCase().includes(q) ||
    (c.marking || '').toLowerCase().includes(q) ||
    (c.category || '').toLowerCase().includes(q) ||
    (c.package || '').toLowerCase().includes(q) ||
    (c.description || '').toLowerCase().includes(q)
  );
});

const selectedComponentsCount = computed(() =>
  importedComponents.value.filter(c => c.selected).length
);

const allComponentsSelected = computed(() =>
  importedComponents.value.length > 0 && selectedComponentsCount.value === importedComponents.value.length
);

const someComponentsSelected = computed(() =>
  selectedComponentsCount.value > 0
);

const matchedComponentsCount = computed(() =>
  importedComponents.value.filter(c => c.matchType === 'exact' || c.matchType === 'suggested').length
);

const newComponentsCount = computed(() =>
  importedComponents.value.filter(c => c.matchType === 'none').length
);

const photosCount = computed(() =>
  importedComponents.value.filter(c => c.hasPhotoInZip || c.photoURL).length
);

// Packages relevant to the currently selected components in Step 2
const relevantPackages = computed(() => {
  const selectedPkgNames = new Set(
    importedComponents.value
      .filter(c => c.selected && c.package)
      .map(c => c.package.trim().toLowerCase())
  );
  if (selectedPkgNames.size === 0) return [];
  return importedPackages.value.filter(p =>
    p.package && selectedPkgNames.has(p.package.trim().toLowerCase())
  );
});

const filteredPackages = computed(() => {
  const q = (packageSearch.value || '').trim().toLowerCase();
  if (!q) return relevantPackages.value;
  return relevantPackages.value.filter(p =>
    (p.package || '').toLowerCase().includes(q) ||
    (p.drawingURL || '').toLowerCase().includes(q)
  );
});

const matchedPackagesCount = computed(() =>
  relevantPackages.value.filter(p => p.matchType === 'exact' || p.matchType === 'suggested').length
);

const newPackagesCount = computed(() =>
  relevantPackages.value.filter(p => p.matchType === 'none').length
);

const drawingsCount = computed(() =>
  relevantPackages.value.filter(p => p.hasDrawingInZip || p.drawingURL).length
);

// Step navigation & helper actions
const goToStep = (step) => {
  if (step > 1 && importedComponents.value.length === 0) return;
  currentStep.value = step;
};

const toggleSelectAllComponents = (val) => {
  const target = !!val;
  importedComponents.value.forEach(c => {
    c.selected = target;
  });
};

const mapAllExactComponents = () => {
  importedComponents.value.forEach(item => {
    if (item.matchType === 'exact' || item.matchType === 'suggested') {
      const cleanName = (item.component || '').trim().toLowerCase();
      const cleanPkg = (item.package || '').trim().toLowerCase();
      let matched = existingComponents.value.find(ec =>
        (ec.component || '').trim().toLowerCase() === cleanName &&
        (ec.package || '').trim().toLowerCase() === cleanPkg
      );
      if (!matched) {
        matched = existingComponents.value.find(ec =>
          (ec.component || '').trim().toLowerCase() === cleanName
        );
      }
      if (matched) {
        item.targetComponentId = matched.ID;
        item.action = 'update';
        item.selected = true;
      }
    }
  });
};

const setAllComponentsToCreateNew = () => {
  importedComponents.value.forEach(item => {
    item.action = 'create';
    item.targetComponentId = null;
    item.selected = true;
  });
};

const setComponentRowToUpdate = (item) => {
  item.action = 'update';
  if (!item.targetComponentId && existingComponents.value.length > 0) {
    const cleanName = (item.component || '').trim().toLowerCase();
    const matched = existingComponents.value.find(ec =>
      (ec.component || '').trim().toLowerCase() === cleanName
    );
    item.targetComponentId = matched ? matched.ID : existingComponents.value[0].ID;
  }
};

const mapAllExactPackages = () => {
  relevantPackages.value.forEach(pkg => {
    const cleanTarget = (pkg.package || '').trim().toLowerCase();
    const matched = existingPackages.value.find(ep =>
      ep.package.trim().toLowerCase() === cleanTarget
    );
    if (matched) {
      pkg.targetPackageId = matched.ID;
      pkg.action = 'update';
    }
  });
};

const setAllPackagesToCreateNew = () => {
  relevantPackages.value.forEach(pkg => {
    pkg.action = 'create';
    pkg.targetPackageId = null;
  });
};

const setPackageRowToUpdate = (pkg) => {
  pkg.action = 'update';
  if (!pkg.targetPackageId && existingPackages.value.length > 0) {
    const cleanTarget = (pkg.package || '').trim().toLowerCase();
    const matched = existingPackages.value.find(ep =>
      ep.package.trim().toLowerCase() === cleanTarget
    );
    pkg.targetPackageId = matched ? matched.ID : existingPackages.value[0].ID;
  }
};

const parseUploadedArchive = async () => {
  if (!uploadFile.value) return;

  parsing.value = true;
  try {
    const file = Array.isArray(uploadFile.value) ? uploadFile.value[0] : uploadFile.value;
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.parseComponentsImport(formData);
    if (res && res.components) {
      tempFileId.value = res.tempFileId || null;
      importedComponents.value = res.components;
      importedPackages.value = res.packages || [];
      existingComponents.value = res.existingComponents || [];
      existingPackages.value = res.existingPackages || [];
      currentStep.value = 2;
    }
  } catch (err) {
    console.error('Failed to parse components archive:', err);
    alert(err.response?.data?.details || err.response?.data?.error || err.message);
  } finally {
    parsing.value = false;
  }
};

const executeImport = async () => {
  if (selectedComponentsCount.value === 0) return;

  importing.value = true;
  try {
    const payload = {
      tempFileId: tempFileId.value,
      importStock: importStock.value,
      components: importedComponents.value.map(c => ({
        selected: c.selected,
        component: c.component,
        marking: c.marking,
        category: c.category,
        package: c.package,
        description: c.description,
        shortDescription: c.shortDescription,
        datasheetURL: c.datasheetURL,
        photoURL: c.photoURL,
        qty: c.qty,
        minQty: c.minQty,
        customFields: c.customFields,
        warehouse: c.warehouse,
        action: c.action,
        targetComponentId: c.targetComponentId
      })),
      packages: relevantPackages.value.map(p => ({
        selected: true,
        package: p.package,
        pinQuantity: p.pinQuantity,
        isSmd: p.isSmd,
        drawingURL: p.drawingURL,
        action: p.action,
        targetPackageId: p.targetPackageId
      }))
    };

    const res = await api.executeComponentsImport(payload);
    emit('imported', res);
    closeDialog();
  } catch (err) {
    console.error('Failed to execute components import:', err);
    alert(err.response?.data?.details || err.response?.data?.error || err.message);
  } finally {
    importing.value = false;
  }
};

const resetState = () => {
  currentStep.value = 1;
  uploadFile.value = null;
  tempFileId.value = null;
  importedComponents.value = [];
  importedPackages.value = [];
  componentSearch.value = '';
  packageSearch.value = '';
};

const closeDialog = () => {
  emit('update:modelValue', false);
  setTimeout(resetState, 200);
};

watch(() => props.modelValue, (val) => {
  if (!val) {
    setTimeout(resetState, 200);
  }
});
</script>

<style scoped>
.data-table th {
  background-color: #f8fafc !important;
  color: #334155 !important;
  white-space: nowrap;
}

.target-select :deep(.v-field__input) {
  padding-top: 4px;
  padding-bottom: 4px;
  min-height: 32px;
}

.hover-underline:hover {
  text-decoration: underline;
}

.hover-icon:hover {
  color: #2563eb !important;
}

.hover-zoom {
  transition: transform 0.15s ease;
}

.hover-zoom:hover {
  transform: scale(1.1);
}
</style>

