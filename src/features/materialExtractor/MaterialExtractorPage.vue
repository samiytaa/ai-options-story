<template>
<div>
    <MaterialExtractorShell
      :sidebar-tree-data="materialSidebarTree"
      :content-view-data="materialContentView"
      @close="$emit('close')"
      @switch-view="handleShellSwitchView"
      @switch-input-tab="handleShellSwitchInputTab"
      @open-track-manager="handleShellOpenTrackManager"
      @open-prompt="showMaterialPromptModal = true"
      @create-example="handleShellCreateExample"
      @upload-examples="handleShellUploadExamples"
      @search-examples="handleShellSearchExamples"
      @open-example="handleShellOpenExample"
      @clear-track-products="handleShellClearTrackProducts"
      @select-track-product="handleShellSelectTrackProduct"
      @clear-asset-library="handleShellClearAssetLibrary"
      @select-asset-type="handleShellSelectAssetType"
      @toggle-sidebar-folder="handleShellToggleSidebarFolder"
    />

    <PromptConfigModal
      :visible="showMaterialPromptModal"
      :prompt-configs="materialPromptConfigs"
      :active-prompt-id="activeMaterialPromptId"
      :active-prompt-config="activeMaterialPromptConfig"
      :editor-version="materialPromptEditorVersion"
      modal-title="故事DNA提示词"
      modal-description="管理故事DNA数据库页面的赛道分析与 DNA 抽取提示词。"
      :placeholder-descriptions="MATERIAL_PROMPT_PLACEHOLDER_DESCRIPTIONS"
      @close="requestCloseMaterialPromptModal"
      @update:active-prompt-id="activeMaterialPromptId = $event"
      @update-prompt-config="updateMaterialPromptConfigFieldValue"
      @reset="resetMaterialPromptConfigs"
    />

    <MaterialSourceEvidenceModal
      :visible="showMaterialSourceEvidenceModal"
      :supports-field="materialSourceEvidenceState.supportsField || '证据字段'"
      :interpretation="materialSourceEvidenceState.interpretation"
      :excerpt-html="materialSourceEvidenceState.excerptHtml"
      @close="showMaterialSourceEvidenceModal = false"
    />

    <MaterialCommandModalHost />

</div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import MaterialCommandModalHost from './MaterialCommandModalHost.vue'
import MaterialExtractorShell from './MaterialExtractorShell.vue'
import MaterialSourceEvidenceModal from './MaterialSourceEvidenceModal.vue'
import PromptConfigModal from '../../components/app/PromptConfigModal.vue'
import { normalizeAiConfig } from './aiConfig'
import { requestAssetExtraction, requestTrackAnalysis } from './aiClient'
import { normalizeAssetAnalysisResults } from './assetRecords'
import { DEMO_STORY, EXTRACTION_RULES } from './dnaRules'
import {
  DEFAULT_MATERIAL_PROMPTS,
  MATERIAL_PROMPT_PLACEHOLDER_DESCRIPTIONS,
} from './materialPromptDefinitions'
import {
  applyMaterialPromptConfigs,
  getMaterialPromptConfig,
  normalizeMaterialPromptConfigs,
  updateMaterialPromptConfigField,
} from './materialPromptConfig'
import { createMaterialPromptConfigController } from './materialPromptConfigController'
import {
  ASSET_PATH_REGISTRY,
  LEVEL_META as ASSET_LEVEL_META,
  DEFAULT_TRACK_IDS,
  PENDING_TRACK_ID,
  TRACK_SAMPLE_PATHS,
  UNKNOWN_TRACK_ID,
  getOrderedAssetEntries as getRegisteredAssetEntries,
  makeAssetFilename as makeRegisteredAssetFilename,
  normalizeTrackCatalog,
  normalizeTrackId,
  resolveAssetPath as resolveRegisteredAssetPath,
  resolveTrackPath,
  sanitizePathPart,
} from './assetPathRegistry'
import { normalizeTrackAnalysis } from './trackAnalysisState'
import {
  createMaterialExample,
  createMaterialOperationLog,
  createMaterialTrackRecord,
  deleteMaterialTrackRecord,
  deleteMaterialExample,
  fetchMaterialExampleLinks,
  fetchMaterialExamples,
  fetchMaterialExtractionRecord,
  fetchMaterialPromptConfigs,
  fetchMaterialTracks,
  renameMaterialTrackRecord,
  resetMaterialPromptConfigRecords,
  saveMaterialExtractionRecord,
  updateMaterialExample,
  updateMaterialPromptConfigRecord,
} from '../../services/databaseApi'

const emit = defineEmits(['close', 'apply-asset-context'])

const props = defineProps({
  activeProjectId: {
    type: String,
    default: '',
  },
  activeProjectName: {
    type: String,
    default: '',
  },
  aiConfig: {
    type: Object,
    default: () => ({}),
  },
  focusedAsset: {
    type: Object,
    default: null,
  },
})

const showMaterialPromptModal = ref(false)
const showMaterialSourceEvidenceModal = ref(false)
const activeMaterialPromptId = ref(DEFAULT_MATERIAL_PROMPTS[0]?.id || '')
const materialPromptConfigs = reactive(normalizeMaterialPromptConfigs())
const materialPromptEditorVersion = ref(0)
const materialSourceEvidenceState = reactive({
  supportsField: '',
  quote: '',
  interpretation: '',
  excerptHtml: '',
})
const materialRelationFilter = reactive({
  level: 'all',
  tag: '',
})
const materialSidebarTree = ref({
  mode: 'assets',
  examples: [],
  trackProducts: [],
  assetLevels: [],
})
const materialContentView = ref({
  html: '',
  containedScroll: false,
  renderVersion: 0,
  onRendered: null,
})
let materialToast = () => {}
let syncMaterialTrackCatalogState = () => {}

const activeMaterialPromptConfig = computed(() => getMaterialPromptConfig(materialPromptConfigs, activeMaterialPromptId.value))

function pushMaterialToast(message, duration) {
  materialToast(message, duration)
}

function handleShellSwitchView(view) {
  if (typeof window.switchView === 'function') {
    window.switchView(view)
  }
}

function handleShellSwitchInputTab(tab) {
  if (typeof window.switchMaterialInputTab === 'function') {
    window.switchMaterialInputTab(tab)
  }
}

function handleShellOpenTrackManager() {
  if (typeof window.openTrackManagerModal === 'function') {
    window.openTrackManagerModal()
  }
}

function handleShellCreateExample() {
  if (typeof window.openMaterialExampleEditor === 'function') {
    window.openMaterialExampleEditor()
  }
}

function handleShellUploadExamples() {
  if (typeof window.triggerMaterialExampleFileUpload === 'function') {
    window.triggerMaterialExampleFileUpload()
  }
}

function handleShellSearchExamples(value) {
  if (typeof window.setMaterialExampleSearch === 'function') {
    window.setMaterialExampleSearch(value)
  }
}

function handleShellOpenExample(exampleId) {
  if (typeof window.openMaterialExample === 'function') {
    window.openMaterialExample(exampleId)
  }
}

function handleShellClearTrackProducts() {
  if (typeof window.clearTrackProducts === 'function') {
    void window.clearTrackProducts()
  }
}

function handleShellSelectTrackProduct(kind) {
  if (typeof window.selectTrackProduct === 'function') {
    window.selectTrackProduct(kind)
  }
}

function handleShellClearAssetLibrary() {
  if (typeof window.clearAssetLibrary === 'function') {
    void window.clearAssetLibrary()
  }
}

function handleShellSelectAssetType(type) {
  if (typeof window.selectAssetType === 'function') {
    window.selectAssetType(type)
  }
}

function handleShellToggleSidebarFolder(folderId) {
  if (typeof window.toggleFolder === 'function') {
    window.toggleFolder(folderId)
  }
}

const stateBridge = reactive({
  sourceTitle: '',
  sourceText: '',
})

async function appendMaterialOperationLog(payload = {}) {
  if (!props.activeProjectId) return null
  try {
    return await createMaterialOperationLog(props.activeProjectId, payload)
  } catch (error) {
    console.error('Failed to append material operation log:', error)
    return null
  }
}

function openFocusedMaterialAsset(payload, attempt = 0) {
  const assetType = String(payload?.assetType || '').trim()
  const assetId = String(payload?.assetId || '').trim()
  if (!assetType || !assetId) return
  if (typeof window.openTaggedAsset === 'function') {
    nextTick(() => {
      window.openTaggedAsset(assetType, assetId)
    })
    return
  }
  if (attempt >= 12) return
  window.setTimeout(() => openFocusedMaterialAsset(payload, attempt + 1), 120)
}

watch(
  () => props.focusedAsset?.requestId,
  () => {
    if (props.focusedAsset?.assetType && props.focusedAsset?.assetId) {
      openFocusedMaterialAsset(props.focusedAsset)
    }
  },
  { immediate: true },
)

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function getRecordList(analysisResults, assetType) {
  return Array.isArray(analysisResults?.[assetType]) ? analysisResults[assetType] : []
}

function pickFirstText(values = []) {
  return ensureArray(values).map((item) => String(item || '').trim()).find(Boolean) || ''
}

function summarizeFromKeys(coreData, keys) {
  for (const key of keys) {
    const value = coreData?.[key]
    if (!value) continue
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (Array.isArray(value)) {
      const items = value
        .flatMap((item) => {
          if (typeof item === 'string') return [item.trim()]
          if (item && typeof item === 'object') {
            return Object.values(item).map((subValue) => String(subValue || '').trim())
          }
          return []
        })
        .filter(Boolean)
      if (items.length) return items.slice(0, 3).join(' / ')
    }
    if (value && typeof value === 'object') {
      const objectText = Object.values(value).map((item) => String(item || '').trim()).find(Boolean)
      if (objectText) return objectText
    }
  }
  return ''
}

function getAssetRecordSummary(assetType, assetId = '') {
  const records = getRecordList(state.analysisResults, assetType)
  const record = records.find((item) => String(item.asset_id || item.suggested_filename || '').trim() === String(assetId || '').trim()) || records[0] || null
  const info = ASSET_PATH_REGISTRY[assetType] || {}
  const coreData = record?.core_data || {}
  const summaryText = pickFirstText([
    summarizeFromKeys(coreData, ['formula_name', 'core_mechanics', 'key_moments']),
    summarizeFromKeys(coreData, ['structural_pattern', 'core_mechanism', 'phases']),
    summarizeFromKeys(coreData, ['core_claim', 'theme_statement', 'keywords']),
    summarizeFromKeys(coreData, ['storySummary', 'outlineReferenceNotes', 'guideReferenceNotes', 'globalSummary', 'globalLeadExample']),
    String(record?.asset_id || '').trim(),
  ])

  return {
    assetType,
    assetId: record?.asset_id || assetId || '',
    assetName: info.name || assetType,
    summary: summaryText || '未提取摘要',
    record,
  }
}

function mapAssetToWorkspaceTarget(assetType) {
  if (['gratification_formula', 'intro_template', 'opening_template', 'variable_library'].includes(assetType)) return 'brainhole'
  if (['language_dna', 'emotional_anchor'].includes(assetType)) return 'guide'
  if (['structural_skeleton', 'chapter_outline', 'theme_template', 'world_setting', 'character_profile', 'asset_relationship_network'].includes(assetType)) return 'outline'
  return 'brainhole'
}

function applyMaterialAssetContext(assetType, assetId = '', label = '') {
  const payload = getAssetRecordSummary(assetType, assetId)
  emit('apply-asset-context', {
    target: mapAssetToWorkspaceTarget(assetType),
    label: String(label || payload.assetName || assetType).trim(),
    assetType: payload.assetType,
    assetId: payload.assetId,
    assetName: payload.assetName,
    summary: payload.summary,
  })
}

function buildMaterialAssetLogSummary(analysisResults) {
  return getRegisteredAssetEntries().flatMap(([assetType, info]) => {
    const records = getRecordList(analysisResults, assetType)
    if (!records.length) return []
    const firstRecord = records[0] || {}
    return [{
      assetType,
      assetId: firstRecord.asset_id || firstRecord.suggested_filename || '',
      assetName: info.name,
      icon: info.icon,
      count: records.length,
    }]
  })
}

const materialPromptConfigController = createMaterialPromptConfigController({
  promptConfigs: materialPromptConfigs,
  getPromptConfig: getMaterialPromptConfig,
  applyPromptConfigs: applyMaterialPromptConfigs,
  updatePromptConfigField: updateMaterialPromptConfigField,
  fetchPromptConfigs: fetchMaterialPromptConfigs,
  updatePromptConfigRecord: updateMaterialPromptConfigRecord,
  resetPromptConfigRecords: resetMaterialPromptConfigRecords,
  onToast: pushMaterialToast,
  appendOperationLog: appendMaterialOperationLog,
  onEditorVersionBump: () => {
    materialPromptEditorVersion.value += 1
  },
})

function updateMaterialPromptConfigFieldValue(promptId, key, value) {
  materialPromptConfigController.updateFieldValue(promptId, key, value)
}

async function resetMaterialPromptConfigs() {
  await materialPromptConfigController.resetPromptConfigs()
}

async function requestCloseMaterialPromptModal() {
  await materialPromptConfigController.requestClose(() => {
    showMaterialPromptModal.value = false
  })
}

async function loadMaterialTrackCatalogState() {
  try {
    const tracks = await fetchMaterialTracks()
    syncMaterialTrackCatalogState(Array.isArray(tracks) ? tracks : [])
  } catch (error) {
    console.error('Failed to load material tracks:', error)
    syncMaterialTrackCatalogState(DEFAULT_TRACK_IDS.map((id) => ({
      id,
      isDefault: true,
      usageCount: 0,
      inUse: false,
      canRename: false,
      canDelete: false,
    })))
  }
}

watch(() => props.activeProjectId, () => {
  void loadMaterialTrackCatalogState()
  void materialPromptConfigController.loadPromptConfigs()
}, { immediate: true })

