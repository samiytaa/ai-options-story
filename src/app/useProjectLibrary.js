import { watch } from 'vue';
import { createInitialState, STAGES } from '../storyState';
import { normalizeApiConfig } from '../services/apiConfig';
import {
  createFavoriteRecord,
  createProjectRecord,
  deleteFavoriteRecord,
  deleteProjectRecord,
  fetchDatabaseState,
  importBrowserData,
  saveActiveProjectRecord,
  updateFavoriteRecord,
  updateProjectRecord,
} from '../services/databaseApi';
import { FAVORITE_TABS } from './constants';
import {
  clearMigratedBrowserStorage,
  readBrowserActiveProjectId,
  readBrowserFavorites,
  readBrowserProjects,
} from './browserStorage';
import {
  applyPromptConfigs,
  clearBrowserPromptConfigs,
  hasBrowserPromptConfigs,
  loadBrowserPromptConfigs,
} from './promptConfig';
import {
  createFavoriteDraft,
  favoriteDraftFromItem,
  favoritePayloadFromDraft,
  favoriteSummaryFromPayload,
  normalizeFavorite,
} from './favorites';
import {
  createEmptyProject,
  normalizeProjectSnapshot,
  normalizeImportDataPackage,
  normalizeProject,
} from './projects';

function safeJsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeStageView(stage) {
  if (stage === 'setup') return 'brainhole';
  return STAGES.includes(stage) ? stage : 'brainhole';
}

function defaultConfirm(message) {
  return window.confirm(message);
}

