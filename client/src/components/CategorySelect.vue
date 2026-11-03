<template>
  <div class="category-select-wrapper" :class="{ 'is-disabled': disabled }">
    <v-input
      :model-value="modelValue"
      :rules="rules"
      :error-messages="errorMessages"
      :disabled="disabled"
      :hide-details="hideDetails"
      class="category-select-input"
    >
      <template #default="{ isValid }">
        <v-menu
          v-model="menuOpen"
          :close-on-content-click="false"
          location="bottom start"
          offset="4"
          min-width="320"
          max-width="480"
          :disabled="disabled"
        >
          <!-- ACTIVATOR FIELD -->
          <template #activator="{ props: menuProps }">
            <div class="d-flex align-center w-100 gap-1">
              <div
                v-bind="menuProps"
                class="category-select-field d-flex align-center flex-grow-1"
                :class="{
                  'is-focused': menuOpen,
                  'is-error': isValid.value === false,
                  'is-compact': density === 'compact',
                  'rounded-lg': rounded === 'lg'
                }"
              >
                <!-- Prepend Icon -->
                <v-icon
                  icon="mdi-shape-outline"
                  size="18"
                  :color="menuOpen ? 'primary' : 'slate-500'"
                  class="me-2 flex-shrink-0"
                />

                <!-- Selection Content -->
                <div class="category-select-content flex-grow-1 overflow-hidden d-flex align-center flex-wrap gap-1">
                  <!-- MULTI SELECT CHIPS -->
                  <template v-if="multiple">
                    <template v-if="selectedCategoryObjects.length > 0">
                      <v-chip
                        v-for="cat in visibleChips"
                        :key="cat.ID"
                        size="x-small"
                        variant="tonal"
                        color="primary"
                        :closable="!disabled"
                        class="font-weight-medium category-chip"
                        @click:close.stop="deselectCategory(cat.ID)"
                      >
                        {{ cat.category }}
                      </v-chip>
                      <v-chip
                        v-if="hiddenChipsCount > 0"
                        size="x-small"
                        variant="outlined"
                        color="slate-600"
                        class="font-weight-bold"
                      >
                        +{{ hiddenChipsCount }}
                      </v-chip>
                    </template>
                    <span v-else class="text-slate-400 text-body-2 select-placeholder">
                      {{ placeholder || t('components.allCategories') }}
                    </span>
                  </template>

                  <!-- SINGLE SELECT VALUE -->
                  <template v-else>
                    <span v-if="selectedSingleCategory" class="text-slate-900 text-body-2 font-weight-medium text-truncate">
                      {{ selectedSingleCategory.category }}
                    </span>
                    <span v-else class="text-slate-400 text-body-2 select-placeholder">
                      {{ placeholder || (label ? `${label}` : t('dialogs.categoryPlaceholder')) }}
                    </span>
                  </template>
                </div>

                <!-- Clear Button -->
                <v-btn
                  v-if="clearable && hasValue && !disabled"
                  icon="mdi-close"
                  variant="text"
                  size="x-small"
                  density="compact"
                  color="slate-400"
                  class="ms-1 flex-shrink-0 hover-btn"
                  @click.stop="clearSelection"
                />

                <!-- Dropdown Chevron -->
                <v-icon
                  icon="mdi-menu-down"
                  size="20"
                  color="slate-500"
                  class="dropdown-chevron ms-1 flex-shrink-0"
                  :class="{ 'is-open': menuOpen }"
                />
              </div>

              <!-- Append Slot (e.g. Quick Add button) -->
              <div v-if="$slots.append" class="category-select-append flex-shrink-0">
                <slot name="append" />
              </div>
            </div>
          </template>

          <!-- DROPDOWN MENU CARD -->
          <v-card elevation="4" class="rounded-lg border bg-white overflow-hidden category-dropdown-card">
            <!-- Search & Actions Header -->
            <div class="pa-2 bg-slate-50 border-b">
              <v-text-field
                v-model="searchQuery"
                density="compact"
                variant="outlined"
                hide-details
                rounded="md"
                bg-color="white"
                prepend-inner-icon="mdi-magnify"
                :placeholder="t('manageCatalogModal.searchCategories')"
                clearable
                autofocus
                class="category-search-field mb-2"
              />
            </div>

            <!-- GROUPS & CATEGORIES LIST -->
            <div class="category-list-scroll overflow-y-auto" style="max-height: 320px;">
              <template v-if="groupedCategories.length > 0">
                <div
                  v-for="group in groupedCategories"
                  :key="group.id"
                  class="category-group-section"
                >
                  <!-- Supercategory Header (Collapsible) -->
                  <div
                    class="group-header d-flex align-center justify-space-between px-3 py-2 bg-slate-100 border-b cursor-pointer select-none"
                    @click="toggleGroup(group.id)"
                  >
                    <div class="d-flex align-center gap-2 flex-grow-1 overflow-hidden">
                      <v-icon
                        :icon="isGroupCollapsed(group.id) ? 'mdi-chevron-right' : 'mdi-chevron-down'"
                        size="18"
                        color="slate-600"
                        class="chevron-icon"
                      />
                      <v-icon
                        icon="mdi-folder-outline"
                        size="16"
                        color="indigo-darken-1"
                      />
                      <span class="font-weight-bold text-caption text-slate-800 text-truncate">
                        {{ group.name }}
                      </span>
                      <v-chip size="x-small" variant="flat" color="slate-200" class="text-slate-700 font-mono font-weight-bold ms-1" style="height: 18px;">
                        {{ group.categories.length }}
                      </v-chip>
                    </div>

                    <!-- Multi-select: Group Select All/Clear Toggle -->
                    <div v-if="multiple" class="d-flex align-center ms-2" @click.stop>
                      <v-btn
                        variant="text"
                        size="x-small"
                        density="compact"
                        :color="isEntireGroupSelected(group) ? 'primary' : 'slate-500'"
                        class="text-caption font-weight-bold px-1"
                        @click="toggleGroupSelection(group)"
                      >
                        {{ isEntireGroupSelected(group) ? (t('common.clear') || 'Clear') : (t('common.all') || 'All') }}
                      </v-btn>
                    </div>
                  </div>

                  <!-- Categories Under This Supercategory -->
                  <div v-show="!isGroupCollapsed(group.id)" class="group-categories-list">
                    <div
                      v-for="cat in group.categories"
                      :key="cat.ID"
                      class="category-item d-flex align-center justify-space-between px-4 py-2 cursor-pointer"
                      :class="{
                        'is-selected': isCategorySelected(cat.ID),
                        'is-single-active': !multiple && isCategorySelected(cat.ID)
                      }"
                      @click="selectCategory(cat)"
                    >
                      <!-- Multi Select with Checkbox -->
                      <template v-if="multiple">
                        <div class="d-flex align-center gap-2 flex-grow-1 overflow-hidden">
                          <v-checkbox-btn
                            :model-value="isCategorySelected(cat.ID)"
                            color="primary"
                            density="compact"
                            class="me-1 flex-shrink-0"
                            @click.stop="selectCategory(cat)"
                          />
                          <span class="text-body-2 text-slate-800 text-truncate" :class="{ 'font-weight-bold text-primary': isCategorySelected(cat.ID) }">
                            {{ cat.category }}
                          </span>
                        </div>
                      </template>

                      <!-- Single Select Item -->
                      <template v-else>
                        <div class="d-flex align-center gap-2 flex-grow-1 overflow-hidden ps-2">
                          <v-icon
                            icon="mdi-circle-small"
                            size="16"
                            :color="isCategorySelected(cat.ID) ? 'primary' : 'slate-400'"
                          />
                          <span class="text-body-2" :class="isCategorySelected(cat.ID) ? 'font-weight-bold text-primary' : 'text-slate-800'">
                            {{ cat.category }}
                          </span>
                        </div>
                        <v-icon
                          v-if="isCategorySelected(cat.ID)"
                          icon="mdi-check"
                          size="18"
                          color="primary"
                          class="ms-2"
                        />
                      </template>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Empty State -->
              <div v-else class="pa-6 text-center text-slate-400">
                <v-icon icon="mdi-shape-outline" size="32" class="mb-2 text-slate-300" />
                <div class="text-body-2 font-weight-medium text-slate-500">
                  {{ t('manageCatalogModal.noCategoriesFound') }}
                </div>
              </div>
            </div>
          </v-card>
        </v-menu>
      </template>
    </v-input>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  modelValue: {
    type: [Number, String, Array],
    default: null
  },
  categories: {
    type: Array,
    default: () => []
  },
  multiple: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  density: {
    type: String,
    default: 'compact'
  },
  variant: {
    type: String,
    default: 'outlined'
  },
  rounded: {
    type: String,
    default: 'lg'
  },
  clearable: {
    type: Boolean,
    default: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  rules: {
    type: Array,
    default: () => []
  },
  errorMessages: {
    type: [String, Array],
    default: ''
  },
  hideDetails: {
    type: [Boolean, String],
    default: 'auto'
  },
  maxVisibleChips: {
    type: Number,
    default: 3
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const { t } = useI18n();

const menuOpen = ref(false);
const searchQuery = ref('');
const collapsedGroups = ref(new Set());

// Track all available category objects
const availableCategories = computed(() => {
  return Array.isArray(props.categories) ? props.categories : [];
});

// Single Selected Category Object
const selectedSingleCategory = computed(() => {
  if (props.multiple || props.modelValue == null || props.modelValue === '') return null;
  const id = Number(props.modelValue);
  return availableCategories.value.find(c => Number(c.ID || c.id) === id) || null;
});

// Multi Selected Category Objects
const selectedCategoryObjects = computed(() => {
  if (!props.multiple || !Array.isArray(props.modelValue)) return [];
  const idSet = new Set(props.modelValue.map(v => Number(v)));
  return availableCategories.value.filter(c => idSet.has(Number(c.ID || c.id)));
});

// Visible chips in multi mode
const visibleChips = computed(() => {
  return selectedCategoryObjects.value.slice(0, props.maxVisibleChips);
});

const hiddenChipsCount = computed(() => {
  return Math.max(0, selectedCategoryObjects.value.length - props.maxVisibleChips);
});

const hasValue = computed(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.length > 0;
  }
  return props.modelValue != null && props.modelValue !== '';
});

