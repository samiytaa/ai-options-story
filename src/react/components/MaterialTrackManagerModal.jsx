import { useEffect, useState } from 'react';

function buildInitialDrafts(tracks = []) {
  return tracks.reduce((drafts, track) => {
    drafts[track.id] = track.id;
    return drafts;
  }, {});
}

export default function MaterialTrackManagerModal({
  visible,
  tracks = [],
  onClose,
  onRename,
  onDelete,
}) {
  const [drafts, setDrafts] = useState(() => buildInitialDrafts(tracks));

  useEffect(() => {
    if (!visible) return;
    setDrafts(buildInitialDrafts(tracks));
  }, [visible, tracks]);

  if (!visible) return null;

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
        aria-labelledby="material-track-manager-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="close" onClick={() => onClose?.()}>
          ✕
        </button>
        <h3 id="material-track-manager-title">管理赛道</h3>
        <div className="track-manager-modal">
          <p>查看当前赛道目录。默认赛道只读；自定义赛道支持重命名。仅当没有任何项目确认使用该赛道时，才允许删除。</p>
          <div className="track-manager-list">
            {tracks.map((track) => (
              <div key={track.id} className="track-manager-row">
                <div className="track-manager-row-main">
                  <input
                    type="text"
                    className="input-title-field"
                    value={drafts[track.id] ?? track.id}
                    disabled={!track.canRename}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDrafts((current) => ({
                        ...current,
                        [track.id]: value,
                      }));
                    }}
                  />
                  <div className="track-manager-meta">
                    <span>{track.isDefault ? '默认赛道' : '自定义赛道'}</span>
                    <span>{`项目占用 ${Number(track.usageCount || 0)}`}</span>
                    <span>{track.canDelete ? '可删除' : '不可删除'}</span>
                  </div>
                </div>
                <div className="track-manager-actions">
                  {track.canRename ? (
                    <button
                      type="button"
                      className="primary"
                      onClick={() => onRename?.(track.id, drafts[track.id] ?? track.id)}
                    >
                      重命名
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!track.canDelete}
                    onClick={() => onDelete?.(track.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
