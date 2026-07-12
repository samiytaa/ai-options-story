import { normalizeTrackId, resolveTrackPath, sanitizePathPart } from './assetPathRegistry.js'

function toTrimmedString(value, fallback = '') {
  const trimmed = String(value || '').trim()
  return trimmed || fallback
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(item => String(item || '').trim())
    .filter(Boolean)
}

function normalizeStructureSignature(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    opening: toTrimmedString(source.opening),
    development: toTrimmedString(source.development),
    turn: toTrimmedString(source.turn),
    ending: toTrimmedString(source.ending),
  }
}

function normalizeDecision(value, fallbackConfidence = 'low') {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    decision: toTrimmedString(source.decision, 'needs_human_review'),
    reason: toTrimmedString(source.reason),
    confidence: toTrimmedString(source.confidence, fallbackConfidence),
  }
}

function normalizeTrackCardSeed(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    opening_speed: toTrimmedString(source.opening_speed),
    protagonist_action_mode: toTrimmedString(source.protagonist_action_mode),
    gratification_type: normalizeStringList(source.gratification_type),
    tear_point_type: normalizeStringList(source.tear_point_type),
    reversal_position: normalizeStringList(source.reversal_position),
    taboo_routines: normalizeStringList(source.taboo_routines),
    chapter_rhythm: toTrimmedString(source.chapter_rhythm),
  }
}

function normalizeChapterRhythmSkeleton(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(item => item && typeof item === 'object' && !Array.isArray(item))
    .map(item => ({
      stage: toTrimmedString(item.stage),
      function: toTrimmedString(item.function),
      key_hook: toTrimmedString(item.key_hook),
    }))
    .filter(item => item.stage || item.function || item.key_hook)
}

function normalizeSortingNotes(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    why_not_other_tracks: normalizeStringList(source.why_not_other_tracks),
    human_review_required: Boolean(source.human_review_required),
    review_questions: normalizeStringList(source.review_questions),
  }
}

function normalizeTrackEvidence(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(item => item && typeof item === 'object' && !Array.isArray(item))
    .map(item => ({
      quote: toTrimmedString(item.quote),
      interpretation: toTrimmedString(item.interpretation),
      supports_field: toTrimmedString(item.supports_field),
      chapter: Number.isFinite(Number(item.chapter)) ? Number(item.chapter) : null,
      approx_char_offset: Number.isFinite(Number(item.approx_char_offset)) ? Number(item.approx_char_offset) : null,
    }))
}

function normalizeReferenceTrack(value, primaryTrack = 'UNKNOWN') {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const name = toTrimmedString(source.name || source.track_name || source.reference_track_name || source.suggested_track_name)
  return {
    name: name || (primaryTrack === 'UNKNOWN' ? '' : primaryTrack),
    reason: toTrimmedString(source.reason),
    should_create: Boolean(source.should_create),
  }
}

export function getTrackAnalysisStoryTitle({ storyTitle = '', fallbackStoryTitle = '未命名故事' } = {}) {
  return toTrimmedString(storyTitle, fallbackStoryTitle)
}

export function getTrackAnalysisStorySlug({ storyTitle = '', fallbackStoryTitle = '未命名故事' } = {}) {
  return sanitizePathPart(getTrackAnalysisStoryTitle({ storyTitle, fallbackStoryTitle }), fallbackStoryTitle)
}

export function buildTrackSampleFolder({ track = 'UNKNOWN', storyTitle = '', fallbackStoryTitle = '未命名故事' } = {}) {
  const normalizedTrack = normalizeTrackId(track || 'UNKNOWN')
  const story = getTrackAnalysisStorySlug({ storyTitle, fallbackStoryTitle })
  const kind = normalizedTrack === 'UNKNOWN' ? 'pending' : 'sample'
  return resolveTrackPath(kind, { track: normalizedTrack, story }).replace(/[^/]+$/, '')
}

export function normalizeTrackAnalysis(analysis, {
  storyTitle = '',
  fallbackStoryTitle = '未命名故事',
  overrideTrack = '',
} = {}) {
  const source = analysis && typeof analysis === 'object' && !Array.isArray(analysis) ? analysis : {}
  const primaryTrack = normalizeTrackId(overrideTrack || source.primary_track || 'UNKNOWN')
  const resolvedStoryTitle = getTrackAnalysisStoryTitle({ storyTitle: source.source_story || storyTitle, fallbackStoryTitle })
  const confidence = toTrimmedString(source.confidence, 'low')
  const riskNotes = normalizeStringList(source.risk_notes)
  const nextRiskNotes = primaryTrack === 'UNKNOWN' && riskNotes.length === 0
    ? ['赛道暂时无法判断，等待人工确认。']
    : riskNotes
  const classificationDecision = normalizeDecision(source.classification_decision, confidence)
  if (!classificationDecision.reason) {
    classificationDecision.reason = primaryTrack === 'UNKNOWN'
      ? '当前证据不足，暂时无法稳定判断赛道。'
      : `当前样文更接近 ${primaryTrack}，建议人工确认后继续下游抽取。`
  }
  if (primaryTrack === 'UNKNOWN') {
    classificationDecision.decision = 'unknown'
  } else if (classificationDecision.decision === 'unknown') {
    classificationDecision.decision = 'needs_human_review'
  }

  return {
    source_story: resolvedStoryTitle,
    primary_track: primaryTrack,
    secondary_tracks: normalizeStringList(source.secondary_tracks),
    confidence,
    reference_track: normalizeReferenceTrack(source.reference_track, primaryTrack),
    track_positioning: toTrimmedString(source.track_positioning, toTrimmedString(source.reader_expectation)),
    reader_emotion_needs: normalizeStringList(source.reader_emotion_needs).length
      ? normalizeStringList(source.reader_emotion_needs)
      : normalizeStringList(source.emotional_promise),
    core_gratification_points: normalizeStringList(source.core_gratification_points).length
      ? normalizeStringList(source.core_gratification_points)
      : normalizeStringList(source.track_card_seed?.gratification_type),
    core_pain_points: normalizeStringList(source.core_pain_points).length
      ? normalizeStringList(source.core_pain_points)
      : normalizeStringList(source.track_card_seed?.tear_point_type),
    common_character_relations: normalizeStringList(source.common_character_relations),
    chapter_rhythm_skeleton: normalizeChapterRhythmSkeleton(source.chapter_rhythm_skeleton),
    taboo_zones: normalizeStringList(source.taboo_zones).length
      ? normalizeStringList(source.taboo_zones)
      : normalizeStringList(source.track_card_seed?.taboo_routines),
    brainhole_variable_tags: normalizeStringList(source.brainhole_variable_tags),
    sample_folder: buildTrackSampleFolder({
      track: primaryTrack,
      storyTitle: resolvedStoryTitle,
      fallbackStoryTitle,
    }),
    classification_decision: classificationDecision,
    objective_features: normalizeStringList(source.objective_features),
    reader_expectation: toTrimmedString(source.reader_expectation),
    emotional_promise: normalizeStringList(source.emotional_promise),
    structure_signature: normalizeStructureSignature(source.structure_signature),
    track_card_seed: normalizeTrackCardSeed(source.track_card_seed),
    sorting_notes: normalizeSortingNotes(source.sorting_notes),
    risk_notes: nextRiskNotes,
    evidence: normalizeTrackEvidence(source.evidence),
  }
}
