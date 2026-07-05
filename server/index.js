import express from 'express';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { DEFAULT_PROMPTS } from '../src/prompts.js';
import { db, getMeta, rowToFavorite, rowToProject, rowToPromptConfig, setMeta } from './db.js';

export const app = express();
const port = Number(process.env.API_PORT || process.env.PORT || 43128);
const host = process.env.API_HOST || '127.0.0.1';

app.use(express.json({ limit: '25mb' }));

function nowIso() {
  return new Date().toISOString();
}

function normalizeProjectInput(input = {}) {
  const now = nowIso();
  return {
    id: String(input.id || `project-${randomUUID()}`),
    name: String(input.name || '').trim() || `未命名项目 ${new Date().toLocaleString('zh-CN')}`,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    snapshot: input.snapshot || null,
  };
}

function normalizeFavoriteInput(input = {}) {
  const now = nowIso();
  const payload = input.payload && typeof input.payload === 'object' ? input.payload : null;
  return {
    id: String(input.id || `fav-${randomUUID()}`),
    type: String(input.type || 'brainhole'),
    title: String(input.title || '收藏').trim() || '收藏',
    content: String(input.content || '').trim(),
    note: String(input.note || ''),
    payload,
    projectId: String(input.projectId || ''),
    projectName: String(input.projectName || ''),
    createdAt: input.createdAt || now,
  };
}

function normalizePromptConfigInput(input = {}) {
  const defaultPrompt = DEFAULT_PROMPTS.find((prompt) => prompt.id === input.id);
  if (!defaultPrompt) return null;
  const temperature = Number(input.temperature ?? defaultPrompt.temperature ?? 0.85);

  return {
    ...defaultPrompt,
    systemPrompt: String(input.systemPrompt ?? defaultPrompt.systemPrompt ?? ''),
    userPrompt: String(input.userPrompt ?? defaultPrompt.userPrompt ?? ''),
    temperature: Number.isFinite(temperature) ? Math.min(2, Math.max(0, temperature)) : defaultPrompt.temperature,
    updatedAt: input.updatedAt || nowIso(),
  };
}

function listProjects() {
  return db
    .prepare('SELECT * FROM projects ORDER BY datetime(updated_at) DESC')
    .all()
    .map(rowToProject);
}

function listFavorites() {
  return db
    .prepare('SELECT * FROM favorites ORDER BY datetime(created_at) DESC')
    .all()
    .map(rowToFavorite);
}

function listPromptConfigs() {
  const rows = db
    .prepare('SELECT * FROM prompt_configs')
    .all()
    .map(rowToPromptConfig);

  return DEFAULT_PROMPTS.map((defaultPrompt) => {
    const savedPrompt = rows.find((row) => row.id === defaultPrompt.id) || {};
    const shouldUpgradeBrainholePrompt =
      defaultPrompt.id === 'brainhole' &&
      !savedPrompt.updatedAt &&
      savedPrompt.userPrompt !== undefined &&
      !String(savedPrompt.userPrompt || '').includes('"options"');

    return {
      ...defaultPrompt,
      ...(shouldUpgradeBrainholePrompt ? {} : savedPrompt),
      id: defaultPrompt.id,
      title: defaultPrompt.title,
      category: defaultPrompt.category,
      description: defaultPrompt.description,
      temperature: savedPrompt.temperature ?? defaultPrompt.temperature,
    };
  });
}

function hasStoredPromptConfigs() {
  return db.prepare('SELECT 1 FROM prompt_configs LIMIT 1').get() !== undefined;
}

function upsertProject(project) {
  db.prepare(`
    INSERT INTO projects (id, name, snapshot_json, created_at, updated_at)
    VALUES (@id, @name, @snapshotJson, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      snapshot_json = excluded.snapshot_json,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
  `).run({
    ...project,
    snapshotJson: JSON.stringify(project.snapshot),
  });
}

