<template>
<div class="material-extractor-page">
<!-- TOP BAR -->
    <div id="topbar">
        <button type="button" class="topbar-back" title="返回主工作台" aria-label="返回主工作台" @click="$emit('close')">←</button>
        <div class="logo">🧬 <span>故事DNA</span>数据库</div>
        <div class="topbar-actions">
            <button onclick="switchMaterialInputTab('track')" id="btn-input-track" class="topbar-tab active">赛道分析</button>
            <button onclick="switchMaterialInputTab('dna')" id="btn-input-dna" class="topbar-tab">DNA数据抽取</button>
            <button onclick="switchView('tags')" id="btn-tags">🏷️ 标签索引</button>
        </div>
    </div>

    <!-- MAIN -->
    <div id="main">
        <!-- SIDEBAR -->
        <div id="sidebar">
            <div class="sidebar-header">📂 数据库表结构</div>
            <div class="tree" id="sidebar-tree"></div>
        </div>

        <!-- CONTENT -->
        <div id="content">
            <div class="view-area" id="view-area"></div>
        </div>
    </div>

    <!-- TOAST -->
    <div id="toast"></div>

    <!-- MODAL overlay (hidden) -->
    <div class="modal-overlay" id="modal-overlay" style="display:none;">
        <div class="modal" id="modal-content"></div>
    </div>
</div>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { normalizeAiConfig } from './aiConfig'
import { requestAssetExtraction, requestTrackAnalysis } from './aiClient'
import { normalizeAssetAnalysisResults } from './assetRecords'
import { DEMO_STORY, EXTRACTION_RULES } from './dnaRules'
import {
  ASSET_PATH_REGISTRY,
  LEVEL_META as ASSET_LEVEL_META,
  TRACK_SAMPLE_PATHS,
  getOrderedAssetEntries as getRegisteredAssetEntries,
  makeAssetFilename as makeRegisteredAssetFilename,
  normalizeTrackId,
  resolveAssetPath as resolveRegisteredAssetPath,
  resolveTrackPath,
  sanitizePathPart,
} from './assetPathRegistry'
import { normalizeTrackAnalysis } from './trackAnalysisState'
import {
  fetchMaterialExtractionRecord,
  saveMaterialExtractionRecord,
} from '../../services/databaseApi'

