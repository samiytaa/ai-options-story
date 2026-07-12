import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const databasePath = join(process.cwd(), 'data', 'brainhole.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    snapshot_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    payload_json TEXT,
    project_id TEXT NOT NULL DEFAULT '',
    project_name TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS prompt_configs (
    id TEXT PRIMARY KEY,
    system_prompt TEXT NOT NULL DEFAULT '',
    user_prompt TEXT NOT NULL DEFAULT '',
    temperature REAL NOT NULL DEFAULT 0.85,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS material_prompt_configs (
    id TEXT PRIMARY KEY,
    system_prompt TEXT NOT NULL DEFAULT '',
    user_prompt TEXT NOT NULL DEFAULT '',
    temperature REAL NOT NULL DEFAULT 0.2,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS material_extractions (
    project_id TEXT PRIMARY KEY,
    source_title TEXT NOT NULL DEFAULT '',
    source_text TEXT NOT NULL DEFAULT '',
    track_analysis_json TEXT,
    confirmed_track TEXT NOT NULL DEFAULT '',
    analysis_results_json TEXT NOT NULL DEFAULT '{}',
    extraction_summary_json TEXT,
    total_assets INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS material_operation_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    source_title TEXT NOT NULL DEFAULT '',
    payload_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS material_tracks (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS material_examples (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT '',
    source_note TEXT NOT NULL DEFAULT '',
    tags_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS material_example_links (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    example_id TEXT NOT NULL,
    link_type TEXT NOT NULL,
    target_id TEXT NOT NULL DEFAULT '',
    target_type TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    payload_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (example_id) REFERENCES material_examples(id) ON DELETE CASCADE
  );
`);

const favoriteColumns = db.prepare('PRAGMA table_info(favorites)').all().map((column) => column.name);
if (!favoriteColumns.includes('payload_json')) {
  db.prepare('ALTER TABLE favorites ADD COLUMN payload_json TEXT').run();
}

const promptConfigColumns = db.prepare('PRAGMA table_info(prompt_configs)').all().map((column) => column.name);
if (!promptConfigColumns.includes('temperature')) {
  db.prepare('ALTER TABLE prompt_configs ADD COLUMN temperature REAL NOT NULL DEFAULT 0.85').run();
}

const materialPromptConfigColumns = db.prepare('PRAGMA table_info(material_prompt_configs)').all().map((column) => column.name);
if (!materialPromptConfigColumns.includes('temperature')) {
  db.prepare('ALTER TABLE material_prompt_configs ADD COLUMN temperature REAL NOT NULL DEFAULT 0.2').run();
}

const materialExtractionColumns = db.prepare('PRAGMA table_info(material_extractions)').all().map((column) => column.name);
if (!materialExtractionColumns.includes('track_analysis_json')) {
  db.prepare('ALTER TABLE material_extractions ADD COLUMN track_analysis_json TEXT').run();
}
if (!materialExtractionColumns.includes('confirmed_track')) {
  db.prepare("ALTER TABLE material_extractions ADD COLUMN confirmed_track TEXT NOT NULL DEFAULT ''").run();
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function rowToProject(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    snapshot: parseJson(row.snapshot_json),
  };
}

export function rowToFavorite(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    note: row.note,
    payload: parseJson(row.payload_json, null),
    projectId: row.project_id,
    projectName: row.project_name,
    createdAt: row.created_at,
  };
}

export function rowToPromptConfig(row) {
  return {
    id: row.id,
    systemPrompt: row.system_prompt,
    userPrompt: row.user_prompt,
    temperature: row.temperature,
    updatedAt: row.updated_at,
  };
}

export function rowToMaterialPromptConfig(row) {
  return {
    id: row.id,
    systemPrompt: row.system_prompt,
    userPrompt: row.user_prompt,
    temperature: row.temperature,
    updatedAt: row.updated_at,
  };
}

export function rowToMaterialExtraction(row) {
  return {
    projectId: row.project_id,
    sourceTitle: row.source_title,
    sourceText: row.source_text,
    trackAnalysis: parseJson(row.track_analysis_json, null),
    confirmedTrack: row.confirmed_track || '',
    analysisResults: parseJson(row.analysis_results_json, {}),
    extractionSummary: parseJson(row.extraction_summary_json, null),
    totalAssets: row.total_assets,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToMaterialOperationLog(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    actionType: row.action_type,
    title: row.title,
    detail: row.detail,
    sourceTitle: row.source_title,
    payload: parseJson(row.payload_json, null),
    createdAt: row.created_at,
  };
}

export function rowToMaterialTrack(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDefault: Boolean(row.is_default),
    usageCount: Number(row.usage_count || 0),
    inUse: Number(row.usage_count || 0) > 0,
    canRename: !row.is_default,
    canDelete: !row.is_default && Number(row.usage_count || 0) === 0,
  };
}

export function rowToMaterialExample(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    content: row.content,
    author: row.author || '',
    sourceNote: row.source_note || '',
    tags: parseJson(row.tags_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToMaterialExampleLink(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    exampleId: row.example_id,
    linkType: row.link_type,
    targetId: row.target_id || '',
    targetType: row.target_type || '',
    title: row.title || '',
    payload: parseJson(row.payload_json, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getMeta(key, fallback = '') {
  return db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key)?.value || fallback;
}

export function setMeta(key, value) {
  db.prepare(`
    INSERT INTO app_meta (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value || ''));
}
