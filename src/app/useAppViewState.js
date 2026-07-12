import { computed } from 'vue';
import { FAVORITE_TABS, PROJECT_SORT_STORAGE } from './constants.js';
import { STAGES, formatChoiceForDisplay, formatHookForDisplay } from '../storyState.js';

function defaultGetValue(refOrValue) {
  return refOrValue && typeof refOrValue === 'object' && 'value' in refOrValue
    ? refOrValue.value
    : refOrValue;
}

function defaultSetValue(refOrValue, value) {
  if (refOrValue && typeof refOrValue === 'object' && 'value' in refOrValue) {
    refOrValue.value = value;
  }
}

function defaultParsePlotBlockId(blockId = '') {
  const match = String(blockId).match(/^plot-(\d+)-(\d+)$/);
  if (!match) return null;
  return {
    chapterNum: Number(match[1]),
    plotIndex: Number(match[2]),
    zeroIndex: Number(match[2]) - 1,
  };
}

function stageLabelMap() {
  return {
    brainhole: '脑洞',
    guide: '导语',
    architecture_setup: '生成架构',
    persona_setup: '生成人设',
    ch1: '第一章',
    ch2: '第二章',
    ch3: '第三章',
    ch4: '第四章',
    ch4_bighooks: '第四章·大钩子',
    style_writing: '文风成文',
    complete: '完成',
  };
}

