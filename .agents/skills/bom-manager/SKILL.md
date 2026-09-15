---
name: bom-manager
description: >-
  Domain knowledge, database schema, media asset rules, and architectural guidelines
  for the BOM Manager (Bill of Materials) system built with Vue 3, Vuetify 3, and Node.js.
---

# BOM Manager Knowledge Base & Specification

## 1. Overview & Purpose
BOM Manager (Bill of Materials Manager) is an application designed to manage electronic components, project builds, warehouse stocks, and procurement shopping lists.
It tracks:
- **Projects**: Electronics engineering projects, their metadata (name, description, external URL, photo), and their constituent BOM.
- **Components**: Comprehensive catalog of electronic components (IC chips, passive components, connectors, modules), categories, packages/footprints, datasheets, photos, markings, and stock quantities.
- **BOM (Bill of Materials)**: Per-project component requirements, needed quantities, and circuit reference designators / comments (e.g. `C1`, `R2`, `U1`).
- **Shopping List (Basket)**: Shortage tracking and procurement planning.
- **Orders & Warehouse**: Order tracking (prices, vendors, dates) and storage location distribution.

---

## 2. Database Specification (`retool_bommanager`)

### Connection Profile
- **Engine**: MySQL 8.x / MariaDB
- **Default Database**: `retool_bommanager`
- **Host**: Configured via environment variable (`DB_HOST`, e.g. `192.168.31.122`)
- **Port**: Configured via environment variable (`DB_PORT`, default `3306`)
- **Charset**: `utf8mb4` / `utf8`

---

### Tables and Schema Details

#### 1. `i_projects`
Stores information about target electronic projects.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `INT` (PK, AI) | NO | Unique project ID |
| `projectName` | `VARCHAR(200)` | YES | Name of the project (e.g., "MC-1502 RAM Module", "BlueSCSI 1.0-c") |
| `description` | `VARCHAR(2000)` | YES | Markdown or plain text description of the project |
| `url` | `VARCHAR(200)` | YES | External repository or documentation link (e.g. GitHub URL) |
| `photoUrl` | `VARCHAR(200)` | YES | Filename of the project photo (relative to `projectPhotoFolder`) |

#### 2. `i_components`
Core electronic component catalog.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `ID` | `INT` (PK, AI) | NO | Unique component ID |
| `component` | `VARCHAR(50)` | YES | Part number or primary name (e.g., `MAX3232`, `PIC18F67J60`, `100nF`) |
| `category_id` | `INT` | YES | FK reference to `i_categories.ID` |
| `package_id` | `INT` | YES | FK reference to `i_packages.ID` (default: 28) |
| `description` | `VARCHAR(1000)` | YES | Full description / technical specifications |
| `shortDescription` | `VARCHAR(50)` | YES | Short summary (e.g., "level converter", "Eth PHY") |
| `marking` | `VARCHAR(50)` | YES | Surface SMD/chip marking code |
| `datasheetURL` | `VARCHAR(200)` | YES | Relative PDF filename or external web URL |
| `photoURL` | `VARCHAR(200)` | YES | Filename of the component photo |
| `qty` | `INT` | YES | Total current in-stock quantity (default: 0) |

#### 3. `t_bom`
Bill of Materials connecting components to specific projects.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `INT` (PK, AI) | NO | Unique BOM record ID |
| `projectId` | `INT` | YES | FK reference to `i_projects.id` |
| `componentId` | `INT` | YES | FK reference to `i_components.ID` |
| `quantity` | `INT` | YES | Required quantity of this component per single project build |
| `comment` | `VARCHAR(1000)` | YES | Reference designators or notes (e.g. `C1, C2, C5`, `Optional LED`, `10k pull-up`) |

#### 4. `i_categories`
Component classification taxonomy (e.g., Capacitors, Resistors, ICs, Microcontrollers, Connectors).
| Column | Type | Nullable | Description |
|---|---|---|---|
| `ID` | `INT` (PK, AI) | NO | Unique category ID |
| `category` | `VARCHAR(50)` | YES | Category name |

#### 5. `i_packages`
Physical IC footprint and packaging specifications.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `ID` | `INT` (PK, AI) | NO | Unique package ID |
| `package` | `VARCHAR(50)` | YES | Package name (e.g., `DIP-8`, `SOIC-16`, `0805`, `TO-220`, `QFP-64`) |
| `pinQuantity` | `INT` | YES | Number of physical pins / pads |
| `isSmd` | `TINYINT` | YES | SMD indicator: `1` for SMD / Surface Mount, `0` for Through-Hole (THT) |
| `drawingURL` | `VARCHAR(200)` | YES | Technical drawing or pinout reference image filename |

#### 6. `t_busket`
Procurement shopping list / purchase plan (named `t_busket` in DB).
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `INT` (PK, AI) | NO | Unique basket item ID |
| `componentId` | `INT` | YES | FK reference to `i_components.ID` |
| `qty` | `INT` | YES | Desired procurement quantity |
| `date` | `DATE` | YES | Date added or planned procurement date |

