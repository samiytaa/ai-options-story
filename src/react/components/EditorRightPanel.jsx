import { useMemo, useState } from 'react';
import ChoiceList from './ChoiceList.jsx';

function choicePanelClass(type) {
  if (type === 'hook') return 'choice-panel-hook';
  if (type === 'bighook') return 'choice-panel-bighook';
  return 'choice-panel-option';
}

export default function EditorRightPanel({
  collapsed = false,
  showCurrentChoicePanel = false,
  pendingPlotGenerationAvailable = false,
  pendingChoiceGenerationAvailable = false,
  pendingChoiceGenerationLabel = '生成剧情选项',
  currentChoiceTitle = '',
  currentChoices = [],
  currentChoiceType = 'option',
  selectedChoiceIndex = null,
  customPromptInstruction = '',
  dnaResultReferences = { currentHooks: [], currentBigHooks: [], currentOptions: [] },
  isLoading = false,
  onToggleCollapse,
  onSelectChoice,
  onRegenerateCurrentChoices,
  onGenerateCurrentChoiceResultVariants,
  onContinuePendingPlotGeneration,
  onGeneratePendingChoices,
  onUpdateCurrentChoiceOption,
  onAddCurrentChoiceOption,
  onDeleteCurrentChoiceOption,
  onFavoriteCurrentChoice,
  onUpdateCustomPromptInstruction,
  onOpenDnaAsset,
}) {
  const [showManualPendingChoiceModal, setShowManualPendingChoiceModal] = useState(false);
  const [manualPendingChoiceText, setManualPendingChoiceText] = useState('');
  const [manualPendingChoiceResult, setManualPendingChoiceResult] = useState('');

  const canAddManualPendingChoice = pendingChoiceGenerationLabel === '生成剧情选项';
  const currentChoiceReferenceItems = useMemo(() => {
    if (currentChoiceType === 'hook') return dnaResultReferences?.currentHooks || [];
    if (currentChoiceType === 'bighook') return dnaResultReferences?.currentBigHooks || [];
    if (currentChoiceType === 'option') return dnaResultReferences?.currentOptions || [];
    return [];
  }, [currentChoiceType, dnaResultReferences]);
  const showBranchWorkspace = showCurrentChoicePanel || pendingPlotGenerationAvailable || pendingChoiceGenerationAvailable;

  return (
    <>
      <aside className={`panel panel-right${collapsed ? ' collapsed' : ''}`}>
        <button
          className="panel-toggle"
          type="button"
          aria-expanded={(!collapsed).toString()}
          aria-label={collapsed ? '展开右侧区域' : '折叠右侧区域'}
          onClick={onToggleCollapse}
        >
          <svg className="panel-toggle-icon" viewBox="0 0 20 20" aria-hidden="true">
            {collapsed ? <path d="M12.5 4.5 7 10l5.5 5.5" /> : <path d="M7.5 4.5 13 10l-5.5 5.5" />}
          </svg>
        </button>
        {collapsed ? (
          <div className="panel-collapsed-hint" />
        ) : (
          <div className="panel-body panel-right-branch-body">
            {showBranchWorkspace ? (
              <div className="right-branch-workspace">
                {pendingChoiceGenerationAvailable ? (
                  <div className="action-panel action-panel-choice right-branch-section right-branch-section-compact">
                    <div className="panel-intro-row">
                      <div>
                        <span className="panel-kicker">分支生成</span>
                        <div className="section-title">为当前剧情点补充分支与走向</div>
                      </div>
                    </div>
                    <div className={`right-branch-action-group${!canAddManualPendingChoice ? ' single-action' : ''}`}>
                      <button className="btn btn-secondary right-branch-action-btn" type="button" disabled={isLoading} onClick={onGeneratePendingChoices}>
                        {pendingChoiceGenerationLabel}
                      </button>
                      {canAddManualPendingChoice ? (
                        <button
                          className="btn btn-secondary right-branch-action-btn"
                          type="button"
                          disabled={isLoading}
                          onClick={() => {
                            setManualPendingChoiceText('');
                            setManualPendingChoiceResult('');
                            setShowManualPendingChoiceModal(true);
                          }}
                        >
                          手动添加
                        </button>
                      ) : null}
                    </div>
                    <section className="custom-prompt-panel" aria-label="本次额外生成要求">
                      <label htmlFor="right-custom-prompt-instruction-choice">额外要求</label>
                      <textarea
                        id="right-custom-prompt-instruction-choice"
                        value={customPromptInstruction}
                        rows="2"
                        placeholder="例如：给出更激进/更保守/更反转的走向，选项之间差异要更大。会追加到当前生成按钮的提示词后。"
                        disabled={isLoading}
                        onChange={(event) => onUpdateCustomPromptInstruction?.(event.target.value)}
                      />
                    </section>
                  </div>
                ) : null}

                {showCurrentChoicePanel ? (
                  <div className={`choice-panel right-branch-section right-branch-section-compact ${choicePanelClass(currentChoiceType)}`}>
                    <div className="panel-intro-row panel-intro-row-choice">
                      <div>
                        <span className="panel-kicker">分支决策</span>
                        <div className="section-title">{currentChoiceTitle}</div>
                      </div>
                    </div>
                    {selectedChoiceIndex === null ? (
                      <section className="custom-prompt-panel custom-prompt-panel-inline" aria-label="本次额外生成要求">
                        <label htmlFor="right-custom-prompt-instruction-regenerate">重生成要求</label>
                        <textarea
                          id="right-custom-prompt-instruction-regenerate"
                          value={customPromptInstruction}
                          rows="1"
                          placeholder="例如：重新生成时让选项更有差异、结果更尖锐、走向更贴近你想要的方向。"
                          disabled={isLoading}
                          onChange={(event) => onUpdateCustomPromptInstruction?.(event.target.value)}
                        />
                      </section>
                    ) : null}
                    {currentChoiceReferenceItems.length ? (
                      <div className="choice-reference-strip">
                        <span className="choice-field-label">本轮生成引用 DNA</span>
                        <div className="btn-row right-branch-reference-list">
                          {currentChoiceReferenceItems.map((item) => (
                            <button
                              key={`current-choice-${currentChoiceType}-${item.assetType}-${item.assetId}`}
                              className="btn btn-secondary btn-sm"
                              type="button"
                              onClick={() => onOpenDnaAsset?.(item)}
                            >
                              {item.label || item.assetName || item.assetId || 'DNA资产'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <ChoiceList
                      options={currentChoices}
                      type={currentChoiceType}
                      selectedIndex={selectedChoiceIndex}
                      disabled={isLoading}
                      onSelect={onSelectChoice}
                      onRegenerate={onRegenerateCurrentChoices}
                      onGenerateResultVariants={onGenerateCurrentChoiceResultVariants}
                      onUpdateOption={onUpdateCurrentChoiceOption}
                      onAddOption={onAddCurrentChoiceOption}
                      onDeleteOption={onDeleteCurrentChoiceOption}
                      onFavorite={onFavoriteCurrentChoice}
                    />
                  </div>
                ) : null}

                {pendingPlotGenerationAvailable ? (
                  <div className="action-panel action-panel-plot right-branch-section right-branch-section-compact">
                    <div className="panel-intro-row">
                      <div>
                        <span className="panel-kicker">情节推进</span>
                        <div className="section-title">基于已选分支继续生成下一段剧情</div>
                      </div>
                    </div>
                    <button className="btn btn-primary right-branch-action-btn" type="button" disabled={isLoading} onClick={onContinuePendingPlotGeneration}>
                      生成下一段剧情
                    </button>
                    <section className="custom-prompt-panel" aria-label="本次额外生成要求">
                      <label htmlFor="right-custom-prompt-instruction-plot">额外要求</label>
                      <textarea
                        id="right-custom-prompt-instruction-plot"
                        value={customPromptInstruction}
                        rows="2"
                        placeholder="例如：让下一段更偏感情拉扯、加重代价、不要立刻揭晓真相。会追加到当前生成按钮的提示词后。"
                        disabled={isLoading}
                        onChange={(event) => onUpdateCustomPromptInstruction?.(event.target.value)}
                      />
                    </section>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="right-panel-empty-state">
                <span className="right-panel-empty-kicker">预留区域</span>
                <p>分支生成和选项选择会在可操作时显示在这里。</p>
              </div>
            )}
          </div>
        )}
      </aside>

      {showManualPendingChoiceModal ? (
        <div className="modal-backdrop choice-add-backdrop" onClick={() => setShowManualPendingChoiceModal(false)}>
          <section className="settings-modal choice-add-modal" role="dialog" aria-modal="true" aria-labelledby="manual-pending-choice-title" onClick={(event) => event.stopPropagation()}>
            <header className="settings-modal-header">
              <div>
                <h2 id="manual-pending-choice-title">手动添加剧情选项</h2>
                <p>选项必填，结果可以留空。保存后会进入当前剧情选项池。</p>
              </div>
              <button className="btn btn-secondary btn-sm" type="button" disabled={isLoading} onClick={() => setShowManualPendingChoiceModal(false)}>
                关闭
              </button>
            </header>
            <div className="settings-modal-body">
              <div className="choice-add-form">
                <label htmlFor="manual-pending-choice-option">选项</label>
                <textarea
                  id="manual-pending-choice-option"
                  value={manualPendingChoiceText}
                  className="choice-add-textarea"
                  placeholder="输入角色可以采取的行为或选择"
                  disabled={isLoading}
                  onChange={(event) => setManualPendingChoiceText(event.target.value)}
                />
                <label htmlFor="manual-pending-choice-result">结果</label>
                <textarea
                  id="manual-pending-choice-result"
                  value={manualPendingChoiceResult}
                  className="choice-add-textarea"
                  placeholder="输入选择后推动剧情的结果，可留空"
                  disabled={isLoading}
                  onChange={(event) => setManualPendingChoiceResult(event.target.value)}
                />
              </div>
            </div>
            <footer className="settings-modal-footer">
              <button className="btn btn-secondary btn-sm" type="button" disabled={isLoading} onClick={() => setShowManualPendingChoiceModal(false)}>
                取消
              </button>
              <button
                className="btn btn-primary btn-sm"
                type="button"
                disabled={isLoading || !manualPendingChoiceText.trim()}
                onClick={() => {
                  onAddCurrentChoiceOption?.({
                    option: manualPendingChoiceText.trim(),
                    result: manualPendingChoiceResult.trim(),
                  }, 'option');
                  setShowManualPendingChoiceModal(false);
                  setManualPendingChoiceText('');
                  setManualPendingChoiceResult('');
                }}
              >
                保存
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
