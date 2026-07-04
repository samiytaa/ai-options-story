<script setup>
import { computed, reactive, ref } from 'vue';
import ChoiceList from './components/ChoiceList.vue';
import StageIndicator from './components/StageIndicator.vue';
import ToastStack from './components/ToastStack.vue';
import { GUIDE_DB, guideCategories } from './data/guideDb';
import { DEFAULT_PROMPTS, clonePromptConfigs } from './prompts';
import { callDeepSeek } from './services/deepseek';
import {
  buildContextSummary,
  createInitialState,
  ensureChapter,
  parseNumberedLines,
} from './storyState';

const API_KEY_STORAGE = 'deepseek_api_key_brainhole';
const PROMPT_CONFIG_STORAGE = 'brainhole_prompt_configs';
const QUICK_STYLES = ['古龙风', '言情甜宠', '严肃文学', '悬疑冷峻', '轻快搞笑', '细腻文艺'];
const ICONS = {
  brain: [
    'M12 5a3 3 0 0 0-5.76-1.15A3.5 3.5 0 0 0 2 7.25c0 1.12.52 2.12 1.34 2.76A3.5 3.5 0 0 0 2 12.75a3.5 3.5 0 0 0 3.5 3.5H6a3 3 0 0 0 6 0V5Z',
    'M12 5a3 3 0 0 1 5.76-1.15A3.5 3.5 0 0 1 22 7.25c0 1.12-.52 2.12-1.34 2.76A3.5 3.5 0 0 1 22 12.75a3.5 3.5 0 0 1-3.5 3.5H18a3 3 0 0 1-6 0V5Z',
    'M8.5 8.5a2 2 0 0 0 2-2',
    'M15.5 8.5a2 2 0 0 1-2-2',
    'M8.5 14a2.5 2.5 0 0 1 0-5',
    'M15.5 14a2.5 2.5 0 0 0 0-5',
  ],
  lightbulb: [
    'M15 14c.2-1.3.83-2.07 1.53-2.95A6 6 0 1 0 7.47 11.05C8.17 11.93 8.8 12.7 9 14',
    'M9 18h6',
    'M10 22h4',
    'M10 14h4',
  ],
  scroll: [
    'M8 21h10a2 2 0 0 0 2-2V7a4 4 0 0 0-4-4H6a2 2 0 0 0-2 2v11a3 3 0 0 0 3 3h1',
    'M8 21a3 3 0 0 1 0-6h10',
    'M9 7h6',
    'M9 11h7',
  ],
  bookOpen: [
    'M12 7v14',
    'M3 5.5A2.5 2.5 0 0 1 5.5 3H12v18H5.5A2.5 2.5 0 0 1 3 18.5v-13Z',
    'M21 5.5A2.5 2.5 0 0 0 18.5 3H12v18h6.5A2.5 2.5 0 0 0 21 18.5v-13Z',
  ],
  fileText: [
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z',
    'M14 2v6h6',
    'M16 13H8',
    'M16 17H8',
    'M10 9H8',
  ],
};

const THEME_STORAGE = 'brainhole_theme';
const savedApiKey = localStorage.getItem(API_KEY_STORAGE) || '';
const savedTheme = localStorage.getItem(THEME_STORAGE) || 'dark';
const state = reactive(createInitialState(savedApiKey));

const theme = ref(savedTheme);
const apiKeyInput = ref(savedApiKey);
const showApiKey = ref(false);
const loadingMessage = ref('');
const toasts = ref([]);
const storyBlocks = ref([]);
const selectedChoiceIndex = ref(null);
const styleInput = ref('');
const showPromptModal = ref(false);
const activePromptId = ref('brainhole');
const promptConfigs = reactive(loadPromptConfigs());
const editingBlockId = ref(null);
const editingContent = ref('');

const progressPercent = computed(() => {
  const stages = ['setup', 'brainhole', 'guide', 'ch1', 'ch2', 'ch3', 'ch4_bighooks', 'style_writing', 'complete'];
  const currentIndex = Math.max(0, stages.indexOf(state.stage));
  return Math.round((currentIndex / (stages.length - 1)) * 100);
});

