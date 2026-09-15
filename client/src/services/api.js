import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

let mediaConfig = {
  mediaBaseUrl: 'http://192.168.31.122:8085',
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
  createComponent: (data) => client.post('/components', data).then(res => res.data),
  updateComponent: (id, data) => client.put(`/components/${id}`, data).then(res => res.data),

  // Categories & Packages
  getCategories: () => client.get('/categories').then(res => res.data),
  getPackages: () => client.get('/packages').then(res => res.data),

  // Shopping List
  getShoppingList: () => client.get('/shopping-list').then(res => res.data),
  addToShoppingList: (data) => client.post('/shopping-list', data).then(res => res.data),
  updateShoppingListItem: (id, data) => client.put(`/shopping-list/${id}`, data).then(res => res.data),
  deleteShoppingListItem: (id) => client.delete(`/shopping-list/${id}`).then(res => res.data),
};

export default api;
