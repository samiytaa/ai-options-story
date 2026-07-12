export const TRACK_SAMPLE_PATHS = {
  sample: '02_样文与拆解/01_赛道样文/[track_id]/[story_slug].md',
  analysis: '02_样文与拆解/02_赛道分析/[track_id]/[story_slug].track.json',
  structureCard: '02_样文与拆解/03_赛道结构卡/[track_id].md',
  pending: '02_样文与拆解/09_待分拣样文/[story_slug].md',
}

export const DEFAULT_TRACK_IDS = [
  '01_追妻文',
  '02_世情爽文',
  '03_沙雕脑洞',
  '04_四清正名文',
  '05_无限流与规则怪谈',
  '06_真实故事',
  '07_男频热血与历史反转',
  '08_番茄爆款案例',
]

export const PENDING_TRACK_ID = '09_待分拣样文'
export const UNKNOWN_TRACK_ID = 'UNKNOWN'

export const KNOWN_TRACK_IDS = DEFAULT_TRACK_IDS

export const LEVEL_META = {
  L1: { title: 'L1 高频原料', desc: '生成与改稿优先调用', className: 'l1' },
  L2: { title: 'L2 结构机制', desc: '情节组织与角色资产', className: 'l2' },
  L3: { title: 'L3 深度参考', desc: '完整模式的风格与主题沉淀', className: 'l3' },
}

export const ASSET_DISPLAY_ORDER = [
  'variable_library',
  'rhythm_template',
  'emotional_anchor',
  'suspense_template',
  'gratification_formula',
  'intro_template',
  'opening_template',
  'asset_relationship_network',
  'agency_curve',
  'character_highlight',
  'high_octane_scene',
  'conflict_escalation_formula',
  'structural_technique',
  'structural_skeleton',
  'world_setting',
  'character_profile',
  'chapter_outline',
  'character_arc_framework',
  'language_dna',
  'theme_template',
]

export const ASSET_PATH_REGISTRY = {
  variable_library: { level: 'L1', name: '变量库', folder: '01_变量库', icon: '🎯',
    desc: '选题变量与红线约束', modules: 'I, C', path: '04_DNA资产库/01_L1高频原料/01_变量库/[track_id]/' },
  rhythm_template: { level: 'L1', name: '节奏模板', folder: '02_节奏模板库', icon: '📈',
    desc: '节奏、字数与情绪节点', modules: 'C, D, F', path: '04_DNA资产库/01_L1高频原料/02_节奏模板库/[track_id]/' },
  emotional_anchor: { level: 'L1', name: '情感锚点', folder: '03_情感锚点库', icon: '💗',
    desc: '情绪渲染与强度诊断', modules: 'D, F', path: '04_DNA资产库/01_L1高频原料/03_情感锚点库/[track_id]/' },
  suspense_template: { level: 'L1', name: '悬念模板', folder: '04_悬念模板库', icon: '❓',
    desc: '信息差与悬念诊断', modules: 'C, F', path: '04_DNA资产库/01_L1高频原料/04_悬念模板库/[track_id]/' },
  gratification_formula: { level: 'L1', name: '爽点配方', folder: '05_爽点配方库', icon: '⚡',
    desc: '爽点规划与微创新', modules: 'C, I, F', path: '04_DNA资产库/01_L1高频原料/05_爽点配方库/[track_id]/' },
  intro_template: { level: 'L1', name: '导语拆解', folder: '06_导语拆解库', icon: '📝',
    desc: '导语和开局钩子', modules: 'C, D', path: '04_DNA资产库/01_L1高频原料/06_导语拆解库/[track_id]/' },
  opening_template: { level: 'L1', name: '开篇拆解', folder: '07_开篇拆解库', icon: '🚪',
    desc: '开篇钩子公式', modules: 'C, D', path: '04_DNA资产库/01_L1高频原料/07_开篇拆解库/[track_id]/' },
  asset_relationship_network: { level: 'L2', name: '资产关系网络', folder: '08_资产关系网络', icon: '🔗',
    desc: '资产联动与推荐', modules: 'M, I', path: '04_DNA资产库/02_L2结构机制/08_资产关系网络/[track_id]/' },
  agency_curve: { level: 'L2', name: '行动力曲线', folder: '09_行动力曲线库', icon: '🏃',
    desc: '主动性规划与诊断', modules: 'C, F', path: '04_DNA资产库/02_L2结构机制/09_行动力曲线库/[track_id]/' },
  character_highlight: { level: 'L2', name: '人物高光时刻', folder: '10_人物高光库', icon: '🌟',
    desc: '高光与高潮场景构建', modules: 'D', path: '04_DNA资产库/02_L2结构机制/10_人物高光库/[track_id]/' },
  high_octane_scene: { level: 'L2', name: '高燃场面', folder: '11_高燃场面库', icon: '🔥',
    desc: '打脸/复仇/反转/情感爆发', modules: 'D', path: '04_DNA资产库/02_L2结构机制/11_高燃场面库/[track_id]/' },
  conflict_escalation_formula: { level: 'L2', name: '冲突升级公式', folder: '12_冲突升级库', icon: '📊',
    desc: '冲突阶梯与情节组织', modules: 'C, F', path: '04_DNA资产库/02_L2结构机制/12_冲突升级库/[track_id]/' },
  structural_technique: { level: 'L2', name: '结构技法', folder: '13_结构技法库', icon: '🔧',
    desc: '情节组织手法', modules: 'C', path: '04_DNA资产库/02_L2结构机制/13_结构技法库/[track_id]/' },
  structural_skeleton: { level: 'L2', name: '结构骨架', folder: '14_结构骨架库', icon: '🏗️',
    desc: '宏观结构与章节拆解', modules: 'C, D', path: '04_DNA资产库/02_L2结构机制/14_结构骨架库/[track_id]/' },
  world_setting: { level: 'L2', name: '世界观设定', folder: '15_世界观设定库', icon: '🌍',
    desc: '世界观一致性', modules: 'B, C, D', path: '04_DNA资产库/02_L2结构机制/15_世界观设定库/[track_id]/' },
  character_profile: { level: 'L2', name: '人物小传', folder: '16_人物小传库', icon: '👤',
    desc: '人物设定', modules: 'B, D, E', path: '04_DNA资产库/02_L2结构机制/16_人物小传库/[track_id]/' },
  chapter_outline: { level: 'L2', name: '逐章大纲', folder: '17_逐章大纲库', icon: '📋',
    desc: '章节拆解', modules: 'C, D', path: '04_DNA资产库/02_L2结构机制/17_逐章大纲库/[track_id]/' },
  character_arc_framework: { level: 'L3', name: '人物弧光框架', folder: '18_人物弧光库', icon: '🎭',
    desc: '人物成长规划', modules: 'B', path: '04_DNA资产库/03_L3深度参考/18_人物弧光库/[track_id]/' },
  language_dna: { level: 'L3', name: '语言DNA摘要', folder: '19_语言DNA库', icon: '💬',
    desc: '风格指纹', modules: 'E, D', path: '04_DNA资产库/03_L3深度参考/19_语言DNA库/[track_id]/' },
  theme_template: { level: 'L3', name: '核心思想/主题', folder: '20_主题拆解库', icon: '💡',
    desc: '主题拆解', modules: 'B, D, E', path: '04_DNA资产库/03_L3深度参考/20_主题拆解库/[track_id]/' },
}

