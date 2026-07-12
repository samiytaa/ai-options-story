import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const MAX_HISTORY_STEPS = 30;
const HISTORY_IDLE_DELAY = 1000;

const PLACEHOLDER_DESCRIPTIONS = {
  storyStartSection: '开篇补充信息。如果用户手动输入了故事开头，会把这段内容拼进生成脑洞的提示词里。',
  windVaneSection: '本月小说风向标内容。来自上传或输入的风向标，用来指导脑洞方向。',
  contextSummary: '当前故事上下文汇总。通常包含已选脑洞、导语、剧情点、选项、钩子等已生成内容。',
  chapterNum: '当前章节编号。用于告诉 AI 正在处理第几章。',
  plotIndex: '当前剧情点编号。用于告诉 AI 正在处理本章第几个剧情点。',
  currentPlotDesc: '当前剧情点正文。生成后续选项时，AI 会基于它判断下一步怎么分支。',
  chosenOptionText: '用户刚选中的剧情选项。生成下一个剧情点时会承接这个选择。',
  chapterFourHookNote: '第四章后的特殊提醒。用于提示 AI 此处可能需要更强的大钩子或最终走向。',
  style: '指定文风。最终成文时会按这里的风格扩写完整小说。',
};

function historyKey(promptId, fieldKey) {
  return `${promptId}:${fieldKey}`;
}

function clampTemperature(value) {
  const temperature = Number(value);
  if (!Number.isFinite(temperature)) return null;
  return Math.min(2, Math.max(0, temperature));
}

function highlightedPromptParts(value) {
  const parts = [];
  const source = String(value || '');
  const placeholderPattern = /\{\{\w+\}\}/g;
  let cursor = 0;

  for (const match of source.matchAll(placeholderPattern)) {
    if ((match.index || 0) > cursor) {
      parts.push({ text: source.slice(cursor, match.index), isPlaceholder: false });
    }
    parts.push({ text: match[0], isPlaceholder: true });
    cursor = (match.index || 0) + match[0].length;
  }

  if (cursor < source.length) {
    parts.push({ text: source.slice(cursor), isPlaceholder: false });
  }

  return parts.length ? parts : [{ text: ' ', isPlaceholder: false }];
}

function getEditableText(element) {
  return element.innerText.replace(/\u00a0/g, ' ');
}

function getCaretOffset(root) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return 0;
  const range = selection.getRangeAt(0);
  const prefixRange = range.cloneRange();
  prefixRange.selectNodeContents(root);
  prefixRange.setEnd(range.endContainer, range.endOffset);
  return prefixRange.toString().length;
}

