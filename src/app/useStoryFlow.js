import { callAiChat } from '../services/aiClient';
import { normalizeApiConfig } from '../services/apiConfig';
import {
  buildContextSummary,
  createInitialState,
  ensureChapter,
  formatChoiceForPrompt,
  formatHookForDisplay,
  formatHookForPrompt,
  normalizePlotChoice,
  normalizeHookChoice,
  parseDirectionalHooks,
  parsePlotOptions,
} from '../storyState';
import {
  brainholeOptionFromDraft,
  createBrainholeOptionDraft,
  draftFromBrainholeOption,
  parseBrainholeOptions,
} from './brainholeOptions';
import {
  buildPromptMessages as buildPromptMessagesFromConfig,
  getPromptConfig as getPromptConfigFromList,
} from './promptConfig';

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

function noop() { }

export function useStoryFlow(deps) {
  const {
    state,
    storyBlocks,
    selectedChoiceIndex,
    styleInput,
    customPromptInstruction,
    copySelectedChoicesWithBody,
    selectedChoiceCopyText,
    windVaneFile,
    editingBlockId,
    editingContent,
    editingBrainholeIndex,
    editingBrainholeDraft,
    manualBrainholeDraft,
    showManualBrainholeModal,
    apiConfigDraft,
    promptConfigs,
    automationSettings,
    pendingPlotGenerationAvailable,
    isLoading,
    getValue = defaultGetValue,
    setValue = defaultSetValue,
    pushToast,
    setLoading,
    updateStage,
    resetChoiceSelection,
    resetEditing,
    requireActiveProject,
    getPromptConfig: injectedGetPromptConfig,
    buildPromptMessages: injectedBuildPromptMessages,
    requestAi: injectedRequestAi,
    confirm = (message) => window.confirm(message),
    clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null,
    createObjectUrl = (blob) => URL.createObjectURL(blob),
    revokeObjectUrl = (url) => URL.revokeObjectURL(url),
    createDownloadLink = () => document.createElement('a'),
    normalizeApiConfig: normalizeApiConfigFn = normalizeApiConfig,
    createInitialState: createInitialStateFn = createInitialState,
  } = deps;

  const notify = pushToast || noop;
  const updateLoading = setLoading || noop;
  const setStage = updateStage || noop;
  const clearChoiceSelection = resetChoiceSelection || (() => setValue(selectedChoiceIndex, null));
  const clearEditing = resetEditing || (() => {
    setValue(editingBlockId, null);
    setValue(editingContent, '');
    setValue(editingBrainholeIndex, null);
    if (editingBrainholeDraft) Object.assign(editingBrainholeDraft, createBrainholeOptionDraft());
  });
  const hasActiveProject = requireActiveProject || (() => true);
  let pendingPlotGeneration = null;

  function automationEnabled(key) {
    return automationSettings?.[key] !== false;
  }

  function setPendingPlotGeneration(value) {
    pendingPlotGeneration = value;
    setValue(pendingPlotGenerationAvailable, Boolean(value));
  }

  function cancelCurrentChoiceSelection(type) {
    if (type === 'option' && pendingPlotGeneration?.undoSelection) {
      const undo = pendingPlotGeneration.undoSelection;
      const chapter = ensureChapter(state);

      if (chapter.plotPoints.length === undo.chapterPlotPointCount) {
        chapter.plotPoints.pop();
      }
      state.currentPlotPointIndex = undo.currentPlotPointIndex;
      setPendingPlotGeneration(null);
    }

    clearChoiceSelection();
    notify('已取消选中', 'info');
  }

  function getPromptConfig(id) {
    if (injectedGetPromptConfig) return injectedGetPromptConfig(id);
    return getPromptConfigFromList(promptConfigs, id);
  }

  function buildPromptMessages(id, values) {
    if (injectedBuildPromptMessages) return injectedBuildPromptMessages(id, values);
    return buildPromptMessagesFromConfig(promptConfigs, id, values);
  }

  function buildPromptMessagesWithCustomInstruction(id, values) {
    const messages = buildPromptMessages(id, values);
    const instruction = getValue(customPromptInstruction)?.trim();
    if (!instruction) return messages;

    return messages.map((message, index) => {
      if (index !== messages.length - 1 || message.role !== 'user') return message;
      return {
        ...message,
        content: `${message.content}\n\n【本次额外生成要求】\n${instruction}`,
      };
    });
  }

  async function requestAi(messages, temperature = 0.85) {
    if (injectedRequestAi) return injectedRequestAi(messages, temperature);
    return callAiChat({
      config: state.aiConfig,
      messages,
      temperature,
    });
  }

  function setBrainholeBlock(content) {
    setValue(storyBlocks, [
      {
        id: 'brainhole',
        title: state.brainhole ? '选定的脑洞' : '脑洞候选',
        titleIcon: 'lightbulb',
        content,
        blockClass: '',
        divider: '',
      },
    ]);
  }

  function setBrainholeOptionsBlock() {
    setValue(storyBlocks, [
      {
        id: 'brainhole-options',
        title: '脑洞候选',
        titleIcon: 'lightbulb',
        content: '',
        blockClass: '',
        divider: '',
      },
    ]);
  }

  function clearBrainholeContinuation() {
    state.brainhole = '';
    state.selectedBrainholeIndex = null;
    state.guide = '';
    state.chapters = [];
    state.currentOptions = [];
    state.currentHooks = [];
    state.bigHooks = [];
    state.bigHookChosen = null;
    state.finalStyle = '';
    state.finalWork = '';
    state.plotPointContents = [];
    clearFinalAssembly();
    setPendingPlotGeneration(null);
    clearChoiceSelection();
  }

  function selectBrainholeOption(index) {
    const option = state.brainholeOptions[index];
    if (!option?.idea) return;

    clearBrainholeContinuation();
    state.selectedBrainholeIndex = index;
    state.brainhole = option.idea;
    setBrainholeOptionsBlock();
    setStage('brainhole');
    notify('已选定脑洞，可以生成导语了', 'success');
  }

  function unselectBrainholeOption() {
    if (state.selectedBrainholeIndex === null && !state.brainhole) return;

    clearBrainholeContinuation();
    setBrainholeOptionsBlock();
    setStage('brainhole');
    notify('已取消选定脑洞，并清空后续内容', 'info');
  }

  function startEditBrainholeOption(index) {
    const option = state.brainholeOptions[index];
    if (!option || getValue(isLoading)) return;
    setValue(editingBrainholeIndex, index);
    Object.assign(editingBrainholeDraft, draftFromBrainholeOption(option));
  }

  function cancelEditBrainholeOption() {
    setValue(editingBrainholeIndex, null);
    Object.assign(editingBrainholeDraft, createBrainholeOptionDraft());
  }

  function saveBrainholeOption(index = getValue(editingBrainholeIndex)) {
    if (index === null || index === undefined) return;

    const option = brainholeOptionFromDraft(editingBrainholeDraft, index);
    if (!option.idea) {
      notify('脑洞内容不能为空', 'error');
      return;
    }

    state.brainholeOptions.splice(index, 1, option);
    if (state.selectedBrainholeIndex === index) {
      state.brainhole = option.idea;
    }
    cancelEditBrainholeOption();
    notify('脑洞选项已保存', 'success');
  }

  function deleteBrainholeOption(index) {
    const option = state.brainholeOptions[index];
    if (!option || getValue(isLoading)) return;

    const confirmed = confirm('确定删除这个脑洞选项吗？');
    if (!confirmed) return;

    const wasSelected = state.selectedBrainholeIndex === index;
    state.brainholeOptions.splice(index, 1);

    if (getValue(editingBrainholeIndex) === index) {
      cancelEditBrainholeOption();
    } else if (getValue(editingBrainholeIndex) !== null && getValue(editingBrainholeIndex) > index) {
      setValue(editingBrainholeIndex, getValue(editingBrainholeIndex) - 1);
    }

    if (wasSelected) {
      clearBrainholeContinuation();
      setBrainholeOptionsBlock();
    } else if (state.selectedBrainholeIndex !== null && state.selectedBrainholeIndex > index) {
      state.selectedBrainholeIndex -= 1;
    }

    notify(wasSelected ? '已删除当前脑洞，并清空后续内容' : '脑洞选项已删除', 'success');
  }

  function openManualBrainholeModal() {
    Object.assign(manualBrainholeDraft, createBrainholeOptionDraft());
    setValue(showManualBrainholeModal, true);
  }

  function cancelManualBrainholeModal() {
    setValue(showManualBrainholeModal, false);
    Object.assign(manualBrainholeDraft, createBrainholeOptionDraft());
  }

  function updateManualBrainholeDraftField(payload) {
    if (!payload?.field) return;
    manualBrainholeDraft[payload.field] = payload.value;
  }

  function addManualBrainholeOption() {
    if (!hasActiveProject()) return;

    const wasEmpty = state.brainholeOptions.length === 0;
    const option = brainholeOptionFromDraft(manualBrainholeDraft, state.brainholeOptions.length);
    if (!option.idea) {
      notify('请先填写脑洞内容', 'error');
      return;
    }

    state.brainholeOptions.push(option);
    Object.assign(manualBrainholeDraft, createBrainholeOptionDraft());
    if (wasEmpty) {
      clearBrainholeContinuation();
      state.selectedBrainholeIndex = 0;
      state.brainhole = option.idea;
    }
    setBrainholeOptionsBlock();
    setStage('brainhole');
    if (getValue(showManualBrainholeModal)) {
      setValue(showManualBrainholeModal, false);
    }
    notify('已选项', 'success');
  }

  function setGuideAndFirstPlotBlocks(guideContent, firstPlotContent) {
    setValue(storyBlocks, [
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
    ]);
  }

  function appendPlotBlock(chapterNum, plotIndex, content, sourceChoice = null) {
    getValue(storyBlocks).push({
      id: `plot-${chapterNum}-${plotIndex}`,
      title: '',
      content,
      blockClass: '',
      divider: `▼ 第${chapterNum}章 · 剧情点 ${plotIndex}/4 ▼`,
      sourceChoice,
    });
  }

  function appendChoiceRecordBlock(id, sourceChoice) {
    getValue(storyBlocks).push({
      id,
      title: '',
      content: '',
      blockClass: '',
      divider: '',
      sourceChoice,
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
    const block = getValue(storyBlocks).find((item) => item.id === blockId);
    if (block) block.content = content;
  }

  function startEditBlock(block) {
    if (getValue(isLoading)) return;
    setValue(editingBlockId, block.id);
    setValue(editingContent, block.content);
  }

  function cancelEditBlock() {
    clearEditing();
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
    const content = getValue(editingContent).trim();
    if (!content) {
      notify('内容不能为空', 'error');
      return;
    }

    updateStoryBlockContent(blockId, content);
    syncEditedBlockToState(blockId, content);
    clearEditing();
    notify('内容已更新', 'success');
  }

  function isPlotBlock(block) {
    return Boolean(parsePlotBlockId(block.id));
  }

  function isLatestRegeneratablePlotBlock(block) {
    const plotRef = parsePlotBlockId(block.id);
    if (!plotRef || !block.sourceChoice?.text) return false;
    const plotBlocks = getValue(storyBlocks).filter((item) => parsePlotBlockId(item.id));
    return plotBlocks.at(-1)?.id === block.id;
  }

  function getBlockOrderValue(block) {
    if (block.id === 'brainhole') return 0;
    if (block.id === 'guide') return 1;
    const plotRef = parsePlotBlockId(block.id);
    if (plotRef) return 10 + plotRef.chapterNum * 100 + plotRef.plotIndex;
    if (block.id.startsWith('choice-record-')) return Number.MAX_SAFE_INTEGER - 1;
    if (block.id === 'final-work') return Number.MAX_SAFE_INTEGER;
    return 0;
  }

  function trimStoryBlocksAfter(blockId) {
    const target = getValue(storyBlocks).find((item) => item.id === blockId);
    if (!target) return;
    const cutoff = getBlockOrderValue(target);
    setValue(storyBlocks, getValue(storyBlocks).filter((block) => getBlockOrderValue(block) < cutoff));
  }

  function getPlotContentsForChapter(chapterNum) {
    return getValue(storyBlocks)
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

  function getLatestPlotIndexForChapter(chapterNum) {
    return getValue(storyBlocks).reduce((latest, block) => {
      const plotRef = parsePlotBlockId(block.id);
      if (!plotRef || plotRef.chapterNum !== chapterNum || !block.content) return latest;
      return Math.max(latest, plotRef.plotIndex);
    }, 0);
  }

  function syncCurrentPlotPointerFromBlocks() {
    const latestPlotIndex = getLatestPlotIndexForChapter(state.currentChapter);
    if (!latestPlotIndex) return;

    state.plotPointContents = getPlotContentsForChapter(state.currentChapter);
    state.currentPlotPointIndex = latestPlotIndex - 1;
  }

  function clearFinalAssembly() {
    state.bigHooks = [];
    state.bigHookChosen = null;
    state.finalStyle = '';
    state.finalWork = '';
    setValue(styleInput, '');
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
    if (state.brainholeOptions.length) {
      setBrainholeOptionsBlock();
    } else {
      setBrainholeBlock(state.brainhole);
    }
    setStage('brainhole');
    clearChoiceSelection();
    notify('已删除第一个剧情点，可重新生成导语和开篇剧情', 'info');
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
    setStage(`ch${state.currentChapter}`);
    clearChoiceSelection();
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
    setStage(`ch${plotRef.chapterNum}`);
    clearChoiceSelection();
  }

  function deletePlotBlock(block) {
    if (getValue(isLoading)) return;

    const plotRef = parsePlotBlockId(block.id);
    if (!plotRef) return;

    const confirmed = confirm('确定删除这个剧情点吗？它之后生成的分支也会一并移除。');
    if (!confirmed) return;

    if (plotRef.chapterNum === 1 && plotRef.plotIndex === 1) {
      deleteFirstPlotPoint();
      clearEditing();
      return;
    }

    trimStoryBlocksAfter(block.id);

    if (plotRef.plotIndex === 1) {
      restorePreviousChapterHook(plotRef.chapterNum);
    } else {
      restorePreviousPlotOptions(plotRef);
    }

    clearEditing();
    notify('已删除剧情点，上一个节点的选项已恢复', 'success');
  }

  function setFinalWorkBlock(content) {
    const finalBlock = {
      id: 'final-work',
      title: `完整作品（文风：${state.finalStyle}）`,
      titleIcon: 'bookOpen',
      content,
      blockClass: 'final-work-block',
      divider: '',
    };
    const existingIndex = getValue(storyBlocks).findIndex((block) => block.id === 'final-work');
    if (existingIndex >= 0) {
      getValue(storyBlocks).splice(existingIndex, 1, finalBlock);
      return;
    }

    getValue(storyBlocks).push(finalBlock);
  }

  async function generateBrainhole() {
    if (!hasActiveProject()) return;

    const storyStart = state.storyStart.trim();
    const windVaneContent = getValue(windVaneFile)?.content?.trim() || '';

    if (!storyStart && !windVaneContent) {
      notify('请先输入脑洞或上传风向标文件', 'error');
      return;
    }

    if (!state.aiConfig.apiKey) {
      notify('请先完成 API 配置', 'error');
      return;
    }

    state.storyStart = storyStart;
    clearChoiceSelection();
    updateLoading('正在生成脑洞...');
    setStage('brainhole');

    try {
      const promptConfig = getPromptConfig('brainhole');
      const result = await requestAi(
        buildPromptMessages('brainhole', {
          storyStartSection: storyStart ? `\n用户补充的脑洞：\n${storyStart}` : '',
          windVaneSection: windVaneContent ? `\n本月小说风向标：\n${windVaneContent}` : '',
        }),
        promptConfig.temperature,
      );

      const previousOptionCount = state.brainholeOptions.length;
      const generatedOptions = parseBrainholeOptions(result, previousOptionCount);
      if (previousOptionCount) {
        state.brainholeOptions.push(...generatedOptions);
      } else {
        state.brainholeOptions = generatedOptions;
        clearBrainholeContinuation();
      }
      setBrainholeOptionsBlock();
      notify(previousOptionCount ? '新脑洞已追加到候选末尾！' : '脑洞选项生成成功！', 'success');
    } catch (error) {
      setStage('setup');
      notify(`生成脑洞失败：${error.message}`, 'error');
    } finally {
      updateLoading();
    }
  }

  async function generateGuideAndFirstPlot() {
    if (!hasActiveProject()) return;

    if (!state.brainhole.trim()) {
      notify('请先选择或手动添加一个脑洞', 'error');
      return;
    }

    updateLoading('正在生成导语和第一个剧情点...');
    setStage('guide');

    try {
      const promptConfig = getPromptConfig('guideAndFirstPlot');
      const result = await requestAi(
        buildPromptMessagesWithCustomInstruction('guideAndFirstPlot', {
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
      setPendingPlotGeneration(null);
      state.bigHookChosen = null;
      state.finalStyle = '';
      state.finalWork = '';
      setGuideAndFirstPlotBlocks(guideContent, firstPlotContent);

      if (automationEnabled('autoGenerateChoices')) {
        await generateOptionsForCurrentPlotPoint();
      }
      setStage('ch1');
      notify(
        automationEnabled('autoGenerateChoices') ? '导语生成成功！请选择剧情发展方向' : '导语生成成功，已暂停自动生成选项',
        'success',
      );
    } catch (error) {
      notify(`生成导语失败：${error.message}`, 'error');
    } finally {
      updateLoading();
    }
  }

  async function generateOptionsForCurrentPlotPoint() {
    updateLoading('正在生成剧情选项...');
    clearChoiceSelection();
    syncCurrentPlotPointerFromBlocks();

    try {
      const currentPlotDesc = state.plotPointContents[state.currentPlotPointIndex] || '';
      const chapterNum = state.currentChapter;
      const plotIndex = state.currentPlotPointIndex + 1;
      const promptConfig = getPromptConfig('options');
      const result = await requestAi(
        buildPromptMessagesWithCustomInstruction('options', {
          chapterNum,
          plotIndex,
          contextSummary: buildContextSummary(state),
          currentPlotDesc,
        }),
        promptConfig.temperature,
      );

      state.currentOptions = parsePlotOptions(result);
    } catch (error) {
      state.currentOptions = [];
      notify(`生成选项失败：${error.message}`, 'error');
    } finally {
      updateLoading();
    }
  }

  async function requestNextPlotPointText(chosenOptionText, chapterNum, plotIndex) {
    const promptConfig = getPromptConfig('nextPlotPoint');
    return requestAi(
      buildPromptMessagesWithCustomInstruction('nextPlotPoint', {
        chosenOptionText,
        chapterNum,
        plotIndex,
        contextSummary: buildContextSummary(state),
      }),
      promptConfig.temperature,
    );
  }

  async function generateNextPlotPoint(chosenOptionText, sourceChoice = null) {
    updateLoading('正在生成下一个剧情点...');
    syncCurrentPlotPointerFromBlocks();

    try {
      const chapterNum = state.currentChapter;
      const plotIndex = getLatestPlotIndexForChapter(chapterNum) + 1;
      const result = await requestNextPlotPointText(chosenOptionText, chapterNum, plotIndex);

      state.currentPlotPointIndex = plotIndex - 1;
      state.plotPointContents[plotIndex - 1] = result;
      appendPlotBlock(chapterNum, plotIndex, result, sourceChoice);
      state.currentOptions = [];
      setPendingPlotGeneration(null);
      clearChoiceSelection();
      setStage(`ch${chapterNum}`);
      if (automationEnabled('autoGenerateChoices')) {
        await generateOptionsForCurrentPlotPoint();
      }
    } catch (error) {
      notify(`生成剧情点失败：${error.message}`, 'error');
    } finally {
      updateLoading();
    }
  }

  async function generateHooks() {
    updateLoading('正在生成章节钩子...');
    clearChoiceSelection();
    state.currentOptions = [];

    try {
      const chapterNum = state.currentChapter;
      const promptConfig = getPromptConfig('hooks');
      const result = await requestAi(
        buildPromptMessagesWithCustomInstruction('hooks', {
          chapterNum,
          contextSummary: buildContextSummary(state),
          chapterFourHookNote: chapterNum >= 4 ? '4. 这是第四章的钩子，需要更强的冲击力，为大钩子做铺垫。' : '',
        }),
        promptConfig.temperature,
      );

      state.currentHooks = parseDirectionalHooks(result, '钩子', '悬念钩子', 'hook');
      setStage(`ch${chapterNum}`);
    } catch (error) {
      state.currentHooks = [];
      notify(`生成钩子失败：${error.message}`, 'error');
    } finally {
      updateLoading();
    }
  }

  async function generateBigHooks() {
    updateLoading('正在生成大钩子（第四章）...');
    clearChoiceSelection();
    state.currentHooks = [];
    setStage('ch4_bighooks');

    try {
      const promptConfig = getPromptConfig('bigHooks');
      const result = await requestAi(
        buildPromptMessagesWithCustomInstruction('bigHooks', {
          contextSummary: buildContextSummary(state),
        }),
        promptConfig.temperature,
      );

      state.bigHooks = parseDirectionalHooks(result, '大钩子', '重大转折', 'bighook');
    } catch (error) {
      state.bigHooks = [];
      notify(`生成大钩子失败：${error.message}`, 'error');
    } finally {
      updateLoading();
    }
  }

  async function handleChoiceSelect(index, type) {
    if (getValue(isLoading)) return;
    if (!hasActiveProject()) return;

    if (getValue(selectedChoiceIndex) === index) {
      cancelCurrentChoiceSelection(type);
      return;
    }

    setValue(selectedChoiceIndex, index);

    if (type === 'option') {
      syncCurrentPlotPointerFromBlocks();
      const chosenOption = state.currentOptions[index];
      const chosenOptionText = formatChoiceForPrompt(chosenOption);
      const currentPlotDesc = state.plotPointContents[state.currentPlotPointIndex] || '';
      const chapter = ensureChapter(state);
      const previousPlotPointIndex = state.currentPlotPointIndex;
      const sourceChoice = {
        type,
        label: `选项 ${index + 1}`,
        text: chosenOptionText,
        choice: chosenOption,
      };

      chapter.plotPoints.push({
        desc: currentPlotDesc,
        chosenOption: index,
        options: [...state.currentOptions],
      });

      if (state.currentPlotPointIndex >= 3) {
        appendChoiceRecordBlock(`choice-record-ch${state.currentChapter}-plot4`, sourceChoice);
        state.currentOptions = [];
        clearChoiceSelection();
        notify('本章4个剧情点已完成，请生成下一章的4个章节钩子', 'info');
        return;
      }

      state.currentPlotPointIndex += 1;
      if (automationEnabled('autoGeneratePlot')) {
        await generateNextPlotPoint(chosenOptionText, sourceChoice);
      } else {
        setPendingPlotGeneration({
          chosenOptionText,
          sourceChoice,
          undoSelection: {
            currentPlotPointIndex: previousPlotPointIndex,
            chapterPlotPointCount: chapter.plotPoints.length,
          },
        });
        notify('已记录选项，自动生成剧情已关闭', 'info');
      }
      return;
    }

    if (type === 'hook') {
      const chapter = ensureChapter(state);
      chapter.hookChosen = index;
      chapter.hookOptions = [...state.currentHooks];
      state.currentHooks = [];
      const selectedHook = chapter.hookOptions[index];
      const selectedHookText = formatHookForDisplay(selectedHook, 'hook');
      const selectedHookPrompt = formatHookForPrompt(selectedHook, 'hook');
      const sourceChoice = {
        type,
        label: `钩子 ${index + 1}`,
        text: selectedHookText,
        choice: normalizeHookChoice(selectedHook, index, 'hook'),
      };

      if (state.currentChapter >= 4) {
        appendChoiceRecordBlock('choice-record-ch4-hook', sourceChoice);
        clearChoiceSelection();
        if (automationEnabled('autoGenerateChoices')) {
          notify('第四章完成！正在生成大钩子...', 'info');
          await generateBigHooks();
        } else {
          setStage('ch4_bighooks');
          notify('第四章完成，自动生成选项已关闭', 'info');
        }
        return;
      }

      state.currentChapter += 1;
      state.currentPlotPointIndex = 0;
      state.plotPointContents = [];
      state.currentOptions = [];
      clearChoiceSelection();
      notify(`进入第${state.currentChapter}章！`, 'success');
      if (automationEnabled('autoGeneratePlot')) {
        await generateNextPlotPoint(`（承接上一章钩子与剧情走向：${selectedHookPrompt}）`, sourceChoice);
      } else {
        setPendingPlotGeneration({
          chosenOptionText: `（承接上一章钩子与剧情走向：${selectedHookPrompt}）`,
          sourceChoice,
        });
        setStage(`ch${state.currentChapter}`);
        notify('已记录钩子，自动生成剧情已关闭', 'info');
      }
      return;
    }

    if (type === 'bighook') {
      state.bigHookChosen = index;
      state.finalWork = '';
      state.bigHooks = [...state.bigHooks];
      const selectedBigHook = state.bigHooks[index];
      appendChoiceRecordBlock('choice-record-big-hook', {
        type,
        label: `大钩子 ${index + 1}`,
        text: formatHookForDisplay(selectedBigHook, 'bighook'),
        choice: normalizeHookChoice(selectedBigHook, index, 'bighook'),
      });
      setStage('style_writing');
      clearChoiceSelection();
      notify('大钩子已选择！剧情组装完成，请输入文风开始写作', 'success');
    }
  }

  function updateCurrentChoiceOption(index, value, type) {
    const target = type === 'hook'
      ? state.currentHooks
      : type === 'bighook'
        ? state.bigHooks
        : state.currentOptions;

    if (!target[index]) return;
    target.splice(index, 1, type === 'option' ? normalizePlotChoice(value, index) : normalizeHookChoice(value, index, type));
    notify('选项已修改', 'success');
  }

  function getCurrentChoiceTarget(type) {
    if (type === 'hook') return state.currentHooks;
    if (type === 'bighook') return state.bigHooks;
    return state.currentOptions;
  }

  function addCurrentChoiceOption(value, type) {
    const normalized = type === 'option'
      ? normalizePlotChoice(value, getCurrentChoiceTarget(type).length)
      : normalizeHookChoice(value, getCurrentChoiceTarget(type).length, type);
    const content = type === 'option' ? normalized.option : normalized.hook;
    if (!content) {
      notify('新增内容不能为空', 'error');
      return;
    }

    getCurrentChoiceTarget(type).push(
      normalized,
    );
    notify('已手动添加选项', 'success');
  }

  function deleteCurrentChoiceOption(index, type) {
    if (getValue(selectedChoiceIndex) !== null) return;

    const target = getCurrentChoiceTarget(type);
    if (!target[index]) return;

    const confirmed = confirm('确定删除这个选项吗？');
    if (!confirmed) return;

    target.splice(index, 1);
    notify('选项已删除', 'success');
  }

  async function regeneratePlotBlockResult(block) {
    const plotRef = parsePlotBlockId(block.id);
    if (!plotRef || !block.sourceChoice?.text) return;
    if (!hasActiveProject()) return;

    updateLoading('正在重新生成这个选项的文本结果...');
    state.currentChapter = plotRef.chapterNum;
    state.currentPlotPointIndex = plotRef.zeroIndex;
    state.currentOptions = [];
    state.currentHooks = [];
    clearFinalAssembly();
    setStage(`ch${plotRef.chapterNum}`);

    try {
      const result = await requestNextPlotPointText(block.sourceChoice.text, plotRef.chapterNum, plotRef.plotIndex);
      updateStoryBlockContent(block.id, result);

      state.plotPointContents = getPlotContentsForChapter(plotRef.chapterNum);
      state.plotPointContents[plotRef.zeroIndex] = result;
      syncEditedBlockToState(block.id, result);

      if (plotRef.plotIndex >= 4) {
        notify('第4个剧情点已重新生成，请生成下一章的4个章节钩子', 'info');
      } else {
        if (automationEnabled('autoGenerateChoices')) {
          await generateOptionsForCurrentPlotPoint();
        }
      }

      notify('文本结果已重新生成', 'success');
    } catch (error) {
      notify(`重新生成失败：${error.message}`, 'error');
    } finally {
      updateLoading();
    }
  }

  async function regenerateCurrentChoices(type) {
    if (!hasActiveProject()) return;

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

  async function continuePendingPlotGeneration() {
    if (!hasActiveProject()) return;
    if (!pendingPlotGeneration) {
      notify('没有待生成的剧情', 'info');
      return;
    }

    const pending = pendingPlotGeneration;
    await generateNextPlotPoint(pending.chosenOptionText, pending.sourceChoice);
  }

  async function finalWriting() {
    if (!hasActiveProject()) return;

    const style = getValue(styleInput).trim();
    if (!style) {
      notify('请输入文风', 'error');
      return;
    }

    state.finalStyle = style;
    setStage('style_writing');
    updateLoading('正在根据完整剧情大纲和文风生成作品...这可能需要30-60秒...');

    try {
      const promptConfig = getPromptConfig('finalWriting');
      const result = await requestAi(
        buildPromptMessages('finalWriting', {
          contextSummary: buildContextSummary(state),
          style,
        }),
        promptConfig.temperature,
      );

      state.finalWork = result;
      setStage('complete');
      setFinalWorkBlock(result);
      notify('作品生成完成！', 'success');
    } catch (error) {
      notify(`生成作品失败：${error.message}`, 'error');
    } finally {
      updateLoading();
    }
  }

  async function copyFinalWork() {
    try {
      await clipboard.writeText(state.finalWork);
      notify('已复制到剪贴板！', 'success');
    } catch {
      notify('复制失败，请手动选择复制', 'error');
    }
  }

  function isBodyCopyableBlock(block) {
    if (!block?.content?.trim()) return false;
    if (block.id === 'guide' || block.id === 'final-work') return true;
    return Boolean(parsePlotBlockId(block.id));
  }

  function buildExistingBodyText() {
    const blocks = getValue(storyBlocks).filter(isBodyCopyableBlock);
    if (!blocks.length) return '';

    const finalBlock = blocks.find((block) => block.id === 'final-work');
    if (finalBlock) return finalBlock.content.trim();

    return blocks.map((block) => {
      const content = block.content.trim();
      if (block.id === 'guide') return `【导语】\n${content}`;

      const plotRef = parsePlotBlockId(block.id);
      if (plotRef) {
        return `【第${plotRef.chapterNum}章 剧情点${plotRef.plotIndex}】\n${content}`;
      }

      return content;
    }).join('\n\n');
  }

  function buildFinalBodyCopyText() {
    const body = buildExistingBodyText();
    if (!getValue(copySelectedChoicesWithBody) || !getValue(selectedChoiceCopyText)) return body;
    return `${body}\n\n---\n所选选项内容\n${getValue(selectedChoiceCopyText)}`;
  }

  async function copyFinalBodyFromSidebar() {
    const body = buildExistingBodyText();
    if (!body) {
      notify('暂无正文可复制', 'error');
      return;
    }

    try {
      await clipboard.writeText(buildFinalBodyCopyText());
      notify(getValue(copySelectedChoicesWithBody) ? '已复制正文和所选选项！' : '已复制正文！', 'success');
    } catch {
      notify('复制失败，请手动选择复制', 'error');
    }
  }

  function downloadFinalWork() {
    const blob = new Blob([state.finalWork], { type: 'text/plain;charset=utf-8' });
    const url = createObjectUrl(blob);
    const link = createDownloadLink();
    link.href = url;
    link.download = '脑洞组装_完整作品.txt';
    link.click();
    revokeObjectUrl(url);
    notify('下载成功！', 'success');
  }

  function resetAll() {
    const retainedApiConfig = normalizeApiConfigFn(state.aiConfig);
    Object.assign(state, createInitialStateFn(retainedApiConfig));
    if (apiConfigDraft) Object.assign(apiConfigDraft, retainedApiConfig);
    setValue(storyBlocks, []);
    setValue(styleInput, '');
    setPendingPlotGeneration(null);
    setStage('brainhole');
    if (manualBrainholeDraft) Object.assign(manualBrainholeDraft, createBrainholeOptionDraft());
    clearChoiceSelection();
    clearEditing();
    notify('已重置，可以开始新创作', 'info');
  }

  return {
    setBrainholeBlock,
    setBrainholeOptionsBlock,
    clearBrainholeContinuation,
    selectBrainholeOption,
    unselectBrainholeOption,
    startEditBrainholeOption,
    cancelEditBrainholeOption,
    saveBrainholeOption,
    deleteBrainholeOption,
    openManualBrainholeModal,
    cancelManualBrainholeModal,
    updateManualBrainholeDraftField,
    addManualBrainholeOption,
    setGuideAndFirstPlotBlocks,
    appendPlotBlock,
    appendChoiceRecordBlock,
    parsePlotBlockId,
    updateStoryBlockContent,
    startEditBlock,
    cancelEditBlock,
    syncEditedBlockToState,
    saveEditBlock,
    isPlotBlock,
    isLatestRegeneratablePlotBlock,
    getBlockOrderValue,
    trimStoryBlocksAfter,
    getPlotContentsForChapter,
    clearFinalAssembly,
    deleteFirstPlotPoint,
    restorePreviousChapterHook,
    restorePreviousPlotOptions,
    deletePlotBlock,
    setFinalWorkBlock,
    generateBrainhole,
    generateGuideAndFirstPlot,
    generateOptionsForCurrentPlotPoint,
    requestNextPlotPointText,
    generateNextPlotPoint,
    generateHooks,
    generateBigHooks,
    handleChoiceSelect,
    updateCurrentChoiceOption,
    getCurrentChoiceTarget,
    addCurrentChoiceOption,
    deleteCurrentChoiceOption,
    regeneratePlotBlockResult,
    regenerateCurrentChoices,
    continuePendingPlotGeneration,
    finalWriting,
    copyFinalWork,
    buildFinalBodyCopyText,
    copyFinalBodyFromSidebar,
    downloadFinalWork,
    resetAll,
  };
}
