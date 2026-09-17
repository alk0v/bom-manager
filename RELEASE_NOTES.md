# Release Notes - BOM Manager

## Version 0.1.3 (2026-09-17)

### Summary
Version 0.1.3 brings self-hosted media storage and serving, media file uploads, project management (creating and editing projects), shortage tracking in the gallery, and enhanced media preview capabilities.

### Key Changes & Features

#### 1. Self-Hosted Local Media Serving
- Removed dependency on external media server (`http://192.168.31.122:8085`).
- The BOM Manager backend server now directly serves media assets from the local `./media` directory under `/media/`.
- Automatic directory scaffolding for the 4 core media folders: `packages/`, `components/`, `datasheets/`, and `projects/`.
- Transparent fallback alias support for `projects` $\leftrightarrow$ `projecs` folder spellings.
- Proper HTTP 404 responses for missing assets to trigger frontend placeholders cleanly without falling back to SPA HTML.
- Updated Docker configuration with volume mapping (`./media:/app/media`).

#### 2. Media File Uploads
- Added `POST /api/media/upload` endpoint powered by `multer` with sanitization and directory traversal prevention.
- Added in-place upload buttons directly inside project and component creation/edit dialogs.
- Added a global **Upload Media** modal dialog in the top navigation bar for uploading assets to any target folder (`packages`, `components`, `datasheets`, `projects`) with live preview and clipboard copy.

#### 3. Project Management (Add & Edit)
- Implemented `ProjectFormDialog` component for adding new hardware engineering projects and editing existing project details.
- Real-time photo preview as filenames or URLs are typed or uploaded.
- Added "+ New Project" action in the gallery header, edit buttons on gallery cards, and in-place editing on the dedicated project page.

#### 4. Absent Parts Shortage Badges
- Enhanced backend project aggregation query to calculate missing/shortage items in each project's Bill of Materials.
- Added an **Absent Parts Chip** to every card in the project gallery:
  - Highlights parts shortages with an alert badge (e.g. `2 absent`).
  - Highlights complete BOM builds with a green badge (`0 absent`).
- Added a header summary chip displaying the total number of projects with shortages.

#### 5. Enhanced Gallery & Media Viewing Navigation
- Clicking anywhere on a project card in the gallery now opens the dedicated full page (`/projects/:id`).
- Clicking the "View BOM" button opens the quick pop-up BOM modal dialog as before.
- On the full project page, clicking project photos or component thumbnails opens a clean lightbox modal.
- Images scale proportionally to fit the viewport without scrollbars.
- Strict adherence to the application's clean, crisp light theme design.
