<template>
  <div class="release-notes-view">
    <!-- Language Toggle Bar -->
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap gap-2">
      <div class="d-flex align-center gap-2">
        <v-icon color="primary" size="24">mdi-text-box-multiple-outline</v-icon>
        <span class="text-subtitle-1 font-weight-bold text-slate-900">
          {{ activeLanguage === 'uk' ? 'Історія версій та оновлень' : 'Changelog & Version History' }}
        </span>
      </div>
      <div class="d-flex align-center gap-2">
        <v-btn-toggle
          v-model="activeLanguage"
          mandatory
          density="compact"
          color="primary"
          variant="outlined"
          class="bg-white rounded border"
        >
          <v-btn value="en" size="small" class="font-weight-bold px-3">
            🇬🇧 English
          </v-btn>
          <v-btn value="uk" size="small" class="font-weight-bold px-3">
            🇺🇦 Українська
          </v-btn>
        </v-btn-toggle>
      </div>
    </div>

    <!-- Version Cards (Data-driven) -->
    <v-card
      v-for="rel in releases"
      :key="rel.version"
      elevation="1"
      class="rounded-0 border bg-white overflow-hidden mb-6"
    >
      <!-- Release Header -->
      <v-card-title class="bg-slate-50 py-3 px-5 border-b d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2">
          <v-icon :color="rel.isCurrent ? 'primary' : 'slate-500'" size="22">mdi-tag-outline</v-icon>
          <span class="text-subtitle-1 font-weight-bold" :class="rel.isCurrent ? 'text-slate-900' : 'text-slate-700'">
            {{ t('common.version') }} {{ rel.version }}
          </span>
          <v-chip
            v-if="rel.isCurrent"
            size="x-small"
            color="success"
            variant="flat"
            class="font-weight-bold ms-1"
          >
            {{ t('releaseNotes.current') }}
          </v-chip>
        </div>
        <span class="text-caption font-mono text-slate-500">
          {{ rel.date }}
        </span>
      </v-card-title>

      <!-- Release Body -->
      <v-card-text class="pa-5">
        <p class="text-body-1 text-slate-700 mb-4">
          {{ rel.summary }}
        </p>

        <!-- Feature Points -->
        <div class="border-t pt-4">
          <div class="text-caption font-weight-bold text-primary text-uppercase tracking-wider mb-2">
            {{ t('releaseNotes.whatsNew') }}
          </div>

          <v-list density="compact" class="pa-0 bg-transparent">
            <v-list-item
              v-for="(item, idx) in rel.features"
              :key="idx"
              class="px-0 py-1"
            >
              <template #prepend>
                <v-avatar
                  size="26"
                  color="slate-100"
                  class="me-3 border flex-shrink-0"
                >
                  <v-icon
                    :icon="item.icon || 'mdi-star-four-points-outline'"
                    size="15"
                    :color="item.color || 'primary'"
                  />
                </v-avatar>
              </template>
              <div class="text-body-2 text-slate-800">
                <strong class="font-weight-bold">{{ item.title }}</strong>: {{ item.description }}
              </div>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { releasesEn } from '../data/releaseNotes/en';
import { releasesUk } from '../data/releaseNotes/uk';

const { t, locale } = useI18n();

// Default to active locale from i18n
const activeLanguage = ref(locale.value || 'en');

// Sync with global locale changes
watch(locale, (newLoc) => {
  if (newLoc) {
    activeLanguage.value = newLoc;
  }
});

const releases = computed(() => {
  return activeLanguage.value === 'uk' ? releasesUk : releasesEn;
});

const currentVersion = computed(() => releases.value.find(r => r.isCurrent)?.version || '0.3.0');
</script>

<style scoped>
.release-notes-view :deep(.v-list-item__prepend) {
  align-self: flex-start;
  margin-top: 2px;
}
.tracking-wider {
  letter-spacing: 0.05em;
}
</style>
