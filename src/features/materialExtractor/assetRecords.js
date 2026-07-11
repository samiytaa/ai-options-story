const DEFAULT_TAG_KEYS = [
  'emotion_tags',
  'function_type',
  'function_actions',
  'style_tags',
  'technique_core',
  'technique_enhancers',
]

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item || '').trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }

  return []
}

function normalizeEvidenceItem(item, index) {
  if (!isPlainObject(item)) {
    return {
      chapter: index + 1,
      paragraph_index: 1,
      approx_char_offset: 0,
      quote: String(item || '').trim(),
      interpretation: '原始证据已自动归一化',
    }
  }

  return {
    ...item,
    chapter: Number.isFinite(Number(item.chapter)) ? Number(item.chapter) : index + 1,
    paragraph_index: Number.isFinite(Number(item.paragraph_index)) ? Number(item.paragraph_index) : 1,
    approx_char_offset: Number.isFinite(Number(item.approx_char_offset)) ? Number(item.approx_char_offset) : 0,
    quote: String(item.quote || item.text || '').trim(),
    interpretation: String(item.interpretation || item.reasoning || '').trim(),
  }
}

function deriveCoreData(record) {
  if (isPlainObject(record.core_data)) {
    return record.core_data
  }

  const passthroughEntries = Object.entries(record).filter(([key]) => ![
    'asset_id',
    'asset_type',
    'schema_version',
    'extraction_status',
    'confidence',
    'core_data',
    'evidence',
    'tags',
    'metadata',
    'suggested_filename',
  ].includes(key))

  return passthroughEntries.reduce((acc, [key, value]) => {
    acc[key] = value
    return acc
  }, {})
}

function buildFallbackAssetId(assetType, variables, index) {
  const story = String(variables?.story || 'untitled').trim() || 'untitled'
  const type = String(assetType || 'asset').trim() || 'asset'
  return `${type}_${story}_${String(index).padStart(2, '0')}`
}

export function normalizeAssetTags(tags = {}) {
  const source = isPlainObject(tags) ? tags : {}
  return DEFAULT_TAG_KEYS.reduce((acc, key) => {
    acc[key] = normalizeStringArray(source[key])
    return acc
  }, {})
}

export function normalizeEvidenceList(evidence = []) {
  if (!Array.isArray(evidence)) {
    return []
  }

  return evidence
    .map((item, index) => normalizeEvidenceItem(item, index))
    .filter(item => item.quote || item.interpretation)
}

export function createAssetRecord({
  assetType,
  index = 1,
  record,
  info,
  getPathVariables,
  resolveTemplate,
  makeSuggestedFilename,
} = {}) {
  if (!isPlainObject(record)) {
    throw new Error(`资产记录格式异常：${assetType || 'unknown'} 第 ${index} 条不是对象`)
  }

  const variables = typeof getPathVariables === 'function'
    ? getPathVariables(assetType, index)
    : {}
  const suggestedFilename = typeof makeSuggestedFilename === 'function'
    ? makeSuggestedFilename(assetType, info, index)
    : String(record.suggested_filename || '').trim()
  const resolvedPath = info?.path && typeof resolveTemplate === 'function'
    ? resolveTemplate(info.path, variables)
    : ''
  const metadataSource = isPlainObject(record.metadata) ? record.metadata : {}
  const coreData = deriveCoreData(record)

  return {
    ...record,
    asset_id: String(record.asset_id || buildFallbackAssetId(assetType, variables, index)).trim(),
    asset_type: String(record.asset_type || assetType || '').trim(),
    schema_version: String(record.schema_version || '1.1').trim(),
    extraction_status: String(record.extraction_status || 'extracted').trim(),
    confidence: String(record.confidence || 'medium').trim(),
    core_data: coreData,
    evidence: normalizeEvidenceList(record.evidence),
    tags: normalizeAssetTags(record.tags),
    suggested_filename: String(record.suggested_filename || suggestedFilename).trim(),
    metadata: {
      ...metadataSource,
      asset_level: info?.level || metadataSource.asset_level || '',
      path_template: info?.path || metadataSource.path_template || '',
      resolved_path: resolvedPath || metadataSource.resolved_path || '',
      suggested_filename: String(record.suggested_filename || suggestedFilename).trim(),
      track: String(variables?.track || metadataSource.track || '').trim(),
      story: String(variables?.story || metadataSource.story || '').trim(),
    },
  }
}

export function normalizeAssetAnalysisResults(results, assetTypeRegistry, options = {}) {
  const registryEntries = Object.entries(assetTypeRegistry || {})

  return registryEntries.reduce((acc, [assetType, info]) => {
    const records = Array.isArray(results?.[assetType]) ? results[assetType] : []
    acc[assetType] = records.map((record, index) => {
      return createAssetRecord({
        assetType,
        index: index + 1,
        record,
        info,
        getPathVariables: options.getPathVariables,
        resolveTemplate: options.resolveTemplate,
        makeSuggestedFilename: options.makeSuggestedFilename,
      })
    })
    return acc
  }, {})
}