function upsertFavorite(favorite) {
  db.prepare(`
    INSERT INTO favorites (id, type, title, content, note, payload_json, project_id, project_name, created_at)
    VALUES (@id, @type, @title, @content, @note, @payloadJson, @projectId, @projectName, @createdAt)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      title = excluded.title,
      content = excluded.content,
      note = excluded.note,
      payload_json = excluded.payload_json,
      project_id = excluded.project_id,
      project_name = excluded.project_name,
      created_at = excluded.created_at
  `).run({
    ...favorite,
    payloadJson: favorite.payload ? JSON.stringify(favorite.payload) : null,
  });
}

function upsertPromptConfig(promptConfig) {
  db.prepare(`
    INSERT INTO prompt_configs (id, system_prompt, user_prompt, temperature, updated_at)
    VALUES (@id, @systemPrompt, @userPrompt, @temperature, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      system_prompt = excluded.system_prompt,
      user_prompt = excluded.user_prompt,
      temperature = excluded.temperature,
      updated_at = excluded.updated_at
  `).run(promptConfig);
}

function resetPromptConfigsToDefaults() {
  const reset = db.transaction(() => {
    db.prepare('DELETE FROM prompt_configs').run();
    DEFAULT_PROMPTS
      .map((prompt) => normalizePromptConfigInput({
        id: prompt.id,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        temperature: prompt.temperature,
        updatedAt: nowIso(),
      }))
      .filter(Boolean)
      .forEach(upsertPromptConfig);
  });

  reset();
}

function seedDefaultPromptConfigsIfMissing() {
  const seed = db.transaction(() => {
    for (const prompt of DEFAULT_PROMPTS) {
      const exists = db.prepare('SELECT 1 FROM prompt_configs WHERE id = ?').get(prompt.id);
      if (exists) continue;
      upsertPromptConfig(normalizePromptConfigInput({
        id: prompt.id,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        temperature: prompt.temperature,
        updatedAt: nowIso(),
      }));
    }
  });

  seed();
}

seedDefaultPromptConfigsIfMissing();

app.get('/api/health', (request, response) => {
  response.json({ ok: true });
});

app.get('/api/bootstrap', (request, response) => {
  const projects = listProjects();
  const activeProjectId = getMeta('activeProjectId', '');
  response.json({
    projects,
    favorites: listFavorites(),
    promptConfigs: listPromptConfigs(),
    hasStoredPromptConfigs: hasStoredPromptConfigs(),
    activeProjectId: projects.some((project) => project.id === activeProjectId) ? activeProjectId : '',
  });
});

app.post('/api/import-browser-data', (request, response) => {
  const projects = Array.isArray(request.body.projects) ? request.body.projects : [];
  const favorites = Array.isArray(request.body.favorites) ? request.body.favorites : [];
  const promptConfigs = Array.isArray(request.body.promptConfigs) ? request.body.promptConfigs : [];

  const importData = db.transaction(() => {
    projects.map(normalizeProjectInput).forEach(upsertProject);
    favorites
      .map(normalizeFavoriteInput)
      .filter((favorite) => favorite.content)
      .forEach(upsertFavorite);
    promptConfigs
      .map(normalizePromptConfigInput)
      .filter(Boolean)
      .forEach(upsertPromptConfig);
    setMeta('activeProjectId', request.body.activeProjectId || '');
  });

  importData();
  response.json({
    projects: listProjects(),
    favorites: listFavorites(),
    promptConfigs: listPromptConfigs(),
    hasStoredPromptConfigs: hasStoredPromptConfigs(),
    activeProjectId: getMeta('activeProjectId', ''),
  });
});

app.get('/api/prompt-configs', (request, response) => {
  response.json(listPromptConfigs());
});

