import skeletonSystem from './提示词/短故事工业化骨架与赛道结构系统.md?raw'

export const TRACK_PROMPT_SOURCE_FILES = [
  {
    name: '短故事工业化骨架与赛道结构系统.md',
    path: '提示词/短故事工业化骨架与赛道结构系统.md',
    content: skeletonSystem,
  },
]

function escapePromptText(text) {
  return String(text || '').replace(/```/g, '`\\`\\`')
}

function buildSystemPrompt() {
  const promptBodies = TRACK_PROMPT_SOURCE_FILES.map(file => {
    return [
      `【来源文件】${file.path}`,
      escapePromptText(file.content.trim()),
    ].join('\n')
  }).join('\n\n---\n\n')

  return [
    '你正在执行短故事样文赛道分析。此调用只负责判断样文所属赛道与后续抽取上下文。',
    '不要抽取 DNA 资产，不要输出 analysis_results，不要输出 extraction_summary，不要声称写入文件。',
    '不要输出任何文件路径、路径模板或带占位符的目录字符串；赛道样文路径由调用方基于 confirmed track 自行解析。',
    '如果赛道无法判断，primary_track 必须填 UNKNOWN，并在 risk_notes 与 evidence 中说明原因和证据缺口。',
    '只输出单个可被 JSON.parse 解析的 JSON object，不要 Markdown，不要解释。',
    '',
    '=== 赛道结构参考开始 ===',
    promptBodies,
    '=== 赛道结构参考结束 ===',
    '',
    '=== 输出协议 ===',
    '返回单个 JSON object，且只能包含顶层字段 track_analysis。',
    'track_analysis 结构：',
    '{',
    '  "source_story": string,',
    '  "primary_track": string,',
    '  "secondary_tracks": string[],',
    '  "confidence": "low" | "medium" | "high",',
    '  "objective_features": string[],',
    '  "reader_expectation": string,',
    '  "emotional_promise": string[],',
    '  "structure_signature": {',
    '    "opening": string,',
    '    "development": string,',
    '    "turn": string,',
    '    "ending": string',
    '  },',
    '  "risk_notes": string[],',
    '  "evidence": Array<{',
    '    "quote": string,',
    '    "interpretation": string,',
    '    "chapter": number,',
    '    "approx_char_offset": number',
    '  }>',
    '}',
  ].join('\n')
}

function buildUserPrompt({ title = '', text = '', platformNote = '' } = {}) {
  return [
    '请基于下方样文完成赛道分析。',
    '输出必须是可被 JSON.parse 直接解析的单个 JSON object。',
    '',
    '【输入】',
    JSON.stringify(
      {
        title: String(title || '').trim(),
        platform_note: String(platformNote || '').trim(),
        text: String(text || ''),
      },
      null,
      2,
    ),
  ].join('\n')
}

export function buildTrackAnalysisPrompt(input = {}) {
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(input)

  return {
    promptSources: TRACK_PROMPT_SOURCE_FILES.map(file => file.path),
    systemPrompt,
    userPrompt,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }
}
