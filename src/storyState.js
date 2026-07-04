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

export function createInitialState(apiKey = '') {
  return {
    apiKey,
    storyStart: '',
    trend: '反套路权谋、古言逆袭、古风情感、玄幻仙侠',
    guideDbSelection: ['历史古代', '古言逆袭'],
    brainhole: '',
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
        summary += `  → 选择: ${plotPoint.options[plotPoint.chosenOption]}\n`;
      }
    });

    if (chapter.hookChosen !== null && chapter.hookOptions?.[chapter.hookChosen]) {
      summary += `章节钩子选择: ${chapter.hookOptions[chapter.hookChosen]}\n`;
    }
  });

  if (state.bigHookChosen !== null && state.bigHooks[state.bigHookChosen]) {
    summary += `\n大钩子选择: ${state.bigHooks[state.bigHookChosen]}\n`;
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