const isLoading = computed(() => Boolean(loadingMessage.value));
const hasStoryContent = computed(() => storyBlocks.value.length > 0);
const styleMode = computed(() => state.bigHookChosen !== null && !state.finalWork);
const currentChoiceType = computed(() => {
  if (styleMode.value) return 'style';
  if (state.bigHooks.length && state.bigHookChosen === null) return 'bighook';
  if (state.currentHooks.length) return 'hook';
  if (state.currentOptions.length) return 'option';
  return null;
});
const currentChoices = computed(() => {
  if (currentChoiceType.value === 'bighook') return state.bigHooks;
  if (currentChoiceType.value === 'hook') return state.currentHooks;
  if (currentChoiceType.value === 'option') return state.currentOptions;
  return [];
});
const activePromptConfig = computed(() => promptConfigs.find((prompt) => prompt.id === activePromptId.value) || promptConfigs[0]);
const chapterSummary = computed(() => {
  if (!hasStoryContent.value) return '尚未开始';
  return `已创建 ${state.chapters.length} 章 | 当前：第${state.currentChapter}章 剧情点${state.currentPlotPointIndex + 1}/4`;
});
const outlineEntries = computed(() => {
  const entries = [];

  if (state.brainhole) {
    entries.push({
      key: 'brainhole',
      badge: '脑洞',
      badgeClass: 'badge-info',
      text: `${state.brainhole.slice(0, 80)}...`,
    });
  }

  if (state.guide) {
    entries.push({
      key: 'guide',
      badge: '导语',
      badgeClass: 'badge-warn',
      text: `${state.guide.slice(0, 80)}...`,
    });
  }

  state.chapters.forEach((chapter) => {
    entries.push({
      key: `chapter-${chapter.chapterNum}`,
      type: 'chapter-title',
      text: `第${chapter.chapterNum}章`,
    });

    chapter.plotPoints.forEach((plotPoint, index) => {
      entries.push({
        key: `chapter-${chapter.chapterNum}-plot-${index}`,
        type: 'plot',
        text: `剧情点${index + 1}: ${plotPoint.desc.slice(0, 50)}...`,
        note: `选了选项${plotPoint.chosenOption + 1}`,
      });
    });

    if (chapter.hookChosen !== null && chapter.hookOptions[chapter.hookChosen]) {
      entries.push({
        key: `chapter-${chapter.chapterNum}-hook`,
        type: 'hook',
        text: `钩子: ${chapter.hookOptions[chapter.hookChosen].slice(0, 40)}...`,
      });
    }
  });

  if (state.bigHookChosen !== null && state.bigHooks[state.bigHookChosen]) {
    entries.push({
      key: 'big-hook',
      type: 'big-hook',
      text: `大钩子: ${state.bigHooks[state.bigHookChosen].slice(0, 40)}...`,
    });
  }

  if (state.finalStyle) {
    entries.push({
      key: 'final-style',
      badge: '文风',
      badgeClass: 'badge-success',
      text: state.finalStyle,
    });
  }

  return entries;
});

function pushToast(message, type = 'info') {
  const id = Date.now() + Math.random();
  toasts.value.push({ id, message, type });
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }, 3000);
}

function setLoading(message = '') {
  loadingMessage.value = message;
}

function syncApiKeyToState() {
  state.apiKey = apiKeyInput.value.trim();
}

function saveApiKey() {
  syncApiKeyToState();
  if (!state.apiKey) {
    pushToast('请先输入 API Key', 'error');
    return;
  }
  localStorage.setItem(API_KEY_STORAGE, state.apiKey);
  pushToast('API Key 已保存到本地浏览器', 'success');
}

function clearApiKey() {
  apiKeyInput.value = '';
  state.apiKey = '';
  localStorage.removeItem(API_KEY_STORAGE);
  pushToast('API Key 已清除', 'success');
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

function updateStage(stage) {
  state.stage = stage;
}

function resetChoiceSelection() {
  selectedChoiceIndex.value = null;
}

function resetEditing() {
  editingBlockId.value = null;
  editingContent.value = '';
}

function resetAll() {
  const retainedApiKey = state.apiKey || apiKeyInput.value.trim();
  Object.assign(state, createInitialState(retainedApiKey));
  apiKeyInput.value = retainedApiKey;
  storyBlocks.value = [];
  styleInput.value = '';
  resetChoiceSelection();
  resetEditing();
  pushToast('已重置，可以开始新创作', 'info');
}

function confirmReset() {
  if (window.confirm('确定要重置全部内容吗？这将清除所有创作进度。')) {
    resetAll();
  }
}

function collectGuideSamples() {
  let samples = [];

  state.guideDbSelection.forEach((category) => {
    if (GUIDE_DB[category]) {
      samples = samples.concat(GUIDE_DB[category]);
    }
  });

  if (!samples.length) {
    samples = Object.values(GUIDE_DB).flat().slice(0, 6);
  }

  return [...samples].sort(() => Math.random() - 0.5).slice(0, Math.min(5, samples.length));
}

function loadPromptConfigs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROMPT_CONFIG_STORAGE) || '[]');
    if (!Array.isArray(saved)) return clonePromptConfigs();
    return DEFAULT_PROMPTS.map((defaultPrompt) => ({
      ...defaultPrompt,
      ...(saved.find((item) => item.id === defaultPrompt.id) || {}),
      id: defaultPrompt.id,
      title: defaultPrompt.title,
      description: defaultPrompt.description,
      temperature: defaultPrompt.temperature,
    }));
  } catch {
    return clonePromptConfigs();
  }
}

