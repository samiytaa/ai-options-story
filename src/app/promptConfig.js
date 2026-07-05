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

const BRAINHOLE_RUNTIME_GUARD = `

【脑洞生成硬性补充要求】
1. options[*].idea 必须严格一句一行；每个句号、问号、叹号、省略号或明显语义停顿后都要换行。
2. 风向标只用于提炼趋势方向，禁止照抄、改写或近似复刻其中的示例。
3. 不要做换皮脑洞：不能只替换示例里的人名、身份、地点、道具、关系或核心反转。
4. 如果某个脑洞和风向标示例太像，必须重新发散到新的角色处境、冲突机制和反转落点。
`;

function appendRuntimeGuard(id, userPrompt) {
  if (id !== 'brainhole') return userPrompt;
  return `${userPrompt}${BRAINHOLE_RUNTIME_GUARD}`;
}

export function buildPromptMessages(promptConfigs, id, values) {
  const config = getPromptConfig(promptConfigs, id);
  const userPrompt = appendRuntimeGuard(id, renderPrompt(config.userPrompt, values).trim());
  return [
    { role: 'system', content: renderPrompt(config.systemPrompt, values).trim() },
    { role: 'user', content: userPrompt },
  ];
}