function downloadJson(filename, payload) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function useProjectLibrary(deps) {
  const {
    state,
    storyBlocks,
    windVaneFile,
    styleInput,
    projects,
    activeProjectId,
    isEditorOpen,
    favorites,
    activeFavoriteTab,
    newProjectName,
    manualFavoriteDraft,
    showAddFavoriteModal,
    editingFavoriteId,
    editingFavoriteDraft,
    activeStageView,
    theme,
    promptConfigs,
    isLeftPanelCollapsed,
    isRightPanelCollapsed,
    activeProjectName,
    hasActiveProject,
    editingFavoriteItem,
    resetChoiceSelection,
    resetEditing,
    resetAll,
    pushToast,
    confirm = defaultConfirm,
    autosaveDelay = 250,
  } = deps;

  let isRestoringProject = false;
  let projectSaveTimer = null;
  let isDatabaseReady = false;

  function applyDatabaseState(payload = {}) {
    projects.value = Array.isArray(payload.projects)
      ? payload.projects.map((project) => normalizeProject(project)).filter(Boolean)
      : [];
    favorites.value = Array.isArray(payload.favorites)
      ? payload.favorites.map((item) => normalizeFavorite(item)).filter(Boolean)
      : [];
    activeProjectId.value = projects.value.some((project) => project.id === payload.activeProjectId)
      ? payload.activeProjectId
      : '';
    if (Array.isArray(payload.promptConfigs)) {
      applyPromptConfigs(promptConfigs, payload.promptConfigs);
    }
  }

  function upsertLocalProject(project) {
    const normalized = normalizeProject(project);
    if (!normalized) return;
    const index = projects.value.findIndex((item) => item.id === normalized.id);
    if (index >= 0) {
      projects.value.splice(index, 1, normalized);
    } else {
      projects.value = [normalized, ...projects.value];
    }
  }

  async function setActiveProject(projectId) {
    activeProjectId.value = projectId;
    if (isDatabaseReady) {
      await saveActiveProjectRecord(projectId);
    }
  }

  function snapshotCurrentProjectData() {
    const stateSnapshot = safeJsonClone(state);
    delete stateSnapshot.aiConfig;

    return {
      state: stateSnapshot,
      storyBlocks: safeJsonClone(storyBlocks.value),
      windVaneFile: windVaneFile.value ? safeJsonClone(windVaneFile.value) : null,
      styleInput: styleInput.value,
      savedAt: new Date().toISOString(),
    };
  }

  async function saveCurrentProjectSnapshot() {
    if (!activeProjectId.value || isRestoringProject) return;
    const projectIndex = projects.value.findIndex((project) => project.id === activeProjectId.value);
    if (projectIndex < 0) return;

    const updatedProject = {
      ...projects.value[projectIndex],
      updatedAt: new Date().toISOString(),
      snapshot: snapshotCurrentProjectData(),
    };
    projects.value.splice(projectIndex, 1, updatedProject);
    if (!isDatabaseReady) return;

    try {
      const savedProject = await updateProjectRecord(updatedProject.id, {
        snapshot: updatedProject.snapshot,
        updatedAt: updatedProject.updatedAt,
      });
      upsertLocalProject(savedProject);
    } catch (error) {
      pushToast(`自动保存失败：${error.message}`, 'error');
    }
  }

  function scheduleProjectSave() {
    if (!activeProjectId.value || isRestoringProject) return;
    window.clearTimeout(projectSaveTimer);
    projectSaveTimer = window.setTimeout(() => {
      void saveCurrentProjectSnapshot();
    }, autosaveDelay);
  }

  function restoreProjectSnapshot(project) {
    const retainedApiConfig = normalizeApiConfig(state.aiConfig);
    const normalizedSnapshot = normalizeProjectSnapshot(project?.snapshot);
    const nextState = {
      ...createInitialState(retainedApiConfig),
      ...(normalizedSnapshot?.state || {}),
      aiConfig: retainedApiConfig,
    };

    isRestoringProject = true;
    Object.assign(state, nextState);
    storyBlocks.value = safeJsonClone(normalizedSnapshot?.storyBlocks || []);
    windVaneFile.value = normalizedSnapshot?.windVaneFile ? safeJsonClone(normalizedSnapshot.windVaneFile) : null;
    styleInput.value = normalizedSnapshot?.styleInput || '';
    activeStageView.value = normalizeStageView(nextState.stage);
    resetChoiceSelection();
    resetEditing();
    window.setTimeout(() => {
      isRestoringProject = false;
    }, 0);
  }

  function requireActiveProject() {
    if (hasActiveProject.value) return true;
    deps.showProjectModal.value = true;
    pushToast('请先创建或选择一个项目，再开始创作', 'error');
    return false;
  }

  function initializeActiveProject() {
    if (!activeProjectId.value) return;
    const project = projects.value.find((item) => item.id === activeProjectId.value);
    if (project) restoreProjectSnapshot(project);
  }

  async function createProject() {
    await saveCurrentProjectSnapshot();
    const draftProject = createEmptyProject(newProjectName.value);

    try {
      const project = await createProjectRecord(draftProject);
      upsertLocalProject(project);
      await setActiveProject(project.id);
      isEditorOpen.value = true;
      deps.showProjectModal.value = false;
      newProjectName.value = '';
      resetAll();
      await saveCurrentProjectSnapshot();
      pushToast(`项目《${project.name}》已创建`, 'success');
    } catch (error) {
      pushToast(`创建项目失败：${error.message}`, 'error');
    }
  }

  async function selectProject(projectId) {
    const project = projects.value.find((item) => item.id === projectId);
    if (!project) return;
    await saveCurrentProjectSnapshot();
    await setActiveProject(project.id);
    isEditorOpen.value = true;
    deps.showProjectModal.value = false;
    restoreProjectSnapshot(project);
    pushToast(`已切换到项目《${project.name}》`, 'success');
  }

  async function backToProjectList() {
    await saveCurrentProjectSnapshot();
    isEditorOpen.value = false;
  }

  async function deleteProject(projectId) {
    const project = projects.value.find((item) => item.id === projectId);
    if (!project) return;
    if (!confirm(`确定删除项目《${project.name}》吗？项目数据会从数据库移除。`)) return;

    try {
      await deleteProjectRecord(projectId);
      projects.value = projects.value.filter((item) => item.id !== projectId);
      if (activeProjectId.value === projectId) {
        await setActiveProject(projects.value[0]?.id || '');
        if (activeProjectId.value) {
          restoreProjectSnapshot(projects.value[0]);
        } else {
          isEditorOpen.value = false;
          resetAll();
        }
      }
      pushToast('项目已删除', 'info');
    } catch (error) {
      pushToast(`删除项目失败：${error.message}`, 'error');
    }
  }

  async function addFavorite({ type, title, content, note = '', payload = null, projectName = activeProjectName.value }) {
    const favorite = normalizeFavorite({
      type,
      title,
      content,
      note,
      payload,
      projectId: activeProjectId.value || '',
      projectName,
      createdAt: new Date().toISOString(),
    });

    if (!favorite) {
      pushToast('收藏内容不能为空', 'error');
      return null;
    }

    try {
      const savedFavorite = await createFavoriteRecord(favorite);
      const normalizedFavorite = normalizeFavorite(savedFavorite);
      favorites.value = [normalizedFavorite, ...favorites.value.filter((item) => item.id !== normalizedFavorite.id)];
      pushToast('已加入收藏库', 'success');
      return normalizedFavorite;
    } catch (error) {
      pushToast(`收藏失败：${error.message}`, 'error');
      return null;
    }
  }

  function startEditFavorite(item) {
    editingFavoriteId.value = item.id;
    Object.assign(editingFavoriteDraft, favoriteDraftFromItem(item));
  }

  function cancelEditFavorite() {
    editingFavoriteId.value = null;
    Object.assign(editingFavoriteDraft, createFavoriteDraft());
  }

  async function saveFavorite() {
    const item = editingFavoriteItem.value;
    if (!item) {
      cancelEditFavorite();
      return;
    }

    const payload = favoritePayloadFromDraft(item.type, editingFavoriteDraft);
    const { content, note } = favoriteSummaryFromPayload(item.type, payload, editingFavoriteDraft);
    const favorite = normalizeFavorite({
      ...item,
      title: editingFavoriteDraft.title,
      content,
      note,
      payload,
      projectName: editingFavoriteDraft.projectName,
    });

    if (!favorite) {
      pushToast('收藏内容不能为空', 'error');
      return;
    }

    try {
      const savedFavorite = await updateFavoriteRecord(item.id, favorite);
      const normalizedFavorite = normalizeFavorite(savedFavorite);
      const index = favorites.value.findIndex((favoriteItem) => favoriteItem.id === savedFavorite.id);
      if (index >= 0) {
        favorites.value.splice(index, 1, normalizedFavorite);
      } else if (normalizedFavorite) {
        favorites.value = [normalizedFavorite, ...favorites.value];
      }
      cancelEditFavorite();
      pushToast('收藏已保存', 'success');
    } catch (error) {
      pushToast(`保存收藏失败：${error.message}`, 'error');
    }
  }

  function openAddFavoriteModal() {
    Object.assign(manualFavoriteDraft, createFavoriteDraft(), {
      projectName: activeProjectName.value === '未创建项目' ? '' : activeProjectName.value,
    });
    showAddFavoriteModal.value = true;
  }

  function cancelAddFavorite() {
    showAddFavoriteModal.value = false;
    Object.assign(manualFavoriteDraft, createFavoriteDraft());
  }

  async function addManualFavorite() {
    const type = activeFavoriteTab.value;
    const payload = favoritePayloadFromDraft(type, manualFavoriteDraft);
    const { content, note } = favoriteSummaryFromPayload(type, payload, manualFavoriteDraft);

    const savedFavorite = await addFavorite({
      type,
      title: manualFavoriteDraft.title || `手动${FAVORITE_TABS.find((tab) => tab.value === type)?.label}`,
      content,
      note,
      payload,
      projectName: manualFavoriteDraft.projectName || activeProjectName.value,
    });
    if (savedFavorite) {
      cancelAddFavorite();
    }
  }

  async function deleteFavorite(favoriteId) {
    try {
      await deleteFavoriteRecord(favoriteId);
      favorites.value = favorites.value.filter((item) => item.id !== favoriteId);
      if (editingFavoriteId.value === favoriteId) {
        cancelEditFavorite();
      }
      pushToast('收藏已删除', 'info');
    } catch (error) {
      pushToast(`删除收藏失败：${error.message}`, 'error');
    }
  }

  async function initializeDatabaseState() {
    try {
      let payload = await fetchDatabaseState();

      const shouldImportBrowserProjects = !payload.projects?.length && !payload.favorites?.length;
      const shouldImportBrowserPrompts = !payload.hasStoredPromptConfigs && hasBrowserPromptConfigs();

      if (shouldImportBrowserProjects || shouldImportBrowserPrompts) {
        const browserProjects = readBrowserProjects();
        const browserFavorites = readBrowserFavorites();
        if (browserProjects.length || browserFavorites.length || shouldImportBrowserPrompts) {
          payload = await importBrowserData({
            projects: browserProjects,
            favorites: browserFavorites,
            promptConfigs: shouldImportBrowserPrompts ? loadBrowserPromptConfigs() : [],
            activeProjectId: readBrowserActiveProjectId(browserProjects),
          });
          clearMigratedBrowserStorage();
          clearBrowserPromptConfigs();
          pushToast('已把浏览器本地数据迁移到数据库', 'success');
        }
      }

      applyDatabaseState(payload);
      isDatabaseReady = true;
      initializeActiveProject();
    } catch (error) {
      isDatabaseReady = false;
      pushToast(`连接数据库失败：${error.message}。请先启动 npm run server`, 'error');
    }
  }

  async function exportAllDataAsJson() {
    await saveCurrentProjectSnapshot();

    const exportPayload = {
      schemaVersion: 1,
      databaseFormat: 'brainhole-workshop',
      exportedAt: new Date().toISOString(),
      activeProjectId: activeProjectId.value,
      theme: theme.value,
      apiConfig: {
        apiEndpoint: state.aiConfig.apiEndpoint,
        model: state.aiConfig.model,
        availableModels: safeJsonClone(state.aiConfig.availableModels || []),
        hasApiKey: Boolean(state.aiConfig.apiKey),
      },
      currentWorkspace: snapshotCurrentProjectData(),
      projects: safeJsonClone(projects.value),
      favorites: safeJsonClone(favorites.value),
      windVaneFile: windVaneFile.value ? safeJsonClone(windVaneFile.value) : null,
      promptConfigs: safeJsonClone(promptConfigs),
    };
    const dateText = new Date().toISOString().slice(0, 10);
    downloadJson(`脑洞组装_全部数据_${dateText}.json`, exportPayload);
    pushToast('全部数据 JSON 已导出', 'success');
  }

  async function importDataJsonFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      pushToast('请选择 .json 格式的数据文件', 'error');
      return;
    }

    try {
      const text = await file.text();
      const importPayload = normalizeImportDataPackage(JSON.parse(text), activeProjectId.value);
      const payload = await importBrowserData(importPayload);
      applyDatabaseState(payload);
      isDatabaseReady = true;
      initializeActiveProject();
      pushToast(`导入完成：${importPayload.projects.length} 个作品，${importPayload.favorites.length} 条收藏`, 'success');
    } catch (error) {
      pushToast(`导入 JSON 失败：${error.message}`, 'error');
    }
  }

  async function handleDataJsonImport(event) {
    const [file] = Array.from(event.target.files || []);
    await importDataJsonFile(file);
    event.target.value = '';
  }

  function setupProjectLibraryWatchers() {
    const stops = [
      watch(state, scheduleProjectSave, { deep: true }),
      watch(storyBlocks, scheduleProjectSave, { deep: true }),
      watch(windVaneFile, scheduleProjectSave, { deep: true }),
      watch(styleInput, scheduleProjectSave),
    ];

    return () => {
      stops.forEach((stop) => stop());
      window.clearTimeout(projectSaveTimer);
    };
  }

  return {
    applyDatabaseState,
    upsertLocalProject,
    setActiveProject,
    snapshotCurrentProjectData,
    saveCurrentProjectSnapshot,
    scheduleProjectSave,
    restoreProjectSnapshot,
    requireActiveProject,
    initializeActiveProject,
    createProject,
    selectProject,
    backToProjectList,
    deleteProject,
    addFavorite,
    startEditFavorite,
    cancelEditFavorite,
    saveFavorite,
    openAddFavoriteModal,
    cancelAddFavorite,
    addManualFavorite,
    deleteFavorite,
    initializeDatabaseState,
    exportAllDataAsJson,
    importDataJsonFile,
    handleDataJsonImport,
    setupProjectLibraryWatchers,
    getIsDatabaseReady: () => isDatabaseReady,
    setIsDatabaseReady: (value) => {
      isDatabaseReady = Boolean(value);
    },
    getIsRestoringProject: () => isRestoringProject,
  };
}
