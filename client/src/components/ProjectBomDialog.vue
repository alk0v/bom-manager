<template>
  <v-dialog
    :model-value="modelValue"
    width="94vw"
    max-width="1650"
    scrollable
    transition="dialog-bottom-transition"
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-0 border bg-white overflow-hidden" v-if="project">
      <!-- Modal Header -->
      <v-card-title class="bg-slate-50 py-3 px-5 border-b d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-avatar rounded="lg" size="44" class="border me-3 bg-white">
            <MediaImage
              type="project"
              :src="project.photoUrl"
              height="44px"
              width="44px"
            />
          </v-avatar>
          <div>
            <div class="text-h6 font-weight-bold text-slate-900 line-clamp-1">
              {{ project.projectName }}
            </div>
            <div class="text-caption text-disabled">
              {{ t('projects.projectId', { id: project.id }) }}
              <span class="mx-1">•</span>
              {{ t('projectDetail.bomTitle') }}
            </div>
          </div>
        </div>

        <div class="d-flex align-center gap-2">
          <!-- External link -->
          <v-btn
            v-if="project.url"
            :href="project.url"
            target="_blank"
            variant="outlined"
            size="small"
            color="primary"
            prepend-icon="mdi-open-in-new"
          >
            {{ t('projects.externalLink') }}
          </v-btn>

          <!-- Produce Button -->
          <v-btn
            variant="flat"
            size="small"
            color="primary"
            class="font-weight-bold"
            prepend-icon="mdi-factory"
            @click="openProduceDialog"
          >
            {{ t('projects.produce') }}
          </v-btn>

          <!-- Edit Project Button (optional if showProjectActions) -->
          <v-btn
            v-if="showProjectActions"
            variant="outlined"
            size="small"
            color="primary"
            prepend-icon="mdi-pencil-outline"
            :title="t('projects.editProject')"
            @click="emit('edit-project', project)"
          >
            {{ t('projects.editProject') }}
          </v-btn>

          <!-- Dedicated Page Button -->
          <v-btn
            :to="`/projects/${project.id}`"
            variant="outlined"
            size="small"
            color="primary"
            prepend-icon="mdi-window-maximize"
            :title="t('projects.openDedicatedPage')"
          >
            {{ t('common.details') }}
          </v-btn>

          <!-- Delete Project Button (optional if showProjectActions) -->
          <v-btn
            v-if="showProjectActions"
            variant="outlined"
            size="small"
            color="error"
            prepend-icon="mdi-delete-outline"
            :title="t('projects.deleteProject')"
            @click="emit('delete-project', project)"
          >
            {{ t('common.delete') }}
          </v-btn>

          <!-- Close Button -->
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="close"
          />
        </div>
      </v-card-title>

      <!-- Project Overview Bar -->
      <div class="bg-slate-50 px-5 py-3 border-b">
        <v-row dense align="center">
          <v-col cols="12" md="8">
            <div class="text-caption text-slate-500 font-weight-medium text-uppercase mb-1">
              {{ t('common.description') }}
            </div>
            <p class="text-body-2 text-slate-700 mb-0 pre-line">
              {{ project.description || t('projectDetail.noDescription') }}
            </p>
          </v-col>

          <v-col cols="12" md="4" class="d-flex flex-wrap align-center justify-md-end" style="gap: 12px;">
            <v-chip
              size="small"
              color="primary"
              variant="tonal"
              class="font-mono font-weight-bold"
              :title="t('projectDetail.partsPricedTooltip', { priced: modalBomCost.pricedCount, total: bomItems.length })"
            >
              <v-icon start size="14">mdi-currency-usd</v-icon>
              {{ t('projectDetail.estBomCost') }}: {{ formatCurrency(modalBomCost.totalCost) }}
              <span class="ms-1 text-caption opacity-80" v-if="bomItems.length > 0">
                ({{ modalBomCost.pricedCount }}/{{ bomItems.length }})
              </span>
            </v-chip>

            <v-chip
              size="small"
              :color="bomHealth.allSufficient ? 'success' : 'warning'"
              variant="flat"
              class="font-weight-bold"
            >
              <v-icon start size="14">
                {{ bomHealth.allSufficient ? 'mdi-check-circle' : 'mdi-alert-circle-outline' }}
              </v-icon>
              {{ bomHealth.inStockCount }} / {{ bomItems.length }} {{ t('projectDetail.partsInStock') }}
            </v-chip>

            <v-btn
              v-if="hasShortages"
              color="amber-darken-3"
              prepend-icon="mdi-cart-plus"
              size="small"
              variant="flat"
              :loading="addingAllShortages"
              @click="addAllShortagesToCart"
            >
              {{ t('projectDetail.buyAllShortages', { count: shortageItems.length }) }}
            </v-btn>
          </v-col>
        </v-row>
      </div>

      <!-- BOM Table Component -->
      <ProjectBomTable
        :items="bomItems"
        :loading="loadingBom"
        max-height="550px"
        @add-to-cart="addToCart"
        @edit-item="openEditBomDialog"
        @delete-item="confirmDeleteBom"
        @open-component-details="openComponentDetails"
        @open-photo="openPhotoLightbox($event.type, $event.src, $event.title)"
        @manage-analogs="openAnalogsDialog"
        @find-analog="openFindAnalogDialog"
      >
        <template #toolbar-actions>
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-plus"
            size="small"
            class="font-weight-bold"
            @click="openAddComponentDialog"
          >
            {{ t('projects.addComponent') }}
          </v-btn>
        </template>
      </ProjectBomTable>

      <v-divider />

      <!-- Modal Footer -->
      <v-card-actions class="pa-4 bg-slate-50 d-flex align-center justify-space-between">
        <div class="text-caption text-disabled">
          {{ t('projects.componentsListed', { count: bomItems.length }) }}
        </div>
        <v-btn variant="flat" color="slate-200" @click="close">
          {{ t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- DIALOG: Add Component to Project BOM -->
    <AddComponentDialog
      v-model="showAddDialog"
      :project-id="project?.id"
      :project-name="project?.projectName"
      @added="onComponentAdded"
    />

    <!-- DIALOG: Edit BOM Item -->
    <v-dialog v-model="showEditDialog" max-width="500">
      <v-card class="rounded-0 border bg-white" v-if="editingBom">
        <v-card-title class="bg-slate-50 py-3 px-4 font-weight-bold text-subtitle-1 border-b">
          {{ t('projectDetail.editBomItem') }}
        </v-card-title>
        <v-card-text class="pa-4">
          <div class="font-mono font-weight-bold text-subtitle-2 mb-3 text-primary">
            {{ editingBom.component }}
          </div>
          <v-text-field
            v-model.number="editingBom.requiredQuantity"
            :label="t('dialogs.requiredQty')"
            type="number"
            min="1"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />
          <v-text-field
            v-model="editingBom.comment"
            :label="t('dialogs.designatorsNotes')"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3 bg-slate-50">
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="submittingBom"
            @click="submitEditBom"
          >
            {{ t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOG: Produce Project -->
    <ProduceProjectDialog
      v-model="showProduceDialog"
      :project="project"
      @produced="onProduced"
      @notify="handleNotify"
    />

    <!-- DIALOG: BOM Component Analogs / Substitutes -->
    <BomAnalogsDialog
      v-model="showAnalogsDialog"
      :project="project"
      :bom-item="selectedAnalogsBomItem"
      :open-catalog-immediately="openCatalogImmediately"
      @updated="refreshBom"
    />

    <!-- Component Details Dialog -->
    <ComponentDetailsDialog
      v-model="showDetailsDialog"
      :component="selectedDetailComponent"
      @updated="refreshBom"
      @deleted="refreshBom"
    />

    <!-- Full size media lightbox dialog -->
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
import AddComponentDialog from './AddComponentDialog.vue';
import ProjectBomTable from './ProjectBomTable.vue';
import ComponentDetailsDialog from './ComponentDetailsDialog.vue';
import ProduceProjectDialog from './ProduceProjectDialog.vue';
import BomAnalogsDialog from './BomAnalogsDialog.vue';
import { formatCurrency } from '../utils/formatters';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  project: {
    type: Object,
    default: null
  },
  showProjectActions: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'update:modelValue',
  'edit-project',
  'delete-project',
  'updated',
  'notify'
]);

const { t } = useI18n();

const bomItems = ref([]);
const loadingBom = ref(false);
const submittingBom = ref(false);
const addingAllShortages = ref(false);

const showAddDialog = ref(false);
const showEditDialog = ref(false);
const showProduceDialog = ref(false);
const showDetailsDialog = ref(false);
const showAnalogsDialog = ref(false);

const editingBom = ref(null);
const selectedDetailComponent = ref(null);
const selectedAnalogsBomItem = ref(null);
const openCatalogImmediately = ref(false);

const lightbox = ref({
  show: false,
  type: 'component',
  src: null,
  title: ''
});

const close = () => {
  emit('update:modelValue', false);
};

const handleNotify = (text, color = 'success') => {
  emit('notify', text, color);
};

const bomHealth = computed(() => {
  const inStockCount = bomItems.value.filter(i => i.isStockSufficient).length;
  return {
    inStockCount,
    allSufficient: inStockCount === bomItems.value.length && bomItems.value.length > 0
  };
});

const shortageItems = computed(() => {
  return bomItems.value.filter(i => !i.isStockSufficient);
});

const hasShortages = computed(() => shortageItems.value.length > 0);

const modalBomCost = computed(() => {
  let totalCost = 0;
  let pricedCount = 0;
  for (const item of bomItems.value) {
    if (item.totalItemCost != null) {
      totalCost += Number(item.totalItemCost);
      pricedCount++;
    }
  }
  return {
    totalCost: Math.round(totalCost * 100) / 100,
    pricedCount,
    unpricedCount: bomItems.value.length - pricedCount
  };
});

const loadBom = async () => {
  if (!props.project?.id) {
    bomItems.value = [];
    return;
  }
  loadingBom.value = true;
  try {
    bomItems.value = await api.getProjectBom(props.project.id);
  } catch (err) {
    handleNotify(`${t('projectDetail.bomTitle')}: ${err.message}`, 'error');
  } finally {
    loadingBom.value = false;
  }
};

watch(() => props.modelValue, (val) => {
  if (val && props.project?.id) {
    loadBom();
  }
});

watch(() => props.project?.id, (newId, oldId) => {
  if (props.modelValue && newId && newId !== oldId) {
    loadBom();
  }
});

const refreshBom = async () => {
  await loadBom();
  emit('updated');
  if (selectedAnalogsBomItem.value) {
    const refreshed = bomItems.value.find(b => b.bomId === selectedAnalogsBomItem.value.bomId);
    if (refreshed) {
      selectedAnalogsBomItem.value = refreshed;
    }
  }
};

const openProduceDialog = () => {
  showProduceDialog.value = true;
};

const onProduced = async () => {
  await refreshBom();
};

const openAddComponentDialog = () => {
  showAddDialog.value = true;
};

const onComponentAdded = async (item) => {
  handleNotify(`Added ${item?.component || 'component'} to BOM!`);
  await refreshBom();
};

const openEditBomDialog = (item) => {
  editingBom.value = { ...item };
  showEditDialog.value = true;
};

const submitEditBom = async () => {
  if (!editingBom.value || !props.project) return;
  submittingBom.value = true;
  try {
    await api.updateBomItem(props.project.id, editingBom.value.bomId, {
      quantity: editingBom.value.requiredQuantity,
      comment: editingBom.value.comment
    });
    handleNotify('BOM item updated!');
    showEditDialog.value = false;
    await refreshBom();
  } catch (err) {
    handleNotify('Error updating BOM item: ' + (err.response?.data?.details || err.message), 'error');
  } finally {
    submittingBom.value = false;
  }
};

const confirmDeleteBom = async (item) => {
  if (confirm(`Remove ${item.component} from this BOM?`)) {
    try {
      await api.deleteBomItem(props.project.id, item.bomId);
      handleNotify('Component removed from BOM');
      await refreshBom();
    } catch (err) {
      handleNotify('Error removing component: ' + (err.response?.data?.details || err.message), 'error');
    }
  }
};

const addToCart = async (item) => {
  try {
    await api.addToShoppingList({
      componentId: item.componentId,
      qty: item.shortageQuantity || item.requiredQuantity
    });
    handleNotify(`Added ${item.component} to shopping list!`);
    emit('updated');
  } catch (err) {
    handleNotify('Error adding to shopping list: ' + err.message, 'error');
  }
};

const addAllShortagesToCart = async () => {
  addingAllShortages.value = true;
  try {
    for (const item of shortageItems.value) {
      await api.addToShoppingList({
        componentId: item.componentId,
        qty: item.shortageQuantity
      });
    }
    handleNotify(`Added ${shortageItems.value.length} shortages to shopping list!`);
    emit('updated');
  } catch (err) {
    handleNotify('Failed to add shortages: ' + err.message, 'error');
  } finally {
    addingAllShortages.value = false;
  }
};

const openComponentDetails = (item) => {
  selectedDetailComponent.value = {
    ...item,
    ID: item.componentId || item.ID,
    id: item.componentId || item.id
  };
  showDetailsDialog.value = true;
};

const openPhotoLightbox = (type, src, title) => {
  if (!src) return;
  lightbox.value = {
    show: true,
    type: type || 'component',
    src,
    title
  };
};

const openAnalogsDialog = (item) => {
  selectedAnalogsBomItem.value = item;
  openCatalogImmediately.value = false;
  showAnalogsDialog.value = true;
};

const openFindAnalogDialog = (item) => {
  selectedAnalogsBomItem.value = item;
  openCatalogImmediately.value = true;
  showAnalogsDialog.value = true;
};
</script>

<style scoped>
.pre-line {
  white-space: pre-line;
}
</style>