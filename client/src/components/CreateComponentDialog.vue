<template>
  <v-dialog
    v-model="dialogModel"
    max-width="1060"
    width="92vw"
    persistent
    scrollable
  >
    <v-card class="rounded-lg border bg-white elevation-4 d-flex flex-column" style="max-height: 90vh;">
      <!-- Dialog Header -->
      <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 d-flex align-center justify-space-between flex-shrink-0">
        <div class="d-flex align-center gap-3">
          <div class="rounded-lg bg-blue-50 text-primary pa-2 d-flex align-center justify-center border border-blue-100">
            <v-icon :icon="dialogIcon" size="24" color="primary" />
          </div>
          <div>
            <div class="text-h6 font-weight-bold text-slate-900 leading-tight">
              {{ dialogTitle }}
            </div>
            <div class="text-caption text-slate-500 mt-0-5">
              {{ dialogSubtitle }}
            </div>
          </div>
        </div>
        <div class="d-flex align-center gap-2">
          <v-btn
            v-if="isEditMode"
            variant="tonal"
            size="small"
            color="primary"
            prepend-icon="mdi-content-copy"
            class="font-weight-medium text-caption"
            :disabled="submitting"
            @click="cloneComponent"
            title="Clone into a new component"
          >
            Clone
          </v-btn>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            color="slate-500"
            :disabled="submitting"
            @click="close"
            title="Close dialog"
          />
        </div>
      </div>

      <!-- Form Content -->
      <v-card-text class="pa-6 overflow-y-auto">
        <!-- Cloned Component Alert -->
        <v-alert
          v-if="isCloning"
          type="info"
          variant="tonal"
          density="comfortable"
          class="mb-4 rounded-lg text-body-2"
          icon="mdi-content-copy"
          closable
          @click:close="isCloning = false"
        >
          <div class="d-flex align-center justify-space-between flex-wrap gap-2">
            <div>
              Cloned from <strong class="font-mono text-primary">{{ clonedSourceName }}</strong>. Specifications and parameters have been populated. Modify the component name or values and click <strong>Create Component</strong>.
            </div>
          </div>
        </v-alert>

        <!-- Error Alert -->
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4 rounded-lg"
          closable
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </v-alert>

        <v-form ref="formRef" v-model="formValid" @submit.prevent="submitForm">
          <!-- SECTION 1: IDENTITY & CLASSIFICATION -->
          <div class="d-flex align-center justify-space-between mb-3 pb-1 border-b border-slate-200">
            <div class="d-flex align-center gap-2">
              <v-icon icon="mdi-tag-outline" size="18" color="primary" />
              <span class="text-caption font-weight-bold text-slate-700 text-uppercase tracking-wider">
                Component Identification & Footprint
              </span>
            </div>
            <div class="d-flex align-center gap-2">
              <span class="text-caption text-slate-500 font-weight-medium">Package Filter:</span>
              <v-btn-toggle
                v-model="packageMountType"
                mandatory
                density="compact"
                variant="outlined"
                rounded="md"
                color="primary"
                style="height: 28px;"
              >
                <v-btn value="all" size="x-small" class="px-2 font-weight-bold">ALL</v-btn>
                <v-btn value="smd" size="x-small" class="px-2 font-weight-bold">SMD</v-btn>
                <v-btn value="tht" size="x-small" class="px-2 font-weight-bold">THT</v-btn>
              </v-btn-toggle>
            </div>
          </div>

          <v-row dense class="mb-1">
            <!-- Component / Part Name -->
            <v-col cols="12" md="7">
              <v-text-field
                v-model="form.component"
                label="Part Name / Value *"
                placeholder="e.g. STM32F103C8T6, 100nF, AMS1117-3.3, 10k"
                density="compact"
                variant="outlined"
                rounded="lg"
                class="font-mono font-weight-medium"
                prepend-inner-icon="mdi-integrated-circuit-chip"
                :rules="[rules.required, rules.maxLength(50)]"
                autofocus
              />
            </v-col>

            <!-- Marking Code -->
            <v-col cols="12" md="5">
              <v-text-field
                v-model="form.marking"
                label="Surface Marking Code"
                placeholder="e.g. A7, 104, Y1, W2"
                density="compact"
                variant="outlined"
                rounded="lg"
                class="font-mono"
                prepend-inner-icon="mdi-barcode-scan"
                :rules="[rules.maxLength(50)]"
              />
            </v-col>
          </v-row>

          <v-row dense class="mb-1">
            <!-- Category -->
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="form.category_id"
                :items="availableCategories"
                item-title="category"
                item-value="ID"
                label="Category *"
                placeholder="Select component category"
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-shape-outline"
                clearable
                :rules="[rules.requiredSelection]"
              >
                <template #append>
                  <v-btn
                    icon="mdi-plus"
                    size="x-small"
                    variant="tonal"
                    color="primary"
                    title="Create new category"
                    @click="openQuickCategory"
                  />
                </template>
              </v-autocomplete>
            </v-col>

            <!-- Package / Footprint -->
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="form.package_id"
                :items="filteredPackagesList"
                item-title="package"
                item-value="ID"
                :label="packageMountType === 'all' ? 'Package / Footprint *' : `Package / Footprint (${packageMountType.toUpperCase()}) *`"
                placeholder="Select package footprint"
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-package-variant-closed"
                clearable
                :rules="[rules.requiredSelection]"
              >
                <template #append>
                  <v-btn
                    icon="mdi-plus"
                    size="x-small"
                    variant="tonal"
                    color="primary"
                    title="Create new package footprint"
                    @click="openQuickPackage"
                  />
                </template>
                <template #prepend-item>
                  <div class="pa-2 px-3 bg-slate-50 border-b d-flex align-center justify-space-between">
                    <span class="text-caption font-weight-bold text-slate-600">Filter By Mount Type:</span>
                    <v-btn-toggle
                      v-model="packageMountType"
                      mandatory
                      density="compact"
                      variant="outlined"
                      rounded="md"
                      color="primary"
                      style="height: 26px;"
                    >
                      <v-btn value="all" size="x-small" class="px-2">ALL</v-btn>
                      <v-btn value="smd" size="x-small" class="px-2">SMD</v-btn>
                      <v-btn value="tht" size="x-small" class="px-2">THT</v-btn>
                    </v-btn-toggle>
                  </div>
                </template>

                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps" :title="item.raw.package">
                    <template #append>
                      <v-chip
                        size="x-small"
                        :color="item.raw.isSmd ? 'teal-darken-1' : 'indigo-darken-1'"
                        variant="flat"
                        class="ms-2 font-weight-bold font-mono"
                      >
                        {{ item.raw.isSmd ? 'SMD' : 'THT' }}
                      </v-chip>
                      <span v-if="item.raw.pinQuantity" class="text-caption font-mono text-slate-500 ms-1">
                        {{ item.raw.pinQuantity }}p
                      </span>
                      <v-icon
                        v-if="item.raw.drawingURL"
                        icon="mdi-file-image-outline"
                        size="14"
                        color="primary"
                        class="ms-1"
                        title="Drawing available"
                      />
                    </template>
                  </v-list-item>
                </template>
              </v-autocomplete>
            </v-col>
          </v-row>

          <!-- Package Preview Bar (if selected) -->
          <div
            v-if="selectedPackageObj"
            class="pa-2 px-3 mb-3 bg-blue-50 border border-blue-200 rounded-lg d-flex align-center justify-space-between text-caption font-mono"
          >
            <div class="d-flex align-center gap-2">
              <v-icon icon="mdi-information-outline" size="16" color="primary" />
              <span class="text-slate-600">Selected Footprint:</span>
              <span class="font-weight-bold text-slate-900">{{ selectedPackageObj.package }}</span>
              <v-chip
                size="x-small"
                :color="selectedPackageObj.isSmd ? 'teal-darken-1' : 'indigo-darken-1'"
                variant="flat"
                class="font-weight-bold"
              >
                {{ selectedPackageObj.isSmd ? 'SMD' : 'Through-Hole' }}
              </v-chip>
              <span v-if="selectedPackageObj.pinQuantity" class="text-slate-700">
                {{ selectedPackageObj.pinQuantity }} pins
              </span>
            </div>
            <div v-if="selectedPackageObj.drawingURL" class="text-primary d-flex align-center gap-1 font-weight-medium">
              <v-icon icon="mdi-drawing" size="14" />
              <span>Drawing: {{ selectedPackageObj.drawingURL }}</span>
            </div>
          </div>

          <!-- Short Description -->
          <v-row dense class="mb-2">
            <v-col cols="12">
              <v-text-field
                v-model="form.shortDescription"
                label="Short Description"
                placeholder="e.g. 100nF 50V X7R 0805, 3.3V 1A LDO linear regulator, 16MHz Crystal Oscillator"
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-card-text-outline"
                counter="50"
                :rules="[rules.maxLength(50)]"
              />
            </v-col>
          </v-row>

          <!-- SECTION 2: INVENTORY & STOCK -->
          <div class="d-flex align-center gap-2 mb-3 mt-4 pb-1 border-b border-slate-200">
            <v-icon icon="mdi-warehouse" size="18" color="primary" />
            <span class="text-caption font-weight-bold text-slate-700 text-uppercase tracking-wider">
              Stock & Storage Location
            </span>
          </div>

          <v-row dense class="mb-2">
            <!-- Initial Stock Quantity -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="form.qty"
                label="Initial In-Stock Qty"
                type="number"
                min="0"
                density="compact"
                variant="outlined"
                rounded="lg"
                class="font-mono"
                prepend-inner-icon="mdi-counter"
                :rules="[rules.nonNegativeNumber]"
              />
            </v-col>

            <!-- Minimal Acceptable Quantity -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="form.minQty"
                label="Min. Acceptable Qty"
                type="number"
                min="0"
                density="compact"
                variant="outlined"
                rounded="lg"
                class="font-mono"
                prepend-inner-icon="mdi-alert-circle-check-outline"
                hint="Default 0. Warns when stock is low"
                persistent-hint
              />
            </v-col>

            <!-- Storage Location -->
            <v-col cols="12" md="4">
              <v-autocomplete
                v-model="form.storageId"
                :items="storages"
                item-title="storage"
                item-value="ID"
                label="Storage Location"
                placeholder="Select bin or drawer"
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-map-marker-outline"
                clearable
                :hint="form.qty > 0 ? 'Allocates initial stock' : 'Optional storage'"
                persistent-hint
              />
            </v-col>
          </v-row>

          <!-- SECTION 3: TECHNICAL SPECS & MEDIA -->
          <div class="d-flex align-center gap-2 mb-3 mt-4 pb-1 border-b border-slate-200">
            <v-icon icon="mdi-file-document-outline" size="18" color="primary" />
            <span class="text-caption font-weight-bold text-slate-700 text-uppercase tracking-wider">
              Documentation & Media
            </span>
          </div>

          <v-row dense class="mb-2">
            <!-- Detailed Description -->
            <v-col cols="12">
              <v-textarea
                v-model="form.description"
                label="Detailed Description / Electrical Specifications"
                placeholder="Full specs, pinout functions, voltage ratings, package tolerances, manufacturer notes, or KiCAD designator links..."
                rows="2"
                density="compact"
                variant="outlined"
                rounded="lg"
                auto-grow
                counter="1000"
                :rules="[rules.maxLength(1000)]"
              />
            </v-col>
          </v-row>

          <v-row dense class="mb-2">
            <!-- Datasheet URL or filename with Upload -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.datasheetURL"
                label="Datasheet (URL or PDF filename)"
                placeholder="e.g. stm32f103.pdf or https://..."
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-file-pdf-box"
                clearable
              >
                <template #append-inner>
                  <v-btn
                    variant="tonal"
                    color="primary"
                    size="small"
                    class="text-caption font-weight-bold my-n1"
                    prepend-icon="mdi-upload"
                    :loading="uploadingDatasheet"
                    @click.stop="datasheetInputRef?.click()"
                    title="Upload PDF to media/datasheets/"
                  >
                    Upload
                  </v-btn>
                </template>
              </v-text-field>
              <input
                ref="datasheetInputRef"
                type="file"
                accept=".pdf,application/pdf"
                style="display: none;"
                @change="handleDatasheetUpload"
              />
            </v-col>

            <!-- Photo URL or filename with Upload -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.photoURL"
                label="Component Photo (URL or filename)"
                placeholder="e.g. stm32.jpg or https://..."
                density="compact"
                variant="outlined"
                rounded="lg"
                prepend-inner-icon="mdi-camera-outline"
                clearable
              >
                <template #append-inner>
                  <v-btn
                    variant="tonal"
                    color="primary"
                    size="small"
                    class="text-caption font-weight-bold my-n1"
                    prepend-icon="mdi-upload"
                    :loading="uploadingPhoto"
                    @click.stop="photoInputRef?.click()"
                    title="Upload image to media/components/"
                  >
                    Upload
                  </v-btn>
                </template>
              </v-text-field>
              <input
                ref="photoInputRef"
                type="file"
                accept="image/*"
                style="display: none;"
                @change="handlePhotoUpload"
              />
            </v-col>
          </v-row>

          <!-- Previews Bar (Photo and Datasheet) -->
          <div v-if="form.photoURL || form.datasheetURL" class="d-flex flex-wrap gap-3 mt-1">
            <!-- Photo Preview -->
            <div v-if="form.photoURL" class="pa-2 px-3 border rounded-lg bg-slate-50 d-flex align-center gap-3 flex-grow-1">
              <v-avatar rounded="lg" size="48" class="border bg-white flex-shrink-0">
                <MediaImage
                  type="component"
                  :src="form.photoURL"
                  height="48px"
                  width="48px"
                />
              </v-avatar>
              <div class="overflow-hidden">
                <div class="text-caption font-weight-bold text-slate-800">Photo Attached</div>
                <div class="text-caption font-mono text-slate-500 text-truncate" style="max-width: 380px;">
                  {{ form.photoURL }}
                </div>
              </div>
              <v-btn
                icon="mdi-close"
                size="x-small"
                variant="text"
                color="slate-400"
                class="ms-auto"
                @click="form.photoURL = ''"
                title="Remove photo"
              />
            </div>

            <!-- Datasheet Preview -->
            <div v-if="form.datasheetURL" class="pa-2 px-3 border rounded-lg bg-slate-50 d-flex align-center gap-3 flex-grow-1">
              <v-avatar rounded="lg" size="48" color="red-lighten-5" class="border border-red-200 flex-shrink-0">
                <v-icon icon="mdi-file-pdf-box" color="red-darken-2" size="28" />
              </v-avatar>
              <div class="overflow-hidden">
                <div class="text-caption font-weight-bold text-slate-800">Datasheet PDF Attached</div>
                <div class="text-caption font-mono text-slate-500 text-truncate" style="max-width: 380px;">
                  {{ form.datasheetURL }}
                </div>
              </div>
              <v-btn
                icon="mdi-close"
                size="x-small"
                variant="text"
                color="slate-400"
                class="ms-auto"
                @click="form.datasheetURL = ''"
                title="Remove datasheet"
              />
            </div>
          </div>
        </v-form>
      </v-card-text>

      <!-- Footer Actions -->
      <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 d-flex align-center justify-space-between flex-wrap gap-2 flex-shrink-0">
        <!-- Add Another Checkbox (only in catalog creation view, hidden when editing or used as row mapper) -->
        <div class="d-flex align-center">
          <v-checkbox
            v-if="!hideAddAnother && !isEditMode"
            v-model="addAnother"
            label="Add another component after saving"
            density="compact"
            hide-details
            color="primary"
            class="text-caption"
          />
        </div>

        <div class="d-flex align-center gap-2 ms-auto">
          <v-btn
            v-if="isEditMode"
            variant="tonal"
            color="slate-700"
            prepend-icon="mdi-content-copy"
            :disabled="submitting"
            @click="cloneComponent"
            title="Create a new component pre-filled with these values"
          >
            Clone Component
          </v-btn>

          <v-btn
            variant="outlined"
            color="slate-700"
            :disabled="submitting"
            @click="close"
          >
            Cancel
          </v-btn>

          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-check"
            :loading="submitting"
            :disabled="submitting"
            @click="submitForm"
          >
            {{ submitButtonText }}
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-dialog>

  <!-- DUPLICATE / SIMILAR WARNING CONFIRMATION MODAL -->
  <v-dialog v-model="showDuplicateWarning" max-width="680" persistent>
    <v-card class="rounded-lg border bg-white elevation-4">
      <div class="bg-amber-lighten-5 py-3 px-5 d-flex align-center gap-2 border-b border-amber-200 text-amber-darken-4">
        <v-icon icon="mdi-alert-circle-outline" color="amber-darken-3" size="24" />
        <span class="font-weight-bold text-subtitle-1">
          Similar Component Already Exists
        </span>
      </div>

      <v-card-text class="pa-5">
        <p class="text-body-2 text-slate-700 mb-3">
          The catalog already has component(s) matching
          <strong class="font-mono text-primary">{{ form.component }}</strong>:
        </p>

        <v-table density="compact" class="border rounded mb-3 text-caption">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left font-weight-bold">Component</th>
              <th class="text-left font-weight-bold">Category</th>
              <th class="text-left font-weight-bold">Package</th>
              <th class="text-center font-weight-bold">In Stock</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="match in duplicateMatches" :key="match.ID">
              <td class="font-mono font-weight-bold text-slate-900">{{ match.component }}</td>
              <td>{{ match.category || '—' }}</td>
              <td class="font-mono">
                {{ match.package || '—' }}
                <span v-if="match.isSmd !== null" class="text-slate-400 ms-1">
                  ({{ match.isSmd ? 'SMD' : 'THT' }})
                </span>
              </td>
              <td class="text-center font-mono font-weight-bold">
                {{ match.qty ?? 0 }}
              </td>
            </tr>
          </tbody>
        </v-table>

        <v-alert
          type="warning"
          variant="tonal"
          density="compact"
          class="rounded-lg text-caption"
          icon="mdi-help-circle-outline"
        >
          A component with this name or package/category combination is already cataloged. Are you sure you want to create a new entry?
        </v-alert>
      </v-card-text>

      <div class="pa-3 px-5 bg-slate-50 border-t border-slate-200 d-flex justify-end gap-2">
        <v-btn
          variant="outlined"
          color="slate-700"
          @click="showDuplicateWarning = false"
        >
          Review & Edit
        </v-btn>
        <v-btn
          color="amber-darken-4"
          variant="flat"
          prepend-icon="mdi-check"
          :loading="submitting"
          @click="proceedCreate(true)"
        >
          Yes, Create Anyway
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <!-- QUICK CREATE CATEGORY MODAL -->
  <v-dialog v-model="showQuickCategory" max-width="420px" persistent>
    <v-card class="rounded-0 border bg-white">
      <v-card-title class="bg-slate-50 py-3 px-4 border-b font-weight-bold text-subtitle-1">
        Add New Category
      </v-card-title>
      <v-card-text class="pa-4">
        <v-text-field
          v-model="quickCategoryName"
          label="Category Name *"
          placeholder="e.g. Relays, Microcontrollers, Sensors"
          variant="outlined"
          density="comfortable"
          autofocus
          :error-messages="quickCategoryError"
          @keydown.enter="submitQuickCategory"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex justify-end gap-2">
        <v-btn variant="text" size="small" @click="showQuickCategory = false">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          class="font-weight-bold"
          :loading="quickCategorySaving"
          @click="submitQuickCategory"
        >
          Create Category
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- QUICK CREATE PACKAGE FOOTPRINT MODAL -->
  <v-dialog v-model="showQuickPackage" max-width="480px" persistent>
    <v-card class="rounded-0 border bg-white">
      <v-card-title class="bg-slate-50 py-3 px-4 border-b font-weight-bold text-subtitle-1">
        Add New Package Footprint
      </v-card-title>
      <v-card-text class="pa-4">
        <v-text-field
          v-model="quickPackageForm.package"
          label="Package Footprint Name *"
          placeholder="e.g. TSSOP-20, SOT-23-5, 1206"
          variant="outlined"
          density="comfortable"
          class="font-mono mb-3"
          autofocus
          :error-messages="quickPackageError"
        />

        <!-- Pin Count & Mount Technology Row (Aligned Heights and Baseline) -->
        <v-row dense class="mb-3" align="center">
          <v-col cols="12" sm="5">
            <v-text-field
              v-model.number="quickPackageForm.pinQuantity"
              label="Pin / Pad Count"
              type="number"
              min="1"
              placeholder="e.g. 20"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" sm="7">
            <div class="border rounded-lg d-flex align-center px-3 justify-space-between bg-slate-50" style="height: 48px;">
              <span class="text-caption font-weight-medium text-slate-600 me-2 flex-shrink-0">
                Mount:
              </span>
              <v-btn-toggle
                v-model="quickPackageForm.isSmd"
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
                  Through-Hole
                </v-btn>
              </v-btn-toggle>
            </div>
          </v-col>
        </v-row>

        <!-- Drawing / Pinout Image with Live Upload and Preview -->
        <div class="d-flex align-center gap-3 mb-1">
          <v-avatar
            v-if="quickPackageForm.drawingURL"
            rounded="lg"
            size="48"
            class="border bg-slate-50 flex-shrink-0"
          >
            <MediaImage
              type="package"
              :src="quickPackageForm.drawingURL"
              height="48px"
              width="48px"
            />
          </v-avatar>

          <v-text-field
            v-model="quickPackageForm.drawingURL"
            label="Drawing / Pinout Image (Filename or URL)"
            placeholder="e.g. tssop20.png or https://..."
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
                :loading="uploadingQuickDrawing"
                @click.stop="quickDrawingInputRef?.click()"
                title="Upload drawing to media/packages/"
              >
                Upload
              </v-btn>
            </template>
          </v-text-field>
          <input
            ref="quickDrawingInputRef"
            type="file"
            accept="image/*"
            style="display: none;"
            @change="handleQuickDrawingUpload"
          />
        </div>
        <div class="text-caption text-slate-500 mt-1 ms-1">
          Stored in <code>media/packages/</code> or specify an external image URL.
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex justify-end gap-2">
        <v-btn variant="text" size="small" @click="showQuickPackage = false">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          class="font-weight-bold"
          :loading="quickPackageSaving"
          @click="submitQuickPackage"
        >
          Create Package
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import api from '../services/api';
import MediaImage from './MediaImage.vue';

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
  },
  initialData: {
    type: Object,
    default: null
  },
  component: {
    type: Object,
    default: null
  },
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  hideAddAnother: {
    type: Boolean,
    default: false
  },
  draftMode: {
    type: Boolean,
    default: false
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  isClone: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'created', 'updated', 'saved', 'catalog-updated']);

