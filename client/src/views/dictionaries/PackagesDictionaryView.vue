<template>
  <div class="packages-dictionary-view">
    <!-- Main Packages Card -->
    <v-card elevation="1" class="rounded-0 border bg-white">
      <!-- Toolbar -->
      <div class="pa-4 border-b d-flex flex-wrap align-center justify-space-between gap-3 bg-slate-50">
        <div class="d-flex flex-wrap align-center gap-3 flex-grow-1 flex-sm-grow-0">
          <!-- Search -->
          <v-text-field
            v-model="packageSearch"
            density="compact"
            variant="outlined"
            :placeholder="t('manageCatalogModal.searchPackages')"
            prepend-inner-icon="mdi-magnify"
            hide-details
            clearable
            rounded="lg"
            class="bg-white"
            style="min-width: 240px; max-width: 340px;"
          />

          <!-- Mount Technology Filter -->
          <v-btn-toggle
            v-model="packageMountFilter"
            mandatory
            density="compact"
            variant="outlined"
            color="primary"
            rounded="lg"
            class="bg-white"
          >
            <v-btn value="all" size="small" class="text-caption font-weight-bold">
              {{ t('manageCatalogModal.all') }}
            </v-btn>
            <v-btn value="smd" size="small" class="text-caption font-weight-bold">
              <v-icon start size="14">mdi-chip</v-icon>
              SMD
            </v-btn>
            <v-btn value="tht" size="small" class="text-caption font-weight-bold">
              <v-icon start size="14">mdi-circle-slice-8</v-icon>
              THT
            </v-btn>
            <v-btn value="mech" size="small" class="text-caption font-weight-bold">
              <v-icon start size="14">mdi-wrench-outline</v-icon>
              MECH
            </v-btn>
          </v-btn-toggle>

          <!-- Selection status chip -->
          <v-chip
            v-if="selectedPackageIds.length > 0"
            size="small"
            variant="tonal"
            color="primary"
            closable
            class="font-weight-bold font-mono"
            @click:close="selectedPackageIds = []"
          >
            {{ t('manageCatalogModal.selectedCount', { count: selectedPackageIds.length }) }}
          </v-chip>
        </div>

        <div class="d-flex align-center flex-wrap gap-2">
          <!-- View Mode Toggle: Table or Gallery -->
          <v-btn-toggle
            v-model="viewMode"
            mandatory
            density="compact"
            variant="outlined"
            color="primary"
            rounded="lg"
            class="bg-white"
          >
            <v-btn value="table" size="small" :title="t('manageCatalogModal.tableView')">
              <v-icon size="16">mdi-table</v-icon>
            </v-btn>
            <v-btn value="gallery" size="small" :title="t('manageCatalogModal.galleryView')">
              <v-icon size="16">mdi-view-grid</v-icon>
            </v-btn>
          </v-btn-toggle>

          <v-chip size="small" variant="tonal" color="primary" class="font-weight-bold font-mono">
            {{ filteredPackages.length }} {{ t('manageCatalogModal.packagesTab', { count: filteredPackages.length }).toLowerCase() }}
          </v-chip>

          <!-- Export Button -->
          <v-btn
            color="primary"
            variant="outlined"
            size="small"
            prepend-icon="mdi-export"
            class="font-weight-bold"
            :loading="exporting"
            @click="exportPackages"
            :title="selectedPackageIds.length > 0 ? t('manageCatalogModal.exportSelected', { count: selectedPackageIds.length }) : t('manageCatalogModal.exportAll')"
          >
            {{ selectedPackageIds.length > 0 ? t('manageCatalogModal.exportSelected', { count: selectedPackageIds.length }) : t('manageCatalogModal.exportPackages') }}
          </v-btn>

          <!-- Import Button -->
          <v-btn
            color="secondary"
            variant="outlined"
            size="small"
            prepend-icon="mdi-import"
            class="font-weight-bold"
            @click="showImportDialog = true"
            :title="t('importPackagesModal.title')"
          >
            {{ t('manageCatalogModal.importPackages') }}
          </v-btn>

          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="outlined"
            :loading="loading"
            @click="loadPackages"
            :title="t('common.refresh')"
          />

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
      </div>

      <!-- Packages Table View -->
      <v-table v-if="viewMode === 'table'" density="comfortable" hover class="data-table">
        <thead>
          <tr class="bg-slate-50 text-caption font-weight-bold">
            <!-- Select All Checkbox -->
            <th style="width: 48px;" class="text-center pa-1">
              <v-checkbox
                :model-value="allSelected"
                :indeterminate="someSelected && !allSelected"
                density="compact"
                hide-details
                color="primary"
                @update:model-value="toggleSelectAll"
              />
            </th>

            <!-- ID Column (Sortable) -->
            <th
              style="width: 80px;"
              class="text-center font-weight-bold cursor-pointer user-select-none hover-header"
              :title="getHeaderTitle('ID', 'ID')"
              @click="toggleSort('ID')"
            >
              <div class="d-inline-flex align-center justify-center gap-1">
                <span :class="{ 'text-primary font-weight-black': sortBy === 'ID' }">ID</span>
                <v-icon v-if="sortBy === 'ID'" size="16" color="primary">
                  {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
                <v-icon v-else size="14" class="text-slate-300 sort-indicator">
                  mdi-unfold-more-horizontal
                </v-icon>
              </div>
            </th>

            <!-- Footprint Name Column (Sortable) -->
            <th
              class="text-left font-weight-bold cursor-pointer user-select-none hover-header"
              :title="getHeaderTitle('package', t('manageCatalogModal.packageFootprintName'))"
              @click="toggleSort('package')"
            >
              <div class="d-inline-flex align-center gap-1">
                <span :class="{ 'text-primary font-weight-black': sortBy === 'package' }">
                  {{ t('manageCatalogModal.packageFootprintName') }}
                </span>
                <v-icon v-if="sortBy === 'package'" size="16" color="primary">
                  {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
                <v-icon v-else size="14" class="text-slate-300 sort-indicator">
                  mdi-unfold-more-horizontal
                </v-icon>
              </div>
            </th>

            <!-- Mount Column (Sortable) -->
            <th
              style="width: 140px;"
              class="text-center font-weight-bold cursor-pointer user-select-none hover-header"
              :title="getHeaderTitle('isSmd', t('manageCatalogModal.mount'))"
              @click="toggleSort('isSmd')"
            >
              <div class="d-inline-flex align-center justify-center gap-1">
                <span :class="{ 'text-primary font-weight-black': sortBy === 'isSmd' }">
                  {{ t('manageCatalogModal.mount') }}
                </span>
                <v-icon v-if="sortBy === 'isSmd'" size="16" color="primary">
                  {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
                <v-icon v-else size="14" class="text-slate-300 sort-indicator">
                  mdi-unfold-more-horizontal
                </v-icon>
              </div>
            </th>

            <!-- Pins Column (Sortable) -->
            <th
              style="width: 130px;"
              class="text-center font-weight-bold cursor-pointer user-select-none hover-header"
              :title="getHeaderTitle('pinQuantity', t('manageCatalogModal.pins'))"
              @click="toggleSort('pinQuantity')"
            >
              <div class="d-inline-flex align-center justify-center gap-1">
                <span :class="{ 'text-primary font-weight-black': sortBy === 'pinQuantity' }">
                  {{ t('manageCatalogModal.pins') }}
                </span>
                <v-icon v-if="sortBy === 'pinQuantity'" size="16" color="primary">
                  {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
                <v-icon v-else size="14" class="text-slate-300 sort-indicator">
                  mdi-unfold-more-horizontal
                </v-icon>
              </div>
            </th>

            <!-- Drawing File Column (Sortable) -->
            <th
              style="width: 230px;"
              class="text-left font-weight-bold cursor-pointer user-select-none hover-header"
              :title="getHeaderTitle('drawingURL', t('manageCatalogModal.drawingFile'))"
              @click="toggleSort('drawingURL')"
            >
              <div class="d-inline-flex align-center gap-1">
                <span :class="{ 'text-primary font-weight-black': sortBy === 'drawingURL' }">
                  {{ t('manageCatalogModal.drawingFile') }}
                </span>
                <v-icon v-if="sortBy === 'drawingURL'" size="16" color="primary">
                  {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
                <v-icon v-else size="14" class="text-slate-300 sort-indicator">
                  mdi-unfold-more-horizontal
                </v-icon>
              </div>
            </th>

            <!-- Components Count Column (Sortable) -->
            <th
              style="width: 150px;"
              class="text-center font-weight-bold cursor-pointer user-select-none hover-header"
              :title="getHeaderTitle('componentCount', t('manageCatalogModal.componentsCount'))"
              @click="toggleSort('componentCount')"
            >
              <div class="d-inline-flex align-center justify-center gap-1">
                <span :class="{ 'text-primary font-weight-black': sortBy === 'componentCount' }">
                  {{ t('manageCatalogModal.componentsCount') }}
                </span>
                <v-icon v-if="sortBy === 'componentCount'" size="16" color="primary">
                  {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
                <v-icon v-else size="14" class="text-slate-300 sort-indicator">
                  mdi-unfold-more-horizontal
                </v-icon>
              </div>
            </th>

            <!-- Actions (Not sortable) -->
            <th class="text-right font-weight-bold" style="width: 120px;">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="pkg in filteredPackages"
            :key="pkg.ID"
            :class="{ 'bg-blue-50': selectedPackageIds.includes(pkg.ID) }"
          >
            <!-- Checkbox -->
            <td class="text-center pa-1">
              <v-checkbox
                :model-value="selectedPackageIds.includes(pkg.ID)"
                density="compact"
                hide-details
                color="primary"
                @update:model-value="togglePackageSelection(pkg.ID)"
              />
            </td>
            <td class="text-center font-mono text-caption text-slate-500">{{ pkg.ID }}</td>
            <!-- Footprint Name -->
            <td>
              <div class="font-mono font-weight-bold text-body-2 text-slate-900 cursor-pointer hover-underline" @click="openPackageForm(pkg)">
                {{ pkg.package }}
              </div>
            </td>
            <!-- Mount Type -->
            <td class="text-center">
              <v-chip
                size="x-small"
                variant="tonal"
                :color="pkg.isSmd === 1 ? 'teal-darken-1' : (pkg.isSmd === 2 ? 'blue-grey-darken-1' : 'indigo-darken-1')"
                class="font-weight-bold"
              >
                <v-icon start size="14">
                  {{ pkg.isSmd === 1 ? 'mdi-chip' : (pkg.isSmd === 2 ? 'mdi-wrench-outline' : 'mdi-circle-slice-8') }}
                </v-icon>
                {{ pkg.isSmd === 1 ? 'SMD' : (pkg.isSmd === 2 ? 'MECH' : 'THT') }}
              </v-chip>
            </td>
            <!-- Pin Count -->
            <td class="text-center font-mono text-body-2 text-slate-800">
              <span v-if="pkg.isSmd !== 2 && pkg.pinQuantity !== null && pkg.pinQuantity !== undefined" class="font-weight-bold">
                {{ pkg.pinQuantity }}
              </span>
              <span v-else class="text-disabled text-caption">—</span>
            </td>
            <!-- Drawing Filename (NO drawing preview thumbnail!) -->
            <td class="text-left font-mono text-caption">
              <div v-if="pkg.drawingURL" class="d-flex align-center gap-1">
                <v-icon size="14" color="primary" class="flex-shrink-0">mdi-file-image-outline</v-icon>
                <span
                  class="text-truncate text-slate-700 cursor-pointer hover-underline"
                  style="max-width: 200px;"
                  :title="pkg.drawingURL + ' (' + t('dialogs.viewFullSize') + ')'"
                  @click="openPhotoLightbox('package', pkg.drawingURL, pkg.package)"
                >
                  {{ pkg.drawingURL }}
                </span>
              </div>
              <span v-else class="text-disabled text-caption">—</span>
            </td>
            <!-- Components Count -->
            <td class="text-center font-mono text-body-2 text-slate-700">
              <v-chip size="x-small" variant="flat" color="slate-100" class="text-slate-800 font-mono">
                {{ pkg.componentCount || 0 }} {{ (pkg.componentCount === 1 ? t('manageCatalogModal.part') : t('manageCatalogModal.parts')) }}
              </v-chip>
            </td>
            <!-- Actions -->
            <td class="text-right">
              <v-btn
                icon="mdi-pencil-outline"
                size="small"
                variant="text"
                color="slate-600"
                @click="openPackageForm(pkg)"
                :title="t('manageCatalogModal.editPackage')"
              />
              <v-btn
                icon="mdi-delete-outline"
                size="small"
                variant="text"
                color="error"
                @click="confirmDeletePackage(pkg)"
                :title="t('common.delete')"
              />
            </td>
          </tr>
          <tr v-if="filteredPackages.length === 0 && !loading">
            <td colspan="8" class="text-center py-8 text-disabled">
              <v-icon size="40" class="mb-2">mdi-package-variant-closed</v-icon>
              <div>{{ t('manageCatalogModal.noPackagesFound') }}</div>
            </td>
          </tr>
        </tbody>
      </v-table>

      <!-- Gallery Mode for Package Drawings (Larger cards & photos) -->
      <div v-else class="pa-4 bg-slate-50">
        <v-row v-if="filteredPackages.length > 0">
          <v-col
            v-for="pkg in filteredPackages"
            :key="pkg.ID"
            cols="12"
            sm="6"
            md="6"
            lg="4"
            xl="3"
          >
            <v-card
              elevation="1"
              class="rounded-0 border bg-white h-100 d-flex flex-column package-gallery-card position-relative"
              :class="{ 'border-primary': selectedPackageIds.includes(pkg.ID) }"
              hover
            >
              <!-- Card Selection Checkbox -->
              <div class="position-absolute" style="top: 8px; left: 8px; z-index: 3;">
                <v-checkbox
                  :model-value="selectedPackageIds.includes(pkg.ID)"
                  density="compact"
                  hide-details
                  color="primary"
                  class="bg-white rounded border elevation-1 pa-0 d-flex align-center justify-center"
                  style="width: 28px; height: 28px;"
                  @click.stop
                  @update:model-value="togglePackageSelection(pkg.ID)"
                />
              </div>

              <!-- Drawing Image Box (Generous size for technical drawings) -->
              <div
                class="position-relative bg-slate-50 border-b d-flex align-center justify-center pa-3 package-photo-cover"
                :class="{ 'cursor-pointer': !!pkg.drawingURL }"
                style="height: 280px;"
                :title="pkg.drawingURL ? t('dialogs.viewFullSize') : ''"
                @click="pkg.drawingURL ? openPhotoLightbox('package', pkg.drawingURL, pkg.package) : openPackageForm(pkg)"
              >
                <MediaImage
                  type="package"
                  :src="pkg.drawingURL"
                  height="256px"
                  width="100%"
                  :cover="false"
                  icon-size="56px"
                />
                <div v-if="pkg.drawingURL" class="photo-overlay d-flex align-center justify-center">
                  <v-icon icon="mdi-magnify-plus-outline" size="36" color="slate-800" />
                </div>
              </div>

              <!-- Card Body -->
              <v-card-text class="pa-3 flex-grow-1 d-flex flex-column justify-space-between">
                <div>
                  <div class="d-flex align-start justify-space-between gap-1 mb-1">
                    <h3
                      class="font-mono font-weight-bold text-subtitle-1 text-slate-900 cursor-pointer hover-underline text-truncate ms-1"
                      :title="pkg.package"
                      @click="openPackageForm(pkg)"
                    >
                      {{ pkg.package }}
                    </h3>
                    <span class="text-caption font-mono text-slate-400 flex-shrink-0">#{{ pkg.ID }}</span>
                  </div>

                  <!-- Filename -->
                  <div
                    class="d-flex align-center gap-1 mb-2 font-mono text-caption text-slate-500 text-truncate ms-1"
                    :title="pkg.drawingURL || ''"
                  >
                    <v-icon size="13" :color="pkg.drawingURL ? 'primary' : 'slate-300'">mdi-file-image-outline</v-icon>
                    <span v-if="pkg.drawingURL" class="text-truncate">{{ pkg.drawingURL }}</span>
                    <span v-else class="text-disabled font-italic">{{ t('manageCatalogModal.noDrawing') }}</span>
                  </div>

                  <!-- Chips -->
                  <div class="d-flex flex-wrap align-center gap-1 mb-2">
                    <v-chip
                      size="x-small"
                      variant="tonal"
                      :color="pkg.isSmd === 1 ? 'teal-darken-1' : (pkg.isSmd === 2 ? 'blue-grey-darken-1' : 'indigo-darken-1')"
                      class="font-weight-bold"
                    >
                      <v-icon start size="12">
                        {{ pkg.isSmd === 1 ? 'mdi-chip' : (pkg.isSmd === 2 ? 'mdi-wrench-outline' : 'mdi-circle-slice-8') }}
                      </v-icon>
                      {{ pkg.isSmd === 1 ? 'SMD' : (pkg.isSmd === 2 ? 'MECH' : 'THT') }}
                    </v-chip>

                    <v-chip
                      v-if="pkg.isSmd !== 2 && pkg.pinQuantity !== null && pkg.pinQuantity !== undefined"
                      size="x-small"
                      variant="outlined"
                      color="slate-600"
                      class="font-mono font-weight-medium"
                    >
                      <v-icon start size="12">mdi-numeric</v-icon>
                      {{ pkg.pinQuantity }} {{ pkg.pinQuantity === 1 ? t('manageCatalogModal.pinsSingle') : t('manageCatalogModal.pins') }}
                    </v-chip>

                    <v-chip
                      size="x-small"
                      variant="flat"
                      color="slate-100"
                      class="text-slate-700 font-mono"
                    >
                      {{ pkg.componentCount || 0 }} {{ (pkg.componentCount === 1 ? t('manageCatalogModal.part') : t('manageCatalogModal.parts')) }}
                    </v-chip>
                  </div>
                </div>

                <!-- Footer Actions -->
                <div class="d-flex align-center justify-end border-t pt-2 mt-2">
                  <v-btn
                    icon="mdi-pencil-outline"
                    size="small"
                    variant="text"
                    color="slate-600"
                    @click="openPackageForm(pkg)"
                    :title="t('manageCatalogModal.editPackage')"
                  />
                  <v-btn
                    icon="mdi-delete-outline"
                    size="small"
                    variant="text"
                    color="error"
                    @click="confirmDeletePackage(pkg)"
                    :title="t('common.delete')"
                  />
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Empty state -->
        <div v-else-if="!loading" class="text-center py-12 text-disabled bg-white border">
          <v-icon size="48" class="mb-2">mdi-package-variant-closed</v-icon>
          <div>{{ t('manageCatalogModal.noPackagesFound') }}</div>
        </div>
      </div>
    </v-card>

    <!-- MODAL: ADD / EDIT PACKAGE -->
    <v-dialog v-model="showPackageDialog" max-width="540px" persistent>
      <v-card class="rounded-0 border bg-white">
        <v-card-title class="bg-slate-50 py-3 px-4 border-b font-weight-bold text-subtitle-1 d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-2">
            <v-icon color="primary" size="20">mdi-package-variant-closed</v-icon>
            <span>{{ editingPackage ? t('manageCatalogModal.editPackage') : t('manageCatalogModal.newPackage') }}</span>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showPackageDialog = false" />
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

          <!-- Pin Count & Mount Technology Row -->
          <v-row dense class="mb-3" align="center">
            <v-col cols="12" sm="5">
              <v-text-field
                v-model.number="packageForm.pinQuantity"
                :label="t('manageCatalogModal.pinPadCount')"
                :placeholder="t('manageCatalogModal.pinPlaceholder')"
                type="number"
                min="0"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                class="font-mono"
              />
            </v-col>
            <v-col cols="12" sm="7" class="d-flex align-center justify-sm-end">
              <div class="d-flex align-center gap-2">
                <span class="text-caption font-weight-medium text-slate-600">{{ t('manageCatalogModal.mount') }}</span>
                <v-btn-toggle
                  v-model="packageForm.isSmd"
                  mandatory
                  density="comfortable"
                  variant="outlined"
                  color="primary"
                  rounded="lg"
                >
                  <v-btn :value="1" size="small" class="text-caption font-weight-bold">
                    <v-icon start size="14">mdi-chip</v-icon>
                    SMD
                  </v-btn>
                  <v-btn :value="0" size="small" class="text-caption font-weight-bold">
                    <v-icon start size="14">mdi-circle-slice-8</v-icon>
                    THT
                  </v-btn>
                  <v-btn :value="2" size="small" class="text-caption font-weight-bold">
                    <v-icon start size="14">mdi-wrench-outline</v-icon>
                    MECH
                  </v-btn>
                </v-btn-toggle>
              </div>
            </v-col>
          </v-row>

          <!-- Drawing / Pinout Image with Inline Upload -->
          <div class="d-flex align-center gap-3 mt-2">
            <v-avatar rounded="lg" size="48" class="border bg-slate-50 flex-shrink-0">
              <MediaImage
                :src="packageForm.drawingURL"
                type="package"
                :alt="packageForm.package"
                icon-size="24px"
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

    <!-- FULL SIZE MEDIA LIGHTBOX DIALOG -->
    <MediaLightboxDialog
      v-model="lightbox.show"
      :type="lightbox.type"
      :src="lightbox.src"
      :title="lightbox.title"
    />

    <!-- MODAL: IMPORT PACKAGES -->
    <ImportPackagesDialog
      v-model="showImportDialog"
      @imported="onPackagesImported"
    />

    <!-- Notification Snackbar inside View -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import MediaImage from '../../components/MediaImage.vue';
import MediaLightboxDialog from '../../components/MediaLightboxDialog.vue';
import ImportPackagesDialog from '../../components/ImportPackagesDialog.vue';

const { t } = useI18n();

const loading = ref(false);
const saving = ref(false);
const packagesList = ref([]);
const packageSearch = ref('');
const packageMountFilter = ref('all');
const viewMode = ref('table'); // 'table' | 'gallery'

// Checkbox selection state
const selectedPackageIds = ref([]);

// Sorting state
const sortBy = ref('package');
const sortOrder = ref('asc');

const toggleSort = (key) => {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    if (['pinQuantity', 'componentCount'].includes(key)) {
      sortOrder.value = 'desc';
    } else {
      sortOrder.value = 'asc';
    }
  }
};

const getHeaderTitle = (key, label) => {
  if (sortBy.value === key) {
    return `${label}: ${sortOrder.value === 'asc' ? 'Ascending' : 'Descending'}`;
  }
  return label;
};

// Selection helpers
const allSelected = computed(() => {
  return filteredPackages.value.length > 0 &&
         filteredPackages.value.every(p => selectedPackageIds.value.includes(p.ID));
});

const someSelected = computed(() => {
  return filteredPackages.value.some(p => selectedPackageIds.value.includes(p.ID));
});

const toggleSelectAll = (val) => {
  if (val) {
    const currentIds = new Set(selectedPackageIds.value);
    filteredPackages.value.forEach(p => currentIds.add(p.ID));
    selectedPackageIds.value = Array.from(currentIds);
  } else {
    const filteredIdSet = new Set(filteredPackages.value.map(p => p.ID));
    selectedPackageIds.value = selectedPackageIds.value.filter(id => !filteredIdSet.has(id));
  }
};

const togglePackageSelection = (id) => {
  const index = selectedPackageIds.value.indexOf(id);
  if (index >= 0) {
    selectedPackageIds.value.splice(index, 1);
  } else {
    selectedPackageIds.value.push(id);
  }
};

// Export & Import
const exporting = ref(false);
const showImportDialog = ref(false);

const exportPackages = async () => {
  exporting.value = true;
  try {
    const ids = selectedPackageIds.value.length > 0 ? selectedPackageIds.value : [];
    const res = await api.exportPackages(ids);
    const blob = new Blob([res.data], { type: 'application/zip' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = ids.length > 0
      ? `packages_selected_${ids.length}_${dateStr}.zip`
      : `packages_all_${dateStr}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    notify(t('importPackagesModal.exportSuccess'));
  } catch (err) {
    console.error('Failed to export packages:', err);
    notify('Failed to export packages: ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    exporting.value = false;
  }
};

const onPackagesImported = async (result) => {
  notify(t('importPackagesModal.importSuccess', {
    count: result.totalProcessed,
    created: result.createdCount,
    updated: result.updatedCount
  }));
  selectedPackageIds.value = [];
  await loadPackages();
};

const lightbox = ref({
  show: false,
  type: 'package',
  src: null,
  title: ''
});

const openPhotoLightbox = (type, src, title) => {
  if (!src) return;
  lightbox.value = {
    show: true,
    type,
    src,
    title
  };
};

const showPackageDialog = ref(false);
const editingPackage = ref(null);
const packageForm = ref({
  package: '',
  pinQuantity: null,
  isSmd: 1,
  drawingURL: ''
});
const packageError = ref('');
const uploadingDrawing = ref(false);
const drawingInputRef = ref(null);

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

const loadPackages = async () => {
  loading.value = true;
  try {
    const pkgs = await api.getPackages();
    packagesList.value = pkgs || [];
  } catch (err) {
    console.error('Failed to load packages:', err);
    notify(t('manageCatalogModal.loadError') + ': ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadPackages();
});

const filteredPackages = computed(() => {
  let list = packagesList.value;

  // Mount Filter
  if (packageMountFilter.value === 'smd') {
    list = list.filter(p => Number(p.isSmd) === 1);
  } else if (packageMountFilter.value === 'tht') {
    list = list.filter(p => Number(p.isSmd) === 0);
  } else if (packageMountFilter.value === 'mech') {
    list = list.filter(p => Number(p.isSmd) === 2);
  }

  // Search Filter (Footprint name or drawing filename)
  if (packageSearch.value && packageSearch.value.trim()) {
    const q = packageSearch.value.toLowerCase().trim();
    list = list.filter(p =>
      (p.package && p.package.toLowerCase().includes(q)) ||
      (p.drawingURL && p.drawingURL.toLowerCase().includes(q))
    );
  }

  // Sorting
  if (!sortBy.value) return list;

  const key = sortBy.value;
  const mult = sortOrder.value === 'desc' ? -1 : 1;

  return [...list].sort((a, b) => {
    switch (key) {
      case 'ID':
        return (Number(a.ID || 0) - Number(b.ID || 0)) * mult;
      case 'package':
        return (a.package || '').localeCompare(b.package || '', undefined, { numeric: true, sensitivity: 'base' }) * mult;
      case 'isSmd':
        return (Number(a.isSmd ?? -1) - Number(b.isSmd ?? -1)) * mult;
      case 'pinQuantity': {
        const valA = a.pinQuantity !== null && a.pinQuantity !== undefined ? Number(a.pinQuantity) : -1;
        const valB = b.pinQuantity !== null && b.pinQuantity !== undefined ? Number(b.pinQuantity) : -1;
        return (valA - valB) * mult;
      }
      case 'drawingURL': {
        const valA = a.drawingURL || '';
        const valB = b.drawingURL || '';
        if (!valA && valB) return 1;
        if (valA && !valB) return -1;
        return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' }) * mult;
      }
      case 'componentCount':
        return (Number(a.componentCount || 0) - Number(b.componentCount || 0)) * mult;
      default:
        return 0;
    }
  });
});

// Package Actions
const openPackageForm = (pkg = null) => {
  editingPackage.value = pkg;
  packageForm.value = {
    package: pkg ? pkg.package : '',
    pinQuantity: pkg && pkg.pinQuantity !== null && pkg.pinQuantity !== undefined ? pkg.pinQuantity : null,
    isSmd: pkg ? (pkg.isSmd !== undefined ? Number(pkg.isSmd) : 1) : 1,
    drawingURL: pkg && pkg.drawingURL ? pkg.drawingURL : ''
  };
  packageError.value = '';
  showPackageDialog.value = true;
};

const handleDrawingUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  uploadingDrawing.value = true;
  try {
    const res = await api.uploadMedia(file, 'packages');
    if (res && res.filename) {
      packageForm.value.drawingURL = res.filename;
      notify(t('manageCatalogModal.drawingUploaded', { file: res.filename }));
    }
  } catch (err) {
    console.error('Failed to upload drawing:', err);
    notify(t('manageCatalogModal.drawingUploadError') + ': ' + err.message, 'error');
  } finally {
    uploadingDrawing.value = false;
    if (drawingInputRef.value) {
      drawingInputRef.value.value = '';
    }
  }
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
      pinQuantity: Number(packageForm.value.isSmd) === 2 ? null : (packageForm.value.pinQuantity !== null && packageForm.value.pinQuantity !== '' ? parseInt(packageForm.value.pinQuantity, 10) : null),
      isSmd: parseInt(packageForm.value.isSmd, 10) || 0,
      drawingURL: packageForm.value.drawingURL ? packageForm.value.drawingURL.trim() : null
    };

    if (editingPackage.value) {
      await api.updatePackage(editingPackage.value.ID, payload);
      notify(t('manageCatalogModal.packageUpdated', { name }));
    } else {
      await api.createPackage(payload);
      notify(t('manageCatalogModal.packageCreated', { name }));
    }
    showPackageDialog.value = false;
    await loadPackages();
  } catch (err) {
    console.error('Failed to save package:', err);
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
  if (!confirm(t('manageCatalogModal.packageDeleteConfirm', { name: pkg.package }))) {
    return;
  }
  try {
    await api.deletePackage(pkg.ID);
    notify(t('manageCatalogModal.packageDeleted', { name: pkg.package }));
    await loadPackages();
  } catch (err) {
    console.error('Failed to delete package:', err);
    notify(t('manageCatalogModal.packageDeleteError') + ': ' + (err.response?.data?.error || err.message), 'error');
  }
};
</script>

<style scoped>
.hover-underline:hover {
  text-decoration: underline;
}

.hover-header {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease;
}

.hover-header:hover {
  background-color: #f1f5f9 !important;
}

.hover-header:hover .sort-indicator {
  color: #64748b !important;
}

.package-gallery-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.package-gallery-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}

.package-photo-cover {
  position: relative;
  background-color: #f8fafc;
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.6);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.package-photo-cover:hover .photo-overlay {
  opacity: 1;
}
</style>
