export function createMaterialPromptConfigController({
  promptConfigs,
  getPromptConfig,
  applyPromptConfigs,
  updatePromptConfigField,
  fetchPromptConfigs,
  updatePromptConfigRecord,
  resetPromptConfigRecords,
  onToast = () => {},
  appendOperationLog = async () => null,
  onEditorVersionBump = () => {},
  saveDelay = 600,
}) {
  const promptConfigSaveTimers = new Map();
  const dirtyPromptConfigIds = new Set();

  function clearPendingSaves() {
    promptConfigSaveTimers.forEach((timer) => window.clearTimeout(timer));
    promptConfigSaveTimers.clear();
  }

  async function savePromptConfigToBackend(promptId) {
    const promptConfig = getPromptConfig(promptConfigs, promptId);
    if (!promptConfig) return;

    await updatePromptConfigRecord(promptId, {
      systemPrompt: promptConfig.systemPrompt,
      userPrompt: promptConfig.userPrompt,
      temperature: promptConfig.temperature,
    });
    dirtyPromptConfigIds.delete(promptId);
    await appendOperationLog({
      actionType: 'material_prompt_updated',
      title: `更新提示词：${promptConfig.title}`,
      detail: `已保存故事DNA提示词配置，温度 ${promptConfig.temperature}`,
      payload: {
        promptId,
        temperature: promptConfig.temperature,
      },
    });
  }

  async function flushPendingSaves() {
    const promptIds = Array.from(dirtyPromptConfigIds);
    clearPendingSaves();
    if (!promptIds.length) return;

    try {
      await Promise.all(promptIds.map((promptId) => savePromptConfigToBackend(promptId)));
    } catch (error) {
      onToast(`提示词保存失败：${error.message}`);
    }
  }

  function scheduleSave(promptId) {
    dirtyPromptConfigIds.add(promptId);
    window.clearTimeout(promptConfigSaveTimers.get(promptId));
    promptConfigSaveTimers.set(promptId, window.setTimeout(async () => {
      try {
        await savePromptConfigToBackend(promptId);
      } catch (error) {
        onToast(`提示词自动保存失败：${error.message}`);
      } finally {
        promptConfigSaveTimers.delete(promptId);
      }
    }, saveDelay));
  }

  function updateFieldValue(promptId, key, value) {
    updatePromptConfigField(promptConfigs, promptId, key, value);
    scheduleSave(promptId);
  }

  async function resetPromptConfigs() {
    try {
      await flushPendingSaves();
      const nextPromptConfigs = await resetPromptConfigRecords();
      applyPromptConfigs(promptConfigs, nextPromptConfigs);
      dirtyPromptConfigIds.clear();
      onEditorVersionBump();
      await appendOperationLog({
        actionType: 'material_prompt_reset',
        title: '恢复故事DNA默认提示词',
        detail: '赛道分析与 DNA 抽取提示词已恢复默认配置。',
      });
      onToast('已恢复故事DNA默认提示词');
    } catch (error) {
      onToast(`恢复默认提示词失败：${error.message}`);
    }
  }

  async function requestClose(onClose) {
    try {
      await flushPendingSaves();
    } finally {
      onClose?.();
    }
  }

  async function loadPromptConfigs() {
    try {
      const nextPromptConfigs = await fetchPromptConfigs();
      applyPromptConfigs(promptConfigs, nextPromptConfigs);
    } catch (error) {
      console.error('Failed to load material prompt configs:', error);
    }
  }

  function dispose() {
    clearPendingSaves();
  }

  return {
    clearPendingSaves,
    flushPendingSaves,
    updateFieldValue,
    resetPromptConfigs,
    requestClose,
    loadPromptConfigs,
    dispose,
  };
}
