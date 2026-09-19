<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1280"
    width="95vw"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-0 border bg-white d-flex flex-column" style="max-height: 90vh;">
      <!-- Dialog Header -->
      <v-card-item class="bg-slate-50 py-3 px-5 border-b flex-shrink-0">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon color="primary" class="me-2" size="26">mdi-file-delimited-outline</v-icon>
            <div>
              <div class="text-subtitle-1 font-weight-bold text-slate-900">
                {{ t('importComponentsModal.title') }}
              </div>
              <div class="text-caption text-slate-600">
                {{ t('importComponentsModal.subtitle') }}
              </div>
            </div>
          </div>

          <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
        </div>
      </v-card-item>

      <!-- Step Navigation Indicator -->
      <div class="bg-white border-b px-5 py-2 flex-shrink-0">
        <div class="d-flex align-center justify-space-between">
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
                <div class="text-caption font-weight-bold leading-tight">{{ t('importComponentsModal.step1Title') }}</div>
                <div class="text-caption text-disabled text-truncate" style="font-size: 11px;">{{ t('importComponentsModal.step1Subtitle') }}</div>
              </div>
            </div>

            <v-icon color="grey-lighten-2" size="16">mdi-chevron-right</v-icon>

            <!-- Step 2 Indicator -->
            <div
              class="d-flex align-center py-1 px-2 rounded"
              :class="[
                currentStep === 2 ? 'bg-primary-lighten-5 font-weight-bold text-primary' : 'text-slate-600',
                parsedRows.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              ]"
              @click="parsedRows.length > 0 && goToStep(2)"
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
                <div class="text-caption font-weight-bold leading-tight">{{ t('importComponentsModal.step2Title') }}</div>
                <div class="text-caption text-disabled text-truncate" style="font-size: 11px;">{{ t('importComponentsModal.step2Subtitle') }}</div>
              </div>
            </div>

            <v-icon color="grey-lighten-2" size="16">mdi-chevron-right</v-icon>

            <!-- Step 3 Indicator -->
            <div
              class="d-flex align-center py-1 px-2 rounded"
              :class="[
                currentStep === 3 ? 'bg-primary-lighten-5 font-weight-bold text-primary' : 'text-slate-600',
                parsedRows.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              ]"
              @click="parsedRows.length > 0 && goToStep(3)"
            >
              <v-avatar
                size="24"
                :color="currentStep === 3 ? 'primary' : 'grey-lighten-2'"
                class="me-2 text-caption text-white font-weight-bold"
              >
                <span>3</span>
              </v-avatar>
              <div>
                <div class="text-caption font-weight-bold leading-tight">{{ t('importComponentsModal.step3Title') }}</div>
                <div class="text-caption text-disabled text-truncate" style="font-size: 11px;">{{ t('importComponentsModal.step3Subtitle') }}</div>
              </div>
            </div>
          </div>

          <!-- Quick Template Download in Header -->
          <v-btn
            variant="tonal"
            color="primary"
            size="small"
            prepend-icon="mdi-download"
            class="font-weight-medium"
            :loading="downloadingTemplate"
            @click="downloadTemplate"
          >
            {{ t('importComponentsModal.downloadTemplate') }}
          </v-btn>
        </div>
      </div>

      <!-- Dialog Body -->
      <v-card-text class="pa-0 flex-grow-1 overflow-y-auto">
        <!-- ========================================== -->
        <!-- STEP 1: FILE UPLOAD & PREVIEW PARSE       -->
        <!-- ========================================== -->
        <div v-if="currentStep === 1" class="pa-5">
          <!-- Dropzone -->
          <div
            class="dropzone-box border-dashed rounded text-center pa-8 mb-6 transition-colors"
            :class="isDragging ? 'bg-primary-lighten-5 border-primary' : 'bg-slate-50 border-slate-300'"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onFileDrop"
            @click="triggerFileInput"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept=".csv,.tsv,.txt"
              class="d-none"
              @change="onFileSelected"
            />
            <v-icon size="48" color="primary" class="mb-3">mdi-cloud-upload-outline</v-icon>
            <div class="text-subtitle-1 font-weight-bold text-slate-900 mb-1">
              {{ t('importComponentsModal.dropzoneTitle') }}
            </div>
            <div class="text-caption text-slate-500 mb-4">
              {{ t('importComponentsModal.dropzoneSubtitle') }}
            </div>
            <div class="d-flex justify-center pb-2">
              <v-btn
                color="primary"
                variant="flat"
                size="small"
                class="font-weight-bold px-5"
                prepend-icon="mdi-folder-open-outline"
                @click.stop="triggerFileInput"
              >
                {{ t('importComponentsModal.chooseFile') }}
              </v-btn>
            </div>
          </div>

          <!-- File Info Banner if loaded -->
          <div v-if="loadedFileName" class="d-flex align-center justify-space-between bg-surface-variant px-4 py-2 rounded-0 border mb-4">
            <div class="d-flex align-center gap-2">
              <v-icon color="success" size="20">mdi-check-circle-outline</v-icon>
              <span class="text-body-2 font-weight-bold text-slate-900">
                {{ t('importComponentsModal.fileParsed', { name: loadedFileName, count: parsedRows.length }) }}
              </span>
              <v-chip size="x-small" color="secondary" variant="flat" class="font-mono ms-2">
                {{ t('importComponentsModal.delimiterDetected', { delimiter: detectedDelimiterDisplay }) }}
              </v-chip>
            </div>
            <v-btn
              icon="mdi-refresh"
              size="x-small"
              variant="text"
              color="slate-600"
              @click="triggerFileInput"
            />
          </div>

          <!-- Initial Preview Table (First 10 rows) -->
          <div v-if="parsedRows.length > 0">
            <div class="text-caption font-weight-bold text-slate-700 mb-2">
              Preview (first {{ Math.min(10, parsedRows.length) }} of {{ parsedRows.length }} rows):
            </div>
            <div class="border overflow-x-auto">
              <v-table density="compact" class="text-caption text-no-wrap">
                <thead>
                  <tr class="bg-slate-100">
                    <th class="font-weight-bold py-2">#</th>
                    <th class="font-weight-bold py-2">{{ t('importComponentsModal.colPart') }}</th>
                    <th class="font-weight-bold py-2">{{ t('importComponentsModal.colCategory') }}</th>
                    <th class="font-weight-bold py-2">{{ t('importComponentsModal.colPackage') }}</th>
                    <th class="font-weight-bold py-2">{{ t('importComponentsModal.colMarking') }}</th>
                    <th class="font-weight-bold py-2 text-right">{{ t('importComponentsModal.colStock') }}</th>
                    <th class="font-weight-bold py-2 text-right">{{ t('importComponentsModal.colMinStock') }}</th>
                    <th class="font-weight-bold py-2">{{ t('importComponentsModal.colStorage') }}</th>
                    <th class="font-weight-bold py-2">{{ t('importComponentsModal.colDescription') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, idx) in parsedRows.slice(0, 10)" :key="idx" class="hover:bg-slate-50">
                    <td class="text-disabled">{{ idx + 1 }}</td>
                    <td class="font-weight-bold text-primary">{{ r.component }}</td>
                    <td>{{ r.category || '—' }}</td>
                    <td>{{ r.package || '—' }}</td>
                    <td class="font-mono">{{ r.marking || '—' }}</td>
                    <td class="text-right font-weight-bold">{{ r.qty }}</td>
                    <td class="text-right text-slate-500">{{ r.minQty }}</td>
                    <td>{{ r.storage || '—' }}</td>
                    <td class="text-truncate" style="max-width: 250px;">{{ r.description || r.shortDescription || '—' }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>
          <div v-else-if="loadedFileName && parsedRows.length === 0" class="text-center py-6 text-warning">
            <v-icon size="32" class="mb-2">mdi-alert-circle-outline</v-icon>
            <div>{{ t('importComponentsModal.noComponentsInFile') }}</div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- STEP 2: CATEGORY & PACKAGE MAPPING        -->
        <!-- ========================================== -->
        <div v-else-if="currentStep === 2" class="d-flex flex-column h-100">
          <v-tabs v-model="mappingTab" color="primary" density="compact" class="border-b px-4 bg-slate-50">
            <v-tab value="categories" class="text-caption font-weight-bold">
              <v-icon start size="16">mdi-shape-outline</v-icon>
              {{ t('importComponentsModal.categoriesMappingTab', { count: uniqueCsvCategories.length }) }}
            </v-tab>
            <v-tab value="packages" class="text-caption font-weight-bold">
              <v-icon start size="16">mdi-chip</v-icon>
              {{ t('importComponentsModal.packagesMappingTab', { count: uniqueCsvPackages.length }) }}
            </v-tab>
          </v-tabs>

          <v-window v-model="mappingTab" class="flex-grow-1 overflow-y-auto pa-5">
            <!-- TAB A: CATEGORIES MAPPING -->
            <v-window-item value="categories">
              <div class="border overflow-x-auto">
                <v-table density="compact" class="text-caption">
                  <thead>
                    <tr class="bg-slate-100">
                      <th class="font-weight-bold py-2" style="width: 220px;">{{ t('importComponentsModal.categoryCsvName') }}</th>
                      <th class="font-weight-bold py-2" style="width: 180px;">{{ t('importComponentsModal.mappingAction') }}</th>
                      <th class="font-weight-bold py-2">{{ t('importComponentsModal.targetCategory') }}</th>
                      <th class="font-weight-bold py-2 text-right" style="width: 140px;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="cat in categoryMappings" :key="cat.csvCategory" class="hover:bg-slate-50">
                      <td class="font-weight-bold text-slate-800">
                        <v-icon size="14" class="me-1 text-slate-400">mdi-tag-outline</v-icon>
                        {{ cat.csvCategory }}
                        <span class="text-disabled font-weight-normal ms-1">({{ cat.usageCount }})</span>
                      </td>
                      <td>
                        <v-select
                          v-model="cat.action"
                          :items="categoryActionOptions"
                          density="compact"
                          variant="outlined"
                          hide-details
                          class="bg-white"
                          style="min-width: 160px;"
                          @update:model-value="onCategoryActionChange(cat)"
                        />
                      </td>
                      <td>
                        <!-- If map to existing: select dropdown -->
                        <div v-if="cat.action === 'existing'" class="d-flex align-center gap-2">
                          <v-select
                            v-model="cat.categoryId"
                            :items="categories"
                            item-title="category"
                            item-value="ID"
                            density="compact"
                            variant="outlined"
                            hide-details
                            class="bg-white flex-grow-1"
                            placeholder="Select existing category..."
                          />
                        </div>

                        <!-- If create new: text field -->
                        <div v-else-if="cat.action === 'create'" class="d-flex align-center gap-2">
                          <v-text-field
                            v-model="cat.newCategoryName"
                            density="compact"
                            variant="outlined"
                            hide-details
                            class="bg-white flex-grow-1"
                            placeholder="New category name"
                          />
                        </div>

                        <!-- If skip -->
                        <span v-else class="text-slate-400 italic">
                          {{ t('importComponentsModal.skipped') }}
                        </span>
                      </td>
                      <td class="text-right">
                        <v-chip
                          size="x-small"
                          :color="cat.action === 'existing' ? 'success' : (cat.action === 'create' ? 'info' : 'default')"
                          variant="tonal"
                          class="font-weight-medium"
                        >
                          {{ cat.action === 'existing' ? t('importComponentsModal.matchedExisting') : (cat.action === 'create' ? t('importComponentsModal.willBeCreated') : t('importComponentsModal.skipped')) }}
                        </v-chip>
                      </td>
                    </tr>
                    <tr v-if="categoryMappings.length === 0">
                      <td colspan="4" class="text-center py-4 text-slate-500">
                        No categories found in imported CSV rows.
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </v-window-item>

            <!-- TAB B: PACKAGES MAPPING -->
            <v-window-item value="packages">
              <div class="border overflow-x-auto">
                <v-table density="compact" class="text-caption">
                  <thead>
                    <tr class="bg-slate-100">
                      <th class="font-weight-bold py-2" style="width: 200px;">{{ t('importComponentsModal.packageCsvName') }}</th>
                      <th class="font-weight-bold py-2" style="width: 170px;">{{ t('importComponentsModal.mappingAction') }}</th>
                      <th class="font-weight-bold py-2">{{ t('importComponentsModal.targetPackage') }}</th>
                      <th class="font-weight-bold py-2 text-right" style="width: 140px;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="pkg in packageMappings" :key="pkg.csvPackage" class="hover:bg-slate-50">
                      <td class="font-weight-bold text-slate-800">
                        <v-icon size="14" class="me-1 text-slate-400">mdi-chip</v-icon>
                        {{ pkg.csvPackage }}
                        <span class="text-disabled font-weight-normal ms-1">({{ pkg.usageCount }})</span>
                      </td>
                      <td>
                        <v-select
                          v-model="pkg.action"
                          :items="packageActionOptions"
                          density="compact"
                          variant="outlined"
                          hide-details
                          class="bg-white"
                          style="min-width: 150px;"
                          @update:model-value="onPackageActionChange(pkg)"
                        />
                      </td>
                      <td>
                        <!-- If map to existing: select dropdown -->
                        <div v-if="pkg.action === 'existing'" class="d-flex align-center gap-2">
                          <v-autocomplete
                            v-model="pkg.packageId"
                            :items="packages"
                            item-title="package"
                            item-value="ID"
                            density="compact"
                            variant="outlined"
                            hide-details
                            class="bg-white flex-grow-1"
                            placeholder="Select existing package footprint..."
                          >
                            <template #item="{ props, item }">
                              <v-list-item v-bind="props" :title="item.raw.package">
                                <template #append>
                                  <v-chip size="x-small" :color="item.raw.isSmd ? 'secondary' : 'default'" variant="flat">
                                    {{ item.raw.isSmd ? 'SMD' : 'THT' }}
                                  </v-chip>
                                  <span v-if="item.raw.pinQuantity" class="text-caption text-disabled ms-2">
                                    {{ item.raw.pinQuantity }} pins
                                  </span>
                                </template>
                              </v-list-item>
                            </template>
                          </v-autocomplete>
                        </div>

                        <!-- If create new: name, mount toggle, pins -->
                        <div v-else-if="pkg.action === 'create'" class="d-flex align-center gap-2 flex-wrap">
                          <v-text-field
                            v-model="pkg.newPackageName"
                            density="compact"
                            variant="outlined"
                            hide-details
                            class="bg-white flex-grow-1"
                            style="min-width: 180px;"
                            placeholder="New footprint name"
                          />
                          <v-btn-toggle
                            v-model="pkg.isSmd"
                            density="compact"
                            variant="outlined"
                            mandatory
                            rounded="lg"
                            color="primary"
                            style="height: 38px;"
                          >
                            <v-btn :value="1" size="x-small" class="px-2">{{ t('importComponentsModal.smd') }}</v-btn>
                            <v-btn :value="0" size="x-small" class="px-2">{{ t('importComponentsModal.tht') }}</v-btn>
                          </v-btn-toggle>
                          <v-text-field
                            v-model.number="pkg.pinQuantity"
                            type="number"
                            min="0"
                            density="compact"
                            variant="outlined"
                            hide-details
                            class="bg-white"
                            style="width: 85px;"
                            :label="t('importComponentsModal.pinCount')"
                          />
                        </div>

                        <!-- If skip -->
                        <span v-else class="text-slate-400 italic">
                          {{ t('importComponentsModal.skipped') }}
                        </span>
                      </td>
                      <td class="text-right">
                        <v-chip
                          size="x-small"
                          :color="pkg.action === 'existing' ? 'success' : (pkg.action === 'create' ? 'info' : 'default')"
                          variant="tonal"
                          class="font-weight-medium"
                        >
                          {{ pkg.action === 'existing' ? t('importComponentsModal.matchedExisting') : (pkg.action === 'create' ? t('importComponentsModal.willBeCreated') : t('importComponentsModal.skipped')) }}
                        </v-chip>
                      </td>
                    </tr>
                    <tr v-if="packageMappings.length === 0">
                      <td colspan="4" class="text-center py-4 text-slate-500">
                        No packages found in imported CSV rows.
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </v-window-item>
          </v-window>
        </div>

        <!-- ========================================== -->
        <!-- STEP 3: PREVIEW & EXECUTE IMPORT          -->
        <!-- ========================================== -->
        <div v-else-if="currentStep === 3" class="pa-5">
          <!-- Duplicate Strategy Card -->
          <v-card elevation="0" class="border rounded-0 pa-4 mb-4 bg-slate-50">
            <div class="d-flex align-center mb-1">
              <v-icon color="warning" class="me-2" size="20">mdi-content-copy</v-icon>
              <span class="text-subtitle-2 font-weight-bold text-slate-900">
                {{ t('importComponentsModal.duplicateHandlingTitle') }}
              </span>
            </div>
            <div class="text-caption text-slate-600 mb-3">
              {{ t('importComponentsModal.duplicateHandlingSubtitle') }}
            </div>

            <v-radio-group v-model="duplicateHandling" density="compact" hide-details>
              <v-radio
                value="skip"
                color="primary"
                class="mb-1"
              >
                <template #label>
                  <div>
                    <span class="font-weight-bold text-body-2">{{ t('importComponentsModal.duplicateSkip') }}</span>
                  </div>
                </template>
              </v-radio>
              <v-radio
                value="updateStock"
                color="primary"
                class="mb-1"
              >
                <template #label>
                  <div>
                    <span class="font-weight-bold text-body-2">{{ t('importComponentsModal.duplicateUpdateStock') }}</span>
                  </div>
                </template>
              </v-radio>
              <v-radio
                value="createAnyway"
                color="primary"
              >
                <template #label>
                  <div>
                    <span class="font-weight-bold text-body-2">{{ t('importComponentsModal.duplicateCreateAnyway') }}</span>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
          </v-card>

          <!-- Summary Stats -->
          <v-row dense class="mb-4">
            <v-col cols="12" sm="4">
              <v-card elevation="0" class="border rounded-0 pa-3 bg-slate-50 d-flex align-center">
                <v-icon color="primary" class="me-3" size="28">mdi-memory</v-icon>
                <div>
                  <div class="text-caption text-slate-500">Components to Import</div>
                  <div class="text-subtitle-1 font-weight-bold text-slate-900">{{ parsedRows.length }}</div>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="4">
              <v-card elevation="0" class="border rounded-0 pa-3 bg-slate-50 d-flex align-center">
                <v-icon color="info" class="me-3" size="28">mdi-shape-plus</v-icon>
                <div>
                  <div class="text-caption text-slate-500">New Categories</div>
                  <div class="text-subtitle-1 font-weight-bold text-slate-900">{{ newCategoriesCount }}</div>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="4">
              <v-card elevation="0" class="border rounded-0 pa-3 bg-slate-50 d-flex align-center">
                <v-icon color="secondary" class="me-3" size="28">mdi-chip</v-icon>
                <div>
                  <div class="text-caption text-slate-500">New Packages</div>
                  <div class="text-subtitle-1 font-weight-bold text-slate-900">{{ newPackagesCount }}</div>
                </div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Final Review Table -->
          <div class="text-caption font-weight-bold text-slate-700 mb-2">
            Import Preview (showing up to 50 rows):
          </div>
          <div class="border overflow-x-auto" style="max-height: 320px;">
            <v-table density="compact" class="text-caption text-no-wrap">
              <thead class="sticky-top bg-slate-100">
                <tr>
                  <th class="font-weight-bold py-2">#</th>
                  <th class="font-weight-bold py-2">{{ t('importComponentsModal.colPart') }}</th>
                  <th class="font-weight-bold py-2">{{ t('importComponentsModal.colCategory') }}</th>
                  <th class="font-weight-bold py-2">{{ t('importComponentsModal.colPackage') }}</th>
                  <th class="font-weight-bold py-2">{{ t('importComponentsModal.colMarking') }}</th>
                  <th class="font-weight-bold py-2 text-right">{{ t('importComponentsModal.colStock') }}</th>
                  <th class="font-weight-bold py-2 text-right">{{ t('importComponentsModal.colMinStock') }}</th>
                  <th class="font-weight-bold py-2">{{ t('importComponentsModal.colStorage') }}</th>
                  <th class="font-weight-bold py-2">{{ t('importComponentsModal.colDescription') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, idx) in parsedRows.slice(0, 50)" :key="idx" class="hover:bg-slate-50">
                  <td class="text-disabled">{{ idx + 1 }}</td>
                  <td class="font-weight-bold text-primary">{{ r.component }}</td>
                  <td>
                    <span v-if="getResolvedCategoryName(r.category)">
                      {{ getResolvedCategoryName(r.category) }}
                    </span>
                    <span v-else class="text-disabled">—</span>
                  </td>
                  <td>
                    <span v-if="getResolvedPackageName(r.package)">
                      {{ getResolvedPackageName(r.package) }}
                    </span>
                    <span v-else class="text-disabled">—</span>
                  </td>
                  <td class="font-mono">{{ r.marking || '—' }}</td>
                  <td class="text-right font-weight-bold">{{ r.qty }}</td>
                  <td class="text-right text-slate-500">{{ r.minQty }}</td>
                  <td>{{ r.storage || '—' }}</td>
                  <td class="text-truncate" style="max-width: 250px;">{{ r.description || r.shortDescription || '—' }}</td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </div>
      </v-card-text>

      <!-- Dialog Footer -->
      <v-card-actions class="bg-slate-50 border-t py-3 px-5 d-flex justify-space-between flex-shrink-0">
        <div>
          <v-btn
            v-if="currentStep > 1"
            variant="outlined"
            size="small"
            prepend-icon="mdi-arrow-left"
            :disabled="importing"
            @click="currentStep--"
          >
            {{ t('importComponentsModal.btnBack') }}
          </v-btn>
        </div>

        <div class="d-flex align-center gap-2">
          <v-btn
            variant="text"
            size="small"
            :disabled="importing"
            @click="closeDialog"
          >
            {{ t('importComponentsModal.btnCancel') }}
          </v-btn>

          <v-btn
            v-if="currentStep < 3"
            color="primary"
            variant="flat"
            size="small"
            append-icon="mdi-arrow-right"
            class="font-weight-bold"
            :disabled="parsedRows.length === 0"
            @click="goToNextStep"
          >
            {{ t('importComponentsModal.btnNext') }}
          </v-btn>

          <v-btn
            v-else
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="mdi-cloud-upload"
            class="font-weight-bold"
            :loading="importing"
            :disabled="parsedRows.length === 0"
            @click="executeImport"
          >
            {{ t('importComponentsModal.btnStartImport', { count: parsedRows.length }) }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  categories: {
    type: Array,
    default: () => []
  },
  packages: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'imported', 'catalog-updated', 'notify']);

// Wizard step: 1, 2, 3
const currentStep = ref(1);
const mappingTab = ref('categories');

// Step 1 state
const isDragging = ref(false);
const fileInputRef = ref(null);
const loadedFileName = ref('');
const detectedDelimiter = ref(',');
const parsedRows = ref([]);
const downloadingTemplate = ref(false);

// Step 2 state: Mappings
const categoryMappings = ref([]);
const packageMappings = ref([]);

// Step 3 state
const duplicateHandling = ref('skip');
const importing = ref(false);

const categoryActionOptions = computed(() => [
  { title: t('importComponentsModal.actionExisting'), value: 'existing' },
  { title: t('importComponentsModal.actionCreate'), value: 'create' },
  { title: t('importComponentsModal.actionSkip'), value: 'skip' }
]);

const packageActionOptions = computed(() => [
  { title: t('importComponentsModal.actionExisting'), value: 'existing' },
  { title: t('importComponentsModal.actionCreate'), value: 'create' },
  { title: t('importComponentsModal.actionSkip'), value: 'skip' }
]);

const detectedDelimiterDisplay = computed(() => {
  if (detectedDelimiter.value === '\t') return 'Tab (TSV)';
  if (detectedDelimiter.value === ';') return 'Semicolon (;)';
  return 'Comma (,)';
});

const uniqueCsvCategories = computed(() => {
  return categoryMappings.value.map(c => c.csvCategory);
});

const uniqueCsvPackages = computed(() => {
  return packageMappings.value.map(p => p.csvPackage);
});

const newCategoriesCount = computed(() => {
  return categoryMappings.value.filter(c => c.action === 'create' && c.newCategoryName && c.newCategoryName.trim()).length;
});

const newPackagesCount = computed(() => {
  return packageMappings.value.filter(p => p.action === 'create' && p.newPackageName && p.newPackageName.trim()).length;
});

// Watch dialog open
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    resetState();
  }
});

