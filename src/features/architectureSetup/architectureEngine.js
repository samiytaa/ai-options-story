import agentsPrompt from './prompts/agents.md?raw';
import outlinePrompt from './prompts/outline-stage2.md?raw';
import { PERSONA_OPTIONS } from './architectureConfig.js';
import {
  FIXED_PAY_HOOK_POSITION,
  createEmptyArchitecturePlan,
  normalizeArchitecturePlan,
  validateArchitectureFields,
  validatePersonaFields,
} from './architectureState.js';

function strictJsonInstruction() {
  return '你必须严格返回 JSON，不要输出解释、Markdown、代码块或 JSON 之外的内容。';
}

function extractJsonObject(text) {
  const normalized = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const objectStart = normalized.indexOf('{');
  const objectEnd = normalized.lastIndexOf('}');
  const candidates = [normalized];
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(normalized.slice(objectStart, objectEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try next candidate.
    }
  }

  throw new Error('AI 返回内容不是合法 JSON');
}

function requiredText(value, fieldName) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`AI 返回缺少${fieldName}`);
  return text;
}

function normalizeActors(list) {
  if (!Array.isArray(list) || list.length < 3 || list.length > 5) {
    throw new Error('AI 返回的核心演员数量必须是 3 到 5 个');
  }

  return list.map((actor, index) => ({
    name: requiredText(actor.name, `核心演员${index + 1}角色名`),
    role: requiredText(actor.role, `核心演员${index + 1}角色功能`),
    persona: requiredText(actor.persona || PERSONA_OPTIONS[index % PERSONA_OPTIONS.length].name, `核心演员${index + 1}人设定位`),
    goal: requiredText(actor.goal, `核心演员${index + 1}目标`),
    pressureBehavior: requiredText(actor.pressureBehavior, `核心演员${index + 1}压力行为`),
    voice: requiredText(actor.voice, `核心演员${index + 1}说话味道`),
    emotionFunction: requiredText(actor.emotionFunction || actor.emotion, `核心演员${index + 1}制造情绪`),
    plotFunction: requiredText(actor.plotFunction || actor.conflict, `核心演员${index + 1}剧情任务`),
  }));
}

function architectureSchemaExample() {
  return {
    projectPlan: {
      storySummary: '2到4句话说清主角、当前困境、想达成的目标，以及故事会往哪场对抗逼近',
      coreConflict: '主角目标和对手目标为什么不能同时成立',
      chapterPlan: '第1章：写清开场事件、阻碍和章尾新问题；第2章：加码冲突并让局势更糟；第3章：把人物推到付费点前最后一层压力；第4章：在章末卡住必须继续看的局势；第5章：立刻给出部分回报并抛出更大的代价；第6章：主角推进反制但被新阻碍打断；第7章：误导继续加深；第8章：反转前夜或反转爆开；第9章：反转后的清算与反制；第10章：收束主线并给关系或代价落点',
      frontFourPlan: '第1章：4个剧情点分别负责开场异常、第一次受压、目标受阻、章尾钩子；第2章：4个剧情点分别负责试探、误判、代价扩大、章尾钩子；第3章：4个剧情点分别负责逼近真相、加深误导、压缩退路、章尾钩子；第4章：4个剧情点分别负责冲突升级、证据或选择逼近、局势翻面前夜、第4章末付费点，并把第5章入口抛出来',
      globalPayHook: '第4章末具体卡住的局势、真相或关键选择',
      payoffAfterPay: '第4章后半或第5章开头立刻给出的动作回报',
      globalTwist: '第8章或第9章真正翻盘的反转点',
      twistSetup: '第1到第4章先埋什么异常，第5到第7章如何继续误导，直到后段反转成立',
    },
  };
}

function personaSchemaExample() {
  return {
    actors: [
      {
        name: '角色名',
        role: '主角/对手/伤害者/作恶推动者/伙伴/信使/见证者/规则代表',
        persona: '一句话人设定位，例如：老七·刺头｜被逼到墙角也会当场还击的清醒主角',
        goal: '他想得到、保住、逃离或证明什么',
        pressureBehavior: '压力升高时他会做什么，绝不做什么',
        voice: '说话味道，最好带一条可模仿的台词规则',
        emotionFunction: '主要制造共情、愤怒、酸涩、爽感、悬疑或反差中的哪一种',
        plotFunction: '他在第1-4章、第4章末付费点、付费后立即回报或后段反转中承担什么任务',
      },
    ],
  };
}

