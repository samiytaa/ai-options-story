export const STAGES = [
  'setup',
  'brainhole',
  'guide',
  'ch1',
  'ch2',
  'ch3',
  'ch4_bighooks',
  'style_writing',
  'complete',
];

export const STAGE_LABELS = ['设置', '脑洞', '导语', '第一章', '第二章', '第三章', '第四章·大钩子', '文风成文', '完成'];

export function createInitialState(aiConfig) {
  return {
    aiConfig,
    storyStart: '',
    brainhole: '',
    brainholeOptions: [],
    selectedBrainholeIndex: null,
    guide: '',
    chapters: [],
    currentChapter: 1,
    currentPlotPointIndex: 0,
    currentOptions: [],
    currentHooks: [],
    bigHooks: [],
    bigHookChosen: null,
    finalStyle: '',
    finalWork: '',
    customPromptInstruction: '',
    stage: 'setup',
    plotPointContents: [],
  };
}

export function buildContextSummary(state) {
  let summary = '';
  if (state.brainhole) summary += `【脑洞】${state.brainhole}\n`;
  if (state.guide) summary += `【导语】${state.guide}\n`;

  state.chapters.forEach((chapter) => {
    summary += `\n--- 第${chapter.chapterNum}章 ---\n`;
    chapter.plotPoints?.forEach((plotPoint, index) => {
      summary += `剧情点${index + 1}: ${plotPoint.desc}\n`;
      if (plotPoint.chosenOption !== null && plotPoint.options?.[plotPoint.chosenOption]) {
        summary += `  → 选择: ${formatChoiceForPrompt(plotPoint.options[plotPoint.chosenOption])}\n`;
      }
    });

    if (chapter.hookChosen !== null && chapter.hookOptions?.[chapter.hookChosen]) {
      summary += `章节钩子选择: ${formatHookForPrompt(chapter.hookOptions[chapter.hookChosen], 'hook')}\n`;
    }
  });

  if (state.bigHookChosen !== null && state.bigHooks[state.bigHookChosen]) {
    summary += `\n大钩子选择: ${formatHookForPrompt(state.bigHooks[state.bigHookChosen], 'bighook')}\n`;
  }

  return summary;
}

export function ensureChapter(state) {
  let chapter = state.chapters.find((item) => item.chapterNum === state.currentChapter);
  if (!chapter) {
    chapter = {
      chapterNum: state.currentChapter,
      plotPoints: [],
      hookChosen: null,
      hookOptions: [],
    };
    state.chapters.push(chapter);
  }
  return chapter;
}

export function parseNumberedLines(text, label, fallbackPrefix) {
  const pattern = new RegExp(`^${label}[1-4][：:]`);
  const replacePattern = new RegExp(`^${label}[1-4][：:]\\s*`);
  const values = text
    .split('\n')
    .filter((line) => pattern.test(line.trim()))
    .map((line) => line.replace(replacePattern, '').trim())
    .filter(Boolean);

  while (values.length < 4) {
    values.push(`${fallbackPrefix}${values.length + 1}`);
  }

  return values.slice(0, 4);
}

function parseJsonObjectFromText(text) {
  const normalized = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const candidates = [normalized];
  const objectStart = normalized.indexOf('{');
  const objectEnd = normalized.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(normalized.slice(objectStart, objectEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      // Fall back to legacy line parsing below.
    }
  }

  return null;
}

export function isStructuredHook(value) {
  return Boolean(value && typeof value === 'object' && ('hook' in value || 'direction' in value || 'text' in value));
}

export function normalizeHookChoice(value = {}, index = 0, type = 'hook') {
  const fallbackLabel = type === 'bighook' ? '大钩子' : '钩子';

  if (isStructuredHook(value)) {
    return {
      hook: String(value.hook || value.text || '').trim() || `${fallbackLabel}${index + 1}`,
      direction: String(value.direction || value.result || '').trim(),
    };
  }

  const text = String(value || '').trim();
  if (!text) {
    return {
      hook: `${fallbackLabel}${index + 1}`,
      direction: '承接这个悬念继续推进剧情，并形成新的转折落点。',
    };
  }

  const hookLabel = type === 'bighook' ? '大钩子' : '钩子';
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const hookMatch = normalized.match(new RegExp(`(?:^|\\n)\\s*${hookLabel}(?:\\d+)?[：:]\\s*([\\s\\S]*?)(?=(?:[→，,、]\\s*)?剧情走向(?:\\d+)?[：:]|$)`));
  const directionMatch = normalized.match(/(?:^|\n|[→，,、])\s*剧情走向(?:\d+)?[：:]\s*([\s\S]*)$/);

  return {
    hook: (hookMatch?.[1] || normalized).trim(),
    direction: (directionMatch?.[1] || '').trim(),
  };
}

export function formatHookForPrompt(value, type = 'hook') {
  const choice = normalizeHookChoice(value, 0, type);
  if (!choice.direction) return choice.hook;
  return `${type === 'bighook' ? '大钩子' : '钩子'}：${choice.hook}\n剧情走向：${choice.direction}`;
}

export function formatHookForDisplay(value, type = 'hook') {
  const choice = normalizeHookChoice(value, 0, type);
  if (!choice.direction) return choice.hook;
  return `${type === 'bighook' ? '大钩子' : '钩子'}：${choice.hook}\n剧情走向：${choice.direction}`;
}

