<template>
  <div class="projects-view">
    <!-- Projects Toolbar -->
    <v-card elevation="1" class="rounded-0 border bg-white mb-6">
      <v-card-item class="py-3 px-4">
        <div class="d-flex flex-wrap align-center justify-space-between gap-4">
          <!-- Stats Chips -->
          <div class="d-flex align-center flex-wrap gap-2">
            <v-chip color="primary" variant="flat" size="small" class="font-weight-bold">
              {{ projects.length }} {{ t('nav.projects') }}
            </v-chip>
            <v-chip color="secondary" variant="tonal" size="small" class="font-weight-bold">
              {{ totalBomEntries }} {{ t('common.total') }} BOM
            </v-chip>
            <v-chip
              v-if="shortageProjectsCount > 0"
              color="error"
              variant="tonal"
              size="small"
              class="font-weight-bold"
            >
              {{ shortageProjectsCount }} {{ t('common.shortage') }}
            </v-chip>
          </div>

          <!-- Search & Actions -->
          <div class="d-flex align-center gap-3">
            <v-text-field
              v-model="searchQuery"
              prepend-inner-icon="mdi-magnify"
              :placeholder="t('projects.searchPlaceholder')"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              rounded="lg"
              style="width: 380px; min-width: 340px;"
            />

            <v-btn
              color="primary"
              variant="flat"
              size="small"
              class="font-weight-bold"
              prepend-icon="mdi-plus"
              @click="openNewProjectDialog"
            >
              {{ t('projects.newProject') }}
            </v-btn>

            <v-btn
              icon="mdi-refresh"
              variant="outlined"
              size="small"
              :loading="loadingProjects"
              @click="loadProjects"
              :title="t('projects.refreshTooltip')"
            />
          </div>
        </div>
      </v-card-item>
    </v-card>

    <!-- PROJECTS GRID AS CARDS -->
    <v-row v-if="filteredProjects.length > 0">
      <v-col
        v-for="p in filteredProjects"
        :key="p.id"
        cols="12"
        sm="6"
        md="4"
        lg="4"
        xl="4"
      >
        <v-card
          elevation="1"
          class="rounded-0 border project-card h-100 d-flex flex-column cursor-pointer"
          hover
          @click="navigateToProject(p.id)"
        >
          <!-- Project Photo Cover (Fit without cropping, click to zoom) -->
          <div
            class="position-relative bg-slate-50 border-b d-flex align-center justify-center pa-2 project-photo-cover"
            :class="{ 'cursor-pointer': !!p.photoUrl }"
            :title="p.photoUrl ? t('dialogs.viewFullSize') : ''"
            style="height: 200px;"
            @click.stop="p.photoUrl ? openPhotoLightbox('project', p.photoUrl, p.projectName) : navigateToProject(p.id)"
          >
            <MediaImage
              type="project"
              :src="p.photoUrl"
              height="184px"
              width="100%"
              :cover="false"
            />
            <div v-if="p.photoUrl" class="photo-overlay d-flex align-center justify-center">
              <v-icon icon="mdi-magnify-plus-outline" size="32" color="slate-800" />
            </div>
          </div>

          <!-- Project Details Body -->
          <v-card-text class="flex-grow-1 pa-4 d-flex flex-column justify-space-between">
            <div>
              <!-- Project Name -->
              <h2 class="text-subtitle-1 font-weight-bold text-slate-900 mb-2 line-clamp-2" :title="p.projectName">
                {{ p.projectName }}
              </h2>

              <!-- Description -->
              <p class="text-caption text-medium-emphasis mb-3 line-clamp-3" :title="p.description">
                {{ p.description || 'No description provided.' }}
              </p>
            </div>

            <!-- Chips / Stats with clear spacing -->
            <div>
              <div class="project-card-chips d-flex flex-wrap align-center mb-3" style="gap: 8px;">
                <v-chip size="small" color="primary" variant="tonal" class="font-weight-medium">
                  <v-icon start size="15">mdi-chip</v-icon>
                  {{ p.bomItemCount }} parts
                </v-chip>

                <v-chip size="small" color="secondary" variant="tonal" class="font-weight-medium">
                  <v-icon start size="15">mdi-numeric</v-icon>
                  {{ p.totalQuantityNeeded }} pcs
                </v-chip>

                <!-- Estimated Cost chip -->
                <v-chip
                  v-if="p.bomItemCount > 0"
                  size="small"
                  color="primary"
                  variant="tonal"
                  class="font-weight-bold font-mono"
                  :title="`${p.pricedItemsCount || 0} of ${p.bomItemCount} parts priced`"
                >
                  <v-icon start size="15">mdi-currency-usd</v-icon>
                  {{ formatCurrency(p.estimatedCost) }}
                </v-chip>

                <!-- Absent parts chip -->
                <v-chip
                  v-if="p.absentPartsCount > 0"
                  size="small"
                  color="error"
                  variant="flat"
                  class="font-weight-bold"
                >
                  <v-icon start size="15">mdi-alert-circle-outline</v-icon>
                  {{ p.absentPartsCount }} absent
                </v-chip>
                <v-chip
                  v-else-if="p.bomItemCount > 0"
                  size="small"
                  color="success"
                  variant="tonal"
                  class="font-weight-medium"
                >
                  <v-icon start size="15">mdi-check-circle-outline</v-icon>
                  0 absent
                </v-chip>

                <!-- Attached files chip -->
                <v-chip
                  v-if="p.filesCount > 0"
                  size="small"
                  color="slate-700"
                  variant="tonal"
                  class="font-weight-medium"
                  :title="`${p.filesCount} file(s) attached`"
                >
                  <v-icon start size="15">mdi-paperclip</v-icon>
                  {{ p.filesCount }} {{ p.filesCount === 1 ? 'file' : 'files' }}
                </v-chip>

                <!-- iBOM indicator chip -->
                <v-chip
                  v-if="p.ibomFilesCount > 0"
                  size="small"
                  color="success"
                  variant="flat"
                  class="font-weight-bold"
                  :title="t('projects.ibomAttached')"
                >
                  <v-icon start size="15">mdi-chip</v-icon>
                  iBOM
                </v-chip>
              </div>

              <!-- Action Buttons -->
              <div class="d-flex align-center justify-space-between pt-2 border-t">
                <div class="d-flex align-center gap-1">
                  <!-- External URL button -->
                  <v-btn
                    v-if="p.url"
                    :href="p.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    icon="mdi-open-in-new"
                    size="small"
                    variant="text"
                    color="primary"
                    :title="t('projects.openExternalLink')"
                    @click.stop
                  />
                  <!-- Edit Project button -->
                  <v-btn
                    icon="mdi-pencil-outline"
                    size="small"
                    variant="text"
                    color="slate-600"
                    :title="t('projects.editProject')"
                    @click.stop="openEditProjectDialog(p)"
                  />
                  <!-- Produce Project button -->
                  <v-btn
                    icon="mdi-factory"
                    size="small"
                    variant="text"
                    color="primary"
                    :title="t('projects.produceTooltip')"
                    @click.stop="openProduceDialog(p)"
                  />
                  <!-- Delete Project button -->
                  <v-btn
                    icon="mdi-delete-outline"
                    size="small"
                    variant="text"
                    color="error"
                    :title="t('projects.deleteProject')"
                    @click.stop="openDeleteProjectDialog(p)"
                  />
                </div>

                <!-- Open BOM Button -->
                <v-btn
                  color="primary"
                  variant="flat"
                  size="small"
                  class="font-weight-bold"
                  prepend-icon="mdi-format-list-bulleted-square"
                  @click.stop="openBomModal(p)"
                >
                  {{ t('projects.viewBom') }}
                </v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-card v-else-if="!loadingProjects" class="pa-12 text-center rounded-0 border bg-white">
      <v-icon size="56" color="disabled" class="mb-3">mdi-folder-search-outline</v-icon>
      <div class="text-h6 text-slate-800">{{ t('projects.noProjects') }}</div>
      <div class="text-caption text-disabled mb-4">{{ t('projects.noProjectsMatching') }}</div>
      <v-btn variant="outlined" color="primary" size="small" @click="searchQuery = ''">
        {{ t('common.clear') }}
      </v-btn>
    </v-card>

    <div v-if="loadingProjects" class="pa-12 text-center">
      <v-progress-circular indeterminate color="primary" size="48" />
      <div class="text-caption text-disabled mt-3">Loading projects from database...</div>
    </div>

    <!-- ======================================================== -->
    <!-- POP-UP WINDOW: PROJECT BOM MODAL DIALOG                  -->
    <!-- ======================================================== -->
    <v-dialog
      v-model="showBomDialog"
      width="94vw"
      max-width="1650"
      scrollable
      transition="dialog-bottom-transition"
    >
      <v-card class="rounded-0 border bg-white overflow-hidden" v-if="activeProject">
        <!-- Modal Header -->
        <v-card-title class="bg-slate-50 py-3 px-5 border-b d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-avatar rounded="lg" size="44" class="border me-3 bg-white">
              <MediaImage
                type="project"
                :src="activeProject.photoUrl"
                height="44px"
                width="44px"
              />
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-bold text-slate-900 line-clamp-1">
                {{ activeProject.projectName }}
              </div>
              <div class="text-caption text-disabled">
                {{ t('projects.projectId', { id: activeProject.id }) }}
                <span class="mx-1">•</span>
                {{ t('projectDetail.bomTitle') }}
              </div>
            </div>
          </div>

          <div class="d-flex align-center gap-2">
            <!-- External link -->
            <v-btn
              v-if="activeProject.url"
              :href="activeProject.url"
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
              @click="openProduceDialog(activeProject)"
            >
              {{ t('projects.produce') }}
            </v-btn>

            <!-- Edit Project Button -->
            <v-btn
              variant="outlined"
              size="small"
              color="primary"
              prepend-icon="mdi-pencil-outline"
              :title="t('projects.editProject')"
              @click="openEditProjectDialog(activeProject)"
            >
              {{ t('projects.editProject') }}
            </v-btn>

            <!-- Dedicated Page Button -->
            <v-btn
              :to="`/projects/${activeProject.id}`"
              variant="outlined"
              size="small"
              color="primary"
              prepend-icon="mdi-window-maximize"
              :title="t('projects.openDedicatedPage')"
            >
              {{ t('common.details') }}
            </v-btn>

            <!-- Delete Project Button -->
            <v-btn
              variant="outlined"
              size="small"
              color="error"
              prepend-icon="mdi-delete-outline"
              :title="t('projects.deleteProject')"
              @click="openDeleteProjectDialog(activeProject)"
            >
              {{ t('common.delete') }}
            </v-btn>

            <!-- Close Button -->
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              @click="showBomDialog = false"
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
                {{ activeProject.description || t('projectDetail.noDescription') }}
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
          <v-btn variant="flat" color="slate-200" @click="showBomDialog = false">
            {{ t('common.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOG: Add Component to Project BOM -->
    <AddComponentDialog
      v-model="showAddDialog"
      :project-id="activeProject?.id"
      :project-name="activeProject?.projectName"
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

    <!-- Component Details Dialog -->
    <ComponentDetailsDialog
      v-model="showDetailsDialog"
      :component="selectedDetailComponent"
    />

    <!-- DIALOG: Create / Edit Project -->
    <ProjectFormDialog
      v-model="showProjectDialog"
      :project="selectedProjectForEdit"
      @saved="onProjectSaved"
      @delete="openDeleteProjectDialog"
    />

    <!-- DIALOG: Delete Project -->
    <DeleteProjectDialog
      v-model="showDeleteDialog"
      :project="selectedProjectForDelete"
      @deleted="onProjectDeleted"
    />

    <!-- DIALOG: Produce Project -->
    <ProduceProjectDialog
      v-model="showProduceDialog"
      :project="selectedProjectForProduce"
      @produced="onProduced"
      @notify="notify"
    />

    <!-- DIALOG: BOM Component Analogs / Substitutes -->
    <BomAnalogsDialog
      v-model="showAnalogsDialog"
      :project="activeProject"
      :bom-item="selectedAnalogsBomItem"
      :open-catalog-immediately="openCatalogImmediately"
      @updated="refreshActiveProjectBom"
    />

    <!-- FULL SIZE MEDIA LIGHTBOX DIALOG -->
    <MediaLightboxDialog
      v-model="lightbox.show"
      :type="lightbox.type"
      :src="lightbox.src"
      :title="lightbox.title"
    />

    <!-- Notification Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../services/api';

const { t } = useI18n();
import MediaImage from '../components/MediaImage.vue';
import MediaLightboxDialog from '../components/MediaLightboxDialog.vue';
import AddComponentDialog from '../components/AddComponentDialog.vue';
import ProjectBomTable from '../components/ProjectBomTable.vue';
import ComponentDetailsDialog from '../components/ComponentDetailsDialog.vue';
import ProjectFormDialog from '../components/ProjectFormDialog.vue';
import ProduceProjectDialog from '../components/ProduceProjectDialog.vue';
import DeleteProjectDialog from '../components/DeleteProjectDialog.vue';
import BomAnalogsDialog from '../components/BomAnalogsDialog.vue';
import { formatCurrency, formatDate } from '../utils/formatters';

// State
const router = useRouter();
const projects = ref([]);
const activeProject = ref(null);
const bomItems = ref([]);

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

const refreshActiveProjectBom = async () => {
  if (activeProject.value) {
    await openBomModal(activeProject.value);
    await loadProjects();
    if (selectedAnalogsBomItem.value) {
      const refreshed = bomItems.value.find(b => b.bomId === selectedAnalogsBomItem.value.bomId);
      if (refreshed) {
        selectedAnalogsBomItem.value = refreshed;
      }
    }
  }
};

const lightbox = ref({
  show: false,
  type: 'project',
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

const searchQuery = ref('');
const loadingProjects = ref(false);
const loadingBom = ref(false);
const submittingBom = ref(false);
const addingAllShortages = ref(false);

const showBomDialog = ref(false);
const showAddDialog = ref(false);
const showEditDialog = ref(false);
const showProjectDialog = ref(false);
const showProduceDialog = ref(false);
const showDeleteDialog = ref(false);
const showDetailsDialog = ref(false);
const selectedDetailComponent = ref(null);
const selectedProjectForDelete = ref(null);

const editingBom = ref(null);
const selectedProjectForEdit = ref(null);
const selectedProjectForProduce = ref(null);

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

// Computed
const filteredProjects = computed(() => {
  if (!searchQuery.value.trim()) return projects.value;
  const q = searchQuery.value.toLowerCase();
  return projects.value.filter(p =>
    p.projectName.toLowerCase().includes(q) ||
    (p.description && p.description.toLowerCase().includes(q))
  );
});

const totalBomEntries = computed(() => {
  return projects.value.reduce((acc, p) => acc + (p.bomItemCount || 0), 0);
});

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

const shortageProjectsCount = computed(() => {
  return projects.value.filter(p => (p.absentPartsCount || 0) > 0).length;
});

// Methods
const navigateToProject = (id) => {
  router.push(`/projects/${id}`);
};

const openNewProjectDialog = () => {
  selectedProjectForEdit.value = null;
  showProjectDialog.value = true;
};

const openEditProjectDialog = (project) => {
  selectedProjectForEdit.value = { ...project };
  showProjectDialog.value = true;
};

const openProduceDialog = (project) => {
  selectedProjectForProduce.value = project;
  showProduceDialog.value = true;
};

const openDeleteProjectDialog = (project) => {
  selectedProjectForDelete.value = project;
  showDeleteDialog.value = true;
};

const onProjectDeleted = async (deletedProject) => {
  showDeleteDialog.value = false;
  showProjectDialog.value = false;
  selectedProjectForDelete.value = null;
  notify(`Project "${deletedProject.projectName}" deleted successfully!`);
  if (showBomDialog.value && activeProject.value?.id === deletedProject.id) {
    showBomDialog.value = false;
    activeProject.value = null;
  }
  await loadProjects();
};

const onProduced = async () => {
  await loadProjects();
  if (showBomDialog.value && activeProject.value) {
    try {
      bomItems.value = await api.getProjectBom(activeProject.value.id);
      const updated = projects.value.find(p => p.id === activeProject.value.id);
      if (updated) {
        activeProject.value = { ...updated };
      }
    } catch (err) {
      console.error('Failed to reload BOM after production:', err);
    }
  }
};

const onProjectSaved = async ({ project, isEdit }) => {
  notify(isEdit ? `Project "${project.projectName}" updated!` : `Project "${project.projectName}" created!`);
  if (!isEdit && project?.id) {
    router.push(`/projects/${project.id}`);
    return;
  }
  await loadProjects();
  if (activeProject.value && activeProject.value.id === project.id) {
    activeProject.value = { ...activeProject.value, ...project };
  }
};

const loadProjects = async () => {
  loadingProjects.value = true;
  try {
    projects.value = await api.getProjects();
  } catch (err) {
    notify('Failed to load projects: ' + err.message, 'error');
  } finally {
    loadingProjects.value = false;
  }
};

const openBomModal = async (project) => {
  activeProject.value = project;
  showBomDialog.value = true;
  loadingBom.value = true;
  try {
    bomItems.value = await api.getProjectBom(project.id);
  } catch (err) {
    notify('Failed to load project BOM: ' + err.message, 'error');
  } finally {
    loadingBom.value = false;
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

const openAddComponentDialog = () => {
  showAddDialog.value = true;
};

const onComponentAdded = async (item) => {
  notify(`Added ${item?.component || 'component'} to BOM!`);
  if (activeProject.value) {
    try {
      bomItems.value = await api.getProjectBom(activeProject.value.id);
      loadProjects();
    } catch (err) {
      console.error('Failed to reload project BOM:', err);
    }
  }
};

const openEditBomDialog = (item) => {
  editingBom.value = { ...item };
  showEditDialog.value = true;
};

const submitEditBom = async () => {
  if (!editingBom.value || !activeProject.value) return;
  submittingBom.value = true;
  try {
    await api.updateBomItem(activeProject.value.id, editingBom.value.bomId, {
      quantity: editingBom.value.requiredQuantity,
      comment: editingBom.value.comment
    });
    notify('BOM item updated!');
    showEditDialog.value = false;
    bomItems.value = await api.getProjectBom(activeProject.value.id);
  } catch (err) {
    notify('Error updating BOM item: ' + (err.response?.data?.details || err.message), 'error');
  } finally {
    submittingBom.value = false;
  }
};

const confirmDeleteBom = async (item) => {
  if (confirm(`Remove ${item.component} from this BOM?`)) {
    try {
      await api.deleteBomItem(activeProject.value.id, item.bomId);
      notify('Component removed from BOM');
      bomItems.value = await api.getProjectBom(activeProject.value.id);
      loadProjects();
    } catch (err) {
      notify('Error removing component: ' + (err.response?.data?.details || err.message), 'error');
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
  addingAllShortages.value = true;
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
  } finally {
    addingAllShortages.value = false;
  }
};

onMounted(() => {
  const flash = sessionStorage.getItem('flashMessage');
  if (flash) {
    sessionStorage.removeItem('flashMessage');
    notify(flash);
  }
  loadProjects();
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

/* Project Card Chips */
.project-card-chips :deep(.v-chip) {
  font-size: 0.8125rem !important; /* 13px */
  height: 26px;
  padding: 0 10px;
}

.project-photo-cover {
  position: relative;
  overflow: hidden;
}
.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(2px);
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  pointer-events: none;
}
.project-photo-cover:hover .photo-overlay {
  opacity: 1;
}
.hover-zoom {
  transition: transform 0.15s ease;
}
.hover-zoom:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
</style>