function savePromptConfigs() {
  localStorage.setItem(PROMPT_CONFIG_STORAGE, JSON.stringify(promptConfigs));
  pushToast('提示词已保存', 'success');
}

function resetPromptConfigs() {
  promptConfigs.splice(0, promptConfigs.length, ...clonePromptConfigs());
  localStorage.removeItem(PROMPT_CONFIG_STORAGE);
  pushToast('已恢复默认提示词', 'info');
}

function getPromptConfig(id) {
  return promptConfigs.find((prompt) => prompt.id === id) || DEFAULT_PROMPTS.find((prompt) => prompt.id === id);
}

function renderPrompt(template, values = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '');
}

function buildPromptMessages(id, values) {
  const config = getPromptConfig(id);
  return [
    { role: 'system', content: renderPrompt(config.systemPrompt, values).trim() },
    { role: 'user', content: renderPrompt(config.userPrompt, values).trim() },
  ];
}

async function requestDeepSeek(messages, temperature = 0.85) {
  syncApiKeyToState();
  return callDeepSeek({
    apiKey: state.apiKey,
    messages,
    temperature,
  });
}

function setBrainholeBlock(content) {
  storyBlocks.value = [
    {
      id: 'brainhole',
      title: '生成的脑洞',
      titleIcon: 'lightbulb',
      content,
      blockClass: '',
      divider: '',
    },
  ];
}

function setGuideAndFirstPlotBlocks(guideContent, firstPlotContent) {
  storyBlocks.value = [
    {
      id: 'guide',
      title: '导语',
      titleIcon: 'scroll',
      content: guideContent,
      blockClass: 'guide-block',
      divider: '',
    },
    {
      id: 'plot-1-1',
      title: '',
      content: firstPlotContent,
      blockClass: '',
      divider: '▼ 第一章 · 剧情点 1/4 ▼',
    },
  ];
}

function appendPlotBlock(chapterNum, plotIndex, content) {
  storyBlocks.value.push({
    id: `plot-${chapterNum}-${plotIndex}`,
    title: '',
    content,
    blockClass: '',
    divider: `▼ 第${chapterNum}章 · 剧情点 ${plotIndex}/4 ▼`,
  });
}

function parsePlotBlockId(blockId) {
  const match = blockId.match(/^plot-(\d+)-(\d+)$/);
  if (!match) return null;
  return {
    chapterNum: Number(match[1]),
    plotIndex: Number(match[2]),
    zeroIndex: Number(match[2]) - 1,
  };
}

function updateStoryBlockContent(blockId, content) {
  const block = storyBlocks.value.find((item) => item.id === blockId);
  if (block) block.content = content;
}

function startEditBlock(block) {
  if (isLoading.value) return;
  editingBlockId.value = block.id;
  editingContent.value = block.content;
}

function cancelEditBlock() {
  resetEditing();
}

function syncEditedBlockToState(blockId, content) {
  if (blockId === 'brainhole') {
    state.brainhole = content;
    return;
  }

  if (blockId === 'guide') {
    state.guide = content;
    return;
  }

  if (blockId === 'final-work') {
    state.finalWork = content;
    return;
  }

  const plotRef = parsePlotBlockId(blockId);
  if (!plotRef) return;

  const chapter = state.chapters.find((item) => item.chapterNum === plotRef.chapterNum);
  const committedPlot = chapter?.plotPoints?.[plotRef.zeroIndex];
  if (committedPlot) committedPlot.desc = content;

  if (state.currentChapter === plotRef.chapterNum) {
    state.plotPointContents[plotRef.zeroIndex] = content;
  }
}

function saveEditBlock(blockId) {
  const content = editingContent.value.trim();
  if (!content) {
    pushToast('内容不能为空', 'error');
    return;
  }

  updateStoryBlockContent(blockId, content);
  syncEditedBlockToState(blockId, content);
  resetEditing();
  pushToast('内容已更新', 'success');
}

function isPlotBlock(block) {
  return Boolean(parsePlotBlockId(block.id));
}

function getBlockOrderValue(block) {
  if (block.id === 'brainhole') return 0;
  if (block.id === 'guide') return 1;
  const plotRef = parsePlotBlockId(block.id);
  if (plotRef) return 10 + plotRef.chapterNum * 100 + plotRef.plotIndex;
  if (block.id === 'final-work') return Number.MAX_SAFE_INTEGER;
  return 0;
}

function trimStoryBlocksAfter(blockId) {
  const target = storyBlocks.value.find((item) => item.id === blockId);
  if (!target) return;
  const cutoff = getBlockOrderValue(target);
  storyBlocks.value = storyBlocks.value.filter((block) => getBlockOrderValue(block) < cutoff);
}

