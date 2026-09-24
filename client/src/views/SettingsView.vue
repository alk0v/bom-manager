<template>
  <div class="settings-view">

    <!-- Top KPI Cards -->
    <v-row dense class="mb-6">
      <!-- Database Engine Card -->
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="1" class="rounded-0 border bg-white pa-4 h-100 d-flex align-center">
          <v-avatar
            :color="databaseInfo.engine === 'sqlite' ? 'indigo-darken-1' : 'teal-darken-2'"
            variant="tonal"
            rounded="lg"
            size="48"
            class="me-4 flex-shrink-0"
          >
            <v-icon size="26">
              {{ databaseInfo.engine === 'sqlite' ? 'mdi-database-outline' : 'mdi-database' }}
            </v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">Database Engine</div>
            <div class="text-h6 font-weight-bold text-slate-900 text-truncate">
              {{ databaseInfo.engine === 'sqlite' ? 'SQLite 3' : 'MySQL / MariaDB' }}
            </div>
            <div class="text-caption text-success font-weight-medium d-flex align-center">
              <v-icon size="12" color="success" class="me-1">mdi-checkbox-marked-circle</v-icon>
              Connected & Active
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Total Components -->
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="1" class="rounded-0 border bg-white pa-4 h-100 d-flex align-center">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="48" class="me-4 flex-shrink-0">
            <v-icon size="26" color="primary">mdi-memory</v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">Components Catalog</div>
            <div class="text-h6 font-weight-bold text-slate-900 font-mono">
              {{ databaseInfo.counts?.components || 0 }} parts
            </div>
            <div class="text-caption text-slate-500 font-weight-medium">
              across {{ databaseInfo.counts?.storages || 0 }} storage {{ databaseInfo.counts?.storages === 1 ? 'bin' : 'bins' }}
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Total Projects -->
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="1" class="rounded-0 border bg-white pa-4 h-100 d-flex align-center">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="48" class="me-4 flex-shrink-0">
            <v-icon size="26" color="primary">mdi-folder-cog-outline</v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">Hardware Projects</div>
            <div class="text-h6 font-weight-bold text-slate-900 font-mono">
              {{ databaseInfo.counts?.projects || 0 }} projects
            </div>
            <div class="text-caption text-slate-500 font-weight-medium">
              with {{ databaseInfo.counts?.bomItems || 0 }} BOM items
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- System Latency & Health -->
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="1" class="rounded-0 border bg-white pa-4 h-100 d-flex align-center">
          <v-avatar color="success" variant="tonal" rounded="lg" size="48" class="me-4 flex-shrink-0">
            <v-icon size="26" color="success">mdi-speedometer</v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-slate-500 font-weight-bold text-uppercase">DB Latency / Health</div>
            <div class="text-h6 font-weight-bold text-slate-900 font-mono">
              {{ latencyMs !== null ? `${latencyMs} ms` : 'Healthy' }}
            </div>
            <div class="text-caption text-slate-500 font-weight-medium">
              Uptime: {{ formatUptime(appInfo.uptimeSeconds) }}
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Main Navigation Tabs -->
    <v-card elevation="1" class="rounded-0 border bg-white mb-6">
      <div class="d-flex align-center justify-space-between border-b flex-wrap">
        <v-tabs v-model="activeTab" color="primary">
          <v-tab value="general" class="text-none font-weight-bold">
            <v-icon start size="18">mdi-translate</v-icon>
            {{ t('settings.tabGeneral') }}
          </v-tab>
          <v-tab value="currencies" class="text-none font-weight-bold">
            <v-icon start size="18">mdi-currency-usd</v-icon>
            {{ t('settings.tabCurrencies') }}
          </v-tab>
          <v-tab value="database" class="text-none font-weight-bold">
            <v-icon start size="18">mdi-database-cog-outline</v-icon>
            {{ t('settings.tabDatabase') }}
          </v-tab>
          <v-tab value="media" class="text-none font-weight-bold">
            <v-icon start size="18">mdi-folder-image</v-icon>
            {{ t('settings.tabStorage') }}
          </v-tab>
          <v-tab value="about" class="text-none font-weight-bold">
            <v-icon start size="18">mdi-information-outline</v-icon>
            {{ t('settings.tabAbout') }}
          </v-tab>
        </v-tabs>

        <div class="d-flex align-center gap-2 px-4 py-2">
          <v-btn
            variant="outlined"
            color="primary"
            size="small"
            prepend-icon="mdi-refresh"
            :loading="loading"
            @click="loadSettings"
          >
            {{ t('common.refresh') }}
          </v-btn>
          <v-btn
            variant="flat"
            color="primary"
            size="small"
            prepend-icon="mdi-heart-pulse"
            :loading="diagnosticsLoading"
            @click="runDiagnostics"
          >
            {{ t('settings.testLatency') }}
          </v-btn>
        </div>
      </div>

      <v-window v-model="activeTab">
        <!-- TAB 0: GENERAL & LANGUAGE -->
        <v-window-item value="general" class="pa-6">
          <v-row>
            <v-col cols="12" md="7">
              <v-card variant="outlined" class="rounded-0 border bg-white mb-6">
                <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 pa-4 border-b bg-slate-50 d-flex align-center">
                  <v-icon color="primary" class="me-2">mdi-translate</v-icon>
                  {{ t('settings.languageTitle') }}
                </v-card-title>
                <v-card-text class="pa-5">
                  <p class="text-body-2 text-slate-600 mb-4">
                    {{ t('settings.languageDescription') }}
                  </p>
                  
                  <v-radio-group
                    v-model="selectedLanguage"
                    @update:model-value="onLanguageChange"
                    hide-details
                  >
                    <v-card
                      variant="outlined"
                      class="rounded-0 border pa-3 mb-3 cursor-pointer"
                      :class="{ 'border-primary bg-blue-50': selectedLanguage === 'en' }"
                      @click="onLanguageChange('en')"
                    >
                      <div class="d-flex align-center">
                        <v-radio value="en" color="primary" class="me-3" />
                        <span class="text-h6 me-3">🇬🇧</span>
                        <div>
                          <div class="font-weight-bold text-slate-900">English</div>
                          <div class="text-caption text-slate-500">English (Default)</div>
                        </div>
                      </div>
                    </v-card>

                    <v-card
                      variant="outlined"
                      class="rounded-0 border pa-3 cursor-pointer"
                      :class="{ 'border-primary bg-blue-50': selectedLanguage === 'uk' }"
                      @click="onLanguageChange('uk')"
                    >
                      <div class="d-flex align-center">
                        <v-radio value="uk" color="primary" class="me-3" />
                        <span class="text-h6 me-3">🇺🇦</span>
                        <div>
                          <div class="font-weight-bold text-slate-900">Українська</div>
                          <div class="text-caption text-slate-500">Ukrainian Translation</div>
                        </div>
                      </div>
                    </v-card>
                  </v-radio-group>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="5">
              <v-card variant="outlined" class="rounded-0 border bg-slate-50">
                <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 pa-4 border-b bg-white">
                  <v-icon color="primary" class="me-2">mdi-information-outline</v-icon>
                  {{ t('common.info') }}
                </v-card-title>
                <v-card-text class="pa-4 text-body-2 text-slate-600">
                  <p class="mb-3">
                    <strong>Version:</strong> v0.3.0
                  </p>
                  <p class="mb-3">
                    Translations are stored as modular JSON files in <code>client/src/locales/</code> and synchronized with Vuetify 3 components.
                  </p>
                  <p class="mb-0">
                    Language preferences are automatically saved in local browser storage and loaded whenever you revisit BOM Manager.
                  </p>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- TAB 1: CURRENCIES & EXCHANGE RATES -->
        <v-window-item value="currencies" class="pa-6">
          <v-row>
            <!-- Default Currency Selection -->
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="rounded-0 border bg-white mb-6 h-100 d-flex flex-column">
                <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 pa-4 border-b bg-slate-50 d-flex align-center justify-space-between">
                  <span class="d-flex align-center">
                    <v-icon color="primary" class="me-2">mdi-star-circle-outline</v-icon>
                    {{ t('settings.defaultCurrencyTitle') }}
                  </span>
                  <v-chip size="small" color="primary" variant="flat" class="font-weight-bold font-mono">
                    {{ selectedDefaultCurrency }} ({{ CURRENCY_SYMBOLS[selectedDefaultCurrency] || '$' }})
                  </v-chip>
                </v-card-title>
                <v-card-text class="pa-5 flex-grow-1">
                  <p class="text-body-2 text-slate-600 mb-4">
                    {{ t('settings.defaultCurrencyDescription') }}
                  </p>

                  <v-radio-group
                    v-model="selectedDefaultCurrency"
                    class="mt-1"
                    @update:model-value="onDefaultCurrencyChange"
                  >
                    <v-card
                      v-for="curr in supportedCurrenciesList"
                      :key="curr.code"
                      variant="outlined"
                      class="mb-3 pa-3 transition-swing cursor-pointer rounded-0 border"
                      :class="{ 'border-primary bg-indigo-50/30': selectedDefaultCurrency === curr.code }"
                      @click="onDefaultCurrencyChange(curr.code)"
                    >
                      <div class="d-flex align-center justify-space-between">
                        <div class="d-flex align-center">
                          <v-radio :value="curr.code" color="primary" class="me-2" />
                          <div>
                            <div class="d-flex align-center gap-2">
                              <span class="font-weight-bold text-slate-900">{{ curr.name }}</span>
                              <v-chip size="x-small" variant="tonal" color="primary" class="font-mono font-weight-bold">
                                {{ curr.code }}
                              </v-chip>
                            </div>
                            <div class="text-caption text-slate-500">
                              Symbol: <strong class="font-mono">{{ curr.symbol }}</strong>
                            </div>
                          </div>
                        </div>
                        <v-chip
                          v-if="selectedDefaultCurrency === curr.code"
                          size="x-small"
                          color="primary"
                          variant="flat"
                          class="font-weight-bold"
                        >
                          ACTIVE DEFAULT
                        </v-chip>
                      </div>
                    </v-card>
                  </v-radio-group>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Secondary Currencies Selection -->
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="rounded-0 border bg-white mb-6 h-100 d-flex flex-column">
                <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 pa-4 border-b bg-slate-50 d-flex align-center justify-space-between">
                  <span class="d-flex align-center">
                    <v-icon color="primary" class="me-2">mdi-cash-multiple</v-icon>
                    {{ t('settings.secondaryCurrenciesTitle') }}
                  </span>
                  <v-chip
                    size="small"
                    :color="selectedSecondaryCurrencies.length > 0 ? 'teal-darken-1' : 'grey'"
                    variant="tonal"
                    class="font-weight-bold"
                  >
                    {{ t('settings.activeSecondaryCount', { count: selectedSecondaryCurrencies.length }) }}
                  </v-chip>
                </v-card-title>
                <v-card-text class="pa-5 flex-grow-1">
                  <p class="text-body-2 text-slate-600 mb-4">
                    {{ t('settings.secondaryCurrenciesDescription') }}
                  </p>

                  <div>
                    <v-card
                      v-for="curr in availableSecondaryCurrencies"
                      :key="curr.code"
                      variant="outlined"
                      class="mb-3 pa-3 transition-swing rounded-0 border"
                      :class="{ 'border-teal-500 bg-teal-50/20': selectedSecondaryCurrencies.includes(curr.code) }"
                    >
                      <div class="d-flex align-center justify-space-between">
                        <div class="d-flex align-center">
                          <v-checkbox
                            :model-value="selectedSecondaryCurrencies.includes(curr.code)"
                            :disabled="!selectedSecondaryCurrencies.includes(curr.code) && selectedSecondaryCurrencies.length >= 3"
                            color="teal-darken-1"
                            hide-details
                            density="compact"
                            class="me-2 flex-shrink-0"
                            @update:model-value="toggleSecondaryCurrency(curr.code)"
                          />
                          <div>
                            <div class="d-flex align-center gap-2">
                              <span class="font-weight-bold text-slate-900">{{ curr.name }}</span>
                              <v-chip size="x-small" variant="tonal" color="teal-darken-1" class="font-mono font-weight-bold">
                                {{ curr.code }}
                              </v-chip>
                            </div>
                            <div class="text-caption text-slate-500">
                              Symbol: <strong class="font-mono">{{ curr.symbol }}</strong>
                            </div>
                          </div>
                        </div>

                        <v-chip
                          v-if="selectedSecondaryCurrencies.includes(curr.code)"
                          size="x-small"
                          color="teal-darken-1"
                          variant="flat"
                          class="font-weight-bold"
                        >
                          ENABLED
                        </v-chip>
                      </div>
                    </v-card>
                  </div>
                </v-card-text>
                <v-card-actions class="pa-4 border-t bg-slate-50 justify-end">
                  <v-btn
                    color="primary"
                    variant="flat"
                    prepend-icon="mdi-content-save-outline"
                    :loading="savingCurrencies"
                    @click="saveCurrencySettings"
                  >
                    {{ t('settings.saveSettings') }}
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>

          <!-- Active Exchange Rates Quick Configuration -->
          <v-card v-if="selectedSecondaryCurrencies.length > 0" variant="outlined" class="rounded-0 border bg-white mb-6">
            <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 pa-4 border-b bg-slate-50 d-flex align-center justify-space-between flex-wrap gap-2">
              <span class="d-flex align-center">
                <v-icon color="primary" class="me-2">mdi-swap-horizontal-bold</v-icon>
                {{ t('settings.configureRatesTitle') }}
              </span>
              <div class="text-caption text-slate-500 font-medium">
                {{ t('settings.rateHelp') }}
              </div>
            </v-card-title>
            <v-card-text class="pa-5">
              <p class="text-body-2 text-slate-600 mb-4">
                {{ t('settings.configureRatesDescription') }}
              </p>

              <v-row>
                <v-col
                  v-for="code in selectedSecondaryCurrencies"
                  :key="code"
                  cols="12"
                  md="4"
                >
                  <v-card variant="outlined" class="rounded-0 border bg-slate-50 pa-4 h-100 d-flex flex-column justify-space-between">
                    <div>
                      <div class="d-flex align-center justify-space-between mb-3">
                        <div class="d-flex align-center gap-2">
                          <v-avatar size="32" color="primary" variant="tonal" rounded class="font-weight-bold font-mono text-caption">
                            {{ code }}
                          </v-avatar>
                          <div>
                            <div class="text-body-2 font-weight-bold text-slate-900">
                              {{ code }} → {{ selectedDefaultCurrency }}
                            </div>
                            <div class="text-caption text-slate-500">
                              {{ CURRENCY_NAMES[code] }}
                            </div>
                          </div>
                        </div>
                        <v-chip size="x-small" color="info" variant="tonal" class="font-mono font-weight-bold">
                          1 {{ CURRENCY_SYMBOLS[code] }}
                        </v-chip>
                      </div>

                      <v-text-field
                        v-if="rateInputs[code]"
                        v-model="rateInputs[code].rate"
                        :label="t('settings.rateInputLabel', { from: code })"
                        type="number"
                        step="0.0001"
                        min="0.000001"
                        variant="outlined"
                        density="comfortable"
                        bg-color="white"
                        class="mb-2"
                        :prefix="CURRENCY_SYMBOLS[selectedDefaultCurrency] || '$'"
                        :suffix="selectedDefaultCurrency"
                        persistent-hint
                        :hint="getInverseRateHint(code, rateInputs[code]?.rate)"
                      />

                      <v-text-field
                        v-if="rateInputs[code]"
                        v-model="rateInputs[code].rateDate"
                        :label="t('settings.effectiveDate')"
                        type="date"
                        variant="outlined"
                        density="comfortable"
                        bg-color="white"
                        class="mb-2"
                      />
                    </div>

                    <div class="mt-3 pt-3 border-t d-flex justify-end">
                      <v-btn
                        color="primary"
                        variant="flat"
                        size="small"
                        prepend-icon="mdi-check"
                        :loading="rateInputs[code]?.loading"
                        @click="saveDirectRate(code)"
                      >
                        {{ t('settings.saveRate') }}
                      </v-btn>
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Exchange Rate History & Recalculation Table -->
          <v-card variant="outlined" class="rounded-0 border bg-white mb-6">
            <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 pa-4 border-b bg-slate-50 d-flex align-center justify-space-between flex-wrap gap-2">
              <div>
                <span class="d-flex align-center">
                  <v-icon color="primary" class="me-2">mdi-history</v-icon>
                  {{ t('settings.rateHistoryTitle') }}
                </span>
                <div class="text-caption text-slate-500 font-weight-regular mt-1">
                  {{ t('settings.rateHistorySubtitle') }}
                </div>
              </div>
              <div class="d-flex align-center gap-2">
                <v-btn
                  variant="outlined"
                  color="primary"
                  size="small"
                  prepend-icon="mdi-plus"
                  @click="openAddRateDialog"
                >
                  {{ t('settings.addRate') }}
                </v-btn>
                <v-btn
                  variant="flat"
                  color="indigo-darken-1"
                  size="small"
                  prepend-icon="mdi-calculator"
                  :loading="recalculating"
                  @click="triggerRecalculateOrders"
                >
                  {{ t('settings.recalculateCosts') }}
                </v-btn>
              </div>
            </v-card-title>

            <v-table density="comfortable" hover>
              <thead>
                <tr class="bg-slate-50">
                  <th class="font-weight-bold text-slate-900">{{ t('settings.fromCurrency') }}</th>
                  <th class="font-weight-bold text-slate-900">{{ t('settings.toCurrency') }}</th>
                  <th class="font-weight-bold text-slate-900">{{ t('settings.rate') }}</th>
                  <th class="font-weight-bold text-slate-900">{{ t('settings.inverse') }}</th>
                  <th class="font-weight-bold text-slate-900">{{ t('settings.effectiveDate') }}</th>
                  <th class="font-weight-bold text-slate-900">{{ t('settings.dateRecorded') }}</th>
                  <th class="font-weight-bold text-slate-900 text-end" style="width: 80px;">{{ t('settings.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in ratesHistory" :key="r.id">
                  <td class="font-weight-bold text-slate-900">
                    <v-chip size="small" variant="tonal" color="primary" class="font-mono font-weight-bold">
                      {{ r.fromCurrency }} ({{ CURRENCY_SYMBOLS[r.fromCurrency] || r.fromCurrency }})
                    </v-chip>
                  </td>
                  <td class="font-weight-bold text-slate-900">
                    <v-chip size="small" variant="tonal" color="indigo" class="font-mono font-weight-bold">
                      {{ r.toCurrency }} ({{ CURRENCY_SYMBOLS[r.toCurrency] || r.toCurrency }})
                    </v-chip>
                  </td>
                  <td class="font-mono font-weight-bold text-slate-900">
                    1 {{ r.fromCurrency }} = {{ formatRateNumber(r.rate) }} {{ r.toCurrency }}
                  </td>
                  <td class="font-mono text-slate-500 text-caption">
                    1 {{ r.toCurrency }} ≈ {{ formatRateNumber(r.rate > 0 ? (1 / r.rate) : 0) }} {{ r.fromCurrency }}
                  </td>
                  <td>
                    <span class="font-mono text-slate-800">{{ String(r.rateDate).slice(0, 10) }}</span>
                  </td>
                  <td>
                    <span class="text-caption text-slate-500">{{ formatDate(r.createdAt) }}</span>
                  </td>
                  <td class="text-end">
                    <v-btn
                      icon
                      variant="text"
                      size="small"
                      color="error"
                      :title="t('settings.deleteRate')"
                      @click="confirmDeleteRate(r)"
                    >
                      <v-icon size="18">mdi-trash-can-outline</v-icon>
                    </v-btn>
                  </td>
                </tr>
                <tr v-if="ratesHistory.length === 0">
                  <td colspan="7" class="text-center py-6 text-slate-400">
                    {{ t('settings.noRatesFound') }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </v-window-item>

        <!-- TAB 2: DATABASE & DEPLOYMENT -->
        <v-window-item value="database" class="pa-6">
          <v-row>
            <!-- Left Column: Active Connection Details -->
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="rounded-0 border mb-6 bg-slate-50">
                <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 d-flex align-center justify-space-between pa-4 border-b bg-white">
                  <span class="d-flex align-center">
                    <v-icon color="primary" class="me-2">mdi-server</v-icon>
                    Active Connection Information
                  </span>
                  <v-chip size="x-small" color="success" variant="flat" class="font-weight-bold">
                    ONLINE
                  </v-chip>
                </v-card-title>
                <v-card-text class="pa-4">
                  <v-table density="compact" class="bg-transparent">
                    <tbody>
                      <tr>
                        <td class="text-slate-500 font-weight-medium py-2" style="width: 160px;">Database Engine</td>
                        <td class="text-slate-900 font-weight-bold font-mono py-2">
                          {{ databaseInfo.displayName || databaseInfo.engine }}
                        </td>
                      </tr>
                      <tr v-if="databaseInfo.engine === 'sqlite'">
                        <td class="text-slate-500 font-weight-medium py-2">SQLite File Path</td>
                        <td class="text-slate-900 font-mono text-caption py-2" style="word-break: break-all;">
                          {{ databaseInfo.databaseFile }}
                        </td>
                      </tr>
                      <tr v-if="databaseInfo.engine === 'sqlite'">
                        <td class="text-slate-500 font-weight-medium py-2">Database File Size</td>
                        <td class="text-slate-900 font-mono py-2">
                          {{ formatBytes(databaseInfo.fileSizeBytes) }}
                        </td>
                      </tr>
                      <tr v-if="databaseInfo.engine === 'sqlite'">
                        <td class="text-slate-500 font-weight-medium py-2">Journal Mode</td>
                        <td class="text-slate-900 font-mono py-2">
                          <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                            {{ databaseInfo.journalMode || 'WAL' }} (Write-Ahead Logging)
                          </v-chip>
                        </td>
                      </tr>
                      <tr v-if="databaseInfo.engine === 'mysql'">
                        <td class="text-slate-500 font-weight-medium py-2">Host & Port</td>
                        <td class="text-slate-900 font-mono py-2">
                          {{ databaseInfo.host }}:{{ databaseInfo.port }}
                        </td>
                      </tr>
                      <tr v-if="databaseInfo.engine === 'mysql'">
                        <td class="text-slate-500 font-weight-medium py-2">Database Name</td>
                        <td class="text-slate-900 font-mono py-2">
                          {{ databaseInfo.database }}
                        </td>
                      </tr>
                      <tr v-if="databaseInfo.engine === 'mysql'">
                        <td class="text-slate-500 font-weight-medium py-2">Database User</td>
                        <td class="text-slate-900 font-mono py-2">
                          {{ databaseInfo.user }}
                        </td>
                      </tr>
                      <tr>
                        <td class="text-slate-500 font-weight-medium py-2">Deployment Mode</td>
                        <td class="text-slate-900 py-2">
                          <v-chip
                            size="x-small"
                            :color="databaseInfo.engine === 'sqlite' ? 'indigo-darken-1' : 'teal-darken-2'"
                            variant="flat"
                            class="font-weight-bold"
                          >
                            {{ databaseInfo.engine === 'sqlite' ? 'Autonomous Standalone (Zero External DB)' : 'External Database Server' }}
                          </v-chip>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-card-text>
              </v-card>

              <!-- Database Record Counts -->
              <v-card variant="outlined" class="rounded-0 border bg-white">
                <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 pa-4 border-b">
                  <v-icon color="primary" class="me-2">mdi-table-large</v-icon>
                  Catalog & Entity Counts
                </v-card-title>
                <v-card-text class="pa-4">
                  <v-row dense>
                    <v-col cols="6" sm="4">
                      <div class="pa-3 bg-slate-50 border text-center">
                        <div class="text-caption text-slate-500">Components</div>
                        <div class="text-h6 font-weight-bold text-slate-900 font-mono">
                          {{ databaseInfo.counts?.components || 0 }}
                        </div>
                      </div>
                    </v-col>
                    <v-col cols="6" sm="4">
                      <div class="pa-3 bg-slate-50 border text-center">
                        <div class="text-caption text-slate-500">Projects</div>
                        <div class="text-h6 font-weight-bold text-slate-900 font-mono">
                          {{ databaseInfo.counts?.projects || 0 }}
                        </div>
                      </div>
                    </v-col>
                    <v-col cols="6" sm="4">
                      <div class="pa-3 bg-slate-50 border text-center">
                        <div class="text-caption text-slate-500">BOM Entries</div>
                        <div class="text-h6 font-weight-bold text-slate-900 font-mono">
                          {{ databaseInfo.counts?.bomItems || 0 }}
                        </div>
                      </div>
                    </v-col>
                    <v-col cols="6" sm="4">
                      <div class="pa-3 bg-slate-50 border text-center">
                        <div class="text-caption text-slate-500">Purchases / Orders</div>
                        <div class="text-h6 font-weight-bold text-slate-900 font-mono">
                          {{ databaseInfo.counts?.orders || 0 }}
                        </div>
                      </div>
                    </v-col>
                    <v-col cols="6" sm="4">
                      <div class="pa-3 bg-slate-50 border text-center">
                        <div class="text-caption text-slate-500">Storage Locations</div>
                        <div class="text-h6 font-weight-bold text-slate-900 font-mono">
                          {{ databaseInfo.counts?.storages || 0 }}
                        </div>
                      </div>
                    </v-col>
                    <v-col cols="6" sm="4">
                      <div class="pa-3 bg-slate-50 border text-center">
                        <div class="text-caption text-slate-500">Production Runs</div>
                        <div class="text-h6 font-weight-bold text-slate-900 font-mono">
                          {{ databaseInfo.counts?.productionRuns || 0 }}
                        </div>
                      </div>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Right Column: Deployment & Switching Guide -->
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="rounded-0 border bg-white h-100 d-flex flex-column">
                <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 pa-4 border-b bg-slate-50">
                  <v-icon color="primary" class="me-2">mdi-book-open-outline</v-icon>
                  Engine Selection & Autonomous Deployment
                </v-card-title>
                <v-card-text class="pa-4 flex-grow-1">
                  <v-alert
                    color="primary"
                    variant="tonal"
                    density="comfortable"
                    class="rounded-0 mb-4"
                  >
                    <div class="font-weight-bold text-body-2 mb-1">Dual Database Engine Architecture</div>
                    <div class="text-caption">
                      BOM Manager can run either in a <strong>fully autonomous self-hosted mode</strong> with embedded SQLite (zero external setup required) or connect to an existing <strong>MySQL / MariaDB</strong> instance.
                    </div>
                  </v-alert>

                  <!-- Quick Run Options -->
                  <div class="text-subtitle-2 font-weight-bold text-slate-900 mb-1 d-flex align-center">
                    <v-icon size="16" color="primary" class="me-1">mdi-docker</v-icon>
                    Quick Run 1: Via Docker (As-Is)
                  </div>
                  <pre class="pa-3 bg-slate-100 text-slate-900 font-mono text-caption rounded mb-3 overflow-x-auto border"># Single self-contained container with persistent data & media
docker compose up -d</pre>

                  <div class="text-subtitle-2 font-weight-bold text-slate-900 mb-1 d-flex align-center">
                    <v-icon size="16" color="primary" class="me-1">mdi-console-line</v-icon>
                    Quick Run 2: Via 3 Commands (Node.js)
                  </div>
                  <pre class="pa-3 bg-slate-100 text-slate-900 font-mono text-caption rounded mb-4 overflow-x-auto border">npm install
npm run build
npm run start</pre>

                  <!-- Configuration Snippets -->
                  <div class="text-subtitle-2 font-weight-bold text-slate-900 mb-1">
                    Autonomous SQLite Configuration (.env)
                  </div>
                  <pre class="pa-3 bg-slate-100 text-slate-900 font-mono text-caption rounded mb-3 overflow-x-auto border"># Autonomous SQLite with pre-seeded demo hardware projects
DB_TYPE=sqlite
DEMO_DATA=true
PORT=3001
MEDIA_BASE_URL=/media</pre>

                  <div class="text-subtitle-2 font-weight-bold text-slate-900 mb-1">
                    External MySQL Server (.env)
                  </div>
                  <pre class="pa-3 bg-slate-100 text-slate-900 font-mono text-caption rounded overflow-x-auto border"># Centralized MySQL / MariaDB Server
DB_TYPE=mysql
DB_HOST=192.168.1.100
DB_PORT=3306
DB_USER=bommanager_user
DB_PASSWORD=your_secure_password
DB_NAME=retool_bommanager
PORT=3001</pre>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- TAB 2: MEDIA & STORAGE PATHS -->
        <v-window-item value="media" class="pa-6">
          <v-row>
            <v-col cols="12" md="7">
              <v-card variant="outlined" class="rounded-0 border bg-white mb-6">
                <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 pa-4 border-b bg-slate-50">
                  <v-icon color="primary" class="me-2">mdi-folder-cog-outline</v-icon>
                  Asset Directory Configuration (t_config)
                </v-card-title>
                <v-card-text class="pa-5">
                  <v-form @submit.prevent="saveConfig">
                    <v-text-field
                      v-model="editConfig.rootPath"
                      label="Media Root / Base URL"
                      placeholder="/media/ or http://host:8085/"
                      variant="outlined"
                      density="comfortable"
                      class="mb-3"
                      hint="URL prefix used to construct asset paths (e.g. '/media/' or external URL)"
                      persistent-hint
                    />

                    <v-text-field
                      v-model="editConfig.projectPhotoFolder"
                      label="Project Photos Subfolder"
                      placeholder="projects/"
                      variant="outlined"
                      density="comfortable"
                      class="mb-3"
                    />

                    <v-text-field
                      v-model="editConfig.componentPhotoFolder"
                      label="Component Photos Subfolder"
                      placeholder="components/"
                      variant="outlined"
                      density="comfortable"
                      class="mb-3"
                    />

                    <v-text-field
                      v-model="editConfig.packagePhotoFolder"
                      label="Package Drawings Subfolder"
                      placeholder="packages/"
                      variant="outlined"
                      density="comfortable"
                      class="mb-3"
                    />

                    <v-text-field
                      v-model="editConfig.datasheetFolder"
                      label="Datasheets Subfolder"
                      placeholder="datasheets/"
                      variant="outlined"
                      density="comfortable"
                      class="mb-4"
                    />

                    <div class="d-flex justify-end">
                      <v-btn
                        type="submit"
                        color="primary"
                        variant="flat"
                        prepend-icon="mdi-content-save-outline"
                        :loading="savingConfig"
                      >
                        Save Paths Configuration
                      </v-btn>
                    </div>
                  </v-form>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Physical Storage Folders Status -->
            <v-col cols="12" md="5">
              <v-card variant="outlined" class="rounded-0 border bg-white">
                <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 pa-4 border-b bg-slate-50">
                  <v-icon color="primary" class="me-2">mdi-folder-check-outline</v-icon>
                  Physical Media Storage Status
                </v-card-title>
                <v-card-text class="pa-4">
                  <div class="text-caption text-slate-500 mb-3">
                    Server media directory root:
                    <div class="font-mono text-slate-900 mt-1 font-weight-bold" style="word-break: break-all;">
                      {{ mediaInfo.mediaDir }}
                    </div>
                  </div>

                  <v-list density="compact" class="border">
                    <v-list-item
                      v-for="(folder, idx) in mediaInfo.folderStatus"
                      :key="idx"
                      class="border-b py-2"
                    >
                      <template #prepend>
                        <v-icon
                          :color="folder.exists ? 'success' : 'error'"
                          size="20"
                          class="me-3"
                        >
                          {{ folder.exists ? 'mdi-folder-check' : 'mdi-folder-alert' }}
                        </v-icon>
                      </template>
                      <v-list-item-title class="font-weight-bold text-body-2 font-mono">
                        {{ folder.subfolder }}
                      </v-list-item-title>
                      <v-list-item-subtitle class="text-caption">
                        {{ folder.exists ? `${folder.fileCount} files present on disk` : 'Folder does not exist yet' }}
                      </v-list-item-subtitle>
                      <template #append>
                        <v-chip
                          size="x-small"
                          :color="folder.exists ? 'success' : 'error'"
                          variant="tonal"
                          class="font-weight-bold font-mono"
                        >
                          {{ folder.exists ? 'READY' : 'MISSING' }}
                        </v-chip>
                      </template>
                    </v-list-item>
                  </v-list>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- TAB 3: ABOUT & PUBLICATION -->
        <v-window-item value="about" class="pa-6">
          <v-row>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="rounded-0 border bg-white mb-6">
                <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 pa-4 border-b bg-slate-50">
                  <v-icon color="primary" class="me-2">mdi-application-cog-outline</v-icon>
                  System & Application Specifications
                </v-card-title>
                <v-card-text class="pa-4">
                  <v-table density="compact">
                    <tbody>
                      <tr>
                        <td class="text-slate-500 font-weight-medium py-2" style="width: 160px;">Application</td>
                        <td class="text-slate-900 font-weight-bold py-2">BOM Manager (Bill of Materials)</td>
                      </tr>
                      <tr>
                        <td class="text-slate-500 font-weight-medium py-2">Release Stage</td>
                        <td class="text-slate-900 py-2">
                          <v-chip size="x-small" color="primary" variant="flat" class="font-mono font-weight-bold">
                            v{{ appInfo.version }} - Pre-Production
                          </v-chip>
                        </td>
                      </tr>
                      <tr>
                        <td class="text-slate-500 font-weight-medium py-2">Node.js Runtime</td>
                        <td class="text-slate-900 font-mono py-2">{{ appInfo.nodeVersion }}</td>
                      </tr>
                      <tr>
                        <td class="text-slate-500 font-weight-medium py-2">Host Platform</td>
                        <td class="text-slate-900 font-mono py-2">{{ appInfo.platform }}</td>
                      </tr>
                      <tr>
                        <td class="text-slate-500 font-weight-medium py-2">Environment</td>
                        <td class="text-slate-900 font-mono py-2">{{ appInfo.environment }}</td>
                      </tr>
                      <tr>
                        <td class="text-slate-500 font-weight-medium py-2">Server Uptime</td>
                        <td class="text-slate-900 font-mono py-2">{{ formatUptime(appInfo.uptimeSeconds) }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="6">
              <v-card variant="outlined" class="rounded-0 border bg-white">
                <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 pa-4 border-b bg-slate-50">
                  <v-icon color="primary" class="me-2">mdi-tag-text-outline</v-icon>
                  Release Notes & Documentation
                </v-card-title>
                <v-card-text class="pa-4">
                  <p class="text-body-2 text-slate-600 mb-4">
                    Version 0.3.0 delivers multi-currency orders, action column alignment, and purchase confirmation modal redesign.
                  </p>
                  <div class="d-flex flex-wrap gap-2">
                    <v-btn
                      to="/release-notes"
                      color="primary"
                      variant="outlined"
                      size="small"
                      prepend-icon="mdi-text-box-search-outline"
                    >
                      View Full Release Notes
                    </v-btn>
                    <v-btn
                      href="https://github.com/alk0v/bom-manager"
                      target="_blank"
                      variant="tonal"
                      size="small"
                      prepend-icon="mdi-github"
                    >
                      GitHub Repository
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>
      </v-window>
    </v-card>

    <!-- Modal: Add Historical Rate Dialog -->
    <v-dialog v-model="addRateDialog" max-width="500" persistent>
      <v-card class="rounded-0 border bg-white">
        <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 pa-4 border-b bg-slate-50 d-flex align-center justify-space-between">
          <span class="d-flex align-center">
            <v-icon color="primary" class="me-2">mdi-plus-circle-outline</v-icon>
            {{ t('settings.newRateModalTitle') }}
          </span>
          <v-btn icon variant="text" size="small" @click="addRateDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-5">
          <p class="text-caption text-slate-500 mb-4">
            {{ t('settings.newRateModalSubtitle') }}
          </p>

          <v-row dense>
            <v-col cols="6">
              <v-select
                v-model="newRateForm.fromCurrency"
                :items="supportedCurrenciesList.map(c => c.code)"
                :label="t('settings.fromCurrency')"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="newRateForm.toCurrency"
                :items="supportedCurrenciesList.map(c => c.code)"
                :label="t('settings.toCurrency')"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="newRateForm.rate"
                :label="t('settings.rateValue')"
                type="number"
                step="0.0001"
                min="0.000001"
                variant="outlined"
                density="comfortable"
                :prefix="`1 ${newRateForm.fromCurrency} = `"
                :suffix="newRateForm.toCurrency"
                :hint="newRateInversePreview"
                persistent-hint
                class="mb-3"
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="newRateForm.rateDate"
                :label="t('settings.rateDate')"
                type="date"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="pa-4 border-t bg-slate-50 justify-end">
          <v-btn variant="outlined" color="slate-500" @click="addRateDialog = false">
            {{ t('settings.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="savingNewRate"
            :disabled="!newRateForm.fromCurrency || !newRateForm.toCurrency || newRateForm.fromCurrency === newRateForm.toCurrency || !newRateForm.rate || Number(newRateForm.rate) <= 0"
            @click="submitNewRate"
          >
            {{ t('settings.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal: Delete Rate Confirm Dialog -->
    <v-dialog v-model="deleteRateDialog" max-width="450">
      <v-card class="rounded-0 border bg-white">
        <v-card-title class="text-subtitle-1 font-weight-bold text-slate-900 pa-4 border-b bg-slate-50 d-flex align-center">
          <v-icon color="error" class="me-2">mdi-alert-circle-outline</v-icon>
          {{ t('settings.deleteRate') }}
        </v-card-title>
        <v-card-text class="pa-5">
          <p class="text-body-2 text-slate-700 mb-3">
            {{ t('settings.deleteRateConfirm') }}
          </p>
          <div v-if="rateToDelete" class="pa-3 bg-slate-100 rounded text-caption font-mono">
            <strong>{{ rateToDelete.fromCurrency }} → {{ rateToDelete.toCurrency }}</strong>:
            Rate {{ rateToDelete.rate }} (Date: {{ String(rateToDelete.rateDate).slice(0, 10) }})
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 border-t bg-slate-50 justify-end">
          <v-btn variant="outlined" color="slate-500" @click="deleteRateDialog = false">
            {{ t('settings.cancel') }}
          </v-btn>
          <v-btn color="error" variant="flat" :loading="deletingRate" @click="executeDeleteRate">
            {{ t('settings.deleteRate') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for user feedback -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
      location="top right"
    >
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" size="small" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import api from '../services/api';
import { useCurrencyStore, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '../stores/currency';
import { formatDate } from '../utils/formatters';

const { t, locale } = useI18n();

const activeTab = ref('general');
const selectedLanguage = ref(locale.value);
const loading = ref(false);
const diagnosticsLoading = ref(false);
const savingConfig = ref(false);
const latencyMs = ref(null);

const onLanguageChange = (val) => {
  if (val) {
    selectedLanguage.value = val;
    locale.value = val;
    localStorage.setItem('bom_language', val);
    snackbar.color = 'success';
    snackbar.text = val === 'uk' ? 'Мову інтерфейсу змінено на Українську' : 'Interface language set to English';
    snackbar.show = true;
  }
};

watch(() => locale.value, (newVal) => {
  selectedLanguage.value = newVal;
});

const appInfo = reactive({
  name: 'BOM Manager',
  version: '0.3.0',
  environment: 'development',
  nodeVersion: '',
  platform: '',
  uptimeSeconds: 0
});

const databaseInfo = reactive({
  engine: 'sqlite',
  displayName: '',
  status: 'connected',
  databaseFile: '',
  fileSizeBytes: 0,
  journalMode: 'WAL',
  host: '',
  port: 3306,
  database: '',
  user: '',
  counts: {}
});

const mediaInfo = reactive({
  mediaDir: '',
  mediaBaseUrl: '/media',
  folderStatus: []
});

const editConfig = reactive({
  rootPath: '',
  projectPhotoFolder: '',
  componentPhotoFolder: '',
  packagePhotoFolder: '',
  datasheetFolder: ''
});

const snackbar = reactive({
  show: false,
  text: '',
  color: 'success'
});

function showToast(text, color = 'success') {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  if (!seconds) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

async function loadSettings() {
  loading.value = true;
  try {
    const res = await axios.get('/api/settings');
    const data = res.data;

    Object.assign(appInfo, data.app || {});
    Object.assign(databaseInfo, data.database || {});
    Object.assign(mediaInfo, data.media || {});
    Object.assign(editConfig, data.config || {});
  } catch (error) {
    console.error('Error loading settings:', error);
    showToast('Failed to load system settings: ' + (error.response?.data?.error || error.message), 'error');
  } finally {
    loading.value = false;
  }
}

async function runDiagnostics() {
  diagnosticsLoading.value = true;
  try {
    const res = await axios.get('/api/settings/diagnostics');
    latencyMs.value = res.data.latencyMs;
    showToast(`Database ping successful! Response time: ${res.data.latencyMs} ms`, 'success');
  } catch (error) {
    console.error('Diagnostics failed:', error);
    showToast('Database diagnostics failed: ' + (error.response?.data?.error || error.message), 'error');
  } finally {
    diagnosticsLoading.value = false;
  }
}

async function saveConfig() {
  savingConfig.value = true;
  try {
    await axios.put('/api/settings/config', {
      config: editConfig
    });
    showToast('Configuration paths updated successfully!', 'success');
    await loadSettings();
  } catch (error) {
    console.error('Error saving config:', error);
    showToast('Failed to save config: ' + (error.response?.data?.error || error.message), 'error');
  } finally {
    savingConfig.value = false;
  }
}

// Currency & Exchange Rate State
const currencyStore = useCurrencyStore();
const selectedDefaultCurrency = ref('USD');
const selectedSecondaryCurrencies = ref(['EUR', 'UAH', 'PLN']);
const ratesHistory = ref([]);
const savingCurrencies = ref(false);
const recalculating = ref(false);
const addRateDialog = ref(false);
const savingNewRate = ref(false);
const deleteRateDialog = ref(false);
const rateToDelete = ref(null);
const deletingRate = ref(false);

const rateInputs = reactive({
  USD: { rate: 1.0, rateDate: new Date().toISOString().slice(0, 10), loading: false },
  EUR: { rate: '', rateDate: new Date().toISOString().slice(0, 10), loading: false },
  UAH: { rate: '', rateDate: new Date().toISOString().slice(0, 10), loading: false },
  PLN: { rate: '', rateDate: new Date().toISOString().slice(0, 10), loading: false }
});

const newRateForm = reactive({
  fromCurrency: 'EUR',
  toCurrency: 'USD',
  rate: '',
  rateDate: new Date().toISOString().slice(0, 10)
});

const supportedCurrenciesList = computed(() => {
  return ['USD', 'EUR', 'UAH', 'PLN'].map(code => ({
    code,
    name: CURRENCY_NAMES[code] || code,
    symbol: CURRENCY_SYMBOLS[code] || code
  }));
});

const availableSecondaryCurrencies = computed(() => {
  return supportedCurrenciesList.value.filter(c => c.code !== selectedDefaultCurrency.value);
});

const newRateInversePreview = computed(() => {
  const r = parseFloat(newRateForm.rate);
  if (!r || r <= 0 || !newRateForm.fromCurrency || !newRateForm.toCurrency) return '';
  const inv = 1 / r;
  return `Inverse: 1 ${newRateForm.toCurrency} ≈ ${inv >= 1 ? inv.toFixed(4) : inv.toFixed(6)} ${newRateForm.fromCurrency}`;
});

function formatRateNumber(num) {
  if (num === null || num === undefined || isNaN(Number(num))) return '—';
  const n = Number(num);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6).replace(/\.?0+$/, '');
}

function getInverseRateHint(code, rateVal) {
  const r = parseFloat(rateVal);
  if (!r || r <= 0) return '';
  const inv = 1 / r;
  const defCode = selectedDefaultCurrency.value;
  return `1 ${defCode} ≈ ${inv >= 1 ? inv.toFixed(4) : inv.toFixed(6)} ${code}`;
}

async function loadCurrencySettings() {
  try {
    const data = await api.getCurrencySettings();
    if (data) {
      if (data.defaultCurrency) selectedDefaultCurrency.value = data.defaultCurrency;
      if (Array.isArray(data.secondaryCurrencies)) selectedSecondaryCurrencies.value = [...data.secondaryCurrencies];
      if (Array.isArray(data.rates)) ratesHistory.value = data.rates;

      const today = new Date().toISOString().slice(0, 10);
      for (const code of ['USD', 'EUR', 'UAH', 'PLN']) {
        if (!rateInputs[code]) {
          rateInputs[code] = { rate: '', rateDate: today, loading: false };
        }
        const direct = ratesHistory.value
          .filter(r => r.fromCurrency === code && r.toCurrency === selectedDefaultCurrency.value)
          .sort((a, b) => new Date(b.rateDate) - new Date(a.rateDate));

        if (direct.length > 0) {
          rateInputs[code].rate = direct[0].rate;
          rateInputs[code].rateDate = String(direct[0].rateDate).slice(0, 10);
        } else {
          const inverse = ratesHistory.value
            .filter(r => r.fromCurrency === selectedDefaultCurrency.value && r.toCurrency === code)
            .sort((a, b) => new Date(b.rateDate) - new Date(a.rateDate));
          if (inverse.length > 0 && inverse[0].rate > 0) {
            rateInputs[code].rate = (1 / inverse[0].rate);
            rateInputs[code].rateDate = String(inverse[0].rateDate).slice(0, 10);
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to load currency settings:', err);
  }
}

function onDefaultCurrencyChange(code) {
  if (code && code !== selectedDefaultCurrency.value) {
    selectedDefaultCurrency.value = code;
    selectedSecondaryCurrencies.value = selectedSecondaryCurrencies.value.filter(c => c !== code);
    // Reload currency settings view to refresh rates relative to new default
    loadCurrencySettings();
  }
}

function toggleSecondaryCurrency(code) {
  const idx = selectedSecondaryCurrencies.value.indexOf(code);
  if (idx >= 0) {
    selectedSecondaryCurrencies.value.splice(idx, 1);
  } else {
    if (selectedSecondaryCurrencies.value.length < 3) {
      selectedSecondaryCurrencies.value.push(code);
    }
  }
}

async function saveCurrencySettings() {
  savingCurrencies.value = true;
  try {
    const res = await api.updateCurrencySettings({
      defaultCurrency: selectedDefaultCurrency.value,
      secondaryCurrencies: selectedSecondaryCurrencies.value
    });
    await currencyStore.loadCurrencies();
    await loadCurrencySettings();
    showToast(t('settings.settingsSaved') + (res.recalculated ? ` (${res.recalculated.updatedOrdersCount} orders updated)` : ''), 'success');
  } catch (err) {
    console.error('Error saving currency settings:', err);
    showToast('Failed to save currency settings: ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    savingCurrencies.value = false;
  }
}

async function saveDirectRate(code) {
  if (!rateInputs[code]) return;
  const numRate = parseFloat(rateInputs[code].rate);
  if (isNaN(numRate) || numRate <= 0) {
    showToast('Please enter a valid positive exchange rate', 'error');
    return;
  }
  rateInputs[code].loading = true;
  try {
    const res = await api.addExchangeRate({
      fromCurrency: code,
      toCurrency: selectedDefaultCurrency.value,
      rate: numRate,
      rateDate: rateInputs[code].rateDate || new Date().toISOString().slice(0, 10)
    });
    await currencyStore.loadCurrencies();
    await loadCurrencySettings();
    showToast(t('settings.rateAddedSuccess') + (res.recalculated ? ` (${res.recalculated.updatedOrdersCount} orders updated)` : ''), 'success');
  } catch (err) {
    console.error('Error saving rate:', err);
    showToast('Failed to save exchange rate: ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    if (rateInputs[code]) rateInputs[code].loading = false;
  }
}

function openAddRateDialog() {
  const defaultSecondary = selectedSecondaryCurrencies.value[0] || 'EUR';
  newRateForm.fromCurrency = defaultSecondary;
  newRateForm.toCurrency = selectedDefaultCurrency.value;
  newRateForm.rate = rateInputs[defaultSecondary]?.rate || '';
  newRateForm.rateDate = new Date().toISOString().slice(0, 10);
  addRateDialog.value = true;
}

async function submitNewRate() {
  savingNewRate.value = true;
  try {
    const res = await api.addExchangeRate({
      fromCurrency: newRateForm.fromCurrency,
      toCurrency: newRateForm.toCurrency,
      rate: parseFloat(newRateForm.rate),
      rateDate: newRateForm.rateDate
    });
    await currencyStore.loadCurrencies();
    await loadCurrencySettings();
    addRateDialog.value = false;
    showToast(t('settings.rateAddedSuccess') + (res.recalculated ? ` (${res.recalculated.updatedOrdersCount} orders updated)` : ''), 'success');
  } catch (err) {
    console.error('Error adding new rate:', err);
    showToast('Failed to add rate: ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    savingNewRate.value = false;
  }
}

function confirmDeleteRate(rate) {
  rateToDelete.value = rate;
  deleteRateDialog.value = true;
}

async function executeDeleteRate() {
  if (!rateToDelete.value) return;
  deletingRate.value = true;
  try {
    const res = await api.deleteExchangeRate(rateToDelete.value.id);
    await currencyStore.loadCurrencies();
    await loadCurrencySettings();
    deleteRateDialog.value = false;
    showToast(t('settings.rateDeletedSuccess') + (res.recalculated ? ` (${res.recalculated.updatedOrdersCount} orders updated)` : ''), 'success');
  } catch (err) {
    console.error('Error deleting rate:', err);
    showToast('Failed to delete rate: ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    deletingRate.value = false;
    rateToDelete.value = null;
  }
}

async function triggerRecalculateOrders() {
  recalculating.value = true;
  try {
    const res = await api.recalculateOrderCosts();
    await currencyStore.loadCurrencies();
    showToast(t('settings.recalculateSuccess', {
      ordersCount: res.totalOrders || 0,
      updatedCount: res.updatedOrdersCount || 0
    }), 'success');
  } catch (err) {
    console.error('Error recalculating orders:', err);
    showToast('Failed to recalculate orders: ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    recalculating.value = false;
  }
}

onMounted(() => {
  loadSettings();
  loadCurrencySettings();
  runDiagnostics();
});
</script>

<style scoped>
.settings-view {
  max-width: 1400px;
  margin: 0 auto;
}
.gap-2 {
  gap: 8px;
}
.gap-4 {
  gap: 16px;
}
</style>
