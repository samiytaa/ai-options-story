import { useState } from 'react';
import BrainholeInputPanel from './BrainholeInputPanel.jsx';
import StageIndicator from './StageIndicator.jsx';

export default function EditorLeftPanel({
  isCollapsed = false,
  storyStart = '',
  windVaneFile = null,
  isLoading = false,
  dnaAssetReferences = { brainhole: [], guide: [], outline: [] },
  dnaResultReferences = { brainholeOptions: [], guide: [], architecture: [] },
  stage = 'brainhole',
  activeStageView = 'brainhole',
  fileTextIconPaths = [],
  canCopyBody = false,
  promptAutomationSettings = {
    autoGeneratePlot: true,
    autoGenerateChoices: true,
    generateBodyBeforeChoices: true,
  },
  copySelectedChoicesWithBody = false,
  copyBodyPreviewText = '',
  onTogglePanel,
  onUpdateStoryStart,
  onChooseWindVaneFile,
  onWindVaneFileChange,
  onWindVaneFileDragover,
  onWindVaneFileDragleave,
  onWindVaneFileDrop,
  onClearWindVaneFile,
  onClearBrainholeInput,
  onGenerateBrainhole,
  onNavigateStage,
  onUpdatePromptAutomationSetting,
  onCopyBody,
  onUpdateCopySelectedChoicesWithBody,
}) {
  const [activeTab, setActiveTab] = useState('brainhole');

  return (
    <aside className={`panel panel-left${isCollapsed ? ' collapsed' : ''}`}>
      <button
        className="panel-toggle"
        type="button"
        aria-expanded={(!isCollapsed).toString()}
        aria-label={isCollapsed ? '展开左侧区域' : '折叠左侧区域'}
        onClick={onTogglePanel}
      >
        <svg className="panel-toggle-icon" viewBox="0 0 20 20" aria-hidden="true">
          {isCollapsed ? <path d="M7.5 4.5 13 10l-5.5 5.5" /> : <path d="M12.5 4.5 7 10l5.5 5.5" />}
        </svg>
      </button>

      {isCollapsed ? (
        <div className="panel-collapsed-hint" />
      ) : (
        <div className="panel-body">
          <div className="left-panel-tabs" role="tablist" aria-label="左侧功能区">
            {[
              ['brainhole', '脑洞工作台'],
              ['stages', '创作流程'],
              ['promptControl', '提示词控制'],
              ['copyBody', '复制正文'],
            ].map(([tabKey, label]) => (
              <button
                key={tabKey}
                className={`left-panel-tab${activeTab === tabKey ? ' active' : ''}`}
                type="button"
                role="tab"
                aria-selected={(activeTab === tabKey).toString()}
                onClick={() => setActiveTab(tabKey)}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'brainhole' ? (
            <div className="left-panel-tab-body">
              <div className="left-panel-brainhole-section">
                <BrainholeInputPanel
                  storyStart={storyStart}
                  windVaneFile={windVaneFile}
                  isLoading={isLoading}
                  referenceItems={dnaAssetReferences?.brainhole || []}
                  resultReferenceItems={dnaResultReferences?.brainholeOptions || []}
                  fileTextIconPaths={fileTextIconPaths}
                  showClearBrainhole={false}
                  compact
                  onUpdateStoryStart={onUpdateStoryStart}
                  onChooseWindVaneFile={onChooseWindVaneFile}
                  onWindVaneFileChange={onWindVaneFileChange}
                  onWindVaneFileDragover={onWindVaneFileDragover}
                  onWindVaneFileDragleave={onWindVaneFileDragleave}
                  onWindVaneFileDrop={onWindVaneFileDrop}
                  onClearWindVaneFile={onClearWindVaneFile}
                  onClearBrainholeInput={onClearBrainholeInput}
                  onGenerateBrainhole={onGenerateBrainhole}
                />
              </div>
            </div>
          ) : (
            <div className="left-panel-tab-body left-panel-tab-body-stages">
              {activeTab === 'stages' ? (
                <div className="left-stage-nav-card">
                  <div className="section-title section-title-tight">创作流程</div>
                  <StageIndicator
                    stage={stage}
                    activeStage={activeStageView}
                    orientation="vertical"
                    onNavigate={onNavigateStage}
                  />
                </div>
              ) : null}

              {activeTab === 'promptControl' ? (
                <section className="automation-panel">
                  <div className="section-title">提示词控制</div>
                  <div className="automation-switch-list">
                    {[
                      ['autoGeneratePlot', '自动生成剧情'],
                      ['autoGenerateChoices', '自动生成选项'],
                      ['generateBodyBeforeChoices', '选项前生成正文'],
                    ].map(([key, label]) => (
                      <label key={key} className="automation-switch-card">
                        <input
                          checked={promptAutomationSettings[key] !== false}
                          type="checkbox"
                          onChange={(event) => onUpdatePromptAutomationSetting?.(key, event.target.checked)}
                        />
                        <span className="automation-switch-body">
                          <span className="automation-switch-title">{label}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              ) : null}

              {activeTab === 'copyBody' ? (
                <section className="body-record-panel">
                  <div className="section-title">复制正文</div>
                  <div className="copy-body-tools">
                    <button
                      className="btn btn-primary btn-sm btn-block"
                      type="button"
                      disabled={!canCopyBody}
                      onClick={onCopyBody}
                    >
                      复制正文
                    </button>
                    <label className="copy-choice-toggle">
                      <input
                        checked={copySelectedChoicesWithBody}
                        type="checkbox"
                        onChange={(event) => onUpdateCopySelectedChoicesWithBody?.(event.target.checked)}
                      />
                      <span>复制选项</span>
                    </label>
                  </div>
                  <div className="copy-preview-panel">
                    <div className="copy-preview-header">
                      <span>将复制到剪切板</span>
                      <span>{copyBodyPreviewText.length} 字</span>
                    </div>
                    {copyBodyPreviewText ? (
                      <pre className="copy-preview-text">{copyBodyPreviewText}</pre>
                    ) : (
                      <div className="copy-preview-empty">暂无可复制正文</div>
                    )}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
