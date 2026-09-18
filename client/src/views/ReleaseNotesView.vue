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
                v{{ currentVersion }}
              </v-chip>
              <v-chip color="slate-600" variant="tonal" size="small" class="font-weight-medium">
                Latest Release • September 2026
              </v-chip>
            </div>
            <div class="text-body-2 text-slate-500 mt-1">
              New features, workflow improvements, and updates in BOM Manager.
            </div>
          </div>
        </div>
      </v-card-item>
    </v-card>

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
            Version {{ rel.version }}
          </span>
          <v-chip
            v-if="rel.isCurrent"
            size="x-small"
            color="success"
            variant="flat"
            class="font-weight-bold ms-1"
          >
            Current
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
            What's New
          </div>

          <v-list density="compact" class="pa-0 bg-transparent">
            <v-list-item
              v-for="(item, idx) in rel.features"
              :key="idx"
              class="px-0 py-1"
            >
              <template #prepend>
                <v-icon icon="mdi-check-circle-outline" size="18" color="success" class="me-2" />
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
import { computed } from 'vue';

const releases = [
  {
    version: '0.2.2',
    date: '2026-09-18',
    isCurrent: true,
    summary: 'Version 0.2.2 delivers catalog management for packages and categories, rapid in-place creation during component cataloging, safe component deletion with project Bill of Materials dependencies warnings, and responsive layout improvements to the Projects gallery.',
    features: [
      {
        title: 'Packages & Footprints Management (CRUD)',
        description: 'Dedicated management modal to create, edit, inspect component usage counts, and delete footprints with mount technology filters (ALL / SMD / THT).'
      },
      {
        title: 'Categories Management (CRUD)',
        description: 'Full interface to create, rename, and safely delete categories with automated in-use component safeguards.'
      },
      {
        title: 'In-Place Creation in "Add Component" Modal',
        description: 'Added quick-create buttons inside the Category and Package fields of the component creation form, automatically refreshing and selecting the new item.'
      },
      {
        title: 'Safe Component Deletion & Project Warnings',
        description: 'Delete components from the catalog table or details modal with automatic dependency checks. If a part is used in any project, all affected projects, required quantities, and reference designators are clearly listed before confirmation.'
      },
      {
        title: '3-Column Responsive Grid',
        description: 'Arranged hardware project cards in 3 columns instead of 4 on desktop screens for wider cards, better spacing, and improved overall balance.'
      },
      {
        title: 'Enlarged Project Card Chips',
        description: 'Increased chip dimensions, text font size (13px), and icon sizing across all project card metrics (BOM parts, total quantities, estimated cost, absent parts, attached files, and iBOM).'
      }
    ]
  },
  {
    version: '0.2.1',
    date: '2026-09-18',
    summary: 'Version 0.2.1 introduces the "Produce" workflow for hardware projects, automatically calculating required quantities, previewing component inventory deductions, highlighting shortages, and decrementing stock levels in real time.',
    features: [
      {
        title: 'Project Production Workflow',
        description: 'Specify how many units you want to build and let the system calculate the complete component requirements from the Bill of Materials.'
      },
      {
        title: 'Automatic Stock Deduction',
        description: 'Executing a production run automatically deducts the necessary part quantities from in-stock warehouse inventory in a single database transaction.'
      },
      {
        title: 'Interactive Deduction Preview',
        description: 'Inspect exact stock changes per component, post-production remaining quantities, and maximum producible unit caps before confirming.'
      },
      {
        title: 'Shortage Detection & Quick Shopping List',
        description: 'Instant visual alerts for missing components with a 1-click action to add all shortage quantities directly into the procurement shopping list.'
      },
      {
        title: 'Production History & Reports',
        description: 'Dedicated Reports dashboard accessible from the main navigation with KPI metrics, searchable manufacturing logs, and filtering by project or status.'
      },
      {
        title: '1-Click Rollback & Stock Restoration',
        description: 'Cancel any completed production run to automatically restore the exact deducted component quantities back to storage inventory.'
      },
      {
        title: 'Flexible Production Policies',
        description: 'Optionally allow production runs with insufficient catalog stock when physical assemblies proceed before inventory logs are reconciled.'
      },
      {
        title: 'Financial Insights & Purchase History',
        description: 'View order history, latest purchase prices, weighted average costs, and direct supplier links inside component details.'
      },
      {
        title: 'Project BOM Cost Calculation',
        description: 'Automatic calculation of total estimated build costs, unit prices, and line-item totals in project views and BOM pop-ups.'
      },
      {
        title: 'Production Batch Cost Estimation',
        description: 'Live estimation of total manufacturing material costs when scheduling production runs.'
      },
      {
        title: 'Shopping List Purchase Confirmation & Order Creation',
        description: 'Confirm component purchases directly from the shopping list to log new orders in t_orders, automatically increment on-hand inventory stock, and update the shopping list.'
      },
      {
        title: 'Shopping List Redesign & Aligned Quantity Steppers',
        description: 'Interactive component details pop-ups, package links, photo zoom lightbox, real-time search filtering, procurement KPI totals, and vertically aligned quantity steppers.'
      }
    ]
  },
  {
    version: '0.2.0',
    date: '2026-09-17',
    isCurrent: false,
    summary: 'Version 0.2.0 adds project file attachments, KiCAD Interactive BOM viewing, smart BOM importing with automatic part matching, and component details pop-ups throughout the workflow.',
    features: [
      {
        title: 'Project File Attachments',
        description: 'Attach and download files (CAD schematics, firmware binaries, Gerber archives, datasheets, and KiCAD files) directly inside any project.'
      },
      {
        title: 'KiCAD Interactive BOM Viewer',
        description: 'Open and explore interactive PCB layouts directly in your browser with 1-click launch from project attachments.'
      },
      {
        title: 'Smart BOM Importer',
        description: 'Import parts from KiCAD iBOM files with automatic component matching against your catalog, consolidated quantities, and sorted reference designators.'
      },
      {
        title: 'In-Place Component Creation',
        description: 'Quickly catalog missing components during BOM import with pre-filled category, package, marking, and descriptions.'
      },
      {
        title: 'Component Details Pop-up',
        description: 'Click any component name in the "Add Component to BOM" dialog or catalog to view stock, warehouse box locations, photos, and datasheets.'
      }
    ]
  },
  {
    version: '0.1.3',
    date: '2026-09-17',
    isCurrent: false,
    summary: 'Version 0.1.3 introduces local media storage and uploading, project creation and editing, part shortage tracking in the gallery, and photo lightbox previews.',
    features: [
      {
        title: 'Built-In Media Storage',
        description: 'Component photos, package drawings, and datasheets are now stored and served directly by the application.'
      },
      {
        title: 'Easy Media Uploads',
        description: 'Upload component photos, datasheets, and drawings with live previews from the top bar or directly inside edit dialogs.'
      },
      {
        title: 'Project Management',
        description: 'Create and edit hardware projects directly from the gallery with real-time photo previews.'
      },
      {
        title: 'Part Shortage Indicators',
        description: 'Project cards highlight missing components with clear shortage badges so you know what needs ordering.'
      },
      {
        title: 'Photo Lightbox Preview',
        description: 'Click any project photo or component thumbnail to view it in full resolution scaled to your screen.'
      }
    ]
  }
];

const currentVersion = computed(() => releases.find(r => r.isCurrent)?.version || '0.2.1');
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
