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
          <div class="d-flex align-center flex-wrap gap-3">
            <v-combobox
              v-model="selectedTags"
              :items="allAvailableTags"
              :placeholder="t('projects.filterByTags')"
              multiple
              chips
              closable-chips
              clearable
              density="compact"
              variant="outlined"
              rounded="lg"
              prepend-inner-icon="mdi-tag-outline"
              hide-details
              style="width: 260px; min-width: 220px;"
            >
              <template #chip="{ props, item }">
                <v-chip
                  v-bind="props"
                  size="x-small"
                  color="primary"
                  variant="tonal"
                  class="font-weight-medium"
                >
                  {{ item.raw }}
                </v-chip>
              </template>
            </v-combobox>

            <v-text-field
              v-model="searchQuery"
              prepend-inner-icon="mdi-magnify"
              :placeholder="t('projects.searchPlaceholder')"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              rounded="lg"
              style="width: 320px; min-width: 260px;"
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

              <!-- Project Tags (Click to toggle tag filter) -->
              <div v-if="p.tags && p.tags.length > 0" class="d-flex flex-wrap align-center mb-3" style="gap: 4px;">
                <v-chip
                  v-for="tag in p.tags"
                  :key="tag.id || tag.name"
                  size="small"
                  variant="outlined"
                  color="slate-600"
                  class="font-weight-medium px-2"
                  @click.stop="toggleTagFilter(tag.name)"
                >
                  <v-icon start size="12" color="primary">mdi-tag-outline</v-icon>
                  {{ tag.name }}
                </v-chip>
              </div>

              <!-- Description -->
              <p class="text-caption text-medium-emphasis mb-2 line-clamp-3" :title="p.description">
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
      <v-btn variant="outlined" color="primary" size="small" @click="searchQuery = ''; selectedTags = []">
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
    <ProjectBomDialog
      v-model="showBomDialog"
      :project="activeProject"
      show-project-actions
      @edit-project="openEditProjectDialog"
      @delete-project="openDeleteProjectDialog"
      @updated="loadProjects"
      @notify="notify"
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
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../services/api';

const { t } = useI18n();
import MediaImage from '../components/MediaImage.vue';
import MediaLightboxDialog from '../components/MediaLightboxDialog.vue';
import ProjectBomDialog from '../components/ProjectBomDialog.vue';
import ComponentDetailsDialog from '../components/ComponentDetailsDialog.vue';
import ProjectFormDialog from '../components/ProjectFormDialog.vue';
import ProduceProjectDialog from '../components/ProduceProjectDialog.vue';
import DeleteProjectDialog from '../components/DeleteProjectDialog.vue';
import { formatCurrency, formatDate } from '../utils/formatters';

// State
const router = useRouter();
const projects = ref([]);
const activeProject = ref(null);

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
const selectedTags = ref([]);
const loadingProjects = ref(false);

const allAvailableTags = computed(() => {
  const set = new Set();
  projects.value.forEach(p => {
    (p.tags || []).forEach(t => {
      const name = typeof t === 'string' ? t : t?.name;
      if (name) set.add(name);
    });
  });
  return Array.from(set).sort();
});

const toggleTagFilter = (tagName) => {
  if (!tagName) return;
  const idx = selectedTags.value.indexOf(tagName);
  if (idx >= 0) {
    selectedTags.value = selectedTags.value.filter(t => t !== tagName);
  } else {
    selectedTags.value = [...selectedTags.value, tagName];
  }
};

const showBomDialog = ref(false);
const showProjectDialog = ref(false);
const showProduceDialog = ref(false);
const showDeleteDialog = ref(false);
const showDetailsDialog = ref(false);
const selectedDetailComponent = ref(null);
const selectedProjectForDelete = ref(null);

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
  let list = projects.value;

  // Filter by tags (must contain all selected tags)
  if (selectedTags.value && selectedTags.value.length > 0) {
    const required = selectedTags.value.map(t => (typeof t === 'string' ? t : t?.name || '').toLowerCase());
    list = list.filter(p => {
      const projectTags = (p.tags || []).map(t => (typeof t === 'string' ? t : t?.name || '').toLowerCase());
      return required.every(reqTag => projectTags.includes(reqTag));
    });
  }

  // Filter by search query
  if (searchQuery.value && searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(p =>
      p.projectName.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t => (t.name || t).toLowerCase().includes(q)))
    );
  }

  return list;
});

const totalBomEntries = computed(() => {
  return projects.value.reduce((acc, p) => acc + (p.bomItemCount || 0), 0);
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

const openBomModal = (project) => {
  activeProject.value = project;
  showBomDialog.value = true;
};

// Automatically refresh projects whenever the project create/edit modal is closed
watch(showProjectDialog, (isOpen, wasOpen) => {
  if (wasOpen && !isOpen) {
    loadProjects();
  }
});

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
