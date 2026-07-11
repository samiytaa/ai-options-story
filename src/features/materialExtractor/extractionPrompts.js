import dnaInstruction from './提示词/指令_模块G_DNA拆解.md?raw'
import pathMapping from './提示词/配置_模块G_DNA路径映射.md?raw'

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

function escapePromptText(text) {
  return String(text || '').replace(/```/g, '`\\`\\`')
}

function buildSystemPrompt(mode) {
  const promptBodies = EXTRACTION_PROMPT_SOURCE_FILES.map(file => {
    return [
      `【来源文件】${file.path}`,
      escapePromptText(file.content.trim()),
    ].join('\n')
  }).join('\n\n---\n\n')

  return [
    '你正在执行故事 DNA 资产抽取。此调用只负责从样文中提取可复用资产。',
    '赛道已经由上游赛道分析确认，本次不得重新判断赛道，不得输出 track_analysis。',
    '必须使用输入中的 confirmed_track 填写所有资产 metadata.track；变量库 red_lines.primary_genre 默认等于 confirmed_track，除非资产证据明确冲突并在 validation_warnings 说明。',
    '必须严格遵守证据优先、不得脑补、not_detected / insufficient_evidence 不产出空资产、六维标签、可定位原文证据等规则。',
    '如果某维度证据不足，把它写进 extraction_summary.not_detected 或 extraction_summary.insufficient_evidence，不要编造资产。',
    'analysis_results 中每个已知资产类型都应是数组；没有产出的类型保留为空数组。',
    '仅输出 JSON 结果，不要执行写入，不要声称已入库。',
    `mode: ${mode}`,
    '',
    '=== DNA 抽取提示词原文开始 ===',
    promptBodies,
    '=== DNA 抽取提示词原文结束 ===',
    '',
    '=== 输出协议 ===',
    '返回单个 JSON object，且必须包含以下顶层字段：',
    '1. extraction_summary',
    '2. analysis_results',
    '',
    '禁止包含顶层字段 track_analysis。',
    '',
    'extraction_summary 结构：',
    '{',
    '  "source_story": string,',
    '  "mode": "quick" | "full",',
    '  "confirmed_track": string,',
    '  "extracted_assets": string[],',
    '  "not_detected": Array<{asset_type:string, reason:string, checked_scope:string}>,',
    '  "insufficient_evidence": Array<{asset_type:string, reason:string, checked_scope:string}>,',
    '  "validation_warnings": string[],',
    '  "prompt_sources": string[]',
    '}',
    '',
    'analysis_results 结构起始键：',
    JSON.stringify(
      ANALYSIS_RESULT_KEYS.reduce((acc, key) => {
        acc[key] = []
        return acc
      }, {}),
      null,
      2,
    ),
    '',
    '每个资产记录必须保留六维标签、evidence、metadata、asset_id、asset_type、suggested_filename 等可用字段；不得把无证据字段伪装成 extracted。',
  ].join('\n')
}

function buildUserPrompt({ title = '', text = '', mode = 'quick', confirmedTrack = 'UNKNOWN', trackAnalysis = null } = {}) {
  const normalizedMode = normalizeMode(mode)
  return [
    '请基于下方样文和已确认赛道完成 DNA 资产抽取。',
    '输出必须是可被 JSON.parse 直接解析的单个 JSON object。',
    '',
    '【输入】',
    JSON.stringify(
      {
        title: String(title || '').trim(),
        mode: normalizedMode,
        confirmed_track: String(confirmedTrack || 'UNKNOWN').trim() || 'UNKNOWN',
        track_context: trackAnalysis || null,
        text: String(text || ''),
      },
      null,
      2,
    ),
  ].join('\n')
}

export function buildExtractionPrompt({ title = '', text = '', mode = 'quick', confirmedTrack = 'UNKNOWN', trackAnalysis = null } = {}) {
  const normalizedMode = normalizeMode(mode)
  const systemPrompt = buildSystemPrompt(normalizedMode)
  const userPrompt = buildUserPrompt({ title, text, mode: normalizedMode, confirmedTrack, trackAnalysis })

  return {
    mode: normalizedMode,
    promptSources: EXTRACTION_PROMPT_SOURCE_FILES.map(file => file.path),
    systemPrompt,
    userPrompt,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }
}