export function buildArchitectureMessages(context = {}) {
  return [
    {
      role: 'system',
      content: [
        agentsPrompt,
        outlinePrompt,
        strictJsonInstruction(),
      ].join('\n\n'),
    },
    {
      role: 'user',
      content: [
        '请根据当前项目上下文，生成“生成架构”阶段需要的故事架构数据。',
        '默认按 9 到 12 章短篇规划；本项目优先生成 10 章架构。',
        '当前 app 暂时只执行到第4章大钩子和成文，所以你必须额外把前四章拆成可执行规划，并让第4章大钩子成为第5-10章细纲入口。',
        '请把结果写成后续剧情生成可直接引用的执行蓝图，而不是空泛大纲、人物小传或世界观说明书。',
        '',
        '【当前项目上下文】',
        JSON.stringify({
          selectedBrainhole: context.selectedBrainhole || {},
          brainholeText: context.brainholeText || '',
          guide: context.guide || '',
          existingArchitecturePlan: normalizeArchitecturePlan(context.architecturePlan || createEmptyArchitecturePlan()),
        }, null, 2),
        '',
        '硬性要求：',
        '1. 所有字段都必须填写。',
        '2. 10章事件链必须覆盖第1章到第10章，每章都要写出事件、阻碍、局势变化和章尾新问题。',
        '3. 前四章执行蓝图必须明确第1章到第4章如何服务当前 app 的剧情点、章节钩子和第四章大钩子。',
        `4. 付费点位置固定为${FIXED_PAY_HOOK_POSITION}，必须写清第4章后如何接入第5-10章细纲。`,
        '5. 后段大反转默认放在第8章或第9章，反转铺垫必须包含前四章要埋下的异常，以及第5到第7章如何继续误导。',
        '6. 不要重复导语，不要单列起承转合、开篇暴击、核心价值观、故事概要这类描述性字段。',
        '',
        '请严格输出 JSON，对象格式如下：',
        JSON.stringify(architectureSchemaExample(), null, 2),
      ].join('\n'),
    },
  ];
}

export function buildPersonaMessages(context = {}) {
  return [
    {
      role: 'system',
      content: [
        agentsPrompt,
        outlinePrompt,
        strictJsonInstruction(),
      ].join('\n\n'),
    },
    {
      role: 'user',
      content: [
        '请根据当前项目上下文，生成“生成人设”阶段需要的核心演员数据。',
        '',
        '【当前项目上下文】',
        JSON.stringify({
          selectedBrainhole: context.selectedBrainhole || {},
          brainholeText: context.brainholeText || '',
          guide: context.guide || '',
          architecturePlan: normalizeArchitecturePlan(context.architecturePlan || createEmptyArchitecturePlan()),
        }, null, 2),
        '',
        '硬性要求：',
        '1. 只输出 3 到 5 个核心演员，必须都能推动主线；如果删掉后主线不受影响，不要输出该角色。',
        '2. 不要写人物百科、完整履历、外貌堆砌或世界观说明，不要重复导语和10章大纲。',
        '3. 每个角色必须包含：角色功能、目标、压力下的行为规则、说话味道、制造情绪、剧情任务。',
        '4. 主角必须写清目标、受限理由和行动能力；对手必须写清资源优势、加码方式和最终漏洞。',
        '5. 角色功能只能使用：主角、对手、伤害者、作恶推动者、伙伴、信使、见证者、规则代表。',
        '6. plotFunction 必须明确服务第1-4章、第4章末付费点、付费后立即回报、后段反转、清算或大钩子中的至少一项。',
        '7. persona 是一句话人设定位，可以包含老大到老八人格，但必须说明它如何影响行动，不要只写人格名。',
        '',
        '请严格输出 JSON，对象格式如下：',
        JSON.stringify(personaSchemaExample(), null, 2),
      ].join('\n'),
    },
  ];
}

export function normalizeArchitectureResult(payload) {
  const parsed = typeof payload === 'string' ? extractJsonObject(payload) : payload;
  const projectPlan = parsed?.projectPlan || parsed || {};
  const normalized = {
    storySummary: requiredText(projectPlan.storySummary || projectPlan.globalSummary, '故事起点'),
    coreConflict: requiredText(projectPlan.coreConflict, '核心冲突'),
    guideReferenceNotes: '',
    outlineReferenceNotes: '',
    chapterPlan: requiredText(projectPlan.chapterPlan, '10章事件链'),
    frontFourPlan: requiredText(projectPlan.frontFourPlan, '前四章执行蓝图'),
    globalPayHook: requiredText(projectPlan.globalPayHook, '第4章末付费点'),
    payoffAfterPay: requiredText(projectPlan.payoffAfterPay, '付费后立即回报'),
    globalTwist: requiredText(projectPlan.globalTwist, '后段大反转'),
    twistSetup: requiredText(projectPlan.twistSetup, '反转铺垫'),
    actors: normalizeArchitecturePlan(projectPlan).actors,
  };

  const validation = validateArchitectureFields(normalized);
  if (!validation.isValid) {
    throw new Error(validation.errors[0]);
  }
  return validation.normalized;
}

export function normalizePersonaResult(payload) {
  const parsed = typeof payload === 'string' ? extractJsonObject(payload) : payload;
  const normalized = {
    actors: normalizeActors(parsed?.actors),
  };

  const validation = validatePersonaFields(normalized);
  if (!validation.isValid) {
    throw new Error(validation.errors[0]);
  }
  return validation.normalized.actors;
}
