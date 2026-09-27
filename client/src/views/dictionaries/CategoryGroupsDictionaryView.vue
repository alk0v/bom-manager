<template>
  <div class="category-groups-dictionary-view">
    <!-- Main Card -->
    <v-card elevation="1" class="rounded-0 border bg-white">
      <!-- Toolbar -->
      <div class="pa-4 border-b d-flex flex-wrap align-center justify-space-between gap-3 bg-slate-50">
        <div class="d-flex flex-wrap align-center gap-3 flex-grow-1 flex-sm-grow-0">
          <!-- Search -->
          <v-text-field
            v-model="groupSearch"
            density="compact"
            variant="outlined"
            :placeholder="t('dictionaries.searchGroups')"
            prepend-inner-icon="mdi-magnify"
            hide-details
            clearable
            rounded="lg"
            class="bg-white"
            style="min-width: 240px; max-width: 360px;"
          />
        </div>

        <div class="d-flex align-center gap-2">
          <v-chip size="small" variant="tonal" color="primary" class="font-weight-bold font-mono">
            {{ filteredGroups.length }} {{ t('dictionaries.groupsCount', { count: filteredGroups.length }) }}
          </v-chip>

          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="outlined"
            :loading="loading"
            @click="loadGroups"
            :title="t('common.refresh')"
          />

          <v-btn
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="mdi-plus"
            class="font-weight-bold"
            @click="openGroupForm()"
          >
            {{ t('dictionaries.addGroup') }}
          </v-btn>
        </div>
      </div>

      <!-- Category Groups Table -->
      <v-table density="comfortable" hover class="data-table">
        <thead>
          <tr class="bg-slate-50 text-caption font-weight-bold">
            <th style="width: 70px;" class="text-center font-weight-bold">ID</th>
            <th style="width: 80px;" class="text-center font-weight-bold">{{ t('dictionaries.sortOrder') }}</th>
            <th class="text-left font-weight-bold">{{ t('dictionaries.groupName') }}</th>
            <th class="text-left font-weight-bold">{{ t('common.description') }}</th>
            <th class="text-center font-weight-bold" style="width: 170px;">{{ t('dictionaries.assignedCategories') }}</th>
            <th class="text-right font-weight-bold" style="width: 120px;">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="grp in filteredGroups" :key="grp.id">
            <td class="text-center font-mono text-caption text-slate-500">{{ grp.id }}</td>
            <!-- Sort Order -->
            <td class="text-center font-mono text-caption text-slate-600 font-weight-bold">
              {{ grp.sortOrder || 0 }}
            </td>
            <!-- Group Name -->
            <td>
              <div class="d-flex align-center gap-2 cursor-pointer hover-underline" @click="openGroupForm(grp)">
                <span class="font-weight-bold text-body-2 text-slate-900">
                  {{ grp.name }}
                </span>
              </div>
            </td>
            <!-- Description -->
            <td class="text-body-2 text-slate-600">
              {{ grp.description || '—' }}
            </td>
            <!-- Assigned Categories Count -->
            <td class="text-center font-mono text-body-2">
              <v-chip
                size="x-small"
                variant="flat"
                :color="grp.categoryCount > 0 ? 'blue-grey-50' : 'slate-100'"
                :class="grp.categoryCount > 0 ? 'text-primary font-weight-bold' : 'text-slate-600'"
              >
                <v-icon start size="14">mdi-shape-outline</v-icon>
                {{ grp.categoryCount || 0 }} {{ (grp.categoryCount === 1 ? t('dictionaries.categorySingle') : t('dictionaries.categoryPlural')) }}
              </v-chip>
            </td>
            <!-- Actions -->
            <td class="text-right">
              <v-btn
                icon="mdi-pencil-outline"
                size="small"
                variant="text"
                color="slate-600"
                @click="openGroupForm(grp)"
                :title="t('dictionaries.editGroup')"
              />
              <v-btn
                icon="mdi-delete-outline"
                size="small"
                variant="text"
                color="error"
                :disabled="grp.id === 1"
                @click="confirmDeleteGroup(grp)"
                :title="grp.id === 1 ? t('dictionaries.cannotDeletePrimary') : t('common.delete')"
              />
            </td>
          </tr>
          <tr v-if="filteredGroups.length === 0 && !loading">
            <td colspan="6" class="text-center py-8 text-slate-500">
              <v-icon size="36" class="mb-2 text-disabled">mdi-folder-multiple-outline</v-icon>
              <div>{{ t('dictionaries.noGroupsFound') }}</div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- CREATE / EDIT GROUP MODAL -->
    <v-dialog v-model="showGroupDialog" max-width="520px" persistent>
      <v-card class="rounded-0 border bg-white">
        <v-card-title class="bg-slate-50 py-3 px-4 border-b font-weight-bold text-subtitle-1 d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-2">
            <v-icon size="20" color="primary">{{ editingGroup ? 'mdi-pencil-outline' : 'mdi-plus-circle-outline' }}</v-icon>
            <span>{{ editingGroup ? t('dictionaries.editGroup') : t('dictionaries.newGroup') }}</span>
          </div>
          <v-btn icon="mdi-close" size="x-small" variant="text" @click="showGroupDialog = false" />
        </v-card-title>

        <v-card-text class="pa-4 pt-5">
          <v-alert
            v-if="groupError"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4 text-caption"
            closable
            @click:close="groupError = ''"
          >
            {{ groupError }}
          </v-alert>

          <!-- Group Name -->
          <v-text-field
            v-model="groupForm.name"
            :label="t('dictionaries.groupNameRequired')"
            :placeholder="t('dictionaries.groupNamePlaceholder')"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-folder-outline"
            autofocus
            class="mb-3"
            hide-details="auto"
          />

          <!-- Description -->
          <v-textarea
            v-model="groupForm.description"
            :label="t('common.description')"
            :placeholder="t('dictionaries.groupDescPlaceholder')"
            variant="outlined"
            density="comfortable"
            rows="3"
            prepend-inner-icon="mdi-card-text-outline"
            class="mb-3"
            hide-details="auto"
          />

          <!-- Sort Order -->
          <v-text-field
            v-model.number="groupForm.sortOrder"
            :label="t('dictionaries.sortOrder')"
            type="number"
            min="0"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-sort-numeric-ascending"
            class="font-mono"
            :hint="t('dictionaries.sortOrderHint')"
            persistent-hint
          />
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="text" size="small" @click="showGroupDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold px-4"
            :loading="saving"
            @click="saveGroup"
          >
            {{ t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DELETE CONFIRMATION DIALOG -->
    <v-dialog v-model="showDeleteDialog" max-width="500px" persistent>
      <v-card class="rounded-0 border bg-white">
        <v-card-title class="bg-red-50 py-3 px-4 border-b font-weight-bold text-subtitle-1 text-red-900 d-flex align-center gap-2">
          <v-icon color="error" size="20">mdi-alert-circle-outline</v-icon>
          <span>{{ t('dictionaries.deleteGroupTitle') }}</span>
        </v-card-title>

        <v-card-text class="pa-4 pt-5">
          <div class="mb-3 text-body-2 text-slate-800">
            {{ t('dictionaries.deleteGroupConfirm', { name: groupToDelete?.name }) }}
          </div>

          <v-alert
            v-if="groupToDelete?.categoryCount > 0"
            type="warning"
            variant="tonal"
            density="compact"
            class="text-caption mb-3"
          >
            {{ t('dictionaries.deleteGroupInUseWarning', { count: groupToDelete.categoryCount }) }}
          </v-alert>

          <div v-if="groupToDelete?.categoryCount > 0" class="mt-2">
            <v-select
              v-model="reassignTargetId"
              :items="otherGroups"
              item-title="name"
              item-value="id"
              :label="t('dictionaries.reassignCategoriesTo')"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-folder-swap-outline"
              class="mb-2"
            />
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex justify-end gap-2">
          <v-btn variant="text" size="small" @click="showDeleteDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn
            color="error"
            variant="flat"
            size="small"
            class="font-weight-bold px-4"
            :loading="deleting"
            @click="executeDeleteGroup"
          >
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Notification Snackbar inside View -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';

const { t } = useI18n();

const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const groupsList = ref([]);
const groupSearch = ref('');

const showGroupDialog = ref(false);
const editingGroup = ref(null);
const groupForm = ref({
  name: '',
  description: '',
  sortOrder: 0
});
const groupError = ref('');

const showDeleteDialog = ref(false);
const groupToDelete = ref(null);
const reassignTargetId = ref(1);

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

const loadGroups = async () => {
  loading.value = true;
  try {
    const grps = await api.getCategoryGroups();
    groupsList.value = grps || [];
  } catch (err) {
    console.error('Failed to load category groups:', err);
    notify(t('dictionaries.loadGroupsError') + ': ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

const filteredGroups = computed(() => {
  let list = [...groupsList.value];
  if (groupSearch.value && groupSearch.value.trim()) {
    const q = groupSearch.value.trim().toLowerCase();
    list = list.filter(g =>
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.description && g.description.toLowerCase().includes(q))
    );
  }
  return list;
});

const otherGroups = computed(() => {
  if (!groupToDelete.value) return groupsList.value;
  return groupsList.value.filter(g => g.id !== groupToDelete.value.id);
});

const openGroupForm = (grp = null) => {
  editingGroup.value = grp;
  groupError.value = '';
  if (grp) {
    groupForm.value = {
      name: grp.name || '',
      description: grp.description || '',
      sortOrder: grp.sortOrder || 0
    };
  } else {
    groupForm.value = {
      name: '',
      description: '',
      sortOrder: (groupsList.value.length + 1) * 10
    };
  }
  showGroupDialog.value = true;
};

const saveGroup = async () => {
  if (!groupForm.value.name || !groupForm.value.name.trim()) {
    groupError.value = t('dictionaries.groupNameRequired');
    return;
  }
  saving.value = true;
  groupError.value = '';
  try {
    const payload = {
      name: groupForm.value.name.trim(),
      description: groupForm.value.description ? groupForm.value.description.trim() : '',
      sortOrder: parseInt(groupForm.value.sortOrder, 10) || 0
    };
    if (editingGroup.value) {
      await api.updateCategoryGroup(editingGroup.value.id, payload);
      notify(t('dictionaries.groupUpdated'));
    } else {
      await api.createCategoryGroup(payload);
      notify(t('dictionaries.groupCreated'));
    }
    showGroupDialog.value = false;
    await loadGroups();
  } catch (err) {
    console.error('Failed to save group:', err);
    groupError.value = err.response?.data?.error || err.message || t('dictionaries.saveGroupError');
  } finally {
    saving.value = false;
  }
};

const confirmDeleteGroup = (grp) => {
  if (grp.id === 1) return;
  groupToDelete.value = grp;
  reassignTargetId.value = 1;
  showDeleteDialog.value = true;
};

const executeDeleteGroup = async () => {
  if (!groupToDelete.value) return;
  deleting.value = true;
  try {
    await api.deleteCategoryGroup(groupToDelete.value.id, reassignTargetId.value);
    notify(t('dictionaries.groupDeleted'));
    showDeleteDialog.value = false;
    await loadGroups();
  } catch (err) {
    console.error('Failed to delete group:', err);
    notify(err.response?.data?.error || err.message || t('dictionaries.deleteGroupError'), 'error');
  } finally {
    deleting.value = false;
  }
};

onMounted(() => {
  loadGroups();
});
</script>

<style scoped>
.hover-underline:hover {
  text-decoration: underline;
}
</style>
