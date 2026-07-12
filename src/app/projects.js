import { normalizeFavorite } from './favorites';
import { normalizeArchitecturePlan } from '../features/architectureSetup/architectureState.js';

export function createEmptyProject(name = '') {
  const now = new Date().toISOString();
  return {
    id: `project-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: name.trim() || `未命名项目 ${new Date().toLocaleString()}`,
    createdAt: now,
    updatedAt: now,
    snapshot: null,
  };
}

export function normalizeProjectSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const normalizedState = snapshot.state && typeof snapshot.state === 'object'
    ? {
      ...snapshot.state,
      architecturePlan: normalizeArchitecturePlan(snapshot.state.architecturePlan || {}),
    }
    : undefined;

  return {
    ...snapshot,
    ...(normalizedState ? { state: normalizedState } : {}),
  };
}

export function normalizeProject(project) {
  if (!project || typeof project !== 'object') return null;
  const id = String(project.id || '').trim();
  const name = String(project.name || '').trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || project.createdAt || new Date().toISOString(),
    snapshot: normalizeProjectSnapshot(project.snapshot),
  };
}

export function normalizeImportDataPackage(payload, activeProjectId = '') {
  if (!payload || typeof payload !== 'object') {
    throw new Error('JSON 文件内容不是有效的数据对象');
  }

  const projectsPayload = Array.isArray(payload.projects) ? payload.projects : [];
  const favoritesPayload = Array.isArray(payload.favorites) ? payload.favorites : [];
  if (!projectsPayload.length && !favoritesPayload.length) {
    throw new Error('JSON 中没有可导入的 projects 或 favorites 数据');
  }

  const projectsToImport = projectsPayload.map((project) => normalizeProject(project)).filter(Boolean);
  const favoritesToImport = favoritesPayload.map((item) => normalizeFavorite(item)).filter(Boolean);
  if (!projectsToImport.length && !favoritesToImport.length) {
    throw new Error('JSON 数据格式不符合当前数据库结构');
  }

  const activeId = projectsToImport.some((project) => project.id === payload.activeProjectId)
    ? payload.activeProjectId
    : activeProjectId;

  return {
    projects: projectsToImport,
    favorites: favoritesToImport,
    activeProjectId: activeId,
  };
}
