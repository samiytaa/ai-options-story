<script setup>
import { computed, reactive, ref, watch } from 'vue';
import ApiConfigModal from './components/app/ApiConfigModal.vue';
import AssistantFullscreenModal from './components/app/AssistantFullscreenModal.vue';
import BrainholeOptionEditModal from './components/app/BrainholeOptionEditModal.vue';
import EditorEmptyState from './components/app/EditorEmptyState.vue';
import EditorLeftPanel from './components/app/EditorLeftPanel.vue';
import EditorRightPanel from './components/app/EditorRightPanel.vue';
import StoryStageWorkspace from './components/app/StoryStageWorkspace.vue';
import ProjectHome from './components/app/ProjectHome.vue';
import MaterialExtractorPage from './features/materialExtractor/MaterialExtractorPage.vue';
import FavoriteFormModal from './components/app/FavoriteFormModal.vue';
import FavoritesLibraryModal from './components/app/FavoritesLibraryModal.vue';
import ManualBrainholeModal from './components/app/ManualBrainholeModal.vue';
import ProjectManagerModal from './components/app/ProjectManagerModal.vue';
import PromptConfigModal from './components/app/PromptConfigModal.vue';
import StageIndicator from './components/StageIndicator.vue';
import ToastStack from './components/ToastStack.vue';
import { callAiChat, fetchAvailableModels } from './services/aiClient';
import {
  clearApiConfig,
  loadApiConfig,
  normalizeApiConfig,
  saveApiConfig,
} from './services/apiConfig';
import {
  resetPromptConfigRecords,
  updatePromptConfigRecord,
  updateProjectRecord,
} from './services/databaseApi';
import {
  buildContextSummary,
  createInitialState,
  formatChoiceForDisplay,
  formatHookForDisplay,
  normalizePlotChoice,
} from './storyState';
import {
  BRAINHOLE_SCORE_LABELS,
  FAVORITE_TABS,
  ICONS,
  PROJECT_SORT_STORAGE,
  QUICK_STYLES,
  SIDEBAR_STATE_STORAGE,
  THEME_STORAGE,
  WIND_VANE_FILE_STORAGE,
} from './app/constants';
import { loadSidebarState } from './app/browserStorage';
import {
  applyPromptConfigs,
  buildPromptMessages as buildPromptMessagesFromConfig,
  getPromptConfig as getPromptConfigFromList,
  loadBrowserPromptConfigs,
  updatePromptConfigField as updatePromptConfigFieldInList,
} from './app/promptConfig';
import {
  brainholeOptionFromFavorite,
  createBrainholeOptionDraft,
} from './app/brainholeOptions';
import {
  createFavoriteDraft,
  favoriteBrainholePayload,
  favoriteChoicePayload,
  favoritePlotPayload,
} from './app/favorites';
import { useAppViewState } from './app/useAppViewState';
import { useProjectLibrary } from './app/useProjectLibrary';
import { useStoryFlow } from './app/useStoryFlow';
import { useWindVaneFile } from './app/useWindVaneFile';
const savedApiConfig = loadApiConfig();
const savedTheme = localStorage.getItem(THEME_STORAGE) || 'dark';
const savedSidebarState = loadSidebarState();
const PROMPT_AUTOMATION_STORAGE = 'story_prompt_automation_settings';

function loadPromptAutomationSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROMPT_AUTOMATION_STORAGE) || '{}');
    return {
      autoGeneratePlot: saved.autoGeneratePlot !== false,
      autoGenerateChoices: saved.autoGenerateChoices !== false,
      generateBodyBeforeChoices: saved.generateBodyBeforeChoices !== false,
    };
  } catch {
    return {
      autoGeneratePlot: true,
      autoGenerateChoices: true,
      generateBodyBeforeChoices: true,
    };
  }
}

const state = reactive(createInitialState(savedApiConfig));

const theme = ref(savedTheme);
const apiConfigDraft = reactive({ ...savedApiConfig });
const showApiConfigModal = ref(false);
const showApiKey = ref(false);
const showFavoritesModal = ref(false);
const showProjectModal = ref(false);
const modelFetchLoading = ref(false);
const loadingMessage = ref('');
const toasts = ref([]);
const isLeftPanelCollapsed = ref(savedSidebarState.left);
const isRightPanelCollapsed = ref(savedSidebarState.right);
const storyBlocks = ref([]);
const selectedChoiceIndex = ref(null);
const styleInput = ref('');
const copySelectedChoicesWithBody = ref(false);
const showPromptModal = ref(false);
const activePromptId = ref('brainhole');
const promptConfigs = reactive(loadBrowserPromptConfigs());
const promptEditorVersion = ref(0);
const promptAutomationSettings = reactive(loadPromptAutomationSettings());
const windVaneFile = ref(null);
const uploadInputRef = ref(null);
const editingBlockId = ref(null);
const editingContent = ref('');
const editingBrainholeIndex = ref(null);
const editingBrainholeDraft = reactive(createBrainholeOptionDraft());
const manualBrainholeDraft = reactive(createBrainholeOptionDraft());
const showManualBrainholeModal = ref(false);
const projects = ref([]);
const activeProjectId = ref('');
const isEditorOpen = ref(false);
const favorites = ref([]);
const activeFavoriteTab = ref('brainhole');
const newProjectName = ref('');
const manualFavoriteDraft = reactive(createFavoriteDraft());
const showAddFavoriteModal = ref(false);
const editingFavoriteId = ref(null);
const editingFavoriteDraft = reactive(createFavoriteDraft());
const projectSortBy = ref(localStorage.getItem(PROJECT_SORT_STORAGE) || 'updatedAt');
const editingProjectId = ref(null);
const editingProjectName = ref('');
const activeStageView = ref('brainhole');
const selectedStoryBlockId = ref('');
const rightPanelActiveTab = ref('promptControl');
const showAssistantModal = ref(false);
const assistantInput = ref('');
const assistantMessages = ref([]);
const assistantLoading = ref(false);
const assistantEditingContent = ref('');
const assistantEditing = ref(false);
const assistantEditingMessageId = ref(null);
const assistantEditingMessageContent = ref('');
const pendingPlotGenerationAvailable = ref(false);
const activeStandaloneView = ref('');

const selectedStoryBlock = computed(() => storyBlocks.value.find((block) => block.id === selectedStoryBlockId.value) || null);
const canCopyCurrentBody = computed(() => storyBlocks.value.some((block) => {
  const content = block?.content?.trim();
  if (!content) return false;
  if (block.id === 'guide' || block.id === 'final-work') return true;
  return block.id.startsWith('plot-');
}));
const selectedStoryBlockTitle = computed(() => {
  const block = selectedStoryBlock.value;
  if (!block) return '';
  const plotRef = parsePlotBlockId(block.id);
  if (plotRef) return `第${plotRef.chapterNum}章 剧情点${plotRef.plotIndex}`;
  return block.title || '当前片段';
});
const canUseAssistant = computed(() => Boolean(selectedStoryBlock.value?.content && state.aiConfig.apiKey && !assistantLoading.value));
function completedPlotBlockCountForChapter(chapterNum) {
  return storyBlocks.value.filter((block) => {
    const match = String(block.id || '').match(/^plot-(\d+)-(\d+)$/);
    return match && Number(match[1]) === chapterNum && block.content;
  }).length;
}

