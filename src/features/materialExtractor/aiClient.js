import { normalizeAiConfig } from './aiConfig'
import { ANALYSIS_RESULT_KEYS, buildExtractionPrompt } from './extractionPrompts'
import { buildTrackAnalysisPrompt } from './trackPrompts'
import { normalizeTrackAnalysis } from './trackAnalysisState'

export function getAiRuntimeConfig(config) {
  return normalizeAiConfig(config)
}

export function assertAiRuntimeConfig(config) {
  const normalized = normalizeAiConfig(config)
  const missing = []

  if (!normalized.apiEndpoint) missing.push('apiEndpoint')
  if (!normalized.apiKey) missing.push('apiKey')
  if (!normalized.model) missing.push('model')

  if (missing.length) {
    throw new Error(`AI 配置不完整：${missing.join(', ')}`)
  }

  return normalized
}

function buildChatCompletionsUrl(apiEndpoint) {
  const endpoint = String(apiEndpoint || '').trim().replace(/\/+$/, '')
  if (!endpoint) {
    throw new Error('AI 配置不完整：缺少 API Endpoint')
  }
  return `${endpoint}/chat/completions`
}

function stripCodeFences(content) {
  const trimmed = Array.isArray(content)
    ? content.map(part => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object') return String(part.text || part.content || '').trim()
        return ''
      }).join('\n').trim()
    : String(content || '').trim()
  if (!trimmed.startsWith('```')) {
    return trimmed
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

export function safeParseJson(content) {
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    return content
  }

  const source = stripCodeFences(content)
  if (!source) {
    throw new Error('AI 返回内容为空')
  }
  try {
    return JSON.parse(source)
  } catch (error) {
    const firstBrace = source.indexOf('{')
    const lastBrace = source.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(source.slice(firstBrace, lastBrace + 1))
      } catch {
        // fall through to a single readable error below
      }
    }
    throw new Error('AI 返回内容不是合法 JSON')
  }
}

