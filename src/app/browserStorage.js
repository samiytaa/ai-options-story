import {
  ACTIVE_PROJECT_STORAGE,
  FAVORITES_STORAGE,
  FAVORITE_TABS,
  PROJECTS_STORAGE,
  SIDEBAR_STATE_STORAGE,
  WIND_VANE_FILE_STORAGE,
} from './constants';

function safeJsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeFavorite(item) {
  if (!item || typeof item !== 'object') return null;
  const type = FAVORITE_TABS.some((tab) => tab.value === item.type) ? item.type : 'brainhole';
  const payload = item.payload && typeof item.payload === 'object' ? safeJsonClone(item.payload) : null;
  const content = String(
    item.content ||
    payload?.idea ||
    payload?.desc ||
    payload?.choice?.option ||
    payload?.text ||
    '',
  ).trim();
  if (!content) return null;

  return {
    id: String(item.id || `fav-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    type,
    title: String(item.title || FAVORITE_TABS.find((tab) => tab.value === type)?.label || '收藏').trim(),
    content,
    note: String(item.note || payload?.fit || payload?.choice?.result || '').trim(),
    payload,
    projectId: item.projectId || '',
    projectName: item.projectName || '',
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

function normalizeProject(project) {
  if (!project || typeof project !== 'object') return null;
  const id = String(project.id || '').trim();
  const name = String(project.name || '').trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || project.createdAt || new Date().toISOString(),
    snapshot: project.snapshot || null,
  };
}

export function loadSidebarState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SIDEBAR_STATE_STORAGE) || '{}');
    return {
      left: Boolean(saved.left),
      right: Boolean(saved.right),
    };
  } catch {
    return {
      left: false,
      right: false,
    };
  }
}

export function readBrowserFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_STORAGE) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.map((item) => normalizeFavorite(item)).filter(Boolean);
  } catch {
    return [];
  }
}

export function readBrowserProjects() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROJECTS_STORAGE) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.map((project) => normalizeProject(project)).filter(Boolean);
  } catch {
    return [];
  }
}

export function readBrowserActiveProjectId(projectList) {
  const savedId = localStorage.getItem(ACTIVE_PROJECT_STORAGE) || '';
  return projectList.some((project) => project.id === savedId) ? savedId : '';
}

export function clearMigratedBrowserStorage() {
  localStorage.removeItem(PROJECTS_STORAGE);
  localStorage.removeItem(ACTIVE_PROJECT_STORAGE);
  localStorage.removeItem(FAVORITES_STORAGE);
  localStorage.removeItem(WIND_VANE_FILE_STORAGE);
}