// Grouped categories computed property with search filtering
const groupedCategories = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  
  // Filter matching categories
  const filtered = availableCategories.value.filter(c => {
    if (!query) return true;
    const nameMatch = (c.category || '').toLowerCase().includes(query);
    const groupMatch = (c.groupName || '').toLowerCase().includes(query);
    return nameMatch || groupMatch;
  });

  // Group by groupId / groupName
  const map = new Map();
  for (const cat of filtered) {
    const groupId = cat.groupId ? Number(cat.groupId) : 1;
    const groupName = cat.groupName || 'Electronic';

    if (!map.has(groupId)) {
      map.set(groupId, {
        id: groupId,
        name: groupName,
        sortOrder: groupId === 1 ? 1 : (groupId + 10),
        categories: []
      });
    }
    map.get(groupId).categories.push(cat);
  }

  // Sort groups and inner categories
  const result = Array.from(map.values()).sort((a, b) => {
    if (a.id === 1) return -1;
    if (b.id === 1) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const grp of result) {
    grp.categories.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
  }

  return result;
});

// Auto-expand groups when user searches
watch(searchQuery, (newQuery) => {
  if (newQuery.trim()) {
    collapsedGroups.value.clear();
  }
});

// Group collapse/expand handlers
const isGroupCollapsed = (groupId) => {
  return collapsedGroups.value.has(groupId);
};

