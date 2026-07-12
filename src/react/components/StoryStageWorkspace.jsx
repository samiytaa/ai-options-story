import ArchitectureSetupStage from './ArchitectureSetupStage.jsx';
import BrainholeOptionsStage from './BrainholeOptionsStage.jsx';
import FinalWorkEditor from './FinalWorkEditor.jsx';

function splitStoryParagraphs(text) {
  return String(text || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function countStoryCharacters(text) {
  return String(text || '').replace(/\s/g, '').length;
}

function blockTypeClass(block, isPlotBlock) {
  if (isPlotBlock(block)) return 'stage-section-plot';
  if (block.id === 'guide') return 'stage-section-guide';
  if (block.id === 'final-work') return 'stage-section-final';
  if (block.id === 'brainhole-options') return 'stage-section-brainhole';
  return 'stage-section-generic';
}

function getBlockDnaReferenceItems(block) {
  return Array.isArray(block?.dnaReferenceItems) ? block.dnaReferenceItems : [];
}

function getSourceChoiceDnaReferenceItems(block) {
  return Array.isArray(block?.sourceChoice?.dnaReferenceItems) ? block.sourceChoice.dnaReferenceItems : [];
}

function showToolbarWordCount(block) {
  return block?.id === 'guide';
}

function showInlineWordCount(block) {
  return !showToolbarWordCount(block);
}

export default function StoryStageWorkspace({
  activeStageViewLabel = '',
  activeStageView = '',
  stageProgressText = '',
  activeStageEmptyText = '',
  visibleStoryBlocks = [],
  showBrainholeAction = false,
  showCurrentChoicePanel = false,
  showStylePanel = false,
  showFinalActions = false,
  architecturePlan = {},
  brainhole = '',
  guide = '',
  dnaAssetReferences = { brainhole: [], guide: [], outline: [] },
  dnaResultReferences = { brainholeOptions: [], guide: [], architecture: [] },
  pendingPlotGenerationAvailable = false,
  pendingChoiceGenerationAvailable = false,
  pendingChoiceGenerationLabel = '生成剧情选项',
  isLoading = false,
  loadingMessage = '',
  editingBlockId = null,
  editingContent = '',
  selectedStoryBlockId = '',
  storyStart = '',
  windVaneFile = null,
  brainholeOptions = [],
  selectedBrainholeIndex = null,
  brainholeScoreLabels = {},
  icons = {},
  currentChoiceTitle = '',
  currentChoices = [],
  currentChoiceType = 'option',
  selectedChoiceIndex = null,
  styleInput = '',
  customPromptInstruction = '',
  quickStyles = [],
  isPlotBlock = () => false,
  isLatestRegeneratablePlotBlock = () => false,
  formatPlotChoice = (choice) => (typeof choice === 'object' && choice ? choice : { option: choice || '', result: '' }),
  onFavoriteStoryBlock,
  onSelectStoryBlock,
  onStartEditBlock,
  onDeletePlotBlock,
  onRegeneratePlotBlockResult,
  onUpdateEditingContent,
  onUpdateFinalWorkDraft,
  onSaveFinalWork,
  onSaveEditBlock,
  onCancelEditBlock,
  onUpdateStoryStart,
  onChooseWindVaneFile,
  onWindVaneFileChange,
  onWindVaneFileDragover,
  onWindVaneFileDragleave,
  onWindVaneFileDrop,
  onClearWindVaneFile,
  onClearBrainholeOptions,
  onGenerateBrainhole,
  onOpenManualBrainholeModal,
  onSelectBrainholeOption,
  onUnselectBrainholeOption,
  onStartEditBrainholeOption,
  onFavoriteBrainholeOption,
  onDeleteBrainholeOption,
  onGenerateGuide,
  onSelectChoice,
  onRegenerateCurrentChoices,
  onGenerateCurrentChoiceResultVariants,
  onContinuePendingPlotGeneration,
  onGeneratePendingChoices,
  onUpdateCurrentChoiceOption,
  onAddCurrentChoiceOption,
  onDeleteCurrentChoiceOption,
  onFavoriteCurrentChoice,
  onUpdateStyleInput,
  onUpdateCustomPromptInstruction,
  onOpenDnaAsset,
  onFinalWriting,
  onCopyFinalWork,
  onDownloadFinalWork,
  onResetAll,
  onGenerateArchitecture,
  onConfirmArchitecture,
  onGeneratePersona,
  onConfirmPersona,
  onUpdateArchitectureField,
  onAddArchitectureActor,
  onRemoveArchitectureActor,
  onUpdateArchitectureActorField,
}) {
  const showEmptyState = (
    !visibleStoryBlocks.length &&
    !showBrainholeAction &&
    !showCurrentChoicePanel &&
    !showStylePanel &&
    !showFinalActions &&
    activeStageView !== 'architecture_setup' &&
    activeStageView !== 'persona_setup'
  );

  return (
    <>
      <div className="stage-view-heading">
        <div>
          <span className="stage-view-kicker">当前环节</span>
          <div className="stage-view-title-row">
            <h2>{activeStageViewLabel}</h2>
            {activeStageViewLabel === '脑洞' ? (
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                disabled={isLoading || !brainholeOptions.length}
                onClick={onClearBrainholeOptions}
              >
                清空脑洞
              </button>
            ) : null}
          </div>
        </div>
        <span className="stage-view-progress">生成进度：{stageProgressText}</span>
      </div>

      {showEmptyState ? <div className="stage-empty-state">{activeStageEmptyText}</div> : null}

      {(activeStageView === 'architecture_setup' || activeStageView === 'persona_setup') ? (
        <ArchitectureSetupStage
          architecturePlan={architecturePlan}
          mode={activeStageView === 'persona_setup' ? 'persona' : 'architecture'}
          brainhole={brainhole}
          guide={guide}
          referenceGroups={{ guide: dnaAssetReferences?.guide || [], outline: dnaAssetReferences?.outline || [] }}
          resultReferenceGroups={{ guide: dnaResultReferences?.guide || [], architecture: dnaResultReferences?.architecture || [] }}
          isLoading={isLoading}
          onGenerate={activeStageView === 'persona_setup' ? onGeneratePersona : onGenerateArchitecture}
          onConfirm={activeStageView === 'persona_setup' ? onConfirmPersona : onConfirmArchitecture}
          onUpdateField={onUpdateArchitectureField}
          onAddActor={onAddArchitectureActor}
          onRemoveActor={onRemoveArchitectureActor}
          onUpdateActorField={onUpdateArchitectureActorField}
        />
      ) : null}

      {visibleStoryBlocks.map((block) => (
        <section key={block.id} className={`stage-section ${blockTypeClass(block, isPlotBlock)}`}>
          {block.divider ? <div className="chapter-divider">{block.divider}</div> : null}
          {block.sourceChoice?.text && block.id !== 'brainhole-options' ? (
            <div
              className={`block-header-merged${block.sourceChoice?.text ? ' has-choice' : ''}${block.sourceChoice?.type !== 'option' ? ' hook-type' : ''}`}
            >
              <div className="selected-choice-content">
                <span className="selected-choice-label">已选择：{block.sourceChoice.label}</span>
                {block.sourceChoice.type === 'option' ? (
                  <>
                    <div className="choice-item">
                      <span className="choice-field-label">选项</span>
                      <p className="choice-field-text">{formatPlotChoice(block.sourceChoice.choice || block.sourceChoice.text).option}</p>
                    </div>
                    <div className="choice-item">
                      <span className="choice-field-label">结果</span>
                      <p className="choice-field-text">{formatPlotChoice(block.sourceChoice.choice || block.sourceChoice.text).result}</p>
                    </div>
                  </>
                ) : (
                  <>
                    {splitStoryParagraphs(block.sourceChoice.text).map((paragraph, index) => (
                      <div key={`${block.id}-source-${index}`} className="choice-item">
                        <span className="choice-field-label">
                          {index === 0 ? (block.sourceChoice.type === 'hook' ? '钩子' : '大钩子') : '剧情走向'}
                        </span>
                        <p className="choice-field-text">{paragraph}</p>
                      </div>
                    ))}
                  </>
                )}
                {getSourceChoiceDnaReferenceItems(block).length ? (
                  <div className="choice-reference-strip">
                    <span className="choice-field-label">引用 DNA</span>
                    <div className="btn-row">
                      {getSourceChoiceDnaReferenceItems(block).map((item) => (
                        <button
                          key={`source-${block.id}-${item.assetType}-${item.assetId}`}
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
              </div>
            </div>
          ) : null}

          <div className="story-block">
            {block.id !== 'brainhole-options' && (block.content || isPlotBlock(block)) ? (
              <div className="story-block-toolbar">
                {block.content && showToolbarWordCount(block) ? (
                  <span className="story-toolbar-word-count">{countStoryCharacters(block.content)} 字</span>
                ) : null}
                {block.content ? (
                  <button className="btn btn-secondary btn-sm" type="button" disabled={isLoading} onClick={() => onFavoriteStoryBlock?.(block)}>
                    收藏
                  </button>
                ) : null}
                {block.id !== 'final-work' && editingBlockId !== block.id ? (
                  <button className="btn btn-secondary btn-sm" type="button" disabled={isLoading} onClick={() => onStartEditBlock?.(block)}>
                    编辑
                  </button>
                ) : null}
                {isPlotBlock(block) ? (
                  <button className="btn btn-danger btn-sm" type="button" disabled={isLoading} onClick={() => onDeletePlotBlock?.(block)}>
                    删除
                  </button>
                ) : null}
                {isLatestRegeneratablePlotBlock(block) ? (
                  <button className="btn btn-secondary btn-sm" type="button" disabled={isLoading} onClick={() => onRegeneratePlotBlockResult?.(block)}>
                    重新生成结果
                  </button>
                ) : null}
              </div>
            ) : null}

            {getBlockDnaReferenceItems(block).length ? (
              <div className="choice-reference-strip">
                <span className="choice-field-label">本结果引用 DNA</span>
                <div className="btn-row">
                  {getBlockDnaReferenceItems(block).map((item) => (
                    <button
                      key={`block-${block.id}-${item.assetType}-${item.assetId}`}
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

            {editingBlockId === block.id ? (
              <>
                <textarea value={editingContent} className="edit-textarea" onChange={(event) => onUpdateEditingContent?.(event.target.value)} />
                <div className="btn-row edit-actions">
                  <button className="btn btn-primary btn-sm" type="button" disabled={isLoading} onClick={() => onSaveEditBlock?.(block.id)}>
                    保存
                  </button>
                  <button className="btn btn-secondary btn-sm" type="button" disabled={isLoading} onClick={onCancelEditBlock}>
                    取消
                  </button>
                </div>
              </>
            ) : block.id === 'final-work' ? (
              <FinalWorkEditor
                content={block.content}
                isLoading={isLoading}
                onUpdateContent={(value) => onUpdateFinalWorkDraft?.(block.id, value)}
                onSave={() => onSaveFinalWork?.(block.id)}
                onCopy={onCopyFinalWork}
                onDownload={onDownloadFinalWork}
              />
            ) : block.id === 'brainhole-options' ? (
              <BrainholeOptionsStage
                storyStart={storyStart}
                windVaneFile={windVaneFile}
                isLoading={isLoading}
                brainholeOptions={brainholeOptions}
                selectedBrainholeIndex={selectedBrainholeIndex}
                brainholeScoreLabels={brainholeScoreLabels}
                fileTextIconPaths={icons.fileText || []}
                showInputControls={false}
                showManualAdd={false}
                onUpdateStoryStart={onUpdateStoryStart}
                onChooseWindVaneFile={onChooseWindVaneFile}
                onWindVaneFileChange={onWindVaneFileChange}
                onWindVaneFileDragover={onWindVaneFileDragover}
                onWindVaneFileDragleave={onWindVaneFileDragleave}
                onWindVaneFileDrop={onWindVaneFileDrop}
                onClearWindVaneFile={onClearWindVaneFile}
                onGenerateBrainhole={onGenerateBrainhole}
                onOpenManualBrainholeModal={onOpenManualBrainholeModal}
                onSelectBrainholeOption={onSelectBrainholeOption}
                onUnselectBrainholeOption={onUnselectBrainholeOption}
                onStartEditBrainholeOption={onStartEditBrainholeOption}
                onFavoriteBrainholeOption={onFavoriteBrainholeOption}
                onDeleteBrainholeOption={onDeleteBrainholeOption}
              />
            ) : block.content ? (
              <button
                className={`content-block content-block-button ${block.blockClass || ''}${selectedStoryBlockId === block.id ? ' active' : ''}`}
                type="button"
                aria-label={`打开${block.title || '当前节点'}的 AI 助手`}
                aria-pressed={selectedStoryBlockId === block.id}
                onClick={() => onSelectStoryBlock?.(block)}
              >
                <div className="story-text-group">
                  {splitStoryParagraphs(block.content).map((paragraph, index) => (
                    <p key={`${block.id}-paragraph-${index}`}>{paragraph}</p>
                  ))}
                </div>
                {showInlineWordCount(block) ? <span className="story-word-count">{countStoryCharacters(block.content)} 字</span> : null}
              </button>
            ) : null}
          </div>
        </section>
      ))}

      {showBrainholeAction ? (
        <div className="action-panel action-panel-brainhole">
          <div className="panel-intro-row">
            <div>
              <span className="panel-kicker">起点确认</span>
              <div className="section-title">确认脑洞后继续推进</div>
            </div>
          </div>
          <button className="btn btn-primary" type="button" disabled={isLoading} onClick={onGenerateGuide}>
            生成导语
          </button>
          <section className="custom-prompt-panel" aria-label="本次额外生成要求">
            <label htmlFor="custom-prompt-instruction-guide">本次额外要求</label>
            <textarea
              id="custom-prompt-instruction-guide"
              value={customPromptInstruction}
              rows="3"
              placeholder="例如：让主角主动冒险、增加误会冲突、走向更悬疑但不要死人。会追加到当前生成按钮的提示词后。"
              disabled={isLoading}
              onChange={(event) => onUpdateCustomPromptInstruction?.(event.target.value)}
            />
          </section>
          <button className="manual-brainhole-add-card manual-brainhole-add-card-bottom" type="button" disabled={isLoading} onClick={onOpenManualBrainholeModal}>
            <span className="manual-brainhole-add-plus">+</span>
            <span>手动添加脑洞</span>
          </button>
        </div>
      ) : null}

      {showStylePanel ? (
        <div className="style-panel style-panel-final">
          <div className="panel-intro-row">
            <div>
              <span className="panel-kicker">成文阶段</span>
              <div className="section-title">输入文风，开始最终写作</div>
            </div>
          </div>
          <input
            value={styleInput}
            type="text"
            placeholder="例如：古龙风格、严肃文学、轻快言情、悬疑冷峻..."
            onChange={(event) => onUpdateStyleInput?.(event.target.value)}
          />
          <div className="btn-row quick-style-row">
            {quickStyles.map((style) => (
              <button key={style} className="btn btn-secondary btn-sm" type="button" onClick={() => onUpdateStyleInput?.(style)}>
                {style}
              </button>
            ))}
          </div>
          <button className="btn btn-gold btn-block" type="button" disabled={isLoading} onClick={onFinalWriting}>
            生成完整作品
          </button>
        </div>
      ) : null}

      {showFinalActions ? (
        <div className="btn-row action-panel">
          <button className="btn btn-primary btn-sm" type="button" onClick={onCopyFinalWork}>复制全文</button>
          <button className="btn btn-secondary btn-sm" type="button" onClick={onDownloadFinalWork}>下载 TXT</button>
          <button className="btn btn-secondary btn-sm" type="button" onClick={onResetAll}>开始新创作</button>
        </div>
      ) : null}

      {loadingMessage ? (
        <div className="loading-overlay">
          <span className="spinner" />
          {loadingMessage}
        </div>
      ) : null}
    </>
  );
}