const isCloning = ref(false);
const clonedSourceName = ref('');

const cloneComponent = () => {
  const currentName = form.component || props.component?.component || '';
  clonedSourceName.value = currentName;
  isCloning.value = true;
  if (form.component && !form.component.endsWith('(Copy)')) {
    form.component = `${form.component} (Copy)`;
  }
  errorMessage.value = '';
};

const isEditMode = computed(() => {
  if (isCloning.value) return false;
  return props.isEdit || !!(props.component?.id || props.component?.ID);
});

const dialogTitle = computed(() => {
  if (props.title) return props.title;
  if (isCloning.value) return 'Add New Component';
  return isEditMode.value ? 'Edit Component' : 'Add New Component';
});

const dialogSubtitle = computed(() => {
  if (props.subtitle) return props.subtitle;
  if (isCloning.value) {
    return `Create a new component pre-filled with specifications from "${clonedSourceName.value || 'cloned part'}"`;
  }
  return isEditMode.value
    ? 'Update catalog specifications, inventory parameters, and documentation'
    : 'Add a new electronic component, IC, passive part, or module to the catalog database';
});

const dialogIcon = computed(() => {
  return isEditMode.value ? 'mdi-pencil-outline' : 'mdi-chip';
});

const submitButtonText = computed(() => {
  if (props.draftMode) return 'Apply Component';
  return isEditMode.value ? 'Save Changes' : 'Create Component';
});

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const formRef = ref(null);
const formValid = ref(false);
const submitting = ref(false);
const errorMessage = ref('');
const addAnother = ref(false);
const storages = ref([]);
const packageMountType = ref('all');
const showDuplicateWarning = ref(false);
const duplicateMatches = ref([]);