function resetState() {
  currentStep.value = 1;
  mappingTab.value = 'categories';
  isDragging.value = false;
  loadedFileName.value = '';
  detectedDelimiter.value = ',';
  parsedRows.value = [];
  categoryMappings.value = [];
  packageMappings.value = [];
  duplicateHandling.value = 'skip';
  importing.value = false;
}

function closeDialog() {
  emit('update:modelValue', false);
}

function goToStep(step) {
  if (step === 2 && parsedRows.value.length === 0) return;
  if (step === 3 && parsedRows.value.length === 0) return;
  currentStep.value = step;
}

function goToNextStep() {
  if (currentStep.value === 1) {
    buildMappings();
    currentStep.value = 2;
  } else if (currentStep.value === 2) {
    currentStep.value = 3;
  }
}

// Download template
async function downloadTemplate() {
  try {
    downloadingTemplate.value = true;
    const blobData = await api.downloadComponentsTemplate();
    const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'components_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Error downloading template:', err);
    emit('notify', { text: t('importComponentsModal.downloadTemplateError'), color: 'error' });
  } finally {
    downloadingTemplate.value = false;
  }
}

// File drop & select
function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

function onFileDrop(e) {
  isDragging.value = false;
  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    processFile(files[0]);
  }
}

function onFileSelected(e) {
  const files = e.target.files;
  if (files && files.length > 0) {
    processFile(files[0]);
  }
}

