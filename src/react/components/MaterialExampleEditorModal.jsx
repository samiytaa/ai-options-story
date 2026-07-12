import { useEffect, useState } from 'react';

function buildDraft(example) {
  return {
    title: String(example?.title || ''),
    author: String(example?.author || ''),
    sourceNote: String(example?.sourceNote || ''),
    tags: Array.isArray(example?.tags) ? example.tags.join(', ') : '',
    content: String(example?.content || ''),
  };
}

export default function MaterialExampleEditorModal({
  visible,
  example = null,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(() => buildDraft(example));

  useEffect(() => {
    if (!visible) return;
    setDraft(buildDraft(example));
  }, [visible, example]);

  if (!visible) return null;

  const titleText = example?.id ? '编辑例文' : '新增例文';

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="material-example-editor-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="close" onClick={() => onClose?.()}>
          ✕
        </button>
        <h3 id="material-example-editor-title">{titleText}</h3>
        <div className="panel-body" style={{ padding: 0 }}>
          <input
            className="input-title-field"
            placeholder="标题"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          />
          <input
            className="input-title-field"
            placeholder="作者/来源"
            style={{ marginTop: 8 }}
            value={draft.author}
            onChange={(event) => setDraft((current) => ({ ...current, author: event.target.value }))}
          />
          <input
            className="input-title-field"
            placeholder="来源备注"
            style={{ marginTop: 8 }}
            value={draft.sourceNote}
            onChange={(event) => setDraft((current) => ({ ...current, sourceNote: event.target.value }))}
          />
          <input
            className="input-title-field"
            placeholder="标签，逗号分隔"
            style={{ marginTop: 8 }}
            value={draft.tags}
            onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
          />
          <textarea
            placeholder="例文正文"
            style={{ minHeight: 280, marginTop: 8 }}
            value={draft.content}
            onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
          />
          <div className="input-actions" style={{ marginTop: 8 }}>
            <button
              className="primary"
              type="button"
              onClick={() => onSave?.({
                title: draft.title,
                author: draft.author,
                sourceNote: draft.sourceNote,
                tags: draft.tags,
                content: draft.content,
              })}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