onMounted(() => {
(function() {
            // ==================== DATA REGISTRY ====================
            const ASSET_TYPE_REGISTRY = ASSET_PATH_REGISTRY;
            const LEVEL_META = ASSET_LEVEL_META;

            function getOrderedAssetEntries() {
                return getRegisteredAssetEntries();
            }

            function formatDisplayIndex(index) {
                return String(index).padStart(2, '0');
            }

            const FOLDER_STRUCTURE = {
                '01_变量库': [],
                '02_节奏模板库': [],
                '03_情感锚点库': [],
                '04_悬念模板库': [],
                '05_爽点配方库': [],
                '06_导语拆解库': [],
                '07_开篇拆解库': [],
                '08_资产关系网络': [],
                '09_行动力曲线库': [],
                '10_人物高光库': [],
                '11_高燃场面库': [],
                '12_冲突升级库': [],
                '13_结构技法库': [],
                '14_结构骨架库': [],
                '15_世界观设定库': [],
                '16_人物小传库': [],
                '17_逐章大纲库': [],
                '18_人物弧光库': [],
                '19_语言DNA库': [],
                '20_主题拆解库': [],
            };

            // Build folder contents from registry
            Object.entries(ASSET_TYPE_REGISTRY).forEach(([type, info]) => {
                if (FOLDER_STRUCTURE[info.folder]) {
                    FOLDER_STRUCTURE[info.folder].push({ type, ...info });
                } else if (!FOLDER_STRUCTURE[info.folder]) {
                    FOLDER_STRUCTURE[info.folder] = [{ type, ...info }];
                }
            });

            // ==================== STATE ====================
            const state = {
                currentView: 'examples',
                inputTab: 'track',
                activeTab: null,
                availableTrackIds: [...DEFAULT_TRACK_IDS],
                trackCatalog: DEFAULT_TRACK_IDS.map(id => ({
                    id,
                    isDefault: true,
                    usageCount: 0,
                    inUse: false,
                    canRename: false,
                    canDelete: false,
                })),
                sourceText: '',
                sourceTitle: '',
                materialExamples: [],
                selectedExampleId: '',
                selectedExampleLinks: [],
                exampleSearchKeyword: '',
                trackAnalysis: null,
                confirmedTrack: '',
                analysisResults: {}, // { asset_type: [records] }
                totalAssets: 0,
                extractionSummary: null,
                trackAnalysisPending: false,
                extractionPending: false,
                uploadedTextFiles: [],
                batchTrackPending: false,
                activeTrackProduct: '',
                activeTagFilter: null,
            };
            stateBridge.sourceTitle = state.sourceTitle;
            stateBridge.sourceText = state.sourceText;

            function getAvailableTrackIds() {
                return normalizeTrackCatalog(state.availableTrackIds);
            }

            function refreshAvailableTrackIds(tracks = []) {
                state.availableTrackIds = normalizeTrackCatalog(tracks.map((track) => typeof track === 'string' ? track : track?.id));
            }

            syncMaterialTrackCatalogState = function(tracks = []) {
                const normalizedCatalog = Array.isArray(tracks) && tracks.length
                    ? tracks.map((track) => ({
                        id: normalizeTrackId(track?.id || ''),
                        isDefault: Boolean(track?.isDefault || DEFAULT_TRACK_IDS.includes(normalizeTrackId(track?.id || ''))),
                        usageCount: Number(track?.usageCount || 0),
                        inUse: Boolean(track?.inUse || Number(track?.usageCount || 0) > 0),
                        canRename: track?.canRename !== undefined ? Boolean(track.canRename) : !DEFAULT_TRACK_IDS.includes(normalizeTrackId(track?.id || '')),
                        canDelete: track?.canDelete !== undefined ? Boolean(track.canDelete) : (!DEFAULT_TRACK_IDS.includes(normalizeTrackId(track?.id || '')) && Number(track?.usageCount || 0) === 0),
                    })).filter((track) => track.id)
                    : DEFAULT_TRACK_IDS.map((id) => ({
                        id,
                        isDefault: true,
                        usageCount: 0,
                        inUse: false,
                        canRename: false,
                        canDelete: false,
                    }));
                state.trackCatalog = normalizedCatalog;
                refreshAvailableTrackIds(normalizedCatalog);
            };

            function isAvailableTrackId(track) {
                return getAvailableTrackIds().includes(normalizeTrackId(track));
            }

            function getSuggestedTrack() {
                return normalizeTrackId(state.trackAnalysis?.primary_track || 'UNKNOWN');
            }

            function getResolvedTrack() {
                return normalizeTrackId(state.confirmedTrack || state.trackAnalysis?.primary_track || 'UNKNOWN');
            }

            function getTrackDecisionSummary(analysis) {
                const decision = analysis?.classification_decision || {};
                return {
                    decision: String(decision.decision || '').trim() || (analysis?.primary_track === 'UNKNOWN' ? 'unknown' : 'needs_human_review'),
                    reason: String(decision.reason || '').trim(),
                    confidence: String(decision.confidence || analysis?.confidence || 'low').trim() || 'low',
                };
            }

            function normalizeConfirmedTrackValue(value) {
                const trimmed = String(value || '').trim();
                return trimmed ? normalizeTrackId(trimmed) : '';
            }

            function getReferenceTrackName(analysis = state.trackAnalysis) {
                return String(analysis?.reference_track?.name || analysis?.primary_track || '').trim();
            }

            function getReferenceTrackReason(analysis = state.trackAnalysis) {
                return String(analysis?.reference_track?.reason || getTrackDecisionSummary(analysis).reason || '').trim();
            }

            function shouldRequireManualTrackDecision(analysis = state.trackAnalysis) {
                const primaryTrack = normalizeTrackId(analysis?.primary_track || UNKNOWN_TRACK_ID);
                return !getAvailableTrackIds().includes(primaryTrack);
            }

            function makeManualTrackAnalysis(track, detail = '') {
                const normalizedTrack = normalizeTrackId(track || UNKNOWN_TRACK_ID);
                const isUnknown = normalizedTrack === UNKNOWN_TRACK_ID;
                return normalizeTrackAnalysisState({
                    source_story: getStoryTitle(),
                    primary_track: normalizedTrack,
                    secondary_tracks: [],
                    confidence: 'low',
                    reference_track: {
                        name: isUnknown ? '' : normalizedTrack,
                        reason: detail,
                        should_create: !isAvailableTrackId(normalizedTrack) && !isUnknown,
                    },
                    track_positioning: '',
                    reader_emotion_needs: [],
                    core_gratification_points: [],
                    core_pain_points: [],
                    common_character_relations: [],
                    chapter_rhythm_skeleton: [],
                    taboo_zones: [],
                    brainhole_variable_tags: [],
                    objective_features: [],
                    reader_expectation: '',
                    emotional_promise: [],
                    structure_signature: { opening: '', development: '', turn: '', ending: '' },
                    risk_notes: isUnknown ? ['用户手动确认 UNKNOWN：未获得可用赛道判断。'] : [],
                    evidence: [],
                }, {
                    overrideTrack: normalizedTrack,
                });
            }

            function getTrackSeedList(values) {
                return Array.isArray(values) && values.length ? values.join(' / ') : '暂无';
            }

            function shouldShowPendingTrackProduct() {
                const track = getResolvedTrack();
                return track === UNKNOWN_TRACK_ID || track === PENDING_TRACK_ID;
            }

            function getVisibleTrackProductKinds() {
                return Object.keys(TRACK_SAMPLE_PATHS).filter(kind => kind !== 'pending' || shouldShowPendingTrackProduct());
            }

            // ==================== DOM REFS ====================
            const $sidebarTree = document.getElementById('sidebar-tree');
            const $assetCount = document.getElementById('asset-count');
            const $toast = document.getElementById('toast');

            function updateAssetCount(value) {
                if ($assetCount) $assetCount.textContent = String(value);
            }

            function updateMaterialContentView({ html = '', containedScroll = false, onRendered = null } = {}) {
                materialContentView.value = {
                    html,
                    containedScroll,
                    onRendered,
                    renderVersion: Number(materialContentView.value?.renderVersion || 0) + 1,
                };
            }

            function updateTopbarButtons() {
                const buttons = [
                    ['btn-input-track', state.currentView === 'input' && state.inputTab === 'track'],
                    ['btn-input-dna', state.currentView === 'input' && state.inputTab === 'dna'],
                    ['btn-examples', state.currentView === 'examples'],
                    ['btn-tags', state.currentView === 'tags'],
                ];
                buttons.forEach(([id, active]) => {
                    const button = document.getElementById(id);
                    if (button) button.classList.toggle('active', active);
                });
            }

            function setContainedScroll(enabled) {
                materialContentView.value = {
                    ...(materialContentView.value || {}),
                    containedScroll: enabled,
                };
            }

            // ==================== TOAST ====================
            function showToast(msg, duration = 2000) {
                $toast.textContent = msg;
                $toast.classList.add('show');
                clearTimeout($toast._timeout);
                $toast._timeout = setTimeout(() => $toast.classList.remove('show'), duration);
            }
            materialToast = showToast;

            function getMaterialTrackCatalog() {
                if (Array.isArray(state.trackCatalog) && state.trackCatalog.length) {
                    return state.trackCatalog;
                }
                return getAvailableTrackIds().map((trackId) => ({
                    id: trackId,
                    isDefault: DEFAULT_TRACK_IDS.includes(trackId),
                    usageCount: 0,
                    inUse: false,
                    canRename: !DEFAULT_TRACK_IDS.includes(trackId),
                    canDelete: !DEFAULT_TRACK_IDS.includes(trackId),
                }));
            }

            function showTrackManagerModal() {
                const modalHost = window.__materialCommandModalHost;
                if (modalHost && typeof modalHost.openTrackManager === 'function') {
                    modalHost.openTrackManager({
                        tracks: getMaterialTrackCatalog(),
                        onRename: async (currentTrackId, nextTrackId) => {
                            const normalizedTrackId = normalizeTrackId(nextTrackId || '');
                            if (!normalizedTrackId) {
                                showToast('⚠️ 请输入新的赛道名称');
                                return;
                            }
                            try {
                                await renameMaterialTrackRecord(currentTrackId, normalizedTrackId);
                                await loadMaterialTrackCatalogState();
                                await loadCurrentMaterialExtraction({ silent: true });
                                refreshCurrentView();
                                showTrackManagerModal();
                                showToast(`✅ 已重命名赛道：${currentTrackId} → ${normalizedTrackId}`);
                            } catch (error) {
                                showToast(`⚠️ 重命名赛道失败：${error?.message || '未知错误'}`);
                            }
                        },
                        onDelete: async (trackId) => {
                            try {
                                await deleteMaterialTrackRecord(trackId);
                                await loadMaterialTrackCatalogState();
                                refreshCurrentView();
                                showTrackManagerModal();
                                showToast(`✅ 已删除赛道：${trackId}`);
                            } catch (error) {
                                showToast(`⚠️ 删除赛道失败：${error?.message || '未知错误'}`);
                            }
                        },
                    });
                    return;
                }
            }

            function showTrackDecisionModal(analysis) {
                const primaryTrack = normalizeTrackId(analysis?.primary_track || UNKNOWN_TRACK_ID);
                const referenceTrack = normalizeTrackId(getReferenceTrackName(analysis) || '');
                const referenceReason = getReferenceTrackReason(analysis);
                const modalHost = window.__materialCommandModalHost;
                if (modalHost && typeof modalHost.openTrackDecision === 'function') {
                    modalHost.openTrackDecision({
                        primaryTrack,
                        referenceTrack,
                        referenceReason,
                        knownTracks: getAvailableTrackIds(),
                        onClose: () => {
                            renderInputView();
                        },
                        onConfirm: async (nextTrackRaw) => {
                            const nextTrack = normalizeConfirmedTrackValue(nextTrackRaw || '');
                            if (!nextTrack) {
                                showToast('⚠️ 请输入要归类的赛道名称');
                                return;
                            }
                            modalHost.closeTrackDecision();
                            await confirmTrackValue(nextTrack, {
                                source: isAvailableTrackId(nextTrack) ? 'modal_existing' : 'modal_create',
                                detail: isAvailableTrackId(nextTrack)
                                    ? `用户从已有赛道中选择 ${nextTrack}。`
                                    : `用户创建/手动确认新赛道 ${nextTrack}。`,
                            });
                        },
                        onConfirmUnknown: async () => {
                            modalHost.closeTrackDecision();
                            await confirmTrackValue(UNKNOWN_TRACK_ID, {
                                source: 'modal_unknown',
                                detail: '用户决定暂不归类，保留 UNKNOWN。',
                            });
                        },
                    });
                    return;
                }
            };

            window.openTrackManagerModal = async function() {
                await loadMaterialTrackCatalogState();
                showTrackManagerModal();
            };

            function buildMaterialExampleMeta(example) {
                const parts = [];
                if (Array.isArray(example.tags) && example.tags.length) {
                    parts.push(example.tags.join(' / '));
                }
                parts.push(`${String(example.content || '').length}字`);
                if (example.updatedAt) {
                    parts.push(new Date(example.updatedAt).toLocaleString('zh-CN'));
                }
                return parts.join(' · ');
            }

            function updateMaterialSidebarTree(nextValue) {
                materialSidebarTree.value = nextValue;
            }

            function buildSidebarTreeState() {
                if (state.currentView === 'examples') {
                    const filteredExamples = getFilteredMaterialExamples();
                    return {
                        mode: 'examples',
                        exampleTotal: state.materialExamples.length,
                        exampleVisible: filteredExamples.length,
                        exampleSearchKeyword: state.exampleSearchKeyword,
                        examples: filteredExamples.map((example) => ({
                            id: example.id,
                            title: example.title || '未命名例文',
                            meta: buildMaterialExampleMeta(example),
                            active: state.selectedExampleId === example.id,
                        })),
                    };
                }

                if ((state.currentView === 'input' || state.currentView === 'trackProduct') && state.inputTab === 'track') {
                    const track = getResolvedTrack();
                    const story = getStorySlug();
                    const productKinds = getVisibleTrackProductKinds();
                    if (state.activeTrackProduct && !productKinds.includes(state.activeTrackProduct)) {
                        state.activeTrackProduct = productKinds[0] || '';
                    }
                    return {
                        mode: 'trackProducts',
                        suggestedTrack: getSuggestedTrack(),
                        confirmedTrack: state.confirmedTrack || '未确认',
                        storySlug: story,
                        trackProducts: productKinds.map((kind) => ({
                            kind,
                            path: resolveTrackPath(kind, { track, story }),
                            active: state.activeTrackProduct === kind,
                        })),
                    };
                }

                return {
                    mode: 'assets',
                    assetLevels: Object.entries(LEVEL_META).flatMap(([level, meta]) => {
                        const items = getOrderedAssetEntries().filter(([, info]) => info.level === level);
                        if (!items.length) return [];
                        return [{
                            id: 'level-' + level.toLowerCase(),
                            title: meta.title,
                            className: meta.className,
                            items: items.map(([type, item]) => ({
                                type,
                                level: item.level,
                                displayIndex: formatDisplayIndex(item.displayIndex),
                                icon: item.icon,
                                name: item.name,
                                active: state.activeTab === type,
                            })),
                        }];
                    }),
                };
            }

            function getFilteredMaterialExamples() {
                const keyword = String(state.exampleSearchKeyword || '').trim().toLowerCase();
                if (!keyword) return state.materialExamples;
                return state.materialExamples.filter((example) => {
                    return [
                        example.title,
                        example.content,
                        example.author,
                        example.sourceNote,
                        Array.isArray(example.tags) ? example.tags.join(' ') : '',
                    ].join(' ').toLowerCase().includes(keyword);
                });
            }

            async function loadMaterialExamplesState() {
                if (!props.activeProjectId) {
                    state.materialExamples = [];
                    state.selectedExampleId = '';
                    state.selectedExampleLinks = [];
                    return;
                }
                state.materialExamples = await fetchMaterialExamples(props.activeProjectId);
                if (!state.selectedExampleId || !state.materialExamples.some((item) => item.id === state.selectedExampleId)) {
                    state.selectedExampleId = state.materialExamples[0]?.id || '';
                }
                if (state.selectedExampleId) {
                    state.selectedExampleLinks = await fetchMaterialExampleLinks(props.activeProjectId, state.selectedExampleId);
                } else {
                    state.selectedExampleLinks = [];
                }
            }

            async function selectMaterialExample(exampleId) {
                state.selectedExampleId = exampleId;
                state.selectedExampleLinks = exampleId && props.activeProjectId
                    ? await fetchMaterialExampleLinks(props.activeProjectId, exampleId)
                    : [];
                refreshCurrentView();
            }

            function getSelectedMaterialExample() {
                return state.materialExamples.find((item) => item.id === state.selectedExampleId) || null;
            }

            function applyMaterialExampleToInput(example) {
                if (!example) return;
                resetCurrentAnalysisForSource(example.title || '未命名例文', example.content || '');
                refreshCurrentView();
            }

            async function saveMaterialExampleFromModal(exampleId = '', formState = null) {
                if (!props.activeProjectId) return;
                const title = String((formState?.title ?? document.getElementById('material-example-title')?.value) || '').trim();
                const content = String((formState?.content ?? document.getElementById('material-example-content')?.value) || '');
                const author = String((formState?.author ?? document.getElementById('material-example-author')?.value) || '').trim();
                const sourceNote = String((formState?.sourceNote ?? document.getElementById('material-example-source-note')?.value) || '').trim();
                const rawTags = String((formState?.tags ?? document.getElementById('material-example-tags')?.value) || '');
                const tags = rawTags.split(/[，,]/).map(item => item.trim()).filter(Boolean);
                if (!content.trim()) {
                    showToast('⚠️ 例文正文不能为空');
                    return;
                }
                if (exampleId) {
                    await updateMaterialExample(props.activeProjectId, exampleId, { title, content, author, sourceNote, tags });
                } else {
                    await createMaterialExample(props.activeProjectId, { title, content, author, sourceNote, tags });
                }
                await loadMaterialExamplesState();
                if (window.__materialCommandModalHost?.closeExampleEditor) {
                    window.__materialCommandModalHost.closeExampleEditor();
                }
                refreshCurrentView();
            }

            async function createMaterialExamplesFromFiles(files = []) {
                if (!props.activeProjectId) return { createdCount: 0, skipped: [] };
                const txtFiles = files.filter((file) => {
                    const name = String(file?.name || '').toLowerCase();
                    return name.endsWith('.txt') || file?.type === 'text/plain';
                });
                let createdCount = 0;
                const skipped = [];

                for (const file of txtFiles) {
                    try {
                        const content = (await readTxtFileAsUtf8(file)).trim();
                        if (!content) {
                            skipped.push(`${file.name}: 空文件`);
                            continue;
                        }
                        await createMaterialExample(props.activeProjectId, {
                            title: inferTitleFromFileName(file.name),
                            content,
                            sourceNote: '文件上传',
                        });
                        createdCount += 1;
                    } catch (error) {
                        skipped.push(`${file.name}: ${error?.message || '读取失败'}`);
                    }
                }

                await loadMaterialExamplesState();
                refreshCurrentView();
                return { createdCount, skipped };
            }

            function renderExampleLibraryView() {
                setContainedScroll(false);
                buildSidebar();
                const example = getSelectedMaterialExample();
                updateMaterialContentView({
                    component: 'exampleLibrary',
                    containedScroll: false,
                    example: example ? {
                        id: example.id,
                        title: example.title || '未命名例文',
                        content: example.content || '',
                        tags: Array.isArray(example.tags) ? example.tags : [],
                    } : null,
                    links: state.selectedExampleLinks,
                    onCreate: () => {
                        openMaterialExampleEditor();
                    },
                    onUpload: () => {
                        triggerMaterialExampleFileUpload();
                    },
                    onUseExample: (exampleId) => {
                        void useMaterialExample(exampleId);
                    },
                    onEditExample: (exampleId) => {
                        openMaterialExampleEditor(exampleId);
                    },
                    onDeleteExample: (exampleId) => {
                        deleteSelectedMaterialExample(exampleId);
                    },
                    onOpenAsset: (assetType, assetId) => {
                        openRelatedAsset(assetType, assetId);
                    },
                });
            }

            // ==================== BUILD SIDEBAR ====================
            function buildSidebar() {
                updateMaterialSidebarTree(buildSidebarTreeState());
            }

            window.toggleFolder = function(folderId, forceOpen = false) {
                const children = document.getElementById(folderId);
                const header = document.getElementById(folderId + '-header');
                if (!children || !header) return;
                if (forceOpen) {
                    children.classList.add('show');
                    header.classList.add('open');
                } else {
                    const isOpen = children.classList.contains('show');
                    if (isOpen) {
                        children.classList.remove('show');
                        header.classList.remove('open');
                    } else {
                        children.classList.add('show');
                        header.classList.add('open');
                    }
                }
            };

            window.selectAssetType = function(type) {
                document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
                const el = document.getElementById('tree-' + type);
                if (el) el.classList.add('active');
                state.activeTab = type;
                state.activeTrackProduct = '';
                switchView('database');
                renderDatabaseView(type);
            };

            window.selectTrackProduct = function(kind) {
                if (!TRACK_SAMPLE_PATHS[kind]) return;
                if (!getVisibleTrackProductKinds().includes(kind)) {
                    kind = 'sample';
                }
                syncInputState();
                state.currentView = 'trackProduct';
                state.inputTab = 'track';
                state.activeTrackProduct = kind;
                buildSidebar();
                updateTopbarButtons();
                renderTrackProductView(kind);
            };

            // ==================== SWITCH VIEW ====================
            window.switchView = function(view) {
                state.currentView = view;
                if (view !== 'trackProduct') state.activeTrackProduct = '';
                buildSidebar();
                updateTopbarButtons();
                if (view === 'input') {
                    renderInputView();
                } else if (view === 'database') {
                    renderDatabaseView(state.activeTab || getOrderedAssetEntries()[0]?.[0]);
                } else if (view === 'examples') {
                    renderExampleLibraryView();
                } else if (view === 'tags') {
                    renderTagsView();
                }
            };

            window.switchMaterialInputTab = function(tab) {
                if (!['track', 'dna'].includes(tab)) return;
                syncInputState();
                state.currentView = 'input';
                state.inputTab = tab;
                state.activeTrackProduct = '';
                buildSidebar();
                updateTopbarButtons();
                renderInputView();
            };

            function refreshCurrentView() {
                buildSidebar();
                updateTopbarButtons();
                if (state.currentView === 'input') {
                    renderInputView();
                } else if (state.currentView === 'trackProduct') {
                    renderTrackProductView(state.activeTrackProduct || 'sample');
                } else if (state.currentView === 'database') {
                    renderDatabaseView(state.activeTab || getOrderedAssetEntries()[0]?.[0]);
                } else if (state.currentView === 'examples') {
                    renderExampleLibraryView();
                } else if (state.currentView === 'tags') {
                    renderTagsView();
                }
                updateSidebarBadges();
            }

            // ==================== INPUT VIEW ====================
            function renderInputView() {
                setContainedScroll(false);
                if (state.currentView === 'input') state.activeTrackProduct = '';
                buildSidebar();
                const statsHTML = state.sourceText ? `
            <div class="quick-stats">
              <span>📝 字数: <span class="val">${state.sourceText.length}</span></span>
              <span>📄 段落: <span class="val">${state.sourceText.split(/\\n\\n+/).filter(p=>p.trim()).length}</span></span>
              <span>📖 预估章节: <span class="val">${estimateChapters(state.sourceText)}</span></span>
              <span>🏷️ 标题: <span class="val">${state.sourceTitle || '未设定'}</span></span>
            </div>
          ` : '';
                const confirmedTrack = state.confirmedTrack || '';
                const suggestedTrack = state.trackAnalysis?.primary_track || '';
                const decisionSummary = state.trackAnalysis ? getTrackDecisionSummary(state.trackAnalysis) : null;
                const isTrackTab = state.inputTab === 'track';
                const uploadedFilesHTML = state.uploadedTextFiles.length ? `
            <div class="uploaded-text-file-list">
              ${state.uploadedTextFiles.map(file => `
                <div class="uploaded-text-file ${file.status || 'ready'}">
                  <button type="button" class="uploaded-text-file-main" onclick="loadUploadedTextFile('${file.id}')">
                    <span class="uploaded-text-file-title">${escapeHTML(file.title || file.name)}</span>
                    <span class="uploaded-text-file-meta">${escapeHTML(file.name)} · ${file.text.length}字 · ${escapeHTML(file.track || file.statusText || '待处理')}</span>
                  </button>
                  <button type="button" class="btn-small" onclick="removeUploadedTextFile('${file.id}')">移除</button>
                </div>
              `).join('')}
            </div>
          ` : '';

                updateMaterialContentView({
                    containedScroll: false,
                    html: `
            <div id="input-panel">
              <div class="panel">
                <div class="panel-header">📥 故事文本输入</div>
                <div class="panel-body">
                  <input type="text" id="input-title" class="input-title-field" placeholder="故事标题（可选）" value="${escapeHTML(state.sourceTitle)}">
                  <textarea id="input-text" placeholder="在此粘贴故事正文...&#10;&#10;支持章节标记（如第1章、Chapter 1等），系统将自动识别并分析。">${escapeHTML(state.sourceText)}</textarea>
                  ${statsHTML}
                  <input type="file" id="txt-file-upload" class="file-input-hidden" accept=".txt,text/plain" multiple onchange="handleTxtFileUpload(event)">
                  <div class="input-actions" style="margin-top:8px;">
                    ${isTrackTab
                        ? `<button class="primary" id="btn-run-track-analysis-panel" onclick="runTrackAnalysis()" ${state.trackAnalysisPending ? 'disabled' : ''}>${state.trackAnalysisPending ? '⏳ 判断中...' : '🧭 自动判断赛道'}</button>`
                        : `<button class="primary" id="btn-run-analysis-panel" onclick="runAnalysis()" ${state.extractionPending ? 'disabled' : ''}>${state.extractionPending ? '⏳ DNA抽取中...' : '🧬 DNA抽取'}</button>`}
                    <button onclick="document.getElementById('txt-file-upload')?.click()">📄 上传TXT</button>
                    <button onclick="switchView('examples')">📚 从例文库选择</button>
                    ${isTrackTab ? `<button id="btn-run-batch-track-analysis" onclick="runBatchTrackAnalysis()" ${state.batchTrackPending || !state.uploadedTextFiles.length ? 'disabled' : ''}>${state.batchTrackPending ? '⏳ 批量分析中...' : '📚 批量赛道分析'}</button>` : ''}
                    <button onclick="clearInput()">🗑️ 清空</button>
                    <button onclick="loadDemoText()">📋 加载示例文本</button>
                  </div>
                  ${uploadedFilesHTML}
                </div>
              </div>
              ${isTrackTab ? `
              <div class="panel" style="margin-top:8px;">
                <div class="panel-header">🧭 赛道分析与确认</div>
                <div class="panel-body">
                  <div class="quick-stats">
                    <span>建议赛道: <span class="val">${escapeHTML(suggestedTrack || '未分析')}</span></span>
                    <span>已确认赛道: <span class="val">${escapeHTML(confirmedTrack || '未确认')}</span></span>
                    <span>分拣决策: <span class="val">${escapeHTML(decisionSummary?.decision || '未分析')}</span></span>
                    <span>置信度: <span class="val">${escapeHTML(decisionSummary?.confidence || '未分析')}</span></span>
                  </div>
                  <div class="input-actions" style="margin-top:8px;">
                    <input type="text" id="confirmed-track-input" class="input-title-field" placeholder="手动输入赛道；可输入已有赛道或新赛道名" value="${escapeHTML(confirmedTrack || (isAvailableTrackId(suggestedTrack) ? suggestedTrack : getReferenceTrackName(state.trackAnalysis)))}">
                    <button onclick="confirmTrackFromInput()">✓ 手动确认/创建赛道</button>
                  </div>
                  ${state.trackAnalysis ? renderTrackAnalysisHTML(state.trackAnalysis) : '<span class="empty-state">可以直接手动输入赛道并确认；如需系统判断，再点击“自动判断赛道”。</span>'}
                </div>
              </div>
              ` : `
              <div class="panel" style="margin-top:8px;">
                <div class="panel-header">📊 DNA抽取结果摘要</div>
                <div class="panel-body" id="analysis-summary-preview">
                  <div class="quick-stats" style="margin-bottom:8px;">
                    <span>确认赛道: <span class="val">${escapeHTML(confirmedTrack || '未确认')}</span></span>
                    <span>资产数: <span class="val">${state.totalAssets}</span></span>
                  </div>
                  ${state.extractionSummary ? renderSummaryHTML(state.extractionSummary) : '<span class="empty-state">尚未执行 DNA 抽取，请先确认赛道</span>'}
                </div>
              </div>
              `}
            </div>
          `,
                });
            }

            function estimateChapters(text) {
                const patterns = [
                    /第[一二三四五六七八九十百千\d]+章/g,
                    /Chapter\s+\d+/gi,
                    /\n\d+[\.、]\s+/g,
                    /【\d+】/g,
                ];
                let maxChapters = 0;
                patterns.forEach(p => {
                    const matches = text.match(p);
                    if (matches && matches.length > maxChapters) maxChapters = matches.length;
                });
                return maxChapters || '自动检测中';
            }

            function renderTrackAnalysisHTML(analysis) {
                if (!analysis) return '<span class="empty-state">无赛道分析结果</span>';
                const structure = analysis.structure_signature || {};
                const decision = getTrackDecisionSummary(analysis);
                const seed = analysis.track_card_seed || {};
                const sortingNotes = analysis.sorting_notes || {};
                const evidence = Array.isArray(analysis.evidence) ? analysis.evidence.slice(0, 3) : [];
                const rhythmSkeleton = Array.isArray(analysis.chapter_rhythm_skeleton) ? analysis.chapter_rhythm_skeleton : [];
                const referenceTrack = analysis.reference_track || {};
                return `
                  <div class="asset-record-card" style="margin-top:8px;">
                    <div class="asset-record-title">建议赛道：${escapeHTML(analysis.primary_track || 'UNKNOWN')}</div>
                    <div class="asset-record-meta">确认赛道: ${escapeHTML(state.confirmedTrack || '未确认')} | 样文路径: ${escapeHTML(resolveTrackPath(getResolvedTrack() === 'UNKNOWN' ? 'pending' : 'sample', { track: getResolvedTrack(), story: getStorySlug() }))}</div>
                    <div class="yaml-block">classification_decision: ${escapeHTML(decision.decision)}
decision_reason: ${escapeHTML(decision.reason || '暂无')}
matched_existing_track: ${isAvailableTrackId(analysis.primary_track) ? 'true' : 'false'}
reference_track: ${escapeHTML(referenceTrack.name || '')}
reference_reason: ${escapeHTML(referenceTrack.reason || '')}
track_positioning: ${escapeHTML(analysis.track_positioning || '')}
reader_emotion_needs: ${escapeHTML(getTrackSeedList(analysis.reader_emotion_needs))}
core_gratification_points: ${escapeHTML(getTrackSeedList(analysis.core_gratification_points))}
core_pain_points: ${escapeHTML(getTrackSeedList(analysis.core_pain_points))}
common_character_relations: ${escapeHTML(getTrackSeedList(analysis.common_character_relations))}
chapter_rhythm_skeleton:
${rhythmSkeleton.length ? rhythmSkeleton.map(item => `  - ${escapeHTML(item.stage || '阶段')}: ${escapeHTML(item.function || '')}${item.key_hook ? ` / ${escapeHTML(item.key_hook)}` : ''}`).join('\n') : '  - 暂无'}
taboo_zones: ${escapeHTML(getTrackSeedList(analysis.taboo_zones))}
brainhole_variable_tags: ${escapeHTML(getTrackSeedList(analysis.brainhole_variable_tags))}
reader_expectation: ${escapeHTML(analysis.reader_expectation || '')}
emotional_promise: ${escapeHTML((analysis.emotional_promise || []).join(' / '))}
opening: ${escapeHTML(structure.opening || '')}
development: ${escapeHTML(structure.development || '')}
turn: ${escapeHTML(structure.turn || '')}
ending: ${escapeHTML(structure.ending || '')}
opening_speed: ${escapeHTML(seed.opening_speed || '')}
protagonist_action_mode: ${escapeHTML(seed.protagonist_action_mode || '')}
gratification_type: ${escapeHTML(getTrackSeedList(seed.gratification_type))}
tear_point_type: ${escapeHTML(getTrackSeedList(seed.tear_point_type))}
reversal_position: ${escapeHTML(getTrackSeedList(seed.reversal_position))}
taboo_routines: ${escapeHTML(getTrackSeedList(seed.taboo_routines))}
chapter_rhythm: ${escapeHTML(seed.chapter_rhythm || '')}
why_not_other_tracks: ${escapeHTML(getTrackSeedList(sortingNotes.why_not_other_tracks))}
human_review_required: ${sortingNotes.human_review_required ? 'true' : 'false'}
review_questions: ${escapeHTML(getTrackSeedList(sortingNotes.review_questions))}
risk_notes:
${(analysis.risk_notes || []).map(note => '  - ' + escapeHTML(note)).join('\n') || '  - 无'}</div>
                    ${evidence.length ? `<div class="badge-row" style="margin-top:6px;">${evidence.map(item => `<span class="tag tech" title="${escapeHTML(item.supports_field || '')}">${escapeHTML(String(item.quote || '').slice(0, 30))}</span>`).join('')}</div>` : ''}
                  </div>
                `;
            }

            function renderSummaryHTML(summary) {
                if (!summary) return '<span class="empty-state">无分析结果</span>';
                let html = '<table><tr><th>资产类型</th><th>状态</th><th>记录数</th></tr>';
                getOrderedAssetEntries().forEach(([type, info]) => {
                    const records = state.analysisResults[type] || [];
                    let status = 'not_detected';
                    let statusClass = 'status-not-detected';
                    if (records.length > 0) {
                        status = 'extracted';
                        statusClass = 'status-extracted';
                    } else if (summaryEntryMatchesType(summary.insufficient_evidence, type)) {
                        status = 'insufficient_evidence';
                        statusClass = 'status-insufficient';
                    }
                    html += `
              <tr>
                <td><span class="asset-display-index table-index">${formatDisplayIndex(info.displayIndex)}</span> ${info.icon} ${info.name} <span class="level-tag ${info.level}" style="font-size:9px;">${info.level}</span></td>
                <td class="${statusClass}">${status}</td>
                <td>${records.length}</td>
              </tr>
            `;
                });
                html += '</table>';
                return html;
            }

            function getTrackProductMeta(kind) {
                const meta = {
                    sample: { title: '赛道样文', icon: '📄', format: 'Markdown' },
                    analysis: { title: '赛道分析', icon: '🧭', format: 'JSON' },
                    structureCard: { title: '赛道结构卡', icon: '🗂️', format: 'Markdown' },
                    pending: { title: '待分拣样文', icon: '📥', format: 'Markdown' },
                };
                return meta[kind] || { title: kind, icon: '📁', format: 'Text' };
            }

            function makeTrackStructureCardMarkdown() {
                if (!state.trackAnalysis) {
                    return '尚未执行赛道分析，暂无法生成赛道结构卡预览。';
                }
                const analysis = state.trackAnalysis;
                const structure = analysis.structure_signature || {};
                const seed = analysis.track_card_seed || {};
                const sortingNotes = analysis.sorting_notes || {};
                const decision = getTrackDecisionSummary(analysis);
                const referenceTrack = analysis.reference_track || {};
                const list = values => (Array.isArray(values) && values.length ? values.map(item => `- ${item}`).join('\n') : '- 暂无');
                const rhythmList = values => (Array.isArray(values) && values.length
                    ? values.map(item => `- ${item.stage || '阶段'}：${item.function || '暂无'}${item.key_hook ? `；关键钩子：${item.key_hook}` : ''}`).join('\n')
                    : '- 暂无');
                const evidence = Array.isArray(analysis.evidence) && analysis.evidence.length
                    ? analysis.evidence.map(item => `- [${item.supports_field || '证据'}] ${item.quote || ''}${item.interpretation ? `：${item.interpretation}` : ''}`).join('\n')
                    : '- 暂无';
                return `# ${normalizeTrackId(state.confirmedTrack || analysis.primary_track || 'UNKNOWN')} 赛道结构卡

## 分拣结论
- 建议赛道: ${analysis.primary_track || 'UNKNOWN'}
- 确认赛道: ${state.confirmedTrack || '未确认'}
- 是否命中已有赛道: ${isAvailableTrackId(analysis.primary_track) ? '是' : '否'}
- AI 参考赛道: ${referenceTrack.name || '暂无'}
- 参考原因: ${referenceTrack.reason || '暂无'}
- 分拣决策: ${decision.decision}
- 决策说明: ${decision.reason || '暂无'}

## 赛道定位
${analysis.track_positioning || analysis.reader_expectation || '暂无'}

## 读者情绪需求
${list(analysis.reader_emotion_needs)}

## 核心爽点
${list(analysis.core_gratification_points)}

## 核心虐点
${list(analysis.core_pain_points)}

## 常见人设关系
${list(analysis.common_character_relations)}

## 章节节奏骨架
${rhythmList(analysis.chapter_rhythm_skeleton)}

## 禁忌雷区
${list(analysis.taboo_zones)}

## 适合生成脑洞的变量标签
${list(analysis.brainhole_variable_tags)}

## 读者期待
${analysis.reader_expectation || '暂无'}

## 情绪承诺
${list(analysis.emotional_promise)}

## 结构签名
- opening: ${structure.opening || '暂无'}
- development: ${structure.development || '暂无'}
- turn: ${structure.turn || '暂无'}
- ending: ${structure.ending || '暂无'}

## 结构卡种子
- 开篇速度: ${seed.opening_speed || '暂无'}
- 主角行动方式: ${seed.protagonist_action_mode || '暂无'}
- 爽点类型:
${list(seed.gratification_type)}
- 泪点类型:
${list(seed.tear_point_type)}
- 反转位置:
${list(seed.reversal_position)}
- 禁忌套路:
${list(seed.taboo_routines)}
- 章节节奏: ${seed.chapter_rhythm || '暂无'}

## 分拣备注
- 排除其他赛道:
${list(sortingNotes.why_not_other_tracks)}
- 是否需要人工复核: ${sortingNotes.human_review_required ? '是' : '否'}
- 复核问题:
${list(sortingNotes.review_questions)}

## 风险备注
${list(analysis.risk_notes)}

## 证据
${evidence}`;
            }

            function getTrackProductContent(kind) {
                if (kind === 'pending' && !shouldShowPendingTrackProduct()) {
                    return '当前样文已有明确赛道，不进入待分拣样文。';
                }
                const track = getResolvedTrack();
                const story = getStorySlug();
                if (kind === 'analysis') {
                    return state.trackAnalysis
                        ? JSON.stringify({
                            track_analysis: state.trackAnalysis,
                            suggested_track: state.trackAnalysis?.primary_track || 'UNKNOWN',
                            confirmed_track: state.confirmedTrack || '',
                            resolved_paths: {
                                sample: resolveTrackPath('sample', { track, story }),
                                analysis: resolveTrackPath('analysis', { track, story }),
                                structureCard: resolveTrackPath('structureCard', { track, story }),
                                pending: resolveTrackPath('pending', { track, story }),
                            },
                        }, null, 2)
                        : '尚未执行赛道分析，暂无 JSON 内容。';
                }
                if (kind === 'structureCard') return makeTrackStructureCardMarkdown();
                if (kind === 'pending') {
                    return track === 'UNKNOWN'
                        ? (state.sourceText || '当前没有可分拣样文内容。')
                        : `当前样文已确认赛道为 ${track}，通常不进入待分拣样文。\n\n${state.sourceText || '当前没有样文内容。'}`;
                }
                return state.sourceText || '当前没有样文内容。请先输入文本、上传 TXT 或加载示例文本。';
            }

            function renderTrackProductView(kind) {
                setContainedScroll(false);
                if (!getVisibleTrackProductKinds().includes(kind)) {
                    kind = 'sample';
                }
                const meta = getTrackProductMeta(kind);
                const track = getResolvedTrack();
                const story = getStorySlug();
                const path = resolveTrackPath(kind, { track, story });
                state.currentView = 'trackProduct';
                state.inputTab = 'track';
                state.activeTrackProduct = kind;
                buildSidebar();
                updateMaterialContentView({
                    containedScroll: false,
                    html: `
            <div class="panel track-product-panel">
              <div class="panel-header">
                ${meta.icon} ${escapeHTML(meta.title)}
                <span style="margin-left:auto;font-size:10px;color:var(--text2);">格式: ${escapeHTML(meta.format)}</span>
              </div>
              <div class="panel-body">
                <div class="quick-stats" style="margin-bottom:8px;">
                  <span>赛道: <span class="val">${escapeHTML(track)}</span></span>
                  <span>故事: <span class="val">${escapeHTML(story)}</span></span>
                </div>
                <div class="asset-record-card">
                  <div class="asset-record-title">${meta.icon} ${escapeHTML(path)}</div>
                  <div class="asset-record-meta">点击左侧赛道产物可切换预览；内容来自当前项目已输入或已分析数据。</div>
                  <div class="yaml-block track-product-content">${escapeHTML(getTrackProductContent(kind))}</div>
                </div>
              </div>
            </div>
          `,
                });
            }

            function summaryEntryMatchesType(entries, type) {
                return Array.isArray(entries) && entries.some(entry => {
                    if (!entry) return false;
                    if (typeof entry === 'string') return entry === type;
                    if (typeof entry === 'object') return entry.asset_type === type;
                    return false;
                });
            }

            window.clearInput = async function() {
                if (!requireActiveProjectForMaterialExtraction()) return;
                state.sourceText = '';
                state.sourceTitle = '';
                stateBridge.sourceText = state.sourceText;
                stateBridge.sourceTitle = state.sourceTitle;
                refreshCurrentView();
                try {
                    await saveCurrentMaterialExtraction();
                    showToast('已清空输入框文本');
                } catch (error) {
                    showToast(`⚠️ 保存输入框清空状态失败：${error?.message || '未知错误'}`);
                }
            };

            window.clearTrackProducts = async function() {
                if (!requireActiveProjectForMaterialExtraction()) return;
                state.trackAnalysis = null;
                state.confirmedTrack = '';
                state.uploadedTextFiles = state.uploadedTextFiles.map(file => ({
                    ...file,
                    track: '',
                    trackAnalysis: null,
                    status: file.status === 'done' ? 'ready' : file.status,
                    statusText: file.status === 'done' ? '待处理' : file.statusText,
                }));
                refreshCurrentView();
                try {
                    await saveCurrentMaterialExtraction();
                    await appendMaterialOperationLog({
                        actionType: 'track_products_cleared',
                        title: '清除赛道产物',
                        detail: '已清空建议赛道、确认赛道和已关联的赛道分析结果。',
                    });
                    showToast('已清除赛道产物');
                } catch (error) {
                    showToast(`⚠️ 清除赛道产物失败：${error?.message || '未知错误'}`);
                }
            };

            window.clearAssetLibrary = async function() {
                if (!requireActiveProjectForMaterialExtraction()) return;
                state.analysisResults = {};
                state.extractionSummary = null;
                state.totalAssets = 0;
                updateAssetCount(0);
                state.activeTab = null;
                refreshCurrentView();
                try {
                    await saveCurrentMaterialExtraction();
                    await appendMaterialOperationLog({
                        actionType: 'asset_library_cleared',
                        title: '清除 DNA 资产库',
                        detail: '已清空当前项目的 DNA 资产结果与提取摘要。',
                    });
                    showToast('已清除 DNA 资产库');
                } catch (error) {
                    showToast(`⚠️ 清除资产库失败：${error?.message || '未知错误'}`);
                }
            };

            async function loadExampleTextByCategory(sampleCategory) {
                if (!sampleCategory) return;
                resetCurrentAnalysisForSource(sampleCategory.sampleTitle || DEMO_STORY.title, sampleCategory.sampleText || DEMO_STORY.text);
                renderInputView();
                try {
                    await saveCurrentMaterialExtraction();
                    showToast(sampleCategory.toast || '✅ 已加载示例文本');
                } catch (error) {
                    showToast(`⚠️ 保存示例文本失败：${error?.message || '未知错误'}`);
                }
            }

            window.loadDemoText = async function() {
                await loadExampleTextByCategory({
                    sampleTitle: DEMO_STORY.title,
                    sampleText: DEMO_STORY.text,
                    toast: DEMO_STORY.toast,
                });
            };

            window.setMaterialExampleSearch = function(value) {
                state.exampleSearchKeyword = String(value || '');
                buildSidebar();
            };

            window.openMaterialExample = function(exampleId) {
                void selectMaterialExample(exampleId);
            };

            async function useMaterialExample(exampleId) {
                const example = state.materialExamples.find((item) => item.id === exampleId) || getSelectedMaterialExample();
                if (!example) return;
                applyMaterialExampleToInput(example);
                state.currentView = 'input';
                try {
                    await saveCurrentMaterialExtraction();
                    await appendMaterialOperationLog({
                        actionType: 'material_example_loaded',
                        title: `载入例文：${example.title || '未命名例文'}`,
                        detail: `已从例文库载入正文，长度 ${String(example.content || '').length} 字。`,
                    });
                } finally {
                    refreshCurrentView();
                }
            }

            function openMaterialExampleEditor(exampleId = '') {
                const example = state.materialExamples.find((item) => item.id === exampleId) || null;
                if (!window.__materialCommandModalHost?.openExampleEditor) {
                    console.warn('Material example editor modal host is not ready yet.');
                    return;
                }
                window.__materialCommandModalHost.openExampleEditor({
                    example,
                    onSave: (formState) => {
                        void saveMaterialExampleFromModal(example?.id || '', formState);
                    },
                });
            }

            window.openMaterialExampleEditor = function(exampleId = '') {
                openMaterialExampleEditor(exampleId);
            };

            function triggerMaterialExampleFileUpload() {
                const input = document.getElementById('material-example-file-upload');
                if (input) input.click();
            }

            window.triggerMaterialExampleFileUpload = function() {
                triggerMaterialExampleFileUpload();
            };

            window.handleMaterialExampleFileUpload = async function(event) {
                if (!props.activeProjectId) return;
                const input = event?.target;
                const files = Array.from(input?.files || []);
                if (!files.length) return;

                const { createdCount, skipped } = await createMaterialExamplesFromFiles(files);
                await appendMaterialOperationLog({
                    actionType: 'material_example_files_uploaded',
                    title: `批量上传例文 ${createdCount} 篇`,
                    detail: skipped.length
                        ? `成功 ${createdCount} 篇；跳过 ${skipped.length} 项：${skipped.join('；').slice(0, 500)}`
                        : `成功批量上传 ${createdCount} 篇例文。`,
                    payload: {
                        fileCount: files.length,
                        createdCount,
                        skipped,
                    },
                });
                showToast(skipped.length
                    ? `已导入 ${createdCount} 篇，跳过 ${skipped.length} 项`
                    : `已导入 ${createdCount} 篇例文`);
                if (input) input.value = '';
            };

            function deleteSelectedMaterialExample(exampleId) {
                const example = state.materialExamples.find((item) => item.id === exampleId);
                if (!example || !props.activeProjectId) return;
                if (!window.__materialCommandModalHost?.openExampleDelete) {
                    console.warn('Material example delete modal host is not ready yet.');
                    return;
                }
                window.__materialCommandModalHost.openExampleDelete({
                    example,
                    onConfirm: (targetExampleId) => {
                        void confirmDeleteMaterialExample(targetExampleId);
                    },
                });
            }

            async function confirmDeleteMaterialExample(exampleId) {
                if (!props.activeProjectId) return;
                await deleteMaterialExample(props.activeProjectId, exampleId);
                await loadMaterialExamplesState();
                if (window.__materialCommandModalHost?.closeExampleDelete) {
                    window.__materialCommandModalHost.closeExampleDelete();
                }
                refreshCurrentView();
            }

            function makeUploadedTextFileId(file, index = 0) {
                return `txt_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
            }

            function inferTitleFromFileName(name = '') {
                return String(name || '')
                    .replace(/\.[^.]+$/, '')
                    .replace(/[_-]+/g, ' ')
                    .trim();
            }

            function resetCurrentAnalysisForSource(title, text) {
                state.sourceTitle = title;
                state.sourceText = text;
                stateBridge.sourceTitle = state.sourceTitle;
                stateBridge.sourceText = state.sourceText;
                state.trackAnalysis = null;
                state.confirmedTrack = '';
                state.analysisResults = {};
                state.extractionSummary = null;
                state.totalAssets = 0;
                updateAssetCount(0);
            }

            function applyUploadedTextFile(file) {
                if (!file) return;
                resetCurrentAnalysisForSource(file.title || inferTitleFromFileName(file.name), file.text || '');
                if (file.trackAnalysis) {
                    state.trackAnalysis = normalizeTrackAnalysisState(file.trackAnalysis, {
                        storyTitle: file.title || inferTitleFromFileName(file.name),
                    });
                    state.confirmedTrack = normalizeConfirmedTrackValue(file.confirmedTrack);
                }
            }

            async function readTxtFileAsUtf8(file) {
                const buffer = await file.arrayBuffer();
                return new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '');
            }

            window.handleTxtFileUpload = async function(event) {
                if (!requireActiveProjectForMaterialExtraction()) return;
                const input = event?.target;
                const files = Array.from(input?.files || []);
                if (!files.length) return;

                const txtFiles = files.filter(file => {
                    const name = String(file.name || '').toLowerCase();
                    return name.endsWith('.txt') || file.type === 'text/plain';
                });
                if (!txtFiles.length) {
                    showToast('⚠️ 请选择 UTF-8 编码的 .txt 文件');
                    if (input) input.value = '';
                    return;
                }

                const loaded = [];
                for (const [index, file] of txtFiles.entries()) {
                    try {
                        const text = (await readTxtFileAsUtf8(file)).trim();
                        if (text.length < 20) {
                            loaded.push({
                                id: makeUploadedTextFileId(file, index),
                                name: file.name,
                                title: inferTitleFromFileName(file.name),
                                text,
                                status: 'error',
                                statusText: '少于20字',
                            });
                            continue;
                        }
                        loaded.push({
                            id: makeUploadedTextFileId(file, index),
                            name: file.name,
                            title: inferTitleFromFileName(file.name),
                            text,
                            status: 'ready',
                            statusText: '待处理',
                        });
                    } catch (error) {
                        loaded.push({
                            id: makeUploadedTextFileId(file, index),
                            name: file.name,
                            title: inferTitleFromFileName(file.name),
                            text: '',
                            status: 'error',
                            statusText: '读取失败',
                        });
                    }
                }

                state.uploadedTextFiles = [...state.uploadedTextFiles, ...loaded];
                const firstValidFile = loaded.find(file => file.text.length >= 20);
                if (firstValidFile) {
                    applyUploadedTextFile(firstValidFile);
                    try {
                        await saveCurrentMaterialExtraction();
                    } catch (error) {
                        showToast(`⚠️ 保存上传文本失败：${error?.message || '未知错误'}`);
                    }
                }
                renderInputView();
                await appendMaterialOperationLog({
                    actionType: 'text_uploaded',
                    title: `上传 TXT 文件 ${loaded.length} 个`,
                    detail: loaded.map(file => `${file.title || file.name}（${file.statusText || file.status || '待处理'}）`).join('；').slice(0, 500),
                    payload: {
                        fileCount: loaded.length,
                    },
                });
                showToast(`已上传 ${loaded.length} 个 TXT 文件，按 UTF-8 解析`);
                if (input) input.value = '';
            };

            window.loadUploadedTextFile = async function(fileId) {
                if (!requireActiveProjectForMaterialExtraction()) return;
                const file = state.uploadedTextFiles.find(item => item.id === fileId);
                if (!file) return;
                if (!file.text || file.text.length < 20) {
                    showToast('⚠️ 该文件正文少于20字，无法载入分析');
                    return;
                }
                applyUploadedTextFile(file);
                renderInputView();
                try {
                    await saveCurrentMaterialExtraction();
                    await appendMaterialOperationLog({
                        actionType: 'text_loaded',
                        title: `载入作品：${file.title || file.name}`,
                        detail: `已把上传文件载入当前分析区，正文长度 ${file.text.length} 字。`,
                    });
                    showToast(`已载入：${file.title || file.name}`);
                } catch (error) {
                    showToast(`⚠️ 保存载入文本失败：${error?.message || '未知错误'}`);
                }
            };

            window.removeUploadedTextFile = function(fileId) {
                const removedFile = state.uploadedTextFiles.find(file => file.id === fileId);
                state.uploadedTextFiles = state.uploadedTextFiles.filter(file => file.id !== fileId);
                renderInputView();
                void appendMaterialOperationLog({
                    actionType: 'text_removed',
                    title: `移除上传文件：${removedFile?.title || removedFile?.name || '未知文件'}`,
                    detail: '已从上传列表中移除该文本文件。',
                });
            };

            function setTrackAnalysisPending(pending) {
                state.trackAnalysisPending = pending;
                const button = document.getElementById('btn-run-track-analysis-panel');
                if (!button) return;
                button.disabled = pending;
                button.textContent = pending ? '⏳ 判断中...' : '🧭 自动判断赛道';
            }

            function setExtractionPending(pending) {
                state.extractionPending = pending;
                const button = document.getElementById('btn-run-analysis-panel');
                if (!button) return;
                button.disabled = pending;
                button.textContent = pending ? '⏳ DNA抽取中...' : '🧬 DNA抽取';
            }

            function setBatchTrackPending(pending) {
                state.batchTrackPending = pending;
                const button = document.getElementById('btn-run-batch-track-analysis');
                if (!button) return;
                button.disabled = pending || !state.uploadedTextFiles.length;
                button.textContent = pending ? '⏳ 批量分析中...' : '📚 批量赛道分析';
            }

            function normalizeAnalysisResults(results) {
                return normalizeAssetAnalysisResults(results, ASSET_TYPE_REGISTRY, {
                    getPathVariables,
                    resolveTemplate,
                    makeSuggestedFilename,
                });
            }

            function normalizeTrackAnalysisState(analysis, options = {}) {
                return normalizeTrackAnalysis(analysis, {
                    storyTitle: options.storyTitle || getStoryTitle(),
                    fallbackStoryTitle: EXTRACTION_RULES.fallbackStoryTitle,
                    overrideTrack: options.overrideTrack || '',
                });
            }

            function requireActiveProjectForMaterialExtraction() {
                if (props.activeProjectId) return true;
                showToast('⚠️ 请先创建或打开一个项目，再使用素材抽取');
                return false;
            }

            async function saveCurrentMaterialExtraction() {
                if (!props.activeProjectId) return;
                stateBridge.sourceTitle = state.sourceTitle;
                stateBridge.sourceText = state.sourceText;
                await saveMaterialExtractionRecord(props.activeProjectId, {
                    sourceTitle: state.sourceTitle,
                    sourceText: state.sourceText,
                    trackAnalysis: state.trackAnalysis,
                    confirmedTrack: state.confirmedTrack,
                    analysisResults: state.analysisResults,
                    extractionSummary: state.extractionSummary,
                    totalAssets: state.totalAssets,
                });
                await loadMaterialExamplesState();
            }

            async function loadCurrentMaterialExtraction(options = {}) {
                if (!props.activeProjectId) return;

                try {
                    const saved = await fetchMaterialExtractionRecord(props.activeProjectId);
                    if (!saved) return;

                    state.sourceTitle = saved.sourceTitle || '';
                    state.sourceText = saved.sourceText || '';
                    stateBridge.sourceTitle = state.sourceTitle;
                    stateBridge.sourceText = state.sourceText;
                    state.trackAnalysis = saved.trackAnalysis
                        ? normalizeTrackAnalysisState(saved.trackAnalysis, {
                            storyTitle: saved.sourceTitle || '',
                        })
                        : null;
                    state.confirmedTrack = normalizeConfirmedTrackValue(saved.confirmedTrack);
                    state.analysisResults = normalizeAnalysisResults(saved.analysisResults || {});
                    state.extractionSummary = saved.extractionSummary || null;
                    state.totalAssets = Number(saved.totalAssets || 0);
                    updateAssetCount(state.totalAssets);
                    renderInputView();
                    updateSidebarBadges();
                    if (!options.silent) {
                        showToast('已恢复当前项目的素材抽取数据');
                    }
                } catch (error) {
                    showToast(`⚠️ 素材抽取数据读取失败：${error?.message || '未知错误'}`);
                }
            }

            function applyAiExtractionResult(result) {
                const normalizedSummary = result?.extraction_summary || {};
                state.analysisResults = normalizeAnalysisResults(result?.analysis_results);
                state.extractionSummary = {
                    source_story: normalizedSummary.source_story || getStoryTitle(),
                    mode: normalizedSummary.mode || 'quick',
                    confirmed_track: state.confirmedTrack || normalizedSummary.confirmed_track || 'UNKNOWN',
                    extracted_assets: Array.isArray(normalizedSummary.extracted_assets) ? normalizedSummary.extracted_assets : [],
                    not_detected: Array.isArray(normalizedSummary.not_detected) ? normalizedSummary.not_detected : [],
                    insufficient_evidence: Array.isArray(normalizedSummary.insufficient_evidence) ? normalizedSummary.insufficient_evidence : [],
                    validation_warnings: Array.isArray(normalizedSummary.validation_warnings) ? normalizedSummary.validation_warnings : [],
                    prompt_sources: Array.isArray(normalizedSummary.prompt_sources) ? normalizedSummary.prompt_sources : [],
                };
                state.totalAssets = Object.values(state.analysisResults).reduce((sum, arr) => sum + arr.length, 0);
                state.extractionSummary.total_assets = state.totalAssets;
                updateAssetCount(state.totalAssets);
                renderInputView();
                updateSidebarBadges();
                showToast('✅ AI 分析完成！共提取 ' + state.totalAssets + ' 条资产记录');
            }

            function applyTrackAnalysisResult(result, options = {}) {
                const analysis = result?.track_analysis || {};
                state.trackAnalysis = normalizeTrackAnalysisState(analysis);
                const primaryTrack = state.trackAnalysis.primary_track;
                if (isAvailableTrackId(primaryTrack)) {
                    state.confirmedTrack = primaryTrack;
                } else {
                    state.confirmedTrack = '';
                }
                renderInputView();
                if (!options.silent) {
                    if (isAvailableTrackId(primaryTrack)) {
                        showToast(`✅ 自动归类成功：${primaryTrack}`);
                    } else {
                        showToast('⚠️ 未命中已有赛道，请手动决定归类');
                        showTrackDecisionModal(state.trackAnalysis);
                    }
                }
                return primaryTrack;
            }

            async function confirmTrackValue(nextTrack, options = {}) {
                if (!requireActiveProjectForMaterialExtraction()) return false;
                nextTrack = normalizeTrackId(nextTrack || '');
                if (!nextTrack) {
                    showToast('⚠️ 请输入确认赛道；无法判断时填 UNKNOWN');
                    return false;
                }

                if (nextTrack !== UNKNOWN_TRACK_ID && !isAvailableTrackId(nextTrack)) {
                    try {
                        const createdTrack = await createMaterialTrackRecord(nextTrack);
                        refreshAvailableTrackIds([...getAvailableTrackIds(), createdTrack?.id || nextTrack]);
                    } catch (error) {
                        showToast(`⚠️ 创建赛道失败：${error?.message || '未知错误'}`);
                        return false;
                    }
                }

                state.confirmedTrack = nextTrack;
                if (state.trackAnalysis) {
                    const nextRiskNotes = nextTrack === 'UNKNOWN' && (!state.trackAnalysis.risk_notes || state.trackAnalysis.risk_notes.length === 0)
                        ? ['用户手动确认 UNKNOWN：原赛道分析未保留足够原因。']
                        : state.trackAnalysis.risk_notes;
                    state.trackAnalysis = normalizeTrackAnalysisState({
                        ...state.trackAnalysis,
                        reference_track: {
                            ...(state.trackAnalysis.reference_track || {}),
                            name: options.source === 'modal_create' || options.source === 'manual_create'
                                ? nextTrack
                                : (state.trackAnalysis.reference_track?.name || ''),
                            reason: options.detail || state.trackAnalysis.reference_track?.reason || '',
                            should_create: !isAvailableTrackId(nextTrack) && nextTrack !== UNKNOWN_TRACK_ID,
                        },
                        risk_notes: nextRiskNotes,
                    });
                } else {
                    state.trackAnalysis = makeManualTrackAnalysis(nextTrack, options.detail || '用户手动输入赛道，未执行自动判断。');
                }
                state.analysisResults = normalizeAnalysisResults(state.analysisResults);
                if (state.extractionSummary) {
                    state.extractionSummary = {
                        ...state.extractionSummary,
                        confirmed_track: nextTrack,
                    };
                }
                renderInputView();
                updateSidebarBadges();
                try {
                    await saveCurrentMaterialExtraction();
                    await appendMaterialOperationLog({
                        actionType: 'track_confirmed',
                        title: `确认赛道：${nextTrack}`,
                        detail: state.trackAnalysis
                            ? `已为当前作品确认赛道 ${nextTrack}。`
                            : `用户手动确认赛道 ${nextTrack}，当前无完整赛道分析结果。`,
                        payload: {
                            confirmedTrack: nextTrack,
                            source: options.source || 'manual',
                            isKnownTrack: isAvailableTrackId(nextTrack),
                            availableTracks: getAvailableTrackIds(),
                        },
                    });
                    showToast(isAvailableTrackId(nextTrack) || nextTrack === UNKNOWN_TRACK_ID
                        ? `已确认赛道：${nextTrack}`
                        : `已创建并确认赛道：${nextTrack}`);
                    return true;
                } catch (error) {
                    showToast(`⚠️ 保存确认赛道失败：${error?.message || '未知错误'}`);
                    return false;
                }
            }

            window.confirmTrackFromInput = async function() {
                if (!requireActiveProjectForMaterialExtraction()) return;
                const input = document.getElementById('confirmed-track-input');
                const nextTrack = normalizeConfirmedTrackValue(input?.value || '');
                await confirmTrackValue(nextTrack, {
                    source: isAvailableTrackId(nextTrack) || nextTrack === UNKNOWN_TRACK_ID ? 'manual_existing' : 'manual_create',
                    detail: isAvailableTrackId(nextTrack) || nextTrack === UNKNOWN_TRACK_ID
                        ? `用户手动确认已有赛道 ${nextTrack}。`
                        : `用户手动创建并确认新赛道 ${nextTrack}。`,
                });
            };

            function syncInputState() {
                const titleInput = document.getElementById('input-title');
                const textInput = document.getElementById('input-text');
                if (titleInput) state.sourceTitle = titleInput.value.trim();
                if (textInput) state.sourceText = textInput.value.trim();
                stateBridge.sourceTitle = state.sourceTitle;
                stateBridge.sourceText = state.sourceText;
            }

            function hasValidAiConfig(aiConfig) {
                const normalized = normalizeAiConfig(aiConfig);
                return Boolean(normalized.apiEndpoint && normalized.apiKey && normalized.model);
            }

            window.runTrackAnalysis = async function() {
                if (!requireActiveProjectForMaterialExtraction()) return;
                syncInputState();

                if (!state.sourceText || state.sourceText.length < 20) {
                    showToast('⚠️ 请输入至少20字的文本');
                    return;
                }

                const aiConfig = normalizeAiConfig(props.aiConfig);
                if (!hasValidAiConfig(aiConfig)) {
                    showToast('⚠️ AI 配置不完整，请返回主页面完成 API 配置');
                    return;
                }

                try {
                    setTrackAnalysisPending(true);
                    await appendMaterialOperationLog({
                        actionType: 'track_analysis_started',
                        title: `开始赛道分析：${getStoryTitle()}`,
                        detail: `正文长度 ${state.sourceText.length} 字。`,
                    });
                    showToast('⏳ 正在请求 AI 赛道分析，请稍候...', 2500);
                    const result = await requestTrackAnalysis(aiConfig, {
                        title: state.sourceTitle,
                        text: state.sourceText,
                        promptConfigs: materialPromptConfigs,
                        availableTracks: getAvailableTrackIds(),
                    });
                    applyTrackAnalysisResult(result);
                    await saveCurrentMaterialExtraction();
                    await appendMaterialOperationLog({
                        actionType: 'track_analysis_completed',
                        title: `赛道分析完成：${state.trackAnalysis?.primary_track || 'UNKNOWN'}`,
                        detail: `建议赛道 ${state.trackAnalysis?.primary_track || 'UNKNOWN'}，置信度 ${state.trackAnalysis?.confidence || 'low'}。`,
                        payload: {
                            primaryTrack: state.trackAnalysis?.primary_track || 'UNKNOWN',
                            confidence: state.trackAnalysis?.confidence || 'low',
                        },
                    });
                    showToast('✅ 赛道分析完成，结果已保存到当前项目');
                } catch (error) {
                    const message = error?.message || 'AI 赛道分析失败';
                    await appendMaterialOperationLog({
                        actionType: 'track_analysis_failed',
                        title: `赛道分析失败：${getStoryTitle()}`,
                        detail: message,
                    });
                    showToast(`⚠️ ${message}`);
                } finally {
                    setTrackAnalysisPending(false);
                }
            };

            window.runBatchTrackAnalysis = async function() {
                if (!requireActiveProjectForMaterialExtraction()) return;
                syncInputState();

                const filesToAnalyze = state.uploadedTextFiles.filter(file => file.text && file.text.length >= 20);
                if (!filesToAnalyze.length) {
                    showToast('⚠️ 请先上传至少一个20字以上的 TXT 文件');
                    return;
                }

                const aiConfig = normalizeAiConfig(props.aiConfig);
                if (!hasValidAiConfig(aiConfig)) {
                    showToast('⚠️ AI 配置不完整，请返回主页面完成 API 配置');
                    return;
                }

                let successCount = 0;
                try {
                    setBatchTrackPending(true);
                    showToast(`⏳ 开始批量赛道分析：${filesToAnalyze.length} 篇`, 2500);
                    for (const [index, file] of filesToAnalyze.entries()) {
                        const fileIndex = state.uploadedTextFiles.findIndex(item => item.id === file.id);
                        if (fileIndex < 0) continue;
                        state.uploadedTextFiles[fileIndex] = {
                            ...state.uploadedTextFiles[fileIndex],
                            status: 'running',
                            statusText: `分析中 ${index + 1}/${filesToAnalyze.length}`,
                        };
                        applyUploadedTextFile(state.uploadedTextFiles[fileIndex]);
                        renderInputView();

                        try {
                            const result = await requestTrackAnalysis(aiConfig, {
                                title: state.sourceTitle,
                                text: state.sourceText,
                                promptConfigs: materialPromptConfigs,
                                availableTracks: getAvailableTrackIds(),
                            });
                            const primaryTrack = applyTrackAnalysisResult(result, { silent: true });
                            const matchedExistingTrack = isAvailableTrackId(primaryTrack);
                            state.uploadedTextFiles[fileIndex] = {
                                ...state.uploadedTextFiles[fileIndex],
                                status: matchedExistingTrack ? 'done' : 'ready',
                                statusText: matchedExistingTrack ? '已自动归类' : '待人工归类',
                                track: primaryTrack,
                                confirmedTrack: matchedExistingTrack ? primaryTrack : '',
                                trackAnalysis: state.trackAnalysis,
                            };
                            successCount += 1;
                            await saveCurrentMaterialExtraction();
                        } catch (error) {
                            state.uploadedTextFiles[fileIndex] = {
                                ...state.uploadedTextFiles[fileIndex],
                                status: 'error',
                                statusText: error?.message || '分析失败',
                            };
                        }
                    }

                    const lastDone = [...state.uploadedTextFiles].reverse().find(file => file.trackAnalysis);
                    if (lastDone) applyUploadedTextFile(lastDone);
                    renderInputView();
                    if (lastDone) await saveCurrentMaterialExtraction();
                    await appendMaterialOperationLog({
                        actionType: 'batch_track_analysis_completed',
                        title: `批量赛道分析完成：${successCount}/${filesToAnalyze.length}`,
                        detail: `已完成 ${successCount} 篇，共处理 ${filesToAnalyze.length} 篇。`,
                        payload: {
                            successCount,
                            totalCount: filesToAnalyze.length,
                        },
                    });
                    showToast(`✅ 批量赛道分析完成：成功 ${successCount}/${filesToAnalyze.length}`);
                } finally {
                    setBatchTrackPending(false);
                }
            };

            window.runAnalysis = async function() {
                if (!requireActiveProjectForMaterialExtraction()) return;
                syncInputState();

                if (!state.sourceText || state.sourceText.length < 20) {
                    showToast('⚠️ 请输入至少20字的文本');
                    return;
                }

                if (!state.confirmedTrack) {
                    showToast('⚠️ 请先执行赛道分析并确认赛道；无法判断时请确认 UNKNOWN');
                    return;
                }

                if (state.confirmedTrack === 'UNKNOWN' && state.trackAnalysis && (!state.trackAnalysis.risk_notes || state.trackAnalysis.risk_notes.length === 0)) {
                    showToast('⚠️ UNKNOWN 赛道必须保留无法判断原因，请重新赛道分析或补充确认说明');
                    return;
                }

                const aiConfig = normalizeAiConfig(props.aiConfig);
                if (!hasValidAiConfig(aiConfig)) {
                    showToast('⚠️ AI 配置不完整，请返回主页面完成 API 配置');
                    return;
                }

                try {
                    setExtractionPending(true);
                    await appendMaterialOperationLog({
                        actionType: 'dna_extraction_started',
                        title: `开始 DNA 抽取：${getStoryTitle()}`,
                        detail: `已确认赛道 ${state.confirmedTrack}，正文长度 ${state.sourceText.length} 字。`,
                    });
                    showToast('⏳ 正在请求 AI DNA 抽取，请稍候...', 2500);
                    const result = await requestAssetExtraction(aiConfig, {
                        title: state.sourceTitle,
                        text: state.sourceText,
                        mode: 'full',
                        confirmedTrack: state.confirmedTrack,
                        trackAnalysis: state.trackAnalysis,
                        promptConfigs: materialPromptConfigs,
                    });
                    applyAiExtractionResult(result);
                    await saveCurrentMaterialExtraction();
                    await appendMaterialOperationLog({
                        actionType: 'dna_extraction_completed',
                        title: `DNA 抽取完成：${state.totalAssets} 条资产`,
                        detail: `已生成 ${state.totalAssets} 条资产，确认赛道 ${state.confirmedTrack || 'UNKNOWN'}。`,
                        payload: {
                            totalAssets: state.totalAssets,
                            confirmedTrack: state.confirmedTrack || 'UNKNOWN',
                            assetSummaries: buildMaterialAssetLogSummary(state.analysisResults),
                        },
                    });
                    showToast('✅ DNA 抽取完成，结果已保存到当前项目');
                } catch (error) {
                    const message = error?.message || 'AI DNA 抽取失败';
                    await appendMaterialOperationLog({
                        actionType: 'dna_extraction_failed',
                        title: `DNA 抽取失败：${getStoryTitle()}`,
                        detail: message,
                    });
                    showToast(`⚠️ ${message}`);
                } finally {
                    setExtractionPending(false);
                }
            };

            // ==================== ANALYSIS HELPERS ====================
            function getStoryTitle() {
                return state.sourceTitle || EXTRACTION_RULES.fallbackStoryTitle;
            }

            function getStorySlug() {
                return sanitizePathPart(getStoryTitle(), EXTRACTION_RULES.fallbackAssetSlug);
            }

            function makeAssetId(prefix, index = 1) {
                return `${prefix}_${getStorySlug()}_${String(index).padStart(2, '0')}`;
            }

            function matchKeywordRule(text, rules, fallback = null) {
                return rules.find(rule => rule.keywords?.some(keyword => text.includes(keyword))) || fallback;
            }

            function scoreKeywordRule(text, rules, minScore = 2) {
                let best = { name: 'UNKNOWN', score: 0 };
                rules.forEach(rule => {
                    const score = rule.keywords.filter(keyword => text.includes(keyword)).length;
                    if (score > best.score) best = { name: rule.name, score };
                });
                return best.score >= minScore ? best.name : 'UNKNOWN';
            }

            function regexRuleMatches(text, rules) {
                return rules.filter(rule => {
                    rule.pattern.lastIndex = 0;
                    return rule.pattern.test(text);
                });
            }

            function makeEvidence(text, interpretation, chapter = 1) {
                return {
                    chapter,
                    paragraph_index: 1,
                    approx_char_offset: 0,
                    quote: text.substring(0, 150).trim(),
                    interpretation,
                };
            }

            function getPathVariables(assetType = '', index = 1) {
                const track = getResolvedTrack();
                return {
                    track,
                    track_id: track,
                    story: getStorySlug(),
                    story_slug: getStorySlug(),
                    asset_type: assetType,
                    index: String(index).padStart(2, '0'),
                    feature: '通用',
                };
            }

            function resolveTemplate(template, variables) {
                const assetPath = variables?.asset_type ? resolveRegisteredAssetPath(variables.asset_type, { track: variables.track }) : '';
                if (assetPath) return assetPath;
                return template
                    .replaceAll('[赛道]', variables.track || 'UNKNOWN')
                    .replaceAll('[track_id]', variables.track || 'UNKNOWN')
                    .replaceAll('[故事名]', variables.story)
                    .replaceAll('[story_slug]', variables.story)
                    .replaceAll('[特征]', variables.feature)
                    .replaceAll('[子类]', variables.feature);
            }

            function makeSuggestedFilename(assetType, info, index = 1) {
                const vars = getPathVariables(assetType, index);
                return makeRegisteredAssetFilename(assetType, {
                    track: vars.track,
                    story: vars.story,
                    index,
                });
            }

            function detectChapters(text) {
                const chapterPatterns = [
                    /第[一二三四五六七八九十百千\d]+章\s*[^\n]*/g,
                    /Chapter\s+\d+[^\n]*/gi,
                    /\n\d+[\.、]\s+[^\n]+/g,
                ];
                let chapters = [];
                chapterPatterns.forEach(pattern => {
                    const matches = text.match(pattern);
                    if (matches && matches.length > chapters.length) {
                        const splits = text.split(pattern);
                        chapters = matches.map((m, i) => ({
                            title: m.trim(),
                            content: (splits[i + 1] || '').trim(),
                        }));
                    }
                });
                if (chapters.length === 0) {
                    // Fallback: split by double newlines into pseudo-chapters
                    const paras = text.split(/\n\n\n+/).filter(p => p.trim());
                    if (paras.length >= 3) {
                        chapters = paras.map((p, i) => ({ title: '段落' + (i + 1), content: p.trim() }));
                    } else {
                        chapters = [{ title: '全文', content: text }];
                    }
                }
                return chapters;
            }

            function detectGenre(text) {
                return scoreKeywordRule(text, EXTRACTION_RULES.genreProfiles);
            }

            function detectCoreEmotion(text) {
                return matchKeywordRule(text, EXTRACTION_RULES.coreEmotionRules)?.emotion || '期待';
            }

            function detectEmotionNodes(text, chapters) {
                const nodes = [];
                EXTRACTION_RULES.emotionNodeRules.forEach(e => {
                    e.pattern.lastIndex = 0;
                    const match = text.match(e.pattern);
                    if (match) {
                        nodes.push({
                            position_percent: Math.round(e.pos * 100) + '%',
                            event: match[0],
                            emotion: e.emotion,
                            description: e.desc,
                        });
                    }
                });
                return nodes;
            }

            function estimatePhases(text, chapters, totalWords) {
                return EXTRACTION_RULES.phaseModel.map(phase => ({
                    phase: phase.phase,
                    word_ratio: phase.word_ratio,
                    emotion_curve: phase.emotion_curve,
                    key_events: phase.eventKeywords,
                }));
            }

            function detectHooks(text, chapters) {
                const hooks = [];
                EXTRACTION_RULES.hookRules.forEach((rule, index) => {
                    rule.pattern.lastIndex = 0;
                    if (rule.pattern.test(text)) {
                        hooks.push({ chapter: Math.min(index + 1, chapters.length || 1), type: rule.type,
                            content: rule.content });
                    }
                });
                return hooks;
            }

            function estimateConflictCurve(text, chapters) {
                return chapters.map((ch, i) => ({
                    chapter: i + 1,
                    intensity: i === 0 ? '中' : i === chapters.length - 2 ? '高' : i === chapters.length - 1 ?
                        '极高' : '中',
                    event: ch.title || '章节' + (i + 1),
                }));
            }

            function detectEmotionalAnchors(text) {
                const anchors = [];
                const patterns = [
                    { pattern: /哭|眼泪|沉默.*久|对不起/g, type: '亲情/心疼', intensity: '高' },
                    { pattern: /掌声|赢了|雷鸣般|喝彩/g, type: '希望/爽感', intensity: '极高' },
                    { pattern: /攥紧|坚定|不容置疑|不会让/g, type: '决心', intensity: '中' },
                ];
                patterns.forEach(p => {
                    const matches = text.match(p.pattern);
                    if (matches && matches.length >= 2) {
                        anchors.push({
                            scene: p.type + '场景',
                            type: p.type.split('/')[0],
                            intensity: p.intensity,
                            sensory_details: [matches[0], matches[1] || matches[0]],
                            reusable_writing: '用【动作细节】+【旁观者反应】强化' + p.type,
                        });
                    }
                });
                return anchors.slice(0, 5);
            }

            function detectSuspense(text, chapters) {
                const hook = detectHooks(text, chapters)[0];
                const coreQ = hook ? `主角能否完成「${hook.content}」带来的关键转变？` : null;
                if (!coreQ) return { core_question: null, setup_points: [], delay_tactics: [], resolution_node: '',
                    information_gap_type: '角色知大于读者知', information_gap_effect: '探究欲' };
                return {
                    core_question: coreQ,
                    setup_points: ['开篇确立目标', '引入阻碍或竞争者'],
                    delay_tactics: ['延迟揭示关键规则', '通过行动铺垫解决能力'],
                    resolution_node: chapters.length >= 4 ? '第' + chapters.length + '章' : '结局',
                    information_gap_type: '角色知大于读者知',
                    information_gap_effect: '探究欲',
                };
            }

            function detectGratificationFormulas(text) {
                const formulas = [];
                EXTRACTION_RULES.gratificationRules.forEach(rule => {
                    rule.pattern.lastIndex = 0;
                    if (rule.pattern.test(text)) {
                    formulas.push({
                            formula_name: rule.name,
                            core_mechanics: rule.mechanics,
                            key_moments: rule.moments,
                    });
                    }
                });
                return formulas;
            }

            function detectIntro(text) {
                const firstPara = text.split(/\n\n+/)[0]?.trim() || text.substring(0, 200);
                if (!firstPara) return null;
                return {
                    intro_text: firstPara.substring(0, 200),
                    structure_breakdown: { first: '困境锚定', middle: '冲突升级', last: '悬念钩子' },
                    hook_type: text.includes('重生') ? '反常型' : '悬念型',
                    info_density: firstPara.length < 150 ? '高' : '中',
                    emotion_trigger: '好奇/心疼',
                    reusable_template: '【时间锚点】+【身份困境】+【前世遗憾简述】→ 钩子：重生后的选择',
                };
            }

            function detectOpening(text) {
                const opening = text.substring(0, 500);
                return {
                    opening_range: '正文前500字',
                    hook_formula: text.includes('重生') ? '反常设定型' : '冲突前置型',
                    four_elements_check: {
                        first_person: text.includes('我') || text.includes('林晚'),
                        extreme_dilemma: !!opening.match(/退学|让出|放弃|困在/),
                        emotion_poke: text.includes('哭') ? '心疼' : '愤怒',
                        suspense_gap: !!opening.match(/重生|回到|上辈子/),
                    },
                    info_release: { '0-100': '重生设定+核心困境', '100-300': '前世遗憾+今生决心',
                        '300-500': '具体行动目标' },
                    reusable_template: '【重生时刻】+【核心困境重现】+【前世对比】→ 钩子：这一次的选择',
                };
            }

            function detectAgencyCurve(text, chapters) {
                const curve = [];
                EXTRACTION_RULES.agencyRules.forEach((ap, i) => {
                    ap.pattern.lastIndex = 0;
                    if (text.match(ap.pattern)) {
                        curve.push({ plot_node: chapters[Math.min(i, chapters.length - 1)]?.title || '节点' + (
                                i + 1), agency_level: ap.level, decision_impact: ap.impact });
                    }
                });
                return curve;
            }

            function calcInitiativeRatio(curve) {
                const active = curve.filter(c => c.agency_level.includes('主动')).length;
                return curve.length > 0 ? Math.round((active / curve.length) * 100) / 100 : 0;
            }

            function detectStructuralSkeleton(text, chapters) {
                const phases = EXTRACTION_RULES.phaseModel.map((phase, index) => {
                    const chapter = chapters[Math.min(index, Math.max(chapters.length - 1, 0))];
                    return {
                        phase: index + 1,
                        name: phase.phase,
                        trigger: phase.eventKeywords[0] || '关键节点',
                        action: extractCoreEvent(chapter?.content || text),
                        emotion_function: phase.emotion_curve,
                        position: chapter?.title || `阶段${index + 1}`,
                        example: extractCoreEvent(chapter?.content || text),
                    };
                });
                return {
                    structural_pattern: chapters.length >= 4 ? '起承转合推进型' : '短篇三段推进型',
                    core_mechanism: phases.map(p => p.name).join('→'),
                    phases,
                    character_arc_alignment: '从受压/困境进入主动选择，再通过结果完成价值确认',
                };
            }

            function detectCharacterHighlights(text) {
                const highlights = [];
                EXTRACTION_RULES.highlightRules.forEach(rule => {
                    rule.pattern.lastIndex = 0;
                    if (rule.pattern.test(text)) {
                    highlights.push({
                            scene: rule.scene,
                            dilemma: rule.dilemma,
                            choice: rule.choice,
                            basis: rule.basis,
                            character_reinforcement: rule.reinforcement,
                    });
                    }
                });
                return highlights;
            }

            function detectHighOctaneScenes(text) {
                const scenes = [];
                EXTRACTION_RULES.highOctaneRules.forEach(rule => {
                    rule.pattern.lastIndex = 0;
                    if (rule.pattern.test(text)) {
                    scenes.push({
                            scene: rule.scene,
                            type: rule.type,
                            technique: rule.technique,
                            reusable_template: rule.template,
                    });
                    }
                });
                return scenes;
            }

            function detectConflictEscalation(text, chapters) {
                const stages = [];
                EXTRACTION_RULES.conflictRules.forEach(cp => {
                    cp.pattern.lastIndex = 0;
                    if (text.match(cp.pattern)) stages.push(cp);
                });
                return stages;
            }

            function detectStructuralTechniques(text) {
                const techniques = [];
                // Check for 对比反差
                if (text.includes('上辈子') && text.includes('这辈子') || text.includes('重生') && text.includes(
                        '不会再让')) {
                    techniques.push({
                        name: '对比反差',
                        description: '前后状态对比强化主角转变',
                        nodes: [
                            { sequence: 1, scene: '开篇', content: '旧状态/旧选择', function: '铺垫对比基线' },
                            { sequence: 2, scene: '转折后', content: '新选择/新行动', function: '反差强化' },
                        ],
                        effect_summary: '通过前后状态的强烈对比，让主角转变更具冲击力',
                    });
                }
                // Check for 重复强化
                const struggleCount = (text.match(/苦读|深夜|看书|学习/g) || []).length;
                if (struggleCount >= 3) {
                    techniques.push({
                        name: '重复强化',
                        description: '多次描写主角持续投入或积蓄实力的场景',
                        nodes: [
                            { sequence: 1, scene: '中段', content: '持续投入场景', function: '强化印象' },
                            { sequence: 2, scene: '高潮前', content: '能力/筹码积累描写', function: '铺垫实力' },
                        ],
                        effect_summary: '反复刻画主角投入，让最终结果更具说服力',
                    });
                }
                return techniques;
            }

            function detectCharacterArc(text, chapters) {
                const agencyCurve = detectAgencyCurve(text, chapters);
                const milestones = agencyCurve.slice(0, 4).map((point, index) => ({
                    position: point.plot_node || `节点${index + 1}`,
                    event: point.decision_impact,
                    belief_change: index === 0 ? '从承受到表达目标' :
                        index === agencyCurve.length - 1 ? '从行动到结果确认' : '从等待到主动推进',
                }));
                return {
                    arc_type: agencyCurve.length >= 3 ? '主动性增强弧光' : '关键选择弧光',
                    belief_start: '初始处于压力、困境或旧秩序中',
                    challenge: '外部阻碍迫使人物做出选择',
                    new_belief_end: '通过主动行动确认新的自我位置',
                    milestones,
                    character_driving_force: { summary: detectCoreEmotion(text) + '驱动',
                        key_decisions: agencyCurve.slice(0, 2).map(point => ({
                            decision: point.decision_impact,
                            impact: point.agency_level,
                            alternative_consequence: '维持原有困境',
                        })) },
                };
            }

            function detectLanguageDNA(text) {
                const sentences = text.split(/[。！？\n]+/).filter(s => s.trim().length > 10).slice(0, 10);
                const highFreqNouns = EXTRACTION_RULES.languageFocus.nouns.filter(w => text.includes(w));
                const highFreqVerbs = EXTRACTION_RULES.languageFocus.verbs.filter(w => text.includes(w));
                return {
                    sentences: sentences.slice(0, 5),
                    dialogue_ratio: estimateDialogueRatio(text),
                    high_freq_nouns: highFreqNouns.slice(0, 5),
                    high_freq_verbs: highFreqVerbs.slice(0, 5),
                    style_notes: EXTRACTION_RULES.languageFocus.styleNotes,
                };
            }

            function estimateDialogueRatio(text) {
                const dialogueLines = (text.match(/["""].*?["»"]|'.*?'|「.*?」|『.*?』/g) || []).length;
                const totalChars = text.length;
                return Math.round((dialogueLines * 30 / totalChars) * 100);
            }

            function detectTheme(text) {
                const emotion = detectCoreEmotion(text);
                const coreClaim = text.includes('自己') || text.includes('选择') ?
                    '人物通过关键选择确认自我价值' :
                    emotion !== '期待' ? `围绕「${emotion}」建立情绪承诺并完成释放` : null;
                if (!coreClaim) return { core_claim: null };
                return {
                    core_claim: coreClaim,
                    presentation_method: '通过人物选择呈现',
                    theme_tracking: { opening: '开篇建立价值困境', middle: '中段通过阻碍深化主题',
                        climax: '高潮通过选择或结果验证主题', ending: '结尾完成价值落点' },
                    golden_sentence: extractCoreEvent(text).substring(0, 40),
                };
            }

            function detectAssetRelationships(allResults) {
                const relationships = [];
                const types = Object.keys(allResults).filter(t => allResults[t].length > 0);
                const firstAssetId = type => allResults[type]?.[0]?.asset_id || `${type}_unknown`;
                // Create relationships between related assets
                if (types.includes('gratification_formula') && types.includes('high_octane_scene')) {
                    relationships.push({
                        source_id: firstAssetId('gratification_formula'),
                        source_position: '爽点铺垫节点',
                        target_id: firstAssetId('high_octane_scene'),
                        target_position: '高燃释放节点',
                        relation_type: '递进',
                        evidence: '爽点配方的铺垫导向高燃场面的爆发',
                    });
                }
                if (types.includes('structural_skeleton') && types.includes('gratification_formula')) {
                    relationships.push({
                        source_id: firstAssetId('structural_skeleton'),
                        source_position: '整体框架',
                        target_id: firstAssetId('gratification_formula'),
                        target_position: '爽点节点',
                        relation_type: '父子',
                        evidence: '结构骨架提供整体节奏，爽点配方填充具体节点',
                    });
                }
                if (types.includes('emotional_anchor') && types.includes('high_octane_scene')) {
                    relationships.push({
                        source_id: firstAssetId('emotional_anchor'),
                        source_position: '情感锚点',
                        target_id: firstAssetId('high_octane_scene'),
                        target_position: '高燃释放节点',
                        relation_type: '互补',
                        evidence: '情感锚点强化高燃场面的情绪感染力',
                    });
                }
                return relationships;
            }

            function extractCoreEvent(content) {
                const firstLine = content.split(/\n/)[0]?.trim();
                return firstLine ? firstLine.substring(0, 60) : '未识别';
            }

            function estimateConflictIntensity(content) {
                const intensityWords = ['怒', '争', '吵', '打', '泪', '吼', '沉默', '攥紧', '赢了', '雷鸣'];
                let score = 0;
                intensityWords.forEach(w => { if (content.includes(w)) score++; });
                return Math.min(5, Math.max(1, score));
            }

            function detectChapterHook(content) {
                if (content.includes('?') || content.includes('？')) return '悬念';
                if (content.includes('赢了') || content.includes('掌声')) return '反转';
                if (content.includes('不会让') || content.includes('我要')) return '宣言';
                return '情感';
            }

            // ==================== RENDER DATABASE VIEW ====================
            function getRecordDomId(assetType, record) {
                return 'asset-record-' + encodeURIComponent(assetType) + '-' + encodeURIComponent(record.asset_id || record.suggested_filename || '');
            }

            function findAssetTypeByAssetId(assetId) {
                const needle = String(assetId || '').trim();
                if (!needle) return '';
                const matched = Object.entries(state.analysisResults || {}).find(([, records]) =>
                    Array.isArray(records) && records.some((record) => String(record.asset_id || record.suggested_filename || '').trim() === needle)
                );
                return matched ? matched[0] : '';
            }

            function normalizeRelatedAssetEntry(entry) {
                if (!entry) return null;
                if (typeof entry === 'string') {
                    return { assetId: entry, assetType: findAssetTypeByAssetId(entry), label: entry };
                }
                if (typeof entry === 'object') {
                    const assetId = String(entry.asset_id || entry.assetId || entry.id || '').trim();
                    const assetType = String(entry.asset_type || entry.assetType || findAssetTypeByAssetId(assetId) || '').trim();
                    return {
                        assetId,
                        assetType,
                        label: String(entry.label || entry.name || assetId || assetType || '关联资产').trim(),
                    };
                }
                return null;
            }

            function getRecordRelatedAssets(record) {
                const metadataRelated = Array.isArray(record?.metadata?.related_assets) ? record.metadata.related_assets : [];
                const recordRelated = Array.isArray(record?.related_assets) ? record.related_assets : [];
                return [...metadataRelated, ...recordRelated]
                    .map(normalizeRelatedAssetEntry)
                    .filter((item, index, arr) => item && (item.assetId || item.assetType) && arr.findIndex((candidate) => candidate.assetId === item.assetId && candidate.assetType === item.assetType) === index);
            }

            function buildSourceEvidenceExcerpt(sourceText, quote) {
                const textValue = String(sourceText || '').trim();
                const quoteValue = String(quote || '').trim();
                if (!textValue) return '当前没有可定位的原文内容。';
                if (!quoteValue) return escapeHTML(textValue.slice(0, 600));
                const index = textValue.indexOf(quoteValue);
                if (index === -1) {
                    return escapeHTML(quoteValue) + '<hr><div>' + escapeHTML(textValue.slice(0, 800)) + '</div>';
                }
                const start = Math.max(0, index - 140);
                const end = Math.min(textValue.length, index + quoteValue.length + 180);
                const before = escapeHTML(textValue.slice(start, index));
                const match = escapeHTML(textValue.slice(index, index + quoteValue.length));
                const after = escapeHTML(textValue.slice(index + quoteValue.length, end));
                return before + '<mark>' + match + '</mark>' + after;
            }

            function openMaterialSourceEvidence(item) {
                materialSourceEvidenceState.supportsField = String(item?.supports_field || '证据').trim();
                materialSourceEvidenceState.quote = String(item?.quote || '').trim();
                materialSourceEvidenceState.interpretation = String(item?.interpretation || '').trim();
                materialSourceEvidenceState.excerptHtml = buildSourceEvidenceExcerpt(stateBridge.sourceText, item?.quote || '');
                showMaterialSourceEvidenceModal.value = true;
            }

            function renderEvidenceHTML(record) {
                const evidence = Array.isArray(record?.evidence) ? record.evidence.slice(0, 4) : [];
                if (!evidence.length) return '';
                let html = '<div class="asset-detail-section"><div class="asset-detail-section-title">来源证据</div><div class="asset-evidence-list">';
                evidence.forEach((item) => {
                    html += '<article class="asset-evidence-item">';
                    html += '<strong>' + escapeHTML(item.supports_field || '证据') + '</strong>';
                    html += '<p>' + escapeHTML(String(item.quote || '').trim() || '暂无原文片段') + '</p>';
                    if (item.interpretation) {
                        html += '<small>' + escapeHTML(String(item.interpretation || '').trim()) + '</small>';
                    }
                    html += '</button>';
                });
                html += '</div></div>';
                return html;
            }

            window.openSourceEvidence = function(payload) {
                try {
                    openMaterialSourceEvidence(JSON.parse(decodeURIComponent(payload || '')));
                } catch (error) {
                    console.error('Failed to open source evidence:', error);
                }
            };

            function getRelationNetworkData(record) {
                const coreData = record?.core_data || {};
                const assetsInvolved = Array.isArray(coreData.assets_involved) ? coreData.assets_involved : [];
                const relationships = Array.isArray(coreData.relationships) ? coreData.relationships : [];
                return { assetsInvolved, relationships };
            }

            function getAssetNodeMeta(node) {
                const assetType = String(node?.asset_type || findAssetTypeByAssetId(node?.asset_id || '') || '').trim();
                const registry = ASSET_TYPE_REGISTRY[assetType] || null;
                return {
                    assetType,
                    assetId: String(node?.asset_id || '').trim(),
                    label: String(node?.asset_id || registry?.name || '未命名资产').trim(),
                    icon: registry?.icon || '📄',
                    level: registry?.level || 'Unknown',
                    name: registry?.name || assetType || '未识别类型',
                };
            }

            function renderRelationNetworkHTML(record) {
                const network = getRelationNetworkData(record);
                if (!network.assetsInvolved.length && !network.relationships.length) return '';

                const levelFilter = materialRelationFilter.level || 'all';
                const tagFilter = String(materialRelationFilter.tag || '').trim().toLowerCase();
                const nodes = network.assetsInvolved.map(getAssetNodeMeta).filter((node) => {
                    if (levelFilter !== 'all' && node.level !== levelFilter) return false;
                    if (!tagFilter) return true;
                    return [node.assetType, node.assetId, node.name, node.level].filter(Boolean).join(' ').toLowerCase().includes(tagFilter);
                });
                const nodeIds = new Set(nodes.map((node) => node.assetId));
                const relationships = network.relationships.filter((item) => {
                    const matchesNode = !nodeIds.size || nodeIds.has(String(item.source_id || '').trim()) || nodeIds.has(String(item.target_id || '').trim());
                    if (!matchesNode) return false;
                    if (!tagFilter) return true;
                    return [item.relation_type, item.evidence, item.source_id, item.target_id].filter(Boolean).join(' ').toLowerCase().includes(tagFilter);
                });

                let html = '<div class="asset-detail-section relation-network-section">';
                html += '<div class="asset-detail-section-title">关系网络主视图</div>';
                html += '<div class="relation-network-toolbar">';
                html += '<button type="button" class="relation-filter-btn' + (levelFilter === 'all' ? ' active' : '') + '" onclick="setRelationFilter(\'level\',\'all\')">全部</button>';
                html += '<button type="button" class="relation-filter-btn' + (levelFilter === 'L1' ? ' active' : '') + '" onclick="setRelationFilter(\'level\',\'L1\')">L1</button>';
                html += '<button type="button" class="relation-filter-btn' + (levelFilter === 'L2' ? ' active' : '') + '" onclick="setRelationFilter(\'level\',\'L2\')">L2</button>';
                html += '<button type="button" class="relation-filter-btn' + (levelFilter === 'L3' ? ' active' : '') + '" onclick="setRelationFilter(\'level\',\'L3\')">L3</button>';
                html += '<button type="button" class="relation-filter-btn' + (!tagFilter ? ' active' : '') + '" onclick="setRelationFilter(\'tag\',\'\')">清除关键词</button>';
                html += '</div>';

                html += '<div class="relation-network-grid">';
                html += '<div class="relation-network-column"><div class="relation-network-subtitle">节点</div><div class="relation-node-list">';
                nodes.forEach((node) => {
                    html += '<button type="button" class="relation-node-card" onclick="openRelatedAsset(\'' + encodeURIComponent(node.assetType || '') + '\',\'' + encodeURIComponent(node.assetId || '') + '\')">';
                    html += '<strong>' + escapeHTML(node.icon + ' ' + node.name) + '</strong>';
                    html += '<span>' + escapeHTML(node.level + ' · ' + node.label) + '</span>';
                    html += '</button>';
                });
                if (!nodes.length) html += '<div class="empty-state compact"><span class="icon">🧩</span>当前筛选下暂无节点</div>';
                html += '</div></div>';

                html += '<div class="relation-network-column"><div class="relation-network-subtitle">关系</div><div class="relation-edge-list">';
                relationships.forEach((item) => {
                    html += '<article class="relation-edge-card">';
                    html += '<div class="relation-edge-head"><strong>' + escapeHTML(String(item.source_id || '未知源')) + '</strong><span>' + escapeHTML(String(item.relation_type || '关系')) + '</span><strong>' + escapeHTML(String(item.target_id || '未知目标')) + '</strong></div>';
                    if (item.evidence) html += '<p>' + escapeHTML(String(item.evidence || '').trim()) + '</p>';
                    html += '<div class="relation-edge-actions">';
                    html += '<button type="button" class="btn btn-secondary btn-sm" onclick="openRelatedAsset(\'' + encodeURIComponent(findAssetTypeByAssetId(item.source_id || '') || '') + '\',\'' + encodeURIComponent(item.source_id || '') + '\')">打开源资产</button>';
                    html += '<button type="button" class="btn btn-secondary btn-sm" onclick="openRelatedAsset(\'' + encodeURIComponent(findAssetTypeByAssetId(item.target_id || '') || '') + '\',\'' + encodeURIComponent(item.target_id || '') + '\')">打开目标资产</button>';
                    html += '</div></article>';
                });
                if (!relationships.length) html += '<div class="empty-state compact"><span class="icon">🔗</span>当前筛选下暂无关系</div>';
                html += '</div></div>';
                html += '</div></div>';
                return html;
            }

            window.setRelationFilter = function(key, value) {
                materialRelationFilter[key] = value;
                if (state.currentView === 'database' && state.activeTab) {
                    renderDatabaseView(state.activeTab);
                }
            };

            function renderRelatedAssetsHTML(record) {
                const relatedAssets = getRecordRelatedAssets(record);
                if (!relatedAssets.length) return '';
                let html = '<div class="asset-detail-section"><div class="asset-detail-section-title">关联资产</div><div class="asset-related-list">';
                relatedAssets.forEach((item) => {
                    html += '<button type="button" class="asset-related-chip" onclick="openRelatedAsset(\'' + encodeURIComponent(item.assetType || '') + '\',\'' + encodeURIComponent(item.assetId || item.label || '') + '\')">';
                    html += '<span>' + escapeHTML(item.assetType || '未识别类型') + '</span>';
                    html += '<strong>' + escapeHTML(item.label || item.assetId || '关联资产') + '</strong>';
                    html += '</button>';
                });
                html += '</div></div>';
                return html;
            }

            window.openRelatedAsset = function(assetType, assetId) {
                const type = decodeURIComponent(assetType || '');
                const id = decodeURIComponent(assetId || '');
                const resolvedType = type || findAssetTypeByAssetId(id);
                if (!resolvedType || !ASSET_TYPE_REGISTRY[resolvedType]) return;
                state.activeTab = resolvedType;
                state.activeTrackProduct = '';
                state.currentView = 'database';
                buildSidebar();
                updateTopbarButtons();
                renderDatabaseView(resolvedType, id);
            };

            function renderDatabaseView(assetType, focusRecordId = '') {
                setContainedScroll(false);
                const info = ASSET_TYPE_REGISTRY[assetType];
                if (!info) {
                    updateMaterialContentView({
                        containedScroll: false,
                        html: '<div class="empty-state"><span class="icon">🗄️</span>请从左侧选择资产类型</div>',
                    });
                    return;
                }
                const records = state.analysisResults[assetType] || [];
                state.activeTab = assetType;

                let html = `
            <div class="panel">
              <div class="panel-header">
                <span class="asset-display-index header-index">${formatDisplayIndex(getOrderedAssetEntries().find(([type]) => type === assetType)?.[1]?.displayIndex || 0)}</span>
                ${info.icon} ${info.name}
                <span class="level-tag ${info.level}">${info.level}</span>
                <span style="margin-left:auto;font-size:10px;color:var(--text2);">路径: ${info.path}</span>
              </div>
              <div class="panel-body">
                <p style="color:var(--text2);margin-bottom:8px;">📋 ${info.desc} | 适用模块: ${info.modules} | 记录数: <strong>${records.length}</strong></p>
          `;

                if (records.length === 0) {
                    html +=
                        `<div class="empty-state"><span class="icon">📭</span>该资产类型暂无提取记录<br><small>请先在文本输入中执行分析，或检查文本是否包含相关模式</small></div>`;
                } else {
                    records.forEach((record, idx) => {
                        html += `
                <div class="asset-record-card" id="${getRecordDomId(assetType, record)}">
                  <div class="asset-record-title">📄 ${record.asset_id || '记录 '+(idx+1)}</div>
                  <div class="asset-record-meta">提取状态: <span class="status-extracted">${record.extraction_status||'extracted'}</span> | 置信度: ${record.confidence||'medium'}</div>
                  <div class="yaml-block">${formatYAML(record)}</div>
                  ${record.tags ? renderTagsHTML(record.tags) : ''}
                  ${record.asset_type === 'asset_relationship_network' ? renderRelationNetworkHTML(record) : ''}
                  ${renderEvidenceHTML(record)}
                  ${renderRelatedAssetsHTML(record)}
                </div>
              `;
                    });
                }
                html += '</div></div>';
                updateMaterialContentView({
                    containedScroll: false,
                    html,
                    onRendered: focusRecordId ? () => {
                        const target = document.getElementById(getRecordDomId(assetType, { asset_id: focusRecordId }));
                        if (target) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            target.classList.add('active-record');
                            setTimeout(() => target.classList.remove('active-record'), 1600);
                        }
                    } : null,
                });

                // Update active states
                document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
                const treeEl = document.getElementById('tree-' + assetType);
                if (treeEl) treeEl.classList.add('active');
            }

            function formatYAML(record) {
                // Simplified YAML-like formatting
                let yaml = '';
                const coreData = record.core_data || {};
                yaml += `asset_id: ${record.asset_id || 'N/A'}\n`;
                yaml += `asset_type: ${record.asset_type || 'N/A'}\n`;
                yaml += `schema_version: ${record.schema_version || '1.1'}\n`;
                yaml += `extraction_status: ${record.extraction_status || 'extracted'}\n`;
                yaml += `confidence: ${record.confidence || 'medium'}\n`;
                yaml += `core_data:\n`;
                Object.entries(coreData).forEach(([k, v]) => {
                    if (typeof v === 'object' && v !== null) {
                        yaml += `  ${k}:\n`;
                        if (Array.isArray(v)) {
                            v.slice(0, 8).forEach(item => {
                                if (typeof item === 'object') {
                                    yaml += `    - ${JSON.stringify(item).substring(0,120)}...\n`;
                                } else {
                                    yaml += `    - ${String(item).substring(0,100)}\n`;
                                }
                            });
                            if (v.length > 8) yaml += `    - ... (共${v.length}项)\n`;
                        } else {
                            Object.entries(v).slice(0, 6).forEach(([sk, sv]) => {
                                yaml += `    ${sk}: ${String(sv).substring(0,80)}\n`;
                            });
                        }
                    } else {
                        yaml += `  ${k}: ${String(v).substring(0,120)}\n`;
                    }
                });
                if (record.evidence && record.evidence.length > 0) {
                    yaml += `evidence: ${record.evidence.length}条\n`;
                }
                return yaml;
            }

            function renderTagsHTML(tags) {
                if (!tags) return '';
                let html = '<div class="badge-row" style="margin-top:6px;">';
                Object.entries(tags).forEach(([cat, vals]) => {
                    if (!vals || vals.length === 0) return;
                    const catClass = cat.includes('emotion') ? 'emotion' : cat.includes('function') ? 'func' :
                        cat.includes('style') ? 'style' : 'tech';
                    vals.forEach(v => {
                        html += `<span class="tag ${catClass}">${v}</span>`;
                    });
                });
                html += '</div>';
                return html;
            }

            // ==================== RENDER TAGS VIEW ====================
            function getTagValues(tags, category) {
                const raw = tags?.[category];
                if (!raw) return [];
                if (Array.isArray(raw)) return raw.map(item => String(item || '').trim()).filter(Boolean);
                return [String(raw).trim()].filter(Boolean);
            }

            function buildTagIndex() {
                const index = {};
                Object.entries(state.analysisResults || {}).forEach(([assetType, records]) => {
                    const info = ASSET_TYPE_REGISTRY[assetType];
                    if (!info || !Array.isArray(records)) return;
                    records.forEach((record, recordIndex) => {
                        Object.keys(record.tags || {}).forEach(category => {
                            getTagValues(record.tags, category).forEach(value => {
                                if (!index[category]) index[category] = {};
                                if (!index[category][value]) index[category][value] = [];
                                index[category][value].push({
                                    assetType,
                                    assetName: info.name,
                                    assetIcon: info.icon,
                                    level: info.level,
                                    record,
                                    recordIndex,
                                });
                            });
                        });
                    });
                });
                return index;
            }

            function getTagClass(category) {
                return category.includes('emotion') ? 'emotion' : category.includes('function') ? 'func' :
                    category.includes('style') ? 'style' : 'tech';
            }

            function selectMaterialTag(category, value) {
                state.activeTagFilter = {
                    category: String(category || '').trim(),
                    value: String(value || '').trim(),
                };
                renderTagsView();
            }

            function clearMaterialTagFilter() {
                state.activeTagFilter = null;
                renderTagsView();
            }

            function openTaggedAsset(assetType, assetId) {
                const type = String(assetType || '').trim();
                const id = String(assetId || '').trim();
                if (!ASSET_TYPE_REGISTRY[type]) return;
                document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
                const el = document.getElementById('tree-' + type);
                if (el) el.classList.add('active');
                state.activeTab = type;
                state.activeTrackProduct = '';
                state.currentView = 'database';
                buildSidebar();
                updateTopbarButtons();
                renderDatabaseView(type, id);
            }

            window.openTaggedAsset = function(assetType, assetId) {
                openTaggedAsset(decodeURIComponent(assetType || ''), decodeURIComponent(assetId || ''));
            };

            function buildTagMatches(tagIndex) {
                const filter = state.activeTagFilter;
                if (!filter) {
                    return [];
                }
                return (tagIndex[filter.category]?.[filter.value] || []).map(match => {
                    const record = match.record || {};
                    return {
                        assetType: match.assetType,
                        rawAssetId: record.asset_id || record.suggested_filename || '',
                        assetId: record.asset_id || `记录 ${match.recordIndex + 1}`,
                        assetName: match.assetName,
                        assetIcon: match.assetIcon,
                        level: match.level,
                        confidence: record.confidence || 'medium',
                        recordIndex: match.recordIndex,
                    };
                });
            }

            function renderTagsView() {
                setContainedScroll(true);
                const tagIndex = buildTagIndex();
                const categories = Object.entries(tagIndex).sort(([a], [b]) => a.localeCompare(b, 'zh-CN'));

                if (!categories.length) {
                    updateMaterialContentView({
                        component: 'tags',
                        containedScroll: true,
                        categories: [],
                        activeFilter: state.activeTagFilter,
                        matches: [],
                    });
                    return;
                }

                updateMaterialContentView({
                    component: 'tags',
                    containedScroll: true,
                    categories: categories.map(([cat, tagMap]) => ({
                        name: cat,
                        className: getTagClass(cat),
                        tags: Object.entries(tagMap)
                            .sort(([, a], [, b]) => b.length - a.length)
                            .map(([tag, matches]) => ({
                                value: tag,
                                count: matches.length,
                            })),
                    })),
                    activeFilter: state.activeTagFilter,
                    matches: buildTagMatches(tagIndex),
                    onSelectTag: (category, value) => {
                        selectMaterialTag(category, value);
                    },
                    onClearFilter: () => {
                        clearMaterialTagFilter();
                    },
                    onOpenAsset: (assetType, assetId) => {
                        openTaggedAsset(assetType, assetId);
                    },
                });
            }

            // ==================== UPDATE SIDEBAR BADGES ====================
            function updateSidebarBadges() {
                document.querySelectorAll('.tree-item').forEach(el => {
                    const type = el.dataset.assetType;
                    if (!type) return;
                    const records = state.analysisResults[type] || [];
                    const badge = el.querySelector('.badge');
                    if (badge && records.length > 0) {
                        badge.textContent = records.length;
                        badge.style.opacity = '1';
                    } else if (badge && records.length === 0) {
                        badge.textContent = '0';
                        badge.style.opacity = '0.5';
                    }
                });
            }

            // ==================== EXPORT ====================
            window.exportAll = function() {
                const exportData = {
                    track_analysis: state.trackAnalysis,
                    confirmed_track: state.confirmedTrack,
                    extraction_summary: state.extractionSummary,
                    analysis_results: state.analysisResults,
                    source_title: state.sourceTitle,
                    source_text_length: state.sourceText.length,
                    export_date: new Date().toISOString(),
                    asset_type_registry: Object.keys(ASSET_TYPE_REGISTRY).reduce((acc, type) => {
                        const vars = getPathVariables(type);
                        acc[type] = {
                            level: ASSET_TYPE_REGISTRY[type].level,
                            path_template: ASSET_TYPE_REGISTRY[type].path,
                            resolved_path: resolveTemplate(ASSET_TYPE_REGISTRY[type].path, vars),
                            suggested_filename: makeSuggestedFilename(type, ASSET_TYPE_REGISTRY[type]),
                            name: ASSET_TYPE_REGISTRY[type].name,
                        };
                        return acc;
                    }, {}),
                };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = '故事DNA分析_' + (state.sourceTitle || 'export') + '_' + new Date().toISOString().slice(0,
                    10) + '.json';
                a.click();
                URL.revokeObjectURL(url);
                void appendMaterialOperationLog({
                    actionType: 'export_json',
                    title: '导出故事DNA分析 JSON',
                    detail: `已导出作品 ${state.sourceTitle || '未命名故事'} 的分析结果。`,
                    payload: {
                        totalAssets: state.totalAssets,
                    },
                });
                showToast('📤 已导出JSON文件');
            };

            function escapeHTML(str) {
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            }

            // ==================== INIT ====================
            function init() {
                const exampleFileInput = document.getElementById('material-example-file-upload');
                if (exampleFileInput) {
                    exampleFileInput.onchange = window.handleMaterialExampleFileUpload;
                }
                buildSidebar();
                refreshCurrentView();
            }

            init();
            void loadCurrentMaterialExtraction();
            void materialPromptConfigController.loadPromptConfigs();
            void loadMaterialTrackCatalogState();
            void loadMaterialExamplesState().then(() => {
                updateTopbarButtons();
                buildSidebar();
            }).catch((error) => {
                console.error('Failed to load material examples:', error);
            });
            console.log('🧬 素材库已就绪');
            console.log('📊 资产类型注册表: ' + Object.keys(ASSET_TYPE_REGISTRY).length + ' 种');
            console.log('📁 文件夹结构: ' + Object.keys(FOLDER_STRUCTURE).length + ' 个目录');
            console.log('💡 提示: 粘贴故事文本后点击"执行分析"，或点击"加载示例文本"体验功能');
        })();
})

onBeforeUnmount(() => {
  materialToast = () => {}
  void materialPromptConfigController.flushPendingSaves()
  materialPromptConfigController.dispose()
  delete window.toggleFolder
  delete window.selectAssetType
  delete window.selectTrackProduct
  delete window.switchView
  delete window.switchMaterialInputTab
  delete window.clearInput
  delete window.clearTrackProducts
  delete window.clearAssetLibrary
  delete window.loadDemoText
  delete window.setMaterialExampleSearch
  delete window.openMaterialExample
  delete window.openMaterialExampleEditor
  delete window.triggerMaterialExampleFileUpload
  delete window.handleMaterialExampleFileUpload
  delete window.handleTxtFileUpload
  delete window.loadUploadedTextFile
  delete window.removeUploadedTextFile
  delete window.runTrackAnalysis
  delete window.runBatchTrackAnalysis
  delete window.runAnalysis
  delete window.confirmTrackFromInput
  delete window.openTrackManagerModal
  delete window.exportAll
  delete window.openTaggedAsset
  delete window.openRelatedAsset
  delete window.setRelationFilter
  delete window.openSourceEvidence
})
</script>

<style src="./style.css"></style>
