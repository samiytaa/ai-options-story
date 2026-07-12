import { useEffect, useMemo, useRef, useState } from 'react';

export default function BrainholeInputPanel({
  storyStart = '',
  windVaneFile = null,
  isLoading = false,
  referenceItems = [],
  resultReferenceItems = [],
  fileTextIconPaths = [],
  compact = false,
  showClearBrainhole = true,
  onUpdateStoryStart,
  onChooseWindVaneFile,
  onWindVaneFileChange,
  onWindVaneFileDragover,
  onWindVaneFileDragleave,
  onWindVaneFileDrop,
  onClearWindVaneFile,
  onClearBrainholeInput,
  onGenerateBrainhole,
}) {
  const uploadInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!windVaneFile && uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  }, [windVaneFile]);

  const referenceCountText = useMemo(() => `${referenceItems.length} 条`, [referenceItems.length]);
  const resultReferenceCountText = useMemo(() => `${resultReferenceItems.length} 条`, [resultReferenceItems.length]);

  return (
    <section className={`brainhole-control-card brainhole-input-card${compact ? ' compact' : ''}`}>
      <div className="brainhole-panel-header">
        <div>
          <span className="brainhole-panel-kicker" />
          {compact ? <h3 /> : null}
        </div>
        <span className="brainhole-panel-tip" />
      </div>

      {resultReferenceItems.length ? (
        <div className="brainhole-reference-card brainhole-reference-card-result">
          <div className="brainhole-reference-header">
            <span>当前脑洞结果引用来源</span>
            <span>{resultReferenceCountText}</span>
          </div>
          <div className="brainhole-reference-list">
            {resultReferenceItems.map((item) => (
              <article key={`result-${item.id}`} className="brainhole-reference-item">
                <div className="brainhole-reference-title">{item.label || item.assetName || item.assetType || 'DNA资产'}</div>
                {item.summary ? <p className="brainhole-reference-summary">{item.summary}</p> : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {referenceItems.length ? (
        <div className="brainhole-reference-card">
          <div className="brainhole-reference-header">
            <span>已引用的故事 DNA</span>
            <span>{referenceCountText}</span>
          </div>
          <div className="brainhole-reference-list">
            {referenceItems.map((item) => (
              <article key={item.id} className="brainhole-reference-item">
                <div className="brainhole-reference-title">{item.label || item.assetName || item.assetType || 'DNA资产'}</div>
                {item.summary ? <p className="brainhole-reference-summary">{item.summary}</p> : null}
                {item.assetType || item.assetId ? (
                  <div className="brainhole-reference-meta">
                    {item.assetType ? <span>{item.assetType}</span> : null}
                    {item.assetId ? <span>{item.assetId}</span> : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="brainhole-form-grid">
        <label className="brainhole-field">
          <span>脑洞</span>
          <textarea
            value={storyStart}
            placeholder={'可选。只输入故事的起点，不输入完整脑洞。\n例如：\n• 一个失忆的杀手在雨夜醒来\n• 修仙门派发现了一个没有灵根的弟子\n• 社畜意外继承了神秘古董店'}
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

      <input
        ref={uploadInputRef}
        type="file"
        className="file-input-hidden"
        accept=".md,.txt,.json"
        disabled={isLoading}
        onChange={onWindVaneFileChange}
      />

      <div className="brainhole-control-actions">
        {showClearBrainhole ? (
          <button className="btn btn-secondary" type="button" disabled={isLoading || !storyStart.trim()} onClick={onClearBrainholeInput}>
            清空脑洞
          </button>
        ) : null}
        <button className="btn btn-primary" type="button" disabled={isLoading} onClick={onGenerateBrainhole}>
          生成脑洞
        </button>
      </div>
    </section>
  );
}
