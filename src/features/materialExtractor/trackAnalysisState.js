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
  const riskNotes = normalizeStringList(source.risk_notes)
  const nextRiskNotes = primaryTrack === 'UNKNOWN' && riskNotes.length === 0
    ? ['赛道暂时无法判断，等待人工确认。']
    : riskNotes

  return {
    source_story: resolvedStoryTitle,
    primary_track: primaryTrack,
    secondary_tracks: normalizeStringList(source.secondary_tracks),
    confidence: toTrimmedString(source.confidence, 'low'),
    sample_folder: buildTrackSampleFolder({
      track: primaryTrack,
      storyTitle: resolvedStoryTitle,
      fallbackStoryTitle,
    }),
    objective_features: normalizeStringList(source.objective_features),
    reader_expectation: toTrimmedString(source.reader_expectation),
    emotional_promise: normalizeStringList(source.emotional_promise),
    structure_signature: normalizeStructureSignature(source.structure_signature),
    risk_notes: nextRiskNotes,
    evidence: Array.isArray(source.evidence)
      ? source.evidence.filter(item => item && typeof item === 'object' && !Array.isArray(item))
      : [],
  }
}
