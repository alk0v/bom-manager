<template>
  <div class="project-detail-view" v-if="project">
    <!-- Top Back Bar -->
    <div class="d-flex align-center justify-space-between mb-4">
      <v-btn
        to="/projects"
        variant="text"
        prepend-icon="mdi-arrow-left"
        class="font-weight-medium"
      >
        {{ t('projectDetail.backToProjects') }}
      </v-btn>

      <div class="d-flex align-center gap-2">
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

        <v-btn
          variant="flat"
          size="small"
          color="primary"
          class="font-weight-bold"
          prepend-icon="mdi-factory"
          @click="showProduceDialog = true"
        >
          {{ t('projects.produce') }}
        </v-btn>

        <v-btn
          variant="outlined"
          size="small"
          color="primary"
          prepend-icon="mdi-pencil-outline"
          @click="showProjectDialog = true"
        >
          {{ t('projects.editProject') }}
        </v-btn>

        <v-btn
          variant="outlined"
          size="small"
          color="error"
          prepend-icon="mdi-delete-outline"
          @click="showDeleteDialog = true"
        >
          {{ t('projects.deleteProject') }}
        </v-btn>

        <v-btn
          icon="mdi-refresh"
          size="small"
          variant="outlined"
          :loading="loading"
          @click="loadData"
        />
      </div>
    </div>

    <!-- Project Properties Header Card -->
    <v-card elevation="1" class="rounded-0 border bg-white mb-6 overflow-hidden">
      <v-row no-gutters>
        <!-- Photo (Fit, not crop) with click to zoom -->
        <v-col cols="12" md="3" class="bg-slate-50 d-flex align-center justify-center p-3 border-e">
          <div
            class="pa-3 w-100 project-photo-wrapper"
            :class="{ 'cursor-pointer': !!project.photoUrl }"
            :title="project.photoUrl ? t('dialogs.viewFullSize') : ''"
            @click="project.photoUrl && openImageLightbox('project', project.photoUrl, project.projectName)"
          >
            <MediaImage
              type="project"
              :src="project.photoUrl"
              height="200px"
              width="100%"
              :cover="false"
              class="rounded-0 border"
            />
            <div v-if="project.photoUrl" class="photo-overlay d-flex align-center justify-center">
              <v-chip size="small" color="white" variant="flat" class="font-weight-medium shadow-sm text-slate-900">
                <v-icon start size="14">mdi-magnify-plus-outline</v-icon>
                {{ t('projectDetail.fullSize') }}
              </v-chip>
            </div>
          </div>
        </v-col>

        <!-- Details -->
        <v-col cols="12" md="9" class="pa-5 d-flex flex-column justify-space-between">
          <div>
            <div class="d-flex align-center flex-wrap mb-2" style="gap: 12px;">
              <v-chip size="small" color="primary" variant="tonal" class="font-weight-medium">
                <v-icon start size="15">mdi-chip</v-icon>
                {{ bomItems.length }} {{ t('projectDetail.parts') }}
              </v-chip>
              <v-chip
                size="small"
                :color="bomHealth.allSufficient ? 'success' : 'warning'"
                variant="flat"
                class="font-weight-bold"
              >
                {{ bomHealth.inStockCount }} / {{ bomItems.length }} {{ t('projectDetail.partsInStock') }}
              </v-chip>
              <v-chip
                size="small"
                color="primary"
                variant="tonal"
                class="font-mono font-weight-bold"
                :title="t('projectDetail.partsPricedTooltip', { priced: projectCost.pricedCount, total: bomItems.length })"
              >
                <v-icon start size="14">mdi-currency-usd</v-icon>
                {{ t('projectDetail.estBomCost') }}: {{ formatCurrency(projectCost.totalCost) }}
                <span class="ms-1 text-caption opacity-80" v-if="bomItems.length > 0">
                  ({{ projectCost.pricedCount }}/{{ bomItems.length }})
                </span>
              </v-chip>
            </div>

            <h1 class="text-h4 font-weight-bold text-slate-900 mb-2">
              {{ project.projectName }}
            </h1>

            <p class="text-body-2 text-slate-600 mb-3 pre-line">
              {{ project.description || t('projectDetail.noDescription') }}
            </p>

            <!-- Project Tags -->
            <div v-if="project.tags && project.tags.length > 0" class="d-flex flex-wrap align-center mb-3" style="gap: 6px;">
              <v-chip
                v-for="tag in project.tags"
                :key="tag.id || tag.name"
                size="small"
                variant="outlined"
                color="slate-600"
                class="font-weight-medium"
              >
                <v-icon start size="14" color="primary">mdi-tag-outline</v-icon>
                {{ tag.name }}
              </v-chip>
            </div>
          </div>

          <div class="d-flex align-center justify-space-between pt-3 border-t">
            <div class="text-caption text-disabled" v-if="project.url">
              <v-icon size="14" class="me-1">mdi-link-variant</v-icon>
              <a :href="project.url" target="_blank" class="text-slate-600 text-decoration-none">
                {{ project.url }}
              </a>
            </div>
            <div v-else class="text-caption text-disabled">{{ t('projectDetail.noExternalLink') }}</div>

            <v-btn
              v-if="hasShortages"
              color="amber-darken-3"
              prepend-icon="mdi-cart-plus"
              size="small"
              variant="flat"
              @click="addAllShortagesToCart"
            >
              {{ t('projectDetail.buyAllShortages', { count: shortageItems.length }) }}
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </v-card>

    <!-- BOM List Card -->
    <v-card elevation="1" class="rounded-0 border bg-white overflow-hidden">
      <v-card-item class="bg-slate-50 py-3 px-5 border-b">
        <div class="d-flex flex-wrap align-center justify-space-between gap-3">
          <div class="d-flex align-center">
            <v-icon color="primary" class="me-2">mdi-format-list-bulleted-square</v-icon>
            <div>
              <div class="text-subtitle-1 font-weight-bold text-slate-900">
                {{ t('projectDetail.bomTitle') }}
              </div>
              <div class="text-caption text-disabled">
                {{ t('projectDetail.bomSubtitle') }}
              </div>
            </div>
          </div>

          <div class="d-flex align-center gap-2">
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-database-import-outline"
              size="small"
              class="font-weight-bold"
              @click="openIbomDialog(null)"
            >
              {{ t('projectDetail.importIbom') }}
            </v-btn>

            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-plus"
              size="small"
              class="font-weight-bold"
              @click="openAddComponentDialog"
            >
              {{ t('projectDetail.addComponent') }}
            </v-btn>
          </div>
        </div>
      </v-card-item>

      <!-- BOM Table -->
      <ProjectBomTable
        :items="bomItems"
        :loading="loading"
        :show-empty-actions="true"
        @add-to-cart="addToCart"
        @edit-item="openEditBomDialog"
        @delete-item="confirmDeleteBom"
        @open-component-details="openComponentDetails"
        @open-photo="openImageLightbox($event.type, $event.src, $event.title)"
        @add-component="openAddComponentDialog"
        @import-ibom="openIbomDialog(null)"
        @manage-analogs="openAnalogsDialog"
        @find-analog="openFindAnalogDialog"
      />
    </v-card>

    <!-- Project Files & Attachments Card -->
    <div class="mt-6">
      <ProjectFilesCard
        ref="filesCardRef"
        :project-id="Number(projectId)"
        :project-name="project?.projectName"
        @import-ibom="openIbomDialog"
        @files-updated="onFilesUpdated"
      />
    </div>

    <!-- DIALOG: Add Component to BOM -->
    <AddComponentDialog
      v-model="showAddDialog"
      :project-id="projectId"
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
            {{ t('dialogs.saveChanges') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOG: Edit Project -->
    <ProjectFormDialog
      v-model="showProjectDialog"
      :project="project"
      @saved="onProjectSaved"
      @delete="showDeleteDialog = true"
    />

    <!-- DIALOG: Delete Project -->
    <DeleteProjectDialog
      v-model="showDeleteDialog"
      :project="projectForDelete"
      @deleted="onProjectDeleted"
    />

    <!-- DIALOG: KiCAD iBOM Import & Mapping -->
    <IbomImportDialog
      v-model="showIbomDialog"
      :project-id="Number(projectId)"
      :project-name="project?.projectName"
      :initial-file="selectedIbomFile"
      :project-files="projectFilesList"
      @bom-imported="onBomImported"
    />

    <!-- FULL SIZE MEDIA LIGHTBOX DIALOG -->
    <MediaLightboxDialog
      v-model="lightbox.show"
      :type="lightbox.type"
      :src="lightbox.src"
      :title="lightbox.title"
    />

    <!-- DIALOG: Produce Project -->
    <ProduceProjectDialog
      v-model="showProduceDialog"
      :project="project"
      @produced="onProduced"
      @notify="notify"
    />

    <!-- Component Details Dialog -->
    <ComponentDetailsDialog
      v-model="showDetailsDialog"
      :component="selectedDetailComponent"
      @deleted="loadData"
      @updated="loadData"
    />

    <!-- DIALOG: BOM Component Analogs / Substitutes -->
    <BomAnalogsDialog
      v-model="showAnalogsDialog"
      :project="project"
      :bom-item="selectedAnalogsBomItem"
      :open-catalog-immediately="openCatalogImmediately"
      @updated="loadData"
    />

    <!-- Notification Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api, { resolveMediaUrl } from '../services/api';

const { t } = useI18n();
import MediaImage from '../components/MediaImage.vue';
import MediaLightboxDialog from '../components/MediaLightboxDialog.vue';
import AddComponentDialog from '../components/AddComponentDialog.vue';
import ProjectBomTable from '../components/ProjectBomTable.vue';
import ProjectFormDialog from '../components/ProjectFormDialog.vue';
import DeleteProjectDialog from '../components/DeleteProjectDialog.vue';
import ProjectFilesCard from '../components/ProjectFilesCard.vue';
import IbomImportDialog from '../components/IbomImportDialog.vue';
import ComponentDetailsDialog from '../components/ComponentDetailsDialog.vue';
import ProduceProjectDialog from '../components/ProduceProjectDialog.vue';
import BomAnalogsDialog from '../components/BomAnalogsDialog.vue';
import { formatCurrency, formatDate } from '../utils/formatters';

const route = useRoute();
const router = useRouter();
const projectId = route.params.id;

const project = ref(null);
const bomItems = ref([]);

const loading = ref(false);
const submittingBom = ref(false);

const showAddDialog = ref(false);
const showEditDialog = ref(false);
const showProjectDialog = ref(false);
const showAnalogsDialog = ref(false);
const selectedAnalogsBomItem = ref(null);
const openCatalogImmediately = ref(false);

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
const showDeleteDialog = ref(false);
const showIbomDialog = ref(false);
const showProduceDialog = ref(false);
const showDetailsDialog = ref(false);
const selectedDetailComponent = ref(null);
const selectedIbomFile = ref(null);
const filesCardRef = ref(null);
const projectFilesList = ref([]);

function openComponentDetails(item) {
  selectedDetailComponent.value = {
    ...item,
    ID: item.componentId || item.ID,
    id: item.componentId || item.id
  };
  showDetailsDialog.value = true;
}

function openIbomDialog(file = null) {
  selectedIbomFile.value = file;
  showIbomDialog.value = true;
}

function onFilesUpdated(files) {
  projectFilesList.value = files || [];
}

async function onBomImported(result) {
  await loadData();
  snackbar.value = {
    show: true,
    text: `Successfully imported ${result.importedCount} components into BOM!`,
    color: 'success'
  };
  if (filesCardRef.value) {
    filesCardRef.value.loadFiles();
  }
}

async function onProduced() {
  await loadData();
}

const lightbox = ref({
  show: false,
  type: 'project',
  src: null,
  title: ''
});

const openImageLightbox = (type, src, title) => {
  if (!src) return;
  lightbox.value = {
    show: true,
    type,
    src,
    title
  };
};

const lightboxResolvedUrl = computed(() => {
  if (!lightbox.value.src) return null;
  return resolveMediaUrl(lightbox.value.type, lightbox.value.src);
});

const editingBom = ref(null);

const projectForDelete = computed(() => {
  if (!project.value) return null;
  return {
    ...project.value,
    bomItemCount: bomItems.value.length,
    filesCount: projectFilesList.value.length
  };
});

function onProjectDeleted(deletedProj) {
  showDeleteDialog.value = false;
  showProjectDialog.value = false;
  sessionStorage.setItem('flashMessage', `Project "${deletedProj.projectName}" deleted successfully!`);
  router.push('/projects');
}

const onProjectSaved = async ({ project: updatedProject }) => {
  notify(`Project "${updatedProject.projectName}" updated!`);
  project.value = { ...project.value, ...updatedProject };
  await loadData();
};

// Automatically reload project data when Edit Project dialog is closed
watch(showProjectDialog, (isOpen, wasOpen) => {
  if (wasOpen && !isOpen) {
    loadData();
  }
});

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
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

const projectCost = computed(() => {
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

const hasShortages = computed(() => shortageItems.value.length > 0);

const loadData = async () => {
  loading.value = true;
  try {
    const [pData, bData] = await Promise.all([
      api.getProject(projectId),
      api.getProjectBom(projectId)
    ]);
    project.value = pData;
    bomItems.value = bData;
    if (selectedAnalogsBomItem.value) {
      const refreshed = bData.find(b => b.bomId === selectedAnalogsBomItem.value.bomId);
      if (refreshed) {
        selectedAnalogsBomItem.value = refreshed;
      }
    }
  } catch (err) {
    notify('Failed to load project details: ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

const openAddComponentDialog = () => {
  showAddDialog.value = true;
};

const onComponentAdded = async (item) => {
  notify(`Added ${item?.component || 'component'} to BOM!`);
  try {
    bomItems.value = await api.getProjectBom(projectId);
  } catch (err) {
    console.error('Failed to reload project BOM:', err);
  }
};

const openEditBomDialog = (item) => {
  editingBom.value = { ...item };
  showEditDialog.value = true;
};

const submitEditBom = async () => {
  if (!editingBom.value) return;
  submittingBom.value = true;
  try {
    await api.updateBomItem(projectId, editingBom.value.bomId, {
      quantity: editingBom.value.requiredQuantity,
      comment: editingBom.value.comment
    });
    notify('BOM item updated!');
    showEditDialog.value = false;
    bomItems.value = await api.getProjectBom(projectId);
  } catch (err) {
    notify('Error updating BOM item: ' + err.message, 'error');
  } finally {
    submittingBom.value = false;
  }
};

const confirmDeleteBom = async (item) => {
  if (confirm(`Remove ${item.component} from this BOM?`)) {
    try {
      await api.deleteBomItem(projectId, item.bomId);
      notify('Component removed from BOM');
      bomItems.value = await api.getProjectBom(projectId);
    } catch (err) {
      notify('Error removing component: ' + err.message, 'error');
    }
  }
};

const addToCart = async (item) => {
  try {
    await api.addToShoppingList({
      componentId: item.componentId,
      qty: item.shortageQuantity || item.requiredQuantity
    });
    notify(`Added ${item.component} to shopping list!`);
  } catch (err) {
    notify('Error adding to shopping list: ' + err.message, 'error');
  }
};

const addAllShortagesToCart = async () => {
  try {
    for (const item of shortageItems.value) {
      await api.addToShoppingList({
        componentId: item.componentId,
        qty: item.shortageQuantity
      });
    }
    notify(`Added ${shortageItems.value.length} shortages to shopping list!`);
  } catch (err) {
    notify('Failed to add shortages: ' + err.message, 'error');
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.pre-line {
  white-space: pre-line;
}
.bom-table :deep(th) {
  background-color: #F8FAFC !important;
  font-size: 0.82rem;
  color: #475569;
}
.bom-table :deep(td) {
  padding-top: 8px;
  padding-bottom: 8px;
}
.bom-table :deep(tr.row-shortage) {
  background-color: #FEF2F2 !important; /* light red / rose-50 */
}
.bom-table :deep(tr.row-shortage:hover) {
  background-color: #FEE2E2 !important; /* slightly deeper rose-100 on hover */
}
.project-photo-wrapper {
  position: relative;
  overflow: hidden;
}
.photo-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  bottom: 12px;
  background-color: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(2px);
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  pointer-events: none;
}
.project-photo-wrapper:hover .photo-overlay {
  opacity: 1;
}
.hover-zoom {
  transition: transform 0.15s ease;
}
.hover-zoom:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.comp-name-link {
  cursor: pointer;
  transition: color 0.15s ease;
}

.comp-name-link:hover {
  color: #1d4ed8 !important;
}

.comp-name-link:hover .hover-underline {
  text-decoration: underline;
}

.comp-name-link:hover .info-icon {
  opacity: 1 !important;
}
</style>