function completedPlotPointCountForChapter(chapterNum) {
  const chapter = state.chapters.find((item) => item.chapterNum === chapterNum);
  return Math.max(completedPlotBlockCountForChapter(chapterNum), chapter?.plotPoints?.length || 0);
}

function hasLatestPlotBlockContentForChapter(chapterNum) {
  return storyBlocks.value.some((block) => {
    const match = String(block.id || '').match(/^plot-(\d+)-(\d+)$/);
    return match && Number(match[1]) === chapterNum && block.content;
  });
}

function hasCurrentPlotSeed() {
  return Boolean(state.plotPointContents[state.currentPlotPointIndex]?.trim());
}

const pendingChoiceGenerationLabel = computed(() => {
  const chapter = state.chapters.find((item) => item.chapterNum === state.currentChapter);
  if (state.currentChapter >= 4 && chapter?.hookChosen !== null && !state.bigHooks.length) return '生成大钩子与剧情走向';
  if (completedPlotPointCountForChapter(state.currentChapter) >= 4 && !state.currentHooks.length) return '生成下一章的4个章节钩子';
  return '生成剧情选项';
});
const pendingChoiceGenerationAvailable = computed(() => {
  if (!state.guide || pendingPlotGenerationAvailable.value) return false;
  if (state.currentOptions.length || state.currentHooks.length || state.bigHooks.length) return false;
  if (state.bigHookChosen !== null) return false;

  const chapter = state.chapters.find((item) => item.chapterNum === state.currentChapter);
  if (state.currentChapter >= 4 && chapter?.hookChosen !== null) return true;
  if (completedPlotPointCountForChapter(state.currentChapter) >= 4 && chapter?.hookChosen === null) return true;
  return hasLatestPlotBlockContentForChapter(state.currentChapter) || hasCurrentPlotSeed();
});

function startEditProjectName(project) {
  editingProjectId.value = project.id;
  editingProjectName.value = project.name;
}

function cancelEditProjectName() {
  editingProjectId.value = null;
  editingProjectName.value = '';
}

async function saveProjectName() {
  const projectId = editingProjectId.value;
  const newName = editingProjectName.value.trim();

  if (!projectId || !newName) {
    pushToast('项目名称不能为空', 'error');
    return;
  }

  const project = projects.value.find((item) => item.id === projectId);
  if (!project) return;

  try {
    const updatedProject = await updateProjectRecord(projectId, {
      name: newName,
      updatedAt: new Date().toISOString(),
    });
    upsertLocalProject(updatedProject);
    cancelEditProjectName();
    pushToast('项目名称已更新', 'success');
  } catch (error) {
    pushToast(`更新项目名称失败：${error.message}`, 'error');
  }
}

function pushToast(message, type = 'info') {
  const id = Date.now() + Math.random();
  toasts.value.push({ id, message, type });
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }, 3000);
}

function openMaterialExtractor() {
  activeStandaloneView.value = 'materialExtractor';
}

function closeMaterialExtractor() {
  activeStandaloneView.value = '';
}

function setLoading(message = '') {
  loadingMessage.value = message;
}

function syncApiConfigToState(config) {
  state.aiConfig = normalizeApiConfig(config);
}

function resetApiConfigDraft() {
  Object.assign(apiConfigDraft, normalizeApiConfig(state.aiConfig));
}

function updateApiConfigDraftField(key, value) {
  apiConfigDraft[key] = value;
}

function openApiConfigModal() {
  resetApiConfigDraft();
  showApiKey.value = false;
  showApiConfigModal.value = true;
}

function closeApiConfigModal() {
  showApiConfigModal.value = false;
}

function persistApiConfig(config, successMessage = 'API 配置已保存到本地浏览器') {
  const normalized = saveApiConfig(config);
  syncApiConfigToState(normalized);
  Object.assign(apiConfigDraft, normalized);
  pushToast(successMessage, 'success');
  return normalized;
}

function saveCurrentApiConfig() {
  persistApiConfig(apiConfigDraft);
}

function clearCurrentApiConfig() {
  const cleared = clearApiConfig();
  syncApiConfigToState(cleared);
  Object.assign(apiConfigDraft, cleared);
  pushToast('API 配置已恢复默认', 'success');
}

async function clearBrainholeInput() {
  state.storyStart = '';
  await saveCurrentProjectSnapshot();
  pushToast('脑洞输入已清空', 'info');
}

async function clearBrainholeOptions() {
  if (!projectLibrary.requireActiveProject()) return;
  if (!state.brainholeOptions.length) {
    pushToast('当前没有可清空的脑洞选项', 'info');
    return;
  }

  const willClearProgress = Boolean(state.brainhole || state.guide);
  const confirmed = window.confirm(
    willClearProgress
      ? '确定清空所有脑洞选项吗？当前选定脑洞和后续内容也会清空。'
      : '确定清空所有脑洞选项吗？',
  );
  if (!confirmed) return;

  state.brainholeOptions = [];
  clearBrainholeContinuation();
  setBrainholeOptionsBlock();
  updateStage('brainhole');
  activeStageView.value = 'brainhole';
  await saveCurrentProjectSnapshot();
  pushToast('脑洞选项已清空', 'success');
}

async function handleFetchModels() {
  modelFetchLoading.value = true;

  try {
    const models = await fetchAvailableModels(apiConfigDraft);
    const nextModel = apiConfigDraft.model && models.includes(apiConfigDraft.model)
      ? apiConfigDraft.model
      : models[0] || apiConfigDraft.model;

    Object.assign(apiConfigDraft, normalizeApiConfig({
      ...apiConfigDraft,
      model: nextModel,
      availableModels: models,
    }));

    pushToast(models.length ? `已拉取 ${models.length} 个模型` : '接口返回了空模型列表', models.length ? 'success' : 'info');
  } catch (error) {
    pushToast(`拉取模型失败：${error.message}`, 'error');
  } finally {
    modelFetchLoading.value = false;
  }
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_STORAGE, theme.value);
  document.documentElement.setAttribute('data-theme', theme.value);
}

function initTheme() {
  document.documentElement.setAttribute('data-theme', theme.value);
}

initTheme();

watch([isLeftPanelCollapsed, isRightPanelCollapsed], ([left, right]) => {
  localStorage.setItem(
    SIDEBAR_STATE_STORAGE,
    JSON.stringify({
      left,
      right,
    }),
  );
}, { immediate: true });

