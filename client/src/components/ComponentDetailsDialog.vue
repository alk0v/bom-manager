<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1020"
    scrollable
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <v-card class="rounded-0 border bg-white d-flex flex-column" v-if="displayComponent">
      <!-- Header -->
      <v-card-title class="bg-slate-50 py-3 px-4 d-flex align-center justify-space-between border-b flex-shrink-0">
        <div class="d-flex align-center gap-2 text-truncate">
          <v-icon color="primary" size="22">mdi-memory</v-icon>
          <span class="font-mono font-weight-bold text-subtitle-1 text-primary text-truncate">
            {{ displayComponent.component }}
          </span>
          <v-chip
            v-if="displayComponent.marking"
            size="x-small"
            color="slate-700"
            variant="tonal"
            class="font-mono font-weight-bold ms-1"
          >
            {{ t('componentDetailsModal.mark', { marking: displayComponent.marking }) }}
          </v-chip>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" :title="t('common.close')" />
      </v-card-title>

      <!-- Tabs to organize details without overloading the screen -->
      <v-tabs
        v-model="activeTab"
        density="compact"
        color="primary"
        class="border-b px-3 bg-slate-50 flex-shrink-0"
      >
        <v-tab value="overview" class="text-capitalize font-weight-medium">
          <v-icon start size="18">mdi-information-outline</v-icon>
          {{ t('componentDetailsModal.tabOverview') }}
        </v-tab>
        <v-tab value="projects" class="text-capitalize font-weight-medium">
          <v-icon start size="18">mdi-folder-outline</v-icon>
          {{ t('componentDetailsModal.tabProjects') }}
          <v-badge
            v-if="projectList.length > 0"
            :content="projectList.length"
            inline
            color="primary"
            class="ms-2"
          />
        </v-tab>
        <v-tab value="orders" class="text-capitalize font-weight-medium">
          <v-icon start size="18">mdi-cash-multiple</v-icon>
          {{ t('componentDetailsModal.tabOrders') }}
          <v-badge
            v-if="(displayComponent.pricing?.orderCount || 0) + supplierLinks.length > 0"
            :content="(displayComponent.pricing?.orderCount || 0) + supplierLinks.length"
            inline
            color="primary"
            class="ms-2"
          />
        </v-tab>
      </v-tabs>

      <!-- Content -->
      <v-card-text class="pa-4 overflow-y-auto">
        <!-- Loading Progress Bar -->
        <v-progress-linear
          v-if="loading"
          indeterminate
          color="primary"
          height="2"
          class="mb-3"
        />

        <v-window v-model="activeTab">
          <!-- TAB 1: OVERVIEW & SPECS -->
          <v-window-item value="overview">
            <v-row>
              <!-- Photo Thumbnail (Click to zoom full size) -->
              <v-col cols="12" sm="5" class="d-flex flex-column align-center justify-center">
                <div
                  class="position-relative border rounded-lg bg-slate-50 w-100 d-flex align-center justify-center overflow-hidden photo-zoom-wrapper"
                  :class="{ 'cursor-pointer': !!displayComponent.photoURL }"
                  :title="displayComponent.photoURL ? t('dialogs.viewFullSize') : ''"
                  style="height: 180px; max-height: 200px;"
                  @click="displayComponent.photoURL && (showPhotoLightbox = true)"
                >
                  <MediaImage
                    type="component"
                    :src="displayComponent.photoURL"
                    height="180px"
                    width="100%"
                    :cover="false"
                  />
                  <div v-if="displayComponent.photoURL" class="photo-overlay d-flex align-center justify-center">
                    <v-icon icon="mdi-magnify-plus-outline" size="32" color="slate-800" />
                  </div>
                </div>
                <span v-if="displayComponent.photoURL" class="text-caption text-slate-400 mt-1 font-mono text-truncate" style="max-width: 220px;">
                  {{ displayComponent.photoURL }}
                </span>
              </v-col>

              <!-- Component Metadata -->
              <v-col cols="12" sm="7">
                <!-- Category -->
                <div class="text-caption text-disabled text-uppercase font-weight-bold">{{ t('common.category') }}</div>
                <div class="text-body-2 font-weight-medium mb-2">
                  <v-chip size="small" variant="tonal" color="info" v-if="displayComponent.category">
                    {{ displayComponent.category }}
                  </v-chip>
                  <span v-else class="text-disabled">—</span>
                </div>

                <!-- Package / Footprint -->
                <div class="text-caption text-disabled text-uppercase font-weight-bold">{{ t('dialogs.package') }}</div>
                <div class="text-body-2 font-mono mb-2 d-flex align-center gap-1 flex-wrap">
                  <PackageLink :item="displayComponent" />
                  <v-chip size="x-small" class="ms-1" v-if="displayComponent.package">
                    {{ displayComponent.isSmd ? 'SMD' : t('dialogs.throughHole') }}
                  </v-chip>
                  <v-chip
                    size="x-small"
                    variant="tonal"
                    color="blue-grey"
                    class="ms-1 font-mono"
                    v-if="displayComponent.pinQuantity"
                  >
                    {{ displayComponent.pinQuantity }} {{ t('dialogs.pins') }}
                  </v-chip>
                </div>

                <!-- Marking -->
                <div class="text-caption text-disabled text-uppercase font-weight-bold">{{ t('componentDetailsModal.markingCode') }}</div>
                <div class="text-body-2 font-mono mb-2 text-slate-800">
                  {{ displayComponent.marking || '—' }}
                </div>

                <!-- In Stock Quantity, Min Acceptable Qty & Latest Unit Price -->
                <v-row dense class="mb-1">
                  <v-col cols="4">
                    <div class="text-caption text-disabled text-uppercase font-weight-bold">{{ t('componentDetailsModal.inStock') }}</div>
                    <div class="d-inline-flex align-center border rounded px-1 bg-white" style="height: 28px; width: 78px;">
                      <input
                        type="number"
                        min="0"
                        :value="displayComponent.qty ?? 0"
                        @change="e => saveStockQty(e.target.value)"
                        :class="[
                          'font-mono font-weight-bold text-center border-0 outline-none w-100',
                          (!displayComponent.qty || displayComponent.qty <= 0) ? 'text-error' : (displayComponent.minQty > 0 && displayComponent.qty <= displayComponent.minQty ? 'text-orange-darken-3' : 'text-slate-800')
                        ]"
                        style="font-size: 0.85rem;"
                        :title="t('dialogs.editStockQty')"
                      />
                    </div>
                  </v-col>

                  <v-col cols="4">
                    <div class="text-caption text-disabled text-uppercase font-weight-bold">{{ t('componentDetailsModal.minAcceptable') }}</div>
                    <div class="d-inline-flex align-center border rounded px-1 bg-white" style="height: 28px; width: 78px;">
                      <input
                        type="number"
                        min="0"
                        :value="displayComponent.minQty ?? 0"
                        @change="e => saveMinQty(e.target.value)"
                        class="font-mono font-weight-bold text-center text-slate-800 border-0 outline-none w-100"
                        style="font-size: 0.85rem;"
                        :title="t('dialogs.editMinQty')"
                      />
                    </div>
                  </v-col>

                  <v-col cols="4">
                    <div class="text-caption text-disabled text-uppercase font-weight-bold">{{ t('componentDetailsModal.latestPrice') }}</div>
                    <div>
                      <v-chip
                        v-if="displayComponent.pricing?.latestPrice != null"
                        size="small"
                        color="primary"
                        variant="tonal"
                        class="font-mono font-weight-bold"
                      >
                        <v-icon start size="14">mdi-tag-outline</v-icon>
                        {{ formatCurrency(displayComponent.pricing.latestPrice) }}
                      </v-chip>
                      <span v-else class="text-caption text-disabled italic">—</span>
                    </div>
                  </v-col>
                </v-row>

                <!-- Low stock alert warning banner if near to end -->
                <v-alert
                  v-if="displayComponent.minQty > 0 && displayComponent.qty > 0 && displayComponent.qty <= displayComponent.minQty"
                  density="compact"
                  color="warning"
                  variant="tonal"
                  icon="mdi-alert-outline"
                  class="mt-2 mb-0 text-caption font-weight-medium"
                >
                  {{ t('componentDetailsModal.lowStockAlert', { qty: displayComponent.qty, min: displayComponent.minQty }) }}
                </v-alert>
              </v-col>
            </v-row>

            <v-divider class="my-3" />

            <!-- Technical Specifications & Attributes -->
            <div v-if="displayComponent.customFields && displayComponent.customFields.length > 0" class="mb-3">
              <div class="text-caption text-disabled text-uppercase font-weight-bold mb-2 d-flex align-center gap-1">
                <v-icon size="16" color="primary">mdi-tune-vertical</v-icon>
                <span>{{ t('componentDetailsModal.specifications') }}</span>
              </div>
              <div class="border rounded-lg bg-slate-50 pa-3">
                <v-row dense>
                  <v-col
                    v-for="spec in displayComponent.customFields"
                    :key="spec.fieldId || spec.id"
                    cols="6"
                    sm="4"
                    class="py-1"
                  >
                    <div class="text-caption text-slate-500 font-weight-medium">{{ spec.fieldLabel }}</div>
                    <div class="font-mono font-weight-bold text-body-2 text-slate-900">
                      {{ spec.fieldValue }} <span v-if="spec.unit" class="text-caption font-weight-normal text-slate-600">{{ spec.unit }}</span>
                    </div>
                  </v-col>
                </v-row>
              </div>
            </div>

            <!-- Description -->
            <div class="text-caption text-disabled text-uppercase font-weight-bold mb-1">{{ t('common.description') }}</div>
            <p class="text-body-2 text-slate-700 mb-3" style="white-space: pre-line;">
              {{ displayComponent.description || displayComponent.shortDescription || t('componentDetailsModal.noDescription') }}
            </p>


          </v-window-item>

          <!-- TAB 2: USED IN PROJECTS -->
          <v-window-item value="projects">
            <div v-if="projectList.length === 0 && !loading" class="text-center py-8 text-disabled">
              <v-icon size="48" class="mb-2">mdi-folder-open-outline</v-icon>
              <div class="text-body-1 font-weight-medium text-slate-700">{{ t('componentDetailsModal.notUsedInProjects') }}</div>
              <div class="text-caption text-disabled mt-1" style="max-width: 440px; margin: 0 auto;">
                {{ t('componentDetailsModal.notUsedInProjectsHint') }}
              </div>
            </div>

            <div v-else-if="projectList.length > 0" class="projects-tab-content">
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="text-subtitle-2 font-weight-bold text-slate-800 d-flex align-center gap-1">
                  <v-icon size="18" color="primary">mdi-folder-multiple-outline</v-icon>
                  <span>{{ t('componentDetailsModal.usedInProjects', { count: projectList.length, projects: projectList.length === 1 ? t('componentDetailsModal.projectSingular') : t('componentDetailsModal.projectPlural') }) }}</span>
                </div>
                <v-chip size="small" color="primary" variant="tonal" class="font-mono font-weight-bold">
                  {{ t('componentDetailsModal.totalNeeded', { count: projectList.reduce((acc, p) => acc + (p.requiredQuantity || 0), 0) }) }}
                </v-chip>
              </div>

              <div class="border rounded-lg overflow-hidden">
                <v-table density="comfortable" class="bg-white">
                  <thead>
                    <tr class="bg-slate-50 text-caption font-weight-bold">
                      <th class="text-left py-2" style="width: 50px;">{{ t('common.photo') }}</th>
                      <th class="text-left py-2 font-weight-bold">{{ t('componentDetailsModal.colProjectName') }}</th>
                      <th class="text-center py-2 font-weight-bold" style="width: 110px;">{{ t('componentDetailsModal.colQtyInBom') }}</th>
                      <th class="text-left py-2 font-weight-bold">{{ t('componentDetailsModal.colDesignatorsNotes') }}</th>
                      <th class="text-left py-2 font-weight-bold" style="width: 90px;">{{ t('common.actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="p in projectList" :key="p.id">
                      <!-- Project Thumbnail -->
                      <td class="py-2">
                        <v-avatar rounded="lg" size="36" class="border bg-slate-50">
                          <MediaImage
                            type="project"
                            :src="p.photoUrl"
                            height="36px"
                            width="36px"
                          />
                        </v-avatar>
                      </td>

                      <!-- Project Name -->
                      <td class="py-2">
                        <div
                          class="font-weight-bold text-body-2 text-primary cursor-pointer d-flex align-center gap-1 hover-underline"
                          @click="openProject(p.id)"
                        >
                          <span>{{ p.projectName }}</span>
                          <v-icon size="14">mdi-open-in-new</v-icon>
                        </div>
                        <div class="text-caption text-disabled text-truncate" style="max-width: 260px;" :title="p.description">
                          {{ p.description || '—' }}
                        </div>
                      </td>

                      <!-- Quantity in BOM -->
                      <td class="text-center py-2">
                        <v-chip
                          size="small"
                          color="primary"
                          variant="tonal"
                          class="font-mono font-weight-bold px-2"
                        >
                          {{ p.requiredQuantity }} {{ t('componentDetailsModal.pcs') }}
                        </v-chip>
                      </td>

                      <!-- Designators -->
                      <td class="py-2 font-mono text-caption text-slate-700">
                        {{ p.designators || '—' }}
                      </td>

                      <!-- Action Button -->
                      <td class="text-left py-2">
                        <v-btn
                          size="small"
                          variant="outlined"
                          color="primary"
                          @click="openProject(p.id)"
                        >
                          {{ t('componentDetailsModal.btnView') }}
                        </v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </div>
          </v-window-item>

          <!-- TAB 3: PURCHASES & PRICING -->
          <v-window-item value="orders">
            <!-- Header Row with Buy Button -->
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="text-subtitle-2 font-weight-bold text-slate-800 d-flex align-center gap-1">
                <v-icon size="18" color="primary">mdi-cash-multiple</v-icon>
                <span>{{ t('componentDetailsModal.financialInsights') }}</span>
              </div>
            </div>

            <!-- Stat Cards Row -->
            <div v-if="displayComponent.pricing?.orderCount > 0" class="mb-3">
              <v-row dense>
                <v-col cols="6" sm="3">
                  <v-card variant="outlined" class="pa-2 bg-slate-50 rounded-lg">
                    <div class="text-caption text-disabled text-truncate">{{ t('componentDetailsModal.latestPrice') }}</div>
                    <div class="text-subtitle-1 font-weight-bold text-primary font-mono">
                      {{ formatCurrency(displayComponent.pricing.latestPrice, displayComponent.pricing?.defaultCurrency || currencyStore.defaultCurrency) }}
                    </div>
                    <div class="text-caption text-disabled text-truncate font-mono" v-if="displayComponent.pricing.latestOrderDate">
                      {{ formatDate(displayComponent.pricing.latestOrderDate) }}
                    </div>
                  </v-card>
                </v-col>
                <v-col cols="6" sm="3">
                  <v-card variant="outlined" class="pa-2 bg-slate-50 rounded-lg">
                    <div class="text-caption text-disabled text-truncate">{{ t('componentDetailsModal.weightedAvg') }}</div>
                    <div class="text-subtitle-1 font-weight-bold text-slate-800 font-mono">
                      {{ formatCurrency(displayComponent.pricing.avgPrice, displayComponent.pricing?.defaultCurrency || currencyStore.defaultCurrency) }}
                    </div>
                    <div class="text-caption text-disabled text-truncate font-mono">
                      {{ t('componentDetailsModal.perUnit') }}
                    </div>
                  </v-card>
                </v-col>
                <v-col cols="6" sm="3">
                  <v-card variant="outlined" class="pa-2 bg-slate-50 rounded-lg">
                    <div class="text-caption text-disabled text-truncate">{{ t('componentDetailsModal.totalOrdered') }}</div>
                    <div class="text-subtitle-1 font-weight-bold text-slate-800 font-mono">
                      {{ displayComponent.pricing.totalQuantityPurchased }} {{ t('componentDetailsModal.pcs') }}
                    </div>
                    <div class="text-caption text-disabled text-truncate font-mono">
                      {{ displayComponent.pricing.orderCount }} {{ displayComponent.pricing.orderCount === 1 ? t('componentDetailsModal.orderSingular') : t('componentDetailsModal.orderPlural') }}
                    </div>
                  </v-card>
                </v-col>
                <v-col cols="6" sm="3">
                  <v-card variant="outlined" class="pa-2 bg-slate-50 rounded-lg">
                    <div class="text-caption text-disabled text-truncate">{{ t('componentDetailsModal.totalSpent') }}</div>
                    <div class="text-subtitle-1 font-weight-bold text-slate-900 font-mono">
                      {{ formatCurrency(displayComponent.pricing.totalSpent, displayComponent.pricing?.defaultCurrency || currencyStore.defaultCurrency) }}
                    </div>
                    <div class="text-caption text-disabled text-truncate font-mono">
                      {{ t('componentDetailsModal.allPurchases') }}
                    </div>
                  </v-card>
                </v-col>
              </v-row>

              <!-- Orders Table -->
              <div class="mt-3 border rounded-lg overflow-hidden">
                <v-table density="compact" class="bg-white orders-table">
                  <thead>
                    <tr class="bg-slate-50 text-caption font-weight-bold">
                      <th class="text-left py-2 font-weight-bold">{{ t('common.date') }}</th>
                      <th class="text-left py-2 font-weight-bold">{{ t('componentDetailsModal.colStatus') }}</th>
                      <th class="text-right py-2 font-weight-bold">{{ t('componentDetailsModal.colUnitPrice') }}</th>
                      <th class="text-center py-2 font-weight-bold">{{ t('componentDetailsModal.colQty') }}</th>
                      <th class="text-right py-2 font-weight-bold">{{ t('componentDetailsModal.colTotal') }}</th>
                      <th class="text-left py-2 font-weight-bold">{{ t('componentDetailsModal.colSupplierNotes') }}</th>
                      <th class="text-center py-2 font-weight-bold" style="width: 50px;">{{ t('componentDetailsModal.colLink') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="order in displayComponent.pricing.orders" :key="order.id">
                      <td class="text-caption font-mono">{{ formatDate(order.date) }}</td>
                      <td>
                        <div class="d-flex align-center gap-1">
                          <v-chip
                            v-if="order.status === 'pending'"
                            size="x-small"
                            color="amber-darken-3"
                            variant="tonal"
                            class="font-weight-medium"
                          >
                            <v-icon start size="12">mdi-truck-delivery-outline</v-icon>
                            {{ t('componentDetailsModal.statusPending') }}
                          </v-chip>
                          <v-chip
                            v-else-if="order.status === 'cancelled'"
                            size="x-small"
                            color="error"
                            variant="tonal"
                            class="font-weight-medium"
                          >
                            <v-icon start size="12">mdi-close-circle-outline</v-icon>
                            {{ t('componentDetailsModal.statusCancelled') }}
                          </v-chip>
                          <v-chip
                            v-else
                            size="x-small"
                            color="success"
                            variant="tonal"
                            class="font-weight-medium"
                            :title="order.deliveredDate ? `Delivered: ${formatDate(order.deliveredDate)}` : ''"
                          >
                            <v-icon start size="12">mdi-check-circle-outline</v-icon>
                            {{ t('componentDetailsModal.statusDelivered') }}
                          </v-chip>
                          <template v-if="hasAnyPendingPurchases">
                            <v-btn
                              v-if="order.status === 'pending'"
                              icon="mdi-package-variant-closed-check"
                              size="x-small"
                              variant="text"
                              color="success"
                              :title="t('componentDetailsModal.confirmDeliveryTooltip')"
                              @click="openDeliveryForOrder(order)"
                            />
                            <v-btn
                              v-else
                              icon="mdi-package-variant-closed-check"
                              size="x-small"
                              variant="text"
                              disabled
                              color="slate-300"
                              class="opacity-25"
                              tabindex="-1"
                              aria-hidden="true"
                              style="pointer-events: none;"
                            />

                            <v-btn
                              v-if="order.status === 'pending'"
                              icon="mdi-cancel"
                              size="x-small"
                              variant="text"
                              color="warning"
                              :title="t('componentDetailsModal.cancelOrderTooltip')"
                              @click="openCancelOrderForOrder(order)"
                            />
                            <v-btn
                              v-else
                              icon="mdi-cancel"
                              size="x-small"
                              variant="text"
                              disabled
                              color="slate-300"
                              class="opacity-25"
                              tabindex="-1"
                              aria-hidden="true"
                              style="pointer-events: none;"
                            />
                          </template>
                        </div>
                      </td>
                      <td class="text-right text-caption font-mono font-weight-bold text-primary">
                        <div v-if="order.currency && order.currency !== (displayComponent.pricing?.defaultCurrency || currencyStore.defaultCurrency)">
                          <div>{{ formatCurrency(order.originalPrice, order.currency) }}</div>
                          <div class="text-caption text-slate-500 font-mono font-weight-regular">
                            ≈ {{ formatCurrency(order.price, displayComponent.pricing?.defaultCurrency || currencyStore.defaultCurrency) }}
                          </div>
                        </div>
                        <span v-else>{{ formatCurrency(order.price, displayComponent.pricing?.defaultCurrency || currencyStore.defaultCurrency) }}</span>
                      </td>
                      <td class="text-center text-caption font-mono">{{ order.qty }}</td>
                      <td class="text-right text-caption font-mono font-weight-medium">
                        <div>{{ formatCurrency(order.totalCost, displayComponent.pricing?.defaultCurrency || currencyStore.defaultCurrency) }}</div>
                        <div v-if="order.currency && order.currency !== (displayComponent.pricing?.defaultCurrency || currencyStore.defaultCurrency)" class="text-caption text-slate-500 font-mono font-weight-regular">
                          {{ formatCurrency(order.originalTotalCost, order.currency) }}
                        </div>
                      </td>
                      <td class="text-caption text-truncate" style="max-width: 180px;" :title="order.details">
                        {{ order.details || '—' }}
                      </td>
                      <td class="text-center">
                        <v-btn
                          v-if="order.url"
                          :href="order.url"
                          target="_blank"
                          icon="mdi-open-in-new"
                          size="x-small"
                          variant="text"
                          color="primary"
                          :title="t('dialogs.openSupplierLink')"
                        />
                        <span v-else class="text-disabled text-caption">—</span>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </div>

            <div v-else class="text-caption text-disabled italic py-4 px-4 text-center border border-dashed rounded-lg bg-slate-50 mb-2">
              <div class="d-flex align-center justify-space-between flex-wrap gap-2">
                <div class="d-flex align-center gap-2 text-left">
                  <v-icon size="24" class="text-disabled">mdi-cash-remove</v-icon>
                  <div>
                    <div class="text-body-2 font-weight-medium text-slate-700" style="font-style: normal;">{{ t('componentDetailsModal.noOrdersFound') }}</div>
                    <div class="text-caption text-disabled" style="font-style: normal;">
                      {{ t('componentDetailsModal.noOrdersHint') }}
                    </div>
                  </div>
                </div>
                <v-btn
                  color="primary"
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-cash-plus"
                  class="font-weight-bold"
                  @click="openPurchaseDialog"
                >
                  {{ t('componentDetailsModal.btnBuyRecord') }}
                </v-btn>
              </div>
            </div>

            <v-divider class="my-4" />

            <!-- WHERE TO BUY / SUPPLIER LINKS SECTION -->
            <div>
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="text-subtitle-2 font-weight-bold text-slate-800 d-flex align-center gap-1">
                  <v-icon size="18" color="primary">mdi-store-outline</v-icon>
                  <span>{{ t('componentDetailsModal.supplierLinksTitle') }}</span>
                  <v-chip
                    v-if="supplierLinks.length > 0"
                    size="x-small"
                    color="primary"
                    variant="tonal"
                    class="font-mono font-weight-bold ms-1"
                  >
                    {{ supplierLinks.length }}
                  </v-chip>
                </div>
                <v-btn
                  v-if="!showLinkForm"
                  color="primary"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-plus"
                  class="font-weight-bold"
                  @click="openAddLinkForm"
                >
                  {{ t('componentDetailsModal.addSupplierLink') }}
                </v-btn>
              </div>

              <!-- Add / Edit Supplier Link Inline Form -->
              <div v-if="showLinkForm" class="border rounded-lg bg-slate-50 pa-3 mb-3">
                <div class="text-caption font-weight-bold text-uppercase text-slate-700 mb-2 d-flex align-center gap-1">
                  <v-icon size="15" color="primary">{{ editingLinkId ? 'mdi-pencil-outline' : 'mdi-plus-circle-outline' }}</v-icon>
                  <span>{{ editingLinkId ? t('componentDetailsModal.editSupplierLink') : t('componentDetailsModal.addSupplierLink') }}</span>
                </div>
                <v-row dense>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="linkForm.supplier"
                      :label="t('componentDetailsModal.supplierName') + ' *'"
                      :placeholder="t('componentDetailsModal.supplierNamePlaceholder')"
                      density="compact"
                      variant="outlined"
                      bg-color="white"
                      hide-details
                      prepend-inner-icon="mdi-store-outline"
                    />
                  </v-col>
                  <v-col cols="6" sm="2">
                    <v-text-field
                      v-model.number="linkForm.price"
                      type="number"
                      min="0"
                      step="0.0001"
                      :label="t('componentDetailsModal.supplierPrice')"
                      :prefix="currencyStore.getSymbol(linkForm.currency)"
                      density="compact"
                      variant="outlined"
                      bg-color="white"
                      hide-details
                      class="font-mono"
                    />
                  </v-col>
                  <v-col cols="6" sm="2">
                    <v-select
                      v-model="linkForm.currency"
                      :items="currencyStore.currencyOptions"
                      item-title="code"
                      item-value="code"
                      :label="t('componentDetailsModal.supplierCurrency')"
                      density="compact"
                      variant="outlined"
                      bg-color="white"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="linkForm.url"
                      :label="t('componentDetailsModal.supplierUrl')"
                      :placeholder="t('componentDetailsModal.supplierUrlPlaceholder')"
                      density="compact"
                      variant="outlined"
                      bg-color="white"
                      hide-details
                      prepend-inner-icon="mdi-link-variant"
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" class="mt-1">
                    <v-text-field
                      v-model="linkForm.comment"
                      :label="t('componentDetailsModal.supplierComment')"
                      :placeholder="t('componentDetailsModal.supplierCommentPlaceholder')"
                      density="compact"
                      variant="outlined"
                      bg-color="white"
                      hide-details
                      prepend-inner-icon="mdi-comment-text-outline"
                      clearable
                      @keyup.enter="saveSupplierLink"
                    />
                  </v-col>
                </v-row>
                <div class="d-flex justify-end gap-2 mt-3">
                  <v-btn
                    size="small"
                    variant="text"
                    color="slate-600"
                    :disabled="savingLink"
                    @click="cancelLinkForm"
                  >
                    {{ t('common.cancel') }}
                  </v-btn>
                  <v-btn
                    size="small"
                    color="primary"
                    variant="flat"
                    prepend-icon="mdi-content-save-outline"
                    class="font-weight-bold"
                    :disabled="!linkForm.supplier || !linkForm.supplier.trim()"
                    :loading="savingLink"
                    @click="saveSupplierLink"
                  >
                    {{ t('common.save') }}
                  </v-btn>
                </div>
              </div>

              <!-- Saved Supplier Links Table -->
              <div v-if="supplierLinks.length > 0" class="border rounded-lg overflow-hidden">
                <v-table density="compact" class="bg-white">
                  <thead>
                    <tr class="bg-slate-50 text-caption font-weight-bold">
                      <th class="text-left py-2 font-weight-bold">{{ t('componentDetailsModal.colSupplier') }}</th>
                      <th class="text-right py-2 font-weight-bold" style="width: 140px;">{{ t('componentDetailsModal.colUnitPrice') }}</th>
                      <th class="text-left py-2 font-weight-bold">{{ t('componentDetailsModal.colComment') }}</th>
                      <th class="text-center py-2 font-weight-bold" style="width: 60px;">{{ t('componentDetailsModal.colLink') }}</th>
                      <th class="text-right py-2 font-weight-bold" style="width: 110px;">{{ t('common.actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="link in supplierLinks" :key="link.id">
                      <td class="py-2">
                        <div class="d-flex align-center gap-1.5 font-weight-bold text-body-2 text-slate-800">
                          <v-icon size="15" color="primary">mdi-store-outline</v-icon>
                          <span>{{ link.supplier }}</span>
                        </div>
                      </td>
                      <td class="text-right py-2 font-mono text-caption font-weight-bold text-primary">
                        <template v-if="link.price > 0">
                          <div v-if="link.currency && link.currency !== (displayComponent.pricing?.defaultCurrency || currencyStore.defaultCurrency)">
                            <div>{{ formatCurrency(link.price, link.currency) }}</div>
                            <div class="text-caption text-slate-500 font-mono font-weight-regular">
                              ≈ {{ formatCurrency(link.convertedPrice, displayComponent.pricing?.defaultCurrency || currencyStore.defaultCurrency) }}
                            </div>
                          </div>
                          <span v-else>{{ formatCurrency(link.price, link.currency || currencyStore.defaultCurrency) }}</span>
                        </template>
                        <span v-else class="text-disabled">—</span>
                      </td>
                      <td class="py-2 text-caption text-slate-700" style="max-width: 260px;">
                        {{ link.comment || '—' }}
                      </td>
                      <td class="text-center py-2">
                        <v-btn
                          v-if="link.url"
                          :href="link.url"
                          target="_blank"
                          icon="mdi-open-in-new"
                          size="x-small"
                          variant="text"
                          color="primary"
                          :title="link.url"
                        />
                        <span v-else class="text-disabled text-caption">—</span>
                      </td>
                      <td class="text-right py-2">
                        <div class="d-inline-flex align-center gap-0.5">
                          <v-btn
                            icon="mdi-cash-plus"
                            size="x-small"
                            variant="text"
                            color="primary"
                            :title="t('componentDetailsModal.buyFromSupplierTooltip')"
                            @click="buyFromSupplierLink(link)"
                          />
                          <v-btn
                            icon="mdi-pencil-outline"
                            size="x-small"
                            variant="text"
                            color="slate-700"
                            :title="t('common.edit')"
                            @click="openEditLinkForm(link)"
                          />
                          <v-btn
                            icon="mdi-delete-outline"
                            size="x-small"
                            variant="text"
                            color="error"
                            :loading="deletingLinkId === link.id"
                            :title="t('common.delete')"
                            @click="removeSupplierLink(link)"
                          />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <div v-else-if="!showLinkForm" class="border border-dashed rounded-lg bg-slate-50 pa-4 text-center">
                <v-icon size="32" class="text-disabled mb-1">mdi-link-variant-plus</v-icon>
                <div class="text-body-2 font-weight-medium text-slate-700">{{ t('componentDetailsModal.noSupplierLinks') }}</div>
                <div class="text-caption text-disabled mt-0.5">{{ t('componentDetailsModal.noSupplierLinksHint') }}</div>
              </div>
            </div>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex align-center justify-space-between flex-wrap gap-2 flex-shrink-0">
        <div class="d-flex align-center flex-wrap gap-1">
          <!-- Datasheet Link -->
          <v-btn
            v-if="displayComponent.datasheetURL"
            color="red-darken-1"
            variant="tonal"
            size="small"
            prepend-icon="mdi-file-pdf-box"
            class="font-weight-medium me-1"
            :href="getDatasheetUrl(displayComponent.datasheetURL)"
            target="_blank"
          >
            {{ t('componentDetailsModal.openDatasheet') }}
          </v-btn>

          <!-- Edit Component Button -->
          <v-btn
            color="slate-700"
            variant="text"
            size="small"
            prepend-icon="mdi-pencil-outline"
            class="font-weight-medium"
            @click="openEditDialog"
          >
            {{ t('common.edit') }}
          </v-btn>

          <!-- Clone Component Button -->
          <v-btn
            color="slate-700"
            variant="text"
            size="small"
            prepend-icon="mdi-content-copy"
            class="font-weight-medium"
            @click="openCloneDialog"
          >
            {{ t('componentDetailsModal.clone') }}
          </v-btn>

          <!-- Delete Component Button -->
          <v-btn
            color="error"
            variant="text"
            size="small"
            prepend-icon="mdi-delete-outline"
            class="font-weight-medium"
            @click="showDeleteDialog = true"
          >
            {{ t('common.delete') }}
          </v-btn>
        </div>

        <div class="d-flex align-center flex-wrap gap-2 ms-auto">
          <!-- Add to Shopping List -->
          <v-btn
            color="amber-darken-3"
            variant="tonal"
            size="small"
            prepend-icon="mdi-cart-plus"
            class="font-weight-medium"
            :loading="addingToShoppingList"
            @click="addToShoppingList"
          >
            {{ t('components.quickAddToBasket') }}
          </v-btn>

          <!-- Export Component -->
          <v-btn
            color="primary"
            variant="outlined"
            size="small"
            prepend-icon="mdi-export"
            class="font-weight-medium"
            :loading="exporting"
            @click="exportThisComponent"
            :title="t('components.exportComponents')"
          >
            {{ t('components.exportComponents') }}
          </v-btn>

          <!-- Buy Component -->
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="mdi-cash-check"
            class="font-weight-bold"
            @click="openPurchaseDialog"
          >
            {{ t('components.buyComponent') }}
          </v-btn>

          <!-- Optional Select Button (e.g. inside AddComponentDialog) -->
          <v-btn
            v-if="showSelectButton"
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="mdi-check"
            class="font-weight-bold"
            @click="selectAndClose"
          >
            {{ selectButtonText || t('componentDetailsModal.selectComponent') }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>

    <!-- EDIT / CLONE COMPONENT DIALOG -->
    <CreateComponentDialog
      v-model="showEditDialog"
      :is-edit="isEditMode"
      :is-clone="isCloneMode"
      :component="displayComponent"
      :categories="categoriesList"
      :packages="packagesList"
      @created="handleComponentCreated"
      @updated="handleComponentUpdated"
    />

    <!-- PURCHASE CONFIRMATION DIALOG -->
    <PurchaseConfirmDialog
      v-model="showPurchaseDialog"
      :item="purchaseDialogItem"
      @purchased="handlePurchased"
      @notify="notify"
    />

    <!-- CONFIRM DELIVERY DIALOG -->
    <ConfirmDeliveryDialog
      v-model="showDeliveryDialog"
      :item="deliveryDialogItem"
      @delivered="handleDelivered"
      @notify="notify"
    />

    <!-- CANCEL ORDER DIALOG -->
    <CancelOrderDialog
      v-model="showCancelDialog"
      :item="cancelDialogItem"
      @cancelled="handleCancelled"
      @notify="notify"
    />

    <!-- DELETE COMPONENT DIALOG (WITH PROJECT USAGE WARNING) -->
    <DeleteComponentDialog
      v-model="showDeleteDialog"
      :component="displayComponent"
      @deleted="onDeleted"
    />

    <!-- MEDIA LIGHTBOX FOR FULL SIZE COMPONENT PHOTO -->
    <MediaLightboxDialog
      v-model="showPhotoLightbox"
      type="component"
      :src="displayComponent.photoURL"
      :title="displayComponent.component"
    />

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import api, { resolveMediaUrl } from '../services/api';

const { t } = useI18n();
import MediaImage from './MediaImage.vue';
import MediaLightboxDialog from './MediaLightboxDialog.vue';
import PackageLink from './PackageLink.vue';
import PurchaseConfirmDialog from './PurchaseConfirmDialog.vue';
import ConfirmDeliveryDialog from './ConfirmDeliveryDialog.vue';
import CancelOrderDialog from './CancelOrderDialog.vue';
import DeleteComponentDialog from './DeleteComponentDialog.vue';
import CreateComponentDialog from './CreateComponentDialog.vue';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useCurrencyStore } from '../stores/currency';

const router = useRouter();
const currencyStore = useCurrencyStore();
const showPhotoLightbox = ref(false);
const showEditDialog = ref(false);
const isEditMode = ref(true);
const isCloneMode = ref(false);
const categoriesList = ref([]);
const packagesList = ref([]);

const ensureMetaLoaded = async () => {
  if (categoriesList.value.length === 0) {
    try {
      categoriesList.value = await api.getCategories();
    } catch (e) {
      console.warn('Failed to load categories for edit dialog', e);
    }
  }
  if (packagesList.value.length === 0) {
    try {
      packagesList.value = await api.getPackages();
    } catch (e) {
      console.warn('Failed to load packages for edit dialog', e);
    }
  }
};

const openEditDialog = async () => {
  await ensureMetaLoaded();
  isEditMode.value = true;
  isCloneMode.value = false;
  showEditDialog.value = true;
};

const openCloneDialog = async () => {
  await ensureMetaLoaded();
  isEditMode.value = false;
  isCloneMode.value = true;
  showEditDialog.value = true;
};

const handleComponentCreated = async (newComp) => {
  notify(t('componentDetailsModal.createdSuccess', { name: newComp.component }));
  emit('created', newComp);
  emit('updated', newComp);
};

const handleComponentUpdated = async (updatedComp) => {
  notify(t('componentDetailsModal.updatedSuccess', { name: updatedComp.component }));
  await loadFullDetails();
  emit('updated', updatedComp);
};

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  component: {
    type: Object,
    default: null
  },
  componentId: {
    type: [Number, String],
    default: null
  },
  showSelectButton: {
    type: Boolean,
    default: false
  },
  selectButtonText: {
    type: String,
    default: 'Select Component'
  }
});

const emit = defineEmits(['update:modelValue', 'select', 'add-to-shopping-list', 'purchased', 'deleted', 'updated', 'created']);

const activeTab = ref('overview');
const detailedComponent = ref(null);
const loading = ref(false);
const addingToShoppingList = ref(false);
const showPurchaseDialog = ref(false);
const showDeleteDialog = ref(false);

const onDeleted = (payload) => {
  emit('deleted', payload);
  emit('update:modelValue', false);
};
const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

// Merges incoming component prop with asynchronously fetched full details (warehouse allocations, projects, etc.)
const displayComponent = computed(() => {
  if (detailedComponent.value) {
    return detailedComponent.value;
  }
  return props.component || null;
});

const hasAnyPendingPurchases = computed(() => {
  return displayComponent.value?.pricing?.orders?.some(o => o.status === 'pending') ?? false;
});

const projectList = computed(() => {
  return detailedComponent.value?.projects || [];
});

const supplierLinks = computed(() => {
  return detailedComponent.value?.supplierLinks || [];
});

// Supplier Links Form State & Handlers
const showLinkForm = ref(false);
const editingLinkId = ref(null);
const savingLink = ref(false);
const deletingLinkId = ref(null);
const prefillSupplierLink = ref(null);

const linkForm = ref({
  supplier: '',
  price: 0,
  currency: currencyStore.defaultCurrency,
  url: '',
  comment: ''
});

const openAddLinkForm = () => {
  editingLinkId.value = null;
  linkForm.value = {
    supplier: '',
    price: 0,
    currency: displayComponent.value?.pricing?.defaultCurrency || currencyStore.defaultCurrency,
    url: '',
    comment: ''
  };
  showLinkForm.value = true;
};

const openEditLinkForm = (link) => {
  editingLinkId.value = link.id;
  linkForm.value = {
    supplier: link.supplier || '',
    price: link.price != null ? Number(link.price) : 0,
    currency: link.currency || currencyStore.defaultCurrency,
    url: link.url || '',
    comment: link.comment || ''
  };
  showLinkForm.value = true;
};

const cancelLinkForm = () => {
  showLinkForm.value = false;
  editingLinkId.value = null;
};

const saveSupplierLink = async () => {
  const compId = displayComponent.value?.ID || displayComponent.value?.id;
  if (!compId || !linkForm.value.supplier || !linkForm.value.supplier.trim()) return;

  savingLink.value = true;
  try {
    const payload = {
      supplier: linkForm.value.supplier.trim(),
      price: parseFloat(linkForm.value.price) || 0,
      currency: linkForm.value.currency || currencyStore.defaultCurrency,
      url: linkForm.value.url ? linkForm.value.url.trim() : '',
      comment: linkForm.value.comment ? linkForm.value.comment.trim() : ''
    };

    if (editingLinkId.value) {
      await api.updateComponentLink(compId, editingLinkId.value, payload);
      notify(t('componentDetailsModal.supplierLinkUpdated'));
    } else {
      await api.addComponentLink(compId, payload);
      notify(t('componentDetailsModal.supplierLinkAdded'));
    }

    showLinkForm.value = false;
    editingLinkId.value = null;
    await loadFullDetails();
  } catch (err) {
    console.error('Failed to save supplier link:', err);
    notify(t('componentDetailsModal.supplierLinkError', { error: err.response?.data?.error || err.message }), 'error');
  } finally {
    savingLink.value = false;
  }
};

const removeSupplierLink = async (link) => {
  const compId = displayComponent.value?.ID || displayComponent.value?.id;
  if (!compId || !link?.id) return;

  deletingLinkId.value = link.id;
  try {
    await api.deleteComponentLink(compId, link.id);
    notify(t('componentDetailsModal.supplierLinkDeleted'));
    await loadFullDetails();
  } catch (err) {
    console.error('Failed to delete supplier link:', err);
    notify(t('componentDetailsModal.supplierLinkError', { error: err.response?.data?.error || err.message }), 'error');
  } finally {
    deletingLinkId.value = null;
  }
};

const buyFromSupplierLink = (link) => {
  prefillSupplierLink.value = link;
  showPurchaseDialog.value = true;
};

const getDatasheetUrl = (url) => {
  return resolveMediaUrl('datasheet', url);
};

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

const close = () => {
  emit('update:modelValue', false);
};

const openProject = (projectId) => {
  close();
  router.push(`/projects/${projectId}`);
};

const selectAndClose = () => {
  if (displayComponent.value) {
    emit('select', displayComponent.value);
  }
  close();
};

const saveStockQty = async (newVal) => {
  const compId = displayComponent.value?.ID || displayComponent.value?.id;
  if (!compId) return;
  const parsed = parseInt(newVal, 10);
  if (isNaN(parsed) || parsed < 0) return;
  try {
    await api.updateComponentQty(compId, parsed);
    if (detailedComponent.value) {
      detailedComponent.value.qty = parsed;
    }
    if (props.component) {
      props.component.qty = parsed;
    }
    notify(t('componentDetailsModal.updatedStockSuccess', { qty: parsed }));
  } catch (err) {
    notify(t('componentDetailsModal.failedStockUpdate', { error: err.message }), 'error');
  }
};

const saveMinQty = async (newVal) => {
  const compId = displayComponent.value?.ID || displayComponent.value?.id;
  if (!compId) return;
  const parsed = parseInt(newVal, 10);
  if (isNaN(parsed) || parsed < 0) return;
  try {
    await api.updateComponentMinQty(compId, parsed);
    if (detailedComponent.value) {
      detailedComponent.value.minQty = parsed;
    }
    if (props.component) {
      props.component.minQty = parsed;
    }
    notify(t('componentDetailsModal.updatedMinQtySuccess', { qty: parsed }));
  } catch (err) {
    notify(t('componentDetailsModal.failedMinQtyUpdate', { error: err.message }), 'error');
  }
};

const addToShoppingList = async () => {
  if (!displayComponent.value?.ID) return;
  addingToShoppingList.value = true;
  try {
    await api.addToShoppingList({ componentId: displayComponent.value.ID, qty: 5 });
    notify(t('componentDetailsModal.addedToShoppingList', { qty: 5, name: displayComponent.value.component }));
    emit('add-to-shopping-list', displayComponent.value);
  } catch (err) {
    console.error('Failed to add to shopping list:', err);
    notify(t('componentDetailsModal.failedShoppingList', { error: (err.response?.data?.error || err.message) }), 'error');
  } finally {
    addingToShoppingList.value = false;
  }
};

const exporting = ref(false);

const exportThisComponent = async () => {
  if (!displayComponent.value?.ID) return;
  exporting.value = true;
  try {
    const comp = displayComponent.value;
    const res = await api.exportComponents([comp.ID]);
    const blob = new Blob([res.data], { type: 'application/zip' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    const safeTitle = (comp.component || 'component').replace(/[^a-zA-Z0-9._-]/g, '_');
    link.download = `${safeTitle}_export_${dateStr}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    notify(t('components.exportSuccess'));
  } catch (err) {
    console.error('Failed to export component:', err);
    notify(t('components.exportError') + ': ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    exporting.value = false;
  }
};

const loadFullDetails = async () => {
  const compId = props.component?.ID || props.component?.id || props.componentId;
  if (!compId) return;

  loading.value = true;
  try {
    const data = await api.getComponent(compId);
    detailedComponent.value = data;
  } catch (err) {
    console.warn('Failed to load full component details:', err);
  } finally {
    loading.value = false;
  }
};

const purchaseDialogItem = computed(() => {
  if (!displayComponent.value) return null;
  const c = displayComponent.value;
  if (prefillSupplierLink.value) {
    const l = prefillSupplierLink.value;
    const detailsStr = [l.supplier, l.comment].filter(Boolean).join(' — ');
    return {
      isComponentDirect: true,
      prefillFromSupplierLink: true,
      prefillSupplierLinkId: l.id,
      componentId: c.ID || c.id,
      component: c.component,
      marking: c.marking,
      category: c.category,
      package: c.package,
      photoURL: c.photoURL,
      directQty: 1,
      qty: 1,
      stockQuantity: c.qty ?? 0,
      activeOrderCurrency: l.currency || currencyStore.defaultCurrency,
      latestPrice: l.price != null ? Number(l.price) : 0,
      latestOrderDetails: detailsStr,
      latestOrderUrl: l.url || ''
    };
  }
  return {
    isComponentDirect: true,
    componentId: c.ID || c.id,
    component: c.component,
    marking: c.marking,
    category: c.category,
    package: c.package,
    photoURL: c.photoURL,
    directQty: 1,
    qty: 1,
    stockQuantity: c.qty ?? 0,
    latestPrice: c.pricing?.latestPrice != null ? c.pricing.latestPrice : (c.latestPrice ?? 0),
    latestOrderDetails: c.pricing?.latestOrderDetails || '',
    latestOrderUrl: c.pricing?.latestOrderUrl || ''
  };
});

const openPurchaseDialog = () => {
  prefillSupplierLink.value = null;
  showPurchaseDialog.value = true;
};

const showDeliveryDialog = ref(false);
const deliveryDialogItem = ref(null);

const showCancelDialog = ref(false);
const cancelDialogItem = ref(null);

const openDeliveryForOrder = (order) => {
  deliveryDialogItem.value = {
    ...order,
    isComponentOrder: true,
    component: displayComponent.value?.component,
    componentName: displayComponent.value?.component,
    marking: displayComponent.value?.marking,
    category: displayComponent.value?.category,
    package: displayComponent.value?.package,
    photoURL: displayComponent.value?.photoURL,
    currentStock: displayComponent.value?.qty ?? 0
  };
  showDeliveryDialog.value = true;
};

const openCancelOrderForOrder = (order) => {
  cancelDialogItem.value = {
    ...order,
    isComponentOrder: true,
    component: displayComponent.value?.component,
    componentName: displayComponent.value?.component,
    marking: displayComponent.value?.marking,
    category: displayComponent.value?.category,
    package: displayComponent.value?.package,
    photoURL: displayComponent.value?.photoURL,
    currentStock: displayComponent.value?.qty ?? 0
  };
  showCancelDialog.value = true;
};

const handleCancelled = async () => {
  await loadFullDetails();
  emit('updated', detailedComponent.value);
};

const handleDelivered = async (res) => {
  if (res?.newStock != null) {
    if (detailedComponent.value) {
      detailedComponent.value.qty = res.newStock;
    }
    if (props.component) {
      props.component.qty = res.newStock;
    }
  }
  await loadFullDetails();
  emit('updated', detailedComponent.value);
};

const handlePurchased = async (res) => {
  if (res.status === 'delivered') {
    notify(t('componentDetailsModal.orderSuccess', { orderId: res.orderId, qty: res.qty, newStock: res.newStock }), 'success');
  }
  if (detailedComponent.value && res.newStock != null) {
    detailedComponent.value.qty = res.newStock;
  }
  if (props.component && res.newStock != null) {
    props.component.qty = res.newStock;
  }
  await loadFullDetails();
  emit('purchased', res);
  emit('updated', detailedComponent.value);
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    activeTab.value = 'overview';
    detailedComponent.value = null;
    showLinkForm.value = false;
    editingLinkId.value = null;
    prefillSupplierLink.value = null;
    loadFullDetails();
  } else {
    detailedComponent.value = null;
    showLinkForm.value = false;
    editingLinkId.value = null;
    prefillSupplierLink.value = null;
  }
});

watch(() => props.component, () => {
  if (props.modelValue) {
    loadFullDetails();
  }
});
</script>

<style scoped>
.bg-slate-50 {
  background-color: #f8fafc !important;
}
.border-b {
  border-bottom: 1px solid #e2e8f0 !important;
}
.hover-underline:hover {
  text-decoration: underline;
}
.photo-zoom-wrapper {
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
.photo-zoom-wrapper:hover .photo-overlay {
  opacity: 1;
}
</style>