export function parseDirectionalHooks(text, label, fallbackPrefix, type = 'hook') {
  const jsonPayload = parseJsonObjectFromText(text);
  const jsonItems = Array.isArray(jsonPayload?.[type === 'bighook' ? 'bigHooks' : 'hooks'])
    ? jsonPayload[type === 'bighook' ? 'bigHooks' : 'hooks']
    : null;

  if (jsonItems?.length) {
    const values = jsonItems.map((item, index) => normalizeHookChoice(item, index, type));
    while (values.length < 4) {
      values.push(normalizeHookChoice({}, values.length, type));
    }
    return values.slice(0, 4);
  }

  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const values = [];

  for (let index = 1; index <= 4; index += 1) {
    const hookLineIndex = lines.findIndex((line) => new RegExp(`^${label}${index}[：:]`).test(line));
    const directionLineIndex = lines.findIndex((line) => new RegExp(`^剧情走向${index}[：:]`).test(line));
    const hookLine = hookLineIndex >= 0 ? lines[hookLineIndex] : '';
    const directionLine = directionLineIndex >= 0 ? lines[directionLineIndex] : '';

    if (hookLine) {
      const inlineSplitPattern = new RegExp(`(?:[→，,、]|\\s+)\\s*剧情走向${index}[：:]\\s*`);
      const [rawHook, rawInlineDirection = ''] = hookLine.split(inlineSplitPattern);
      const hook = rawHook.replace(new RegExp(`^${label}${index}[：:]\\s*`), '').trim();
      const direction = (rawInlineDirection || directionLine.replace(new RegExp(`^剧情走向${index}[：:]\\s*`), '')).trim();
      values.push(normalizeHookChoice({ hook, direction }, index - 1, type));
    }
  }

  if (!values.length) {
    return parseNumberedLines(text, label, fallbackPrefix).map((value, index) => normalizeHookChoice(value, index, type));
  }

  while (values.length < 4) {
    values.push(normalizeHookChoice({}, values.length, type));
  }

  return values.slice(0, 4);
}

export function isStructuredChoice(value) {
  return Boolean(value && typeof value === 'object' && ('option' in value || 'result' in value));
}

export function normalizePlotChoice(value = {}, index = 0) {
  if (isStructuredChoice(value)) {
    return {
      option: String(value.option || value.text || '').trim() || `继续发展剧情选项${index + 1}`,
      result: String(value.result || '').trim(),
    };
  }

  const text = String(value || '').trim();
  if (!text) {
    return {
      option: `继续发展剧情选项${index + 1}`,
      result: '选择后推进剧情，并留下新的悬念。',
    };
  }

  const normalized = text.replace(/\r\n/g, '\n').trim();
  const optionMatch = normalized.match(/(?:^|\n)\s*选项(?:\d+)?[：:]\s*([\s\S]*?)(?=(?:[→，,、]\s*)?结果(?:\d+)?[：:]|$)/);
  const resultMatch = normalized.match(/(?:^|\n|[→，,、])\s*结果(?:\d+)?[：:]\s*([\s\S]*)$/);

  return {
    option: (optionMatch?.[1] || normalized).trim(),
    result: (resultMatch?.[1] || '').trim(),
  };
}

export function formatChoiceForPrompt(value) {
  const choice = normalizePlotChoice(value);
  if (!choice.result) return choice.option;
  return `选项：${choice.option}\n结果：${choice.result}`;
}

export function formatChoiceForDisplay(value) {
  const choice = normalizePlotChoice(value);
  if (!choice.result) return choice.option;
  return `选项：${choice.option}\n结果：${choice.result}`;
}

export function parsePlotOptions(text) {
  const jsonPayload = parseJsonObjectFromText(text);
  if (Array.isArray(jsonPayload?.options) && jsonPayload.options.length) {
    const values = jsonPayload.options.map((option, index) => normalizePlotChoice(option, index));
    while (values.length < 4) {
      values.push(normalizePlotChoice({}, values.length));
    }
    return values.slice(0, 4);
  }

  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const values = [];

  for (let index = 1; index <= 4; index += 1) {
    const optionLineIndex = lines.findIndex((line) => new RegExp(`^选项${index}[：:]`).test(line));
    const resultLineIndex = lines.findIndex((line) => new RegExp(`^结果${index}[：:]`).test(line));
    const optionLine = optionLineIndex >= 0 ? lines[optionLineIndex] : '';
    const resultLine = resultLineIndex >= 0 ? lines[resultLineIndex] : '';

    if (optionLine) {
      const inlineSplitPattern = new RegExp(`(?:[→，,、]|\\s+)\\s*结果${index}[：:]\\s*`);
      const [rawOption, rawInlineResult = ''] = optionLine.split(inlineSplitPattern);
      const option = rawOption.replace(new RegExp(`^选项${index}[：:]\\s*`), '').trim();
      const result = (rawInlineResult || resultLine.replace(new RegExp(`^结果${index}[：:]\\s*`), '')).trim();
      values.push(normalizePlotChoice({ option, result }, index - 1));
    }
  }

  while (values.length < 4) {
    values.push(normalizePlotChoice({}, values.length));
  }

  return values.slice(0, 4);
}
