export const PERSONA_OPTIONS = [
  { name: '老大·老学究', tags: '理性、长远、固化' },
  { name: '老二·海王', tags: '不择手段、热烈、占有欲' },
  { name: '老三·侦探', tags: '细节、逻辑、洞察' },
  { name: '老四·倔骡子', tags: '软弱、蠢、倔' },
  { name: '老五·金主爸爸', tags: '资源、钱、权力' },
  { name: '老六·老六', tags: '反套路、智商在线、乐子人' },
  { name: '老七·刺头', tags: '绝不受欺负、当场还击' },
  { name: '老八·猎手', tags: '隐忍、时机、一击致命' },
];

export const ACTOR_ROLE_OPTIONS = [
  '主角',
  '对手',
  '伤害者',
  '作恶推动者',
  '伙伴',
  '信使',
  '见证者',
  '规则代表',
];

export const ARCHITECTURE_FIELD_GROUPS = [
  {
    id: 'story-core',
    title: '故事起点',
    fields: [
      ['storySummary', '故事起点', '用 2 到 4 句话说清主角、眼前困境、想达成的目标，以及故事会往哪场对抗逼近。'],
      ['coreConflict', '核心冲突', '写清主角要赢必须打破谁的利益、关系或谎言。后续每章都要围着这条冲突推进。'],
    ],
  },
  {
    id: 'chapter-blueprint',
    title: '章节执行蓝图',
    fields: [
      ['chapterPlan', '10章事件链', '逐章写明第1章到第10章各自的事件、阻碍、局势变化和章尾新问题。'],
      ['frontFourPlan', '前四章执行蓝图', '把第1到第4章拆成当前 app 真正要执行的路线：每章 4 个剧情点各负责什么、章尾钩子怎么落、如何接入第5章。'],
    ],
  },
  {
    id: 'payoff-beats',
    title: '付费点与反转',
    fields: [
      ['globalPayHook', '第4章末付费点', '固定写第4章末卡住什么局势、真相或选择，并说明为什么读者必须继续看。'],
      ['payoffAfterPay', '付费后立即回报', '写清第4章后半或第5章开头立刻给到的动作回报，不能只继续拖谜底。'],
      ['globalTwist', '后段大反转', '默认放在第8章或第9章，写清哪条真相或局势会被彻底翻过来。'],
      ['twistSetup', '反转铺垫', '列出前四章先埋什么异常，第5到第7章再如何放大误导，让后段反转成立。'],
    ],
  },
];
