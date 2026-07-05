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
`);

const favoriteColumns = db.prepare('PRAGMA table_info(favorites)').all().map((column) => column.name);
if (!favoriteColumns.includes('payload_json')) {
  db.prepare('ALTER TABLE favorites ADD COLUMN payload_json TEXT').run();
}

const promptConfigColumns = db.prepare('PRAGMA table_info(prompt_configs)').all().map((column) => column.name);
if (!promptConfigColumns.includes('temperature')) {
  db.prepare('ALTER TABLE prompt_configs ADD COLUMN temperature REAL NOT NULL DEFAULT 0.85').run();
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
