import {
  formatChoiceForDisplay,
  formatHookForDisplay,
  normalizeHookChoice,
  normalizePlotChoice,
  parsePlotOptions,
} from '../storyState';
import {
  brainholeOptionFromDraft,
  draftFromBrainholeOption,
  normalizeBrainholeOption,
  normalizeScore,
} from './brainholeOptions';

const FAVORITE_TABS = [
  { value: 'brainhole', label: '脑洞' },
  { value: 'plot', label: '剧情点' },
  { value: 'option', label: '选项' },
];

function safeJsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createFavoriteDraft() {
  return {
    title: '',
    content: '',
    note: '',
    projectName: '',
    chapterNum: 1,
    plotIndex: 1,
    plotDesc: '',
    chosenOption: 0,
    plotOptionsText: '',
    optionIndex: 0,
    optionLabel: '',
    optionText: '',
    optionResult: '',
    choiceKind: 'option',
    idea: '',
    fit: '',
    freshness: 8,
    alignment: 8,
    payoff: 8,
    writability: 8,
    comment: '',
    recommendedReason: '',
  };
}

export function normalizeFavorite(item) {
  if (!item || typeof item !== 'object') return null;
  const type = FAVORITE_TABS.some((tab) => tab.value === item.type) ? item.type : 'brainhole';
  const payload = item.payload && typeof item.payload === 'object' ? safeJsonClone(item.payload) : null;
  const content = String(
    item.content ||
    payload?.idea ||
    payload?.desc ||
    payload?.choice?.option ||
    payload?.text ||
    '',
  ).trim();
  if (!content) return null;

  return {
    id: String(item.id || `fav-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    type,
    title: String(item.title || FAVORITE_TABS.find((tab) => tab.value === type)?.label || '收藏').trim(),
    content,
    note: String(item.note || payload?.fit || payload?.choice?.result || '').trim(),
    payload,
    projectId: item.projectId || '',
    projectName: item.projectName || '',
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

export function favoriteBrainholePayload(option) {
  const normalized = normalizeBrainholeOption(option);
  return {
    kind: 'brainhole-option',
    ...normalized,
  };
}

export function favoritePlotPayload(input = {}) {
  const options = Array.isArray(input.options)
    ? input.options.map((option, index) => normalizePlotChoice(option, index))
    : [];
  const chosenOption = normalizeScore(input.chosenOption, 0);

  return {
    kind: 'plot-point',
    chapterNum: Number(input.chapterNum) || 1,
    plotIndex: Number(input.plotIndex) || 1,
    desc: String(input.desc || '').trim(),
    chosenOption: Math.max(0, Math.min(Math.max(options.length - 1, 0), chosenOption)),
    options,
  };
}

export function favoriteChoicePayload(input = {}) {
  const choiceKind = ['option', 'hook', 'bighook'].includes(input.choiceKind) ? input.choiceKind : 'option';
  const choice = choiceKind === 'option'
    ? normalizePlotChoice(input.choice || input.text || '', Number(input.index) || 0)
    : normalizeHookChoice(input.choice || input.text || '', Number(input.index) || 0, choiceKind);
  const text = choiceKind === 'option'
    ? formatChoiceForDisplay(choice)
    : formatHookForDisplay(choice, choiceKind);

  return {
    kind: 'choice',
    choiceKind,
    index: Number(input.index) || 0,
    label: String(input.label || '').trim(),
    text,
    choice,
  };
}

export function formatPlotOptionsForDraft(options = []) {
  return options
    .map((option, index) => {
      const choice = normalizePlotChoice(option, index);
      return `选项${index + 1}：${choice.option}\n结果${index + 1}：${choice.result}`;
    })
    .join('\n');
}

export function favoriteDraftFromItem(item) {
  const payloadOption = item.type === 'brainhole'
    ? normalizeBrainholeOption(
      item.payload?.kind === 'brainhole-option'
        ? item.payload
        : {
          title: item.title,
          idea: item.content,
          fit: item.note,
        },
    )
    : null;
  const payloadPlot = item.type === 'plot'
    ? favoritePlotPayload(
      item.payload?.kind === 'plot-point'
        ? item.payload
        : {
          desc: item.content,
          chapterNum: 1,
          plotIndex: 1,
          chosenOption: 0,
          options: [],
        },
    )
    : null;
  const payloadChoice = item.type === 'option'
    ? favoriteChoicePayload(
      item.payload?.kind === 'choice'
        ? item.payload
        : {
          choiceKind: 'option',
          label: item.title,
          text: item.content,
          choice: normalizePlotChoice({
            option: item.content,
            result: item.note,
          }),
        },
    )
    : null;

  return {
    ...createFavoriteDraft(),
    title: item.title,
    content: item.content,
    note: item.note,
    projectName: item.projectName || '',
    ...(payloadOption ? draftFromBrainholeOption(payloadOption) : {}),
    ...(payloadPlot
      ? {
        chapterNum: payloadPlot.chapterNum,
        plotIndex: payloadPlot.plotIndex,
        plotDesc: payloadPlot.desc,
        chosenOption: payloadPlot.chosenOption,
        plotOptionsText: formatPlotOptionsForDraft(payloadPlot.options),
        content: payloadPlot.desc,
        note: payloadPlot.options[payloadPlot.chosenOption]
          ? formatChoiceForDisplay(payloadPlot.options[payloadPlot.chosenOption])
          : item.note,
      }
      : {}),
    ...(payloadChoice
      ? {
        choiceKind: payloadChoice.choiceKind,
        optionIndex: payloadChoice.index,
        optionLabel: payloadChoice.label,
        optionText: payloadChoice.choice?.option || payloadChoice.choice?.hook || payloadChoice.text,
        optionResult: payloadChoice.choice?.result || payloadChoice.choice?.direction || '',
        content: payloadChoice.text,
        note: payloadChoice.choice?.result || payloadChoice.choice?.direction || item.note,
      }
      : {}),
  };
}

export function favoritePayloadFromDraft(type, draft) {
  if (type === 'brainhole') return favoriteBrainholePayload(brainholeOptionFromDraft(draft));
  if (type === 'plot') {
    return favoritePlotPayload({
      chapterNum: draft.chapterNum,
      plotIndex: draft.plotIndex,
      desc: draft.plotDesc || draft.content,
      chosenOption: draft.chosenOption,
      options: draft.plotOptionsText?.trim() ? parsePlotOptions(draft.plotOptionsText) : [],
    });
  }
  if (type === 'option') {
    return favoriteChoicePayload({
      choiceKind: draft.choiceKind,
      index: draft.optionIndex,
      label: draft.optionLabel || draft.title,
      text: draft.optionText,
      choice: draft.choiceKind === 'option'
        ? {
          option: draft.optionText,
          result: draft.optionResult,
        }
        : {
          hook: draft.optionText,
          direction: draft.optionResult,
        },
    });
  }
  return null;
}

export function favoriteSummaryFromPayload(type, payload, draft) {
  if (type === 'brainhole') {
    return {
      content: payload?.idea || draft.content,
      note: payload?.fit || draft.note,
    };
  }

  if (type === 'plot') {
    return {
      content: payload?.desc || draft.content,
      note: payload?.options?.[payload.chosenOption]
        ? formatChoiceForDisplay(payload.options[payload.chosenOption])
        : draft.note,
    };
  }

  if (type === 'option') {
    return {
      content: payload?.text || draft.content,
      note: payload?.choice?.result || payload?.choice?.direction || draft.note,
    };
  }

  return {
    content: draft.content,
    note: draft.note,
  };
}
