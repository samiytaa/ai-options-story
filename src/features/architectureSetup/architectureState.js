export const FIXED_PAY_HOOK_POSITION = '第4章末';

export function createEmptyArchitectureActor() {
  return {
    name: '',
    role: '',
    persona: '',
    goal: '',
    pressureBehavior: '',
    voice: '',
    emotionFunction: '',
    plotFunction: '',
  };
}

export function createEmptyArchitecturePlan() {
  return {
    storySummary: '',
    coreConflict: '',
    guideReferenceNotes: '',
    outlineReferenceNotes: '',
    chapterPlan: '',
    frontFourPlan: '',
    globalPayHook: '',
    payoffAfterPay: '',
    globalTwist: '',
    twistSetup: '',
    actors: [],
  };
}

export function normalizeArchitectureActor(actor = {}) {
  const base = createEmptyArchitectureActor();
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(base).map(([key]) => [key, String(actor?.[key] || '').trim()]),
    ),
  };
}

export function normalizeArchitecturePlan(plan = {}) {
  const base = createEmptyArchitecturePlan();
  const hasLegacyStorySummary = !String(plan?.storySummary || '').trim() && String(plan?.globalSummary || '').trim();
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(base)
        .filter(([key]) => key !== 'actors')
        .map(([key]) => [
          key,
          key === 'storySummary'
            ? String(plan?.storySummary || plan?.globalSummary || '').trim()
            : key === 'guideReferenceNotes'
              ? String(plan?.guideReferenceNotes || plan?.globalLeadExample || '').trim()
              : key === 'outlineReferenceNotes'
                ? String(plan?.outlineReferenceNotes || (hasLegacyStorySummary ? '' : plan?.globalSummary) || '').trim()
                : String(plan?.[key] || '').trim(),
        ]),
    ),
    actors: Array.isArray(plan?.actors) ? plan.actors.map(normalizeArchitectureActor) : [],
  };
}

export function validateArchitecturePlan(plan = {}) {
  const normalized = normalizeArchitecturePlan(plan);
  const errors = [];
  errors.push(...validateArchitectureFields(normalized).errors);
  errors.push(...validatePersonaFields(normalized).errors);

  return {
    normalized,
    errors,
    isValid: errors.length === 0,
  };
}

export function validateArchitectureFields(plan = {}) {
  const normalized = normalizeArchitecturePlan(plan);
  const errors = [];
  const requiredFields = [
    ['storySummary', '故事起点'],
    ['coreConflict', '核心冲突'],
    ['chapterPlan', '10章事件链'],
    ['frontFourPlan', '前四章执行蓝图'],
    ['globalPayHook', '第4章末付费点'],
    ['payoffAfterPay', '付费后立即回报'],
    ['globalTwist', '后段大反转'],
    ['twistSetup', '反转铺垫'],
  ];

  requiredFields.forEach(([key, label]) => {
    if (!normalized[key]) errors.push(`${label}不能为空`);
  });

  if (normalized.chapterPlan) {
    const chapterMatches = normalized.chapterPlan.match(/第(?:[一二三四五六七八九十]|10|[1-9])章/g) || [];
    if (chapterMatches.length < 10) {
      errors.push('10章事件链需要明确写出第1章到第10章各自的功能');
    }
  }

  if (normalized.frontFourPlan) {
    const frontFourMatches = normalized.frontFourPlan.match(/第[一二三四1234]章/g) || [];
    if (frontFourMatches.length < 4) {
      errors.push('前四章执行蓝图需要明确写出第1章到第4章的剧情点功能');
    }
  }

  return {
    normalized,
    errors,
    isValid: errors.length === 0,
  };
}

export function validatePersonaFields(plan = {}) {
  const normalized = normalizeArchitecturePlan(plan);
  const errors = [];

  if (normalized.actors.length < 3 || normalized.actors.length > 5) {
    errors.push('核心演员必须保持 3 到 5 个');
  }

  normalized.actors.forEach((actor, index) => {
    if (!actor.name) errors.push(`核心演员 ${index + 1} 缺少角色名`);
    if (!actor.role) errors.push(`核心演员 ${index + 1} 缺少角色功能`);
    if (!actor.persona) errors.push(`核心演员 ${index + 1} 缺少人设定位`);
    if (!actor.goal) errors.push(`核心演员 ${index + 1} 缺少目标`);
    if (!actor.pressureBehavior) errors.push(`核心演员 ${index + 1} 缺少压力行为`);
    if (!actor.voice) errors.push(`核心演员 ${index + 1} 缺少说话味道`);
    if (!actor.emotionFunction) errors.push(`核心演员 ${index + 1} 缺少制造情绪`);
    if (!actor.plotFunction) errors.push(`核心演员 ${index + 1} 缺少剧情任务`);
    if (
      actor.plotFunction
      && !/(第[一二三四五六七八九十\d]+章|付费点|反转|清算|大钩子)/.test(actor.plotFunction)
    ) {
      errors.push(`核心演员 ${index + 1} 的剧情任务需要绑定章节、付费点、反转、清算或大钩子`);
    }
  });

  return {
    normalized,
    errors,
    isValid: errors.length === 0,
  };
}

export function buildArchitectureSummary(plan = {}) {
  const normalized = normalizeArchitecturePlan(plan);
  const lines = [];

  if (normalized.storySummary) lines.push(`【故事起点】${normalized.storySummary}`);
  if (normalized.coreConflict) lines.push(`【核心冲突】${normalized.coreConflict}`);
  if (normalized.guideReferenceNotes) lines.push(`【导语参考】${normalized.guideReferenceNotes}`);
  if (normalized.outlineReferenceNotes) lines.push(`【大纲参考】${normalized.outlineReferenceNotes}`);
  if (normalized.chapterPlan) lines.push(`【10章事件链】${normalized.chapterPlan}`);
  if (normalized.frontFourPlan) lines.push(`【前四章执行蓝图】${normalized.frontFourPlan}`);
  if (normalized.globalPayHook) lines.push(`【第4章末付费点】${normalized.globalPayHook}`);
  if (normalized.payoffAfterPay) lines.push(`【付费后立即回报】${normalized.payoffAfterPay}`);
  if (normalized.globalTwist) lines.push(`【后段大反转】${normalized.globalTwist}`);
  if (normalized.twistSetup) lines.push(`【反转铺垫】${normalized.twistSetup}`);

  if (normalized.actors.length) {
    lines.push(
      `【核心演员】\n${normalized.actors.map((actor, index) => (
        `${index + 1}. ${actor.name || '未命名角色'}｜${actor.role || '未分配功能'}｜目标：${actor.goal || '待补充'}｜压力行为：${actor.pressureBehavior || '待补充'}｜剧情任务：${actor.plotFunction || '待补充'}`
      )).join('\n')}`,
    );
  }

  return lines.join('\n');
}