app.patch('/api/prompt-configs/:id', (request, response) => {
  const defaultPrompt = DEFAULT_PROMPTS.find((prompt) => prompt.id === request.params.id);
  if (!defaultPrompt) {
    response.status(404).json({ error: 'Prompt config not found' });
    return;
  }

  const existing = db.prepare('SELECT * FROM prompt_configs WHERE id = ?').get(defaultPrompt.id);
  const promptConfig = normalizePromptConfigInput({
    id: defaultPrompt.id,
    systemPrompt: request.body.systemPrompt === undefined
      ? existing?.system_prompt ?? defaultPrompt.systemPrompt
      : request.body.systemPrompt,
    userPrompt: request.body.userPrompt === undefined
      ? existing?.user_prompt ?? defaultPrompt.userPrompt
      : request.body.userPrompt,
    temperature: request.body.temperature === undefined
      ? existing?.temperature ?? defaultPrompt.temperature
      : request.body.temperature,
    updatedAt: nowIso(),
  });

  upsertPromptConfig(promptConfig);
  response.json(listPromptConfigs().find((prompt) => prompt.id === defaultPrompt.id));
});

app.delete('/api/prompt-configs', (request, response) => {
  resetPromptConfigsToDefaults();
  response.json(listPromptConfigs());
});

app.post('/api/projects', (request, response) => {
  const project = normalizeProjectInput(request.body);
  upsertProject(project);
  setMeta('activeProjectId', project.id);
  response.status(201).json(rowToProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id)));
});

app.patch('/api/projects/:id', (request, response) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.id);
  if (!existing) {
    response.status(404).json({ error: 'Project not found' });
    return;
  }

  const project = {
    id: existing.id,
    name: request.body.name === undefined ? existing.name : String(request.body.name || '').trim() || existing.name,
    snapshot: request.body.snapshot === undefined ? JSON.parse(existing.snapshot_json || 'null') : request.body.snapshot,
    createdAt: existing.created_at,
    updatedAt: request.body.updatedAt || nowIso(),
  };
  upsertProject(project);
  response.json(rowToProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id)));
});

app.delete('/api/projects/:id', (request, response) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(request.params.id);
  if (getMeta('activeProjectId', '') === request.params.id) {
    setMeta('activeProjectId', listProjects()[0]?.id || '');
  }
  response.status(204).end();
});

app.put('/api/active-project', (request, response) => {
  const projectId = String(request.body.projectId || '');
  setMeta('activeProjectId', projectId);
  response.json({ activeProjectId: projectId });
});

app.post('/api/favorites', (request, response) => {
  const favorite = normalizeFavoriteInput(request.body);
  if (!favorite.content) {
    response.status(400).json({ error: 'Favorite content is required' });
    return;
  }
  upsertFavorite(favorite);
  response.status(201).json(rowToFavorite(db.prepare('SELECT * FROM favorites WHERE id = ?').get(favorite.id)));
});

app.patch('/api/favorites/:id', (request, response) => {
  const existing = db.prepare('SELECT * FROM favorites WHERE id = ?').get(request.params.id);
  if (!existing) {
    response.status(404).json({ error: 'Favorite not found' });
    return;
  }

  const currentPayload = existing.payload_json ? JSON.parse(existing.payload_json) : null;
  const favorite = normalizeFavoriteInput({
    id: existing.id,
    type: request.body.type === undefined ? existing.type : request.body.type,
    title: request.body.title === undefined ? existing.title : request.body.title,
    content: request.body.content === undefined ? existing.content : request.body.content,
    note: request.body.note === undefined ? existing.note : request.body.note,
    payload: request.body.payload === undefined ? currentPayload : request.body.payload,
    projectId: request.body.projectId === undefined ? existing.project_id : request.body.projectId,
    projectName: request.body.projectName === undefined ? existing.project_name : request.body.projectName,
    createdAt: existing.created_at,
  });

  if (!favorite.content) {
    response.status(400).json({ error: 'Favorite content is required' });
    return;
  }

  upsertFavorite(favorite);
  response.json(rowToFavorite(db.prepare('SELECT * FROM favorites WHERE id = ?').get(favorite.id)));
});

app.delete('/api/favorites/:id', (request, response) => {
  db.prepare('DELETE FROM favorites WHERE id = ?').run(request.params.id);
  response.status(204).end();
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = app.listen(port, host, () => {
    console.log(`Database API listening on http://${host}:${port}`);
  });

  server.on('error', (error) => {
    console.error('Database API failed to start:', error);
    process.exitCode = 1;
  });
}