const datasheetInputRef = ref(null);
const photoInputRef = ref(null);
const uploadingDatasheet = ref(false);
const uploadingPhoto = ref(false);

const handleDatasheetUpload = async (event) => {
  const file = event.target?.files?.[0];
  if (!file) return;

  uploadingDatasheet.value = true;
  try {
    const res = await api.uploadMedia('datasheets', file);
    form.datasheetURL = res.filename;
  } catch (err) {
    console.error('Failed to upload datasheet:', err);
    alert('Failed to upload datasheet: ' + (err.response?.data?.error || err.message));
  } finally {
    uploadingDatasheet.value = false;
    if (event.target) event.target.value = '';
  }
};

const handlePhotoUpload = async (event) => {
  const file = event.target?.files?.[0];
  if (!file) return;

  uploadingPhoto.value = true;
  try {
    const res = await api.uploadMedia('components', file);
    form.photoURL = res.filename;
  } catch (err) {
    console.error('Failed to upload component photo:', err);
    alert('Failed to upload photo: ' + (err.response?.data?.error || err.message));
  } finally {
    uploadingPhoto.value = false;
    if (event.target) event.target.value = '';
  }
};

const initialForm = () => ({
  component: '',
  category_id: null,
  package_id: null,
  marking: '',
  shortDescription: '',
  description: '',
  qty: 0,
  minQty: 0,
  storageId: null,
  datasheetURL: '',
  photoURL: ''
});

