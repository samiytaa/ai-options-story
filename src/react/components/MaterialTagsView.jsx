function EmptyState({ icon, text, detail }) {
  return (
    <div className="empty-state compact">
      <span className="icon">{icon}</span>
      {text}
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export default function MaterialTagsView({
  categories = [],
  activeFilter = null,
  matches = [],
  onSelectTag,
  onClearFilter,
  onOpenAsset,
}) {
  if (!categories.length) {
    return (
      <div className="view-scroll-frame">
        <div className="empty-state">
          <span className="icon">🏷️</span>
          暂无真实标签
          <br />
          <small>请先完成 DNA 抽取，系统会从资产 tags 字段生成可反查标签索引。</small>
        </div>
      </div>
    );
  }

  return (
    <div className="view-scroll-frame">
      <div className="tag-index-grid">
        {categories.map((category) => (
          <div key={category.name} className="panel" style={{ flex: 1, minWidth: 250 }}>
            <div className="panel-header">{`🏷️ ${category.name}`}</div>
            <div className="panel-body">
              <div className="badge-row">
                {category.tags.map((tag) => {
                  const isActive = activeFilter?.category === category.name && activeFilter?.value === tag.value;
                  return (
                    <button
                      key={`${category.name}:${tag.value}`}
                      type="button"
                      className={`tag ${category.className} ${isActive ? 'active' : ''}`}
                      onClick={() => onSelectTag?.(category.name, tag.value)}
                    >
                      {tag.value} <span>{tag.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!activeFilter ? (
        <EmptyState icon="🏷️" text="点击任意标签，查看命中的资产并跳转到详情。" />
      ) : (
        <div className="panel tag-match-panel">
          <div className="panel-header">
            {`🔎 标签反查：${activeFilter.value}`}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text2)' }}>{`${matches.length} 条资产`}</span>
          </div>
          <div className="panel-body">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onClearFilter?.()}>
              清除筛选
            </button>
            <div className="tag-match-list" style={{ marginTop: 10 }}>
              {matches.length ? matches.map((match) => (
                <article key={`${match.assetType}:${match.assetId}:${match.recordIndex}`} className="asset-record-card tag-match-card">
                  <div className="asset-record-title">{`${match.assetIcon} ${match.assetId}`}</div>
                  <div className="asset-record-meta">{`${match.assetName} | ${match.level} | 置信度: ${match.confidence}`}</div>
                  <p style={{ color: 'var(--text2)', margin: '6px 0 8px' }}>{`命中标签：${activeFilter.category} / ${activeFilter.value}`}</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onOpenAsset?.(match.assetType, match.rawAssetId)}
                  >
                    打开资产详情
                  </button>
                </article>
              )) : <EmptyState icon="📭" text="暂无命中资产" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
