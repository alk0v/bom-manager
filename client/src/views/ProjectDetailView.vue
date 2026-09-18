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
        Back to Projects
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
          Project URL
        </v-btn>

        <v-btn
          variant="flat"
          size="small"
          color="primary"
          class="font-weight-bold"
          prepend-icon="mdi-factory"
          @click="showProduceDialog = true"
        >
          Produce
        </v-btn>

        <v-btn
          variant="outlined"
          size="small"
          color="primary"
          prepend-icon="mdi-pencil-outline"
          @click="showProjectDialog = true"
        >
          Edit Project
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
            :title="project.photoUrl ? 'Click to view photo in full size' : ''"
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
                Full Size
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
                {{ bomItems.length }} parts
              </v-chip>
              <v-chip
                size="small"
                :color="bomHealth.allSufficient ? 'success' : 'warning'"
                variant="flat"
                class="font-weight-bold"
              >
                {{ bomHealth.inStockCount }} / {{ bomItems.length }} Parts in Stock
              </v-chip>
              <v-chip
                size="small"
                color="primary"
                variant="tonal"
                class="font-mono font-weight-bold"
                :title="`${projectCost.pricedCount} of ${bomItems.length} parts priced in database`"
              >
                <v-icon start size="14">mdi-currency-usd</v-icon>
                Est. BOM Cost: {{ formatCurrency(projectCost.totalCost) }}
                <span class="ms-1 text-caption opacity-80" v-if="bomItems.length > 0">
                  ({{ projectCost.pricedCount }}/{{ bomItems.length }})
                </span>
              </v-chip>
            </div>

            <h1 class="text-h4 font-weight-bold text-slate-900 mb-2">
              {{ project.projectName }}
            </h1>

            <p class="text-body-2 text-slate-600 mb-3 pre-line">
              {{ project.description || 'No description provided.' }}
            </p>
          </div>

          <div class="d-flex align-center justify-space-between pt-3 border-t">
            <div class="text-caption text-disabled" v-if="project.url">
              <v-icon size="14" class="me-1">mdi-link-variant</v-icon>
              <a :href="project.url" target="_blank" class="text-slate-600 text-decoration-none">
                {{ project.url }}
              </a>
            </div>
            <div v-else class="text-caption text-disabled">No external link</div>

            <v-btn
              v-if="hasShortages"
              color="amber-darken-3"
              prepend-icon="mdi-cart-plus"
              size="small"
              variant="flat"
              @click="addAllShortagesToCart"
            >
              Buy All Shortages ({{ shortageItems.length }})
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
                Bill of Materials (BOM)
              </div>
              <div class="text-caption text-disabled">
                Constituent parts required to build this project
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
              Import iBOM
            </v-btn>

            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-plus"
              size="small"
              class="font-weight-bold"
              @click="openAddComponentDialog"
            >
              Add Component
            </v-btn>
          </div>
        </div>
      </v-card-item>

      <!-- Filter bar -->
      <div class="px-5 py-3 border-b bg-white d-flex align-center justify-space-between">
        <v-text-field
          v-model="bomSearch"
          placeholder="Filter parts in this BOM..."
          prepend-inner-icon="mdi-magnify"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          rounded="lg"
          style="max-width: 320px;"
        />

        <div class="d-flex align-center gap-2 text-caption text-disabled">
          <span>{{ filteredBomItems.length }} components listed</span>
        </div>
      </div>

      <!-- BOM Table -->
      <v-table density="comfortable" hover class="bom-table">
        <thead>
          <tr class="bg-slate-50">
            <th class="text-left font-weight-bold" style="width: 50px;">Photo</th>
            <th class="text-left font-weight-bold">Component / Part</th>
            <th class="text-left font-weight-bold">Category</th>
            <th class="text-left font-weight-bold">Package</th>
            <th class="text-center font-weight-bold">Required</th>
            <th class="text-center font-weight-bold">In Stock</th>
            <th class="text-right font-weight-bold">Unit Price</th>
            <th class="text-right font-weight-bold">Total Cost</th>
            <th class="text-left font-weight-bold">Designators / Comment</th>
            <th class="text-left font-weight-bold" style="width: 140px;">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="item in filteredBomItems"
            :key="item.bomId"
            :class="{ 'row-shortage': !item.isStockSufficient }"
          >
            <!-- Photo -->
            <td>
              <v-avatar
                rounded="lg"
                size="36"
                class="border bg-slate-50"
                :class="{ 'cursor-pointer hover-zoom': !!item.componentPhotoURL }"
                :title="item.componentPhotoURL ? 'Click to view photo in full size' : ''"
                @click="item.componentPhotoURL && openImageLightbox('component', item.componentPhotoURL, item.component)"
              >
                <MediaImage
                  type="component"
                  :src="item.componentPhotoURL"
                  height="36px"
                  width="36px"
                />
              </v-avatar>
            </td>

            <!-- Part name & marking -->
            <td>
              <div
                class="font-mono font-weight-bold text-body-2 text-primary comp-name-link d-inline-flex align-center gap-1"
                @click="openComponentDetails(item)"
                title="Click to view component details"
              >
                <span class="hover-underline">{{ item.component }}</span>
                <v-icon size="13" class="opacity-60 info-icon">mdi-information-outline</v-icon>
              </div>
              <div class="text-caption text-disabled" v-if="item.marking || item.shortDescription">
                <span v-if="item.marking" class="font-mono me-2">Mark: {{ item.marking }}</span>
                <span v-if="item.shortDescription">{{ item.shortDescription }}</span>
              </div>
            </td>

            <!-- Category -->
            <td>
              <v-chip size="x-small" variant="tonal" color="info" v-if="item.category">
                {{ item.category }}
              </v-chip>
              <span v-else class="text-disabled text-caption">—</span>
            </td>

            <!-- Package -->
            <td>
              <PackageLink :item="item" />
            </td>

            <!-- Required Qty -->
            <td class="text-center font-mono font-weight-bold text-body-2">
              {{ item.requiredQuantity }}
            </td>

            <!-- In Stock -->
            <td class="text-center font-mono font-weight-bold text-body-2">
              <span :class="item.isStockSufficient ? 'text-slate-800' : 'text-error font-weight-bold'">
                {{ item.stockQuantity ?? 0 }}
              </span>
              <span v-if="!item.isStockSufficient" class="text-caption text-error font-weight-bold ms-1">
                (-{{ item.shortageQuantity }})
              </span>
            </td>

            <!-- Unit Price -->
            <td class="text-right font-mono text-body-2">
              <span
                v-if="item.unitPrice != null"
                class="text-slate-800"
                :title="item.latestOrderDate ? `Purchased: ${formatDate(item.latestOrderDate)}` : ''"
              >
                {{ formatCurrency(item.unitPrice) }}
              </span>
              <span v-else class="text-disabled text-caption italic">—</span>
            </td>

            <!-- Total Item Cost -->
            <td class="text-right font-mono text-body-2 font-weight-bold">
              <span v-if="item.totalItemCost != null" class="text-primary">
                {{ formatCurrency(item.totalItemCost) }}
              </span>
              <span v-else class="text-disabled text-caption italic">—</span>
            </td>

            <!-- Comment -->
            <td>
              <span v-if="item.comment" class="text-body-2 font-mono text-slate-700">
                {{ item.comment }}
              </span>
              <span v-else class="text-disabled text-caption italic">No notes</span>
            </td>

            <!-- Actions -->
            <td class="text-left">
              <v-btn
                icon="mdi-information-outline"
                size="x-small"
                variant="text"
                title="View component details"
                @click="openComponentDetails(item)"
              />

              <v-btn
                v-if="!item.isStockSufficient"
                icon="mdi-cart-plus"
                size="x-small"
                color="amber-darken-3"
                variant="text"
                title="Add to shopping list"
                @click="addToCart(item)"
              />

              <v-btn
                icon="mdi-pencil-outline"
                size="x-small"
                variant="text"
                title="Edit BOM item"
                @click="openEditBomDialog(item)"
              />

              <v-btn
                icon="mdi-delete-outline"
                size="x-small"
                color="error"
                variant="text"
                title="Remove from BOM"
                @click="confirmDeleteBom(item)"
              />
            </td>
          </tr>

          <tr v-if="filteredBomItems.length === 0 && !loading">
            <td colspan="10" class="text-center py-8 text-disabled">
              <v-icon size="40" class="mb-2">mdi-cube-off-outline</v-icon>
              <div>No components found in this BOM.</div>
            </td>
          </tr>

          <tr v-if="loading">
            <td colspan="10" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
            </td>
          </tr>
        </tbody>

        <!-- BOM Table Footer with Totals -->
        <tfoot v-if="filteredBomItems.length > 0">
          <tr class="bg-slate-50 font-weight-bold border-t">
            <td colspan="4" class="py-3 px-4 text-subtitle-2 font-weight-bold text-slate-800">
              Total Estimated BOM Cost
              <span class="text-caption text-disabled ms-2 font-normal">
                ({{ projectCost.pricedCount }} of {{ bomItems.length }} parts priced)
              </span>
            </td>
            <td class="text-center font-mono font-weight-bold py-3 text-body-2">
              {{ bomItems.reduce((acc, i) => acc + (Number(i.requiredQuantity) || 0), 0) }}
            </td>
            <td colspan="2"></td>
            <td class="text-right font-mono font-weight-bold text-subtitle-2 text-primary py-3">
              {{ formatCurrency(projectCost.totalCost) }}
            </td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </v-table>
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
          Edit BOM Item
        </v-card-title>
        <v-card-text class="pa-4">
          <div class="font-mono font-weight-bold text-subtitle-2 mb-3 text-primary">
            {{ editingBom.component }}
          </div>
          <v-text-field
            v-model.number="editingBom.requiredQuantity"
            label="Required Quantity"
            type="number"
            min="1"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />
          <v-text-field
            v-model="editingBom.comment"
            label="Designators / Notes"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3 bg-slate-50">
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="submittingBom"
            @click="submitEditBom"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOG: Edit Project -->
    <ProjectFormDialog
      v-model="showProjectDialog"
      :project="project"
      @saved="onProjectSaved"
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

    <!-- Notification Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api, { resolveMediaUrl } from '../services/api';
