<template>
  <div class="projects-view">
    <!-- Top Header Bar -->
    <v-card elevation="1" class="rounded-0 border bg-white mb-6">
      <v-card-item class="py-4 px-5">
        <div class="d-flex flex-wrap align-center justify-space-between gap-4">
          <!-- Title & Stats -->
          <div>
            <div class="d-flex align-center">
              <h1 class="text-h5 font-weight-bold text-slate-900 me-3">
                Hardware Projects
              </h1>
              <v-chip color="primary" variant="flat" size="small" class="font-weight-bold me-3">
                {{ projects.length }} Projects
              </v-chip>
              <v-chip color="secondary" variant="tonal" size="small" class="font-weight-bold me-3">
                {{ totalBomEntries }} Total BOM Items
              </v-chip>
              <v-chip
                v-if="shortageProjectsCount > 0"
                color="error"
                variant="tonal"
                size="small"
                class="font-weight-bold"
              >
                {{ shortageProjectsCount }} with Shortages
              </v-chip>
            </div>
            <div class="text-body-2 text-disabled mt-1">
              Select any project card to view its complete Bill of Materials (BOM), parts stock, and designators.
            </div>
          </div>

          <!-- Search & Actions -->
          <div class="d-flex align-center gap-3">
            <v-text-field
              v-model="searchQuery"
              prepend-inner-icon="mdi-magnify"
              placeholder="Search project name, description..."
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
              New Project
            </v-btn>

            <v-btn
              icon="mdi-refresh"
              variant="outlined"
              size="small"
              :loading="loadingProjects"
              @click="loadProjects"
              title="Refresh projects"
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
            :title="p.photoUrl ? 'Click to view photo in full size' : ''"
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
                  title="KiCAD Interactive HTML BOM attached"
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
                    title="Open external documentation link"
                    @click.stop
                  />
                  <!-- Edit Project button -->
                  <v-btn
                    icon="mdi-pencil-outline"
                    size="small"
                    variant="text"
                    color="slate-600"
                    title="Edit project details"
                    @click.stop="openEditProjectDialog(p)"
                  />
                  <!-- Produce Project button -->
                  <v-btn
                    icon="mdi-factory"
                    size="small"
                    variant="text"
                    color="primary"
                    title="Produce project units and deduct parts"
                    @click.stop="openProduceDialog(p)"
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
                  View BOM
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
      <div class="text-h6 text-slate-800">No projects match your search</div>
      <div class="text-caption text-disabled mb-4">Try clearing or adjusting your search keywords</div>
      <v-btn variant="outlined" color="primary" size="small" @click="searchQuery = ''">
        Clear Filter
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
                Project ID: #{{ activeProject.id }}
                <span class="mx-1">•</span>
                Bill of Materials (BOM)
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
              Project URL
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
              Produce
            </v-btn>

            <!-- Edit Project Button -->
            <v-btn
              variant="outlined"
              size="small"
              color="primary"
              prepend-icon="mdi-pencil-outline"
              title="Edit project details"
              @click="openEditProjectDialog(activeProject)"
            >
              Edit Project
            </v-btn>

            <!-- Dedicated Page Button -->
            <v-btn
              :to="`/projects/${activeProject.id}`"
              variant="outlined"
              size="small"
              color="primary"
              prepend-icon="mdi-window-maximize"
              title="Open dedicated page for this project"
            >
              Full Page
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
                Description
              </div>
              <p class="text-body-2 text-slate-700 mb-0 pre-line">
                {{ activeProject.description || 'No description provided.' }}
              </p>
            </v-col>

            <v-col cols="12" md="4" class="d-flex flex-wrap align-center justify-md-end" style="gap: 12px;">
              <v-chip
                size="small"
                color="primary"
                variant="tonal"
                class="font-mono font-weight-bold"
                :title="`${modalBomCost.pricedCount} of ${bomItems.length} parts priced in database`"
              >
                <v-icon start size="14">mdi-currency-usd</v-icon>
                Est. BOM Cost: {{ formatCurrency(modalBomCost.totalCost) }}
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
                {{ bomHealth.inStockCount }} / {{ bomItems.length }} Parts Available
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
                Buy Shortages ({{ shortageItems.length }})
              </v-btn>
            </v-col>
          </v-row>
        </div>

        <!-- BOM Table Filter Toolbar -->
        <div class="px-5 py-3 bg-white border-b d-flex flex-wrap align-center justify-space-between gap-3">
          <v-text-field
            v-model="bomSearch"
            density="compact"
            variant="outlined"
            placeholder="Filter components in this BOM..."
            prepend-inner-icon="mdi-magnify"
            hide-details
            clearable
            rounded="lg"
            style="width: 360px; max-width: 400px;"
          />

          <div class="d-flex align-center gap-2">
            <span class="text-caption text-disabled me-2">
              {{ filteredBomItems.length }} components listed
            </span>

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

        <!-- BOM Table Body -->
        <v-card-text class="pa-0 overflow-y-auto" style="max-height: 550px;">
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
                <th class="text-left font-weight-bold" style="width: 130px;">Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="item in filteredBomItems"
                :key="item.bomId"
                :class="{ 'row-shortage': !item.isStockSufficient }"
              >
                <!-- Photo Thumbnail -->
                <td>
                  <v-avatar
                    rounded="lg"
                    size="36"
                    class="border bg-slate-50"
                    :class="{ 'cursor-pointer hover-zoom': !!item.componentPhotoURL }"
                    :title="item.componentPhotoURL ? 'Click to view photo in full size' : ''"
                    @click.stop="item.componentPhotoURL && openPhotoLightbox('component', item.componentPhotoURL, item.component)"
                  >
                    <MediaImage
                      type="component"
                      :src="item.componentPhotoURL"
                      height="36px"
                      width="36px"
                    />
                  </v-avatar>
                </td>

                <!-- Component Name & Marking -->
                <td>
                  <div class="font-mono font-weight-bold text-body-2 text-primary">
                    {{ item.component }}
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

                <!-- Package / Footprint -->
                <td>
                  <PackageLink :item="item" />
                </td>

                <!-- Required Quantity -->
                <td class="text-center font-weight-bold text-body-2 font-mono">
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

                <!-- Circuit Comment / Designators -->
                <td>
                  <span v-if="item.comment" class="text-body-2 font-mono text-slate-700">
                    {{ item.comment }}
                  </span>
                  <span v-else class="text-disabled text-caption italic">No notes</span>
                </td>

                <!-- Actions -->
                <td class="text-left">
                  <!-- Add to Cart -->
                  <v-btn
                    v-if="!item.isStockSufficient"
                    icon="mdi-cart-plus"
                    size="x-small"
                    color="amber-darken-3"
                    variant="text"
                    title="Add shortage to shopping list"
                    @click="addToCart(item)"
                  />

                  <!-- Edit -->
                  <v-btn
                    icon="mdi-pencil-outline"
                    size="x-small"
                    variant="text"
                    title="Edit quantity or comment"
                    @click="openEditBomDialog(item)"
                  />

                  <!-- Delete -->
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

              <tr v-if="filteredBomItems.length === 0 && !loadingBom">
                <td colspan="10" class="text-center py-8 text-disabled">
                  <v-icon size="40" class="mb-2">mdi-cube-off-outline</v-icon>
                  <div>No components match your search.</div>
                </td>
              </tr>

              <tr v-if="loadingBom">
                <td colspan="10" class="text-center py-8">
                  <v-progress-circular indeterminate color="primary" />
                </td>
              </tr>
            </tbody>

            <!-- Modal BOM Table Footer -->
            <tfoot v-if="filteredBomItems.length > 0">
              <tr class="bg-slate-50 font-weight-bold border-t">
                <td colspan="4" class="py-3 px-4 text-subtitle-2 font-weight-bold text-slate-800">
                  Total Estimated BOM Cost
                  <span class="text-caption text-disabled ms-2 font-normal">
                    ({{ modalBomCost.pricedCount }} of {{ bomItems.length }} parts priced)
                  </span>
                </td>
                <td class="text-center font-mono font-weight-bold py-3 text-body-2">
                  {{ bomItems.reduce((acc, i) => acc + (Number(i.requiredQuantity) || 0), 0) }}
                </td>
                <td colspan="2"></td>
                <td class="text-right font-mono font-weight-bold text-subtitle-2 text-primary py-3">
                  {{ formatCurrency(modalBomCost.totalCost) }}
                </td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </v-table>
        </v-card-text>

        <v-divider />

        <!-- Modal Footer -->
        <v-card-actions class="pa-4 bg-slate-50 d-flex align-center justify-space-between">
          <div class="text-caption text-disabled">
            Total {{ bomItems.length }} components in this BOM
          </div>
          <v-btn variant="flat" color="slate-200" @click="showBomDialog = false">
            Close
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
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOG: Create / Edit Project -->
    <ProjectFormDialog
      v-model="showProjectDialog"
      :project="selectedProjectForEdit"
      @saved="onProjectSaved"
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
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import MediaImage from '../components/MediaImage.vue';
import MediaLightboxDialog from '../components/MediaLightboxDialog.vue';
import AddComponentDialog from '../components/AddComponentDialog.vue';
import PackageLink from '../components/PackageLink.vue';
import ProjectFormDialog from '../components/ProjectFormDialog.vue';
import ProduceProjectDialog from '../components/ProduceProjectDialog.vue';
import { formatCurrency, formatDate } from '../utils/formatters';

// State
const router = useRouter();
const projects = ref([]);
const activeProject = ref(null);
const bomItems = ref([]);

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
const bomSearch = ref('');
const loadingProjects = ref(false);
const loadingBom = ref(false);
const submittingBom = ref(false);
const addingAllShortages = ref(false);

const showBomDialog = ref(false);
const showAddDialog = ref(false);
const showEditDialog = ref(false);
const showProjectDialog = ref(false);
const showProduceDialog = ref(false);

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
  bomSearch.value = '';
  loadingBom.value = true;
  try {
    bomItems.value = await api.getProjectBom(project.id);
  } catch (err) {
    notify('Failed to load project BOM: ' + err.message, 'error');
  } finally {
    loadingBom.value = false;
  }
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
