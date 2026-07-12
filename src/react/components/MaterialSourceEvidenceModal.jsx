export default function MaterialSourceEvidenceModal({
  visible = false,
  supportsField = '',
  interpretation = '',
  excerptHtml = '',
  onClose,
}) {
  if (!visible) return null;

  return (
    <div className="modal-backdrop fullscreen-backdrop" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className="prompt-modal material-source-evidence-modal" role="dialog" aria-modal="true" aria-labelledby="material-source-evidence-title">
        <header className="prompt-modal-header">
          <div>
            <h2 id="material-source-evidence-title">来源文本定位</h2>
            <p>查看证据片段与其支撑的资产字段。</p>
          </div>
          <div className="prompt-modal-actions">
            <button className="btn btn-secondary btn-sm" type="button" onClick={onClose}>关闭</button>
          </div>
        </header>

        <div className="material-source-evidence-body">
          <div className="material-source-evidence-meta">
            <strong>{supportsField || '证据字段'}</strong>
            {interpretation ? <p>{interpretation}</p> : null}
          </div>
          <div className="material-source-evidence-content" dangerouslySetInnerHTML={{ __html: excerptHtml }} />
        </div>
      </section>
    </div>
  );
}