import MediaImage from '../components/MediaImage.vue';
import MediaLightboxDialog from '../components/MediaLightboxDialog.vue';
import AddComponentDialog from '../components/AddComponentDialog.vue';
import PackageLink from '../components/PackageLink.vue';
import ProjectFormDialog from '../components/ProjectFormDialog.vue';
import ProjectFilesCard from '../components/ProjectFilesCard.vue';
import IbomImportDialog from '../components/IbomImportDialog.vue';
import ComponentDetailsDialog from '../components/ComponentDetailsDialog.vue';
import ProduceProjectDialog from '../components/ProduceProjectDialog.vue';
import { formatCurrency, formatDate } from '../utils/formatters';

const route = useRoute();
const projectId = route.params.id;

const project = ref(null);
const bomItems = ref([]);

const bomSearch = ref('');
const loading = ref(false);
const submittingBom = ref(false);

const showAddDialog = ref(false);
const showEditDialog = ref(false);
const showProjectDialog = ref(false);
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

const onProjectSaved = async ({ project: updatedProject }) => {
  notify(`Project "${updatedProject.projectName}" updated!`);
  project.value = { ...project.value, ...updatedProject };
};

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

const filteredBomItems = computed(() => {
  if (!bomSearch.value.trim()) return bomItems.value;
  const q = bomSearch.value.toLowerCase();
  return bomItems.value.filter(item =>
    item.component.toLowerCase().includes(q) ||
    (item.comment && item.comment.toLowerCase().includes(q)) ||
    (item.category && item.category.toLowerCase().includes(q)) ||
    (item.marking && item.marking.toLowerCase().includes(q))
  );
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
