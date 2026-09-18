# Release Notes - BOM Manager

## Version 0.2.4 (September 2026) - Pre-Production

### Summary
Version 0.2.4 introduces dual-database engine support (MySQL & SQLite) for fully autonomous self-hosted deployments, a dedicated Settings view with live database and media diagnostics, and prepared containerization artifacts for publication.

### What's New
- **Autonomous Self-Hosted Deployment with SQLite 3**: Run BOM Manager with zero external database dependencies. When deployed with SQLite (default for self-hosting), the application automatically initializes its complete database schema, enables high-concurrency Write-Ahead Logging (WAL), and seeds default electronic taxonomies.
- **Dual Database Architecture (MySQL & SQLite)**: Switch seamlessly between embedded SQLite and external MySQL / MariaDB via the `DB_TYPE` environment variable (`sqlite` or `mysql`). Existing installations with `DB_HOST` configured retain their MySQL database connection with zero breaking changes.
- **Dedicated Settings View (`/settings`)**: Accessible directly from the main sidebar navigation menu. Features:
  - Active Database Engine status and details (file path/size for SQLite, host/port/database for MySQL).
  - Real-time catalog entity counters (components, projects, BOM records, orders, storage locations).
  - Interactive "Switch Database Engine" guide with copyable `.env` and `docker-compose.yml` configurations.
  - Media & Asset storage path configuration (`t_config`) with physical disk folder existence checks.
  - Live database ping latency diagnostics.
  - System specifications and runtime metrics.
- **1-Command Autonomous Docker Compose**: Single-container setup running out of the box with `docker compose up -d`, persisting SQLite database in `./data/` and media assets in `./media/`.
- **Cross-Database SQL Standard Compliancy**: Refactored queries to pure ANSI SQL standards across all route endpoints, polyfilled scalar compatibility functions (`NOW()`, `GREATEST()`, `LEAST()`, `CONCAT()`), and eliminated engine-specific dialect locks.

---

## Version 0.2.3 (September 2026)

### Summary
Version 0.2.3 delivers complete hardware project deletion with dependency safeguards, streamlines new project onboarding with direct routing to the main window, and adds rapid BOM population shortcuts.

### What's New
- **Clone & Map Existing Components During iBOM Import**: When mapping imported iBOM rows to catalog parts, users can now search and select any existing component to clone as a template. The component creation modal opens pre-filled with the template's category, package, storage location, datasheet, and specifications alongside the BOM row's values and designators. Upon saving/updating, the newly created component is immediately mapped to the BOM row (and automatically suggested to matching rows). Accessible directly from each mapping row via the clone button (`mdi-content-copy`) or within the component picker table and footer ("Clone & Map").
- **Project Deletion with Dependency Safeguards**: Easily delete hardware projects directly from project cards, the BOM modal, the dedicated project page, or the project edit modal. A detailed confirmation dialog lists constituent BOM items and attached files, and atomically cascades removals across BOM and attachments without touching global catalog components.
- **Immediate Navigation to New Projects**: Creating a new hardware project now instantly routes the user to its dedicated main project detail window (`/projects/:id`) instead of staying on the projects gallery grid.
- **BOM Empty State Quick Actions**: New projects without components now display an enhanced empty state with prominent "Add Component" and "Import iBOM" action buttons to rapidly start building the Bill of Materials.
- **Real-Time Shopping List Navigation Counter**: Added live badge updates to the left navigation drawer "Shopping list" menu item that immediately update when components are added or removed without requiring a full page refresh.
- **BOM Table Action Button Alignment & Cleanup**: Action column buttons in the Bill of Materials table are now strictly aligned in fixed horizontal slots so action buttons line up predictably across all rows, and removed the redundant inline info button.

---

## Version 0.2.2 (September 2026)

### Summary
Version 0.2.2 delivers catalog management for packages and categories, rapid in-place creation during component cataloging, safe component deletion with project Bill of Materials dependencies warnings, and responsive layout improvements to the Projects gallery.

