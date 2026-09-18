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

## Quick Start (Autonomous Self-Hosted with Docker)

The easiest way to run BOM Manager in a self-contained autonomous container:

```bash
docker compose up -d
```

That's it!
- The app will be available at **`http://localhost:3001`**.
- SQLite database is automatically created and stored in `./data/bommanager.sqlite`.
- Media files are stored in `./media/`.

---

## Local Development

### Prerequisites
- Node.js v22+
- npm v10+

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

To run with **autonomous SQLite** (default, no database setup required):
```ini
DB_TYPE=sqlite
PORT=3001
MEDIA_BASE_URL=/media
```

To run with an external **MySQL / MariaDB** server:
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

### 3. Media Directory Setup
Place your media files inside the `media/` directory:
```
media/
├── packages/      # Package drawings and pinout diagrams
├── components/    # Component photos
├── datasheets/    # Datasheet PDF documents
└── projects/      # Project photos & attachments
```

### 4. Start Development Server
```bash
npm run dev
```
This concurrently starts:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

---

## Production Build & Run (Standalone Node)

```bash
# Build frontend
npm run build

# Start production server
npm run start
```
The production server automatically serves the compiled frontend and the API on port 3001.

---

## License

Private / MIT