const form = reactive(initialForm());

// Form validation rules
const rules = {
  required: (v) => (!!v && !!String(v).trim()) || 'This field is required',
  requiredSelection: (v) => (v !== null && v !== undefined && v !== '') || 'Please select an option',
  nonNegativeNumber: (v) => (v === null || v === undefined || v === '' || (Number(v) >= 0 && Number.isInteger(Number(v)))) || 'Must be a non-negative integer',
  maxLength: (max) => (v) => (!v || String(v).length <= max) || `Maximum ${max} characters`
};

// Local catalog state with props sync
const localCategories = ref([]);
const localPackages = ref([]);

watch(() => props.categories, (cats) => {
  if (cats && cats.length > 0) {
    localCategories.value = [...cats];
  }
}, { immediate: true });

watch(() => props.packages, (pkgs) => {
  if (pkgs && pkgs.length > 0) {
    localPackages.value = [...pkgs];
  }
}, { immediate: true });

const availableCategories = computed(() => {
  return localCategories.value.length > 0 ? localCategories.value : props.categories;
});

const availablePackages = computed(() => {
  return localPackages.value.length > 0 ? localPackages.value : props.packages;
});

// Packages filtered by SMD / THT toggle
const filteredPackagesList = computed(() => {
  const pkgs = availablePackages.value;
  if (packageMountType.value === 'smd') {
    return pkgs.filter(p => p.isSmd === 1);
  }
  if (packageMountType.value === 'tht') {
    return pkgs.filter(p => p.isSmd === 0);
  }
  return pkgs;
});

