<template>
  <div class="reports-view">
    <!-- Top Header Bar -->
    <v-card elevation="1" class="rounded-0 border bg-white mb-6">
      <v-card-item class="py-4 px-5">
        <div class="d-flex flex-wrap align-center justify-space-between gap-4">
          <!-- Title & Meta -->
          <div>
            <div class="d-flex align-center flex-wrap gap-2">
              <h1 class="text-h5 font-weight-bold text-slate-900">
                Production History & Reports
              </h1>
              <v-chip color="primary" variant="flat" size="small" class="font-weight-bold">
                {{ stats.totalRuns || 0 }} Total Runs
              </v-chip>
              <v-chip color="success" variant="tonal" size="small" class="font-weight-bold">
                {{ stats.totalUnitsActive || 0 }} Units Produced
              </v-chip>
              <v-chip v-if="stats.cancelledRunsCount > 0" color="slate-600" variant="tonal" size="small" class="font-weight-medium">
                {{ stats.cancelledRunsCount }} Cancelled
              </v-chip>
            </div>
            <div class="text-body-2 text-slate-500 mt-1">
              Audit hardware manufacturing runs, track consumed components, and roll back production to return parts to storage.
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="d-flex align-center gap-2">
            <v-btn
              icon="mdi-refresh"
              variant="outlined"
              size="small"
              color="primary"
              :loading="loading"
              @click="loadReport"
              title="Refresh report data"
            />
          </div>
        </div>
      </v-card-item>
    </v-card>

    <!-- Summary Statistics KPI Cards -->
    <v-row dense class="mb-6">
      <!-- Total Active Units Produced -->
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="1" class="rounded-0 border bg-white pa-4 h-100 d-flex align-center">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="48" class="me-4 flex-shrink-0">
            <v-icon size="26" color="primary">mdi-factory</v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">Active Units Produced</div>
            <div class="text-h5 font-weight-bold text-slate-900 font-mono">{{ stats.totalUnitsActive || 0 }}</div>
            <div class="text-caption text-success font-weight-medium">
              across {{ stats.activeRunsCount || 0 }} completed {{ stats.activeRunsCount === 1 ? 'run' : 'runs' }}
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Total Components Consumed -->
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="1" class="rounded-0 border bg-white pa-4 h-100 d-flex align-center">
          <v-avatar color="info" variant="tonal" rounded="lg" size="48" class="me-4 flex-shrink-0">
            <v-icon size="26" color="info">mdi-chip</v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">Parts Consumed</div>
            <div class="text-h5 font-weight-bold text-slate-900 font-mono">{{ stats.totalPartsActive || 0 }}</div>
            <div class="text-caption text-slate-500">
              currently deducted in storage
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Cancelled Production Runs -->
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="1" class="rounded-0 border bg-white pa-4 h-100 d-flex align-center">
          <v-avatar color="amber-darken-3" variant="tonal" rounded="lg" size="48" class="me-4 flex-shrink-0">
            <v-icon size="26" color="amber-darken-3">mdi-undo-variant</v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">Parts Restored</div>
            <div class="text-h5 font-weight-bold text-slate-900 font-mono">{{ stats.totalPartsReturned || 0 }}</div>
            <div class="text-caption text-amber-darken-3 font-weight-medium">
              from {{ stats.cancelledRunsCount || 0 }} cancelled {{ stats.cancelledRunsCount === 1 ? 'run' : 'runs' }}
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Unique Projects Manufactured -->
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="1" class="rounded-0 border bg-white pa-4 h-100 d-flex align-center">
          <v-avatar color="secondary" variant="tonal" rounded="lg" size="48" class="me-4 flex-shrink-0">
            <v-icon size="26" color="secondary">mdi-folder-cog-outline</v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">Projects Produced</div>
            <div class="text-h5 font-weight-bold text-slate-900 font-mono">{{ stats.uniqueProjectsCount || 0 }}</div>
            <div class="text-caption text-slate-500">
              unique hardware designs
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Main Production History Card -->
    <v-card elevation="1" class="rounded-0 border bg-white overflow-hidden">
      <!-- Toolbar & Filters -->
      <v-card-item class="bg-slate-50 py-3 px-5 border-b">
        <div class="d-flex flex-wrap align-center justify-space-between gap-3">
          <!-- Left side: Filters -->
          <div class="d-flex flex-wrap align-center gap-3 flex-grow-1">
            <!-- Search input -->
            <v-text-field
              v-model="search"
              placeholder="Search project, notes, part..."
              prepend-inner-icon="mdi-magnify"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              rounded="lg"
              bg-color="white"
              style="min-width: 240px; max-width: 320px;"
              @update:model-value="debounceFetch"
            />

            <!-- Project selector -->
            <v-autocomplete
              v-model="selectedProjectId"
              :items="projectOptions"
              item-title="projectName"
              item-value="id"
              placeholder="All Hardware Projects"
              prepend-inner-icon="mdi-folder-outline"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              rounded="lg"
              bg-color="white"
              style="min-width: 240px; max-width: 320px;"
              @update:model-value="loadReport"
            />

            <!-- Status Toggle -->
            <div class="d-flex align-center gap-2">
              <span class="text-caption text-slate-600 font-weight-bold text-uppercase flex-shrink-0">
                Status:
              </span>
              <v-btn-toggle
                v-model="selectedStatus"
                mandatory
                density="compact"
                variant="outlined"
                rounded="lg"
                color="primary"
                class="flex-shrink-0 bg-white"
                style="height: 40px;"
                @update:model-value="loadReport"
              >
                <v-btn value="all" size="small" class="px-3 text-caption font-weight-medium">All</v-btn>
                <v-btn value="completed" size="small" class="px-3 text-caption font-weight-medium">Completed</v-btn>
                <v-btn value="cancelled" size="small" class="px-3 text-caption font-weight-medium">Cancelled</v-btn>
              </v-btn-toggle>
            </div>
          </div>

          <!-- Right side: Count & Reset -->
          <div class="d-flex align-center gap-2 text-caption text-slate-500">
            <v-btn
              v-if="search || selectedProjectId || selectedStatus !== 'all'"
              variant="text"
              size="small"
              color="primary"
              class="font-weight-medium"
              prepend-icon="mdi-filter-off-outline"
              @click="resetFilters"
            >
              Reset
            </v-btn>
            <span>
              Showing <strong>{{ productionRuns.length }}</strong> of {{ totalRuns }}
            </span>
          </div>
        </div>
      </v-card-item>

      <!-- Production Runs Table -->
      <v-table density="comfortable" hover class="reports-table">
        <thead>
          <tr class="bg-slate-50">
            <th class="text-left font-weight-bold" style="width: 80px;">Run ID</th>
            <th class="text-left font-weight-bold" style="width: 180px;">Date & Time</th>
            <th class="text-left font-weight-bold">Hardware Project</th>
            <th class="text-center font-weight-bold">Produced</th>
            <th class="text-left font-weight-bold">Parts Consumed</th>
            <th class="text-center font-weight-bold" style="width: 130px;">Status</th>
            <th class="text-right font-weight-bold" style="width: 220px;">Actions</th>
          </tr>
        </thead>

        <tbody>
          <template v-for="run in productionRuns" :key="run.id">
            <tr :class="{ 'row-cancelled': run.status === 'cancelled' }">
              <!-- Run ID -->
              <td>
                <span class="font-mono text-caption font-weight-bold text-slate-700">
                  #{{ run.id }}
                </span>
              </td>

              <!-- Date & Time -->
              <td>
                <div class="text-body-2 font-mono text-slate-900 font-weight-medium">
                  {{ formatDate(run.producedAt) }}
                </div>
                <div class="text-caption text-slate-400 font-mono">
                  {{ formatTime(run.producedAt) }}
                </div>
              </td>

              <!-- Hardware Project -->
              <td>
                <div class="d-flex align-center py-1">
                  <v-avatar rounded="lg" size="36" class="border me-3 bg-slate-50 flex-shrink-0">
                    <MediaImage
                      type="project"
                      :src="run.projectPhotoUrl"
                      height="36px"
                      width="36px"
                    />
                  </v-avatar>
                  <div>
                    <router-link
                      :to="`/projects/${run.projectId}`"
                      class="text-body-2 font-weight-bold text-primary text-decoration-none hover-underline"
                    >
                      {{ run.projectName || 'Project #' + run.projectId }}
                    </router-link>
                    <div class="text-caption text-slate-400 line-clamp-1" v-if="run.notes">
                      Note: {{ run.notes }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- Produced Units -->
              <td class="text-center">
                <v-chip
                  size="small"
                  :color="run.status === 'completed' ? 'primary' : 'slate-600'"
                  :variant="run.status === 'completed' ? 'flat' : 'tonal'"
                  class="font-mono font-weight-bold"
                >
                  {{ run.count }} {{ run.count === 1 ? 'unit' : 'units' }}
                </v-chip>
              </td>

              <!-- Parts Consumed -->
              <td>
                <div class="text-body-2 text-slate-800">
                  <strong>{{ run.totalComponentsDeducted }}</strong> components
                </div>
                <div class="text-caption text-slate-500">
                  across {{ run.itemsCount }} BOM entries
                </div>
              </td>

              <!-- Status -->
              <td class="text-center">
                <v-chip
                  v-if="run.status === 'completed'"
                  size="x-small"
                  color="success"
                  variant="flat"
                  class="font-weight-bold"
                >
                  <v-icon start size="12">mdi-check-circle</v-icon>
                  Completed
                </v-chip>
                <div v-else class="d-flex flex-column align-center">
                  <v-chip
                    size="x-small"
                    color="slate-600"
                    variant="tonal"
                    class="font-weight-bold text-slate-600"
                  >
                    <v-icon start size="12">mdi-undo</v-icon>
                    Cancelled
                  </v-chip>
                  <span class="text-caption text-slate-400 font-mono mt-1" v-if="run.cancelledAt" style="font-size: 0.68rem;">
                    {{ formatDate(run.cancelledAt) }}
                  </span>
                </div>
              </td>

              <!-- Actions -->
              <td class="text-right">
                <div class="d-flex align-center justify-end gap-2">
                  <!-- View Breakdown Button -->
                  <v-btn
                    variant="outlined"
                    size="x-small"
                    color="primary"
                    class="font-weight-medium flex-shrink-0"
                    style="min-width: 80px;"
                    prepend-icon="mdi-format-list-bulleted"
                    @click="openRunDetails(run)"
                  >
                    Details
                  </v-btn>

                  <!-- Cancel Run / Parts Restored Slot -->
                  <div style="width: 110px;" class="d-flex align-center justify-center flex-shrink-0">
                    <v-btn
                      v-if="run.status === 'completed'"
                      variant="flat"
                      size="x-small"
                      color="error"
                      class="font-weight-bold w-100"
                      prepend-icon="mdi-undo-variant"
                      title="Cancel production run and return components to stock"
                      @click="openCancelConfirmDialog(run)"
                    >
                      Cancel Run
                    </v-btn>

                    <span
                      v-else
                      class="text-caption text-slate-400 italic text-center"
                    >
                      Parts Restored
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </template>

          <tr v-if="productionRuns.length === 0 && !loading">
            <td colspan="7" class="text-center py-12 text-disabled">
              <v-icon size="48" class="mb-2">mdi-history</v-icon>
              <div class="text-subtitle-1 text-slate-700 font-weight-medium">No production history found</div>
              <div class="text-caption text-slate-400 mt-1">
                Produce units of any hardware project to see manufacturing logs and component deductions here.
              </div>
            </td>
          </tr>

          <tr v-if="loading">
            <td colspan="7" class="text-center py-12">
              <v-progress-circular indeterminate color="primary" />
              <div class="text-caption text-slate-500 mt-2">Loading production reports...</div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- ======================================================== -->
    <!-- DIALOG: RUN BREAKDOWN & DEDUCTED COMPONENTS              -->
    <!-- ======================================================== -->
    <v-dialog v-model="showDetailsDialog" width="90vw" max-width="1200" scrollable>
      <v-card class="rounded-0 border bg-white d-flex flex-column" v-if="selectedRun">
        <!-- Header -->
        <v-card-title class="bg-slate-50 py-3 px-5 d-flex align-center justify-space-between border-b flex-shrink-0">
          <div class="d-flex align-center">
            <v-avatar rounded="lg" size="40" class="border me-3 bg-white">
              <MediaImage
                type="project"
                :src="selectedRun.projectPhotoUrl"
                height="40px"
                width="40px"
              />
            </v-avatar>
            <div>
              <div class="d-flex align-center gap-2">
                <span class="text-h6 font-weight-bold text-slate-900">
                  Production Run #{{ selectedRun.id }}: {{ selectedRun.projectName }}
                </span>
                <v-chip
                  size="x-small"
                  :color="selectedRun.status === 'completed' ? 'success' : 'slate-600'"
                  variant="flat"
                  class="font-weight-bold"
                >
                  {{ selectedRun.status === 'completed' ? 'Completed' : 'Cancelled & Returned' }}
                </v-chip>
              </div>
              <div class="text-caption text-slate-500 font-mono">
                Produced {{ selectedRun.count }} {{ selectedRun.count === 1 ? 'unit' : 'units' }} on {{ formatFullDateTime(selectedRun.producedAt) }}
              </div>
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showDetailsDialog = false" />
        </v-card-title>

        <!-- Body Table -->
        <v-card-text class="pa-0 overflow-y-auto">
          <v-table density="comfortable" hover class="breakdown-table">
            <thead>
              <tr class="bg-slate-50">
                <th class="text-left font-weight-bold" style="width: 50px;">Photo</th>
                <th class="text-left font-weight-bold">Component / Part</th>
                <th class="text-left font-weight-bold">Category</th>
                <th class="text-left font-weight-bold">Package</th>
                <th class="text-center font-weight-bold">Per Unit</th>
                <th class="text-center font-weight-bold text-primary">Deducted for Run</th>
                <th class="text-center font-weight-bold">Current Catalog Stock</th>
                <th class="text-center font-weight-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in selectedRun.items" :key="item.id">
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
                <td>
                  <div
                    class="font-mono font-weight-bold text-body-2 text-primary comp-name-link d-inline-flex align-center gap-1"
                    @click="openComponentDetails(item)"
                    title="View component details"
                  >
                    <span class="hover-underline">{{ item.component }}</span>
                    <v-icon size="13" class="opacity-60 info-icon">mdi-information-outline</v-icon>
                  </div>
                  <div class="text-caption text-disabled" v-if="item.marking || item.shortDescription">
                    <span v-if="item.marking" class="font-mono me-2">Mark: {{ item.marking }}</span>
                    <span v-if="item.shortDescription">{{ item.shortDescription }}</span>
                  </div>
                </td>
                <td>
                  <v-chip size="x-small" variant="tonal" color="info" v-if="item.category">
                    {{ item.category }}
                  </v-chip>
                  <span v-else class="text-disabled text-caption">—</span>
                </td>
                <td>
                  <PackageLink :item="item" />
                </td>
                <td class="text-center font-mono text-body-2">
                  {{ item.quantityPerUnit }}
                </td>
                <td class="text-center font-mono font-weight-bold text-body-2 text-primary">
                  {{ item.totalDeducted }}
                </td>
                <td class="text-center font-mono font-weight-bold text-body-2">
                  {{ item.currentStock ?? 0 }}
                </td>
                <td class="text-center">
                  <v-chip
                    v-if="selectedRun.status === 'completed'"
                    size="x-small"
                    color="primary"
                    variant="tonal"
                    class="font-weight-medium"
                  >
                    Deducted
                  </v-chip>
                  <v-chip
                    v-else
                    size="x-small"
                    color="success"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    Restored
                  </v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>

        <v-divider />

        <!-- Footer -->
        <v-card-actions class="pa-4 bg-slate-50 d-flex align-center justify-space-between flex-shrink-0">
          <div class="text-caption text-slate-500">
            Total {{ selectedRun.totalComponentsDeducted }} parts across {{ selectedRun.items?.length || 0 }} components
          </div>
          <div class="d-flex align-center gap-2">
            <v-btn
              v-if="selectedRun.status === 'completed'"
              color="error"
              variant="flat"
              prepend-icon="mdi-undo-variant"
              @click="openCancelConfirmDialog(selectedRun)"
            >
              Cancel Production & Return Parts
            </v-btn>
            <v-btn variant="outlined" color="slate-600" @click="showDetailsDialog = false">
              Close
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ======================================================== -->
    <!-- DIALOG: CONFIRM CANCELLATION & RETURN COMPONENTS        -->
    <!-- ======================================================== -->
    <v-dialog v-model="showCancelDialog" max-width="650">
      <v-card class="rounded-0 border bg-white" v-if="runToCancel">
        <!-- Title -->
        <v-card-title class="bg-red-50 py-3 px-5 border-b d-flex align-center text-error">
          <v-icon color="error" class="me-2" size="22">mdi-alert-circle-outline</v-icon>
          <span class="text-subtitle-1 font-weight-bold">
            Cancel Production Run #{{ runToCancel.id }}?
          </span>
        </v-card-title>

        <!-- Content -->
        <v-card-text class="pa-5">
          <p class="text-body-1 text-slate-800 mb-3">
            Are you sure you want to cancel the production of <strong>{{ runToCancel.count }} {{ runToCancel.count === 1 ? 'unit' : 'units' }}</strong> of <strong>{{ runToCancel.projectName }}</strong>?
          </p>

          <v-alert
            color="warning"
            variant="tonal"
            density="comfortable"
            class="mb-4 rounded-0 border text-caption"
            icon="mdi-warehouse"
          >
            <strong>Stock Restoration:</strong> This action will automatically return <strong>{{ runToCancel.totalComponentsDeducted }} components</strong> back into your catalog inventory.
          </v-alert>

          <div class="text-caption font-weight-bold text-slate-700 text-uppercase mb-2">
            Parts to be returned to stock:
          </div>

          <v-table density="compact" class="border bg-slate-50 mb-2">
            <thead>
              <tr>
                <th class="text-left font-weight-bold">Component</th>
                <th class="text-left font-weight-bold">Category</th>
                <th class="text-center font-weight-bold">Quantity to Return</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in runToCancel.items" :key="item.id">
                <td class="font-mono text-body-2 font-weight-bold text-slate-800">
                  {{ item.component }}
                  <span v-if="item.marking" class="text-caption text-slate-500 ms-1">({{ item.marking }})</span>
                </td>
                <td class="text-caption text-slate-600">{{ item.category || '—' }}</td>
                <td class="text-center font-mono font-weight-bold text-success text-body-2">
                  +{{ item.totalDeducted }} pcs
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>

        <v-divider />

        <!-- Actions -->
        <v-card-actions class="pa-4 bg-slate-50 d-flex align-center justify-space-between">
          <v-btn variant="outlined" color="slate-600" @click="showCancelDialog = false" :disabled="cancelling">
            Keep Production Run
          </v-btn>

          <v-btn
            color="error"
            variant="flat"
            class="font-weight-bold px-4"
            prepend-icon="mdi-undo-variant"
            :loading="cancelling"
            @click="confirmCancelRun"
          >
            Confirm & Return Parts
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Component Details Dialog -->
    <ComponentDetailsDialog
      v-model="showCompDetailsDialog"
      :component="selectedCompForDetails"
    />

    <!-- Notification Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';
import MediaImage from '../components/MediaImage.vue';
import PackageLink from '../components/PackageLink.vue';
import ComponentDetailsDialog from '../components/ComponentDetailsDialog.vue';

// State
const productionRuns = ref([]);
const totalRuns = ref(0);
const stats = ref({});
const projectOptions = ref([]);

const search = ref('');
const selectedProjectId = ref(null);
const selectedStatus = ref('all');
const loading = ref(false);
const cancelling = ref(false);

const showDetailsDialog = ref(false);
const selectedRun = ref(null);

const showCancelDialog = ref(false);
const runToCancel = ref(null);

const showCompDetailsDialog = ref(false);
const selectedCompForDetails = ref(null);

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

const statusOptions = [
  { title: 'All Statuses', value: 'all' },
  { title: 'Completed Only', value: 'completed' },
  { title: 'Cancelled Only', value: 'cancelled' }
];

let searchTimer = null;
const debounceFetch = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    loadReport();
  }, 300);
};

