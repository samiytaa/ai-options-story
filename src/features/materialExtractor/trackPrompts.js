import skeletonSystem from './提示词/短故事工业化骨架与赛道结构系统.md?raw'
import trackAnalysisModule from './提示词/赛道分析提示词模块.md?raw'
import { buildMaterialPromptMessages } from './materialPromptConfig'
import { DEFAULT_TRACK_IDS, normalizeTrackCatalog } from './assetPathRegistry'

export const TRACK_PROMPT_SOURCE_FILES = [
  {
    name: '短故事工业化骨架与赛道结构系统.md',
    path: '提示词/短故事工业化骨架与赛道结构系统.md',
    content: skeletonSystem,
  },
  {
    name: '赛道分析提示词模块.md',
    path: '提示词/赛道分析提示词模块.md',
    content: trackAnalysisModule,
  },
]

function stringifyPromptValue(value) {
  return JSON.stringify(value, null, 2)
}

function buildTrackRulePackageProtocol(availableTracksText) {
  return `

=== 当前赛道分析规则包补充要求 ===
primary_track 只能填写当前已有赛道之一或 UNKNOWN。
当前已有赛道：${availableTracksText}。
如果没有对应赛道，primary_track 必须填写 UNKNOWN，并在 reference_track.name 给出一个简短的 AI 参考赛道名，reference_track.reason 说明为什么不应归入已有赛道，reference_track.should_create 填 true。
无论上方提示词是否已经声明，track_analysis 都必须额外包含以下字段：
- reference_track: {name:string,reason:string,should_create:boolean}，没有新赛道建议时 name 为空字符串、should_create 为 false。
- track_positioning: string，赛道定位。
- reader_emotion_needs: string[]，读者情绪需求。
- core_gratification_points: string[]，核心爽点。
- core_pain_points: string[]，核心虐点。
- common_character_relations: string[]，常见人设关系。
- chapter_rhythm_skeleton: Array<{stage:string,function:string,key_hook:string}>，章节节奏骨架，至少覆盖开篇、推进、爆点、收束。
- taboo_zones: string[]，禁忌雷区。
- brainhole_variable_tags: string[]，适合生成脑洞的变量标签。
这些字段用于后续抽脑洞、立项和细纲复用；不要输出具体故事梗概。
=== 当前赛道分析规则包补充要求结束 ===`
}

function ensureTrackRulePackageProtocol(messages, availableTracksText) {
  const systemMessage = messages[0] || { role: 'system', content: '' }
  if (
    systemMessage.content.includes('reference_track') &&
    systemMessage.content.includes('track_positioning') &&
    systemMessage.content.includes(availableTracksText)
  ) {
    return messages
  }

  return [
    {
      ...systemMessage,
      content: `${systemMessage.content}${buildTrackRulePackageProtocol(availableTracksText)}`.trim(),
    },
    ...messages.slice(1),
  ]
}

export function buildTrackAnalysisPrompt(input = {}) {
  const { promptConfigs = null } = input
  const availableTracks = normalizeTrackCatalog(input.availableTracks || DEFAULT_TRACK_IDS)
  const availableTracksText = availableTracks.join(' / ')
  const prompt = buildMaterialPromptMessages(promptConfigs || [], 'story-dna-track-analysis', {
    trackPromptSource: skeletonSystem.trim(),
    trackAnalysisModuleSource: trackAnalysisModule.trim(),
    availableTracksText,
    titleJson: stringifyPromptValue(String(input.title || '').trim()),
    platformNoteJson: stringifyPromptValue(String(input.platformNote || '').trim()),
    textJson: stringifyPromptValue(String(input.text || '')),
  })

  const messages = ensureTrackRulePackageProtocol(prompt.messages, availableTracksText)

  return {
    temperature: prompt.config.temperature,
    promptSources: TRACK_PROMPT_SOURCE_FILES.map(file => file.path),
    systemPrompt: messages[0].content,
    userPrompt: messages[1].content,
    messages,
  }
}
