function hookChoiceParts(item) {
  const choice = item?.payload?.choice || {};
  return {
    hook: choice.hook || item?.payload?.text || item?.content || '',
    direction: choice.direction || item?.note || '',
  };
}

export default function FavoritesLibraryModal({
  visible = false,
  tabs = [],
  activeTab = 'brainhole',
  favorites = [],
  favoriteItems = [],
  canAppendFavoriteBrainhole = false,
  scoreLabels = {},
  normalizePlotChoice,
  onClose,
  onUpdateActiveTab,
  onOpenAddFavorite,
  onAppendBrainhole,
  onEditFavorite,
  onDeleteFavorite,
}) {
  if (!visible) return null;

  const activeTabMeta = tabs.find((tab) => tab.value === activeTab);

  return (
    <div className="modal-backdrop fullscreen-backdrop" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className="library-modal" role="dialog" aria-modal="true" aria-labelledby="favorites-modal-title">
        <header className="prompt-modal-header">
          <div>
            <h2 id="favorites-modal-title">收藏库</h2>
            <p />
          </div>
          <button className="btn btn-secondary btn-sm" type="button" onClick={onClose}>关闭</button>
        </header>

        <div className="library-workspace">
          <nav className="library-tabs" aria-label="收藏分类">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                className={`library-tab${activeTab === tab.value ? ' active' : ''}`}
                type="button"
                onClick={() => onUpdateActiveTab?.(tab.value)}
              >
                {tab.label}
                <span>{favorites.filter((item) => item.type === tab.value).length}</span>
              </button>
            ))}
          </nav>

          <section className="library-panel">
            <div className="library-panel-toolbar">
              <div>
                <div className="section-title section-title-tight">{activeTabMeta?.label}收藏</div>
                <p className="helper-text">手动新增会按当前分类保存完整结构化字段。</p>
              </div>
              <button className="btn btn-primary btn-sm" type="button" onClick={onOpenAddFavorite}>
                添加{activeTabMeta?.label}
              </button>
            </div>

            {favoriteItems.length ? (
              <div className="library-list">
                {favoriteItems.map((item) => (
                  <article key={item.id} className="library-item">
                    <div className="library-item-header">
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.projectName || '无项目'} · {new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="btn-row">
                        {item.type === 'brainhole' && canAppendFavoriteBrainhole ? (
                          <button className="btn btn-primary btn-sm" type="button" onClick={() => onAppendBrainhole?.(item)}>
                            添加为脑洞
                          </button>
                        ) : null}
                        <button className="btn btn-secondary btn-sm" type="button" onClick={() => onEditFavorite?.(item)}>编辑</button>
                        <button className="btn btn-danger btn-sm" type="button" onClick={() => onDeleteFavorite?.(item.id)}>删除</button>
                      </div>
                    </div>

                    {item.type === 'brainhole' && item.payload?.kind === 'brainhole-option' ? (
                      <>
                        <div className="library-content">{item.payload.idea}</div>
                        {item.payload.fit ? <p className="library-note">{item.payload.fit}</p> : null}
                        <div className="score-grid library-score-grid">
                          {Object.entries(scoreLabels).map(([key, label]) => (
                            <div key={key} className="score-pill">
                              <span>{label}</span>
                              <strong>{item.payload.scores?.[key] ?? 0}</strong>
                            </div>
                          ))}
                        </div>
                        {item.payload.comment ? <p className="library-note">{item.payload.comment}</p> : null}
                        {item.payload.recommendedReason ? <p className="brainhole-reason">{item.payload.recommendedReason}</p> : null}
                      </>
                    ) : item.type === 'plot' && item.payload?.kind === 'plot-point' ? (
                      <>
                        <div className="library-meta-row">
                          <span>第{item.payload.chapterNum}章</span>
                          <span>剧情点 {item.payload.plotIndex}</span>
                          <span>已选 {item.payload.chosenOption + 1}</span>
                        </div>
                        <div className="library-content">{item.payload.desc}</div>
                        {item.payload.options?.length ? (
                          <div className="library-choice-stack">
                            {item.payload.options.map((option, index) => (
                              <div
                                key={`plot-fav-${item.id}-${index}`}
                                className={`library-choice-detail${index === item.payload.chosenOption ? ' selected' : ''}`}
                              >
                                <span className="library-choice-label">选项 {index + 1}</span>
                                <p>{normalizePlotChoice(option, index).option}</p>
                                <small>结果：{normalizePlotChoice(option, index).result}</small>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : item.type === 'option' && item.payload?.kind === 'choice' ? (
                      <>
                        <div className="library-meta-row">
                          <span>
                            {item.payload.choiceKind === 'hook'
                              ? '章节钩子'
                              : item.payload.choiceKind === 'bighook'
                                ? '大钩子'
                                : '剧情选项'}
                          </span>
                          <span>{item.payload.label || `选项 ${item.payload.index + 1}`}</span>
                        </div>
                        {item.payload.choiceKind === 'option' ? (
                          <div className="library-choice-detail selected">
                            <span className="library-choice-label">选项</span>
                            <p>{item.payload.choice?.option}</p>
                            <small>结果：{item.payload.choice?.result}</small>
                          </div>
                        ) : (
                          <div className="library-choice-detail selected">
                            <span className="library-choice-label">{item.payload.choiceKind === 'hook' ? '钩子' : '大钩子'}</span>
                            <p>{hookChoiceParts(item).hook}</p>
                            <small>剧情走向：{hookChoiceParts(item).direction}</small>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="library-content">{item.content}</div>
                        {item.note ? <p className="library-note">{item.note}</p> : null}
                      </>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="outline-empty">这个分类还没有收藏</div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
