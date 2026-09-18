# BOM Manager (Bill of Materials) - v0.2.4

A modern web application designed to manage electronic components, hardware project builds, Bill of Materials (BOM), warehouse inventory stocks, and procurement shopping lists.

Built with **Vue 3**, **Vuetify 3**, **Node.js/Express**, with out-of-the-box dual database support: **SQLite 3** (for fully autonomous, zero-config self-hosting) and **MySQL / MariaDB** (for centralized/multi-user deployments).

---

## Key Features

- **Hardware Projects Catalog**:
  - Interactive grid view of hardware project cards with photos, metadata, and repository links.
  - Interactive **BOM Pop-up Window** and dedicated full-page BOM view (`/projects/:id`).
  - Stock health indicators with soft light-red row highlighting for component shortages.
  - Reference designator comments (e.g. `C1, C2`, `R1`).
  - 1-click **"Buy Shortages"** action to quickly add missing parts to your procurement list.
  - KiCAD Interactive HTML BOM (iBOM) viewer and smart part matching/cloning importer.
  - Project file attachments manager (firmware, schematics, Gerber archives, datasheets).
- **Electronic Components Catalog**:
  - Search by part number, marking, category, and technical description.
  - Filter by category, package footprint, pin count, mounting type (SMD/THT), and stock availability.
  - Minimum stock threshold (`minQty`) monitoring and safety margins.
  - Storage location breakdown and bin allocation (`t_warehouse`).
  - Direct links to datasheet PDF files.
- **Manufacturing & Production Workflow**:
  - Batch assembly production logging with real-time stock deduction.
  - 1-click production cancellation and component inventory rollback.
  - Production history logs and KPI manufacturing reports.
- **Procurement Shopping List**:
  - Basket of parts to order (`t_busket`) with quantity controls.
  - 1-click purchase confirmation, order logging into `t_orders`, and inventory stock replenishment.
  - 1-click **"Copy Text"** for ordering from suppliers.
- **Dual Database Engine & Autonomous Self-Hosting**:
  - **SQLite 3**: Zero external database dependencies. Automatically creates database files, WAL mode, tables, and seeds default taxonomies.
  - **MySQL / MariaDB**: Compatible with existing centralized database servers.
  - Dedicated **Settings View** (`/settings`) for database diagnostics, live table statistics, and media path configuration.
- **Pure Light Theme Aesthetics**:
  - Clean Material Design 3 light palette, modern typography (*Inter* and *JetBrains Mono*), and subtle slate borders.

---

## Tech Stack

- **Frontend**:
  - Vue 3 (Composition API, `<script setup>`)
  - Vuetify 3 (Material Design 3)
  - Pinia (State management)
  - Vue Router (Client-side routing)
  - Vite (Build tool & dev server)
  - Material Design Icons (`@mdi/font`)
- **Backend**:
  - Node.js & Express
  - Dual Database Drivers:
    - Built-in `node:sqlite` (SQLite 3 with WAL mode)
    - `mysql2/promise` with connection pooling
  - CORS, Dotenv, Multer, LZ-String
- **Containerization**:
  - Multi-stage `Dockerfile` (`node:22-alpine`)
  - `docker-compose.yml` with persistent volumes for data and media

---

---

## ⚡ Quick Run (Autonomous Self-Hosted)

BOM Manager is pre-configured to run out of the box with zero external database dependencies using embedded SQLite and pre-packaged demo hardware projects. Choose either option below:

### Option 1: Via Docker (As-Is)
Run a single self-contained container with persistent data and media:

```bash
docker compose up -d
```

- Application ready at: **`http://localhost:3001`**
- Embedded SQLite database is created in `./data/`
- Demo projects (C64 WiFi Modem, OpenFlops, Apple IIc to RGB) and media assets load automatically!

---

### Option 2: Via 3 Commands (Node.js)
Clone the repository and run these 3 commands:

```bash
npm install
npm run build
npm run start
```

- Application ready at: **`http://localhost:3001`**
- Automatically boots with embedded SQLite (`data/bommanager.sqlite`)
- All 3 demo projects, 50+ components, pricing history, and media photos/datasheets are seeded automatically.

> [!NOTE]
> If port `3001` is already in use by another process on your machine, specify a different port:
> - **PowerShell**: `$env:PORT="3002"; npm run start`
> - **Bash / Linux / Mac**: `PORT=3002 npm run start`
> - Or define `PORT=3002` in your `.env` file.

---

## ⚙️ Configuration & Customization

### Clean Setup vs. Demo Database
By default, autonomous SQLite initializes with 3 demo projects. To start with an empty/clean catalog instead:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Set `DEMO_DATA=false` in `.env`:
   ```ini
   DB_TYPE=sqlite
   DEMO_DATA=false
   ```

### Connecting to External MySQL / MariaDB
To connect to an existing centralized database server instead of SQLite:
```ini
DB_TYPE=mysql
DB_HOST=192.168.1.100
DB_PORT=3306
DB_USER=bommanager_admin
DB_PASSWORD=your_password
DB_NAME=retool_bommanager
PORT=3001
MEDIA_BASE_URL=/media
```

---

## 💻 Local Development (Live Reload)

```bash
# Concurrently start frontend (Vite :5173) and backend API (Express :3001)
npm run dev
```

---

## License

Private / MIT
