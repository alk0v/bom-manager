<template>
  <div class="dictionaries-hub-view">
    <!-- Full-Width Dictionaries Hub List -->
    <v-card elevation="1" class="rounded-0 border bg-white overflow-hidden">
      <v-list lines="two" class="pa-0">
        <template v-for="(item, index) in dictionaryItems" :key="item.route">
          <v-list-item
            :to="item.route"
            class="pa-4 pa-md-5 dictionary-list-item"
            :ripple="true"
          >
            <!-- Dictionary Icon Avatar -->
            <template #prepend>
              <v-avatar
                :color="item.avatarColor"
                variant="tonal"
                rounded="lg"
                size="48"
                class="me-4 flex-shrink-0"
              >
                <v-icon size="26" :color="item.avatarColor">{{ item.icon }}</v-icon>
              </v-avatar>
            </template>

            <!-- Dictionary Details -->
            <div class="d-flex flex-column flex-grow-1 me-4">
              <div class="d-flex align-center gap-2 flex-wrap mb-1">
                <span class="text-subtitle-1 font-weight-bold text-slate-900 dictionary-title">
                  {{ item.title }}
                </span>
                <v-chip
                  v-for="tag in item.tags"
                  :key="tag"
                  size="x-small"
                  variant="outlined"
                  color="slate-600"
                  class="font-weight-medium"
                >
                  {{ tag }}
                </v-chip>
              </div>

              <div class="text-body-2 text-slate-600">
                {{ item.description }}
              </div>
            </div>

            <!-- Open Button & Arrow -->
            <template #append>
              <div class="d-flex align-center gap-2 flex-shrink-0">
                <v-btn
                  variant="tonal"
                  color="primary"
                  class="font-weight-bold text-none d-none d-sm-inline-flex"
                  size="small"
                  append-icon="mdi-arrow-right"
                >
                  {{ item.btnText }}
                </v-btn>
                <v-icon color="slate-400" size="22" class="d-sm-none">mdi-chevron-right</v-icon>
              </div>
            </template>
          </v-list-item>

          <v-divider v-if="index < dictionaryItems.length - 1" />
        </template>
      </v-list>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const dictionaryItems = computed(() => [
  {
    title: t('dictionaries.categoriesTitle'),
    description: t('dictionaries.categoriesDesc'),
    icon: 'mdi-shape-outline',
    avatarColor: 'primary',
    route: '/dictionaries/categories',
    btnText: t('dictionaries.openCategories'),
    tags: [
      t('dictionaries.tagTaxonomy'),
      t('dictionaries.tagAllowedFootprints'),
      t('dictionaries.tagCustomSpecs')
    ]
  },
  {
    title: t('dictionaries.packagesTitle'),
    description: t('dictionaries.packagesDesc'),
    icon: 'mdi-package-variant-closed',
    avatarColor: 'teal-darken-2',
    route: '/dictionaries/packages',
    btnText: t('dictionaries.openPackages'),
    tags: [
      t('dictionaries.tagFootprints'),
      t('dictionaries.tagSmdTht'),
      t('dictionaries.tagDrawings')
    ]
  }
]);
</script>

<style scoped>
.dictionary-list-item {
  transition: background-color 0.15s ease-in-out;
  cursor: pointer;
}

.dictionary-list-item:hover {
  background-color: #f8fafc;
}

.dictionary-title {
  letter-spacing: -0.01em;
}
</style>