function createEmptyAnalysisResults() {
  return ANALYSIS_RESULT_KEYS.reduce((acc, key) => {
    acc[key] = []
    return acc
  }, {})
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeEvidenceItem(item) {
  return {
    quote: String(item.quote || '').trim(),
    interpretation: String(item.interpretation || '').trim(),
    supports_field: String(item.supports_field || '').trim(),
    chapter: Number.isFinite(Number(item.chapter)) ? Number(item.chapter) : null,
    approx_char_offset: Number.isFinite(Number(item.approx_char_offset)) ? Number(item.approx_char_offset) : null,
  }
}

function looksLikeTrackAnalysis(value) {
  if (!isPlainObject(value)) return false
  return [
    'primary_track',
    'secondary_tracks',
    'reference_track',
    'track_positioning',
    'reader_emotion_needs',
    'core_gratification_points',
    'core_pain_points',
    'common_character_relations',
    'chapter_rhythm_skeleton',
    'taboo_zones',
    'brainhole_variable_tags',
    'objective_features',
    'reader_expectation',
    'emotional_promise',
    'structure_signature',
    'risk_notes',
    'evidence',
  ].some(key => key in value)
}

function coerceTrackAnalysisPayload(payload) {
  if (!isPlainObject(payload)) {
    return payload
  }

  if (isPlainObject(payload.track_analysis)) {
    return payload
  }

  if (looksLikeTrackAnalysis(payload)) {
    return { track_analysis: payload }
  }

  if (isPlainObject(payload.data) && looksLikeTrackAnalysis(payload.data)) {
    return { track_analysis: payload.data }
  }

  return payload
}

function validateAssetRecord(assetType, record, index) {
  if (!isPlainObject(record)) {
    throw new Error(`AI 返回格式异常：${assetType} 第 ${index + 1} 条资产不是对象`)
  }

  const coreData = isPlainObject(record.core_data) ? record.core_data : null
  const hasFallbackPayload = Object.entries(record).some(([key, value]) => {
    if (['asset_id', 'asset_type', 'schema_version', 'extraction_status', 'confidence', 'core_data', 'evidence', 'tags', 'metadata', 'suggested_filename'].includes(key)) {
      return false
    }
    return value !== null && value !== undefined && String(value).trim() !== ''
  })

  if (!coreData && !hasFallbackPayload) {
    throw new Error(`AI 返回格式异常：${assetType} 第 ${index + 1} 条资产缺少有效内容`)
  }

  if (record.evidence != null && !Array.isArray(record.evidence)) {
    throw new Error(`AI 返回格式异常：${assetType} 第 ${index + 1} 条 evidence 不是数组`)
  }

  if (record.tags != null && !isPlainObject(record.tags)) {
    throw new Error(`AI 返回格式异常：${assetType} 第 ${index + 1} 条 tags 不是对象`)
  }

  if (record.metadata != null && !isPlainObject(record.metadata)) {
    throw new Error(`AI 返回格式异常：${assetType} 第 ${index + 1} 条 metadata 不是对象`)
  }
}

export function validateExtractionResponse(payload) {
  if (!isPlainObject(payload)) {
    throw new Error('AI 返回格式异常：响应不是对象')
  }

  if (payload.track_analysis != null) {
    throw new Error('AI 返回格式异常：DNA 抽取结果不应包含 track_analysis')
  }

  if (!isPlainObject(payload.extraction_summary)) {
    throw new Error('AI 返回格式异常：缺少 extraction_summary')
  }

  if (!isPlainObject(payload.analysis_results)) {
    throw new Error('AI 返回格式异常：缺少 analysis_results')
  }

  const summary = payload.extraction_summary
  const requiredArrayFields = [
    'extracted_assets',
    'not_detected',
    'insufficient_evidence',
    'validation_warnings',
    'prompt_sources',
  ]

  requiredArrayFields.forEach(field => {
    if (summary[field] != null && !Array.isArray(summary[field])) {
      throw new Error(`AI 返回格式异常：extraction_summary.${field} 不是数组`)
    }
  })

  const normalizedAnalysisResults = createEmptyAnalysisResults()
  let totalAssets = 0

  Object.keys(normalizedAnalysisResults).forEach(key => {
    const value = payload.analysis_results[key]
    if (value == null) {
      normalizedAnalysisResults[key] = []
      return
    }
    if (!Array.isArray(value)) {
      throw new Error(`AI 返回格式异常：analysis_results.${key} 不是数组`)
    }
    value.forEach((record, index) => validateAssetRecord(key, record, index))
    normalizedAnalysisResults[key] = value
    totalAssets += value.length
  })

  if (totalAssets === 0) {
    throw new Error('AI 返回格式异常：未返回任何有效资产')
  }

  return {
    ...payload,
    extraction_summary: {
      ...summary,
      extracted_assets: Array.isArray(summary.extracted_assets) ? summary.extracted_assets : [],
      not_detected: Array.isArray(summary.not_detected) ? summary.not_detected : [],
      insufficient_evidence: Array.isArray(summary.insufficient_evidence) ? summary.insufficient_evidence : [],
      validation_warnings: Array.isArray(summary.validation_warnings) ? summary.validation_warnings : [],
      prompt_sources: Array.isArray(summary.prompt_sources) ? summary.prompt_sources : [],
    },
    analysis_results: normalizedAnalysisResults,
  }
}

export function validateTrackAnalysisResponse(payload, options = {}) {
  const normalizedPayload = coerceTrackAnalysisPayload(payload)

  if (!isPlainObject(normalizedPayload)) {
    throw new Error('AI 返回格式异常：响应不是对象')
  }

  if (normalizedPayload.analysis_results != null || normalizedPayload.extraction_summary != null) {
    throw new Error('AI 返回格式异常：赛道分析结果不应包含 DNA 抽取字段')
  }

  if (!isPlainObject(normalizedPayload.track_analysis)) {
    throw new Error('AI 返回格式异常：缺少 track_analysis')
  }

  const analysis = normalizedPayload.track_analysis
  const primaryTrack = String(analysis.primary_track || '').trim()
  if (!primaryTrack) {
    throw new Error('AI 返回格式异常：track_analysis.primary_track 不能为空，无法判断时应为 UNKNOWN')
  }

  if (!['low', 'medium', 'high'].includes(String(analysis.confidence || '').trim())) {
    throw new Error('AI 返回格式异常：track_analysis.confidence 必须是 low、medium 或 high')
  }

  if (!Array.isArray(analysis.secondary_tracks)) {
    throw new Error('AI 返回格式异常：track_analysis.secondary_tracks 不是数组')
  }

  const rulePackageArrayFields = [
    'reader_emotion_needs',
    'core_gratification_points',
    'core_pain_points',
    'common_character_relations',
    'chapter_rhythm_skeleton',
    'taboo_zones',
    'brainhole_variable_tags',
  ]

  rulePackageArrayFields.forEach(field => {
    if (analysis[field] != null && !Array.isArray(analysis[field])) {
      throw new Error(`AI 返回格式异常：track_analysis.${field} 不是数组`)
    }
  })

  if (!Array.isArray(analysis.objective_features)) {
    throw new Error('AI 返回格式异常：track_analysis.objective_features 不是数组')
  }

  if (!Array.isArray(analysis.emotional_promise)) {
    throw new Error('AI 返回格式异常：track_analysis.emotional_promise 不是数组')
  }

  if (!Array.isArray(analysis.risk_notes)) {
    throw new Error('AI 返回格式异常：track_analysis.risk_notes 不是数组')
  }

  if (!Array.isArray(analysis.evidence)) {
    throw new Error('AI 返回格式异常：track_analysis.evidence 不是数组')
  }

  if (analysis.classification_decision != null && !isPlainObject(analysis.classification_decision)) {
    throw new Error('AI 返回格式异常：track_analysis.classification_decision 不是对象')
  }

  if (analysis.track_card_seed != null && !isPlainObject(analysis.track_card_seed)) {
    throw new Error('AI 返回格式异常：track_analysis.track_card_seed 不是对象')
  }

  if (analysis.sorting_notes != null && !isPlainObject(analysis.sorting_notes)) {
    throw new Error('AI 返回格式异常：track_analysis.sorting_notes 不是对象')
  }

  if (primaryTrack === 'UNKNOWN' && analysis.risk_notes.length === 0) {
    throw new Error('AI 返回格式异常：赛道为 UNKNOWN 时必须在 risk_notes 保留原因')
  }

  return {
    track_analysis: normalizeTrackAnalysis({
      source_story: String(analysis.source_story || '').trim(),
      primary_track: primaryTrack,
      secondary_tracks: analysis.secondary_tracks.map(item => String(item || '').trim()).filter(Boolean),
      confidence: String(analysis.confidence || 'low').trim(),
      reference_track: isPlainObject(analysis.reference_track)
        ? analysis.reference_track
        : null,
      track_positioning: String(analysis.track_positioning || '').trim(),
      reader_emotion_needs: Array.isArray(analysis.reader_emotion_needs)
        ? analysis.reader_emotion_needs.map(item => String(item || '').trim()).filter(Boolean)
        : [],
      core_gratification_points: Array.isArray(analysis.core_gratification_points)
        ? analysis.core_gratification_points.map(item => String(item || '').trim()).filter(Boolean)
        : [],
      core_pain_points: Array.isArray(analysis.core_pain_points)
        ? analysis.core_pain_points.map(item => String(item || '').trim()).filter(Boolean)
        : [],
      common_character_relations: Array.isArray(analysis.common_character_relations)
        ? analysis.common_character_relations.map(item => String(item || '').trim()).filter(Boolean)
        : [],
      chapter_rhythm_skeleton: Array.isArray(analysis.chapter_rhythm_skeleton)
        ? analysis.chapter_rhythm_skeleton.filter(isPlainObject).map(item => ({
            stage: String(item.stage || '').trim(),
            function: String(item.function || '').trim(),
            key_hook: String(item.key_hook || '').trim(),
          }))
        : [],
      taboo_zones: Array.isArray(analysis.taboo_zones)
        ? analysis.taboo_zones.map(item => String(item || '').trim()).filter(Boolean)
        : [],
      brainhole_variable_tags: Array.isArray(analysis.brainhole_variable_tags)
        ? analysis.brainhole_variable_tags.map(item => String(item || '').trim()).filter(Boolean)
        : [],
      classification_decision: isPlainObject(analysis.classification_decision)
        ? analysis.classification_decision
        : null,
      objective_features: analysis.objective_features.map(item => String(item || '').trim()).filter(Boolean),
      reader_expectation: String(analysis.reader_expectation || '').trim(),
      emotional_promise: analysis.emotional_promise.map(item => String(item || '').trim()).filter(Boolean),
      structure_signature: isPlainObject(analysis.structure_signature)
        ? analysis.structure_signature
        : { opening: '', development: '', turn: '', ending: '' },
      track_card_seed: isPlainObject(analysis.track_card_seed)
        ? analysis.track_card_seed
        : null,
      sorting_notes: isPlainObject(analysis.sorting_notes)
        ? analysis.sorting_notes
        : null,
      risk_notes: analysis.risk_notes.map(item => String(item || '').trim()).filter(Boolean),
      evidence: analysis.evidence.filter(isPlainObject).map(normalizeEvidenceItem),
    }, {
      storyTitle: options.storyTitle,
      fallbackStoryTitle: options.fallbackStoryTitle,
    }),
  }
}

async function readErrorPayload(response) {
  const text = await response.text().catch(() => '')
  if (!text) return ''
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function extractAiErrorMessage(errorBody, status) {
  if (typeof errorBody === 'string' && errorBody.trim()) {
    return errorBody.trim().slice(0, 220)
  }

  if (errorBody && typeof errorBody === 'object') {
    return errorBody.error?.message || errorBody.message || JSON.stringify(errorBody).slice(0, 220)
  }

  return `HTTP ${status}`
}

async function requestJsonObjectFromAi(runtime, prompt, { temperature = 0.2 } = {}) {
  const url = buildChatCompletionsUrl(runtime.apiEndpoint)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${runtime.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: runtime.model,
      temperature,
      response_format: { type: 'json_object' },
      messages: prompt.messages,
    }),
  })

  if (!response.ok) {
    const errorBody = await readErrorPayload(response)
    throw new Error(`AI 调用失败：${extractAiErrorMessage(errorBody, response.status)}`)
  }

  const rawText = await response.text().catch(() => '')
  let payload
  try {
    payload = safeParseJson(rawText)
  } catch {
    throw new Error('AI 返回格式异常：接口响应不是合法 JSON')
  }
  const content = payload?.choices?.[0]?.message?.content
  if (content == null) {
    throw new Error('AI 返回格式异常：未找到 choices[0].message.content')
  }

  return safeParseJson(content)
}