export function sanitizePathPart(value, fallback = 'UNKNOWN') {
  const sanitized = String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|()（）\s]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return sanitized || fallback
}

export function normalizeTrackId(track) {
  return sanitizePathPart(track, 'UNKNOWN')
}

export function isKnownTrackId(track) {
  return DEFAULT_TRACK_IDS.includes(normalizeTrackId(track))
}

export function normalizeTrackCatalog(tracks = []) {
  const normalized = tracks
    .map(track => normalizeTrackId(track))
    .filter(track => track && track !== UNKNOWN_TRACK_ID && track !== PENDING_TRACK_ID)

  return Array.from(new Set([...DEFAULT_TRACK_IDS, ...normalized]))
}

export function resolveTrackPath(kind, { track = 'UNKNOWN', story = '未命名故事' } = {}) {
  const template = TRACK_SAMPLE_PATHS[kind] || TRACK_SAMPLE_PATHS.analysis
  return template
    .replaceAll('[track_id]', normalizeTrackId(track))
    .replaceAll('[story_slug]', sanitizePathPart(story, '未命名故事'))
}

export function resolveAssetPath(assetType, { track = 'UNKNOWN' } = {}) {
  const entry = ASSET_PATH_REGISTRY[assetType]
  if (!entry) return ''
  return entry.path.replaceAll('[track_id]', normalizeTrackId(track))
}

export function makeAssetFilename(assetType, { track = 'UNKNOWN', story = '未命名故事', index = 1 } = {}) {
  const entry = ASSET_PATH_REGISTRY[assetType]
  const prefix = entry?.name || assetType || '资产'
  const safeTrack = normalizeTrackId(track)
  const safeStory = sanitizePathPart(story, '未命名故事')
  const serial = String(index).padStart(2, '0')

  if (assetType === 'asset_relationship_network') {
    return sanitizePathPart(`资产关系网络_${safeStory}`, '资产关系网络') + '.json'
  }

  return sanitizePathPart(`${prefix}_${safeTrack}_${safeStory}_${serial}`, 'DNA资产') + '.md'
}

export function getOrderedAssetEntries() {
  return ASSET_DISPLAY_ORDER
    .filter(type => ASSET_PATH_REGISTRY[type])
    .map((type, index) => [type, { ...ASSET_PATH_REGISTRY[type], displayIndex: index + 1 }])
}