function resetChoiceSelection() {
  selectedChoiceIndex.value = null;
}

function resetEditing() {
  editingBlockId.value = null;
  editingContent.value = '';
  editingBrainholeIndex.value = null;
  editingFavoriteId.value = null;
  Object.assign(editingBrainholeDraft, createBrainholeOptionDraft());
  Object.assign(editingFavoriteDraft, createFavoriteDraft());
}

const viewState = useAppViewState({
  state,
  loadingMessage,
  storyBlocks,
  activeStageView,
  promptConfigs,
  activePromptId,
  projects,
  activeProjectId,
  favorites,
  activeFavoriteTab,
  editingFavoriteId,
  isEditorOpen,
  projectSortBy,
  isLeftPanelCollapsed,
  isRightPanelCollapsed,
  resetEditing,
});

const {
  isLoading,
  hasStoryContent,
  currentChoiceType,
  currentChoices,
  currentChoiceTitle,
  activeStageViewLabel,
  visibleStoryBlocks,
  showCurrentChoicePanel,
  showBrainholeAction,
  showStylePanel,
  showFinalActions,
  activeStageEmptyText,
  activePromptConfig,
  activeProject,
  hasActiveProject,
  activeProjectName,
  projectCards,
  favoriteItemsForActiveTab,
  editingFavoriteItem,
  editingFavoriteTypeLabel,
  editingFavoriteModalDescription,
  canChooseFavoriteBrainhole,
  canAppendFavoriteBrainhole,
  outlineEntries,
  selectedChoiceCopyText,
  stageLabelFor,
  navigateStageView,
  updateStage,
  setProjectSort,
  togglePanel,
} = viewState;

function favoriteBrainholeOption(option, index) {
  const payload = favoriteBrainholePayload(option);
  addFavorite({
    type: 'brainhole',
    title: payload.title || `脑洞选项 ${index + 1}`,
    content: payload.idea,
    note: payload.fit,
    payload,
  });
}

function favoriteStoryBlock(block) {
  if (!block?.content) return;
  const plotRef = parsePlotBlockId(block.id);
  const chapter = plotRef ? state.chapters.find((item) => item.chapterNum === plotRef.chapterNum) : null;
  const committedPlot = plotRef ? chapter?.plotPoints?.[plotRef.zeroIndex] : null;
  const currentPlotOptions = plotRef?.chapterNum === state.currentChapter && plotRef.zeroIndex === state.currentPlotPointIndex
    ? state.currentOptions
    : [];
  const payload = plotRef
    ? favoritePlotPayload({
      chapterNum: plotRef.chapterNum,
      plotIndex: plotRef.plotIndex,
      desc: committedPlot?.desc || block.content,
      chosenOption: committedPlot?.chosenOption ?? 0,
      options: committedPlot?.options || currentPlotOptions,
    })
    : null;
  const chosenChoice = payload?.options?.[payload.chosenOption];

  addFavorite({
    type: plotRef ? 'plot' : 'brainhole',
    title: plotRef ? `第${plotRef.chapterNum}章 剧情点${plotRef.plotIndex}` : block.title || '故事片段',
    content: payload?.desc || block.content,
    note: chosenChoice ? formatChoiceForDisplay(chosenChoice) : activeProjectName.value,
    payload,
  });
}

function favoriteCurrentChoice(option, index) {
  const choiceKind = currentChoiceType.value === 'bighook' ? 'bighook' : currentChoiceType.value;
  const payload = favoriteChoicePayload({
    choiceKind,
    index,
    label: `${currentChoiceType.value === 'hook' ? '钩子' : currentChoiceType.value === 'bighook' ? '大钩子' : '选项'} ${index + 1}`,
    text: currentChoiceType.value === 'option' ? formatChoiceForDisplay(option) : formatHookForDisplay(option, choiceKind),
    choice: option,
  });

  addFavorite({
    type: 'option',
    title: payload.label || `${currentChoiceType.value === 'hook' ? '钩子' : currentChoiceType.value === 'bighook' ? '大钩子' : '选项'} ${index + 1}`,
    content: payload.text,
    note: payload.choice?.result || activeProjectName.value,
    payload,
  });
}

async function chooseFavoriteBrainhole(item) {
  if (item?.type !== 'brainhole') return;
  if (!requireActiveProject()) return;
  if (state.brainhole || state.guide) {
    pushToast('当前作品已经选定脑洞，不能直接替换', 'error');
    return;
  }

  const option = brainholeOptionFromFavorite(item, state.brainholeOptions.length);
  if (!option.idea) {
    pushToast('这个收藏没有可用的脑洞内容', 'error');
    return;
  }

  clearBrainholeContinuation();
  const existingIndex = state.brainholeOptions.findIndex((candidate) => candidate.idea === option.idea);
  const targetIndex = existingIndex >= 0 ? existingIndex : state.brainholeOptions.length;
  if (existingIndex < 0) {
    state.brainholeOptions.push(option);
  }
  state.selectedBrainholeIndex = targetIndex;
  state.brainhole = state.brainholeOptions[targetIndex].idea;
  setBrainholeOptionsBlock();
  updateStage('brainhole');
  showFavoritesModal.value = false;
  isEditorOpen.value = true;
  await saveCurrentProjectSnapshot();
  pushToast('已从收藏选定脑洞，并输出到编辑区', 'success');
}

async function appendFavoriteBrainhole(item) {
  if (item?.type !== 'brainhole') return;
  if (!requireActiveProject()) return;

  const shouldCreateFirstBrainhole = !state.brainhole && !state.guide && state.brainholeOptions.length === 0;
  const option = brainholeOptionFromFavorite(item, state.brainholeOptions.length);
  if (!option.idea) {
    pushToast('这个收藏没有可用的脑洞内容', 'error');
    return;
  }

  const existingIndex = state.brainholeOptions.findIndex((candidate) => candidate.idea === option.idea);
  if (existingIndex >= 0) {
    activeStageView.value = 'brainhole';
    isEditorOpen.value = true;
    pushToast(`这个脑洞已在候选列表第 ${existingIndex + 1} 个`, 'info');
    return;
  }

  state.brainholeOptions.push(option);
  if (shouldCreateFirstBrainhole) {
    state.selectedBrainholeIndex = 0;
    state.brainhole = option.idea;
  }
  setBrainholeOptionsBlock();
  updateStage('brainhole');
  activeStageView.value = 'brainhole';
  showFavoritesModal.value = false;
  isEditorOpen.value = true;
  await saveCurrentProjectSnapshot();
  pushToast(shouldCreateFirstBrainhole ? '已创建第 1 条脑洞，并输出到编辑区' : '已追加到脑洞候选末尾', 'success');
}

async function confirmReset() {
  if (window.confirm('确定要重置全部内容吗？这将清除所有创作进度。')) {
    await resetAll();
  }
}

