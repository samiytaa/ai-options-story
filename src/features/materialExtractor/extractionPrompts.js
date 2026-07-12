import dnaInstruction from './提示词/指令_模块G_DNA拆解.md?raw'
import pathMapping from './提示词/配置_模块G_DNA路径映射.md?raw'
import { buildMaterialPromptMessages } from './materialPromptConfig'

export const EXTRACTION_PROMPT_SOURCE_FILES = [
  {
    name: '指令_模块G_DNA拆解.md',
    path: '提示词/指令_模块G_DNA拆解.md',
    content: dnaInstruction,
  },
  {
    name: '配置_模块G_DNA路径映射.md',
    path: '提示词/配置_模块G_DNA路径映射.md',
    content: pathMapping,
  },
]

export const ANALYSIS_RESULT_KEYS = [
  'variable_library',
  'rhythm_template',
  'emotional_anchor',
  'suspense_template',
  'gratification_formula',
  'intro_template',
  'opening_template',
  'asset_relationship_network',
  'agency_curve',
  'structural_skeleton',
  'character_highlight',
  'high_octane_scene',
  'conflict_escalation_formula',
  'structural_technique',
  'character_arc_framework',
  'language_dna',
  'theme_template',
  'chapter_outline',
  'world_setting',
  'character_profile',
]

function normalizeMode(mode) {
  return mode === 'full' ? 'full' : 'quick'
}

function stringifyPromptValue(value) {
  return JSON.stringify(value, null, 2)
}

export function buildExtractionPrompt({ title = '', text = '', mode = 'quick', confirmedTrack = 'UNKNOWN', trackAnalysis = null, promptConfigs = null } = {}) {
  const normalizedMode = normalizeMode(mode)
  const prompt = buildMaterialPromptMessages(promptConfigs || [], 'story-dna-asset-extraction', {
    dnaInstructionSource: dnaInstruction.trim(),
    pathMappingSource: pathMapping.trim(),
    titleJson: stringifyPromptValue(String(title || '').trim()),
    mode: normalizedMode,
    modeJson: stringifyPromptValue(normalizedMode),
    confirmedTrackJson: stringifyPromptValue(String(confirmedTrack || 'UNKNOWN').trim() || 'UNKNOWN'),
    trackAnalysisJson: stringifyPromptValue(trackAnalysis || null),
    textJson: stringifyPromptValue(String(text || '')),
  })

  return {
    mode: normalizedMode,
    temperature: prompt.config.temperature,
    promptSources: EXTRACTION_PROMPT_SOURCE_FILES.map(file => file.path),
    systemPrompt: prompt.messages[0].content,
    userPrompt: prompt.messages[1].content,
    messages: prompt.messages,
  }
}
