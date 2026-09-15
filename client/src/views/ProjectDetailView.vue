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
        <!-- Photo (Fit, not crop) -->
        <v-col cols="12" md="3" class="bg-slate-50 d-flex align-center justify-center p-3 border-e">
          <div class="pa-3 w-100">
            <MediaImage
              type="project"
              :src="project.photoUrl"
              height="200px"
              width="100%"
              :cover="false"
              class="rounded-0 border cursor-pointer"
            />
          </div>
        </v-col>

        <!-- Details -->
        <v-col cols="12" md="9" class="pa-5 d-flex flex-column justify-space-between">
          <div>
            <div class="d-flex align-center flex-wrap mb-2" style="gap: 12px;">
              <v-chip size="small" color="primary" variant="flat" class="font-mono font-weight-bold">
                Project #{{ project.id }}
              </v-chip>
              <v-chip size="small" color="secondary" variant="tonal" class="font-weight-medium">
                {{ bomItems.length }} BOM Entries
              </v-chip>
              <v-chip
                size="small"
                :color="bomHealth.allSufficient ? 'success' : 'warning'"
                variant="flat"
                class="font-weight-bold"
              >
                {{ bomHealth.inStockCount }} / {{ bomItems.length }} Parts in Stock
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

          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            size="small"
            class="font-weight-bold"
            @click="openAddComponentDialog"
          >
            Add Component to BOM
          </v-btn>
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
            <th class="text-left font-weight-bold">Designators / Comment</th>
            <th class="text-right font-weight-bold" style="width: 140px;">Actions</th>
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
              <v-avatar rounded="lg" size="36" class="border bg-slate-50">
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

            <!-- Package -->
            <td>
              <span v-if="item.package" class="font-mono text-body-2 font-weight-medium text-slate-800">
                {{ item.package }}
              </span>
              <span v-else class="text-disabled text-caption">—</span>
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

            <!-- Comment -->
            <td>
              <span v-if="item.comment" class="text-body-2 font-mono text-slate-700">
                {{ item.comment }}
              </span>
              <span v-else class="text-disabled text-caption italic">No notes</span>
            </td>

            <!-- Actions -->
            <td class="text-right">
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
            <td colspan="8" class="text-center py-8 text-disabled">
              <v-icon size="40" class="mb-2">mdi-cube-off-outline</v-icon>
              <div>No components found in this BOM.</div>
            </td>
          </tr>

          <tr v-if="loading">
            <td colspan="8" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

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

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api';
import MediaImage from '../components/MediaImage.vue';
import AddComponentDialog from '../components/AddComponentDialog.vue';

const route = useRoute();
const projectId = route.params.id;

const project = ref(null);
const bomItems = ref([]);

const bomSearch = ref('');
const loading = ref(false);
const submittingBom = ref(false);

const showAddDialog = ref(false);
const showEditDialog = ref(false);

const editingBom = ref(null);

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
</style>
