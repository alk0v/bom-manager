# BOM Manager (Bill of Materials)

A web application designed to manage electronic components, project builds, Bill of Materials (BOM), warehouse inventory stocks, and procurement shopping lists.

Built with **Vue 3**, **Vuetify 3**, **Node.js/Express**, and **MySQL**.

---

## Features

- **Hardware Projects Catalog**:
  - Grid view of hardware project cards with fitted photo previews, project properties, and external links.
  - Interactive **BOM Pop-up Window** and dedicated full-page BOM view (`/projects/:id`).
  - Stock health indicators with soft light-red row highlighting for component shortages.
  - Circuit designators / comments (e.g. `C1, C2`, `R1`).
  - 1-click **"Buy Shortages"** action to quickly add missing parts to procurement list.
  - Add component dialog with search across 1,500+ electronic parts.
- **Electronic Components Catalog**:
  - Search by component name, marking, and description.
  - Filter by component category.
  - Storage box / warehouse location breakdown (`t_warehouse`).
  - Direct links to datasheet PDF files.
- **Procurement Shopping List**:
  - Basket of parts to order (`t_busket`) with quantity controls.
  - 1-click **"Copy Text"** for ordering from suppliers.
- **Light Theme Design**:
  - Material Design 3 with custom light palette, modern typography (*Inter* and *JetBrains Mono*), and subtle slate borders.

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
  - `mysql2/promise` with connection pooling
  - CORS & Dotenv
- **Database**:
  - MySQL (`retool_bommanager`)

---

## Getting Started

### Prerequisites
- Node.js v20+
- Access to MySQL database `retool_bommanager`

### Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create `server/.env` based on `server/.env.example`:
   ```ini
   PORT=3001
   DB_HOST=192.168.31.122
   DB_PORT=3306
   DB_USER=admin_ro
   DB_PASSWORD=your_password
   DB_NAME=retool_bommanager
   MEDIA_BASE_URL=/media
   ```

3. **Media Files Setup**:
   Place your media files inside the `media/` folder in the project root:
   ```
   media/
   ├── packages/      # Package drawings and pinout diagrams
   ├── components/    # Component photos
   ├── datasheets/    # Datasheet PDF documents
   └── projects/      # Project photos (also supports 'projecs' folder alias)
   ```
   The server serves these static assets directly from `/media/`.

4. **Start Development Environment**:
   ```bash
   npm run dev
   ```
   This concurrently starts:
   - Frontend at: `http://localhost:5173`
   - Backend API at: `http://localhost:3001`

---

## Production Deployment (Docker)

Ensure your `media/` directory has been populated with your assets, then run:

```bash
docker compose up -d --build
```
The application will be available at `http://localhost:3001`. The media assets in `./media` are mounted automatically into `/app/media` in the container.

