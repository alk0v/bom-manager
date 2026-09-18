# Release Notes - BOM Manager

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
