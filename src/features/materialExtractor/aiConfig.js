export const AI_CONFIG_STORAGE_KEY = 'story-dna-ai-config'

export const ENV_AI_CONFIG = {
  apiEndpoint: import.meta.env.VITE_STORY_DNA_AI_API_ENDPOINT || 'https://api.openai.com/v1',
  apiKey: import.meta.env.VITE_STORY_DNA_AI_API_KEY || '',
  model: import.meta.env.VITE_STORY_DNA_AI_MODEL || '',
}

export const DEFAULT_AI_CONFIG = {
  apiEndpoint: ENV_AI_CONFIG.apiEndpoint,
  apiKey: '',
  model: ENV_AI_CONFIG.model,
  availableModels: [],
}

function uniqueSortedModels(models) {
  return [...new Set((models || []).filter(Boolean).map(model => String(model).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
}

export function normalizeAiConfig(raw = {}) {
  const legacyModel = raw.customModel && (!raw.model || raw.model === 'custom')
    ? raw.customModel
    : raw.model

  const normalized = {
    ...DEFAULT_AI_CONFIG,
    ...raw,
    apiEndpoint: String(raw.apiEndpoint || DEFAULT_AI_CONFIG.apiEndpoint).trim(),
    apiKey: String(raw.apiKey || ENV_AI_CONFIG.apiKey || '').trim(),
    model: String(legacyModel || ENV_AI_CONFIG.model || '').trim(),
    availableModels: uniqueSortedModels(raw.availableModels),
  }

  if (normalized.model && !normalized.availableModels.includes(normalized.model)) {
    normalized.availableModels = uniqueSortedModels([...normalized.availableModels, normalized.model])
  }

  return normalized
}

export function loadAiConfig() {
  try {
    const raw = localStorage.getItem(AI_CONFIG_STORAGE_KEY)
    return normalizeAiConfig(raw ? JSON.parse(raw) : {})
  } catch (error) {
    console.warn('AI config load failed; using defaults.', error)
    return normalizeAiConfig()
  }
}

export function saveAiConfig(config) {
  const normalized = normalizeAiConfig(config)
  localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export function buildModelsUrl(apiEndpoint) {
  const endpoint = String(apiEndpoint || '').trim().replace(/\/+$/, '')
  if (!endpoint) return ''
  return `${endpoint}/models`
}

function parseModelIds(payload) {
  if (Array.isArray(payload?.data)) {
    return uniqueSortedModels(payload.data.map(item => item?.id || item?.name || item))
  }
  if (Array.isArray(payload?.models)) {
    return uniqueSortedModels(payload.models.map(item => item?.id || item?.name || item))
  }
  return []
}

export async function fetchAvailableModels(config) {
  const normalized = normalizeAiConfig(config)
  const modelsUrl = buildModelsUrl(normalized.apiEndpoint)

  if (!modelsUrl) {
    throw new Error('请先填写 API Endpoint')
  }
  if (!normalized.apiKey) {
    throw new Error('请先填写 API Key')
  }

  const response = await fetch(modelsUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${normalized.apiKey}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`模型拉取失败：HTTP ${response.status}${text ? ` - ${text.slice(0, 180)}` : ''}`)
  }

  const payload = await response.json()
  const availableModels = parseModelIds(payload)
  if (!availableModels.length) {
    throw new Error('接口返回成功，但没有识别到模型 ID')
  }

  const model = availableModels.includes(normalized.model)
    ? normalized.model
    : availableModels[0]

  return normalizeAiConfig({
    ...normalized,
    model,
    availableModels,
  })
}

export function hasCompleteAiConfig(config) {
  const normalized = normalizeAiConfig(config)
  return Boolean(normalized.apiEndpoint && normalized.apiKey && normalized.model)
}
