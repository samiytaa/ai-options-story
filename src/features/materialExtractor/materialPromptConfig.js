import {
  DEFAULT_MATERIAL_PROMPTS,
  cloneMaterialPromptConfigs,
} from './materialPromptDefinitions'

export function normalizeMaterialPromptConfigs(saved = []) {
  if (!Array.isArray(saved)) return cloneMaterialPromptConfigs()

  return DEFAULT_MATERIAL_PROMPTS.map((defaultPrompt) => {
    const savedPrompt = saved.find((item) => item.id === defaultPrompt.id) || {}
    return {
      ...defaultPrompt,
      ...savedPrompt,
      id: defaultPrompt.id,
      title: defaultPrompt.title,
      category: defaultPrompt.category,
      description: defaultPrompt.description,
      temperature: savedPrompt.temperature ?? defaultPrompt.temperature,
    }
  })
}

export function applyMaterialPromptConfigs(promptConfigs, nextPromptConfigs) {
  promptConfigs.splice(0, promptConfigs.length, ...normalizeMaterialPromptConfigs(nextPromptConfigs))
}

export function updateMaterialPromptConfigField(promptConfigs, promptId, key, value) {
  const prompt = promptConfigs.find((item) => item.id === promptId)
  if (!prompt) return
  prompt[key] = value
}

export function getMaterialPromptConfig(promptConfigs, id) {
  return promptConfigs.find((prompt) => prompt.id === id) || DEFAULT_MATERIAL_PROMPTS.find((prompt) => prompt.id === id)
}

export function renderMaterialPrompt(template, values = {}) {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '')
}

export function buildMaterialPromptMessages(promptConfigs, id, values) {
  const config = getMaterialPromptConfig(promptConfigs, id)
  if (!config) {
    throw new Error(`未找到故事DNA提示词配置：${id}`)
  }

  return {
    config,
    messages: [
      { role: 'system', content: renderMaterialPrompt(config.systemPrompt, values).trim() },
      { role: 'user', content: renderMaterialPrompt(config.userPrompt, values).trim() },
    ],
  }
}