function getPlotContentsForChapter(chapterNum) {
  return storyBlocks.value
    .map((block) => {
      const plotRef = parsePlotBlockId(block.id);
      if (!plotRef || plotRef.chapterNum !== chapterNum) return null;
      return {
        plotIndex: plotRef.plotIndex,
        content: block.content,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.plotIndex - b.plotIndex)
    .map((item) => item.content);
}

function clearFinalAssembly() {
  state.bigHooks = [];
  state.bigHookChosen = null;
  state.finalStyle = '';
  state.finalWork = '';
  styleInput.value = '';
}

function deleteFirstPlotPoint() {
  state.guide = '';
  state.chapters = [];
  state.currentChapter = 1;
  state.currentPlotPointIndex = 0;
  state.plotPointContents = [];
  state.currentOptions = [];
  state.currentHooks = [];
  clearFinalAssembly();
  setBrainholeBlock(state.brainhole);
  updateStage('brainhole');
  resetChoiceSelection();
  pushToast('已删除第一个剧情点，可重新生成导语和开篇剧情', 'info');
}

function restorePreviousChapterHook(chapterNum) {
  const previousChapter = state.chapters.find((item) => item.chapterNum === chapterNum - 1);
  const rememberedHooks = previousChapter?.hookOptions ? [...previousChapter.hookOptions] : [];

  state.chapters = state.chapters.filter((chapter) => chapter.chapterNum < chapterNum);
  if (previousChapter) {
    previousChapter.hookChosen = null;
    previousChapter.hookOptions = rememberedHooks;
  }

  state.currentChapter = chapterNum - 1;
  state.currentPlotPointIndex = Math.max(0, (previousChapter?.plotPoints?.length || 1) - 1);
  state.plotPointContents = [];
  state.currentOptions = [];
  state.currentHooks = rememberedHooks;
  clearFinalAssembly();
  updateStage(`ch${state.currentChapter}`);
  resetChoiceSelection();
}

function restorePreviousPlotOptions(plotRef) {
  const chapter = state.chapters.find((item) => item.chapterNum === plotRef.chapterNum);
  const previousIndex = plotRef.zeroIndex - 1;
  const previousRecord = chapter?.plotPoints?.[previousIndex];
  const rememberedOptions = previousRecord?.options ? [...previousRecord.options] : [];

  if (chapter) {
    chapter.plotPoints = chapter.plotPoints.slice(0, previousIndex);
    chapter.hookChosen = null;
    chapter.hookOptions = [];
  }

  state.chapters = state.chapters.filter((chapterItem) => chapterItem.chapterNum <= plotRef.chapterNum);
  state.currentChapter = plotRef.chapterNum;
  state.currentPlotPointIndex = previousIndex;
  state.plotPointContents = getPlotContentsForChapter(plotRef.chapterNum);
  state.currentOptions = rememberedOptions;
  state.currentHooks = [];
  clearFinalAssembly();
  updateStage(`ch${plotRef.chapterNum}`);
  resetChoiceSelection();
}

function deletePlotBlock(block) {
  if (isLoading.value) return;

  const plotRef = parsePlotBlockId(block.id);
  if (!plotRef) return;

  const confirmed = window.confirm('确定删除这个剧情点吗？它之后生成的分支也会一并移除。');
  if (!confirmed) return;

  if (plotRef.chapterNum === 1 && plotRef.plotIndex === 1) {
    deleteFirstPlotPoint();
    resetEditing();
    return;
  }

  trimStoryBlocksAfter(block.id);

  if (plotRef.plotIndex === 1) {
    restorePreviousChapterHook(plotRef.chapterNum);
  } else {
    restorePreviousPlotOptions(plotRef);
  }

  resetEditing();
  pushToast('已删除剧情点，上一个节点的选项已恢复', 'success');
}

function setFinalWorkBlock(content) {
  storyBlocks.value = [
    {
      id: 'final-work',
      title: `完整作品（文风：${state.finalStyle}）`,
      titleIcon: 'bookOpen',
      content,
      blockClass: 'final-work-block',
      divider: '',
    },
  ];
}

async function generateBrainhole() {
  const storyStart = state.storyStart.trim();
  const trend = state.trend.trim() || '悬疑反转';

  if (!storyStart) {
    pushToast('请先输入故事起点', 'error');
    return;
  }

  syncApiKeyToState();
  if (!state.apiKey) {
    pushToast('请先输入 DeepSeek API Key', 'error');
    return;
  }

  state.storyStart = storyStart;
  state.trend = trend;
  resetChoiceSelection();
  setLoading('正在生成脑洞...');
  updateStage('brainhole');

  try {
    const samplesToUse = collectGuideSamples();
    const promptConfig = getPromptConfig('brainhole');
    const result = await requestDeepSeek(
      buildPromptMessages('brainhole', {
        storyStart,
        trend,
        guideSamples: samplesToUse.map((sample, index) => `${index + 1}. ${sample}`).join('\n'),
      }),
      promptConfig.temperature,
    );

    state.brainhole = result;
    state.guide = '';
    state.chapters = [];
    state.currentOptions = [];
    state.currentHooks = [];
    state.bigHooks = [];
    state.bigHookChosen = null;
    state.finalStyle = '';
    state.finalWork = '';
    state.plotPointContents = [];
    setBrainholeBlock(result);
    pushToast('脑洞生成成功！', 'success');
  } catch (error) {
    updateStage('setup');
    pushToast(`生成脑洞失败：${error.message}`, 'error');
  } finally {
    setLoading();
  }
}

async function generateGuideAndFirstPlot() {
  setLoading('正在生成导语和第一个剧情点...');
  updateStage('guide');

  try {
    const promptConfig = getPromptConfig('guideAndFirstPlot');
    const result = await requestDeepSeek(
      buildPromptMessages('guideAndFirstPlot', {
        contextSummary: buildContextSummary(state),
      }),
      promptConfig.temperature,
    );

    const guideMatch = result.match(/【导语】\s*([\s\S]*?)【第一个剧情点】/);
    const plotMatch = result.match(/【第一个剧情点】\s*([\s\S]*?)$/);

    const guideContent = guideMatch ? guideMatch[1].trim() : result.slice(0, 300).trim();
    const firstPlotContent = (plotMatch ? plotMatch[1].trim() : '') || '（剧情点内容）';

    state.guide = guideContent;
    state.currentChapter = 1;
    state.currentPlotPointIndex = 0;
    state.plotPointContents = [firstPlotContent];
    state.chapters = [];
    state.currentOptions = [];
    state.currentHooks = [];
    state.bigHooks = [];
    state.bigHookChosen = null;
    state.finalStyle = '';
    state.finalWork = '';
    setGuideAndFirstPlotBlocks(guideContent, firstPlotContent);

    await generateOptionsForCurrentPlotPoint();
    updateStage('ch1');
    pushToast('导语生成成功！请选择剧情发展方向', 'success');
  } catch (error) {
    pushToast(`生成导语失败：${error.message}`, 'error');
  } finally {
    setLoading();
  }
}

async function generateOptionsForCurrentPlotPoint() {
  setLoading('正在生成剧情选项...');
  resetChoiceSelection();

  try {
    const currentPlotDesc = state.plotPointContents[state.currentPlotPointIndex] || '';
    const chapterNum = state.currentChapter;
    const plotIndex = state.currentPlotPointIndex + 1;
    const promptConfig = getPromptConfig('options');
    const result = await requestDeepSeek(
      buildPromptMessages('options', {
        chapterNum,
        plotIndex,
        contextSummary: buildContextSummary(state),
        currentPlotDesc,
      }),
      promptConfig.temperature,
    );

    state.currentOptions = parseNumberedLines(result, '选项', '继续发展剧情选项');
  } catch (error) {
    state.currentOptions = [];
    pushToast(`生成选项失败：${error.message}`, 'error');
  } finally {
    setLoading();
  }
}

async function generateNextPlotPoint(chosenOptionText) {
  setLoading('正在生成下一个剧情点...');

  try {
    const chapterNum = state.currentChapter;
    const plotIndex = state.currentPlotPointIndex + 1;
    const promptConfig = getPromptConfig('nextPlotPoint');
    const result = await requestDeepSeek(
      buildPromptMessages('nextPlotPoint', {
        chosenOptionText,
        chapterNum,
        plotIndex,
        contextSummary: buildContextSummary(state),
      }),
      promptConfig.temperature,
    );

    state.plotPointContents.push(result);
    appendPlotBlock(chapterNum, plotIndex, result);
    updateStage(`ch${chapterNum}`);
    await generateOptionsForCurrentPlotPoint();
  } catch (error) {
    pushToast(`生成剧情点失败：${error.message}`, 'error');
  } finally {
    setLoading();
  }
}

async function generateHooks() {
  setLoading('正在生成章节钩子...');
  resetChoiceSelection();
  state.currentOptions = [];

  try {
    const chapterNum = state.currentChapter;
    const promptConfig = getPromptConfig('hooks');
    const result = await requestDeepSeek(
      buildPromptMessages('hooks', {
        chapterNum,
        contextSummary: buildContextSummary(state),
        chapterFourHookNote: chapterNum >= 4 ? '4. 这是第四章的钩子，需要更强的冲击力，为大钩子做铺垫。' : '',
      }),
      promptConfig.temperature,
    );

    state.currentHooks = parseNumberedLines(result, '钩子', '悬念钩子');
    updateStage(`ch${chapterNum}`);
  } catch (error) {
    state.currentHooks = [];
    pushToast(`生成钩子失败：${error.message}`, 'error');
  } finally {
    setLoading();
  }
}

async function generateBigHooks() {
  setLoading('正在生成大钩子（第四章）...');
  resetChoiceSelection();
  state.currentHooks = [];
  updateStage('ch4_bighooks');

  try {
    const promptConfig = getPromptConfig('bigHooks');
    const result = await requestDeepSeek(
      buildPromptMessages('bigHooks', {
        contextSummary: buildContextSummary(state),
      }),
      promptConfig.temperature,
    );

    state.bigHooks = parseNumberedLines(result, '大钩子', '重大转折');
  } catch (error) {
    state.bigHooks = [];
    pushToast(`生成大钩子失败：${error.message}`, 'error');
  } finally {
    setLoading();
  }
}

async function handleChoiceSelect(index, type) {
  if (isLoading.value) return;

  selectedChoiceIndex.value = index;

  if (type === 'option') {
    const chosenOption = state.currentOptions[index];
    const currentPlotDesc = state.plotPointContents[state.currentPlotPointIndex] || '';
    const chapter = ensureChapter(state);

    chapter.plotPoints.push({
      desc: currentPlotDesc,
      chosenOption: index,
      options: [...state.currentOptions],
    });

    if (state.currentPlotPointIndex >= 3) {
      pushToast('本章4个剧情点已完成，正在生成章节钩子...', 'info');
      await generateHooks();
      return;
    }

    state.currentPlotPointIndex += 1;
    await generateNextPlotPoint(chosenOption);
    return;
  }

  if (type === 'hook') {
    const chapter = ensureChapter(state);
    chapter.hookChosen = index;
    chapter.hookOptions = [...state.currentHooks];
    state.currentHooks = [];

    if (state.currentChapter >= 4) {
      pushToast('第四章完成！正在生成大钩子...', 'info');
      await generateBigHooks();
      return;
    }

    state.currentChapter += 1;
    state.currentPlotPointIndex = 0;
    state.plotPointContents = [];
    state.currentOptions = [];
    resetChoiceSelection();
    pushToast(`进入第${state.currentChapter}章！`, 'success');
    await generateNextPlotPoint(`（承接上一章钩子：${chapter.hookOptions[index]}）`);
    return;
  }

  if (type === 'bighook') {
    state.bigHookChosen = index;
    state.finalWork = '';
    state.bigHooks = [...state.bigHooks];
    updateStage('style_writing');
    resetChoiceSelection();
    pushToast('大钩子已选择！剧情组装完成，请输入文风开始写作', 'success');
  }
}

async function regenerateCurrentChoices(type) {
  if (type === 'hook') {
    await generateHooks();
    return;
  }
  if (type === 'bighook') {
    await generateBigHooks();
    return;
  }
  await generateOptionsForCurrentPlotPoint();
}

async function finalWriting() {
  const style = styleInput.value.trim();
  if (!style) {
    pushToast('请输入文风', 'error');
    return;
  }

  state.finalStyle = style;
  updateStage('style_writing');
  setLoading('正在根据完整剧情大纲和文风生成作品...这可能需要30-60秒...');

  try {
    const promptConfig = getPromptConfig('finalWriting');
    const result = await requestDeepSeek(
      buildPromptMessages('finalWriting', {
        contextSummary: buildContextSummary(state),
        style,
      }),
      promptConfig.temperature,
    );

    state.finalWork = result;
    updateStage('complete');
    setFinalWorkBlock(result);
    pushToast('作品生成完成！', 'success');
  } catch (error) {
    pushToast(`生成作品失败：${error.message}`, 'error');
  } finally {
    setLoading();
  }
}

async function copyFinalWork() {
  try {
    await navigator.clipboard.writeText(state.finalWork);
    pushToast('已复制到剪贴板！', 'success');
  } catch {
    pushToast('复制失败，请手动选择复制', 'error');
  }
}

function downloadFinalWork() {
  const blob = new Blob([state.finalWork], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '脑洞组装_完整作品.txt';
  link.click();
  URL.revokeObjectURL(url);
  pushToast('下载成功！', 'success');
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <span class="logo">
        <svg class="logo-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path v-for="path in ICONS.brain" :key="path" :d="path" />
        </svg>
        脑洞组装工坊
      </span>
      <StageIndicator :stage="state.stage" />
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" type="button" @click="showPromptModal = true">
          提示词
        </button>
        <button class="btn btn-theme" type="button" @click="toggleTheme"
          :title="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'">
          <svg v-if="theme === 'dark'" class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
          <svg v-else class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
      </div>
    </header>

    <div class="main-container">
      <aside class="panel panel-left">
        <div class="section-title">API 设置</div>
        <div>
          <label for="api-key-input">DeepSeek API Key</label>
          <div class="inline-row">
            <input id="api-key-input" v-model="apiKeyInput" :type="showApiKey ? 'text' : 'password'" class="mono-input"
              placeholder="sk-xxxxxxxxxxxxxxxx" />
            <button class="btn btn-secondary btn-sm icon-btn" type="button" @click="showApiKey = !showApiKey">
              {{ showApiKey ? '隐藏' : '显示' }}
            </button>
          </div>
          <p class="helper-text"></p>
        </div>

        <div class="btn-row">
          <button class="btn btn-secondary btn-sm" type="button" @click="saveApiKey">保存 Key</button>
          <button class="btn btn-secondary btn-sm" type="button" @click="clearApiKey">清除</button>
        </div>

        <hr class="divider" />

        <div class="section-title">故事起点</div>
        <textarea v-model="state.storyStart"
          placeholder="只输入故事的起点，不输入完整脑洞。&#10;例如：&#10;• 一个失忆的杀手在雨夜醒来&#10;• 修仙门派发现了一个没有灵根的弟子&#10;• 社畜意外继承了神秘古董店" />

        <div class="section-title">风向标（当月热门题材）</div>
        <input v-model="state.trend" type="text" placeholder="例如：重生复仇、系统流、悬疑短篇、甜宠..." />

        <div class="section-title">导语数据库参考</div>
        <select v-model="state.guideDbSelection" multiple class="multi-select">
          <option v-for="item in guideCategories" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
        <p class="helper-text">按住 Ctrl 多选，AI 将参考这些风格生成导语。</p>

        <button class="btn btn-primary btn-block" type="button" :disabled="isLoading" @click="generateBrainhole">
          生成脑洞 & 导语
        </button>
      </aside>

      <main class="panel panel-center">
        <div v-if="!hasStoryContent" class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path v-for="path in ICONS.fileText" :key="path" :d="path" />
          </svg>
          <p class="empty-title">准备好开始创作了吗？</p>
          <p>在左侧输入故事起点和风向标，然后点击「生成脑洞 & 导语」</p>
          <p class="empty-subtitle">流程：脑洞 → 导语 → 逐章剧情选择 → 钩子 → 大钩子 → 文风成文</p>
        </div>

        <template v-else>
          <div v-for="block in storyBlocks" :key="block.id">
            <div v-if="block.title" class="section-title section-title-icon">
              <svg v-if="block.titleIcon" class="section-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path v-for="path in ICONS[block.titleIcon]" :key="path" :d="path" />
              </svg>
              {{ block.title }}
            </div>
            <div v-if="block.divider" class="chapter-divider">{{ block.divider }}</div>
            <div class="story-block">
              <div class="story-block-toolbar">
                <button
                  v-if="editingBlockId !== block.id"
                  class="btn btn-secondary btn-sm"
                  type="button"
                  :disabled="isLoading"
                  @click="startEditBlock(block)"
                >
                  编辑
                </button>
                <button
                  v-if="isPlotBlock(block)"
                  class="btn btn-danger btn-sm"
                  type="button"
                  :disabled="isLoading"
                  @click="deletePlotBlock(block)"
                >
                  删除情节点
                </button>
              </div>

              <template v-if="editingBlockId === block.id">
                <textarea v-model="editingContent" class="edit-textarea" />
                <div class="btn-row edit-actions">
                  <button class="btn btn-primary btn-sm" type="button" :disabled="isLoading" @click="saveEditBlock(block.id)">
                    保存
                  </button>
                  <button class="btn btn-secondary btn-sm" type="button" :disabled="isLoading" @click="cancelEditBlock">
                    取消
                  </button>
                </div>
              </template>
              <div v-else class="content-block" :class="block.blockClass">{{ block.content }}</div>
            </div>
          </div>

          <div v-if="state.brainhole && !state.guide" class="action-panel">
            <button class="btn btn-primary" type="button" :disabled="isLoading" @click="generateGuideAndFirstPlot">
              生成导语 & 第一个剧情点
            </button>
          </div>

          <div v-if="currentChoiceType && currentChoiceType !== 'style'" class="choice-panel">
            <div class="section-title">
              {{ currentChoiceType === 'hook' ? '章节钩子' : currentChoiceType === 'bighook' ? '大钩子' : '剧情选项' }}
            </div>
            <ChoiceList :options="currentChoices" :type="currentChoiceType" :selected-index="selectedChoiceIndex"
              :disabled="isLoading" @select="handleChoiceSelect" @regenerate="regenerateCurrentChoices" />
          </div>

          <div v-if="styleMode" class="style-panel">
            <div class="section-title">输入文风，开始最终写作</div>
            <input v-model="styleInput" type="text" placeholder="例如：古龙风格、严肃文学、轻快言情、悬疑冷峻..." />
            <div class="btn-row quick-style-row">
              <button v-for="style in QUICK_STYLES" :key="style" class="btn btn-secondary btn-sm" type="button"
                @click="styleInput = style">
                {{ style }}
              </button>
            </div>
            <button class="btn btn-gold btn-block" type="button" :disabled="isLoading" @click="finalWriting">
              生成完整作品
            </button>
          </div>

          <div v-if="state.finalWork" class="btn-row action-panel">
            <button class="btn btn-primary btn-sm" type="button" @click="copyFinalWork">复制全文</button>
            <button class="btn btn-secondary btn-sm" type="button" @click="downloadFinalWork">下载 TXT</button>
            <button class="btn btn-secondary btn-sm" type="button" @click="resetAll">开始新创作</button>
          </div>
        </template>

        <div v-if="loadingMessage" class="loading-overlay">
          <span class="spinner"></span>
          {{ loadingMessage }}
        </div>
      </main>

      <aside class="panel panel-right">
        <div class="section-title">剧情选择记录</div>
        <div v-if="outlineEntries.length" class="outline-log">
          <template v-for="entry in outlineEntries" :key="entry.key">
            <div v-if="entry.badge" class="outline-item">
              <span class="badge" :class="entry.badgeClass">{{ entry.badge }}</span>
              <span>{{ entry.text }}</span>
            </div>
            <div v-else-if="entry.type === 'chapter-title'" class="outline-chapter">{{ entry.text }}</div>
            <div v-else-if="entry.type === 'plot'" class="outline-plot">
              <span>{{ entry.text }}</span>
              <span class="outline-note">{{ entry.note }}</span>
            </div>
            <div v-else-if="entry.type === 'hook'" class="outline-hook">{{ entry.text }}</div>
            <div v-else-if="entry.type === 'big-hook'" class="outline-big-hook">{{ entry.text }}</div>
          </template>
        </div>
        <div v-else class="outline-empty">尚未开始</div>

        <hr class="divider" />

        <div class="section-title">进度</div>
        <div class="progress-wrap">
          <span>总进度</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>
          <span>{{ progressPercent }}%</span>
        </div>
        <div class="chapter-summary">{{ chapterSummary }}</div>

        <button class="btn btn-danger btn-sm btn-block" type="button" @click="confirmReset">
          重置全部
        </button>
      </aside>
    </div>

    <div v-if="showPromptModal" class="modal-backdrop fullscreen-backdrop" @click.self="showPromptModal = false">
      <section class="prompt-modal" role="dialog" aria-modal="true" aria-labelledby="prompt-modal-title">
        <header class="prompt-modal-header">
          <div>
            <h2 id="prompt-modal-title">提示词控制台</h2>
            <p>修改后会立即用于本次生成，点击保存可写入本地浏览器。模板变量请保留双花括号格式。</p>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" @click="showPromptModal = false">关闭</button>
        </header>

        <div class="prompt-workspace">
          <nav class="prompt-tabs" aria-label="提示词分类">
            <button v-for="prompt in promptConfigs" :key="prompt.id" class="prompt-tab" type="button"
              :class="{ active: prompt.id === activePromptId }" @click="activePromptId = prompt.id">
              <span>{{ prompt.title }}</span>
              <small>{{ prompt.description }}</small>
            </button>
          </nav>

          <article v-if="activePromptConfig" class="prompt-editor">
            <div class="prompt-editor-heading">
              <div>
                <h3>{{ activePromptConfig.title }}</h3>
                <p>{{ activePromptConfig.description }}</p>
              </div>
              <span class="prompt-temp">温度 {{ activePromptConfig.temperature }}</span>
            </div>

            <label :for="`${activePromptConfig.id}-system`">System prompt</label>
            <textarea :id="`${activePromptConfig.id}-system`" v-model="activePromptConfig.systemPrompt"
              class="prompt-textarea system-prompt" />

            <label :for="`${activePromptConfig.id}-user`">User prompt 模板</label>
            <textarea :id="`${activePromptConfig.id}-user`" v-model="activePromptConfig.userPrompt"
              class="prompt-textarea" />
          </article>
        </div>

        <footer class="prompt-modal-footer">
          <button class="btn btn-danger btn-sm" type="button" @click="resetPromptConfigs">恢复默认</button>
          <div class="btn-row">
            <button class="btn btn-secondary btn-sm" type="button" @click="showPromptModal = false">取消</button>
            <button class="btn btn-primary btn-sm" type="button" @click="savePromptConfigs">保存提示词</button>
          </div>
        </footer>
      </section>
    </div>

    <ToastStack :toasts="toasts" />
  </div>
</template>
