export function createBrainholeOptionDraft() {
  return {
    title: '',
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

export function normalizeScore(value, fallback = 8) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(10, Math.max(0, Math.round(number)));
}

export function normalizeBrainholeIdeaText(value) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .flatMap((line) => line
      .trim()
      .replace(/([。！？!?]|\.{3,}|…{1,2})(?=\S)/g, '$1\n')
      .split('\n'))
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

export function normalizeBrainholeOption(option = {}, index = 0) {
  const scores = option.scores || {};
  return {
    title: String(option.title || `脑洞 ${index + 1}`).trim(),
    idea: normalizeBrainholeIdeaText(option.idea || option.brainhole),
    fit: String(option.fit || option.matchReason || '').trim(),
    scores: {
      freshness: normalizeScore(scores.freshness ?? option.freshness),
      alignment: normalizeScore(scores.alignment ?? option.alignment),
      payoff: normalizeScore(scores.payoff ?? option.payoff),
      writability: normalizeScore(scores.writability ?? option.writability),
    },
    comment: String(option.comment || '').trim(),
    recommendedReason: String(option.recommendedReason || option.reason || '').trim(),
  };
}

export function draftFromBrainholeOption(option) {
  return {
    title: option.title,
    idea: option.idea,
    fit: option.fit,
    freshness: option.scores.freshness,
    alignment: option.scores.alignment,
    payoff: option.scores.payoff,
    writability: option.scores.writability,
    comment: option.comment,
    recommendedReason: option.recommendedReason,
  };
}

export function brainholeOptionFromDraft(draft, index = 0) {
  return normalizeBrainholeOption(
    {
      title: draft.title || `手动脑洞 ${index + 1}`,
      idea: draft.idea,
      fit: draft.fit || '手动添加，按你的判断走。',
      scores: {
        freshness: draft.freshness,
        alignment: draft.alignment,
        payoff: draft.payoff,
        writability: draft.writability,
      },
      comment: draft.comment,
      recommendedReason: draft.recommendedReason,
    },
    index,
  );
}

export function brainholeOptionFromFavorite(item, index = 0) {
  return normalizeBrainholeOption(
    item?.payload?.kind === 'brainhole-option'
      ? item.payload
      : {
        title: item?.title,
        idea: item?.content,
        fit: item?.note,
      },
    index,
  );
}

export function extractJsonPayload(text) {
  const trimmed = String(text || '').trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export function parseBrainholeOptions(result, startIndex = 0) {
  const payload = JSON.parse(extractJsonPayload(result));
  const options = Array.isArray(payload?.options) ? payload.options : [];
  const normalized = options
    .map((option, index) => normalizeBrainholeOption(option, startIndex + index))
    .filter((option) => option.idea);

  if (normalized.length < 5) {
    throw new Error('AI 返回的 JSON 中 options 不足 5 个有效脑洞');
  }

  return normalized.slice(0, 5);
}