#### 7. `t_config`
System configuration keys and asset storage path mappings.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `INT` (PK, AI) | NO | Unique config ID |
| `c_key` | `VARCHAR(200)` | YES | Config key |
| `c_value` | `VARCHAR(200)` | YES | Config value |

Key entries in `t_config`:
- `rootPath`: Base HTTP URL for media assets (e.g., `http://192.168.31.122:8085/` or `http://retool.local:8085/`)
- `projectPhotoFolder`: Subfolder for project photos (default: `projects/`)
- `componentPhotoFolder`: Subfolder for component images (default: `components/`)
- `packagePhotoFolder`: Subfolder for package drawings (default: `packages/`)
- `datasheetFolder`: Subfolder for datasheet PDF files (default: `datasheets/`)

#### 8. `t_orders`
Component purchasing history and supplier order log.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `INT` (PK, AI) | NO | Unique order record ID |
| `componentId` | `INT` | YES | FK reference to `i_components.ID` |
| `price` | `FLOAT` | YES | Unit or order price |
| `qty` | `INT` | YES | Purchased quantity |
| `date` | `DATE` | YES | Purchase date |
| `url` | `VARCHAR(200)` | YES | Supplier item URL (e.g., AliExpress, Mouser, LCSC) |
| `details` | `VARCHAR(500)` | YES | Supplier notes, tracking number, or store name |

#### 9. `i_storages` & `t_warehouse`
Locations and stock quantity per storage bin/box.
- `i_storages`: `ID`, `storage` (e.g. "Default Storage", "storage1", "storage2")
- `t_warehouse`: `id`, `componentId`, `storageId`, `quantity`

---

## 3. Media & Asset Resolution Rules
1. If `photoUrl` or `photoURL` is empty, render a stylish placeholder or fallback icon.
2. If `photoUrl` is an absolute HTTP/HTTPS URL (starts with `http://` or `https://`), use it directly.
3. Otherwise, concatenate `MEDIA_BASE_URL` + folder path + filename.
   - For projects: `${MEDIA_BASE_URL}/projects/${project.photoUrl}`
   - For components: `${MEDIA_BASE_URL}/components/${component.photoURL}`
   - For datasheets: If starting with `http`, open link; if relative `.pdf`, `${MEDIA_BASE_URL}/datasheets/${datasheetURL}`.

---

## 4. Architectural Patterns & Implementation Guidelines

### Tech Stack
- **Frontend**:
  - Vue 3 (Composition API, `<script setup>`)
  - Vuetify 3 (Material Design 3 with rich custom dark/light theme, modern cards, data tables)
  - Pinia (State management)
  - Vue Router (Client-side routing)
  - Vite (Fast development and bundling)
  - MDI icons (`@mdi/font`)
- **Backend**:
  - Node.js with Express or Fastify
  - `mysql2/promise` with connection pooling
  - CORS, JSON body parser, structured error handling
- **Fullstack Dev Runner**:
  - Top-level `package.json` running concurrently:
    - `"dev": "concurrently -k -n \"api,web\" -c \"blue,green\" \"npm run dev --workspace=server\" \"npm run dev --workspace=client\""`
- **Production Containerization**:
  - Multi-stage `Dockerfile` creating an optimized single container (Node.js API serving static client assets) or `docker-compose.yml` (Nginx + Node API).

### Core UI Layout
- Persistent `v-navigation-drawer` with brand logo and navigation items:
  1. **Projects** (`/projects`)
  2. **Components** (`/components`)
  3. **Shopping List** (`/shopping-list`)
- Main screen (`v-main`):
  - **Theme**: Crisp, clean light theme with subtle slate borders and high contrast typography.
  - **Projects Screen** (`/projects`):
    - Grid of interactive cards showing Project Photo, Name, Description (clamped), External link, and BOM counts.
    - Clicking any card or the "View BOM" button opens the **BOM Pop-up Window** (modal dialog).
    - Can also navigate to `/projects/:id` for full-window presentation.
    - **Project BOM Table** (inside pop-up modal or dedicated window):
      - Component Name & Marking (monospace)
      - Category & Package name (clean text without chips)
      - Required Quantity
      - In-Stock Quantity: Clean monospace numbers; entire table row is highlighted with a soft light red background (`#FEF2F2`) if there is a component shortage
      - Circuit designators / comments (e.g. `C1, C2`)
      - Quick 1-click "Add shortage to Shopping List" action
      - Actions: Edit quantity, Remove from BOM
    - **Available Components Picker**:
      - Searchable modal dialog to quickly add components from catalog into project BOM.

---

## 5. Development & Testing Directives
- **Do NOT spawn agents for testing**: Never spawn subagents, browser subagents, or automated testing agents for browser testing, taking screenshots, clicking around, or manual UI verification.
- **Verification Method**: Validate changes using automated build commands (e.g. `npm run build --workspace=client`), API requests via PowerShell (`Invoke-RestMethod`), or unit tests. Keep turn execution lean, direct, and fast without browser recording or screenshot overhead.
