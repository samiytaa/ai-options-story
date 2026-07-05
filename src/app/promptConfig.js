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

const GENERATION_RUNTIME_GUARDS = {
  guideAndFirstPlot: `

【情节生成硬性补充要求】
1. 必须强调接续上文：导语承接脑洞，第一个剧情点承接导语，不要跳到未铺垫的新阶段。
2. 第一个剧情点是对开篇大纲的转述扩写，必须完整体现已给安排，并自行填充合理细节。
3. 剧情进展不能超出当前安排，不能提前写到后续选项、钩子或结局。
4. 除最终成文外，当前生成内容的结尾必须保留开放性，停在可继续选择或继续展开的位置。
5. 对话比例控制在40%-50%；每段叙述或描写后尽量紧跟一句对话，或让叙述由对话引发。
6. 对话必须同时塑造性格、推进情节、展现潜台词；避免寒暄，从冲突中间切入。
7. 在对话高潮或沉默处插入极简感官描写代替心理活动。
`,
  nextPlotPoint: `

【情节生成硬性补充要求】
1. 必须接续上文，先承接用户刚选中的选项，再扩写成当前剧情点。
2. 选项就是本次小说剧情大纲：生成内容必须是对上一个选项的转述扩写，从开始到结尾体现选项中的所有安排，并自行填充合理细节。
3. 禁止直接写选项之后更远的后续内容；剧情进展不能超出选项安排，不能提前写到下一个选择、下一个钩子或未被选择的走向。
4. 除最终成文外，当前生成内容的结尾必须保留开放性，停在可继续生成选项的位置。
5. 对话比例控制在40%-50%；每段叙述或描写后尽量紧跟一句对话，或让叙述由对话引发。
6. 对话必须同时塑造性格、推进情节、展现潜台词；避免寒暄，从冲突中间切入。
7. 在对话高潮或沉默处插入极简感官描写代替心理活动。
`,
  finalWriting: `

【最终成文硬性补充要求】
1. 每个情节都必须接续上文，按照完整剧情大纲顺序进行转述扩写，不要越过大纲安排提前写未铺垫的后续内容。
2. 大纲中的每个选项、钩子和大钩子都是本次小说剧情大纲的一部分，扩写要从开始到结尾体现所有已选内容，并自行填充合理细节。
3. 剧情进展不能超出完整大纲的安排；最终成文需要按大钩子给出有力收束，不强制开放式结尾。
4. 全文对话比例控制在40%-50%；每段叙述或描写后尽量紧跟一句对话，或让叙述由对话引发。
5. 对话必须同时塑造性格、推进情节、展现潜台词；避免寒暄，从冲突中间切入。
6. 在对话高潮或沉默处插入极简感官描写代替心理活动。
`,
};

function appendRuntimeGuard(id, userPrompt) {
  if (id === 'brainhole') return `${userPrompt}${BRAINHOLE_RUNTIME_GUARD}`;
  return `${userPrompt}${GENERATION_RUNTIME_GUARDS[id] || ''}`;
}

export function buildPromptMessages(promptConfigs, id, values) {
  const config = getPromptConfig(promptConfigs, id);
  const userPrompt = appendRuntimeGuard(id, renderPrompt(config.userPrompt, values).trim());
  return [
    { role: 'system', content: renderPrompt(config.systemPrompt, values).trim() },
    { role: 'user', content: userPrompt },
  ];
}