const loadReport = async () => {
  loading.value = true;
  try {
    const params = {
      search: search.value,
      projectId: selectedProjectId.value || undefined,
      status: selectedStatus.value,
      limit: 100,
      offset: 0
    };
    const res = await api.getProductionReport(params);
    productionRuns.value = res.items || [];
    totalRuns.value = res.total || 0;
    stats.value = res.stats || {};
  } catch (err) {
    console.error('Error loading production report:', err);
    notify('Failed to load production report: ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

const loadProjects = async () => {
  try {
    projectOptions.value = await api.getProjects();
  } catch (err) {
    console.error('Error loading projects list for filter:', err);
  }
};

const resetFilters = () => {
  search.value = '';
  selectedProjectId.value = null;
  selectedStatus.value = 'all';
  loadReport();
};

const openRunDetails = (run) => {
  selectedRun.value = run;
  showDetailsDialog.value = true;
};

const openCancelConfirmDialog = (run) => {
  runToCancel.value = run;
  showCancelDialog.value = true;
};

const confirmCancelRun = async () => {
  if (!runToCancel.value?.id) return;
  cancelling.value = true;
  try {
    const res = await api.cancelProductionRun(runToCancel.value.id);
    notify(`Production run #${res.runId} cancelled! Restored ${res.totalComponentsRestored} components to stock.`, 'success');
    showCancelDialog.value = false;
    showDetailsDialog.value = false;
    await loadReport();
  } catch (err) {
    console.error('Error cancelling production run:', err);
    notify('Failed to cancel production run: ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    cancelling.value = false;
  }
};

const openComponentDetails = (item) => {
  selectedCompForDetails.value = {
    ID: item.componentId,
    component: item.component,
    marking: item.marking,
    category: item.category,
    package: item.package,
    datasheetURL: item.datasheetURL,
    photoURL: item.componentPhotoURL,
    qty: item.currentStock,
    shortDescription: item.shortDescription
  };
  showCompDetailsDialog.value = true;
};

// Date Format Helpers
const formatDate = (isoString) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatFullDateTime = (isoString) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

onMounted(() => {
  loadReport();
  loadProjects();
});
</script>

<style scoped>
.reports-table :deep(th) {
  background-color: #F8FAFC !important;
  font-size: 0.82rem;
  color: #475569;
}
.reports-table :deep(td) {
  padding-top: 10px;
  padding-bottom: 10px;
}
.reports-table :deep(tr.row-cancelled) {
  background-color: #F8FAFC !important;
  opacity: 0.75;
}
.reports-table :deep(tr.row-cancelled:hover) {
  opacity: 1;
}
.breakdown-table :deep(th) {
  background-color: #F8FAFC !important;
  font-size: 0.82rem;
  color: #475569;
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
