function splitStoryParagraphs(text) {
  return String(text || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function AssistantWorkspace({
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
  return (
    <section className="assistant-panel assistant-workspace">
      <div className="assistant-target">
        {selectedStoryBlockContent ? (
          <>
            <div className="assistant-target-tools">
              <span>{selectedStoryBlockContent.replace(/\s/g, '').length} 字</span>
              {!isEditing ? (
                <button className="btn btn-secondary btn-sm" type="button" onClick={onStartEdit}>
                  编辑
                </button>
              ) : null}
            </div>
            {isEditing ? (
              <>
                <textarea
                  value={editingContent}
                  className="assistant-edit-textarea"
                  placeholder="编辑当前节点正文"
                  onChange={(event) => onUpdateEditingContent?.(event.target.value)}
                />
                <div className="assistant-edit-actions">
                  <button className="btn btn-primary btn-sm" type="button" onClick={onSaveEdit}>保存</button>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={onCancelEdit}>取消</button>
                </div>
              </>
            ) : (
              <div className="assistant-story-text">
                {splitStoryParagraphs(selectedStoryBlockContent).map((paragraph, index) => (
                  <p key={`selected-${index}`}>{paragraph}</p>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="outline-empty">请先在中间正文区选中一个剧情节点。</p>
        )}
      </div>

      <div className="assistant-thread" aria-live="polite">
        {assistantMessages.length ? (
          <div className="assistant-message-list">
            {assistantMessages.map((message) => (
              <article key={message.id} className={`assistant-message ${message.role}`}>
                {editingMessageId === message.id ? (
                  <>
                    <textarea
                      value={editingMessageContent}
                      className="assistant-message-edit"
                      placeholder="编辑这条消息"
                      onChange={(event) => onUpdateEditingMessageContent?.(event.target.value)}
                    />
                    <div className="assistant-message-actions">
                      <button className="btn btn-primary btn-sm" type="button" onClick={() => onSaveEditMessage?.(message)}>
                        保存
                      </button>
                      <button className="btn btn-secondary btn-sm" type="button" onClick={onCancelEditMessage}>
                        取消
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="assistant-story-text">
                      {splitStoryParagraphs(message.content).map((paragraph, index) => (
                        <p key={`${message.id}-${index}`}>{paragraph}</p>
                      ))}
                    </div>
                    <div className="assistant-message-actions">
                      <button className="btn btn-secondary btn-sm" type="button" disabled={assistantLoading} onClick={() => onStartEditMessage?.(message)}>
                        编辑
                      </button>
                      <button className="btn btn-secondary btn-sm" type="button" disabled={assistantLoading} onClick={() => onDeleteMessage?.(message)}>
                        删除
                      </button>
                      {message.role === 'assistant' ? (
                        <button className="btn btn-secondary btn-sm" type="button" disabled={assistantLoading} onClick={() => onRegenerateMessage?.(message)}>
                          重新生成
                        </button>
                      ) : null}
                      {message.role === 'assistant' ? (
                        <button className="btn btn-primary btn-sm" type="button" disabled={message.applied || assistantLoading} onClick={() => onApplyAssistantRewrite?.(message)}>
                          {message.applied ? '已应用' : '应用到当前节点'}
                        </button>
                      ) : null}
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="outline-empty">暂无对话</div>
        )}
      </div>

      <div className="assistant-composer">
        <textarea
          value={assistantInput}
          className="assistant-input"
          placeholder="例如：把这个剧情点写得更紧张；保留事件但弱化解释；改成更口语的短句。"
          disabled={assistantLoading}
          onChange={(event) => onUpdateAssistantInput?.(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              onSendAssistantMessage?.();
            }
          }}
        />
        <div className="assistant-actions">
          <button className="btn btn-primary btn-sm" type="button" disabled={!canUseAssistant || !assistantInput.trim()} onClick={onSendAssistantMessage}>
            {assistantLoading ? '生成中...' : '发送'}
          </button>
          <button className="btn btn-secondary btn-sm" type="button" disabled={assistantLoading || !assistantMessages.length} onClick={onClearAssistantConversation}>
            清空
          </button>
        </div>
      </div>
    </section>
  );
}
