<template>
  <v-dialog
    :model-value="modelValue"
    max-width="750"
    scrollable
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-0 border bg-white d-flex flex-column" style="max-height: 90vh;" v-if="bomItem">
      <!-- Dialog Header -->
      <v-card-title class="bg-slate-50 py-3 px-5 d-flex align-center justify-space-between border-b flex-shrink-0">
        <div class="d-flex align-center">
          <v-avatar color="primary" variant="tonal" size="36" class="me-3">
            <v-icon size="20" color="primary">mdi-swap-horizontal</v-icon>
          </v-avatar>
          <div>
            <div class="text-subtitle-1 font-weight-bold text-slate-900">
              {{ t('bomAnalogs.title') }}
            </div>
            <div class="text-caption text-slate-500">
              {{ t('bomAnalogs.subtitle', { project: projectName }) }}
            </div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>

      <v-card-text class="pa-5 flex-grow-1 overflow-y-auto">
        <!-- 1. PRIMARY BOM COMPONENT CARD -->
        <div class="mb-4">
          <div class="text-caption font-weight-bold text-slate-500 text-uppercase tracking-wider mb-1">
            {{ t('bomAnalogs.primaryComponent') }}
          </div>
          <v-card variant="outlined" class="rounded-lg border bg-slate-50 pa-3">
            <div class="d-flex align-center justify-space-between flex-wrap gap-2">
              <div class="d-flex align-center gap-3">
                <v-avatar
                  rounded="lg"
                  size="42"
                  class="border bg-white"
                  :class="{ 'cursor-pointer': !!bomItem.componentId }"
                  :title="t('dialogs.clickDetails')"
                  @click="openComponentDetails(bomItem)"
                >
                  <MediaImage
                    type="component"
                    :src="bomItem.componentPhotoURL"
                    height="42px"
                    width="42px"
                  />
                </v-avatar>
                <div>
                  <div class="d-flex align-center gap-2">
                    <span
                      class="font-mono font-weight-bold text-body-1 text-primary cursor-pointer hover-underline"
                      :title="t('dialogs.clickDetails')"
                      @click="openComponentDetails(bomItem)"
                    >
                      {{ bomItem.component }}
                    </span>
                    <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-medium">
                      Primary
                    </v-chip>
                  </div>
                  <div class="text-caption text-slate-500 d-flex align-center gap-2 flex-wrap">
                    <span v-if="bomItem.marking" class="font-mono">Mark: {{ bomItem.marking }}</span>
                    <span v-if="bomItem.category">• {{ bomItem.category }}</span>
                    <span v-if="bomItem.package">• {{ bomItem.package }}</span>
                    <span v-if="bomItem.shortDescription">• {{ bomItem.shortDescription }}</span>
                  </div>
                </div>
              </div>

              <!-- Required & Stock Status -->
              <div class="d-flex align-center gap-3">
                <div class="text-right">
                  <div class="text-caption text-slate-500">
                    {{ t('bomAnalogs.requiredQty', { qty: bomItem.requiredQuantity }) }}
                  </div>
                  <div
                    class="font-mono font-weight-bold text-body-2"
                    :class="bomItem.isStockSufficient ? 'text-success' : 'text-error'"
                  >
                    {{ t('bomAnalogs.inStockQty', { qty: bomItem.stockQuantity ?? 0 }) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Circuit Comments / Notes -->
            <div class="mt-2 pt-2 border-t text-caption text-slate-600 font-mono" v-if="bomItem.comment">
              <span class="text-slate-400">Designators / Notes:</span> {{ bomItem.comment }}
            </div>
          </v-card>
        </div>

        <v-divider class="my-4" />

        <!-- 2. CONFIGURED ANALOGS LIST -->
        <div class="mb-4">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="text-caption font-weight-bold text-slate-700 text-uppercase tracking-wider">
              {{ t('bomAnalogs.configuredAnalogs', { count: currentSubstitutes.length }) }}
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="currentSubstitutes.length === 0"
            class="text-center py-6 px-4 border border-dashed rounded-lg bg-slate-50 text-slate-500"
          >
            <v-icon size="32" color="slate-400" class="mb-2">mdi-call-split</v-icon>
            <div class="text-body-2 font-weight-medium">
              {{ t('bomAnalogs.noAnalogsYet') }}
            </div>
          </div>

          <!-- Analogs List -->
          <div class="d-flex flex-column gap-2" v-else>
            <v-card
              v-for="sub in currentSubstitutes"
              :key="sub.id"
              variant="outlined"
              class="rounded-lg border bg-white pa-3 hover-card"
            >
              <div class="d-flex align-start justify-space-between gap-2">
                <div class="d-flex align-start gap-3">
                  <v-avatar
                    rounded="lg"
                    size="38"
                    class="border bg-slate-50 mt-1"
                    :class="{ 'cursor-pointer': !!(sub.componentId || sub.ID || sub.id) }"
                    :title="t('dialogs.clickDetails')"
                    @click="openComponentDetails(sub)"
                  >
                    <MediaImage
                      type="component"
                      :src="sub.componentPhotoURL"
                      height="38px"
                      width="38px"
                    />
                  </v-avatar>
                  <div>
                    <div class="d-flex align-center gap-2 flex-wrap">
                      <span
                        class="font-mono font-weight-bold text-body-2 text-primary cursor-pointer hover-underline"
                        :title="t('dialogs.clickDetails')"
                        @click="openComponentDetails(sub)"
                      >
                        {{ sub.component }}
                      </span>
                      <v-chip
                        size="x-small"
                        :color="(sub.stockQuantity ?? 0) >= bomItem.requiredQuantity ? 'success' : 'slate-500'"
                        variant="tonal"
                        class="font-mono font-weight-bold"
                      >
                        {{ t('bomAnalogs.inStockQty', { qty: sub.stockQuantity ?? 0 }) }}
                      </v-chip>
                      <v-chip
                        v-if="!bomItem.isStockSufficient && (sub.stockQuantity ?? 0) >= bomItem.requiredQuantity"
                        size="x-small"
                        color="success"
                        variant="flat"
                        class="font-weight-bold"
                      >
                        ✓ Can Cover Shortage
                      </v-chip>
                    </div>

                    <div class="text-caption text-slate-500 d-flex align-center gap-2 flex-wrap mt-0.5">
                      <span v-if="sub.marking" class="font-mono">Mark: {{ sub.marking }}</span>
                      <span v-if="sub.category">• {{ sub.category }}</span>
                      <span v-if="sub.package">• {{ sub.package }}</span>
                      <span v-if="sub.shortDescription">• {{ sub.shortDescription }}</span>
                    </div>

                    <!-- Notes Display / Edit -->
                    <div class="mt-2 text-caption">
                      <div v-if="editingSubId === sub.id" class="d-flex align-center gap-2 mt-1">
                        <v-text-field
                          v-model="editNoteText"
                          density="compact"
                          variant="outlined"
                          hide-details
                          rounded="lg"
                          class="flex-grow-1"
                          @keydown.enter="saveEditNote(sub)"
                        />
                        <v-btn
                          size="small"
                          color="primary"
                          variant="flat"
                          :loading="savingNote"
                          @click="saveEditNote(sub)"
                        >
                          {{ t('bomAnalogs.saveNote') }}
                        </v-btn>
                        <v-btn
                          size="small"
                          variant="text"
                          @click="editingSubId = null"
                        >
                          {{ t('common.cancel') }}
                        </v-btn>
                      </div>
                      <div v-else class="d-flex align-center gap-2">
                        <span class="text-slate-600 italic" v-if="sub.notes">
                          "{{ sub.notes }}"
                        </span>
                        <span class="text-slate-400 italic" v-else>
                          (no notes)
                        </span>
                        <v-btn
                          icon="mdi-pencil-outline"
                          size="x-small"
                          variant="text"
                          color="slate-500"
                          :title="t('bomAnalogs.editNote')"
                          @click="startEditNote(sub)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Actions for Substitute -->
                <div class="d-flex align-center gap-1">
                  <v-btn
                    color="primary"
                    variant="tonal"
                    size="small"
                    class="font-weight-medium text-caption"
                    prepend-icon="mdi-swap-horizontal-bold"
                    :loading="swappingId === (sub.id ?? sub.ID)"
                    :title="t('bomAnalogs.makePrimaryTooltip')"
                    @click.stop="promptSwapPrimary(sub)"
                  >
                    {{ t('bomAnalogs.makePrimaryBtn') }}
                  </v-btn>

                  <v-btn
                    icon="mdi-delete-outline"
                    size="small"
                    color="error"
                    variant="text"
                    :loading="deletingId === (sub.id ?? sub.ID)"
                    :title="t('bomAnalogs.deleteAnalog')"
                    @click.stop="promptDeleteSubstitute(sub)"
                  />
                </div>
              </div>
            </v-card>
          </div>
        </div>

        <v-divider class="my-4" />

        <!-- 3. ADD REPLACEMENT / ANALOG FORM -->
        <div class="bg-slate-50 pa-4 rounded-lg border">
          <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-3">
            <div class="text-subtitle-2 font-weight-bold text-slate-800 d-flex align-center gap-2">
              <v-icon size="18" color="primary">mdi-plus-circle-outline</v-icon>
              <span>{{ t('bomAnalogs.addAnalogTitle') }}</span>
            </div>
            <v-btn
              color="primary"
              variant="outlined"
              size="small"
              prepend-icon="mdi-database-search-outline"
              class="font-weight-medium bg-white"
              @click="openCatalogPicker"
            >
              {{ t('bomAnalogs.browseCatalogBtn') }}
            </v-btn>
          </div>

          <!-- If a candidate component is chosen: show rich preview card -->
          <div v-if="selectedCandidate" class="mb-3">
            <v-card variant="outlined" class="rounded-lg border bg-white pa-3">
              <div class="d-flex align-center justify-space-between flex-wrap gap-2">
                <div class="d-flex align-center gap-3">
                  <v-avatar
                    rounded="lg"
                    size="40"
                    class="border bg-slate-50"
                    :class="{ 'cursor-pointer': !!(selectedCandidate.ID || selectedCandidate.id) }"
                    :title="t('dialogs.clickDetails')"
                    @click="openComponentDetails(selectedCandidate)"
                  >
                    <MediaImage
                      type="component"
                      :src="selectedCandidate.photoURL"
                      height="40px"
                      width="40px"
                    />
                  </v-avatar>
                  <div>
                    <div class="d-flex align-center gap-2 flex-wrap">
                      <span
                        class="font-mono font-weight-bold text-body-2 text-primary cursor-pointer hover-underline"
                        :title="t('dialogs.clickDetails')"
                        @click="openComponentDetails(selectedCandidate)"
                      >
                        {{ selectedCandidate.component }}
                      </span>
                      <v-chip
                        size="x-small"
                        :color="(selectedCandidate.qty ?? 0) >= (bomItem?.requiredQuantity || 1) ? 'success' : 'slate-500'"
                        variant="tonal"
                        class="font-mono font-weight-bold"
                      >
                        {{ t('bomAnalogs.inStockQty', { qty: selectedCandidate.qty ?? 0 }) }}
                      </v-chip>
                      <v-chip
                        v-if="!bomItem?.isStockSufficient && (selectedCandidate.qty ?? 0) >= (bomItem?.requiredQuantity || 1)"
                        size="x-small"
                        color="success"
                        variant="flat"
                        class="font-weight-bold"
                      >
                        ✓ Can Cover Shortage
                      </v-chip>
                    </div>
                    <div class="text-caption text-slate-500 d-flex align-center gap-2 flex-wrap mt-0.5">
                      <span v-if="selectedCandidate.marking" class="font-mono">Mark: {{ selectedCandidate.marking }}</span>
                      <span v-if="selectedCandidate.category">• {{ selectedCandidate.category }}</span>
                      <span v-if="selectedCandidate.package">• {{ selectedCandidate.package }}</span>
                      <span v-if="selectedCandidate.shortDescription">• {{ selectedCandidate.shortDescription }}</span>
                    </div>
                  </div>
                </div>

                <div class="d-flex align-center gap-2">
                  <v-btn
                    variant="text"
                    size="small"
                    color="slate-600"
                    prepend-icon="mdi-pencil-outline"
                    @click="openCatalogPicker"
                  >
                    {{ t('bomAnalogs.changeComponent') }}
                  </v-btn>
                  <v-btn
                    variant="text"
                    size="small"
                    color="error"
                    icon="mdi-close"
                    @click="clearCandidate"
                  />
                </div>
              </div>
            </v-card>
          </div>

          <!-- Quick autocomplete if no candidate selected yet -->
          <v-row dense v-else class="mb-2">
            <v-col cols="12">
              <v-autocomplete
                v-model="newSubComponentId"
                :items="availableComponents"
                :loading="loadingComponents"
                item-title="displayName"
                item-value="ID"
                :label="t('bomAnalogs.selectComponent')"
                :placeholder="t('bomAnalogs.componentPlaceholder')"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                rounded="lg"
                class="bg-white"
                append-inner-icon="mdi-database-search-outline"
                @click:append-inner="openCatalogPicker"
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps" :title="item.raw.component">
                    <template #subtitle>
                      <span class="text-caption text-slate-500">
                        {{ item.raw.package || 'No package' }} • {{ item.raw.category || 'No category' }}
                        <span v-if="item.raw.shortDescription"> • {{ item.raw.shortDescription }}</span>
                      </span>
                    </template>
                    <template #append>
                      <v-chip
                        size="x-small"
                        :color="(item.raw.qty ?? 0) > 0 ? 'success' : 'slate-400'"
                        variant="tonal"
                        class="font-mono font-weight-bold"
                      >
                        Stock: {{ item.raw.qty ?? 0 }}
                      </v-chip>
                    </template>
                  </v-list-item>
                </template>
              </v-autocomplete>
            </v-col>
          </v-row>

          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="newSubNotes"
                :label="t('bomAnalogs.notesLabel')"
                :placeholder="t('bomAnalogs.notesPlaceholder')"
                density="compact"
                variant="outlined"
                hide-details
                rounded="lg"
                class="bg-white"
                @keydown.enter="handleAddSubstitute"
              />
            </v-col>

            <v-col cols="12" class="d-flex justify-end mt-2">
              <v-btn
                color="primary"
                variant="flat"
                prepend-icon="mdi-plus"
                :disabled="!newSubComponentId"
                :loading="addingSubstitute"
                @click="handleAddSubstitute"
              >
                {{ t('bomAnalogs.addBtn') }}
              </v-btn>
            </v-col>
          </v-row>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Footer -->
      <v-card-actions class="pa-3 bg-slate-50 d-flex justify-end flex-shrink-0">
        <v-btn variant="outlined" color="slate-700" @click="close">
          {{ t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Re-using AddComponentDialog to find & pick analogs with rich catalog filters -->
    <AddComponentDialog
      v-model="catalogPickerOpen"
      :picker-mode="true"
      :hide-clone-button="true"
      :title="t('bomAnalogs.pickerTitle', { component: bomItem?.component })"
      :subtitle="projectName ? `${projectName} • ${bomItem?.package || ''}` : (bomItem?.package || '')"
      :initial-categories="catalogInitialCategories"
      :initial-packages="catalogInitialPackages"
      :excluded-component-ids="excludedComponentIds"
      :select-button-text="t('bomAnalogs.selectAsAnalog')"
      select-button-icon="mdi-swap-horizontal"
      @select="onCatalogComponentPicked"
    />

    <!-- Delete Substitute Confirmation Dialog -->
    <v-dialog v-model="showDeleteConfirmDialog" max-width="440">
      <v-card class="rounded-0 border bg-white">
        <v-card-item class="bg-slate-50 py-3 px-5 border-b">
          <div class="d-flex align-center">
            <v-icon color="error" class="me-2">mdi-alert-circle-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold text-slate-900">
              {{ t('bomAnalogs.deleteAnalog') }}
            </span>
          </div>
        </v-card-item>
        <v-card-text class="pa-5 text-body-2 text-slate-700" v-if="subToDelete">
          {{ t('bomAnalogs.deleteConfirm', { name: subToDelete.component }) }}
        </v-card-text>
        <v-card-actions class="px-5 py-3 border-t bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="outlined" size="small" @click="showDeleteConfirmDialog = false">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            size="small"
            class="font-weight-bold"
            :loading="deletingId === (subToDelete?.id ?? subToDelete?.ID)"
            @click="executeDeleteSubstitute"
          >
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Swap Primary Confirmation Dialog -->
    <v-dialog v-model="showSwapConfirmDialog" max-width="460">
      <v-card class="rounded-0 border bg-white">
        <v-card-item class="bg-slate-50 py-3 px-5 border-b">
          <div class="d-flex align-center">
            <v-icon color="primary" class="me-2">mdi-swap-horizontal-bold</v-icon>
            <span class="text-subtitle-1 font-weight-bold text-slate-900">
              {{ t('bomAnalogs.makePrimaryBtn') }}
            </span>
          </div>
        </v-card-item>
        <v-card-text class="pa-5 text-body-2 text-slate-700" v-if="subToSwap">
          {{ t('bomAnalogs.makePrimaryConfirm', { name: subToSwap.component, current: bomItem?.component }) }}
        </v-card-text>
        <v-card-actions class="px-5 py-3 border-t bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="outlined" size="small" @click="showSwapConfirmDialog = false">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold"
            :loading="swappingId === (subToSwap?.id ?? subToSwap?.ID)"
            @click="executeSwapPrimary"
          >
            {{ t('bomAnalogs.makePrimaryBtn') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Component Details Pop-up Re-used from Components Table -->
    <ComponentDetailsDialog
      v-model="showDetailsDialog"
      :component="selectedDetailComponent"
      :show-select-button="false"
      @updated="emit('updated')"
    />
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from '@/services/api';
import MediaImage from '@/components/MediaImage.vue';
import AddComponentDialog from '@/components/AddComponentDialog.vue';
import ComponentDetailsDialog from '@/components/ComponentDetailsDialog.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  project: { type: Object, default: null },
  bomItem: { type: Object, default: null },
  openCatalogImmediately: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'updated']);

const { t } = useI18n();

const projectName = computed(() => props.project?.projectName || '');
const currentSubstitutes = ref([]);

// Component Search / Catalog State
const allComponents = ref([]);
const loadingComponents = ref(false);

// Component Details Dialog state
const showDetailsDialog = ref(false);
const selectedDetailComponent = ref(null);

const openComponentDetails = (comp) => {
  if (!comp) return;
  const compId = comp.componentId || comp.ID || comp.id;
  selectedDetailComponent.value = {
    ...comp,
    ID: compId,
    id: compId
  };
  showDetailsDialog.value = true;
};

// Catalog Picker state (re-using AddComponentDialog)
const catalogPickerOpen = ref(false);
const catalogInitialCategories = ref([]);
const catalogInitialPackages = ref([]);
const selectedCandidate = ref(null);

const newSubComponentId = ref(null);
const newSubNotes = ref('');
const addingSubstitute = ref(false);

const editingSubId = ref(null);
const editNoteText = ref('');
const savingNote = ref(false);

const swappingId = ref(null);
const deletingId = ref(null);

const excludedComponentIds = computed(() => {
  const ids = [];
  if (props.bomItem?.componentId) ids.push(Number(props.bomItem.componentId));
  if (currentSubstitutes.value) {
    currentSubstitutes.value.forEach(s => {
      if (s.componentId) ids.push(Number(s.componentId));
    });
  }
  return ids;
});

const openCatalogPicker = () => {
  catalogInitialCategories.value = props.bomItem?.categoryId ? [props.bomItem.categoryId] : [];
  catalogInitialPackages.value = props.bomItem?.packageId ? [props.bomItem.packageId] : [];
  catalogPickerOpen.value = true;
};

const onCatalogComponentPicked = (comp) => {
  if (!comp) return;
  selectedCandidate.value = comp;
  newSubComponentId.value = comp.ID;
  if (!allComponents.value.some(c => Number(c.ID) === Number(comp.ID))) {
    allComponents.value.unshift(comp);
  }
  catalogPickerOpen.value = false;
};

const clearCandidate = () => {
  selectedCandidate.value = null;
  newSubComponentId.value = null;
};

watch(newSubComponentId, (newId) => {
  if (newId) {
    const comp = allComponents.value.find(c => Number(c.ID) === Number(newId));
    if (comp) {
      selectedCandidate.value = comp;
    }
  } else {
    selectedCandidate.value = null;
  }
});

// Watch bomItem changes to update local substitutes list
watch(
  () => props.bomItem,
  (newItem) => {
    if (newItem) {
      currentSubstitutes.value = Array.isArray(newItem.substitutes) ? [...newItem.substitutes] : [];
    } else {
      currentSubstitutes.value = [];
    }
  },
  { immediate: true }
);

// Load components for autocomplete when dialog opens
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      newSubComponentId.value = null;
      newSubNotes.value = '';
      selectedCandidate.value = null;
      editingSubId.value = null;
      await loadCatalogComponents();
      if (props.openCatalogImmediately) {
        openCatalogPicker();
      }
    }
  }
);

const loadCatalogComponents = async () => {
  if (allComponents.value.length > 0) return;
  loadingComponents.value = true;
  try {
    const res = await api.getComponents({ limit: 1000, offset: 0 });
    allComponents.value = res.items || [];
  } catch (err) {
    console.error('Failed to load components for analog picker:', err);
  } finally {
    loadingComponents.value = false;
  }
};

const availableComponents = computed(() => {
  if (!props.bomItem) return [];
  const primaryId = Number(props.bomItem.componentId);
  const alreadyConfiguredIds = new Set(currentSubstitutes.value.map(s => Number(s.componentId)));

  return allComponents.value
    .filter(c => Number(c.ID) !== primaryId && !alreadyConfiguredIds.has(Number(c.ID)))
    .map(c => ({
      ...c,
      displayName: `${c.component}${c.marking ? ` [${c.marking}]` : ''}${c.shortDescription ? ` - ${c.shortDescription}` : ''}`
    }));
});

const handleAddSubstitute = async () => {
  const projectId = props.project?.id || props.project?.ID || props.bomItem?.projectId;
  const bomId = props.bomItem?.bomId || props.bomItem?.id;
  if (!newSubComponentId.value || !projectId || !bomId) return;
  addingSubstitute.value = true;
  try {
    const created = await api.addBomSubstitute(projectId, bomId, {
      componentId: newSubComponentId.value,
      notes: newSubNotes.value
    });
    currentSubstitutes.value.push(created);
    newSubComponentId.value = null;
    selectedCandidate.value = null;
    newSubNotes.value = '';
    emit('updated');
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  } finally {
    addingSubstitute.value = false;
  }
};

const startEditNote = (sub) => {
  editingSubId.value = sub.id ?? sub.ID;
  editNoteText.value = sub.notes || '';
};

const saveEditNote = async (sub) => {
  const projectId = props.project?.id || props.project?.ID || props.bomItem?.projectId;
  const bomId = props.bomItem?.bomId || props.bomItem?.id;
  const subId = sub.id ?? sub.ID;
  if (!projectId || !bomId || !subId) return;
  savingNote.value = true;
  try {
    await api.updateBomSubstitute(projectId, bomId, subId, {
      notes: editNoteText.value
    });
    sub.notes = editNoteText.value.trim();
    editingSubId.value = null;
    emit('updated');
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  } finally {
    savingNote.value = false;
  }
};

const subToDelete = ref(null);
const showDeleteConfirmDialog = ref(false);

const promptDeleteSubstitute = (sub) => {
  subToDelete.value = sub;
  showDeleteConfirmDialog.value = true;
};

const executeDeleteSubstitute = async () => {
  if (!subToDelete.value || !props.bomItem) return;
  const sub = subToDelete.value;
  const projectId = props.project?.id || props.project?.ID || props.bomItem?.projectId;
  const bomId = props.bomItem?.bomId || props.bomItem?.id;
  const subId = sub.id ?? sub.ID;

  if (!projectId || !bomId || !subId) {
    console.error('Missing identifiers for deleting substitute:', { projectId, bomId, subId });
    return;
  }

  deletingId.value = subId;
  try {
    await api.deleteBomSubstitute(projectId, bomId, subId);
    currentSubstitutes.value = currentSubstitutes.value.filter(s => (s.id ?? s.ID) !== subId);
    showDeleteConfirmDialog.value = false;
    subToDelete.value = null;
    emit('updated');
  } catch (err) {
    console.error('Error deleting BOM substitute:', err);
    alert(err.response?.data?.error || err.message);
  } finally {
    deletingId.value = null;
  }
};

const subToSwap = ref(null);
const showSwapConfirmDialog = ref(false);

const promptSwapPrimary = (sub) => {
  subToSwap.value = sub;
  showSwapConfirmDialog.value = true;
};

const executeSwapPrimary = async () => {
  if (!subToSwap.value || !props.bomItem) return;
  const sub = subToSwap.value;
  const projectId = props.project?.id || props.project?.ID || props.bomItem?.projectId;
  const bomId = props.bomItem?.bomId || props.bomItem?.id;
  const subId = sub.id ?? sub.ID;

  if (!projectId || !bomId || !subId) {
    console.error('Missing identifiers for swapping primary BOM:', { projectId, bomId, subId });
    return;
  }

  swappingId.value = subId;
  try {
    await api.swapBomPrimary(projectId, bomId, subId);
    showSwapConfirmDialog.value = false;
    subToSwap.value = null;
    emit('updated');
    close();
  } catch (err) {
    console.error('Error swapping BOM primary:', err);
    alert(err.response?.data?.error || err.message);
  } finally {
    swappingId.value = null;
  }
};

const close = () => {
  emit('update:modelValue', false);
};
</script>

<style scoped>
.hover-card {
  transition: all 0.15s ease-in-out;
}
.hover-card:hover {
  background-color: #f8fafc !important;
  border-color: #cbd5e1 !important;
}
.tracking-wider {
  letter-spacing: 0.05em;
}
.cursor-pointer {
  cursor: pointer;
}
.hover-underline:hover {
  text-decoration: underline;
}
</style>