export function useAppViewState(deps) {
  const {
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
    parsePlotBlockId = defaultParsePlotBlockId,
    getValue = defaultGetValue,
    setValue = defaultSetValue,
    storage = typeof localStorage === 'undefined' ? null : localStorage,
  } = deps;

  const progressPercent = computed(() => {
    const stages = ['setup', 'brainhole', 'guide', 'architecture_setup', 'persona_setup', 'ch1', 'ch2', 'ch3', 'ch4_bighooks', 'style_writing', 'complete'];
    const currentIndex = Math.max(0, stages.indexOf(state.stage));
    return Math.round((currentIndex / (stages.length - 1)) * 100);
  });

  const isLoading = computed(() => Boolean(getValue(loadingMessage)));
  const hasStoryContent = computed(() => getValue(storyBlocks)?.length > 0);
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
  const currentChoiceTitle = computed(() =>
    currentChoiceType.value === 'hook'
      ? '章节钩子与剧情走向'
      : currentChoiceType.value === 'bighook'
        ? '大钩子与剧情走向'
        : '剧情选项',
  );
  const activeStageViewLabel = computed(() => stageLabelFor(getValue(activeStageView)));
  const visibleStoryBlocks = computed(() =>
    (getValue(storyBlocks) || []).filter((block) => blockBelongsToStageView(block, getValue(activeStageView))),
  );
  const currentChoiceStageView = computed(() => {
    if (currentChoiceType.value === 'bighook') return 'ch4_bighooks';
    if (currentChoiceType.value === 'hook' || currentChoiceType.value === 'option') {
      return `ch${state.currentChapter}`;
    }
    return '';
  });
  const showCurrentChoicePanel = computed(() =>
    Boolean(currentChoiceType.value && currentChoiceType.value !== 'style' && getValue(activeStageView) === currentChoiceStageView.value),
  );
  const showBrainholeAction = computed(() =>
    getValue(activeStageView) === 'brainhole' && state.brainhole && !state.guide,
  );
  const showBrainholeManualAction = computed(() => getValue(activeStageView) === 'brainhole' && hasStoryContent.value);
  const showStylePanel = computed(() => styleMode.value && getValue(activeStageView) === 'style_writing');
  const showFinalActions = computed(() => Boolean(state.finalWork && getValue(activeStageView) === 'complete'));
  const activeStageEmptyText = computed(() => {
    const label = activeStageViewLabel.value;
    const stage = getValue(activeStageView);
    if (stage === 'brainhole') return '这个环节还没有脑洞内容。';
    if (stage === 'guide') return '这个环节还没有导语内容。';
    if (stage === 'architecture_setup') return '这个环节还没有完成故事架构。';
    if (stage === 'persona_setup') return '这个环节还没有完成人设分配。';
    if (/^ch\d+$/.test(stage)) return `${label}还没有生成剧情点。`;
    if (stage === 'ch4_bighooks') return '这个环节还没有大钩子候选。';
    if (stage === 'style_writing') return '选择大钩子后，会在这里输入文风并生成正文。';
    if (stage === 'complete') return '正文生成后会显示在这里。';
    return '这个环节还没有内容。';
  });
  const activePromptConfig = computed(() => {
    const configs = getValue(promptConfigs) || [];
    return configs.find((prompt) => prompt.id === getValue(activePromptId)) || configs[0];
  });
  const activeProject = computed(() =>
    (getValue(projects) || []).find((project) => project.id === getValue(activeProjectId)) || null,
  );
  const hasActiveProject = computed(() => Boolean(activeProject.value));
  const activeProjectName = computed(() => activeProject.value?.name || '未创建项目');
  const projectCards = computed(() => {
    const sortField = getValue(projectSortBy) === 'createdAt' ? 'createdAt' : 'updatedAt';
    return [...(getValue(projects) || [])].sort((a, b) => new Date(b[sortField]).getTime() - new Date(a[sortField]).getTime());
  });
  const favoriteItemsForActiveTab = computed(() =>
    (getValue(favorites) || []).filter((item) => item.type === getValue(activeFavoriteTab)),
  );
  const editingFavoriteItem = computed(() =>
    (getValue(favorites) || []).find((item) => item.id === getValue(editingFavoriteId)) || null,
  );
  const editingFavoriteTypeLabel = computed(() =>
    editingFavoriteItem.value
      ? FAVORITE_TABS.find((tab) => tab.value === editingFavoriteItem.value.type)?.label || '收藏'
      : '收藏',
  );
  const editingFavoriteModalDescription = computed(() => {
    if (!editingFavoriteItem.value) return '';
    const source = editingFavoriteItem.value.projectName || '无项目';
    const createdAt = new Date(editingFavoriteItem.value.createdAt).toLocaleString();
    return `${source} · ${createdAt}`;
  });
  const canChooseFavoriteBrainhole = computed(() =>
    getValue(isEditorOpen) && hasActiveProject.value && !state.brainhole && !state.guide,
  );
  const canAppendFavoriteBrainhole = computed(() => getValue(isEditorOpen) && hasActiveProject.value);
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

    if (state.architecturePlan?.storySummary || state.architecturePlan?.actors?.length) {
      entries.push({
        key: 'architecture-setup',
        badge: '架构',
        badgeClass: 'badge-info',
        text: (state.architecturePlan.storySummary || '已完成故事架构').slice(0, 80),
      });
    }

    if (state.architecturePlan?.actors?.length) {
      entries.push({
        key: 'persona-setup',
        badge: '人设',
        badgeClass: 'badge-warn',
        text: `已配置 ${state.architecturePlan.actors.length} 个核心角色`,
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
        const hookText = formatHookForDisplay(chapter.hookOptions[chapter.hookChosen], 'hook');
        entries.push({
          key: `chapter-${chapter.chapterNum}-hook`,
          type: 'hook',
          text: `钩子: ${hookText.slice(0, 40)}...`,
        });
      }
    });

    if (state.bigHookChosen !== null && state.bigHooks[state.bigHookChosen]) {
      const bigHookText = formatHookForDisplay(state.bigHooks[state.bigHookChosen], 'bighook');
      entries.push({
        key: 'big-hook',
        type: 'big-hook',
        text: `大钩子: ${bigHookText.slice(0, 40)}...`,
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
  const selectedChoiceCopyText = computed(() => {
    const lines = [];

    if (state.selectedBrainholeIndex !== null && state.brainhole) {
      lines.push(`【选定脑洞】${state.brainhole}`);
    }

    if (state.architecturePlan?.storySummary) {
      lines.push(`【故事起点】${state.architecturePlan.storySummary}`);
    }

    state.chapters.forEach((chapter) => {
      chapter.plotPoints?.forEach((plotPoint, index) => {
        const chosenText = plotPoint.options?.[plotPoint.chosenOption];
        if (chosenText) {
          lines.push(`【第${chapter.chapterNum}章 剧情点${index + 1} 选项${plotPoint.chosenOption + 1}】${formatChoiceForDisplay(chosenText)}`);
        }
      });

      const hookText = chapter.hookOptions?.[chapter.hookChosen];
      if (hookText) {
        lines.push(`【第${chapter.chapterNum}章 章节钩子】${formatHookForDisplay(hookText, 'hook')}`);
      }
    });

    const bigHookText = state.bigHooks?.[state.bigHookChosen];
    if (bigHookText) {
      lines.push(`【大钩子】${formatHookForDisplay(bigHookText, 'bighook')}`);
    }

    return lines.join('\n');
  });

  function stageLabelFor(stage) {
    return stageLabelMap()[stage] || '脑洞';
  }

  function normalizeStageView(stage) {
    if (stage === 'setup') return 'brainhole';
    return STAGES.includes(stage) ? stage : 'brainhole';
  }

  function navigateStageView(stage) {
    setValue(activeStageView, normalizeStageView(stage));
    if (typeof resetEditing === 'function') {
      resetEditing();
    }
  }

  function updateStage(stage) {
    state.stage = stage;
    setValue(activeStageView, normalizeStageView(stage));
  }

  function blockBelongsToStageView(block, stage) {
    if (stage === 'brainhole') return block.id === 'brainhole' || block.id === 'brainhole-options';
    if (stage === 'guide') return block.id === 'guide';
    if (stage === 'architecture_setup' || stage === 'persona_setup') return false;
    if (stage === 'complete') return block.id === 'final-work';
    if (stage === 'style_writing') return block.id === 'choice-record-big-hook';
    if (stage === 'ch4_bighooks') return block.id === 'choice-record-ch4-hook';

    const chapterMatch = String(stage).match(/^ch(\d+)$/);
    if (!chapterMatch) return false;

    const chapterNum = Number(chapterMatch[1]);
    const plotRef = parsePlotBlockId(block.id);
    if (plotRef?.chapterNum === chapterNum) return true;
    return block.id.startsWith(`choice-record-ch${chapterNum}-`);
  }

  function setProjectSort(sortBy) {
    setValue(projectSortBy, sortBy);
    storage?.setItem?.(PROJECT_SORT_STORAGE, sortBy);
  }

  function togglePanel(side) {
    if (side === 'left') {
      setValue(isLeftPanelCollapsed, !getValue(isLeftPanelCollapsed));
      return;
    }

    setValue(isRightPanelCollapsed, !getValue(isRightPanelCollapsed));
  }

  return {
    progressPercent,
    isLoading,
    hasStoryContent,
    styleMode,
    currentChoiceType,
    currentChoices,
    currentChoiceTitle,
    activeStageViewLabel,
    visibleStoryBlocks,
    currentChoiceStageView,
    showCurrentChoicePanel,
    showBrainholeAction,
    showBrainholeManualAction,
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
    chapterSummary,
    outlineEntries,
    selectedChoiceCopyText,
    stageLabelFor,
    normalizeStageView,
    navigateStageView,
    updateStage,
    blockBelongsToStageView,
    setProjectSort,
    togglePanel,
  };
}
