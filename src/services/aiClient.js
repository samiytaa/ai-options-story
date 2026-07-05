import { normalizeApiConfig } from './apiConfig';

function buildUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

export async function fetchAvailableModels(config) {
  const normalized = normalizeApiConfig(config);

  if (!normalized.apiEndpoint) {
    throw new Error('请先填写 API Endpoint');
  }

  if (!normalized.apiKey) {
    throw new Error('请先填写 API Key');
  }

  const response = await fetch(buildUrl(normalized.apiEndpoint, '/models'), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${normalized.apiKey}`,
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `模型列表拉取失败 (${response.status})`);
  }

  const payload = await response.json();
  const models = Array.isArray(payload?.data)
    ? payload.data.map((item) => item?.id).filter(Boolean)
    : [];

  return [...new Set(models)].sort((a, b) => a.localeCompare(b));
}

export async function callAiChat({ config, messages, temperature = 0.85, maxTokens = 4096 }) {
  const normalized = normalizeApiConfig(config);

  if (!normalized.apiKey) {
    throw new Error('请先填写 API Key');
  }

  if (!normalized.model) {
    throw new Error('请先填写模型名称');
  }

  const response = await fetch(buildUrl(normalized.apiEndpoint, '/chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${normalized.apiKey}`,
    },
    body: JSON.stringify({
      model: normalized.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `API 请求失败 (${response.status})`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('模型返回内容为空');
  }

  return content;
}
