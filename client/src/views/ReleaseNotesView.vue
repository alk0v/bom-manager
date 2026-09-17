<template>
  <div class="release-notes-view">
    <!-- Header Card -->
    <v-card elevation="1" class="rounded-0 border bg-white mb-6">
      <v-card-item class="py-4 px-5">
        <div class="d-flex flex-wrap align-center justify-space-between gap-4">
          <div>
            <div class="d-flex align-center flex-wrap" style="gap: 12px;">
              <h1 class="text-h5 font-weight-bold text-slate-900">
                Release Notes
              </h1>
              <v-chip color="primary" variant="flat" size="small" class="font-mono font-weight-bold">
                v0.1.3
              </v-chip>
              <v-chip color="slate-600" variant="tonal" size="small" class="font-weight-medium">
                Latest Release • September 2026
              </v-chip>
            </div>
            <div class="text-body-2 text-disabled mt-1">
              Changelog and overview of new features, bug fixes, and architectural improvements.
            </div>
          </div>
        </div>
      </v-card-item>
    </v-card>

    <!-- Release Content Card -->
    <v-card elevation="1" class="rounded-0 border bg-white overflow-hidden mb-6">
      <v-card-title class="bg-slate-50 py-3 px-5 border-b d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2">
          <v-icon color="primary" size="22">mdi-tag-outline</v-icon>
          <span class="text-subtitle-1 font-weight-bold text-slate-900">
            Version 0.1.3
          </span>
          <v-chip size="x-small" color="success" variant="flat" class="font-weight-bold ms-1">
            Current
          </v-chip>
        </div>
        <span class="text-caption font-mono text-slate-500">
          2026-09-17
        </span>
      </v-card-title>

      <v-card-text class="pa-5">
        <p class="text-body-1 text-slate-700 mb-5">
          Version 0.1.3 introduces full self-hosted local media storage and serving, in-place and global media asset uploading, complete project creation and editing UI, absent parts shortage tracking in the gallery, and enhanced full-size media preview with proportional scaling.
        </p>

        <!-- Highlights Grid -->
        <v-row dense class="mb-5">
          <v-col cols="12" md="6" v-for="item in highlights" :key="item.title">
            <v-card variant="outlined" class="pa-4 rounded-lg h-100 bg-slate-50 border">
              <div class="d-flex align-start gap-3">
                <v-avatar color="primary" variant="tonal" rounded="lg" size="40" class="flex-shrink-0">
                  <v-icon :icon="item.icon" size="22" color="primary" />
                </v-avatar>
                <div>
                  <div class="text-subtitle-2 font-weight-bold text-slate-900 mb-1">
                    {{ item.title }}
                  </div>
                  <div class="text-body-2 text-slate-600">
                    {{ item.description }}
                  </div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Detailed Bullet Points -->
        <div class="border-t pt-5">
          <h2 class="text-subtitle-1 font-weight-bold text-slate-900 mb-3">
            Detailed Changelog
          </h2>

          <div class="mb-4" v-for="group in changelogGroups" :key="group.category">
            <div class="text-caption font-weight-bold text-primary text-uppercase tracking-wider mb-2">
              {{ group.category }}
            </div>
            <v-list density="compact" class="pa-0 bg-transparent">
              <v-list-item
                v-for="(point, idx) in group.items"
                :key="idx"
                class="px-0 py-1"
              >
                <template #prepend>
                  <v-icon icon="mdi-check-circle-outline" size="16" color="success" class="me-2" />
                </template>
                <div class="text-body-2 text-slate-700">
                  {{ point }}
                </div>
              </v-list-item>
            </v-list>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
const highlights = [
  {
    icon: 'mdi-server-network',
    title: 'Self-Hosted Media Serving',
    description: 'Removed external media dependency. The server now hosts all assets locally from the media/ directory under /media/.'
  },
  {
    icon: 'mdi-cloud-upload-outline',
    title: 'Media Asset Uploading',
    description: 'Upload files directly into packages, components, datasheets, or projects folders with sanitization and live preview.'
  },
  {
    icon: 'mdi-folder-plus-outline',
    title: 'Project Management UI',
    description: 'Create new hardware projects and edit existing project metadata directly with live photo previews.'
  },
  {
    icon: 'mdi-alert-circle-outline',
    title: 'Absent Parts Badges',
    description: 'Immediate visibility of missing BOM components via color-coded chips in the projects gallery.'
  }
];

const changelogGroups = [
  {
    category: 'Media & Storage',
    items: [
      'Self-hosted media served at /media/ with automatic directory scaffolding (packages, components, datasheets, projects).',
      'Folder alias compatibility ensuring both projects and projecs spellings work without broken links.',
      'Backend multipart file upload endpoint (POST /api/media/upload) using multer with sanitization.',
      'In-place upload buttons added to project and component creation/edit dialogs.',
      'Global Media Upload modal dialog accessible from the top navigation bar.'
    ]
  },
  {
    category: 'Projects & Gallery',
    items: [
      'Implemented ProjectFormDialog component for creating new projects and editing existing ones.',
      'Added Absent Parts Chip in gallery cards showing missing component counts (e.g. "2 absent" / "0 absent").',
      'Added total projects with shortages count in the gallery header statistics.',
      'Clicking a project card in the gallery now directly navigates to the full project page (/projects/:id).',
      'Clicking "View BOM" continues to open the quick pop-up BOM modal dialog.',
      'Removed project ID badges from gallery cards for a cleaner layout.'
    ]
  },
  {
    category: 'User Interface & Navigation',
    items: [
      'Full-size media preview on the project page with proportional scaling and zero scrollbars.',
      'Strict pure light theme aesthetic enforced across all components and recorded in project skills.',
      'Added left-side menu version indicator (v0.1.3) and dedicated Release Notes page.'
    ]
  }
];
</script>

<style scoped>
.release-notes-view :deep(.v-list-item__prepend) {
  align-self: flex-start;
  margin-top: 2px;
}
</style>