export async function requestTrackAnalysis(config, { title = '', text = '', platformNote = '', promptConfigs = null, availableTracks = null } = {}) {
  const runtime = assertAiRuntimeConfig(config)
  const prompt = buildTrackAnalysisPrompt({ title, text, platformNote, promptConfigs, availableTracks })
  const parsed = await requestJsonObjectFromAi(runtime, prompt, { temperature: prompt.temperature ?? 0.1 })
  const validated = validateTrackAnalysisResponse(parsed, { storyTitle: title })

  return {
    ...validated,
    request: {
      model: runtime.model,
      temperature: prompt.temperature ?? 0.1,
      response_format: { type: 'json_object' },
    },
    prompt_sources: prompt.promptSources,
  }
}

export async function requestAssetExtraction(config, { title = '', text = '', mode = 'quick', confirmedTrack = 'UNKNOWN', trackAnalysis = null, promptConfigs = null } = {}) {
  const runtime = assertAiRuntimeConfig(config)
  const prompt = buildExtractionPrompt({ title, text, mode, confirmedTrack, trackAnalysis, promptConfigs })
  const parsed = await requestJsonObjectFromAi(runtime, prompt, { temperature: prompt.temperature ?? 0.2 })
  const validated = validateExtractionResponse(parsed)

  return {
    ...validated,
    request: {
      model: runtime.model,
      temperature: prompt.temperature ?? 0.2,
      response_format: { type: 'json_object' },
    },
    prompt_sources: prompt.promptSources,
  }
}

export function requestAiExtraction(config, input = {}) {
  return requestAssetExtraction(config, input)
}
