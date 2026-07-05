export const PROMPT_CONFIG_STORAGE = 'brainhole_prompt_configs';
export const WIND_VANE_FILE_STORAGE = 'brainhole_wind_vane_file';
export const PROJECTS_STORAGE = 'brainhole_projects';
export const ACTIVE_PROJECT_STORAGE = 'brainhole_active_project_id';
export const FAVORITES_STORAGE = 'brainhole_favorites';
export const SIDEBAR_STATE_STORAGE = 'brainhole_sidebar_state';
export const PROJECT_SORT_STORAGE = 'brainhole_project_sort';
export const THEME_STORAGE = 'brainhole_theme';

export const QUICK_STYLES = ['古龙风', '言情甜宠', '严肃文学', '悬疑冷峻', '轻快搞笑', '细腻文艺'];

export const FAVORITE_TABS = [
  { value: 'brainhole', label: '脑洞' },
  { value: 'plot', label: '剧情点' },
  { value: 'option', label: '选项' },
];

export const BRAINHOLE_SCORE_LABELS = {
  freshness: '新鲜度',
  alignment: '契合度',
  payoff: '爽点/虐点',
  writability: '可写性',
};

export const ICONS = {
  brain: [
    'M12 5a3 3 0 0 0-5.76-1.15A3.5 3.5 0 0 0 2 7.25c0 1.12.52 2.12 1.34 2.76A3.5 3.5 0 0 0 2 12.75a3.5 3.5 0 0 0 3.5 3.5H6a3 3 0 0 0 6 0V5Z',
    'M12 5a3 3 0 0 1 5.76-1.15A3.5 3.5 0 0 1 22 7.25c0 1.12-.52 2.12-1.34 2.76A3.5 3.5 0 0 1 22 12.75a3.5 3.5 0 0 1-3.5 3.5H18a3 3 0 0 1-6 0V5Z',
    'M8.5 8.5a2 2 0 0 0 2-2',
    'M15.5 8.5a2 2 0 0 1-2-2',
    'M8.5 14a2.5 2.5 0 0 1 0-5',
    'M15.5 14a2.5 2.5 0 0 0 0-5',
  ],
  lightbulb: [
    'M15 14c.2-1.3.83-2.07 1.53-2.95A6 6 0 1 0 7.47 11.05C8.17 11.93 8.8 12.7 9 14',
    'M9 18h6',
    'M10 22h4',
    'M10 14h4',
  ],
  scroll: [
    'M8 21h10a2 2 0 0 0 2-2V7a4 4 0 0 0-4-4H6a2 2 0 0 0-2 2v11a3 3 0 0 0 3 3h1',
    'M8 21a3 3 0 0 1 0-6h10',
    'M9 7h6',
    'M9 11h7',
  ],
  bookOpen: [
    'M12 7v14',
    'M3 5.5A2.5 2.5 0 0 1 5.5 3H12v18H5.5A2.5 2.5 0 0 1 3 18.5v-13Z',
    'M21 5.5A2.5 2.5 0 0 0 18.5 3H12v18h6.5A2.5 2.5 0 0 0 21 18.5v-13Z',
  ],
  fileText: [
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z',
    'M14 2v6h6',
    'M16 13H8',
    'M16 17H8',
    'M10 9H8',
  ],
  settings: [
    'M12 3v2',
    'M12 19v2',
    'M3 12h2',
    'M19 12h2',
    'M5.64 5.64l1.41 1.41',
    'M16.95 16.95l1.41 1.41',
    'M5.64 18.36l1.41-1.41',
    'M16.95 7.05l1.41-1.41',
    'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8Z',
  ],
};
