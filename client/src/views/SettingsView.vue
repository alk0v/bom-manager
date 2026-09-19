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
                    <strong>Version:</strong> v0.2.5
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

        <!-- TAB 1: DATABASE & DEPLOYMENT -->
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
                    Version 0.2.5 introduces multi-language translation support with JSON localization dictionaries (English & Ukrainian) and seamless Vuetify locale synchronization.
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
import { ref, reactive, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from 'axios';

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
  version: '0.2.5',
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

onMounted(() => {
  loadSettings();
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
