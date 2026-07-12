export default function MaterialExampleDeleteModal({
  visible,
  example = null,
  onClose,
  onConfirm,
}) {
  if (!visible || !example) return null;

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
        aria-labelledby="material-example-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="close" onClick={() => onClose?.()}>
          ✕
        </button>
        <h3 id="material-example-delete-title">删除例文</h3>
        <div>
          <p>{`确定删除《${example.title || '未命名例文'}》吗？`}</p>
          <div className="input-actions" style={{ marginTop: 8 }}>
            <button className="primary" type="button" onClick={() => onConfirm?.(example.id)}>
              确认删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
