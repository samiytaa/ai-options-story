import { useEffect, useState } from 'react';
import MaterialTrackManagerModal from './MaterialTrackManagerModal.jsx';
import MaterialTrackDecisionModal from './MaterialTrackDecisionModal.jsx';
import MaterialExampleEditorModal from './MaterialExampleEditorModal.jsx';
import MaterialExampleDeleteModal from './MaterialExampleDeleteModal.jsx';

const EMPTY_TRACK_MANAGER_STATE = {
  visible: false,
  tracks: [],
  onClose: null,
  onRename: null,
  onDelete: null,
};

const EMPTY_TRACK_DECISION_STATE = {
  visible: false,
  primaryTrack: 'UNKNOWN',
  referenceTrack: '',
  referenceReason: '',
  knownTracks: [],
  onClose: null,
  onConfirm: null,
  onConfirmUnknown: null,
};

const EMPTY_EXAMPLE_EDITOR_STATE = {
  visible: false,
  example: null,
  onClose: null,
  onSave: null,
};

const EMPTY_EXAMPLE_DELETE_STATE = {
  visible: false,
  example: null,
  onClose: null,
  onConfirm: null,
};

export default function MaterialCommandModalHost() {
  const [trackManagerState, setTrackManagerState] = useState(EMPTY_TRACK_MANAGER_STATE);
  const [trackDecisionState, setTrackDecisionState] = useState(EMPTY_TRACK_DECISION_STATE);
  const [exampleEditorState, setExampleEditorState] = useState(EMPTY_EXAMPLE_EDITOR_STATE);
  const [exampleDeleteState, setExampleDeleteState] = useState(EMPTY_EXAMPLE_DELETE_STATE);

  useEffect(() => {
    const bridge = {
      openTrackManager(config = {}) {
        setTrackManagerState({
          visible: true,
          tracks: Array.isArray(config.tracks) ? config.tracks : [],
          onClose: typeof config.onClose === 'function' ? config.onClose : null,
          onRename: typeof config.onRename === 'function' ? config.onRename : null,
          onDelete: typeof config.onDelete === 'function' ? config.onDelete : null,
        });
      },
      closeTrackManager() {
        setTrackManagerState((current) => {
          if (typeof current.onClose === 'function') {
            current.onClose();
          }
          return EMPTY_TRACK_MANAGER_STATE;
        });
      },
      openTrackDecision(config = {}) {
        setTrackDecisionState({
          visible: true,
          primaryTrack: String(config.primaryTrack || 'UNKNOWN').trim() || 'UNKNOWN',
          referenceTrack: String(config.referenceTrack || '').trim(),
          referenceReason: String(config.referenceReason || '').trim(),
          knownTracks: Array.isArray(config.knownTracks) ? config.knownTracks : [],
          onClose: typeof config.onClose === 'function' ? config.onClose : null,
          onConfirm: typeof config.onConfirm === 'function' ? config.onConfirm : null,
          onConfirmUnknown: typeof config.onConfirmUnknown === 'function' ? config.onConfirmUnknown : null,
        });
      },
      closeTrackDecision() {
        setTrackDecisionState((current) => {
          if (typeof current.onClose === 'function') {
            current.onClose();
          }
          return EMPTY_TRACK_DECISION_STATE;
        });
      },
      openExampleEditor(config = {}) {
        setExampleEditorState({
          visible: true,
          example: config.example && typeof config.example === 'object' ? config.example : null,
          onClose: typeof config.onClose === 'function' ? config.onClose : null,
          onSave: typeof config.onSave === 'function' ? config.onSave : null,
        });
      },
      closeExampleEditor() {
        setExampleEditorState((current) => {
          if (typeof current.onClose === 'function') {
            current.onClose();
          }
          return EMPTY_EXAMPLE_EDITOR_STATE;
        });
      },
      openExampleDelete(config = {}) {
        setExampleDeleteState({
          visible: true,
          example: config.example && typeof config.example === 'object' ? config.example : null,
          onClose: typeof config.onClose === 'function' ? config.onClose : null,
          onConfirm: typeof config.onConfirm === 'function' ? config.onConfirm : null,
        });
      },
      closeExampleDelete() {
        setExampleDeleteState((current) => {
          if (typeof current.onClose === 'function') {
            current.onClose();
          }
          return EMPTY_EXAMPLE_DELETE_STATE;
        });
      },
    };

    window.__materialCommandModalHost = bridge;

    return () => {
      if (window.__materialCommandModalHost === bridge) {
        delete window.__materialCommandModalHost;
      }
    };
  }, []);

  return (
    <div className="material-extractor-page">
      <div className="modal-overlay" id="modal-overlay" style={{ display: 'none' }}>
        <div className="modal" id="modal-content" />
      </div>

      <MaterialTrackManagerModal
        visible={trackManagerState.visible}
        tracks={trackManagerState.tracks}
        onClose={() => {
          window.__materialCommandModalHost?.closeTrackManager?.();
        }}
        onRename={trackManagerState.onRename}
        onDelete={trackManagerState.onDelete}
      />

      <MaterialTrackDecisionModal
        visible={trackDecisionState.visible}
        primaryTrack={trackDecisionState.primaryTrack}
        referenceTrack={trackDecisionState.referenceTrack}
        referenceReason={trackDecisionState.referenceReason}
        knownTracks={trackDecisionState.knownTracks}
        onClose={() => {
          window.__materialCommandModalHost?.closeTrackDecision?.();
        }}
        onConfirm={trackDecisionState.onConfirm}
        onConfirmUnknown={trackDecisionState.onConfirmUnknown}
      />

      <MaterialExampleEditorModal
        visible={exampleEditorState.visible}
        example={exampleEditorState.example}
        onClose={() => {
          window.__materialCommandModalHost?.closeExampleEditor?.();
        }}
        onSave={exampleEditorState.onSave}
      />

      <MaterialExampleDeleteModal
        visible={exampleDeleteState.visible}
        example={exampleDeleteState.example}
        onClose={() => {
          window.__materialCommandModalHost?.closeExampleDelete?.();
        }}
        onConfirm={exampleDeleteState.onConfirm}
      />
    </div>
  );
}
