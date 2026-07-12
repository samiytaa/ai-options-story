import AssistantWorkspace from './AssistantWorkspace.jsx';

export default function AssistantFullscreenModal({
  visible = false,
  selectedStoryBlockTitle = '',
  selectedStoryBlockContent = '',
  assistantInput = '',
  assistantMessages = [],
  assistantLoading = false,
  canUseAssistant = false,
  editingContent = '',
  isEditing = false,
  editingMessageId = null,
  editingMessageContent = '',
  onClose,
  onUpdateAssistantInput,
  onUpdateEditingContent,
  onUpdateEditingMessageContent,
  onSendAssistantMessage,
  onApplyAssistantRewrite,
  onClearAssistantConversation,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onStartEditMessage,
  onSaveEditMessage,
  onCancelEditMessage,
  onDeleteMessage,
  onRegenerateMessage,
}) {
  if (!visible) return null;

  return (
    <div className="modal-backdrop fullscreen-backdrop" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className="assistant-modal" role="dialog" aria-modal="true" aria-labelledby="assistant-modal-title">
        <header className="assistant-modal-header">
          <div>
            <span className="stage-view-kicker">AI 助手</span>
            <h2 id="assistant-modal-title">{selectedStoryBlockTitle || '当前节点'}</h2>
          </div>
          <button className="btn btn-secondary btn-sm" type="button" onClick={onClose}>关闭</button>
        </header>

        <AssistantWorkspace
          selectedStoryBlockTitle={selectedStoryBlockTitle}
          selectedStoryBlockContent={selectedStoryBlockContent}
          assistantInput={assistantInput}
          assistantMessages={assistantMessages}
          assistantLoading={assistantLoading}
          canUseAssistant={canUseAssistant}
          editingContent={editingContent}
          isEditing={isEditing}
          editingMessageId={editingMessageId}
          editingMessageContent={editingMessageContent}
          onUpdateAssistantInput={onUpdateAssistantInput}
          onUpdateEditingContent={onUpdateEditingContent}
          onUpdateEditingMessageContent={onUpdateEditingMessageContent}
          onSendAssistantMessage={onSendAssistantMessage}
          onApplyAssistantRewrite={onApplyAssistantRewrite}
          onClearAssistantConversation={onClearAssistantConversation}
          onStartEdit={onStartEdit}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onStartEditMessage={onStartEditMessage}
          onSaveEditMessage={onSaveEditMessage}
          onCancelEditMessage={onCancelEditMessage}
          onDeleteMessage={onDeleteMessage}
          onRegenerateMessage={onRegenerateMessage}
        />
      </section>
    </div>
  );
}
