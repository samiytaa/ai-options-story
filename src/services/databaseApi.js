async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = `请求失败：${response.status}`;
    try {
      const payload = await response.json();
      message = payload.error || message;
    } catch {
      // Keep the status-based message.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function fetchDatabaseState() {
  return requestJson('/api/bootstrap');
}

export function importBrowserData(payload) {
  return requestJson('/api/import-browser-data', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchPromptConfigs() {
  return requestJson('/api/prompt-configs');
}

export function updatePromptConfigRecord(promptId, payload) {
  return requestJson(`/api/prompt-configs/${encodeURIComponent(promptId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function resetPromptConfigRecords() {
  return requestJson('/api/prompt-configs', {
    method: 'DELETE',
  });
}

export function fetchMaterialPromptConfigs() {
  return requestJson('/api/material-prompt-configs');
}

export function updateMaterialPromptConfigRecord(promptId, payload) {
  return requestJson(`/api/material-prompt-configs/${encodeURIComponent(promptId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function resetMaterialPromptConfigRecords() {
  return requestJson('/api/material-prompt-configs', {
    method: 'DELETE',
  });
}

export function fetchMaterialTracks() {
  return requestJson('/api/material-tracks');
}

export function createMaterialTrackRecord(trackId) {
  return requestJson('/api/material-tracks', {
    method: 'POST',
    body: JSON.stringify({ id: trackId }),
  });
}

export function renameMaterialTrackRecord(trackId, nextTrackId) {
  return requestJson(`/api/material-tracks/${encodeURIComponent(trackId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ id: nextTrackId }),
  });
}

export function deleteMaterialTrackRecord(trackId) {
  return requestJson(`/api/material-tracks/${encodeURIComponent(trackId)}`, {
    method: 'DELETE',
  });
}

export function createProjectRecord(payload) {
  return requestJson('/api/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProjectRecord(projectId, payload) {
  return requestJson(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteProjectRecord(projectId) {
  return requestJson(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  });
}

export function fetchMaterialExtractionRecord(projectId) {
  return requestJson(`/api/projects/${encodeURIComponent(projectId)}/material-extraction`);
}

export function saveMaterialExtractionRecord(projectId, payload) {
  return requestJson(`/api/projects/${encodeURIComponent(projectId)}/material-extraction`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function fetchMaterialOperationLogs(projectId) {
  return requestJson(`/api/projects/${encodeURIComponent(projectId)}/material-operation-logs`);
}

export function createMaterialOperationLog(projectId, payload) {
  return requestJson(`/api/projects/${encodeURIComponent(projectId)}/material-operation-logs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchMaterialExamples(projectId) {
  return requestJson(`/api/projects/${encodeURIComponent(projectId)}/material-examples`);
}

export function createMaterialExample(projectId, payload) {
  return requestJson(`/api/projects/${encodeURIComponent(projectId)}/material-examples`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateMaterialExample(projectId, exampleId, payload) {
  return requestJson(`/api/projects/${encodeURIComponent(projectId)}/material-examples/${encodeURIComponent(exampleId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteMaterialExample(projectId, exampleId) {
  return requestJson(`/api/projects/${encodeURIComponent(projectId)}/material-examples/${encodeURIComponent(exampleId)}`, {
    method: 'DELETE',
  });
}

export function fetchMaterialExampleLinks(projectId, exampleId) {
  return requestJson(`/api/projects/${encodeURIComponent(projectId)}/material-examples/${encodeURIComponent(exampleId)}/links`);
}

export function createMaterialExampleLink(projectId, exampleId, payload) {
  return requestJson(`/api/projects/${encodeURIComponent(projectId)}/material-examples/${encodeURIComponent(exampleId)}/links`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteMaterialExtractionRecord(projectId) {
  return requestJson(`/api/projects/${encodeURIComponent(projectId)}/material-extraction`, {
    method: 'DELETE',
  });
}

export function saveActiveProjectRecord(projectId) {
  return requestJson('/api/active-project', {
    method: 'PUT',
    body: JSON.stringify({ projectId }),
  });
}

export function createFavoriteRecord(payload) {
  return requestJson('/api/favorites', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateFavoriteRecord(favoriteId, payload) {
  return requestJson(`/api/favorites/${encodeURIComponent(favoriteId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteFavoriteRecord(favoriteId) {
  return requestJson(`/api/favorites/${encodeURIComponent(favoriteId)}`, {
    method: 'DELETE',
  });
}