// Selected package object details
const selectedPackageObj = computed(() => {
  if (!form.package_id) return null;
  return availablePackages.value.find(p => p.ID === form.package_id) || null;
});

// Quick Category State & Functions
const showQuickCategory = ref(false);
const quickCategoryName = ref('');
const quickCategoryError = ref('');
const quickCategorySaving = ref(false);

const openQuickCategory = () => {
  quickCategoryName.value = '';
  quickCategoryError.value = '';
  showQuickCategory.value = true;
};

const submitQuickCategory = async () => {
  const name = quickCategoryName.value.trim();
  if (!name) {
    quickCategoryError.value = 'Category name is required';
    return;
  }
  quickCategorySaving.value = true;
  quickCategoryError.value = '';
  try {
    const res = await api.createCategory({ category: name });
    const refreshed = await api.getCategories();
    localCategories.value = refreshed;
    form.category_id = res.ID;
    showQuickCategory.value = false;
    emit('catalog-updated');
  } catch (err) {
    quickCategoryError.value = err.response?.data?.error || err.message;
  } finally {
    quickCategorySaving.value = false;
  }
};

// Quick Package State & Functions
const showQuickPackage = ref(false);
const quickPackageForm = reactive({
  package: '',
  pinQuantity: null,
  isSmd: 1,
  drawingURL: ''
});
const quickPackageError = ref('');
const quickPackageSaving = ref(false);
const uploadingQuickDrawing = ref(false);
const quickDrawingInputRef = ref(null);

