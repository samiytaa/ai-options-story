import { useEffect, useState } from 'react';

export default function MaterialTrackDecisionModal({
  visible,
  primaryTrack = 'UNKNOWN',
  referenceTrack = '',
  referenceReason = '',
  knownTracks = [],
  onClose,
  onConfirm,
  onConfirmUnknown,
}) {
  const [draftTrack, setDraftTrack] = useState('');

  useEffect(() => {
    if (!visible) return;
    const nextDefaultTrack = referenceTrack && referenceTrack !== 'UNKNOWN' ? referenceTrack : '';
    setDraftTrack(nextDefaultTrack);
  }, [visible, referenceTrack]);

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
        aria-labelledby="material-track-decision-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="close" onClick={() => onClose?.()}>
          ✕
        </button>
        <h3 id="material-track-decision-title">未命中已有赛道</h3>
        <div className="track-decision-warning">
          <p>AI 没有把这篇内容归入当前已有赛道。请手动决定归类：选择一个已有赛道，或基于 AI 参考名称创建新赛道。</p>
          <div className="yaml-block">{`AI primary_track: ${primaryTrack || 'UNKNOWN'}\nAI 参考赛道: ${referenceTrack || '暂无'}\n原因: ${referenceReason || '暂无'}`}</div>
        </div>
        <div className="track-decision-section">
          <strong>已有赛道</strong>
          <div className="track-decision-grid">
            {knownTracks.map((track) => (
              <button
                key={track}
                type="button"
                className={`track-decision-chip ${draftTrack === track ? 'active' : ''}`}
                onClick={() => setDraftTrack(track)}
              >
                {track}
              </button>
            ))}
          </div>
        </div>
        <div className="track-decision-section">
          <strong>创建/手动更改赛道</strong>
          <input
            type="text"
            className="input-title-field"
            value={draftTrack}
            placeholder="输入新赛道名，例如：豪门复仇文"
            onChange={(event) => setDraftTrack(event.target.value)}
          />
          <div className="input-actions" style={{ marginTop: 8 }}>
            <button
              className="primary"
              type="button"
              onClick={() => onConfirm?.(draftTrack)}
            >
              确认归类
            </button>
            <button type="button" onClick={() => onConfirmUnknown?.()}>
              暂不归类
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
