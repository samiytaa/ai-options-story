const API_CONFIG_STORAGE = 'brainhole_ai_api_config';
const LEGACY_API_KEY_STORAGE = 'deepseek_api_key_brainhole';

export const DEFAULT_API_CONFIG = Object.freeze({
  apiEndpoint: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat',
  availableModels: ['deepseek-chat'],
});

function uniqueSortedModels(models) {
  return [...new Set(models.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

export function normalizeApiConfig(raw = {}) {
  const legacyModel =
    raw.customModel && (!raw.model || raw.model === 'custom') ? raw.customModel : raw.model;

  const normalized = {
    ...DEFAULT_API_CONFIG,
    ...raw,
    model: legacyModel || DEFAULT_API_CONFIG.model,
  };

  if (!normalized.apiEndpoint || typeof normalized.apiEndpoint !== 'string') {
    normalized.apiEndpoint = DEFAULT_API_CONFIG.apiEndpoint;
  }

  normalized.apiEndpoint = normalized.apiEndpoint.trim().replace(/\/+$/, '');
  normalized.apiKey = typeof normalized.apiKey === 'string' ? normalized.apiKey.trim() : '';
  normalized.model = typeof normalized.model === 'string' ? normalized.model.trim() : '';
  normalized.availableModels = uniqueSortedModels(
    Array.isArray(normalized.availableModels) ? normalized.availableModels : [],
  );

  if (normalized.model && !normalized.availableModels.includes(normalized.model)) {
    normalized.availableModels = uniqueSortedModels([...normalized.availableModels, normalized.model]);
  }

  return normalized;
}

export function loadApiConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(API_CONFIG_STORAGE) || 'null');
    if (saved && typeof saved === 'object') {
      return normalizeApiConfig(saved);
    }
  } catch {
    // ignore malformed storage and fall back to legacy/default
  }

  const legacyApiKey = localStorage.getItem(LEGACY_API_KEY_STORAGE) || '';
  return normalizeApiConfig({ apiKey: legacyApiKey });
}

export function saveApiConfig(config) {
  const normalized = normalizeApiConfig(config);
  localStorage.setItem(API_CONFIG_STORAGE, JSON.stringify(normalized));

  if (normalized.apiKey) {
    localStorage.setItem(LEGACY_API_KEY_STORAGE, normalized.apiKey);
  } else {
    localStorage.removeItem(LEGACY_API_KEY_STORAGE);
  }

  return normalized;
}

export function clearApiConfig() {
  localStorage.removeItem(API_CONFIG_STORAGE);
  localStorage.removeItem(LEGACY_API_KEY_STORAGE);
  return normalizeApiConfig({});
}