const handleQuickDrawingUpload = async (event) => {
  const file = event.target?.files?.[0];
  if (!file) return;

  uploadingQuickDrawing.value = true;
  try {
    const res = await api.uploadMedia('packages', file);
    quickPackageForm.drawingURL = res.filename;
  } catch (err) {
    console.error('Failed to upload package drawing:', err);
    alert('Failed to upload drawing: ' + (err.response?.data?.error || err.message));
  } finally {
    uploadingQuickDrawing.value = false;
    if (event.target) event.target.value = '';
  }
};

const openQuickPackage = () => {
  quickPackageForm.package = '';
  quickPackageForm.pinQuantity = null;
  quickPackageForm.isSmd = packageMountType.value === 'tht' ? 0 : 1;
  quickPackageForm.drawingURL = '';
  quickPackageError.value = '';
  showQuickPackage.value = true;
};

const submitQuickPackage = async () => {
  const name = quickPackageForm.package.trim();
  if (!name) {
    quickPackageError.value = 'Package footprint name is required';
    return;
  }
  quickPackageSaving.value = true;
  quickPackageError.value = '';
  try {
    const payload = {
      package: name,
      pinQuantity: quickPackageForm.pinQuantity,
      isSmd: quickPackageForm.isSmd,
      drawingURL: quickPackageForm.drawingURL.trim()
    };
    const res = await api.createPackage(payload);
    const refreshed = await api.getPackages();
    localPackages.value = refreshed;
    form.package_id = res.ID;
    showQuickPackage.value = false;
    emit('catalog-updated');
  } catch (err) {
    quickPackageError.value = err.response?.data?.error || err.message;
  } finally {
    quickPackageSaving.value = false;
  }
};