### What's New
- **Package & Footprint Management (CRUD)**: Dedicated management dialog to create, edit, inspect component usage counts, and delete footprints with mount technology filters (ALL / SMD / THT) and drawing links.
- **Package Footprint Alignment & Direct Drawing Upload**: Aligned Pin/Pad Count input and Mount Technology toggle to matching 48px baseline heights, and added direct image file upload (`media/packages/`) with live thumbnail previews.
- **Category Taxonomy Management (CRUD)**: Full interface to create, rename, and safely delete categories with automated in-use component safeguards.
- **In-Place Creation from "Add Component" Modal**: Added 1-click `+` quick-creation buttons inside the Category and Package fields of the component form, automatically refreshing and selecting the new item immediately.
- **Safe Component Deletion & Project Usage Warnings**: Added component deletion from both the catalog table and component details popup. If a component is used in any project's Bill of Materials, a detailed warning lists all affected projects, required quantities, and reference designators before confirmation.
- **3-Column Project Grid**: Reorganized the hardware projects gallery from 4 columns to 3 columns on desktop displays, providing wider card footprints and better breathing room.
- **Clickable Component Photos & Reusable Full-Size Lightbox**: Component photos in the details dialog are now clickable to view in high resolution with aspect-ratio fitting and "Open Original" action. Reused this unified lightbox across project covers, BOM component thumbnails, shopping list items, and package drawings.
- **Component Editing across Catalog and Details Views**: Full support for editing existing components. Easily update component name, marking, category, package footprint, stock quantity, minimum threshold, storage location, datasheet, and photo. Pre-fills all existing specifications and syncs warehouse storage allocations atomically. Accessible via the table row action icon (`mdi-pencil-outline`) in the components catalog and via the "Edit" action button in the Component Details modal.
- **Component Cloning**: Quickly spawn the "Add New Component" modal pre-filled with all values and specifications from an existing component. Available via the "Clone Component" button inside the Edit Component modal (in header and footer actions), as a dedicated action icon (`mdi-content-copy`) in the catalog table rows, and in the Component Details modal footer. Pre-populates all parameters with an automatic copy name suggestion and dedicated helper banner.
- **Standardized Left-Aligned "Actions" Headers**: Aligned the "Actions" column header and buttons to the left across all data tables (Components Catalog, Project BOM, Projects View BOM modal, Procurement Shopping List, Production Reports, Project File Attachments, and Component Details BOM usage) for unified layout consistency.
- **Streamlined Top App Bar**: Removed the redundant "Upload Media" button from the top application bar, decluttering the header navigation while relying on context-specific inline file uploaders.
- **Clean Quantity Steppers**: Suppressed native browser up/down number spin buttons in the Procurement Shopping List's "Quantity to Buy" stepper (and modal steppers), leaving only the clean `+`, `-`, and numeric value inputs.
- **Enhanced Project Card Chips**: Increased chip font size, padding, and icon scales across all project cards (BOM parts, total pcs, estimated cost, absent shortages, attached files, and iBOM indicators) for improved legibility and clarity.

---

## Version 0.2.1 (September 2026)

### Summary
Version 0.2.1 introduces the comprehensive "Produce" manufacturing workflow and dedicated Reports dashboard. Users can produce projects in custom quantities with automatic inventory stock deductions, view detailed production history logs, and cancel production runs with 1-click inventory restoration back to warehouse storage.