const toggleGroup = (groupId) => {
  if (collapsedGroups.value.has(groupId)) {
    collapsedGroups.value.delete(groupId);
  } else {
    collapsedGroups.value.add(groupId);
  }
};

const expandAllGroups = () => {
  collapsedGroups.value.clear();
};

const collapseAllGroups = () => {
  for (const grp of groupedCategories.value) {
    collapsedGroups.value.add(grp.id);
  }
};

// Selection helper methods
const isCategorySelected = (catId) => {
  const targetId = Number(catId);
  if (props.multiple) {
    if (!Array.isArray(props.modelValue)) return false;
    return props.modelValue.some(v => Number(v) === targetId);
  }
  return Number(props.modelValue) === targetId;
};

const isEntireGroupSelected = (group) => {
  if (!props.multiple || !Array.isArray(props.modelValue) || group.categories.length === 0) return false;
  return group.categories.every(cat => isCategorySelected(cat.ID));
};

const toggleGroupSelection = (group) => {
  if (!props.multiple) return;
  const currentSelected = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  const groupCatIds = group.categories.map(c => c.ID);
  const allSelected = groupCatIds.every(id => currentSelected.some(v => Number(v) === Number(id)));

  let updated;
  if (allSelected) {
    // Unselect all in this group
    const groupSet = new Set(groupCatIds.map(id => Number(id)));
    updated = currentSelected.filter(id => !groupSet.has(Number(id)));
  } else {
    // Add all in this group
    const set = new Set([...currentSelected.map(Number), ...groupCatIds.map(Number)]);
    updated = Array.from(set);
  }

  emit('update:modelValue', updated);
  emit('change', updated);
};