// Load storages when dialog opens
const loadStorages = async () => {
  if (storages.value.length > 0) return;
  try {
    const data = await api.getStorages();
    storages.value = data || [];
    const defaultStorage = storages.value.find(s => s.storage.toLowerCase().includes('default'));
    if (defaultStorage && !form.storageId) {
      form.storageId = defaultStorage.ID;
    }
  } catch (err) {
    console.warn('Failed to load storages:', err);
  }
};

const applyInitialDataOrDefaults = () => {
  const source = (props.component && props.initialData)
    ? { ...props.component, ...props.initialData }
    : (props.component || props.initialData);
  if (source) {
    form.component = source.component || '';
    form.marking = source.marking || '';
    form.category_id = source.category_id ? Number(source.category_id) : null;
    form.package_id = source.package_id ? Number(source.package_id) : null;
    form.shortDescription = source.shortDescription || '';
    form.description = source.description || '';
    form.qty = source.qty !== undefined && source.qty !== null ? source.qty : 0;
    form.minQty = source.minQty !== undefined && source.minQty !== null ? source.minQty : 0;
    // Look up storage from warehouse allocations if available
    const warehouseStorageId = source.warehouse?.[0]?.storageId;
    form.storageId = source.storageId || source.storage_id || warehouseStorageId || null;
    form.datasheetURL = source.datasheetURL || '';
    form.photoURL = source.photoURL || '';
  } else {
    resetFormFields();
  }

  // Ensure a default package if still null
  if (!form.package_id && props.packages.length > 0) {
    const defaultPkg = props.packages.find(p => p.ID === 28) || props.packages[0];
    if (defaultPkg) form.package_id = defaultPkg.ID;
  }

  packageMountType.value = 'all';
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    errorMessage.value = '';
    isCloning.value = props.isClone;
    clonedSourceName.value = props.isClone ? (props.component?.component || '') : '';
    loadStorages();
    applyInitialDataOrDefaults();
    if (props.isClone && form.component && clonedSourceName.value && form.component === clonedSourceName.value && !form.component.endsWith('(Copy)')) {
      form.component = `${form.component} (Copy)`;
    }
  } else {
    isCloning.value = false;
    clonedSourceName.value = '';
  }
});