### What's New
- **Project Production Workflow**: Select any project from cards, the BOM modal, or dedicated project page, and specify how many units to produce.
- **Automated Stock Deduction**: Automatically decreases component stock in your catalog based on the project's Bill of Materials in a safe, atomic database transaction.
- **Real-Time Deduction Preview**: Live calculation table displaying required unit counts, batch requirements, current stock, and remaining quantities after production.
- **Shortage Detection & Instant Shopping List**: Detects stock shortages before production, highlights missing parts, and provides a 1-click action to add all missing quantities to your procurement shopping list.
- **Flexible Production Policies**: Option to proceed with production even when stock is currently insufficient for physical assembly logging.
- **Production History & Reports**: Dedicated Reports screen accessible from the left navigation drawer with KPI metric cards, searchable manufacturing logs, and filtering by project and status.
- **1-Click Production Cancellation & Stock Restoration**: Cancel any previous production run to automatically restore the exact deducted component quantities back to storage inventory.
- **Financial Insights & Purchase History**: Inspect historical purchase orders from `t_orders`, latest purchase prices, weighted average unit costs, and supplier links directly in component details.
- **Project BOM Cost Calculation**: Real-time calculation of project build costs based on latest purchase prices, showing per-item unit price and total cost columns in the Bill of Materials.
- **Production Batch Cost Estimation**: Live financial calculation of total material costs for any selected batch size in the production workflow.
- **Shopping List Purchase Confirmation & Order Logging**: Confirm purchases directly from the procurement shopping list with live order calculation, logging new records into `t_orders`, updating catalog inventory stock, and automatically clearing purchased items.
- **Redesigned Shopping List**: Fully compliant with component details pop-ups, clickable package specifications, photo lightbox previews, filter search toolbar, KPI procurement metrics, vertically aligned quantity steppers, and chipless color-coded stock typography.
- **Minimal Acceptable Quantity (Min Qty)**: Configurable threshold (0 by default, fully user-editable inline in the table, in the component details dialog, or during component creation) to track critical stock safety margins.
- **Inline Stock Quantity Editing**: Directly edit on-hand inventory quantities in the catalog table or details dialog with real-time persistence, automatic shortage/low-stock row updates, and color-coded text.
- **Stock Status Filtering**: Quick filter in the components list to show Absent (0), Near to End (low stock), Absent or ≤ Min Qty, or In Stock components.
- **Component Details Tabbed Navigation & Project Usage**: Tabbed modal view (*Overview & Specs*, *Used in Projects*, and *Purchases & Pricing*) showing full BOM project usage, required batch quantities, reference designators, and 1-click project navigation without cluttering the screen.
- **Streamlined Table Actions & Inline PDF Link**: Relocated the datasheet PDF icon directly beside the component marking in the Part Name column and removed redundant (i) info buttons from Actions for a cleaner, higher-density view.
- **Component Details Direct Purchase Action**: Added a prominent "Buy" button on the *Purchases & Pricing* tab and in the modal footer right beside "Add to Shopping List" that re-uses the full purchase confirmation dialog to log orders in `t_orders`, update catalog inventory, and instantly refresh pricing insights.
- **Unified 1-Click Purchase Action**: Standardized the dedicated "Buy Component" icon button (`mdi-cash-check`, primary color) directly in the table actions across both the **Components Catalog** and the **Shopping List**, maintaining visual consistency and compact row heights.
- **Bi-Directional Order Pricing Calculation**: In the purchase confirmation modal, users can define either **Unit Price** or total **Order Sum**. Entering an order sum automatically re-calculates the per-unit price (`orderSum / qty`), and changing quantities preserves the user's input focus with real-time recalculations.
- **Kit Order Memory & Clear Action**: Rapidly catalog sample books and multi-value kits (e.g. capacitor/resistor kits) with automatic order value persistence. Opening subsequent component purchases preserves previous order quantities, lot pricing, store notes, URLs, and warehouse storage locations, with 1-click **Clear** actions to reset remembered values anytime.

---

## Version 0.2.0 (September 2026)

### Summary
Version 0.2.0 adds project file attachments, KiCAD Interactive BOM viewing, smart BOM importing with automatic part matching, and component details pop-ups throughout the workflow.

### What's New
- **Project File Attachments**: Attach and download files (CAD schematics, firmware binaries, Gerber archives, datasheets, and KiCAD files) directly inside any project.
- **KiCAD Interactive BOM Viewer**: Open and explore interactive PCB layouts directly in your browser with 1-click launch from project attachments.
- **Smart BOM Importer**: Import parts from KiCAD iBOM files with automatic component matching against your catalog, consolidated quantities, and sorted reference designators.
- **In-Place Component Creation**: Quickly catalog missing components during BOM import with pre-filled category, package, marking, and descriptions.
- **Component Details Pop-up**: Click any component name in the "Add Component to BOM" dialog or catalog to view stock, warehouse box locations, photos, and datasheets.

---

## Version 0.1.3 (September 2026)

### Summary
Version 0.1.3 introduces local media storage and uploading, project creation and editing, part shortage tracking in the gallery, and photo lightbox previews.

### What's New
- **Built-In Media Storage**: Component photos, package drawings, and datasheets are now stored and served directly by the application.
- **Easy Media Uploads**: Upload component photos, datasheets, and drawings with live previews from the top bar or directly inside edit dialogs.
- **Project Management**: Create and edit hardware projects directly from the gallery with real-time photo previews.
- **Part Shortage Indicators**: Project cards highlight missing components with clear shortage badges so you know what needs ordering.
- **Photo Lightbox Preview**: Click any project photo or component thumbnail to view it in full resolution scaled to your screen.
