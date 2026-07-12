function ExampleLinks({ links = [], onOpenAsset, onUseExample }) {
  if (!links.length) {
    return <div className="empty-state">该例文还没有关联索引</div>;
  }

  return (
    <div className="asset-related-list">
      {links.map((link, index) => (
        <button
          key={`${link.linkType || 'link'}:${link.targetId || link.exampleId || index}`}
          type="button"
          className="asset-related-chip"
          onClick={() => {
            if (link.linkType === 'asset') {
              onOpenAsset?.(link.targetType || '', link.targetId || '');
              return;
            }
            onUseExample?.(link.exampleId || '');
          }}
        >
          <span>{link.linkType || 'link'}</span>
          <strong>{link.title || link.targetId || '未命名关联'}</strong>
        </button>
      ))}
    </div>
  );
}

export default function MaterialExampleLibraryView({
  example = null,
  links = [],
  onCreate,
  onUpload,
  onUseExample,
  onEditExample,
  onDeleteExample,
  onOpenAsset,
}) {
  return (
    <div id="input-panel">
      <div className="panel">
        <div className="panel-header">📚 例文库</div>
        <div className="panel-body">
          {example ? (
            <>
              <div className="quick-stats">
                <span>标题: <span className="val">{example.title || '未命名例文'}</span></span>
                <span>字数: <span className="val">{String(example.content || '').length}</span></span>
                <span>标签: <span className="val">{(example.tags || []).join(' / ') || '无'}</span></span>
              </div>
              <div className="input-actions" style={{ marginTop: 8 }}>
                <button type="button" onClick={() => onCreate?.()}>手动新增</button>
                <button type="button" onClick={() => onUpload?.()}>上传文件</button>
              </div>
              <div className="input-actions" style={{ marginTop: 8 }}>
                <button className="primary" type="button" onClick={() => onUseExample?.(example.id)}>载入到当前输入区</button>
                <button type="button" onClick={() => onEditExample?.(example.id)}>编辑</button>
                <button type="button" onClick={() => onDeleteExample?.(example.id)}>删除</button>
              </div>
              <div className="yaml-block" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{example.content || ''}</div>
              <div className="asset-detail-section" style={{ marginTop: 12 }}>
                <div className="asset-detail-section-title">关联索引</div>
                <ExampleLinks
                  links={links}
                  onOpenAsset={onOpenAsset}
                  onUseExample={onUseExample}
                />
              </div>
            </>
          ) : (
            <>
              <div className="input-actions" style={{ marginTop: 8 }}>
                <button type="button" onClick={() => onCreate?.()}>手动新增</button>
                <button type="button" onClick={() => onUpload?.()}>上传文件</button>
              </div>
              <div className="empty-state">暂无例文，请先手动新增，或批量上传 TXT 文件，也可以在赛道分析 / DNA 抽取里上传文本自动沉淀。</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
