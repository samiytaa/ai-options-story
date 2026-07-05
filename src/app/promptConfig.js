import { DEFAULT_PROMPTS, clonePromptConfigs } from '../prompts';
import { PROMPT_CONFIG_STORAGE } from './constants';

export function normalizePromptConfigs(saved = []) {
  if (!Array.isArray(saved)) return clonePromptConfigs();
  return DEFAULT_PROMPTS.map((defaultPrompt) => {
    const savedPrompt = saved.find((item) => item.id === defaultPrompt.id) || {};
    const shouldUpgradeBrainholePrompt =
      defaultPrompt.id === 'brainhole' &&
      !savedPrompt.updatedAt &&
      savedPrompt.userPrompt !== undefined &&
      !String(savedPrompt.userPrompt || '').includes('"options"');

    return {
      ...defaultPrompt,
      ...(shouldUpgradeBrainholePrompt ? {} : savedPrompt),
      id: defaultPrompt.id,
      title: defaultPrompt.title,
      category: defaultPrompt.category,
      description: defaultPrompt.description,
      temperature: savedPrompt.temperature ?? defaultPrompt.temperature,
    };
  });
}

export function loadBrowserPromptConfigs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROMPT_CONFIG_STORAGE) || '[]');
    return normalizePromptConfigs(saved);
  } catch {
    return clonePromptConfigs();
  }
}

export function hasBrowserPromptConfigs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROMPT_CONFIG_STORAGE) || '[]');
    return Array.isArray(saved) && saved.length > 0;
  } catch {
    return false;
  }
}

export function clearBrowserPromptConfigs() {
  localStorage.removeItem(PROMPT_CONFIG_STORAGE);
}

export function applyPromptConfigs(promptConfigs, nextPromptConfigs) {
  promptConfigs.splice(0, promptConfigs.length, ...normalizePromptConfigs(nextPromptConfigs));
}

export function updatePromptConfigField(promptConfigs, promptId, key, value) {
  const prompt = promptConfigs.find((item) => item.id === promptId);
  if (!prompt) return;
  prompt[key] = value;
}

export function getPromptConfig(promptConfigs, id) {
  return promptConfigs.find((prompt) => prompt.id === id) || DEFAULT_PROMPTS.find((prompt) => prompt.id === id);
}

export function renderPrompt(template, values = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '');
}

export function buildPromptMessages(promptConfigs, id, values) {
  const config = getPromptConfig(promptConfigs, id);
  return [
    { role: 'system', content: renderPrompt(config.systemPrompt, values).trim() },
    { role: 'user', content: renderPrompt(config.userPrompt, values).trim() },
  ];
}