// CSV Parser
function processFile(file) {
  if (!file) return;
  loadedFileName.value = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    let content = e.target.result || '';
    // Strip UTF-8 BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    parseCsvContent(content);
  };
  reader.readAsText(file, 'UTF-8');
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r\n|\n|\r/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
  if (semicolonCount > commaCount) return ';';
  return ',';
}

function parseCsvRows(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        row.push(cell.trim());
        cell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        row.push(cell.trim());
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
        cell = '';
      } else if (char === '\n') {
        row.push(cell.trim());
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    if (row.some(c => c !== '')) rows.push(row);
  }

  return rows;
}

function parseCsvContent(content) {
  const delim = detectDelimiter(content);
  detectedDelimiter.value = delim;

  const rawRows = parseCsvRows(content, delim);
  if (rawRows.length < 2) {
    parsedRows.value = [];
    return;
  }

  // First row is headers
  const headers = rawRows[0].map(h => h.trim().toLowerCase().replace(/[\s_-]+/g, ''));

  // Header column index finder
  const findCol = (aliases) => {
    for (const alias of aliases) {
      const idx = headers.findIndex(h => h === alias || h.includes(alias));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const compIdx = findCol(['component', 'partnumber', 'part', 'name']);
  const catIdx = findCol(['category', 'cat']);
  const pkgIdx = findCol(['package', 'footprint', 'pkg']);
  const markIdx = findCol(['marking', 'code', 'mark']);
  const shortDescIdx = findCol(['shortdescription', 'summary']);
  const descIdx = findCol(['description', 'desc', 'details', 'comment']);
  const qtyIdx = findCol(['qty', 'quantity', 'stock', 'count']);
  const minQtyIdx = findCol(['minqty', 'minimumqty', 'minstock', 'min']);
  const storeIdx = findCol(['storage', 'bin', 'location', 'drawer', 'box']);
  const smdIdx = findCol(['issmd', 'smd', 'mount']);
  const pinsIdx = findCol(['pins', 'pinquantity', 'pincount']);

  const items = [];
  for (let i = 1; i < rawRows.length; i++) {
    const r = rawRows[i];
    const compName = compIdx !== -1 && r[compIdx] ? r[compIdx].trim() : '';
    if (!compName) continue; // skip row without part name

    const catName = catIdx !== -1 && r[catIdx] ? r[catIdx].trim() : '';
    const pkgName = pkgIdx !== -1 && r[pkgIdx] ? r[pkgIdx].trim() : '';
    const marking = markIdx !== -1 && r[markIdx] ? r[markIdx].trim() : '';
    const shortDesc = shortDescIdx !== -1 && r[shortDescIdx] ? r[shortDescIdx].trim() : '';
    const desc = descIdx !== -1 && r[descIdx] ? r[descIdx].trim() : '';
    const qty = qtyIdx !== -1 && r[qtyIdx] ? (parseInt(r[qtyIdx], 10) || 0) : 0;
    const minQty = minQtyIdx !== -1 && r[minQtyIdx] ? (parseInt(r[minQtyIdx], 10) || 0) : 0;
    const storage = storeIdx !== -1 && r[storeIdx] ? r[storeIdx].trim() : '';

    let isSmd = 0;
    if (smdIdx !== -1 && r[smdIdx]) {
      const v = r[smdIdx].trim().toLowerCase();
      if (v === '1' || v === 'true' || v === 'smd' || v === 'yes') isSmd = 1;
    }

    let pins = 0;
    if (pinsIdx !== -1 && r[pinsIdx]) {
      pins = parseInt(r[pinsIdx], 10) || 0;
    }

    items.push({
      component: compName,
      category: catName,
      package: pkgName,
      marking,
      shortDescription: shortDesc,
      description: desc,
      qty,
      minQty,
      storage,
      isSmd,
      pins
    });
  }

  parsedRows.value = items;
}

// Build Mappings for Step 2
function buildMappings() {
  // 1. Categories
  const catCountMap = new Map();
  parsedRows.value.forEach(row => {
    if (row.category) {
      const c = row.category.trim();
      catCountMap.set(c, (catCountMap.get(c) || 0) + 1);
    }
  });

  const catList = [];
  catCountMap.forEach((count, catName) => {
    // Try to auto-match with existing categories
    const matched = props.categories.find(
      c => c.category && c.category.trim().toLowerCase() === catName.toLowerCase()
    );

    if (matched) {
      catList.push({
        csvCategory: catName,
        usageCount: count,
        action: 'existing',
        categoryId: matched.ID,
        newCategoryName: catName
      });
    } else {
      catList.push({
        csvCategory: catName,
        usageCount: count,
        action: 'create',
        categoryId: null,
        newCategoryName: catName
      });
    }
  });
  categoryMappings.value = catList;

  // 2. Packages
  const pkgCountMap = new Map();
  const pkgMetaMap = new Map(); // Store guessed isSmd and pins
  parsedRows.value.forEach(row => {
    if (row.package) {
      const p = row.package.trim();
      pkgCountMap.set(p, (pkgCountMap.get(p) || 0) + 1);
      if (!pkgMetaMap.has(p)) {
        pkgMetaMap.set(p, { isSmd: row.isSmd || 0, pins: row.pins || 0 });
      }
    }
  });

  const pkgList = [];
  pkgCountMap.forEach((count, pkgName) => {
    const meta = pkgMetaMap.get(pkgName) || { isSmd: 0, pins: 0 };
    const matched = props.packages.find(
      p => p.package && p.package.trim().toLowerCase() === pkgName.toLowerCase()
    );

    if (matched) {
      pkgList.push({
        csvPackage: pkgName,
        usageCount: count,
        action: 'existing',
        packageId: matched.ID,
        newPackageName: pkgName,
        isSmd: matched.isSmd ?? meta.isSmd,
        pinQuantity: matched.pinQuantity ?? meta.pins
      });
    } else {
      // Guess SMD vs THT from name heuristics if not specified
      let smd = meta.isSmd;
      const lower = pkgName.toLowerCase();
      if (!smd) {
        if (lower.includes('smd') || lower.includes('soic') || lower.includes('sop') || lower.includes('qfp') || lower.includes('qfn') || lower.includes('0603') || lower.includes('0805') || lower.includes('1206') || lower.includes('sot')) {
          smd = 1;
        }
      }

      pkgList.push({
        csvPackage: pkgName,
        usageCount: count,
        action: 'create',
        packageId: null,
        newPackageName: pkgName,
        isSmd: smd,
        pinQuantity: meta.pins || 0
      });
    }
  });
  packageMappings.value = pkgList;
}

function onCategoryActionChange(cat) {
  if (cat.action === 'existing') {
    if (!cat.categoryId) {
      const matched = props.categories.find(
        c => c.category && c.category.trim().toLowerCase() === cat.csvCategory.toLowerCase()
      );
      cat.categoryId = matched ? matched.ID : (props.categories[0]?.ID || null);
    }
  } else if (cat.action === 'create') {
    if (!cat.newCategoryName) {
      cat.newCategoryName = cat.csvCategory;
    }
  }
}

function onPackageActionChange(pkg) {
  if (pkg.action === 'existing') {
    if (!pkg.packageId) {
      const matched = props.packages.find(
        p => p.package && p.package.trim().toLowerCase() === pkg.csvPackage.toLowerCase()
      );
      pkg.packageId = matched ? matched.ID : (props.packages[0]?.ID || null);
    }
  } else if (pkg.action === 'create') {
    if (!pkg.newPackageName) {
      pkg.newPackageName = pkg.csvPackage;
    }
  }
}

// Helpers for preview resolution in Step 3
function getResolvedCategoryName(csvCat) {
  if (!csvCat) return '';
  const mapping = categoryMappings.value.find(m => m.csvCategory.toLowerCase() === csvCat.trim().toLowerCase());
  if (!mapping) return csvCat;
  if (mapping.action === 'skip') return 'Skipped';
  if (mapping.action === 'existing') {
    const found = props.categories.find(c => c.ID === mapping.categoryId);
    return found ? found.category : csvCat;
  }
  return `[New] ${mapping.newCategoryName || csvCat}`;
}

function getResolvedPackageName(csvPkg) {
  if (!csvPkg) return '';
  const mapping = packageMappings.value.find(m => m.csvPackage.toLowerCase() === csvPkg.trim().toLowerCase());
  if (!mapping) return csvPkg;
  if (mapping.action === 'skip') return 'Default (Unknown)';
  if (mapping.action === 'existing') {
    const found = props.packages.find(p => p.ID === mapping.packageId);
    return found ? found.package : csvPkg;
  }
  return `[New] ${mapping.newPackageName || csvPkg}`;
}

// Execute Import
async function executeImport() {
  try {
    importing.value = true;

    const payload = {
      components: parsedRows.value,
      categoryMappings: categoryMappings.value,
      packageMappings: packageMappings.value,
      duplicateHandling: duplicateHandling.value
    };

    const res = await api.importComponentsCsv(payload);

    if (res.success) {
      emit('notify', {
        text: t('importComponentsModal.importSuccess', {
          imported: res.importedCount,
          updated: res.updatedCount,
          skipped: res.skippedCount
        }),
        color: 'success'
      });

      if (res.createdCategoriesCount > 0 || res.createdPackagesCount > 0) {
        emit('catalog-updated');
      }

      emit('imported', res);
      closeDialog();
    } else {
      emit('notify', {
        text: t('importComponentsModal.importFailed', { error: res.error || 'Unknown error' }),
        color: 'error'
      });
    }
  } catch (err) {
    console.error('Error executing import:', err);
    emit('notify', {
      text: t('importComponentsModal.importFailed', { error: err.response?.data?.error || err.message }),
      color: 'error'
    });
  } finally {
    importing.value = false;
  }
}
</script>

<style scoped>
.dropzone-box {
  border-width: 2px;
  cursor: pointer;
  padding: 36px 24px 32px;
}
.dropzone-box:hover {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.04);
}
.sticky-top {
  position: sticky;
  top: 0;
  z-index: 2;
}
</style>
