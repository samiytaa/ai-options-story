import express from 'express';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { DEFAULT_PROMPTS } from '../src/prompts.js';
import { DEFAULT_MATERIAL_PROMPTS } from '../src/features/materialExtractor/materialPromptDefinitions.js';
import { DEFAULT_TRACK_IDS, normalizeTrackCatalog, normalizeTrackId } from '../src/features/materialExtractor/assetPathRegistry.js';
import { normalizeArchitecturePlan } from '../src/features/architectureSetup/architectureState.js';
import {
  db,
  getMeta,
  rowToFavorite,
  rowToMaterialExample,
  rowToMaterialExampleLink,
  rowToMaterialExtraction,
  rowToMaterialOperationLog,
  rowToMaterialPromptConfig,
  rowToMaterialTrack,
  rowToProject,
  rowToPromptConfig,
  setMeta,
} from './db.js';

export const app = express();
const port = Number(process.env.API_PORT || process.env.PORT || 43128);
const host = process.env.API_HOST || '127.0.0.1';

app.use(express.json({ limit: '25mb' }));

function nowIso() {
  return new Date().toISOString();
}

function normalizeProjectSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const normalizedState = snapshot.state && typeof snapshot.state === 'object'
    ? {
      ...snapshot.state,
      architecturePlan: normalizeArchitecturePlan(snapshot.state.architecturePlan || {}),
    }
    : undefined;

  return {
    ...snapshot,
    ...(normalizedState ? { state: normalizedState } : {}),
  };
}

function normalizeProjectInput(input = {}) {
  const now = nowIso();
  return {
    id: String(input.id || `project-${randomUUID()}`),
    name: String(input.name || '').trim() || `未命名项目 ${new Date().toLocaleString('zh-CN')}`,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    snapshot: normalizeProjectSnapshot(input.snapshot),
  };
}

function migrateProjectSnapshots() {
  const rows = db.prepare('SELECT id, snapshot_json FROM projects').all();
  const updateSnapshot = db.prepare('UPDATE projects SET snapshot_json = ? WHERE id = ?');

  const migrate = db.transaction(() => {
    rows.forEach((row) => {
      if (!row.snapshot_json) return;

      let parsedSnapshot = null;
      try {
        parsedSnapshot = JSON.parse(row.snapshot_json);
      } catch {
        return;
      }

      const normalizedSnapshot = normalizeProjectSnapshot(parsedSnapshot);
      const nextSnapshotJson = normalizedSnapshot ? JSON.stringify(normalizedSnapshot) : null;
      if (nextSnapshotJson !== row.snapshot_json) {
        updateSnapshot.run(nextSnapshotJson, row.id);
      }
    });
  });

  migrate();
}

function summarizeFavoritePayload(type, payload = null) {
  if (!payload || typeof payload !== 'object') {
    return { content: '', note: '' };
  }

  if (type === 'brainhole') {
    return {
      content: String(payload.idea || '').trim(),
      note: String(payload.fit || '').trim(),
    };
  }

  if (type === 'plot') {
    const chosenOption = Array.isArray(payload.options)
      ? payload.options[payload.chosenOption]
      : null;
    const chosenText = chosenOption
      ? `选项：${chosenOption.option || ''}\n结果：${chosenOption.result || ''}`.trim()
      : '';
    return {
      content: String(payload.desc || '').trim(),
      note: chosenText,
    };
  }

  if (type === 'option') {
    return {
      content: String(payload.text || payload.choice?.option || payload.choice?.hook || '').trim(),
      note: String(payload.choice?.result || payload.choice?.direction || '').trim(),
    };
  }

  return {
    content: String(payload.content || '').trim(),
    note: String(payload.note || '').trim(),
  };
}

