<template>
  <div class="production-report-view">
    <!-- Summary Statistics KPI Cards -->
    <v-row dense class="mb-6">
      <!-- Total Active Units Produced -->
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="1" class="rounded-0 border bg-white pa-4 h-100 d-flex align-center">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="48" class="me-4 flex-shrink-0">
            <v-icon size="26" color="primary">mdi-factory</v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">{{ t('reports.activeUnitsProduced') }}</div>
            <div class="text-h5 font-weight-bold text-slate-900 font-mono">{{ stats.totalUnitsActive || 0 }}</div>
            <div class="text-caption text-success font-weight-medium">
              {{ t('reports.acrossCompletedRuns', { count: stats.activeRunsCount || 0, runs: (stats.activeRunsCount === 1 ? t('reports.run') : t('reports.runs')) }) }}
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
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">{{ t('reports.partsConsumed') }}</div>
            <div class="text-h5 font-weight-bold text-slate-900 font-mono">{{ stats.totalPartsActive || 0 }}</div>
            <div class="text-caption text-slate-500">
              {{ t('reports.currentlyDeducted') }}
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
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">{{ t('reports.partsRestored') }}</div>
            <div class="text-h5 font-weight-bold text-slate-900 font-mono">{{ stats.totalPartsReturned || 0 }}</div>
            <div class="text-caption text-amber-darken-3 font-weight-medium">
              {{ t('reports.fromCancelledRuns', { count: stats.cancelledRunsCount || 0, runs: (stats.cancelledRunsCount === 1 ? t('reports.run') : t('reports.runs')) }) }}
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
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">{{ t('reports.projectsProduced') }}</div>
            <div class="text-h5 font-weight-bold text-slate-900 font-mono">{{ stats.uniqueProjectsCount || 0 }}</div>
            <div class="text-caption text-slate-500">
              {{ t('reports.uniqueHardwareDesigns') }}
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Main Production History Card -->
    <v-card elevation="1" class="rounded-0 border bg-white">
      <!-- Toolbar & Filters -->
      <div class="bg-slate-50 py-3 px-5 border-b" style="min-height: 64px;">
        <div class="d-flex flex-wrap align-center justify-space-between gap-3">
          <!-- Left side: Filters -->
          <div class="d-flex flex-wrap align-center gap-3 flex-grow-1">
            <!-- Search input -->
            <v-text-field
              v-model="search"
              :placeholder="t('reports.searchPlaceholder')"
              prepend-inner-icon="mdi-magnify"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              rounded="lg"
              bg-color="white"
              style="min-width: 240px; max-width: 360px;"
              @update:model-value="debounceFetch"
            />

            <!-- Project selector -->
            <v-autocomplete
              v-model="selectedProjectId"
              :items="projectOptions"
              item-title="projectName"
              item-value="id"
              :placeholder="t('reports.allHardwareProjects')"
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
                {{ t('common.status') }}:
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
                <v-btn value="all" size="small" class="px-3 text-caption font-weight-medium">{{ t('common.all') }}</v-btn>
                <v-btn value="completed" size="small" class="px-3 text-caption font-weight-medium">{{ t('reports.statusCompleted') }}</v-btn>
                <v-btn value="cancelled" size="small" class="px-3 text-caption font-weight-medium">{{ t('reports.statusCancelled') }}</v-btn>
              </v-btn-toggle>
            </div>
          </div>

          <!-- Right side: Count & Reset & Refresh -->
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
              {{ t('common.reset') }}
            </v-btn>
            <v-btn
              icon="mdi-refresh"
              variant="text"
              size="small"
              color="slate-600"
              :loading="loading"
              @click="loadReport"
              :title="t('reports.refreshTooltip')"
            />
          </div>
        </div>
      </div>

      <!-- Production Runs Table -->
      <v-table density="comfortable" hover class="reports-table">
        <thead>
          <tr class="bg-slate-50">
            <th class="text-left font-weight-bold" style="width: 80px;">{{ t('reports.colRunId') }}</th>
            <th class="text-left font-weight-bold" style="width: 180px;">{{ t('reports.colDateTime') }}</th>
            <th class="text-left font-weight-bold">{{ t('reports.colHardwareProject') }}</th>
            <th class="text-center font-weight-bold">{{ t('reports.colProduced') }}</th>
            <th class="text-left font-weight-bold">{{ t('reports.colPartsConsumed') }}</th>
            <th class="text-center font-weight-bold" style="width: 130px;">{{ t('common.status') }}</th>
            <th class="text-left font-weight-bold" style="width: 220px;">{{ t('common.actions') }}</th>
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
                      {{ run.projectName || t('reports.projectNum', { id: run.projectId }) }}
                    </router-link>
                    <div class="text-caption text-slate-400 line-clamp-1" v-if="run.notes">
                      {{ t('common.notes') }}: {{ run.notes }}
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
                  {{ run.count }} {{ run.count === 1 ? t('reports.unit') : t('reports.units') }}
                </v-chip>
              </td>

              <!-- Parts Consumed -->
              <td>
                <div class="text-body-2 text-slate-800">
                  <strong>{{ run.totalComponentsDeducted }}</strong> {{ t('reports.componentsCount') }}
                </div>
                <div class="text-caption text-slate-500">
                  {{ t('reports.acrossBomEntries', { count: run.itemsCount }) }}
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
                  {{ t('reports.statusCompleted') }}
                </v-chip>
                <div v-else class="d-flex flex-column align-center">
                  <v-chip
                    size="x-small"
                    color="slate-600"
                    variant="tonal"
                    class="font-weight-bold text-slate-600"
                  >
                    <v-icon start size="12">mdi-undo</v-icon>
                    {{ t('reports.statusCancelled') }}
                  </v-chip>
                  <span class="text-caption text-slate-400 font-mono mt-1" v-if="run.cancelledAt" style="font-size: 0.68rem;">
                    {{ formatDate(run.cancelledAt) }}
                  </span>
                </div>
              </td>

              <!-- Actions -->
              <td class="text-left">
                <div class="d-flex align-center justify-start gap-2">
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
                    {{ t('common.details') }}
                  </v-btn>

                  <!-- Cancel Run -->
                  <div style="width: 110px;" class="d-flex align-center justify-center flex-shrink-0">
                    <v-btn
                      v-if="run.status === 'completed'"
                      variant="flat"
                      size="x-small"
                      color="error"
                      class="font-weight-bold w-100"
                      prepend-icon="mdi-undo-variant"
                      :title="t('reports.cancelProductionRun')"
                      @click="openCancelConfirmDialog(run)"
                    >
                      {{ t('reports.cancelRun') }}
                    </v-btn>
                    <span v-else class="text-caption text-slate-400 font-italic">
                      {{ t('reports.statusCancelledReturned') }}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </template>

          <!-- Empty state -->
          <tr v-if="!loading && productionRuns.length === 0">
            <td colspan="7" class="text-center py-12">
              <v-avatar color="slate-100" size="64" class="mb-3">
                <v-icon size="32" color="slate-400">mdi-clipboard-text-outline</v-icon>
              </v-avatar>
              <div class="text-body-1 font-weight-bold text-slate-700">
                {{ t('reports.noHistoryTitle') }}
              </div>
              <div class="text-caption text-slate-400 mt-1 max-w-md mx-auto">
                {{ t('reports.noHistorySubtitle') }}
              </div>
            </td>
          </tr>

          <!-- Loading skeleton -->
          <tr v-if="loading && productionRuns.length === 0">
            <td colspan="7" class="text-center py-12">
              <v-progress-circular indeterminate color="primary" class="mb-2" />
              <div class="text-caption text-slate-500">{{ t('reports.loadingReports') }}</div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- DIALOG: PRODUCTION RUN DETAILS BREAKDOWN -->
    <v-dialog v-model="showDetailsDialog" max-width="850" scrollable>
      <v-card class="rounded-0 border bg-white d-flex flex-column" v-if="selectedRun">
        <v-card-title class="bg-slate-50 py-3 px-5 d-flex align-center justify-space-between border-b flex-shrink-0">
          <div class="d-flex align-center gap-2">
            <v-icon color="primary" size="22">mdi-file-tree</v-icon>
            <span class="text-h6 font-weight-bold text-slate-900">
              {{ t('reports.dialogRunTitle', { id: selectedRun.id, name: selectedRun.projectName }) }}
            </span>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showDetailsDialog = false" />
        </v-card-title>

        <div class="px-5 py-3 bg-white border-b d-flex align-center justify-space-between flex-wrap gap-2 flex-shrink-0">
          <div>
            <div class="text-subtitle-2 font-weight-bold text-slate-800">
              {{ t('reports.producedOn', { count: selectedRun.count, units: (selectedRun.count === 1 ? t('reports.unit') : t('reports.units')), date: formatFullDateTime(selectedRun.producedAt) }) }}
            </div>
            <div class="text-caption text-slate-500" v-if="selectedRun.notes">
              {{ t('common.notes') }}: {{ selectedRun.notes }}
            </div>
          </div>
          <v-chip
            size="small"
            :color="selectedRun.status === 'completed' ? 'success' : 'slate-600'"
            :variant="selectedRun.status === 'completed' ? 'flat' : 'tonal'"
            class="font-weight-bold"
          >
            {{ selectedRun.status === 'completed' ? t('reports.statusCompleted') : t('reports.statusCancelled') }}
          </v-chip>
        </div>

        <v-card-text class="pa-0 overflow-y-auto">
          <v-table density="compact" class="breakdown-table">
            <thead>
              <tr class="bg-slate-50">
                <th class="text-left font-weight-bold">{{ t('reports.colComponentPart') }}</th>
                <th class="text-left font-weight-bold">{{ t('common.category') }}</th>
                <th class="text-left font-weight-bold">{{ t('common.package') }}</th>
                <th class="text-center font-weight-bold">{{ t('bom.qtyPerBoard') }}</th>
                <th class="text-center font-weight-bold">{{ t('reports.colDeductedForRun') }}</th>
                <th class="text-center font-weight-bold">{{ t('reports.colCurrentCatalogStock') }}</th>
                <th class="text-center font-weight-bold">{{ t('common.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in selectedRun.items" :key="item.id">
                <td>
                  <div class="d-flex align-center py-1">
                    <v-avatar rounded="lg" size="28" class="border me-2 bg-slate-50 flex-shrink-0">
                      <MediaImage
                        type="component"
                        :src="item.componentPhotoURL"
                        height="28px"
                        width="28px"
                      />
                    </v-avatar>
                    <div>
                      <div
                        class="font-mono font-weight-bold text-body-2 text-primary comp-name-link"
                        @click="openComponentDetails(item)"
                      >
                        <span class="hover-underline">{{ item.component }}</span>
                        <v-icon size="13" class="opacity-60 info-icon ms-1">mdi-information-outline</v-icon>
                      </div>
                      <div class="text-caption text-slate-400 font-mono" v-if="item.marking">
                        Mark: {{ item.marking }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="text-caption text-slate-600">{{ item.category || '—' }}</td>
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
                    {{ t('reports.deducted') }}
                  </v-chip>
                  <v-chip
                    v-else
                    size="x-small"
                    color="success"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    {{ t('reports.restored') }}
                  </v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4 bg-slate-50 d-flex align-center justify-space-between flex-shrink-0">
          <div class="text-caption text-slate-500">
            {{ t('reports.breakdownSummary', { total: selectedRun.totalComponentsDeducted, count: selectedRun.items?.length || 0 }) }}
          </div>
          <div class="d-flex align-center gap-2">
            <v-btn
              v-if="selectedRun.status === 'completed'"
              color="error"
              variant="flat"
              prepend-icon="mdi-undo-variant"
              @click="openCancelConfirmDialog(selectedRun)"
            >
              {{ t('reports.cancelProductionAndReturn') }}
            </v-btn>
            <v-btn variant="outlined" color="slate-600" @click="showDetailsDialog = false">
              {{ t('common.close') }}
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOG: CONFIRM PRODUCTION RUN CANCELLATION -->
    <v-dialog v-model="showCancelDialog" max-width="650">
      <v-card class="rounded-0 border bg-white" v-if="runToCancel">
        <v-card-title class="bg-red-50 py-3 px-5 border-b d-flex align-center text-error">
          <v-icon color="error" class="me-2" size="22">mdi-alert-circle-outline</v-icon>
          <span class="text-subtitle-1 font-weight-bold">
            {{ t('reports.cancelConfirmTitle', { id: runToCancel.id }) }}
          </span>
        </v-card-title>

        <v-card-text class="pa-5">
          <p class="text-body-1 text-slate-800 mb-3">
            {{ t('reports.cancelConfirmMsg', { count: runToCancel.count, units: (runToCancel.count === 1 ? t('reports.unit') : t('reports.units')), name: `"${runToCancel.projectName}"` }) }}
          </p>

          <v-alert
            color="warning"
            variant="tonal"
            density="comfortable"
            class="mb-4 rounded-0 border text-caption"
            icon="mdi-warehouse"
          >
            <strong>{{ t('reports.stockRestoration') }}:</strong> {{ t('reports.stockRestorationMsg', { count: runToCancel.totalComponentsDeducted }) }}
          </v-alert>

          <div class="text-caption font-weight-bold text-slate-700 text-uppercase mb-2">
            {{ t('reports.partsToReturn') }}:
          </div>

          <v-table density="compact" class="border bg-slate-50 mb-2">
            <thead>
              <tr>
                <th class="text-left font-weight-bold">{{ t('shoppingList.colComponent') }}</th>
                <th class="text-left font-weight-bold">{{ t('common.category') }}</th>
                <th class="text-center font-weight-bold">{{ t('reports.colQtyToReturn') }}</th>
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
                  +{{ item.totalDeducted }} {{ t('shoppingList.pcs') }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4 bg-slate-50 d-flex align-center justify-space-between">
          <v-btn variant="outlined" color="slate-600" @click="showCancelDialog = false" :disabled="cancelling">
            {{ t('reports.keepRun') }}
          </v-btn>

          <v-btn
            color="error"
            variant="flat"
            class="font-weight-bold px-4"
            prepend-icon="mdi-undo-variant"
            :loading="cancelling"
            @click="confirmCancelRun"
          >
            {{ t('reports.confirmReturnParts') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Component Details Dialog -->
    <ComponentDetailsDialog
      v-model="showCompDetailsDialog"
      :component="selectedCompForDetails"
      @updated="loadReport"
      @deleted="loadReport"
    />

    <!-- Notification Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import MediaImage from '../../components/MediaImage.vue';
import PackageLink from '../../components/PackageLink.vue';
import ComponentDetailsDialog from '../../components/ComponentDetailsDialog.vue';

const { t } = useI18n();

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
    notify(t('reports.loadError') + ': ' + err.message, 'error');
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
    notify(t('reports.cancelSuccess', { id: res.runId, count: res.totalComponentsRestored }), 'success');
    showCancelDialog.value = false;
    showDetailsDialog.value = false;
    await loadReport();
  } catch (err) {
    console.error('Error cancelling production run:', err);
    notify(t('reports.cancelError') + ': ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    cancelling.value = false;
  }
};

const openComponentDetails = (item) => {
  selectedCompForDetails.value = {
    ID: item.componentId || item.id,
    component: item.component,
    marking: item.marking,
    category: item.category,
    package: item.package,
    datasheetURL: item.datasheetURL,
    photoURL: item.photoURL || item.componentPhotoURL,
    qty: item.stockQuantity ?? item.currentStock,
    shortDescription: item.shortDescription
  };
  showCompDetailsDialog.value = true;
};

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