const promptConfigSaveTimers = new Map();
const dirtyPromptConfigIds = new Set();
const PROMPT_CONFIG_SAVE_DELAY = 1000;

function clearPendingPromptConfigSaves() {
  promptConfigSaveTimers.forEach((timer) => window.clearTimeout(timer));
  promptConfigSaveTimers.clear();
}

async function savePromptConfigToBackend(promptId) {
  const promptConfig = getPromptConfig(promptId);
  if (!promptConfig) return;

  await updatePromptConfigRecord(promptId, {
    systemPrompt: promptConfig.systemPrompt,
    userPrompt: promptConfig.userPrompt,
    temperature: promptConfig.temperature,
  });
  dirtyPromptConfigIds.delete(promptId);
}

async function flushPendingPromptConfigSaves() {
  const promptIds = Array.from(dirtyPromptConfigIds);
  clearPendingPromptConfigSaves();
  if (!promptIds.length) return;

  try {
    await Promise.all(promptIds.map((promptId) => savePromptConfigToBackend(promptId)));
  } catch (error) {
    pushToast(`提示词保存失败：${error.message}`, 'error');
    throw error;
  }
}

function schedulePromptConfigSave(promptId) {
  dirtyPromptConfigIds.add(promptId);
  window.clearTimeout(promptConfigSaveTimers.get(promptId));
  promptConfigSaveTimers.set(promptId, window.setTimeout(async () => {
    try {
      await savePromptConfigToBackend(promptId);
    } catch (error) {
      pushToast(`提示词自动保存失败：${error.message}`, 'error');
    } finally {
      promptConfigSaveTimers.delete(promptId);
    }
  }, PROMPT_CONFIG_SAVE_DELAY));
}

async function resetPromptConfigs() {
  try {
    await flushPendingPromptConfigSaves();
    const nextPromptConfigs = await resetPromptConfigRecords();
    applyPromptConfigs(promptConfigs, nextPromptConfigs);
    dirtyPromptConfigIds.clear();
    promptEditorVersion.value += 1;
    pushToast('已恢复默认提示词', 'info');
  } catch (error) {
    pushToast(`恢复默认提示词失败：${error.message}`, 'error');
  }
}

async function requestClosePromptModal() {
  try {
    await flushPendingPromptConfigSaves();
  } catch {
    return;
  }
  showPromptModal.value = false;
}

function updatePromptConfigField(promptId, key, value) {
  updatePromptConfigFieldInList(promptConfigs, promptId, key, value);
  schedulePromptConfigSave(promptId);
}

function updatePromptAutomationSetting(key, value) {
  if (!(key in promptAutomationSettings)) return;
  promptAutomationSettings[key] = Boolean(value);
  localStorage.setItem(PROMPT_AUTOMATION_STORAGE, JSON.stringify(promptAutomationSettings));
}

function getPromptConfig(id) {
  return getPromptConfigFromList(promptConfigs, id);
}

function buildPromptMessages(id, values) {
  return buildPromptMessagesFromConfig(promptConfigs, id, values);
}

async function requestAi(messages, temperature = 0.85) {
  return callAiChat({
    config: state.aiConfig,
    messages,
    temperature,
  });
}

let projectLibrary;
const storyFlow = useStoryFlow({
  state,
  storyBlocks,
  selectedChoiceIndex,
  styleInput,
  customPromptInstruction: {
    get value() {
      return state.customPromptInstruction;
    },
    set value(nextValue) {
      state.customPromptInstruction = nextValue;
    },
  },
  copySelectedChoicesWithBody,
  windVaneFile,
  editingBlockId,
  editingContent,
  editingBrainholeIndex,
  editingBrainholeDraft,
  manualBrainholeDraft,
  showManualBrainholeModal,
  apiConfigDraft,
  promptConfigs,
  automationSettings: promptAutomationSettings,
  pendingPlotGenerationAvailable,
  isLoading,
  pushToast,
  setLoading,
  updateStage,
  resetChoiceSelection,
  resetEditing,
  requireActiveProject: () => projectLibrary.requireActiveProject(),
  getPromptConfig,
  buildPromptMessages,
  requestAi,
});

const {
  setBrainholeOptionsBlock,
  clearBrainholeContinuation,
  selectBrainholeOption,
  unselectBrainholeOption,
  startEditBrainholeOption,
  cancelEditBrainholeOption,
  saveBrainholeOption: saveBrainholeOptionToState,
  deleteBrainholeOption: deleteBrainholeOptionFromState,
  openManualBrainholeModal,
  cancelManualBrainholeModal,
  updateManualBrainholeDraftField,
  addManualBrainholeOption: addManualBrainholeOptionToState,
  parsePlotBlockId,
  updateStoryBlockContent,
  cancelEditBlock,
  syncEditedBlockToState,
  saveEditBlock: saveEditBlockToState,
  isPlotBlock,
  isLatestRegeneratablePlotBlock,
  deletePlotBlock: deletePlotBlockFromState,
  generateBrainhole: generateBrainholeToState,
  generateGuideAndFirstPlot: generateGuideAndFirstPlotToState,
  generateOptionsForCurrentPlotPoint: generateOptionsForCurrentPlotPointToState,
  generateHooks: generateHooksToState,
  generateBigHooks: generateBigHooksToState,
  handleChoiceSelect: handleChoiceSelectInState,
  updateCurrentChoiceOption: updateCurrentChoiceOptionInState,
  addCurrentChoiceOption: addCurrentChoiceOptionToState,
  deleteCurrentChoiceOption: deleteCurrentChoiceOptionFromState,
  regeneratePlotBlockResult: regeneratePlotBlockResultToState,
  regenerateCurrentChoices: regenerateCurrentChoicesToState,
  generateCurrentChoiceResultVariants: generateCurrentChoiceResultVariantsFromState,
  continuePendingPlotGeneration: continuePendingPlotGenerationToState,
  finalWriting: finalWritingToState,
  copyFinalWork,
  buildFinalBodyCopyText,
  copyFinalBodyFromSidebar,
  downloadFinalWork,
  resetAll: resetAllToState,
} = storyFlow;

const copyBodyPreviewText = computed(() => (canCopyCurrentBody.value ? buildFinalBodyCopyText() : ''));

async function persistProjectEditAfter(action) {
  await action();
  await saveCurrentProjectSnapshot();
}

async function generateBrainhole() {
  await persistProjectEditAfter(generateBrainholeToState);
}

async function generateGuideAndFirstPlot() {
  await persistProjectEditAfter(generateGuideAndFirstPlotToState);
}

async function generateOptionsForCurrentPlotPoint() {
  await persistProjectEditAfter(generateOptionsForCurrentPlotPointToState);
}

async function generateHooks() {
  await persistProjectEditAfter(generateHooksToState);
}