const selectCategory = (cat) => {
  const catId = cat.ID || cat.id;
  if (props.multiple) {
    const current = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
    const index = current.findIndex(v => Number(v) === Number(catId));
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(catId);
    }
    emit('update:modelValue', current);
    emit('change', current);
  } else {
    emit('update:modelValue', catId);
    emit('change', catId);
    menuOpen.value = false;
  }
};

const deselectCategory = (catId) => {
  if (!props.multiple || !Array.isArray(props.modelValue)) return;
  const current = props.modelValue.filter(v => Number(v) !== Number(catId));
  emit('update:modelValue', current);
  emit('change', current);
};

const selectAllFiltered = () => {
  if (!props.multiple) return;
  const allIds = [];
  for (const grp of groupedCategories.value) {
    for (const cat of grp.categories) {
      allIds.push(cat.ID);
    }
  }
  const set = new Set([...(Array.isArray(props.modelValue) ? props.modelValue.map(Number) : []), ...allIds.map(Number)]);
  const updated = Array.from(set);
  emit('update:modelValue', updated);
  emit('change', updated);
};

const clearSelection = () => {
  const emptyVal = props.multiple ? [] : null;
  emit('update:modelValue', emptyVal);
  emit('change', emptyVal);
};
</script>

<style scoped>
.category-select-wrapper {
  position: relative;
  width: 100%;
}

.category-select-wrapper.is-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.category-select-input :deep(.v-input__control) {
  width: 100%;
}

.category-select-field {
  min-height: 40px;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  user-select: none;
}

.category-select-field:hover {
  border-color: #94a3b8;
}

.category-select-field.is-focused {
  border-color: #2563eb !important;
  box-shadow: 0 0 0 1px #2563eb;
}

.category-select-field.is-error {
  border-color: #dc2626 !important;
}

.category-select-field.is-compact {
  min-height: 40px;
}

.dropdown-chevron {
  transition: transform 0.2s ease;
}

.dropdown-chevron.is-open {
  transform: rotate(180deg);
}

.category-chip {
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-dropdown-card {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
}

.group-header:hover {
  background-color: #f1f5f9 !important;
}

.category-item {
  transition: background-color 0.15s ease;
  border-bottom: 1px solid #f8fafc;
}

.category-item:hover {
  background-color: #f8fafc;
}

.category-item.is-selected {
  background-color: #eff6ff;
}

.category-item.is-single-active {
  background-color: #eff6ff;
}

.chevron-icon {
  transition: transform 0.2s ease;
}

.hover-btn:hover {
  color: #1e293b !important;
}
</style>