const resetFormFields = () => {
  const defaults = initialForm();
  Object.keys(defaults).forEach(key => {
    form[key] = defaults[key];
  });
  if (props.packages.length > 0) {
    const defaultPkg = props.packages.find(p => p.ID === 28) || props.packages[0];
    if (defaultPkg) form.package_id = defaultPkg.ID;
  }
  if (formRef.value) {
    formRef.value.resetValidation();
  }
};

const close = () => {
  dialogModel.value = false;
  isCloning.value = false;
  clonedSourceName.value = '';
  resetFormFields();
};

const submitForm = async () => {
  if (!formRef.value) return;
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  if (props.draftMode) {
    emit('created', { ...form });
    close();
    return;
  }

  // When editing an existing component, proceed directly without duplicate check
  if (isEditMode.value) {
    await proceedSave(false);
    return;
  }

  try {
    submitting.value = true;
    errorMessage.value = '';

    // Check if similar component already exists
    const checkRes = await api.checkExistingComponent({
      component: form.component.trim(),
      category_id: form.category_id,
      package_id: form.package_id
    });

    if (checkRes.exists && checkRes.matches?.length > 0) {
      duplicateMatches.value = checkRes.matches;
      showDuplicateWarning.value = true;
      submitting.value = false;
      return;
    }

    await proceedSave(false);
  } catch (err) {
    console.error('Error checking duplicate component:', err);
    errorMessage.value = err.response?.data?.error || err.message || 'Validation failed';
    submitting.value = false;
  }
};

const proceedSave = async (fromConfirmation = false) => {
  try {
    submitting.value = true;
    errorMessage.value = '';

    const payload = {
      component: form.component.trim(),
      category_id: form.category_id,
      package_id: form.package_id || 28,
      marking: form.marking ? form.marking.trim() : '',
      shortDescription: form.shortDescription ? form.shortDescription.trim() : '',
      description: form.description ? form.description.trim() : '',
      qty: parseInt(form.qty, 10) || 0,
      minQty: form.minQty !== undefined && form.minQty !== null ? parseInt(form.minQty, 10) : 0,
      storageId: form.qty > 0 && form.storageId ? form.storageId : null,
      datasheetURL: form.datasheetURL ? form.datasheetURL.trim() : null,
      photoURL: form.photoURL ? form.photoURL.trim() : null
    };

    const source = props.component || props.initialData;
    const categoryName = availableCategories.value.find(c => Number(c.ID || c.id) === Number(payload.category_id))?.category || '';
    const packageObj = availablePackages.value.find(p => Number(p.ID || p.id) === Number(payload.package_id));

    if (isEditMode.value && source) {
      const compId = Number(source.ID || source.id);
      await api.updateComponent(compId, payload);

      const normalizedComp = {
        ...source,
        ...payload,
        ID: compId,
        id: compId,
        category: categoryName,
        package: packageObj?.package || '',
        isSmd: packageObj?.isSmd ?? null
      };

      emit('updated', normalizedComp);
      emit('saved', normalizedComp);
      close();
    } else {
      const newComponent = await api.createComponent(payload);
      const compId = Number(newComponent.ID || newComponent.id || newComponent.insertId);
      const normalizedComp = {
        ...newComponent,
        ...payload,
        ID: compId,
        id: compId,
        category: categoryName,
        package: packageObj?.package || '',
        isSmd: packageObj?.isSmd ?? null
      };

      emit('created', normalizedComp);
      emit('saved', normalizedComp);

      if (fromConfirmation) {
        showDuplicateWarning.value = false;
      }

      if (addAnother.value && !props.hideAddAnother) {
        const prevCategory = form.category_id;
        const prevPackage = form.package_id;
        const prevQty = form.qty;
        const prevMinQty = form.minQty;
        const prevStorage = form.storageId;
        resetFormFields();
        form.category_id = prevCategory;
        form.package_id = prevPackage;
        form.qty = prevQty;
        form.minQty = prevMinQty;
        form.storageId = prevStorage;
      } else {
        close();
      }
    }
  } catch (err) {
    console.error('Error saving component:', err);
    errorMessage.value = err.response?.data?.error || err.message || 'Failed to save component';
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.tracking-wider {
  letter-spacing: 0.05em;
}
</style>
