import { useEffect, useRef, useState } from 'react';

export default function BrainholeOptionsStage({
  storyStart = '',
  windVaneFile = null,
  isLoading = false,
  brainholeOptions = [],
  selectedBrainholeIndex = null,
  brainholeScoreLabels = {},
  fileTextIconPaths = [],
  showUploadInput = true,
  showInputControls = true,
  showManualAdd = true,
  onUpdateStoryStart,
  onChooseWindVaneFile,
  onWindVaneFileChange,
  onWindVaneFileDragover,
  onWindVaneFileDragleave,
  onWindVaneFileDrop,
  onClearWindVaneFile,
  onGenerateBrainhole,
  onOpenManualBrainholeModal,
  onSelectBrainholeOption,
  onUnselectBrainholeOption,
  onStartEditBrainholeOption,
  onFavoriteBrainholeOption,
  onDeleteBrainholeOption,
}) {
  const uploadInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!windVaneFile && uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  }, [windVaneFile]);

  return (
    <>
      {showInputControls ? (
        <div className="brainhole-workspace">
          <section className="brainhole-control-card">
            <div className="brainhole-panel-header">
              <div>
                <span className="brainhole-panel-kicker">脑洞操作台</span>
                <h3>在这里继续补充或刷新脑洞候选</h3>
              </div>
              <span className="brainhole-panel-tip">不会清空当前已选脑洞之外的输入信息</span>
            </div>

            <div className="brainhole-form-grid">
              <label className="brainhole-field">
                <span>脑洞</span>
                <textarea
                  value={storyStart}
                  placeholder="补充一句新的起点设定，帮助 AI 重新发散脑洞。"
                  onChange={(event) => onUpdateStoryStart?.(event.target.value)}
                />
              </label>

              <div className="brainhole-field">
                <span>风向标文件</span>
                {!windVaneFile ? (
                  <div
                    className={`upload-area${isLoading ? ' upload-area-disabled' : ''}${isDragOver ? ' upload-area-dragover' : ''}`}
                    onClick={() => {
                      if (isLoading) return;
                      onChooseWindVaneFile?.();
                      uploadInputRef.current?.click();
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (isLoading) return;
                      setIsDragOver(true);
                      onWindVaneFileDragover?.(event);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setIsDragOver(false);
                      onWindVaneFileDragleave?.(event);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsDragOver(false);
                      onWindVaneFileDrop?.(event);
                    }}
                  >
                    <svg className="upload-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <div className="upload-text">
                      <span className="upload-title">点击或拖拽上传</span>
                      <span className="upload-hint">支持 .md / .txt / .json 格式</span>
                    </div>
                  </div>
                ) : (
                  <div className="uploaded-file-card">
                    <div className="uploaded-file-info">
                      <svg className="file-icon" viewBox="0 0 24 24" aria-hidden="true">
                        {fileTextIconPaths.map((path) => <path key={path} d={path} />)}
                      </svg>
                      <div className="uploaded-file-details">
                        <div className="uploaded-file-name">{windVaneFile.name}</div>
                        <div className="uploaded-file-meta">{windVaneFile.content.length} 字</div>
                      </div>
                    </div>
                    <button className="btn btn-danger btn-sm" type="button" disabled={isLoading} onClick={onClearWindVaneFile}>
                      清除
                    </button>
                  </div>
                )}
              </div>
            </div>

            {showUploadInput ? (
              <input
                ref={uploadInputRef}
                type="file"
                className="file-input-hidden"
                accept=".md,.txt,.json"
                disabled={isLoading}
                onChange={onWindVaneFileChange}
              />
            ) : null}

            <div className="brainhole-control-actions">
              <button className="btn btn-secondary btn-sm" type="button" disabled={isLoading} onClick={onGenerateBrainhole}>
                重新生成脑洞
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <div className="brainhole-grid">
        {brainholeOptions.map((option, index) => (
          <article
            key={`${index}-${option.title}`}
            className={`brainhole-card${selectedBrainholeIndex === index ? ' selected' : ''}`}
          >
            <div className="brainhole-card-head">
              <span className="brainhole-index">选项 {index + 1}</span>
              {selectedBrainholeIndex === index ? <span className="brainhole-selected">已选</span> : null}
            </div>
            <h3>{option.title}</h3>
            <p className="brainhole-idea">{option.idea}</p>
            <p className="brainhole-fit">{option.fit}</p>
            <div className="score-grid">
              {Object.entries(brainholeScoreLabels).map(([key, label]) => (
                <div key={key} className="score-pill">
                  <span>{label}</span>
                  <strong>{option.scores?.[key]}</strong>
                </div>
              ))}
            </div>
            {option.comment ? <p className="brainhole-comment">{option.comment}</p> : null}
            {option.recommendedReason ? <p className="brainhole-reason">{option.recommendedReason}</p> : null}
            <div className="btn-row brainhole-actions">
              {selectedBrainholeIndex !== index ? (
                <button className="btn btn-primary btn-sm" type="button" disabled={isLoading} onClick={() => onSelectBrainholeOption?.(index)}>
                  选这个
                </button>
              ) : (
                <button className="btn btn-secondary btn-sm" type="button" disabled={isLoading} onClick={onUnselectBrainholeOption}>
                  取消选定
                </button>
              )}
              <button className="btn btn-secondary btn-sm" type="button" disabled={isLoading} onClick={() => onStartEditBrainholeOption?.(index)}>
                编辑脑洞
              </button>
              <button className="btn btn-secondary btn-sm" type="button" disabled={isLoading} onClick={() => onFavoriteBrainholeOption?.(option, index)}>
                收藏
              </button>
              <button className="btn btn-danger btn-sm" type="button" disabled={isLoading} onClick={() => onDeleteBrainholeOption?.(index)}>
                删除
              </button>
            </div>
          </article>
        ))}
      </div>

      {showManualAdd ? (
        <button className="manual-brainhole-add-card" type="button" disabled={isLoading} onClick={onOpenManualBrainholeModal}>
          <span className="manual-brainhole-add-plus">+</span>
          <span>手动添加脑洞</span>
        </button>
      ) : null}
    </>
  );
}
