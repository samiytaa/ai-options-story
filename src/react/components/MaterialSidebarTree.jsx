export default function MaterialSidebarTree({
  data,
  onCreateExample,
  onUploadExamples,
  onSearchExamples,
  onOpenExample,
  onClearTrackProducts,
  onSelectTrackProduct,
  onClearAssetLibrary,
  onSelectAssetType,
  onToggleFolder,
}) {
  const mode = data?.mode || 'assets';

  return (
    <div className="tree" id="sidebar-tree">
      {mode === 'examples' ? (
        <>
          <div className="tree-section-title asset-section-title">例文库</div>
          <div className="input-actions" style={{ marginBottom: 8 }}>
            <button type="button" className="tree-action-button" onClick={() => onCreateExample?.()}>
              手动新增
            </button>
            <button type="button" className="tree-action-button" onClick={() => onUploadExamples?.()}>
              上传文件
            </button>
          </div>
          <div className="tree-note">{`共 ${Number(data.exampleTotal || 0)} 篇，当前 ${Number(data.exampleVisible || 0)} 篇`}</div>
          <input
            type="text"
            className="input-title-field"
            placeholder="搜索标题、正文、标签"
            value={data.exampleSearchKeyword || ''}
            onChange={(event) => onSearchExamples?.(event.target.value)}
          />
          <div className="track-sample-list">
            {Array.isArray(data.examples) && data.examples.length ? data.examples.map((example) => (
              <button
                key={example.id}
                type="button"
                className={`track-sample-item${example.active ? ' active' : ''}`}
                onClick={() => onOpenExample?.(example.id)}
              >
                <span className="track-folder">{`📄 ${example.title || '未命名例文'}`}</span>
                <span className="track-desc">{example.meta || ''}</span>
              </button>
            )) : <div className="tree-note">暂无例文</div>}
          </div>
        </>
      ) : null}

      {mode === 'trackProducts' ? (
        <>
          <div className="tree-section-title asset-section-title">赛道产物</div>
          <button type="button" className="tree-action-button danger" onClick={() => onClearTrackProducts?.()}>
            清除赛道产物
          </button>
          <div className="tree-note">
            {`建议赛道：${data.suggestedTrack || 'UNKNOWN'}；确认赛道：${data.confirmedTrack || '未确认'}；故事：${data.storySlug || ''}`}
          </div>
          <div className="track-sample-list">
            {(data.trackProducts || []).map((product) => (
              <button
                key={product.kind}
                type="button"
                className={`track-sample-item${product.active ? ' active' : ''}`}
                onClick={() => onSelectTrackProduct?.(product.kind)}
              >
                <span className="track-folder">{`📁 ${product.kind}`}</span>
                <span className="track-desc">{product.path || ''}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {mode === 'assets' ? (
        <>
          <div className="tree-section-title asset-section-title">DNA资产库</div>
          <button type="button" className="tree-action-button danger" onClick={() => onClearAssetLibrary?.()}>
            清除资产库
          </button>
          {(data.assetLevels || []).map((level) => (
            <div key={level.id}>
              <div
                className={`tree-folder level-folder ${level.className || ''} open`}
                id={`${level.id}-header`}
                onClick={() => onToggleFolder?.(level.id)}
              >
                <span className="icon">▶</span>
                <span className="level-folder-title">{level.title}</span>
              </div>
              <div className="tree-children show" id={level.id}>
                {(level.items || []).map((item) => (
                  <div
                    key={item.type}
                    className={`tree-item${item.active ? ' active' : ''}`}
                    data-asset-type={item.type}
                    data-level={item.level}
                    id={`tree-${item.type}`}
                    onClick={() => onSelectAssetType?.(item.type)}
                  >
                    <span className="asset-display-index">{item.displayIndex}</span>
                    <span className="asset-icon">{item.icon}</span>
                    <span className="asset-tree-main">
                      <span className="asset-tree-name">{item.name}</span>
                    </span>
                    <span className={`badge ${String(item.level || '').toLowerCase()}`}>{item.level}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