function normalizeFavoriteInput(input = {}) {
  const now = nowIso();
  const allowedTypes = new Set(['brainhole', 'plot', 'option']);
  const type = allowedTypes.has(input.type) ? input.type : 'brainhole';
  const payload = input.payload && typeof input.payload === 'object' ? input.payload : null;
  const payloadSummary = summarizeFavoritePayload(type, payload);
  return {
    id: String(input.id || `fav-${randomUUID()}`),
    type,
    title: String(input.title || '收藏').trim() || '收藏',
    content: String(input.content || payloadSummary.content || '').trim(),
    note: String(input.note ?? payloadSummary.note ?? ''),
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

function normalizeMaterialPromptConfigInput(input = {}) {
  const defaultPrompt = DEFAULT_MATERIAL_PROMPTS.find((prompt) => prompt.id === input.id);
  if (!defaultPrompt) return null;
  const temperature = Number(input.temperature ?? defaultPrompt.temperature ?? 0.2);

  return {
    ...defaultPrompt,
    systemPrompt: String(input.systemPrompt ?? defaultPrompt.systemPrompt ?? ''),
    userPrompt: String(input.userPrompt ?? defaultPrompt.userPrompt ?? ''),
    temperature: Number.isFinite(temperature) ? Math.min(2, Math.max(0, temperature)) : defaultPrompt.temperature,
    updatedAt: input.updatedAt || nowIso(),
  };
}

function normalizeMaterialExtractionInput(projectId, input = {}, existing = null) {
  const now = nowIso();
  const analysisResults = input.analysisResults && typeof input.analysisResults === 'object'
    ? input.analysisResults
    : {};
  const trackAnalysis = input.trackAnalysis && typeof input.trackAnalysis === 'object'
    ? input.trackAnalysis
    : null;
  const extractionSummary = input.extractionSummary && typeof input.extractionSummary === 'object'
    ? input.extractionSummary
    : null;
  const totalAssets = Number(input.totalAssets);

  return {
    projectId,
    sourceTitle: String(input.sourceTitle || '').trim(),
    sourceText: String(input.sourceText || ''),
    trackAnalysis,
    confirmedTrack: String(input.confirmedTrack || '').trim(),
    analysisResults,
    extractionSummary,
    totalAssets: Number.isFinite(totalAssets)
      ? Math.max(0, Math.trunc(totalAssets))
      : Object.values(analysisResults).reduce((sum, records) => sum + (Array.isArray(records) ? records.length : 0), 0),
    createdAt: existing?.created_at || now,
    updatedAt: input.updatedAt || now,
  };
}

function normalizeMaterialOperationLogInput(projectId, input = {}) {
  const now = nowIso();
  return {
    id: String(input.id || `material-log-${randomUUID()}`),
    projectId,
    actionType: String(input.actionType || 'unknown').trim() || 'unknown',
    title: String(input.title || '未命名操作').trim() || '未命名操作',
    detail: String(input.detail || ''),
    sourceTitle: String(input.sourceTitle || '').trim(),
    payload: input.payload && typeof input.payload === 'object' ? input.payload : null,
    createdAt: input.createdAt || now,
  };
}

function normalizeMaterialTrackInput(input = {}) {
  const now = nowIso();
  const id = normalizeTrackId(input.id || input.trackId || '');
  if (!id) return null;

  return {
    id,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function normalizeMaterialExampleInput(projectId, input = {}, existing = null) {
  const now = nowIso();
  return {
    id: String(input.id || existing?.id || `material-example-${randomUUID()}`),
    projectId,
    title: String(input.title || '').trim(),
    content: String(input.content || ''),
    author: String(input.author || '').trim(),
    sourceNote: String(input.sourceNote || '').trim(),
    tags: normalizeStringArray(input.tags),
    createdAt: existing?.created_at || input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

function normalizeMaterialExampleLinkInput(projectId, exampleId, input = {}, existing = null) {
  const now = nowIso();
  return {
    id: String(input.id || existing?.id || `material-example-link-${randomUUID()}`),
    projectId,
    exampleId,
    linkType: String(input.linkType || existing?.link_type || '').trim(),
    targetId: String(input.targetId || '').trim(),
    targetType: String(input.targetType || '').trim(),
    title: String(input.title || '').trim(),
    payload: input.payload && typeof input.payload === 'object' ? input.payload : null,
    createdAt: existing?.created_at || input.createdAt || now,
    updatedAt: input.updatedAt || now,
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

function listMaterialPromptConfigs() {
  const rows = db
    .prepare('SELECT * FROM material_prompt_configs')
    .all()
    .map(rowToMaterialPromptConfig);

  return DEFAULT_MATERIAL_PROMPTS.map((defaultPrompt) => {
    const savedPrompt = rows.find((row) => row.id === defaultPrompt.id) || {};
    return {
      ...defaultPrompt,
      ...savedPrompt,
      id: defaultPrompt.id,
      title: defaultPrompt.title,
      category: defaultPrompt.category,
      description: defaultPrompt.description,
      temperature: savedPrompt.temperature ?? defaultPrompt.temperature,
    };
  });
}

function listMaterialOperationLogs(projectId) {
  return db
    .prepare('SELECT * FROM material_operation_logs WHERE project_id = ? ORDER BY datetime(created_at) DESC, rowid DESC LIMIT 200')
    .all(projectId)
    .map(rowToMaterialOperationLog);
}

function listMaterialTracks() {
  const usageMap = new Map();
  db.prepare('SELECT confirmed_track, COUNT(*) as usage_count FROM material_extractions WHERE confirmed_track != ? GROUP BY confirmed_track')
    .all('')
    .forEach((row) => {
      usageMap.set(String(row.confirmed_track || '').trim(), Number(row.usage_count || 0));
    });

  return db
    .prepare('SELECT * FROM material_tracks ORDER BY datetime(created_at) ASC, id ASC')
    .all()
    .map((row) => rowToMaterialTrack({
      ...row,
      is_default: DEFAULT_TRACK_IDS.includes(row.id) ? 1 : 0,
      usage_count: usageMap.get(row.id) || 0,
    }));
}

function listMaterialExamples(projectId) {
  return db
    .prepare('SELECT * FROM material_examples WHERE project_id = ? ORDER BY datetime(updated_at) DESC, rowid DESC')
    .all(projectId)
    .map(rowToMaterialExample);
}

function listMaterialExampleLinks(projectId, exampleId) {
  return db
    .prepare('SELECT * FROM material_example_links WHERE project_id = ? AND example_id = ? ORDER BY datetime(updated_at) DESC, rowid DESC')
    .all(projectId, exampleId)
    .map(rowToMaterialExampleLink);
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

function upsertMaterialPromptConfig(promptConfig) {
  db.prepare(`
    INSERT INTO material_prompt_configs (id, system_prompt, user_prompt, temperature, updated_at)
    VALUES (@id, @systemPrompt, @userPrompt, @temperature, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      system_prompt = excluded.system_prompt,
      user_prompt = excluded.user_prompt,
      temperature = excluded.temperature,
      updated_at = excluded.updated_at
  `).run(promptConfig);
}

function upsertMaterialExtraction(extraction) {
  db.prepare(`
    INSERT INTO material_extractions (
      project_id,
      source_title,
      source_text,
      track_analysis_json,
      confirmed_track,
      analysis_results_json,
      extraction_summary_json,
      total_assets,
      created_at,
      updated_at
    )
    VALUES (
      @projectId,
      @sourceTitle,
      @sourceText,
      @trackAnalysisJson,
      @confirmedTrack,
      @analysisResultsJson,
      @extractionSummaryJson,
      @totalAssets,
      @createdAt,
      @updatedAt
    )
    ON CONFLICT(project_id) DO UPDATE SET
      source_title = excluded.source_title,
      source_text = excluded.source_text,
      track_analysis_json = excluded.track_analysis_json,
      confirmed_track = excluded.confirmed_track,
      analysis_results_json = excluded.analysis_results_json,
      extraction_summary_json = excluded.extraction_summary_json,
      total_assets = excluded.total_assets,
      updated_at = excluded.updated_at
  `).run({
    ...extraction,
    trackAnalysisJson: extraction.trackAnalysis ? JSON.stringify(extraction.trackAnalysis) : null,
    analysisResultsJson: JSON.stringify(extraction.analysisResults || {}),
    extractionSummaryJson: extraction.extractionSummary ? JSON.stringify(extraction.extractionSummary) : null,
  });
}

function insertMaterialOperationLog(log) {
  db.prepare(`
    INSERT INTO material_operation_logs (id, project_id, action_type, title, detail, source_title, payload_json, created_at)
    VALUES (@id, @projectId, @actionType, @title, @detail, @sourceTitle, @payloadJson, @createdAt)
  `).run({
    ...log,
    payloadJson: log.payload ? JSON.stringify(log.payload) : null,
  });
}

function upsertMaterialTrack(track) {
  db.prepare(`
    INSERT INTO material_tracks (id, created_at, updated_at)
    VALUES (@id, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      updated_at = excluded.updated_at
  `).run(track);
}

function replaceTrackReferencePayload(value, previousTrackId, nextTrackId) {
  if (Array.isArray(value)) {
    let changed = false;
    const nextValue = value.map((item) => {
      const replaced = replaceTrackReferencePayload(item, previousTrackId, nextTrackId);
      if (replaced !== item) changed = true;
      return replaced;
    });
    return changed ? nextValue : value;
  }

  if (!value || typeof value !== 'object') {
    return value === previousTrackId ? nextTrackId : value;
  }

  let changed = false;
  const nextEntries = Object.entries(value).map(([key, entryValue]) => {
    if (['reason', 'interpretation', 'title', 'detail', 'quote', 'content', 'sourceTitle'].includes(key)) {
      return [key, entryValue];
    }
    const replaced = replaceTrackReferencePayload(entryValue, previousTrackId, nextTrackId);
    if (replaced !== entryValue) changed = true;
    return [key, replaced];
  });

  return changed ? Object.fromEntries(nextEntries) : value;
}

function renameMaterialTrackReferences(previousTrackId, nextTrackId) {
  const extractions = db.prepare('SELECT * FROM material_extractions').all();
  const updateExtraction = db.prepare(`
    UPDATE material_extractions
    SET track_analysis_json = ?, confirmed_track = ?, analysis_results_json = ?, extraction_summary_json = ?, updated_at = ?
    WHERE project_id = ?
  `);

  extractions.forEach((row) => {
    const trackAnalysis = replaceTrackReferencePayload(row.track_analysis_json ? JSON.parse(row.track_analysis_json) : null, previousTrackId, nextTrackId);
    const analysisResults = replaceTrackReferencePayload(row.analysis_results_json ? JSON.parse(row.analysis_results_json) : {}, previousTrackId, nextTrackId);
    const extractionSummary = replaceTrackReferencePayload(row.extraction_summary_json ? JSON.parse(row.extraction_summary_json) : null, previousTrackId, nextTrackId);
    const confirmedTrack = String(row.confirmed_track || '').trim() === previousTrackId ? nextTrackId : row.confirmed_track;

    updateExtraction.run(
      trackAnalysis ? JSON.stringify(trackAnalysis) : null,
      confirmedTrack,
      JSON.stringify(analysisResults || {}),
      extractionSummary ? JSON.stringify(extractionSummary) : null,
      nowIso(),
      row.project_id,
    );
  });

  const examples = db.prepare('SELECT id, tags_json FROM material_examples').all();
  const updateExample = db.prepare('UPDATE material_examples SET tags_json = ?, updated_at = ? WHERE id = ?');
  examples.forEach((row) => {
    const tags = Array.isArray(JSON.parse(row.tags_json || '[]')) ? JSON.parse(row.tags_json || '[]') : [];
    if (!tags.includes(previousTrackId)) return;
    const nextTags = tags.map((tag) => (tag === previousTrackId ? nextTrackId : tag));
    updateExample.run(JSON.stringify(nextTags), nowIso(), row.id);
  });

  const links = db.prepare('SELECT id, target_type, payload_json FROM material_example_links').all();
  const updateLink = db.prepare('UPDATE material_example_links SET target_type = ?, payload_json = ?, updated_at = ? WHERE id = ?');
  links.forEach((row) => {
    const nextTargetType = String(row.target_type || '').trim() === previousTrackId ? nextTrackId : row.target_type;
    const payload = row.payload_json ? JSON.parse(row.payload_json) : null;
    const nextPayload = replaceTrackReferencePayload(payload, previousTrackId, nextTrackId);
    if (nextTargetType === row.target_type && nextPayload === payload) return;
    updateLink.run(
      nextTargetType,
      nextPayload ? JSON.stringify(nextPayload) : null,
      nowIso(),
      row.id,
    );
  });
}

function getMaterialTrackById(trackId) {
  return listMaterialTracks().find((track) => track.id === trackId) || null;
}

function upsertMaterialExample(example) {
  db.prepare(`
    INSERT INTO material_examples (id, project_id, title, content, author, source_note, tags_json, created_at, updated_at)
    VALUES (@id, @projectId, @title, @content, @author, @sourceNote, @tagsJson, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      author = excluded.author,
      source_note = excluded.source_note,
      tags_json = excluded.tags_json,
      updated_at = excluded.updated_at
  `).run({
    ...example,
    tagsJson: JSON.stringify(example.tags || []),
  });
}

function upsertMaterialExampleLink(link) {
  db.prepare(`
    INSERT INTO material_example_links (
      id,
      project_id,
      example_id,
      link_type,
      target_id,
      target_type,
      title,
      payload_json,
      created_at,
      updated_at
    )
    VALUES (
      @id,
      @projectId,
      @exampleId,
      @linkType,
      @targetId,
      @targetType,
      @title,
      @payloadJson,
      @createdAt,
      @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      link_type = excluded.link_type,
      target_id = excluded.target_id,
      target_type = excluded.target_type,
      title = excluded.title,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `).run({
    ...link,
    payloadJson: link.payload ? JSON.stringify(link.payload) : null,
  });
}

function findExistingMaterialExample(projectId, title, content) {
  return db
    .prepare('SELECT * FROM material_examples WHERE project_id = ? AND title = ? AND content = ? LIMIT 1')
    .get(projectId, title, content);
}

function ensureMaterialExample(projectId, payload = {}) {
  const title = String(payload.title || '').trim();
  const content = String(payload.content || '');
  if (!content.trim()) return null;
  const existing = findExistingMaterialExample(projectId, title, content);
  const example = normalizeMaterialExampleInput(projectId, payload, existing);
  upsertMaterialExample(example);
  return rowToMaterialExample(db.prepare('SELECT * FROM material_examples WHERE id = ?').get(example.id));
}

function upsertUniqueMaterialExampleLink(projectId, exampleId, payload = {}) {
  const existing = db.prepare(`
    SELECT * FROM material_example_links
    WHERE project_id = ? AND example_id = ? AND link_type = ? AND target_id = ? AND target_type = ?
    LIMIT 1
  `).get(
    projectId,
    exampleId,
    String(payload.linkType || '').trim(),
    String(payload.targetId || '').trim(),
    String(payload.targetType || '').trim(),
  );
  const link = normalizeMaterialExampleLinkInput(projectId, exampleId, payload, existing);
  if (!link.linkType) return null;
  upsertMaterialExampleLink(link);
  return rowToMaterialExampleLink(db.prepare('SELECT * FROM material_example_links WHERE id = ?').get(link.id));
}

function syncExtractionExampleLinks(projectId, extraction) {
  const example = ensureMaterialExample(projectId, {
    title: extraction.sourceTitle,
    content: extraction.sourceText,
    sourceNote: 'material_extraction',
    tags: [extraction.confirmedTrack || extraction.trackAnalysis?.primary_track || ''].filter(Boolean),
  });
  if (!example) return null;

  if (extraction.trackAnalysis) {
    upsertUniqueMaterialExampleLink(projectId, example.id, {
      linkType: 'track_analysis',
      targetId: projectId,
      targetType: extraction.confirmedTrack || extraction.trackAnalysis?.primary_track || '',
      title: extraction.sourceTitle || example.title || '未命名样文',
      payload: {
        confirmedTrack: extraction.confirmedTrack || '',
        trackAnalysis: extraction.trackAnalysis,
      },
    });
  }

  if (extraction.extractionSummary || Object.keys(extraction.analysisResults || {}).length > 0) {
    upsertUniqueMaterialExampleLink(projectId, example.id, {
      linkType: 'dna_extraction',
      targetId: projectId,
      targetType: extraction.confirmedTrack || '',
      title: extraction.sourceTitle || example.title || '未命名样文',
      payload: {
        confirmedTrack: extraction.confirmedTrack || '',
        extractionSummary: extraction.extractionSummary || null,
        totalAssets: extraction.totalAssets || 0,
      },
    });
  }

  Object.entries(extraction.analysisResults || {}).forEach(([assetType, records]) => {
    if (!Array.isArray(records)) return;
    records.forEach((record) => {
      const assetId = String(record?.asset_id || record?.suggested_filename || '').trim();
      if (!assetId) return;
      upsertUniqueMaterialExampleLink(projectId, example.id, {
        linkType: 'asset',
        targetId: assetId,
        targetType: assetType,
        title: String(record?.asset_id || record?.suggested_filename || assetType).trim(),
        payload: {
          assetType,
          assetId,
          confidence: record?.confidence || '',
        },
      });
    });
  });

  return example;
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

function resetMaterialPromptConfigsToDefaults() {
  const reset = db.transaction(() => {
    db.prepare('DELETE FROM material_prompt_configs').run();
    DEFAULT_MATERIAL_PROMPTS
      .map((prompt) => normalizeMaterialPromptConfigInput({
        id: prompt.id,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        temperature: prompt.temperature,
        updatedAt: nowIso(),
      }))
      .filter(Boolean)
      .forEach(upsertMaterialPromptConfig);
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

function seedDefaultMaterialPromptConfigsIfMissing() {
  const seed = db.transaction(() => {
    for (const prompt of DEFAULT_MATERIAL_PROMPTS) {
      const exists = db.prepare('SELECT 1 FROM material_prompt_configs WHERE id = ?').get(prompt.id);
      if (exists) continue;
      upsertMaterialPromptConfig(normalizeMaterialPromptConfigInput({
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

function seedDefaultMaterialTracksIfMissing() {
  const seed = db.transaction(() => {
    normalizeTrackCatalog(DEFAULT_TRACK_IDS)
      .map(trackId => normalizeMaterialTrackInput({ id: trackId, updatedAt: nowIso() }))
      .filter(Boolean)
      .forEach(upsertMaterialTrack);
  });

  seed();
}

seedDefaultPromptConfigsIfMissing();
seedDefaultMaterialPromptConfigsIfMissing();
seedDefaultMaterialTracksIfMissing();
migrateProjectSnapshots();

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

app.get('/api/material-prompt-configs', (request, response) => {
  response.json(listMaterialPromptConfigs());
});

app.get('/api/material-tracks', (request, response) => {
  response.json(listMaterialTracks());
});

app.post('/api/material-tracks', (request, response) => {
  const track = normalizeMaterialTrackInput({
    id: request.body.id,
    updatedAt: nowIso(),
  });

  if (!track?.id) {
    response.status(400).json({ error: 'Track id is required' });
    return;
  }

  upsertMaterialTrack(track);
  response.status(201).json(getMaterialTrackById(track.id));
});

app.patch('/api/material-tracks/:id', (request, response) => {
  const currentId = normalizeTrackId(request.params.id);
  const nextId = normalizeTrackId(request.body.id || request.body.nextId || '');
  const existing = db.prepare('SELECT * FROM material_tracks WHERE id = ?').get(currentId);

  if (!existing) {
    response.status(404).json({ error: 'Track not found' });
    return;
  }

  if (DEFAULT_TRACK_IDS.includes(currentId)) {
    response.status(400).json({ error: 'Default tracks cannot be renamed' });
    return;
  }

  if (!nextId) {
    response.status(400).json({ error: 'Next track id is required' });
    return;
  }

  if (nextId === currentId) {
    response.json(getMaterialTrackById(currentId));
    return;
  }

  const conflict = db.prepare('SELECT 1 FROM material_tracks WHERE id = ?').get(nextId);
  if (conflict) {
    response.status(409).json({ error: 'Track id already exists' });
    return;
  }

  const renameTrack = db.transaction(() => {
    db.prepare('UPDATE material_tracks SET id = ?, updated_at = ? WHERE id = ?').run(nextId, nowIso(), currentId);
    renameMaterialTrackReferences(currentId, nextId);
  });

  renameTrack();
  response.json(getMaterialTrackById(nextId));
});

app.delete('/api/material-tracks/:id', (request, response) => {
  const trackId = normalizeTrackId(request.params.id);
  const existing = db.prepare('SELECT * FROM material_tracks WHERE id = ?').get(trackId);

  if (!existing) {
    response.status(404).json({ error: 'Track not found' });
    return;
  }

  if (DEFAULT_TRACK_IDS.includes(trackId)) {
    response.status(400).json({ error: 'Default tracks cannot be deleted' });
    return;
  }

  const usageCount = db.prepare('SELECT COUNT(*) AS count FROM material_extractions WHERE confirmed_track = ?').get(trackId)?.count || 0;
  if (Number(usageCount) > 0) {
    response.status(400).json({ error: 'Track is still used by projects and cannot be deleted' });
    return;
  }

  db.prepare('DELETE FROM material_tracks WHERE id = ?').run(trackId);
  response.status(204).end();
});

app.get('/api/projects/:id/material-examples', (request, response) => {
  const project = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(request.params.id);
  if (!project) {
    response.status(404).json({ error: 'Project not found' });
    return;
  }

  response.json(listMaterialExamples(request.params.id));
});

app.post('/api/projects/:id/material-examples', (request, response) => {
  const project = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(request.params.id);
  if (!project) {
    response.status(404).json({ error: 'Project not found' });
    return;
  }

  const example = normalizeMaterialExampleInput(request.params.id, request.body);
  if (!example.content.trim()) {
    response.status(400).json({ error: 'Example content is required' });
    return;
  }

  upsertMaterialExample(example);
  response.status(201).json(rowToMaterialExample(db.prepare('SELECT * FROM material_examples WHERE id = ?').get(example.id)));
});

app.patch('/api/projects/:id/material-examples/:exampleId', (request, response) => {
  const existing = db.prepare('SELECT * FROM material_examples WHERE project_id = ? AND id = ?').get(request.params.id, request.params.exampleId);
  if (!existing) {
    response.status(404).json({ error: 'Material example not found' });
    return;
  }

  const example = normalizeMaterialExampleInput(request.params.id, {
    id: existing.id,
    title: request.body.title === undefined ? existing.title : request.body.title,
    content: request.body.content === undefined ? existing.content : request.body.content,
    author: request.body.author === undefined ? existing.author : request.body.author,
    sourceNote: request.body.sourceNote === undefined ? existing.source_note : request.body.sourceNote,
    tags: request.body.tags === undefined ? JSON.parse(existing.tags_json || '[]') : request.body.tags,
    updatedAt: nowIso(),
  }, existing);

  if (!example.content.trim()) {
    response.status(400).json({ error: 'Example content is required' });
    return;
  }

  upsertMaterialExample(example);
  response.json(rowToMaterialExample(db.prepare('SELECT * FROM material_examples WHERE id = ?').get(example.id)));
});

app.delete('/api/projects/:id/material-examples/:exampleId', (request, response) => {
  const existing = db.prepare('SELECT 1 FROM material_examples WHERE project_id = ? AND id = ?').get(request.params.id, request.params.exampleId);
  if (!existing) {
    response.status(404).json({ error: 'Material example not found' });
    return;
  }

  db.prepare('DELETE FROM material_examples WHERE project_id = ? AND id = ?').run(request.params.id, request.params.exampleId);
  response.status(204).end();
});

app.get('/api/projects/:id/material-examples/:exampleId/links', (request, response) => {
  const example = db.prepare('SELECT 1 FROM material_examples WHERE project_id = ? AND id = ?').get(request.params.id, request.params.exampleId);
  if (!example) {
    response.status(404).json({ error: 'Material example not found' });
    return;
  }

  response.json(listMaterialExampleLinks(request.params.id, request.params.exampleId));
});

app.post('/api/projects/:id/material-examples/:exampleId/links', (request, response) => {
  const example = db.prepare('SELECT 1 FROM material_examples WHERE project_id = ? AND id = ?').get(request.params.id, request.params.exampleId);
  if (!example) {
    response.status(404).json({ error: 'Material example not found' });
    return;
  }

  const link = upsertUniqueMaterialExampleLink(request.params.id, request.params.exampleId, {
    ...request.body,
    updatedAt: nowIso(),
  });
  if (!link) {
    response.status(400).json({ error: 'Link type is required' });
    return;
  }

  response.status(201).json(link);
});

app.patch('/api/material-prompt-configs/:id', (request, response) => {
  const defaultPrompt = DEFAULT_MATERIAL_PROMPTS.find((prompt) => prompt.id === request.params.id);
  if (!defaultPrompt) {
    response.status(404).json({ error: 'Material prompt config not found' });
    return;
  }

  const existing = db.prepare('SELECT * FROM material_prompt_configs WHERE id = ?').get(defaultPrompt.id);
  const promptConfig = normalizeMaterialPromptConfigInput({
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

  upsertMaterialPromptConfig(promptConfig);
  response.json(listMaterialPromptConfigs().find((prompt) => prompt.id === defaultPrompt.id));
});

app.delete('/api/material-prompt-configs', (request, response) => {
  resetMaterialPromptConfigsToDefaults();
  response.json(listMaterialPromptConfigs());
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
    snapshot: request.body.snapshot === undefined
      ? normalizeProjectSnapshot(JSON.parse(existing.snapshot_json || 'null'))
      : normalizeProjectSnapshot(request.body.snapshot),
    createdAt: existing.created_at,
    updatedAt: request.body.updatedAt || nowIso(),
  };
  upsertProject(project);
  response.json(rowToProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id)));
});

app.get('/api/projects/:id/material-extraction', (request, response) => {
  const project = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(request.params.id);
  if (!project) {
    response.status(404).json({ error: 'Project not found' });
    return;
  }

  const row = db.prepare('SELECT * FROM material_extractions WHERE project_id = ?').get(request.params.id);
  response.json(row ? rowToMaterialExtraction(row) : null);
});

app.put('/api/projects/:id/material-extraction', (request, response) => {
  const project = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(request.params.id);
  if (!project) {
    response.status(404).json({ error: 'Project not found' });
    return;
  }

  const existing = db.prepare('SELECT * FROM material_extractions WHERE project_id = ?').get(request.params.id);
  const extraction = normalizeMaterialExtractionInput(request.params.id, request.body, existing);
  upsertMaterialExtraction(extraction);
  syncExtractionExampleLinks(request.params.id, extraction);
  response.json(rowToMaterialExtraction(db.prepare('SELECT * FROM material_extractions WHERE project_id = ?').get(request.params.id)));
});

app.get('/api/projects/:id/material-operation-logs', (request, response) => {
  const project = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(request.params.id);
  if (!project) {
    response.status(404).json({ error: 'Project not found' });
    return;
  }

  response.json(listMaterialOperationLogs(request.params.id));
});

app.post('/api/projects/:id/material-operation-logs', (request, response) => {
  const project = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(request.params.id);
  if (!project) {
    response.status(404).json({ error: 'Project not found' });
    return;
  }

  const log = normalizeMaterialOperationLogInput(request.params.id, request.body);
  insertMaterialOperationLog(log);
  response.status(201).json(rowToMaterialOperationLog(db.prepare('SELECT * FROM material_operation_logs WHERE id = ?').get(log.id)));
});

app.delete('/api/projects/:id/material-extraction', (request, response) => {
  const project = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(request.params.id);
  if (!project) {
    response.status(404).json({ error: 'Project not found' });
    return;
  }

  db.prepare('DELETE FROM material_extractions WHERE project_id = ?').run(request.params.id);
  response.status(204).end();
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