async function generateBigHooks() {
  await persistProjectEditAfter(generateBigHooksToState);
}

async function handleChoiceSelect(index, type) {
  await persistProjectEditAfter(() => handleChoiceSelectInState(index, type));
}

async function regeneratePlotBlockResult(block) {
  await persistProjectEditAfter(() => regeneratePlotBlockResultToState(block));
}

async function regenerateCurrentChoices(type) {
  await persistProjectEditAfter(() => regenerateCurrentChoicesToState(type));
}

async function generateCurrentChoiceResultVariants(index, type) {
  return generateCurrentChoiceResultVariantsFromState(index, type);
}

async function handleGenerateCurrentChoiceResultVariants(index, type, done) {
  const variants = await generateCurrentChoiceResultVariants(index, type);
  if (typeof done === 'function') done(variants);
}

async function continuePendingPlotGeneration() {
  await persistProjectEditAfter(continuePendingPlotGenerationToState);
}

async function finalWriting() {
  await persistProjectEditAfter(finalWritingToState);
}

function updateFinalWorkDraft(blockId, content) {
  if (blockId !== 'final-work') return;
  updateStoryBlockContent(blockId, content);
  syncEditedBlockToState(blockId, content);
}

async function saveFinalWork(blockId) {
  if (blockId !== 'final-work') return;
  if (!state.finalWork.trim()) {
    pushToast('最终正文不能为空', 'error');
    return;
  }

  updateStoryBlockContent(blockId, state.finalWork);
  await saveCurrentProjectSnapshot();
  pushToast('最终正文已保存', 'success');
}

async function resetAll() {
  resetAllToState();
  await saveCurrentProjectSnapshot();
}

async function generatePendingChoices() {
  const chapter = state.chapters.find((item) => item.chapterNum === state.currentChapter);
  if (state.currentChapter >= 4 && chapter?.hookChosen !== null && !state.bigHooks.length) {
    await generateBigHooks();
    return;
  }
  if (completedPlotPointCountForChapter(state.currentChapter) >= 4 && !state.currentHooks.length) {
    await generateHooks();
    return;
  }
  await generateOptionsForCurrentPlotPoint();
}

function selectStoryBlock(block) {
  if (!block?.content || block.id === 'brainhole-options') return;
  selectedStoryBlockId.value = block.id;
  assistantEditing.value = false;
  assistantEditingContent.value = block.content;
  showAssistantModal.value = true;
}

function openAssistantEditor(block) {
  if (!block?.content || block.id === 'brainhole-options') return;
  selectedStoryBlockId.value = block.id;
  assistantEditingContent.value = block.content;
  assistantEditing.value = true;
  showAssistantModal.value = true;
}

function closeAssistantModal() {
  showAssistantModal.value = false;
  assistantEditing.value = false;
}

function startAssistantEdit() {
  const block = selectedStoryBlock.value;
  if (!block?.content) return;
  assistantEditingContent.value = block.content;
  assistantEditing.value = true;
}

function cancelAssistantEdit() {
  assistantEditing.value = false;
  assistantEditingContent.value = selectedStoryBlock.value?.content || '';
}

async function saveAssistantEdit() {
  const block = selectedStoryBlock.value;
  const content = assistantEditingContent.value.trim();
  if (!block?.id) {
    pushToast('原剧情节点已不存在，无法保存', 'error');
    return;
  }
  if (!content) {
    pushToast('内容不能为空', 'error');
    return;
  }

  updateStoryBlockContent(block.id, content);
  syncEditedBlockToState(block.id, content);
  assistantEditing.value = false;
  assistantEditingContent.value = content;
  await saveCurrentProjectSnapshot();
  pushToast('内容已更新', 'success');
}

function getAssistantConversationContext() {
  return formatAssistantConversationContext(assistantMessages.value);
}

function formatAssistantConversationContext(messages) {
  return messages
    .slice(-6)
    .map((message) => `${message.role === 'user' ? '用户' : 'AI'}：${message.content}`)
    .join('\n\n');
}

async function requestAssistantRewrite(instruction, block, conversationContext = getAssistantConversationContext()) {
  return requestAi([
    {
      role: 'system',
      content: '你是小说剧情编辑助手。只根据用户要求改写当前片段，保持上下文连续和人物关系一致。输出可直接替换当前片段的正文，不要解释，不要添加标题，不要使用 Markdown。正文格式必须保持短篇小说分行写法，一句话一行，不要写成大段。',
    },
    {
      role: 'user',
      content: [
        `全局剧情上下文：\n${buildContextSummary(state) || '暂无'}`,
        `当前节点：${selectedStoryBlockTitle.value}`,
        `当前片段：\n${block.content}`,
        conversationContext ? `最近对话：\n${conversationContext}` : '',
        `本次调整要求：\n${instruction}`,
      ].filter(Boolean).join('\n\n'),
    },
  ], 0.72);
}

async function sendAssistantMessage() {
  if (!requireActiveProject()) return;

  const instruction = assistantInput.value.trim();
  const block = selectedStoryBlock.value;
  if (!block?.content) {
    pushToast('请先选中一个剧情节点', 'error');
    return;
  }
  if (!instruction) {
    pushToast('请先输入调整要求', 'error');
    return;
  }
  if (!state.aiConfig.apiKey) {
    pushToast('请先完成 API 配置', 'error');
    return;
  }

  assistantMessages.value.push({
    id: Date.now() + Math.random(),
    role: 'user',
    content: instruction,
  });
  assistantInput.value = '';
  assistantLoading.value = true;

  try {
    const result = await requestAssistantRewrite(instruction, block);

    assistantMessages.value.push({
      id: Date.now() + Math.random(),
      role: 'assistant',
      content: result.trim(),
      blockId: block.id,
      blockTitle: selectedStoryBlockTitle.value,
      applied: false,
    });
  } catch (error) {
    pushToast(`AI 助手处理失败：${error.message}`, 'error');
  } finally {
    assistantLoading.value = false;
  }
}

async function applyAssistantRewrite(message) {
  if (!message?.content || message.applied) return;
  const block = storyBlocks.value.find((item) => item.id === message.blockId);
  if (!block) {
    pushToast('原剧情节点已不存在，无法应用', 'error');
    return;
  }

  const content = message.content.trim();
  if (!content) {
    pushToast('AI 返回内容为空，无法应用', 'error');
    return;
  }

  updateStoryBlockContent(block.id, content);
  syncEditedBlockToState(block.id, content);
  message.applied = true;
  selectedStoryBlockId.value = block.id;
  assistantEditing.value = false;
  assistantEditingContent.value = content;
  showAssistantModal.value = true;
  await saveCurrentProjectSnapshot();
  pushToast('已应用到当前剧情节点', 'success');
}

function clearAssistantConversation() {
  assistantMessages.value = [];
  assistantEditingMessageId.value = null;
  assistantEditingMessageContent.value = '';
}

