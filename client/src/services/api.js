import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

let mediaConfig = {
  mediaBaseUrl: '/media',
  projectPhotoFolder: 'projects/',
  componentPhotoFolder: 'components/',
  packagePhotoFolder: 'packages/',
  datasheetFolder: 'datasheets/'
};

// Fetch config from server on load
export const fetchMediaConfig = async () => {
  try {
    const res = await client.get('/config');
    mediaConfig = { ...mediaConfig, ...res.data };
  } catch (err) {
    console.warn('Using default media config:', err.message);
  }
  return mediaConfig;
};

// Build URL for photos and datasheets
export const resolveMediaUrl = (type, filename) => {
  if (!filename) return null;
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  if (filename.startsWith('/media/')) {
    return filename;
  }
  if (filename.startsWith('media/')) {
    return `/${filename}`;
  }

  const base = (mediaConfig.mediaBaseUrl || '').replace(/\/+$/, '');
  let folder = '';

  switch (type) {
    case 'project':
      folder = mediaConfig.projectPhotoFolder || 'projects/';
      break;
    case 'component':
      folder = mediaConfig.componentPhotoFolder || 'components/';
      break;
    case 'package':
      folder = mediaConfig.packagePhotoFolder || 'packages/';
      break;
    case 'datasheet':
      folder = mediaConfig.datasheetFolder || 'datasheets/';
      break;
  }

  const cleanFolder = folder.replace(/^\/+/, '').replace(/\/+$/, '');
  const cleanFile = filename.replace(/^\/+/, '');
  return `${base}/${cleanFolder}/${cleanFile}`;
};

export const api = {
  // Projects
  getProjects: () => client.get('/projects').then(res => res.data),
  getProject: (id) => client.get(`/projects/${id}`).then(res => res.data),
  getProjectBom: (id) => client.get(`/projects/${id}/bom`).then(res => res.data),
  addComponentToBom: (projectId, data) => client.post(`/projects/${projectId}/bom`, data).then(res => res.data),
  updateBomItem: (projectId, bomId, data) => client.put(`/projects/${projectId}/bom/${bomId}`, data).then(res => res.data),
  deleteBomItem: (projectId, bomId) => client.delete(`/projects/${projectId}/bom/${bomId}`).then(res => res.data),
  createProject: (data) => client.post('/projects', data).then(res => res.data),
  updateProject: (id, data) => client.put(`/projects/${id}`, data).then(res => res.data),
  deleteProject: (id) => client.delete(`/projects/${id}`).then(res => res.data),
  produceProject: (id, data) => client.post(`/projects/${id}/produce`, data).then(res => res.data),

  // Project Files & Attachments
  getProjectFiles: (projectId) => client.get(`/projects/${projectId}/files`).then(res => res.data),
  uploadProjectFile: (projectId, formData) => client.post(`/projects/${projectId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  deleteProjectFile: (projectId, fileId) => client.delete(`/projects/${projectId}/files/${fileId}`).then(res => res.data),

  // KiCAD iBOM Parsing and Import
  parseIbom: (projectId, data, isFormData = false) => client.post(
    `/projects/${projectId}/bom/parse-ibom`,
    data,
    isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}
  ).then(res => res.data),
  importIbom: (projectId, payload) => client.post(`/projects/${projectId}/bom/import-ibom`, payload).then(res => res.data),

  // Components
  getComponents: (params = {}) => {
    const cleanParams = { ...params };
    if (Array.isArray(cleanParams.categoryIds)) {
      cleanParams.categoryIds = cleanParams.categoryIds.join(',');
    }
    if (Array.isArray(cleanParams.packageIds)) {
      cleanParams.packageIds = cleanParams.packageIds.join(',');
    }
    return client.get('/components', { params: cleanParams }).then(res => res.data);
  },
  getComponent: (id) => client.get(`/components/${id}`).then(res => res.data),
  checkExistingComponent: (params) => client.get('/components/check-existing', { params }).then(res => res.data),
  createComponent: (data) => client.post('/components', data).then(res => res.data),
  updateComponent: (id, data) => client.put(`/components/${id}`, data).then(res => res.data),
  updateComponentMinQty: (id, minQty) => client.patch(`/components/${id}/min-qty`, { minQty }).then(res => res.data),
  updateComponentQty: (id, qty) => client.patch(`/components/${id}/qty`, { qty }).then(res => res.data),
  purchaseComponent: (id, data) => client.post(`/components/${id}/purchase`, data).then(res => res.data),
  getComponentUsage: (id) => client.get(`/components/${id}/usage`).then(res => res.data),
  deleteComponent: (id, force = false) => client.delete(`/components/${id}`, { params: { force } }).then(res => res.data),

  // Categories, Packages & Storages
  getCategories: () => client.get('/categories').then(res => res.data),
  createCategory: (data) => client.post('/categories', data).then(res => res.data),
  updateCategory: (id, data) => client.put(`/categories/${id}`, data).then(res => res.data),
  deleteCategory: (id, force = false) => client.delete(`/categories/${id}`, { params: { force } }).then(res => res.data),

  getPackages: () => client.get('/packages').then(res => res.data),
  createPackage: (data) => client.post('/packages', data).then(res => res.data),
  updatePackage: (id, data) => client.put(`/packages/${id}`, data).then(res => res.data),
  deletePackage: (id, force = false) => client.delete(`/packages/${id}`, { params: { force } }).then(res => res.data),

  getStorages: () => client.get('/storages').then(res => res.data),

  // Shopping List
  getShoppingList: () => client.get('/shopping-list').then(res => res.data),
  addToShoppingList: (data) => client.post('/shopping-list', data).then(res => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('shopping-list-updated'));
    return res.data;
  }),
  updateShoppingListItem: (id, data) => client.put(`/shopping-list/${id}`, data).then(res => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('shopping-list-updated'));
    return res.data;
  }),
  deleteShoppingListItem: (id) => client.delete(`/shopping-list/${id}`).then(res => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('shopping-list-updated'));
    return res.data;
  }),
  purchaseShoppingListItem: (id, data) => client.post(`/shopping-list/${id}/purchase`, data).then(res => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('shopping-list-updated'));
    return res.data;
  }),

  // Reports
  getProductionReport: (params = {}) => client.get('/reports/production', { params }).then(res => res.data),
  getProductionReportDetails: (id) => client.get(`/reports/production/${id}`).then(res => res.data),
  cancelProductionRun: (id) => client.post(`/reports/production/${id}/cancel`).then(res => res.data),

  // Media upload
  uploadMedia: (folder, file, filename) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    if (filename) {
      formData.append('filename', filename);
    }
    return client.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(res => res.data);
  }
};

export default api;