function setCaretOffset(root, offset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();

  while (node) {
    if (remaining <= node.textContent.length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    remaining -= node.textContent.length;
    node = walker.nextNode();
  }

  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

export default function PromptConfigModal({
  visible = false,
  promptConfigs = [],
  activePromptId = '',
  activePromptConfig = null,
  editorVersion = 0,
  modalTitle = '提示词控制台',
  modalDescription = '',
  placeholderDescriptions = {},
  onClose,
  onUpdateActivePromptId,
  onUpdatePromptConfig,
  onReset,
}) {
  const promptHistoriesRef = useRef({});
  const pendingHistoryBaselinesRef = useRef(new Map());
  const pendingHistoryTimersRef = useRef(new Map());
  const editorRefs = useRef({});
  const pendingCaretRef = useRef(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  const mergedPlaceholderDescriptions = useMemo(
    () => ({
      ...PLACEHOLDER_DESCRIPTIONS,
      ...(placeholderDescriptions || {}),
    }),
    [placeholderDescriptions],
  );

  const activePromptPlaceholders = useMemo(() => {
    if (!activePromptConfig) return [];
    const source = `${activePromptConfig.systemPrompt || ''}\n${activePromptConfig.userPrompt || ''}`;
    const names = Array.from(source.matchAll(/\{\{(\w+)\}\}/g), (match) => match[1]);
    return [...new Set(names)].map((name) => ({
      name,
      description: mergedPlaceholderDescriptions[name] || '运行时动态替换的内容。这个占位符还没有写入说明表。',
    }));
  }, [activePromptConfig, mergedPlaceholderDescriptions]);

  function forceHistoryRefresh() {
    setHistoryVersion((value) => value + 1);
  }

  function getHistory(promptId, fieldKey) {
    const key = historyKey(promptId, fieldKey);
    if (!promptHistoriesRef.current[key]) {
      promptHistoriesRef.current[key] = {
        past: [],
        future: [],
      };
    }
    return promptHistoriesRef.current[key];
  }

  function getPromptFieldValue(promptId, fieldKey) {
    const prompt = promptConfigs.find((item) => item.id === promptId);
    return String(prompt?.[fieldKey] || '');
  }

  function pushHistoryStep(promptId, fieldKey, value) {
    const history = getHistory(promptId, fieldKey);
    if (history.past[history.past.length - 1] === value) return;
    history.past.push(value);
    if (history.past.length > MAX_HISTORY_STEPS) {
      history.past.shift();
    }
    history.future = [];
    forceHistoryRefresh();
  }

  function clearPendingHistoryTimer(key) {
    window.clearTimeout(pendingHistoryTimersRef.current.get(key));
    pendingHistoryTimersRef.current.delete(key);
  }

  function commitPendingHistory(promptId, fieldKey) {
    const key = historyKey(promptId, fieldKey);
    if (!pendingHistoryBaselinesRef.current.has(key)) return;

    clearPendingHistoryTimer(key);
    const baselineValue = pendingHistoryBaselinesRef.current.get(key);
    pendingHistoryBaselinesRef.current.delete(key);

    if (getPromptFieldValue(promptId, fieldKey) !== baselineValue) {
      pushHistoryStep(promptId, fieldKey, baselineValue);
      return;
    }

    forceHistoryRefresh();
  }

  function commitAllPendingHistory() {
    const keys = Array.from(pendingHistoryBaselinesRef.current.keys());
    keys.forEach((key) => {
      const [promptId, fieldKey] = key.split(':');
      commitPendingHistory(promptId, fieldKey);
    });
  }

  function schedulePendingHistoryCommit(promptId, fieldKey) {
    const key = historyKey(promptId, fieldKey);
    clearPendingHistoryTimer(key);
    pendingHistoryTimersRef.current.set(
      key,
      window.setTimeout(() => {
        commitPendingHistory(promptId, fieldKey);
      }, HISTORY_IDLE_DELAY),
    );
  }

  function updatePromptField(promptId, fieldKey, nextValue) {
    const currentValue = getPromptFieldValue(promptId, fieldKey);
    if (nextValue === currentValue) return;

    const key = historyKey(promptId, fieldKey);
    if (!pendingHistoryBaselinesRef.current.has(key)) {
      pendingHistoryBaselinesRef.current.set(key, currentValue);
    }
    schedulePendingHistoryCommit(promptId, fieldKey);
    onUpdatePromptConfig?.(promptId, fieldKey, nextValue);
  }

  function updatePromptTemperature(promptId, value) {
    const temperature = clampTemperature(value);
    if (temperature === null) return;
    onUpdatePromptConfig?.(promptId, 'temperature', temperature);
  }

  function undoPromptField(promptId, fieldKey) {
    commitPendingHistory(promptId, fieldKey);
    const history = getHistory(promptId, fieldKey);
    if (!history.past.length) return;
    const currentValue = getPromptFieldValue(promptId, fieldKey);
    const previousValue = history.past.pop();
    history.future.push(currentValue);
    onUpdatePromptConfig?.(promptId, fieldKey, previousValue);
    forceHistoryRefresh();
  }

  function redoPromptField(promptId, fieldKey) {
    commitPendingHistory(promptId, fieldKey);
    const history = getHistory(promptId, fieldKey);
    if (!history.future.length) return;
    const currentValue = getPromptFieldValue(promptId, fieldKey);
    const nextValue = history.future.pop();
    history.past.push(currentValue);
    if (history.past.length > MAX_HISTORY_STEPS) {
      history.past.shift();
    }
    onUpdatePromptConfig?.(promptId, fieldKey, nextValue);
    forceHistoryRefresh();
  }

  function historyStatus(promptId, fieldKey) {
    const history = getHistory(promptId, fieldKey);
    return {
      undoCount: history.past.length,
      redoCount: history.future.length,
    };
  }

  function handlePromptKeydown(event, promptId, fieldKey) {
    const isHistoryShortcut = event.ctrlKey || event.metaKey;
    if (!isHistoryShortcut) return;
    const key = event.key.toLowerCase();

    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undoPromptField(promptId, fieldKey);
    }

    if ((key === 'z' && event.shiftKey) || key === 'y') {
      event.preventDefault();
      redoPromptField(promptId, fieldKey);
    }
  }

  function handleRichPromptInput(event, promptId, fieldKey) {
    const editor = event.currentTarget;
    const caretOffset = getCaretOffset(editor);
    pendingCaretRef.current = {
      key: historyKey(promptId, fieldKey),
      offset: caretOffset,
    };
    updatePromptField(promptId, fieldKey, getEditableText(editor));
  }

  function handleRichPromptBlur(promptId, fieldKey) {
    commitPendingHistory(promptId, fieldKey);
  }

  function handleRichPromptPaste(event) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  }

  useEffect(() => {
    if (!visible) {
      commitAllPendingHistory();
    }
  }, [visible]);

  useEffect(
    () => () => {
      pendingHistoryTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      pendingHistoryTimersRef.current.clear();
    },
    [],
  );

  useLayoutEffect(() => {
    const pendingCaret = pendingCaretRef.current;
    if (!pendingCaret) return;
    const editor = editorRefs.current[pendingCaret.key];
    if (!editor) return;
    setCaretOffset(editor, pendingCaret.offset);
    pendingCaretRef.current = null;
  }, [
    activePromptConfig?.id,
    activePromptConfig?.systemPrompt,
    activePromptConfig?.userPrompt,
    editorVersion,
  ]);

  void historyVersion;

  if (!visible) return null;

  const systemHistory = activePromptConfig ? historyStatus(activePromptConfig.id, 'systemPrompt') : { undoCount: 0, redoCount: 0 };
  const userHistory = activePromptConfig ? historyStatus(activePromptConfig.id, 'userPrompt') : { undoCount: 0, redoCount: 0 };

  return (
    <div className="modal-backdrop fullscreen-backdrop" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className="prompt-modal" role="dialog" aria-modal="true" aria-labelledby="prompt-modal-title">
        <header className="prompt-modal-header">
          <div>
            <h2 id="prompt-modal-title">{modalTitle}</h2>
            {modalDescription ? <p>{modalDescription}</p> : null}
          </div>
          <div className="prompt-modal-actions">
            <button className="btn btn-danger btn-sm" type="button" onClick={onReset}>恢复默认</button>
            <button className="btn btn-secondary btn-sm" type="button" onClick={onClose}>关闭</button>
          </div>
        </header>

        <div className="prompt-workspace">
          <nav className="prompt-tabs" aria-label="提示词分类">
            {promptConfigs.map((prompt) => (
              <button
                key={prompt.id}
                className={`prompt-tab${prompt.id === activePromptId ? ' active' : ''}`}
                type="button"
                onClick={() => onUpdateActivePromptId?.(prompt.id)}
              >
                <span className="prompt-tab-heading">
                  <span>{prompt.title}</span>
                  {prompt.category ? (
                    <em className={`prompt-category-tag prompt-category-tag-${prompt.category}`}>{prompt.category}</em>
                  ) : null}
                </span>
                <small>{prompt.description}</small>
              </button>
            ))}
          </nav>

          {activePromptConfig ? (
            <article key={`${activePromptConfig.id}-${editorVersion}`} className="prompt-editor">
              <div className="prompt-editor-heading">
                <div>
                  <h3>{activePromptConfig.title}</h3>
                  <p>{activePromptConfig.description}</p>
                </div>
                <div className="prompt-temperature-control">
                  <label htmlFor={`${activePromptConfig.id}-temperature`}>温度</label>
                  <input
                    id={`${activePromptConfig.id}-temperature`}
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={activePromptConfig.temperature}
                    onChange={(event) => updatePromptTemperature(activePromptConfig.id, event.target.value)}
                  />
                  <input
                    className="prompt-temperature-number"
                    type="number"
                    min="0"
                    max="2"
                    step="0.05"
                    value={activePromptConfig.temperature}
                    onChange={(event) => updatePromptTemperature(activePromptConfig.id, event.target.value)}
                  />
                </div>
              </div>

              {activePromptPlaceholders.length ? (
                <section className="prompt-placeholder-help" aria-label="占位符说明">
                  <h4>占位符说明</h4>
                  <dl>
                    {activePromptPlaceholders.map((placeholder) => (
                      <div key={placeholder.name}>
                        <dt>{`{{${placeholder.name}}}`}</dt>
                        <dd>{placeholder.description}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              <div className="prompt-field-header">
                <label htmlFor={`${activePromptConfig.id}-system`}>System prompt</label>
                <div className="prompt-history-actions" aria-label="System prompt 历史记录">
                  <button
                    className="btn btn-secondary btn-xs"
                    type="button"
                    title="撤销"
                    aria-label="撤销"
                    disabled={!systemHistory.undoCount}
                    onClick={() => undoPromptField(activePromptConfig.id, 'systemPrompt')}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 14 4 9 9 4" />
                      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                    </svg>
                  </button>
                  <button
                    className="btn btn-secondary btn-xs"
                    type="button"
                    title="重做"
                    aria-label="重做"
                    disabled={!systemHistory.redoCount}
                    onClick={() => redoPromptField(activePromptConfig.id, 'systemPrompt')}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 14 20 9 15 4" />
                      <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
                    </svg>
                  </button>
                  <span>历史 {systemHistory.undoCount}/30</span>
                </div>
              </div>
              <div
                id={`${activePromptConfig.id}-system`}
                key={`${activePromptConfig.id}-system-${editorVersion}`}
                ref={(element) => {
                  editorRefs.current[historyKey(activePromptConfig.id, 'systemPrompt')] = element;
                }}
                className="prompt-textarea prompt-rich-editor system-prompt"
                role="textbox"
                aria-multiline="true"
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                onKeyDown={(event) => handlePromptKeydown(event, activePromptConfig.id, 'systemPrompt')}
                onInput={(event) => handleRichPromptInput(event, activePromptConfig.id, 'systemPrompt')}
                onBlur={() => handleRichPromptBlur(activePromptConfig.id, 'systemPrompt')}
                onPaste={handleRichPromptPaste}
              >
                {highlightedPromptParts(activePromptConfig.systemPrompt).map((part, index) => (
                  part.isPlaceholder ? (
                    <mark key={index} className="prompt-token-placeholder">{part.text}</mark>
                  ) : (
                    <span key={index}>{part.text}</span>
                  )
                ))}
              </div>

              <div className="prompt-field-header">
                <label htmlFor={`${activePromptConfig.id}-user`}>User prompt 模板</label>
                <div className="prompt-history-actions" aria-label="User prompt 历史记录">
                  <button
                    className="btn btn-secondary btn-xs"
                    type="button"
                    title="撤销"
                    aria-label="撤销"
                    disabled={!userHistory.undoCount}
                    onClick={() => undoPromptField(activePromptConfig.id, 'userPrompt')}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 14 4 9 9 4" />
                      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                    </svg>
                  </button>
                  <button
                    className="btn btn-secondary btn-xs"
                    type="button"
                    title="重做"
                    aria-label="重做"
                    disabled={!userHistory.redoCount}
                    onClick={() => redoPromptField(activePromptConfig.id, 'userPrompt')}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 14 20 9 15 4" />
                      <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
                    </svg>
                  </button>
                  <span>历史 {userHistory.undoCount}/30</span>
                </div>
              </div>
              <div
                id={`${activePromptConfig.id}-user`}
                key={`${activePromptConfig.id}-user-${editorVersion}`}
                ref={(element) => {
                  editorRefs.current[historyKey(activePromptConfig.id, 'userPrompt')] = element;
                }}
                className="prompt-textarea prompt-rich-editor"
                role="textbox"
                aria-multiline="true"
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                onKeyDown={(event) => handlePromptKeydown(event, activePromptConfig.id, 'userPrompt')}
                onInput={(event) => handleRichPromptInput(event, activePromptConfig.id, 'userPrompt')}
                onBlur={() => handleRichPromptBlur(activePromptConfig.id, 'userPrompt')}
                onPaste={handleRichPromptPaste}
              >
                {highlightedPromptParts(activePromptConfig.userPrompt).map((part, index) => (
                  part.isPlaceholder ? (
                    <mark key={index} className="prompt-token-placeholder">{part.text}</mark>
                  ) : (
                    <span key={index}>{part.text}</span>
                  )
                ))}
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
