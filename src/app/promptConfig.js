import { DEFAULT_PROMPTS, clonePromptConfigs } from '../prompts';
import { PROMPT_CONFIG_STORAGE } from './constants';

export function normalizePromptConfigs(saved = []) {
  if (!Array.isArray(saved)) return clonePromptConfigs();
  return DEFAULT_PROMPTS.map((defaultPrompt) => {
    const legacyGuidePrompt = saved.find((item) => item.id === 'guideAndFirstPlot') || {};
    const savedPrompt = saved.find((item) => item.id === defaultPrompt.id)
      || ((defaultPrompt.id === 'guide' || defaultPrompt.id === 'firstPlotPoint') ? legacyGuidePrompt : {})
      || {};
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
  guide: `

【导语生成硬性补充要求】
1. 导语必须承接已选脑洞，只能把脑洞落地为开篇，不得新增一套主线，也不要跳到未铺垫的新阶段。
2. 前30字内必须出现核心矛盾、异常背景、羞辱、危险或强信息差之一。
3. 正文中必须隐含完成：核心矛盾、仇恨或痛点、主角反应、结尾钩子。
4. 不要生成章节大纲、人物卡或完整第一章，不要把复仇、真相、反转或结局提前解决。
5. 结尾必须保留开放性，停在读者想继续看下去的位置。
6. 对话只保留高信息量冲突对话；不要为了比例硬塞寒暄或解释型对话。
7. 在对话高潮或沉默处插入极简感官描写代替心理活动。
8. 不要输出标签、分析、标题或代码块，只输出导语正文。
`,
  firstPlotPoint: `

【情节生成硬性补充要求】
1. 必须接续上文，先承接导语，再扩写成第一章第一个剧情点。
2. 必须优先遵守上下文中的【故事起点】【核心冲突】【10章事件链】【前四章执行蓝图】【第4章末付费点】【反转铺垫】；第一章只能完成第一章职责。
3. 第一个剧情点必须完整体现当前已给安排，并自行填充合理细节。
4. 剧情进展不能超出当前安排，不能提前写到后续选项、钩子或结局。
5. 除最终成文外，当前生成内容的结尾必须保留开放性，停在可继续选择或继续展开的位置。
6. 对话比例控制在40%-50%；每段叙述或描写后尽量紧跟一句对话，或让叙述由对话引发。
7. 对话必须同时塑造性格、推进情节、展现潜台词；避免寒暄，从冲突中间切入。
8. 在对话高潮或沉默处插入极简感官描写代替心理活动。
`,
  options: `

【剧情选项硬性补充要求】
1. 必须优先遵守上下文中的【故事起点】【核心冲突】【10章事件链】【前四章执行蓝图】【第4章末付费点】【付费后立即回报】【反转铺垫】。
2. 第{{chapterNum}}章第{{plotIndex}}个剧情点的4个选项只能服务当前章功能，不能越章提前完成后续反转或结局；第4章要为第5-10章细纲留下入口。
3. 如果当前节点靠近付费点、大钩子或反转铺垫，结果里必须体现对应压力或悬念，但不能一次讲完答案。
4. 选项之间必须有明显差异，且都能接续当前剧情。
`,
  nextPlotPoint: `

【情节生成硬性补充要求】
1. 必须接续上文，先承接用户刚选中的选项，再扩写成当前剧情点。
2. 必须优先遵守上下文中的【故事起点】【核心冲突】【10章事件链】【前四章执行蓝图】【第4章末付费点】【付费后立即回报】【反转铺垫】。
3. 选项就是本次小说剧情大纲：生成内容必须是对上一个选项的转述扩写，从开始到结尾体现选项中的所有安排，并自行填充合理细节。
4. 禁止直接写选项之后更远的后续内容；剧情进展不能超出选项安排，不能提前写到下一个选择、下一个钩子或未被选择的走向。
5. 除最终成文外，当前生成内容的结尾必须保留开放性，停在可继续生成选项的位置。
6. 对话比例控制在40%-50%；每段叙述或描写后尽量紧跟一句对话，或让叙述由对话引发。
7. 对话必须同时塑造性格、推进情节、展现潜台词；避免寒暄，从冲突中间切入。
8. 在对话高潮或沉默处插入极简感官描写代替心理活动。
`,
  optionResultVariants: `

【结果候选硬性补充要求】
1. 必须优先遵守上下文中的【故事起点】【核心冲突】【10章事件链】【前四章执行蓝图】【第4章末付费点】【反转铺垫】。
2. 同一个选项行为的4个结果候选，不能脱离当前章节职责。
3. 如果当前章节承担钩子或铺垫功能，结果候选必须保留悬念，不得直接讲完终局答案。
`,
  hooks: `

【章节钩子硬性补充要求】
1. 必须优先遵守上下文中的【故事起点】【核心冲突】【10章事件链】【前四章执行蓝图】【第4章末付费点】【付费后立即回报】【反转铺垫】。
2. 钩子和对应剧情走向都要为下一章职责服务，不能把下一章该做的事写散。
3. 如果本章或下一章承担第4章末付费点或后段反转铺垫，钩子里必须显式体现压力升级或异常信号。
`,
  bigHooks: `

【大钩子硬性补充要求】
1. 必须优先遵守上下文中的【故事起点】【核心冲突】【10章事件链】【前四章执行蓝图】【付费后立即回报】【后段大反转】【反转铺垫】。
2. 大钩子只能在既定10章故事架构内做强分叉，不能另起一套新设定或新主线。
3. 每个大钩子的剧情走向都必须写清第5-10章如何继续推进，不得把第4章写成全书终局。
`,
  hookDirectionVariants: `

【钩子走向候选硬性补充要求】
1. 必须优先遵守上下文中的【故事起点】【核心冲突】【10章事件链】【前四章执行蓝图】【第4章末付费点】【反转铺垫】。
2. 4个候选都要承接同一个钩子，但只能变化推进角度，不能脱离当前章位职责。
`,
  bigHookDirectionVariants: `

【大钩子走向候选硬性补充要求】
1. 必须优先遵守上下文中的【故事起点】【核心冲突】【10章事件链】【前四章执行蓝图】【付费后立即回报】【后段大反转】【反转铺垫】。
2. 4个候选都要承接同一个大钩子，并写清第5-10章后续细纲方向。
`,
  finalWriting: `

【最终成文硬性补充要求】
1. 必须优先遵守上下文中的【故事起点】【核心冲突】【10章事件链】【前四章执行蓝图】【第4章末付费点】【付费后立即回报】【后段大反转】【反转铺垫】。
2. 每个情节都必须接续上文，按照完整剧情大纲顺序进行转述扩写，不要越过大纲安排提前写未铺垫的后续内容。
3. 大纲中的每个选项、钩子和大钩子都是本次小说剧情大纲的一部分，扩写要从开始到结尾体现所有已选内容，并自行填充合理细节。
4. 剧情进展不能超出完整大纲的安排；最终成文是前四章阶段正文，需要按大钩子留下第5-10章入口。
5. 全文对话比例控制在40%-50%；每段叙述或描写后尽量紧跟一句对话，或让叙述由对话引发。
6. 对话必须同时塑造性格、推进情节、展现潜台词；避免寒暄，从冲突中间切入。
7. 在对话高潮或沉默处插入极简感官描写代替心理活动。
`,
};

function appendRuntimeGuard(id, userPrompt, values = {}) {
  const guard = id === 'brainhole'
    ? BRAINHOLE_RUNTIME_GUARD
    : GENERATION_RUNTIME_GUARDS[id] || '';
  return `${userPrompt}${renderPrompt(guard, values)}`;
}

export function buildPromptMessages(promptConfigs, id, values) {
  const config = getPromptConfig(promptConfigs, id);
  const userPrompt = appendRuntimeGuard(id, renderPrompt(config.userPrompt, values).trim(), values);
  return [
    { role: 'system', content: renderPrompt(config.systemPrompt, values).trim() },
    { role: 'user', content: userPrompt },
  ];
}