function startEditAssistantMessage(message) {
  if (!message?.id || assistantLoading.value) return;
  assistantEditingMessageId.value = message.id;
  assistantEditingMessageContent.value = message.content || '';
}

function cancelEditAssistantMessage() {
  assistantEditingMessageId.value = null;
  assistantEditingMessageContent.value = '';
}

function saveEditAssistantMessage(message) {
  const target = assistantMessages.value.find((item) => item.id === message?.id);
  const content = assistantEditingMessageContent.value.trim();
  if (!target) {
    cancelEditAssistantMessage();
    return;
  }
  if (!content) {
    pushToast('消息内容不能为空', 'error');
    return;
  }
  target.content = content;
  if (target.role === 'assistant') target.applied = false;
  cancelEditAssistantMessage();
}

function deleteAssistantMessage(message) {
  assistantMessages.value = assistantMessages.value.filter((item) => item.id !== message?.id);
  if (assistantEditingMessageId.value === message?.id) cancelEditAssistantMessage();
}

async function regenerateAssistantMessage(message) {
  if (!message?.id || message.role !== 'assistant' || assistantLoading.value) return;
  const messageIndex = assistantMessages.value.findIndex((item) => item.id === message.id);
  if (messageIndex === -1) return;

  const previousUserMessage = assistantMessages.value
    .slice(0, messageIndex)
    .reverse()
    .find((item) => item.role === 'user' && item.content?.trim());
  if (!previousUserMessage) {
    pushToast('没有找到可用于重新生成的用户要求', 'error');
    return;
  }

  const block = storyBlocks.value.find((item) => item.id === message.blockId) || selectedStoryBlock.value;
  if (!block?.content) {
    pushToast('原剧情节点已不存在，无法重新生成', 'error');
    return;
  }

  selectedStoryBlockId.value = block.id;
  assistantLoading.value = true;
  try {
    const conversationContext = formatAssistantConversationContext(assistantMessages.value.slice(0, messageIndex));
    const result = await requestAssistantRewrite(previousUserMessage.content.trim(), block, conversationContext);
    message.content = result.trim();
    message.blockId = block.id;
    message.blockTitle = selectedStoryBlockTitle.value;
    message.applied = false;
    cancelEditAssistantMessage();
  } catch (error) {
    pushToast(`重新生成失败：${error.message}`, 'error');
  } finally {
    assistantLoading.value = false;
  }
}

projectLibrary = useProjectLibrary({
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
  showProjectModal,
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
});

const {
  upsertLocalProject,
  saveCurrentProjectSnapshot,
  requireActiveProject,
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
  handleDataJsonImport,
  setupProjectLibraryWatchers,
} = projectLibrary;

async function persistProjectEdit(action, shouldPersist = () => true) {
  action();
  if (!shouldPersist()) return;
  await saveCurrentProjectSnapshot();
}

async function saveBrainholeOption() {
  const editingIndex = editingBrainholeIndex.value;
  await persistProjectEdit(
    () => saveBrainholeOptionToState(),
    () => editingIndex !== editingBrainholeIndex.value,
  );
}

async function addManualBrainholeOption() {
  const previousCount = state.brainholeOptions.length;
  await persistProjectEdit(
    () => addManualBrainholeOptionToState(),
    () => state.brainholeOptions.length !== previousCount,
  );
}

async function deleteBrainholeOption(index) {
  const previousCount = state.brainholeOptions.length;
  await persistProjectEdit(
    () => deleteBrainholeOptionFromState(index),
    () => state.brainholeOptions.length !== previousCount,
  );
}

async function saveEditBlock(blockId) {
  const wasEditing = editingBlockId.value === blockId;
  await persistProjectEdit(
    () => saveEditBlockToState(blockId),
    () => wasEditing && editingBlockId.value !== blockId,
  );
}

async function deletePlotBlock(block) {
  const previousBlockCount = storyBlocks.value.length;
  await persistProjectEdit(
    () => deletePlotBlockFromState(block),
    () => storyBlocks.value.length !== previousBlockCount,
  );
}

async function updateCurrentChoiceOption(index, value, type) {
  const previousValue = JSON.stringify(type === 'hook' ? state.currentHooks[index] : type === 'bighook' ? state.bigHooks[index] : state.currentOptions[index]);
  await persistProjectEdit(
    () => updateCurrentChoiceOptionInState(index, value, type),
    () => previousValue !== JSON.stringify(type === 'hook' ? state.currentHooks[index] : type === 'bighook' ? state.bigHooks[index] : state.currentOptions[index]),
  );
}

async function addCurrentChoiceOption(value, type) {
  const target = type === 'hook' ? state.currentHooks : type === 'bighook' ? state.bigHooks : state.currentOptions;
  const previousCount = target.length;
  await persistProjectEdit(
    () => addCurrentChoiceOptionToState(value, type),
    () => target.length !== previousCount,
  );
}

async function deleteCurrentChoiceOption(index, type) {
  const target = type === 'hook' ? state.currentHooks : type === 'bighook' ? state.bigHooks : state.currentOptions;
  const previousCount = target.length;
  await persistProjectEdit(
    () => deleteCurrentChoiceOptionFromState(index, type),
    () => target.length !== previousCount,
  );
}

const {
  clearWindVaneFile: clearWindVaneFileFromState,
  handleWindVaneFileChange: handleWindVaneFileChangeInState,
  handleWindVaneDragOver,
  handleWindVaneDragLeave,
  handleFileDrop: handleFileDropInState,
} = useWindVaneFile({
  windVaneFile,
  uploadInputRef,
  requireActiveProject,
  pushToast,
  isLoading,
});

async function clearWindVaneFile() {
  const hadFile = Boolean(windVaneFile.value);
  clearWindVaneFileFromState();
  if (hadFile) await saveCurrentProjectSnapshot();
}

async function handleWindVaneFileChange(event) {
  const previousUploadedAt = windVaneFile.value?.uploadedAt || '';
  await handleWindVaneFileChangeInState(event);
  if ((windVaneFile.value?.uploadedAt || '') !== previousUploadedAt) {
    await saveCurrentProjectSnapshot();
  }
}

async function handleFileDrop(event) {
  const previousUploadedAt = windVaneFile.value?.uploadedAt || '';
  await handleFileDropInState(event);
  if ((windVaneFile.value?.uploadedAt || '') !== previousUploadedAt) {
    await saveCurrentProjectSnapshot();
  }
}

setupProjectLibraryWatchers();
void initializeDatabaseState();
</script>