defineEmits(['close'])

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
})

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
                currentView: 'input',
                inputTab: 'track',
                activeTab: null,
                sourceText: '',
                sourceTitle: '',
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
            };
            let activeModalCloseHandler = null;

            // ==================== DOM REFS ====================
            const $sidebarTree = document.getElementById('sidebar-tree');
            const $viewArea = document.getElementById('view-area');
            const $assetCount = document.getElementById('asset-count');
            const $toast = document.getElementById('toast');
            const $modalOverlay = document.getElementById('modal-overlay');
            const $modalContent = document.getElementById('modal-content');

            function updateAssetCount(value) {
                if ($assetCount) $assetCount.textContent = String(value);
            }

            function updateTopbarButtons() {
                const buttons = [
                    ['btn-input-track', state.currentView === 'input' && state.inputTab === 'track'],
                    ['btn-input-dna', state.currentView === 'input' && state.inputTab === 'dna'],
                    ['btn-tags', state.currentView === 'tags'],
                ];
                buttons.forEach(([id, active]) => {
                    const button = document.getElementById(id);
                    if (button) button.classList.toggle('active', active);
                });
            }

            function setContainedScroll(enabled) {
                $viewArea.classList.toggle('contained-scroll', enabled);
            }

            // ==================== TOAST ====================
            function showToast(msg, duration = 2000) {
                $toast.textContent = msg;
                $toast.classList.add('show');
                clearTimeout($toast._timeout);
                $toast._timeout = setTimeout(() => $toast.classList.remove('show'), duration);
            }

            // ==================== MODAL ====================
            function showModal(title, bodyHTML, options = {}) {
                activeModalCloseHandler = options.onClose || null;
                $modalContent.innerHTML = `
            <button class="close" onclick="closeModal()">✕</button>
            <h3>${title}</h3>
            <div>${bodyHTML}</div>
          `;
                $modalOverlay.style.display = 'flex';
            }
            window.closeModal = function() {
                if (typeof activeModalCloseHandler === 'function') {
                    activeModalCloseHandler();
                }
                activeModalCloseHandler = null;
                $modalOverlay.style.display = 'none';
            };
            $modalOverlay.addEventListener('click', function(e) {
                if (e.target === $modalOverlay) closeModal();
            });

            // ==================== BUILD SIDEBAR ====================
            function buildSidebar() {
                if ((state.currentView === 'input' || state.currentView === 'trackProduct') && state.inputTab === 'track') {
                    const track = normalizeTrackId(state.confirmedTrack || state.trackAnalysis?.primary_track || 'UNKNOWN');
                    const story = getStorySlug();
                    $sidebarTree.innerHTML = `
              <div class="tree-section-title asset-section-title">赛道产物</div>
              <button type="button" class="tree-action-button danger" onclick="clearTrackProducts()">清除赛道产物</button>
              <div class="tree-note">当前确认赛道：${escapeHTML(track)}；故事：${escapeHTML(story)}</div>
              <div class="track-sample-list">
                ${Object.entries(TRACK_SAMPLE_PATHS).map(([kind]) => `
                  <button type="button" class="track-sample-item ${state.activeTrackProduct === kind ? 'active' : ''}" onclick="selectTrackProduct('${kind}')">
                    <span class="track-folder">📁 ${kind}</span>
                    <span class="track-desc">${escapeHTML(resolveTrackPath(kind, { track, story }))}</span>
                  </button>
                `).join('')}
              </div>
            `;
                    return;
                }

                let html = `
              <div class="tree-section-title asset-section-title">DNA资产库</div>
              <button type="button" class="tree-action-button danger" onclick="clearAssetLibrary()">清除资产库</button>
            `;
                Object.entries(LEVEL_META).forEach(([level, meta]) => {
                    const items = getOrderedAssetEntries().filter(([, info]) => info.level === level);
                    if (!items.length) return;
                    const folderId = 'level-' + level.toLowerCase();
                    html += `
              <div class="tree-folder level-folder ${meta.className}" onclick="toggleFolder('${folderId}')" id="${folderId}-header">
                <span class="icon">▶</span>
                <span class="level-folder-title">${meta.title}</span>
              </div>
              <div class="tree-children" id="${folderId}">
            `;
                    items.forEach(([type, item]) => {
                        const levelClass = item.level.toLowerCase();
                        html += `
                <div class="tree-item" data-asset-type="${type}" data-level="${item.level}"
                     onclick="selectAssetType('${type}')" id="tree-${type}">
                  <span class="asset-display-index">${formatDisplayIndex(item.displayIndex)}</span>
                  <span class="asset-icon">${item.icon}</span>
                  <span class="asset-tree-main">
                    <span class="asset-tree-name">${item.name}</span>
                  </span>
                  <span class="badge ${levelClass}">${item.level}</span>
                </div>
              `;
                    });
                    html += '</div>';
                });
                $sidebarTree.innerHTML = html;

                Object.keys(LEVEL_META).forEach(level => toggleFolder('level-' + level.toLowerCase(), true));
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
                const confirmedTrack = state.confirmedTrack || state.trackAnalysis?.primary_track || '';
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

                $viewArea.innerHTML = `
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
                        ? `<button class="primary" id="btn-run-track-analysis-panel" onclick="runTrackAnalysis()" ${state.trackAnalysisPending ? 'disabled' : ''}>${state.trackAnalysisPending ? '⏳ 赛道分析中...' : '🧭 赛道分析'}</button>`
                        : `<button class="primary" id="btn-run-analysis-panel" onclick="runAnalysis()" ${state.extractionPending ? 'disabled' : ''}>${state.extractionPending ? '⏳ DNA抽取中...' : '🧬 DNA抽取'}</button>`}
                    <button onclick="document.getElementById('txt-file-upload')?.click()">📄 上传TXT</button>
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
                    <span>已确认赛道: <span class="val">${escapeHTML(confirmedTrack || '未确认')}</span></span>
                    <span>置信度: <span class="val">${escapeHTML(state.trackAnalysis?.confidence || '未分析')}</span></span>
                  </div>
                  <div class="input-actions" style="margin-top:8px;">
                    <input type="text" id="confirmed-track-input" class="input-title-field" placeholder="确认赛道；无法判断可填 UNKNOWN" value="${escapeHTML(confirmedTrack)}">
                    <button onclick="confirmTrackFromInput()">✓ 确认赛道</button>
                  </div>
                  ${state.trackAnalysis ? renderTrackAnalysisHTML(state.trackAnalysis) : '<span class="empty-state">尚未执行赛道分析。也可以手动输入 UNKNOWN 后确认，再进行 DNA 抽取。</span>'}
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
          `;
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
                const evidence = Array.isArray(analysis.evidence) ? analysis.evidence.slice(0, 3) : [];
                return `
                  <div class="asset-record-card" style="margin-top:8px;">
                    <div class="asset-record-title">主赛道：${escapeHTML(analysis.primary_track || 'UNKNOWN')}</div>
                    <div class="asset-record-meta">样文路径: ${escapeHTML(resolveTrackPath(analysis.primary_track === 'UNKNOWN' ? 'pending' : 'sample', { track: analysis.primary_track, story: getStorySlug() }))}</div>
                    <div class="yaml-block">reader_expectation: ${escapeHTML(analysis.reader_expectation || '')}
emotional_promise: ${escapeHTML((analysis.emotional_promise || []).join(' / '))}
opening: ${escapeHTML(structure.opening || '')}
development: ${escapeHTML(structure.development || '')}
turn: ${escapeHTML(structure.turn || '')}
ending: ${escapeHTML(structure.ending || '')}
risk_notes:
${(analysis.risk_notes || []).map(note => '  - ' + escapeHTML(note)).join('\n') || '  - 无'}</div>
                    ${evidence.length ? `<div class="badge-row" style="margin-top:6px;">${evidence.map(item => `<span class="tag tech">${escapeHTML(String(item.quote || '').slice(0, 30))}</span>`).join('')}</div>` : ''}
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
                const list = values => (Array.isArray(values) && values.length ? values.map(item => `- ${item}`).join('\n') : '- 暂无');
                const evidence = Array.isArray(analysis.evidence) && analysis.evidence.length
                    ? analysis.evidence.map(item => `- ${item.quote || ''}${item.interpretation ? `：${item.interpretation}` : ''}`).join('\n')
                    : '- 暂无';
                return `# ${normalizeTrackId(analysis.primary_track || state.confirmedTrack || 'UNKNOWN')} 赛道结构卡

## 读者期待
${analysis.reader_expectation || '暂无'}

## 情绪承诺
${list(analysis.emotional_promise)}

## 结构签名
- opening: ${structure.opening || '暂无'}
- development: ${structure.development || '暂无'}
- turn: ${structure.turn || '暂无'}
- ending: ${structure.ending || '暂无'}

## 风险备注
${list(analysis.risk_notes)}

## 证据
${evidence}`;
            }

            function getTrackProductContent(kind) {
                const track = normalizeTrackId(state.confirmedTrack || state.trackAnalysis?.primary_track || 'UNKNOWN');
                const story = getStorySlug();
                if (kind === 'analysis') {
                    return state.trackAnalysis
                        ? JSON.stringify({
                            track_analysis: state.trackAnalysis,
                            confirmed_track: state.confirmedTrack || track,
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
                const meta = getTrackProductMeta(kind);
                const track = normalizeTrackId(state.confirmedTrack || state.trackAnalysis?.primary_track || 'UNKNOWN');
                const story = getStorySlug();
                const path = resolveTrackPath(kind, { track, story });
                state.currentView = 'trackProduct';
                state.inputTab = 'track';
                state.activeTrackProduct = kind;
                buildSidebar();
                $viewArea.innerHTML = `
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
          `;
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
                        overrideTrack: file.track || file.trackAnalysis.primary_track || '',
                    });
                    state.confirmedTrack = state.trackAnalysis.primary_track || '';
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
                    showToast(`已载入：${file.title || file.name}`);
                } catch (error) {
                    showToast(`⚠️ 保存载入文本失败：${error?.message || '未知错误'}`);
                }
            };

            window.removeUploadedTextFile = function(fileId) {
                state.uploadedTextFiles = state.uploadedTextFiles.filter(file => file.id !== fileId);
                renderInputView();
            };

            function setTrackAnalysisPending(pending) {
                state.trackAnalysisPending = pending;
                const button = document.getElementById('btn-run-track-analysis-panel');
                if (!button) return;
                button.disabled = pending;
                button.textContent = pending ? '⏳ 赛道分析中...' : '🧭 赛道分析';
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
                await saveMaterialExtractionRecord(props.activeProjectId, {
                    sourceTitle: state.sourceTitle,
                    sourceText: state.sourceText,
                    trackAnalysis: state.trackAnalysis,
                    confirmedTrack: state.confirmedTrack,
                    analysisResults: state.analysisResults,
                    extractionSummary: state.extractionSummary,
                    totalAssets: state.totalAssets,
                });
            }

            async function loadCurrentMaterialExtraction() {
                if (!props.activeProjectId) return;

                try {
                    const saved = await fetchMaterialExtractionRecord(props.activeProjectId);
                    if (!saved) return;

                    state.sourceTitle = saved.sourceTitle || '';
                    state.sourceText = saved.sourceText || '';
                    state.trackAnalysis = saved.trackAnalysis
                        ? normalizeTrackAnalysisState(saved.trackAnalysis, {
                            storyTitle: saved.sourceTitle || '',
                            overrideTrack: saved.confirmedTrack || saved.trackAnalysis?.primary_track || '',
                        })
                        : null;
                    state.confirmedTrack = state.trackAnalysis?.primary_track || '';
                    state.analysisResults = normalizeAnalysisResults(saved.analysisResults || {});
                    state.extractionSummary = saved.extractionSummary || null;
                    state.totalAssets = Number(saved.totalAssets || 0);
                    updateAssetCount(state.totalAssets);
                    renderInputView();
                    updateSidebarBadges();
                    showToast('已恢复当前项目的素材抽取数据');
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
                state.confirmedTrack = primaryTrack;
                renderInputView();
                if (!options.silent) showToast(`✅ 赛道分析完成：${primaryTrack}`);
                return primaryTrack;
            }

            window.confirmTrackFromInput = async function() {
                if (!requireActiveProjectForMaterialExtraction()) return;
                const input = document.getElementById('confirmed-track-input');
                const nextTrack = normalizeTrackId(input?.value || '');
                if (!nextTrack) {
                    showToast('⚠️ 请输入确认赛道；无法判断时填 UNKNOWN');
                    return;
                }
                state.confirmedTrack = nextTrack;
                if (state.trackAnalysis) {
                    const nextRiskNotes = nextTrack === 'UNKNOWN' && (!state.trackAnalysis.risk_notes || state.trackAnalysis.risk_notes.length === 0)
                        ? ['用户手动确认 UNKNOWN：原赛道分析未保留足够原因。']
                        : state.trackAnalysis.risk_notes;
                    state.trackAnalysis = normalizeTrackAnalysisState({
                        ...state.trackAnalysis,
                        primary_track: nextTrack,
                        risk_notes: nextRiskNotes,
                    }, {
                        overrideTrack: nextTrack,
                    });
                } else if (nextTrack === 'UNKNOWN') {
                    state.trackAnalysis = normalizeTrackAnalysisState({
                        source_story: getStoryTitle(),
                        primary_track: 'UNKNOWN',
                        secondary_tracks: [],
                        confidence: 'low',
                        objective_features: [],
                        reader_expectation: '',
                        emotional_promise: [],
                        structure_signature: { opening: '', development: '', turn: '', ending: '' },
                        risk_notes: ['用户手动确认 UNKNOWN：未获得可用赛道判断。'],
                        evidence: [],
                    }, {
                        overrideTrack: 'UNKNOWN',
                    });
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
                    showToast(`已确认赛道：${nextTrack}`);
                } catch (error) {
                    showToast(`⚠️ 保存确认赛道失败：${error?.message || '未知错误'}`);
                }
            };

            function syncInputState() {
                const titleInput = document.getElementById('input-title');
                const textInput = document.getElementById('input-text');
                if (titleInput) state.sourceTitle = titleInput.value.trim();
                if (textInput) state.sourceText = textInput.value.trim();
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
                    showToast('⏳ 正在请求 AI 赛道分析，请稍候...', 2500);
                    const result = await requestTrackAnalysis(aiConfig, {
                        title: state.sourceTitle,
                        text: state.sourceText,
                    });
                    applyTrackAnalysisResult(result);
                    await saveCurrentMaterialExtraction();
                    showToast('✅ 赛道分析完成，结果已保存到当前项目');
                } catch (error) {
                    const message = error?.message || 'AI 赛道分析失败';
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
                            });
                            const primaryTrack = applyTrackAnalysisResult(result, { silent: true });
                            state.uploadedTextFiles[fileIndex] = {
                                ...state.uploadedTextFiles[fileIndex],
                                status: 'done',
                                statusText: '已完成',
                                track: primaryTrack,
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

                    const lastDone = [...state.uploadedTextFiles].reverse().find(file => file.status === 'done');
                    if (lastDone) applyUploadedTextFile(lastDone);
                    renderInputView();
                    if (lastDone) await saveCurrentMaterialExtraction();
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
                    showToast('⏳ 正在请求 AI DNA 抽取，请稍候...', 2500);
                    const result = await requestAssetExtraction(aiConfig, {
                        title: state.sourceTitle,
                        text: state.sourceText,
                        mode: 'full',
                        confirmedTrack: state.confirmedTrack,
                        trackAnalysis: state.trackAnalysis,
                    });
                    applyAiExtractionResult(result);
                    await saveCurrentMaterialExtraction();
                    showToast('✅ DNA 抽取完成，结果已保存到当前项目');
                } catch (error) {
                    const message = error?.message || 'AI DNA 抽取失败';
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
                const track = normalizeTrackId(state.confirmedTrack || state.trackAnalysis?.primary_track || 'UNKNOWN');
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
            function renderDatabaseView(assetType) {
                setContainedScroll(false);
                const info = ASSET_TYPE_REGISTRY[assetType];
                if (!info) { $viewArea.innerHTML =
                        '<div class="empty-state"><span class="icon">🗄️</span>请从左侧选择资产类型</div>'; return; }
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
                <div class="asset-record-card">
                  <div class="asset-record-title">📄 ${record.asset_id || '记录 '+(idx+1)}</div>
                  <div class="asset-record-meta">提取状态: <span class="status-extracted">${record.extraction_status||'extracted'}</span> | 置信度: ${record.confidence||'medium'}</div>
                  <div class="yaml-block">${formatYAML(record)}</div>
                  ${record.tags ? renderTagsHTML(record.tags) : ''}
                </div>
              `;
                    });
                }
                html += '</div></div>';
                $viewArea.innerHTML = html;

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
            function renderTagsView() {
                setContainedScroll(true);
                const allTags = {
                    emotion_tags: ['憋屈', '愤怒', '期待', '爽', '治愈', '自洽', '恐惧', '紧张', '心疼', '绝望', '希望', '释然',
                        '爽感', '悲壮', '温暖', '压抑'
                    ],
                    function_type: ['爽点设计', '结构骨架', '人物塑造', '悬念设计', '冲突设计', '节奏控制', '高潮设计', '情感锚点',
                        '开局钩子', '结尾余韵', '世界观设定', '诊断基准', '微创新', '选题', '打脸设计', '反转设计'
                    ],
                    function_actions: ['反向红利触发', '旁观者强化', '重复验证', '分层揭示', '缺席验证', '期待违背', '公开宣言',
                        '量化标准', '渐进突破', '仪式化', '借势打脸', '身份倒置', '伏笔铺垫'
                    ],
                    style_tags: ['现实细节', '快节奏', '悬疑感', '虐心', '世情向', '古言', '盐选适配', '爽文风', '甜宠', '年代文',
                        '反套路', '躺平流', '觉醒流'
                    ],
                    technique_core: ['三番四抖', '人物弧光', '打脸爽', '伏笔', '意象闭环', '感官细节', '信息差', '反转',
                    '预期违背', '反差行为', '被动转主动', '重复强化', '时间跳跃'],
                    technique_enhancers: ['公开宣言', '旁观者反应', '伏笔铺垫', '隐藏规则揭示', '首次突破', '触发事件', '身份倒置',
                        '借势打脸', '量化标准', '渐进突破'
                    ],
                };
                let html = '<div class="view-scroll-frame"><div class="tag-index-grid">';
                Object.entries(allTags).forEach(([cat, tags]) => {
                    const catClass = cat.includes('emotion') ? 'emotion' : cat.includes('function') ? 'func' :
                        cat.includes('style') ? 'style' : 'tech';
                    html += `
              <div class="panel" style="flex:1;min-width:250px;">
                <div class="panel-header">🏷️ ${cat}</div>
                <div class="panel-body"><div class="badge-row">
                  ${tags.map(t => `<span class="tag ${catClass}">${t}</span>`).join('')}
                </div></div>
              </div>
            `;
                });
                html += '</div></div>';
                $viewArea.innerHTML = html;
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
                showToast('📤 已导出JSON文件');
            };

            function escapeHTML(str) {
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            }

            // ==================== INIT ====================
            function init() {
                buildSidebar();
                renderInputView();
            }

            init();
            void loadCurrentMaterialExtraction();
            console.log('🧬 素材库已就绪');
            console.log('📊 资产类型注册表: ' + Object.keys(ASSET_TYPE_REGISTRY).length + ' 种');
            console.log('📁 文件夹结构: ' + Object.keys(FOLDER_STRUCTURE).length + ' 个目录');
            console.log('💡 提示: 粘贴故事文本后点击"执行分析"，或点击"加载示例文本"体验功能');
        })();
})

onBeforeUnmount(() => {
  delete window.toggleFolder
  delete window.selectAssetType
  delete window.selectTrackProduct
  delete window.switchView
  delete window.switchMaterialInputTab
  delete window.clearInput
  delete window.clearTrackProducts
  delete window.clearAssetLibrary
  delete window.loadDemoText
  delete window.handleTxtFileUpload
  delete window.loadUploadedTextFile
  delete window.removeUploadedTextFile
  delete window.runTrackAnalysis
  delete window.runBatchTrackAnalysis
  delete window.runAnalysis
  delete window.confirmTrackFromInput
  delete window.exportAll
  delete window.closeModal
})
</script>

<style src="./style.css"></style>
