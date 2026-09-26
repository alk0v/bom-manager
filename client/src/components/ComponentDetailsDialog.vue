<template>
  <v-dialog
    :model-value="modelValue"
    max-width="850"
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
            v-if="displayComponent.pricing?.orderCount > 0"
            :content="displayComponent.pricing.orderCount"
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

            <div v-else class="text-caption text-disabled italic py-8 text-center">
              <v-icon size="44" class="mb-2 text-disabled">mdi-cash-remove</v-icon>
              <div class="text-body-2 font-weight-medium text-slate-700">{{ t('componentDetailsModal.noOrdersFound') }}</div>
              <div class="text-caption text-disabled mt-1 mb-3">
                {{ t('componentDetailsModal.noOrdersHint') }}
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
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions class="pa-3 px-4 bg-slate-50 d-flex align-center flex-shrink-0">
        <!-- Datasheet Link -->
        <v-btn
          v-if="displayComponent.datasheetURL"
          color="red-darken-1"
          variant="tonal"
          size="small"
          prepend-icon="mdi-file-pdf-box"
          class="font-weight-medium me-2"
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
          class="font-weight-medium me-1"
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
          class="font-weight-medium me-1"
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

        <v-spacer />

        <!-- Add to Shopping List -->
        <v-btn
          color="amber-darken-3"
          variant="tonal"
          size="small"
          prepend-icon="mdi-cart-plus"
          class="font-weight-medium me-2"
          :loading="addingToShoppingList"
          @click="addToShoppingList"
        >
          {{ t('components.quickAddToBasket') }}
        </v-btn>

        <!-- Buy Component -->
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          prepend-icon="mdi-cash-check"
          class="font-weight-bold me-2"
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

const router = useRouter();
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
    loadFullDetails();
  } else {
    detailedComponent.value = null;
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
