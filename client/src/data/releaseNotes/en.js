export const releasesEn = [
  {
    version: '0.3.0',
    date: '2026-09-24',
    isCurrent: true,
    summary: 'Version 0.3.0 delivers multi-currency support with automated exchange rate recalculations, introduces the dynamic table action columns alignment and gap elimination rule, redesigns the Purchase Confirmation modal, and expands full Ukrainian localization.',
    features: [
      {
        icon: 'mdi-currency-usd',
        color: 'primary',
        title: 'Multi-Currency Orders & Real-Time Exchange Rates',
        description: 'Configure your primary operating currency (USD, EUR, UAH, PLN) and up to 3 additional secondary currencies in Settings. Choose order currencies with live conversion breakdown, dynamic currency symbols, and dedicated exchange rate tracking.'
      },
      {
        icon: 'mdi-calculator',
        color: 'teal',
        title: 'Nearest-Date Exchange Rate Matching & Order Recalculation',
        description: 'Orders are accurately recalculated to the base operating currency using the nearest historical exchange rate to the order date (ABS(DATEDIFF)), keeping BOM estimates, component metrics, and purchases reports financially accurate.'
      },
      {
        icon: 'mdi-view-column-outline',
        color: 'amber-darken-3',
        title: 'Action Columns Alignment & Dynamic Gap Elimination',
        description: 'When conditional actions (Cancel Order, Confirm Delivery, Add to Basket) are not relevant for any items in the visible table, columns collapse dynamically with 0 whitespace gap. When available in at least one row, inactive light-grey buttons preserve strict vertical alignment across all rows.'
      },
      {
        icon: 'mdi-window-maximize',
        color: 'indigo',
        title: 'Redesigned Purchase Confirmation Modal',
        description: 'Widened modal window to 850px, replaced supplier quick-chips with a full-width Notes input, streamlined clean pricing fields without caption clutter, and placed inventory stock checkbox inline with delivery status.'
      },
      {
        icon: 'mdi-cancel',
        color: 'error',
        title: 'Awaiting Order Cancellation Workflow',
        description: 'Cancel orders in "Waiting for delivery" status with 1-click option to restore part shortages back into the Shopping List, custom cancellation notes, and filtered metrics in the Purchases Report.'
      },
      {
        icon: 'mdi-translate',
        color: 'purple',
        title: 'Localization Parity & Purchases Date Translation',
        description: 'Fixed missing date column translation in Component Details "Purchases & Pricing" tab, synchronized 100% key parity between English and Ukrainian, and introduced multi-language Release Notes.'
      }
    ]
  },
  {
    version: '0.2.7',
    date: '2026-09-19',
    isCurrent: false,
    summary: 'Version 0.2.7 introduces flexible Bill of Materials (BOM) component substitutions and analogs, smart shortage indicators, one-click primary component swapping, and production run substitute allocation.',
    features: [
      {
        icon: 'mdi-swap-horizontal',
        color: 'primary',
        title: 'BOM Component Analogs & Substitutions',
        description: 'Assign functional or drop-in substitute parts to any project BOM item with engineering notes explaining compatibility contexts (e.g. SN74LS04 replaced with SN74HC04).'
      },
      {
        icon: 'mdi-card-text-outline',
        color: 'indigo',
        title: 'Interactive Analogs Management Modal',
        description: 'Manage analogs directly from the BOM table with live stock status indicators, note editing, and one-click removal.'
      },
      {
        icon: 'mdi-arrow-decision',
        color: 'teal',
        title: 'One-Click Primary Component Swap',
        description: 'Easily swap any analog component to become the primary BOM part while demoting the existing component into an analog, preserving all designators and quantities.'
      },
      {
        icon: 'mdi-alert-circle-outline',
        color: 'amber-darken-3',
        title: 'Smart Shortage Indicators',
        description: 'BOM table highlights items with an active shortage that have in-stock analogs available to fulfill the build.'
      },
      {
        icon: 'mdi-factory',
        color: 'success',
        title: 'Production Run Substitute Allocation',
        description: 'Produce assemblies even with missing primary components by selecting available analogs during the production run, accurately deducting stock and recording the substitute in production history.'
      }
    ]
  },
  {
    version: '0.2.6',
    date: '2026-09-19',
    isCurrent: false,
    summary: 'Version 0.2.6 brings bug fixes and UI refinements to the component catalog, ensuring short descriptions are consistently displayed across component lists.',
    features: [
      {
        icon: 'mdi-text-box-outline',
        color: 'primary',
        title: 'Component Catalog Description Display',
        description: 'The Description column in the Components list now always prioritizes displaying the short description for concise identification, while detailed specifications remain accessible in tooltips and the component details view.'
      },
      {
        icon: 'mdi-filter-cog-outline',
        color: 'amber-darken-3',
        title: 'Component Catalog Filters Fix',
        description: 'Resolved template variable binding issues for the Project autocomplete and Stock status dropdowns, restoring full filtering functionality with interactive icons, clearable controls, and multi-language support.'
      }
    ]
  },
  {
    version: '0.2.5',
    date: '2026-09-18',
    isCurrent: false,
    summary: 'Version 0.2.5 introduces complete multi-language interface capabilities powered by JSON localization files, adding a full Ukrainian translation alongside existing English with persistent user language preferences.',
    features: [
      {
        icon: 'mdi-translate',
        color: 'primary',
        title: 'Multi-Language Architecture with JSON Files',
        description: 'Standardized translation dictionaries in structured JSON format (locales/en.json and locales/uk.json), making adding new languages straightforward and maintainable.'
      },
      {
        icon: 'mdi-flag-outline',
        color: 'blue',
        title: 'Full Ukrainian Interface Translation',
        description: 'Comprehensive Ukrainian localization tailored for electronics engineering terminology, bill of materials management, component taxonomy, and production reporting.'
      },
      {
        icon: 'mdi-sync',
        color: 'teal',
        title: 'Synchronized Vuetify 3 Internationalization',
        description: 'Configured Vuetify 3 vue-i18n adapter to automatically sync internal Vuetify components (data table pagination, dialogs, form validation) with the active language.'
      },
      {
        icon: 'mdi-web',
        color: 'indigo',
        title: 'Interactive Language Switcher',
        description: 'Convenient 1-click language switcher in the top App Bar and dedicated Language settings section in SettingsView, saved to localStorage for seamless persistence.'
      }
    ]
  },
  {
    version: '0.2.4',
    date: '2026-09-18',
    isCurrent: false,
    summary: 'Version 0.2.4 introduces dual-database engine support (MySQL & SQLite) for fully autonomous self-hosted deployments, a dedicated Settings view with live database and media diagnostics, and prepared containerization artifacts for publication.',
    features: [
      {
        icon: 'mdi-database',
        color: 'primary',
        title: 'Autonomous Self-Hosted Deployment with SQLite 3',
        description: 'Deploy BOM Manager with zero external database dependencies. When run with SQLite, all tables are automatically initialized, WAL mode is configured for fast concurrent performance, and initial electronics taxonomies are seeded.'
      },
      {
        icon: 'mdi-database-sync',
        color: 'indigo',
        title: 'Dual Database Architecture (MySQL & SQLite)',
        description: 'Switch easily between embedded SQLite and external MySQL / MariaDB via the DB_TYPE environment variable. Existing installations retain full backward compatibility.'
      },
      {
        icon: 'mdi-cog-outline',
        color: 'slate-700',
        title: 'Dedicated Settings View (/settings)',
        description: 'New comprehensive settings screen with active database connection info, real-time catalog entity counters, deployment guides, media asset path configuration (t_config), and live database ping diagnostics.'
      },
      {
        icon: 'mdi-docker',
        color: 'blue-darken-2',
        title: '1-Command Autonomous Docker Compose',
        description: 'Streamlined Docker Compose deployment with persistent /app/data and /app/media volumes, running instantly with "docker compose up -d".'
      },
      {
        icon: 'mdi-code-braces',
        color: 'teal',
        title: 'Cross-Database ANSI SQL Compatibility',
        description: 'Unified database queries across all route endpoints to standard ANSI SQL with custom scalar functions (NOW, GREATEST, LEAST, CONCAT) for seamless operation on both engines.'
      }
    ]
  },
  {
    version: '0.2.3',
    date: '2026-09-18',
    isCurrent: false,
    summary: 'Version 0.2.3 delivers complete project deletion with dependency safeguards, streamlines new project onboarding with direct routing to the main window, and adds rapid BOM population shortcuts.',
    features: [
      {
        icon: 'mdi-content-copy',
        color: 'indigo',
        title: 'Clone & Map Existing Component during iBOM Import',
        description: 'During iBOM component mapping, search and clone any existing catalog component as a template. Edit any parameters, packages, or storages in-place and immediately map the newly created component to the BOM item.'
      },
      {
        icon: 'mdi-delete-alert-outline',
        color: 'error',
        title: 'Project Deletion with Dependency Safeguards',
        description: 'Delete hardware projects directly from project cards, the BOM modal, project detail page, or edit form with an atomic cascade across BOM items and attachment files.'
      },
      {
        icon: 'mdi-arrow-right-bold-circle-outline',
        color: 'primary',
        title: 'Immediate Navigation to New Projects',
        description: 'Creating a new hardware project now instantly opens its dedicated main detail page instead of remaining on the projects gallery grid.'
      },
      {
        icon: 'mdi-plus-circle-outline',
        color: 'success',
        title: 'BOM Empty State Quick Actions',
        description: 'New projects feature prominent "Add Component" and "Import iBOM" buttons in the Bill of Materials table empty state to rapidly start populating components.'
      },
      {
        icon: 'mdi-cart-outline',
        color: 'amber-darken-3',
        title: 'Real-Time Shopping List Navigation Counter',
        description: 'The left sidebar Shopping list menu badge automatically reflects component additions and removals in real-time without needing a manual refresh.'
      }
    ]
  },
  {
    version: '0.2.2',
    date: '2026-09-18',
    isCurrent: false,
    summary: 'Version 0.2.2 delivers catalog management for packages and categories, rapid in-place creation during component cataloging, safe component deletion with project Bill of Materials dependencies warnings, and responsive layout improvements to the Projects gallery.',
    features: [
      {
        icon: 'mdi-package-variant',
        color: 'primary',
        title: 'Packages & Footprints Management (CRUD)',
        description: 'Dedicated management modal to create, edit, inspect component usage counts, and delete footprints with mount technology filters (ALL / SMD / THT).'
      },
      {
        icon: 'mdi-shape-outline',
        color: 'indigo',
        title: 'Categories Management (CRUD)',
        description: 'Full interface to create, rename, and safely delete categories with automated in-use component safeguards.'
      },
      {
        icon: 'mdi-plus-box-outline',
        color: 'success',
        title: 'In-Place Creation in "Add Component" Modal',
        description: 'Added quick-create buttons inside the Category and Package fields of the component creation form, automatically refreshing and selecting the new item.'
      },
      {
        icon: 'mdi-shield-check-outline',
        color: 'teal',
        title: 'Safe Component Deletion & Project Warnings',
        description: 'Delete components with automatic dependency checks. Affected projects, required quantities, and reference designators are clearly listed before confirmation.'
      },
      {
        icon: 'mdi-view-grid-outline',
        color: 'slate-700',
        title: '3-Column Responsive Grid',
        description: 'Arranged hardware project cards in 3 columns on desktop screens for wider cards, better spacing, and improved overall balance.'
      }
    ]
  },
  {
    version: '0.2.1',
    date: '2026-09-18',
    isCurrent: false,
    summary: 'Version 0.2.1 introduces the "Produce" workflow for hardware projects, automatically calculating required quantities, previewing component inventory deductions, highlighting shortages, and decrementing stock levels in real time.',
    features: [
      {
        icon: 'mdi-cog-play-outline',
        color: 'primary',
        title: 'Project Production Workflow',
        description: 'Specify how many units you want to build and let the system calculate the complete component requirements from the Bill of Materials.'
      },
      {
        icon: 'mdi-database-minus-outline',
        color: 'indigo',
        title: 'Automatic Stock Deduction',
        description: 'Executing a production run automatically deducts the necessary part quantities from in-stock warehouse inventory in a single database transaction.'
      },
      {
        icon: 'mdi-clipboard-list-outline',
        color: 'teal',
        title: 'Production History & Reports',
        description: 'Dedicated Reports dashboard accessible from the main navigation with KPI metrics, searchable manufacturing logs, and filtering by project or status.'
      },
      {
        icon: 'mdi-cash-register',
        color: 'success',
        title: 'Shopping List Purchase Confirmation & Order Creation',
        description: 'Confirm component purchases directly from the shopping list to log new orders in t_orders, automatically increment on-hand inventory stock, and update the shopping list.'
      }
    ]
  },
  {
    version: '0.2.0',
    date: '2026-09-17',
    isCurrent: false,
    summary: 'Version 0.2.0 adds project file attachments, KiCAD Interactive BOM viewing, smart BOM importing with automatic part matching, and component details pop-ups throughout the workflow.',
    features: [
      {
        icon: 'mdi-paperclip',
        color: 'primary',
        title: 'Project File Attachments',
        description: 'Attach and download files (CAD schematics, firmware binaries, Gerber archives, datasheets, and KiCAD files) directly inside any project.'
      },
      {
        icon: 'mdi-chip',
        color: 'success',
        title: 'KiCAD Interactive BOM Viewer',
        description: 'Open and explore interactive PCB layouts directly in your browser with 1-click launch from project attachments.'
      },
      {
        icon: 'mdi-database-import-outline',
        color: 'indigo',
        title: 'Smart BOM Importer',
        description: 'Import parts from KiCAD iBOM files with automatic component matching against your catalog, consolidated quantities, and sorted reference designators.'
      },
      {
        icon: 'mdi-information-outline',
        color: 'teal',
        title: 'Component Details Pop-up',
        description: 'Click any component name in the "Add Component to BOM" dialog or catalog to view stock, warehouse box locations, photos, and datasheets.'
      }
    ]
  },
  {
    version: '0.1.3',
    date: '2026-09-17',
    isCurrent: false,
    summary: 'Version 0.1.3 introduces local media storage and uploading, project creation and editing, part shortage tracking in the gallery, and photo lightbox previews.',
    features: [
      {
        icon: 'mdi-folder-image',
        color: 'primary',
        title: 'Built-In Media Storage & Uploads',
        description: 'Component photos, package drawings, and datasheets are stored and served directly by the application with real-time drag-and-drop uploads.'
      },
      {
        icon: 'mdi-image-filter-center-focus',
        color: 'teal',
        title: 'Photo Lightbox Preview',
        description: 'Click any project photo or component thumbnail to view it in full resolution scaled to your screen.'
      }
    ]
  }
];
