export default function FavoriteFormModal({
  visible = false,
  mode = 'add',
  type = 'brainhole',
  typeLabel = '收藏',
  description = '',
  draft,
  onClose,
  onSave,
}) {
  if (!visible) return null;

  const modalTitle = mode === 'edit' ? `编辑${typeLabel}收藏` : `添加${typeLabel}收藏`;

  return (
    <div className="modal-backdrop favorite-edit-backdrop" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className="settings-modal favorite-edit-modal" role="dialog" aria-modal="true" aria-labelledby={`${mode}-favorite-title`}>
        <header className="settings-modal-header">
          <div>
            <h2 id={`${mode}-favorite-title`}>{modalTitle}</h2>
            <p>{description}</p>
          </div>
          <button className="btn btn-secondary btn-sm" type="button" onClick={onClose}>关闭</button>
        </header>

        <div className="settings-modal-body">
          <div className="library-edit-form">
            <label>
              收藏标题
              <input value={draft.title} type="text" placeholder={mode === 'edit' ? '收藏标题' : '收藏标题，可选'} onChange={(event) => { draft.title = event.target.value; }} />
            </label>
            <label>
              项目名
              <input value={draft.projectName} type="text" placeholder="项目名，可选" onChange={(event) => { draft.projectName = event.target.value; }} />
            </label>

            {type === 'brainhole' ? (
              <>
                <label>
                  脑洞内容
                  <textarea value={draft.idea} className="brainhole-edit-idea" placeholder="脑洞内容" onChange={(event) => { draft.idea = event.target.value; }} />
                </label>
                <label>
                  契合点
                  <textarea value={draft.fit} placeholder="契合点" onChange={(event) => { draft.fit = event.target.value; }} />
                </label>
                <div className="score-edit-grid">
                  <label>新鲜度<input value={draft.freshness} type="number" min="0" max="10" onChange={(event) => { draft.freshness = Number(event.target.value); }} /></label>
                  <label>契合度<input value={draft.alignment} type="number" min="0" max="10" onChange={(event) => { draft.alignment = Number(event.target.value); }} /></label>
                  <label>爽点/虐点<input value={draft.payoff} type="number" min="0" max="10" onChange={(event) => { draft.payoff = Number(event.target.value); }} /></label>
                  <label>可写性<input value={draft.writability} type="number" min="0" max="10" onChange={(event) => { draft.writability = Number(event.target.value); }} /></label>
                </div>
                <label>
                  一句短评
                  <input value={draft.comment} type="text" placeholder="一句短评" onChange={(event) => { draft.comment = event.target.value; }} />
                </label>
                <label>
                  推荐理由
                  <input value={draft.recommendedReason} type="text" placeholder="推荐理由，可选" onChange={(event) => { draft.recommendedReason = event.target.value; }} />
                </label>
              </>
            ) : null}

            {type === 'plot' ? (
              <>
                <div className="favorite-edit-grid">
                  <label>章节<input value={draft.chapterNum} type="number" min="1" onChange={(event) => { draft.chapterNum = Number(event.target.value); }} /></label>
                  <label>剧情点序号<input value={draft.plotIndex} type="number" min="1" max="4" onChange={(event) => { draft.plotIndex = Number(event.target.value); }} /></label>
                  <label>已选索引（0-3）<input value={draft.chosenOption} type="number" min="0" max="3" onChange={(event) => { draft.chosenOption = Number(event.target.value); }} /></label>
                </div>
                <label>
                  剧情点内容
                  <textarea value={draft.plotDesc} className="brainhole-edit-idea" placeholder="剧情点内容" onChange={(event) => { draft.plotDesc = event.target.value; }} />
                </label>
                <label>
                  剧情点选项列表
                  <textarea value={draft.plotOptionsText} className="favorite-options-textarea" placeholder={'选项1：角色采取的行为\n结果1：行为导致的结果\n选项2：...\n结果2：...'} onChange={(event) => { draft.plotOptionsText = event.target.value; }} />
                </label>
              </>
            ) : null}

            {type === 'option' ? (
              <>
                <label>
                  选项类型
                  <select value={draft.choiceKind} onChange={(event) => { draft.choiceKind = event.target.value; }}>
                    <option value="option">剧情选项</option>
                    <option value="hook">章节钩子</option>
                    <option value="bighook">大钩子</option>
                  </select>
                </label>
                <div className="favorite-edit-grid two">
                  <label>原序号索引<input value={draft.optionIndex} type="number" min="0" onChange={(event) => { draft.optionIndex = Number(event.target.value); }} /></label>
                  <label>标签<input value={draft.optionLabel} type="text" placeholder="例如：选项 1 / 钩子 2" onChange={(event) => { draft.optionLabel = event.target.value; }} /></label>
                </div>
                <label>
                  {draft.choiceKind === 'option' ? '选项内容' : draft.choiceKind === 'hook' ? '钩子内容' : '大钩子内容'}
                  <textarea value={draft.optionText} placeholder="选项内容或钩子内容" onChange={(event) => { draft.optionText = event.target.value; }} />
                </label>
                <label>
                  {draft.choiceKind === 'option' ? '选项对应结果' : '剧情走向'}
                  <textarea value={draft.optionResult} placeholder={draft.choiceKind === 'option' ? '选项对应结果' : '选择这个钩子后的剧情展开方向'} onChange={(event) => { draft.optionResult = event.target.value; }} />
                </label>
              </>
            ) : null}

            {!['brainhole', 'plot', 'option'].includes(type) ? (
              <>
                <label>
                  收藏内容
                  <textarea value={draft.content} placeholder="收藏内容" onChange={(event) => { draft.content = event.target.value; }} />
                </label>
                <label>
                  备注
                  <input value={draft.note} type="text" placeholder="备注，可选" onChange={(event) => { draft.note = event.target.value; }} />
                </label>
              </>
            ) : null}
          </div>
        </div>

        <footer className="settings-modal-footer">
          <button className="btn btn-secondary btn-sm" type="button" onClick={onClose}>取消</button>
          <button className="btn btn-primary btn-sm" type="button" onClick={onSave}>保存</button>
        </footer>
      </section>
    </div>
  );
}