<template>
  <MaterialExtractorPage
    v-if="activeStandaloneView === 'materialExtractor'"
    :active-project-id="activeProjectId"
    :active-project-name="activeProjectName"
    :ai-config="state.aiConfig"
    @close="closeMaterialExtractor"
  />
  <div v-else class="app-shell">
    <header class="app-header">
      <button class="logo" type="button" title="返回首页" aria-label="返回首页" @click="backToProjectList">
        <svg class="logo-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path v-for="path in ICONS.brain" :key="path" :d="path" />
        </svg>
        脑洞组装工坊
      </button>
      <StageIndicator v-if="isEditorOpen" :stage="state.stage" :active-stage="activeStageView"
        @navigate="navigateStageView" />
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" type="button" @click="openMaterialExtractor">
          素材抽取
        </button>
        <button class="btn btn-secondary btn-sm" type="button" @click="showFavoritesModal = true">
          收藏库
        </button>
        <button class="btn btn-secondary btn-sm" type="button" @click="showPromptModal = true">
          提示词
        </button>
        <button v-if="!isEditorOpen" class="btn btn-secondary btn-sm" type="button" @click="openApiConfigModal">
          <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path v-for="path in ICONS.settings" :key="path" :d="path" />
          </svg>
          API 配置
        </button>
        <button class="btn btn-secondary btn-sm" type="button" @click="toggleTheme"
          :title="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'">
          <svg v-if="theme === 'dark'" class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <svg v-else class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
      </div>
    </header>

    <ProjectHome
      v-if="!isEditorOpen"
      :project-cards="projectCards"
      :active-project-id="activeProjectId"
      :project-sort-by="projectSortBy"
      :editing-project-id="editingProjectId"
      :editing-project-name="editingProjectName"
      :empty-icon-paths="ICONS.bookOpen"
      @import-data-json="handleDataJsonImport"
      @export-data-json="exportAllDataAsJson"
      @create-project="showProjectModal = true"
      @set-project-sort="setProjectSort"
      @update:editing-project-name="editingProjectName = $event"
      @save-project-name="saveProjectName"
      @cancel-edit-project-name="cancelEditProjectName"
      @start-edit-project-name="startEditProjectName"
      @select-project="selectProject"
      @delete-project="deleteProject"
    />

    <div v-else class="main-container" :class="{
      'left-collapsed': isLeftPanelCollapsed,
      'right-collapsed': isRightPanelCollapsed,
    }">
      <EditorLeftPanel
        :is-collapsed="isLeftPanelCollapsed"
        :ai-config="state.aiConfig"
        :active-project-name="activeProjectName"
        :has-active-project="hasActiveProject"
        :story-start="state.storyStart"
        :wind-vane-file="windVaneFile"
        :is-loading="isLoading"
        :file-text-icon-paths="ICONS.fileText"
        @toggle-panel="togglePanel('left')"
        @open-api-config="openApiConfigModal"
        @open-project-manager="showProjectModal = true"
        @update:story-start="state.storyStart = $event"
        @choose-wind-vane-file="uploadInputRef?.click()"
        @wind-vane-file-change="handleWindVaneFileChange"
        @wind-vane-file-dragover="handleWindVaneDragOver"
        @wind-vane-file-dragleave="handleWindVaneDragLeave"
        @wind-vane-file-drop="handleFileDrop"
        @clear-wind-vane-file="clearWindVaneFile"
        @clear-brainhole-input="clearBrainholeInput"
        @generate-brainhole="generateBrainhole"
      />

      <main class="panel panel-center">
        <EditorEmptyState
          v-if="!hasStoryContent"
          :story-start="state.storyStart"
          :wind-vane-file="windVaneFile"
          :is-loading="isLoading"
          :file-text-icon-paths="ICONS.fileText"
          @open-manual-brainhole-modal="openManualBrainholeModal"
        />
        <StoryStageWorkspace
          v-else
          :active-stage-view-label="activeStageViewLabel"
          :stage-progress-text="stageLabelFor(state.stage)"
          :active-stage-empty-text="activeStageEmptyText"
          :visible-story-blocks="visibleStoryBlocks"
          :show-brainhole-action="showBrainholeAction"
          :show-current-choice-panel="showCurrentChoicePanel"
          :show-style-panel="showStylePanel"
          :show-final-actions="showFinalActions"
          :pending-plot-generation-available="pendingPlotGenerationAvailable"
          :pending-choice-generation-available="pendingChoiceGenerationAvailable"
          :pending-choice-generation-label="pendingChoiceGenerationLabel"
          :is-loading="isLoading"
          :loading-message="loadingMessage"
          :editing-block-id="editingBlockId"
          :editing-content="editingContent"
          :selected-story-block-id="selectedStoryBlockId"
          :story-start="state.storyStart"
          :wind-vane-file="windVaneFile"
          :brainhole-options="state.brainholeOptions"
          :selected-brainhole-index="state.selectedBrainholeIndex"
          :brainhole-score-labels="BRAINHOLE_SCORE_LABELS"
          :icons="ICONS"
          :current-choice-title="currentChoiceTitle"
          :current-choices="currentChoices"
          :current-choice-type="currentChoiceType"
          :selected-choice-index="selectedChoiceIndex"
          :style-input="styleInput"
          :custom-prompt-instruction="state.customPromptInstruction"
          :quick-styles="QUICK_STYLES"
          :is-plot-block="isPlotBlock"
          :is-latest-regeneratable-plot-block="isLatestRegeneratablePlotBlock"
          :format-plot-choice="normalizePlotChoice"
          @favorite-story-block="favoriteStoryBlock"
          @select-story-block="selectStoryBlock"
          @start-edit-block="openAssistantEditor"
          @delete-plot-block="deletePlotBlock"
          @regenerate-plot-block-result="regeneratePlotBlockResult"
          @update:editing-content="editingContent = $event"
          @update-final-work-draft="updateFinalWorkDraft"
          @save-final-work="saveFinalWork"
          @save-edit-block="saveEditBlock"
          @cancel-edit-block="cancelEditBlock"
          @update:story-start="state.storyStart = $event"
          @choose-wind-vane-file="uploadInputRef?.click()"
          @wind-vane-file-change="handleWindVaneFileChange"
          @wind-vane-file-dragover="handleWindVaneDragOver"
          @wind-vane-file-dragleave="handleWindVaneDragLeave"
          @wind-vane-file-drop="handleFileDrop"
          @clear-wind-vane-file="clearWindVaneFile"
          @clear-brainhole-options="clearBrainholeOptions"
          @generate-brainhole="generateBrainhole"
          @open-manual-brainhole-modal="openManualBrainholeModal"
          @select-brainhole-option="selectBrainholeOption"
          @unselect-brainhole-option="unselectBrainholeOption"
          @start-edit-brainhole-option="startEditBrainholeOption"
          @favorite-brainhole-option="favoriteBrainholeOption"
          @delete-brainhole-option="deleteBrainholeOption"
          @generate-guide-and-first-plot="generateGuideAndFirstPlot"
          @select-choice="handleChoiceSelect"
          @regenerate-current-choices="regenerateCurrentChoices"
          @generate-current-choice-result-variants="handleGenerateCurrentChoiceResultVariants"
          @continue-pending-plot-generation="continuePendingPlotGeneration"
          @generate-pending-choices="generatePendingChoices"
          @update-current-choice-option="updateCurrentChoiceOption"
          @add-current-choice-option="addCurrentChoiceOption"
          @delete-current-choice-option="deleteCurrentChoiceOption"
          @favorite-current-choice="favoriteCurrentChoice"
          @update:style-input="styleInput = $event"
          @update:custom-prompt-instruction="state.customPromptInstruction = $event"
          @final-writing="finalWriting"
          @copy-final-work="copyFinalWork"
          @download-final-work="downloadFinalWork"
          @reset-all="resetAll"
        />
      </main>

      <EditorRightPanel
        :collapsed="isRightPanelCollapsed"
        :can-copy-body="canCopyCurrentBody"
        :active-tab="rightPanelActiveTab"
        :prompt-automation-settings="promptAutomationSettings"
        :copy-selected-choices-with-body="copySelectedChoicesWithBody"
        :copy-body-preview-text="copyBodyPreviewText"
        @toggle-collapse="togglePanel('right')"
        @update:active-tab="rightPanelActiveTab = $event"
        @update-prompt-automation-setting="updatePromptAutomationSetting"
        @copy-body="copyFinalBodyFromSidebar"
        @update:copy-selected-choices-with-body="copySelectedChoicesWithBody = $event"
      />
    </div>

    <AssistantFullscreenModal
      :visible="showAssistantModal"
      :selected-story-block-title="selectedStoryBlockTitle"
      :selected-story-block-content="selectedStoryBlock?.content || ''"
      :assistant-input="assistantInput"
      :assistant-messages="assistantMessages"
      :assistant-loading="assistantLoading"
      :can-use-assistant="canUseAssistant"
      :editing-content="assistantEditingContent"
      :is-editing="assistantEditing"
      :editing-message-id="assistantEditingMessageId"
      :editing-message-content="assistantEditingMessageContent"
      @close="closeAssistantModal"
      @update:assistant-input="assistantInput = $event"
      @update:editing-content="assistantEditingContent = $event"
      @update:editing-message-content="assistantEditingMessageContent = $event"
      @send-assistant-message="sendAssistantMessage"
      @apply-assistant-rewrite="applyAssistantRewrite"
      @clear-assistant-conversation="clearAssistantConversation"
      @start-edit="startAssistantEdit"
      @save-edit="saveAssistantEdit"
      @cancel-edit="cancelAssistantEdit"
      @start-edit-message="startEditAssistantMessage"
      @save-edit-message="saveEditAssistantMessage"
      @cancel-edit-message="cancelEditAssistantMessage"
      @delete-message="deleteAssistantMessage"
      @regenerate-message="regenerateAssistantMessage"
    />

    <ManualBrainholeModal
      :visible="showManualBrainholeModal"
      :draft="manualBrainholeDraft"
      :is-loading="isLoading"
      @close="cancelManualBrainholeModal"
      @update-draft-field="updateManualBrainholeDraftField"
      @save="addManualBrainholeOption"
    />

    <BrainholeOptionEditModal
      :visible="editingBrainholeIndex !== null"
      :draft="editingBrainholeDraft"
      :option-index="editingBrainholeIndex ?? 0"
      :is-loading="isLoading"
      @close="cancelEditBrainholeOption"
      @save="saveBrainholeOption()"
    />

    <FavoritesLibraryModal
      :visible="showFavoritesModal"
      :tabs="FAVORITE_TABS"
      :active-tab="activeFavoriteTab"
      :favorites="favorites"
      :favorite-items="favoriteItemsForActiveTab"
      :can-choose-favorite-brainhole="canChooseFavoriteBrainhole"
      :can-append-favorite-brainhole="canAppendFavoriteBrainhole"
      :score-labels="BRAINHOLE_SCORE_LABELS"
      :normalize-plot-choice="normalizePlotChoice"
      @close="showFavoritesModal = false"
      @update:active-tab="activeFavoriteTab = $event"
      @open-add-favorite="openAddFavoriteModal"
      @append-brainhole="appendFavoriteBrainhole"
      @choose-brainhole="chooseFavoriteBrainhole"
      @edit-favorite="startEditFavorite"
      @delete-favorite="deleteFavorite"
    />

    <FavoriteFormModal
      :visible="showAddFavoriteModal"
      mode="add"
      :type="activeFavoriteTab"
      :type-label="FAVORITE_TABS.find((tab) => tab.value === activeFavoriteTab)?.label || '收藏'"
      :description="activeProjectName"
      :draft="manualFavoriteDraft"
      @close="cancelAddFavorite"
      @save="addManualFavorite"
    />

    <FavoriteFormModal
      :visible="Boolean(editingFavoriteItem)"
      mode="edit"
      :type="editingFavoriteItem ? editingFavoriteItem.type : 'brainhole'"
      :type-label="editingFavoriteTypeLabel"
      :description="editingFavoriteModalDescription"
      :draft="editingFavoriteDraft"
      @close="cancelEditFavorite"
      @save="saveFavorite"
    />

    <ProjectManagerModal
      :visible="showProjectModal"
      :projects="projects"
      :active-project-id="activeProjectId"
      :new-project-name="newProjectName"
      :editing-project-id="editingProjectId"
      :editing-project-name="editingProjectName"
      @close="showProjectModal = false"
      @update:new-project-name="newProjectName = $event"
      @update:editing-project-name="editingProjectName = $event"
      @create-project="createProject"
      @save-project-name="saveProjectName"
      @cancel-edit-project-name="cancelEditProjectName"
      @start-edit-project-name="startEditProjectName"
      @select-project="selectProject"
      @delete-project="deleteProject"
    />

    <ApiConfigModal
      :visible="showApiConfigModal"
      :api-config-draft="apiConfigDraft"
      :show-api-key="showApiKey"
      :model-fetch-loading="modelFetchLoading"
      @close="closeApiConfigModal"
      @update:show-api-key="showApiKey = $event"
      @update-api-config="updateApiConfigDraftField"
      @fetch-models="handleFetchModels"
      @clear="clearCurrentApiConfig"
      @reset="resetApiConfigDraft"
      @save="saveCurrentApiConfig"
    />

    <PromptConfigModal
      :visible="showPromptModal"
      :prompt-configs="promptConfigs"
      :active-prompt-id="activePromptId"
      :active-prompt-config="activePromptConfig"
      :editor-version="promptEditorVersion"
      @close="requestClosePromptModal"
      @update:active-prompt-id="activePromptId = $event"
      @update-prompt-config="updatePromptConfigField"
      @reset="resetPromptConfigs"
    />

    <ToastStack :toasts="toasts" />
  </div>
</template>
