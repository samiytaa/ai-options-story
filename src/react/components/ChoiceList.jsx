import { useEffect, useMemo, useState } from 'react';
import {
  formatChoiceForDisplay,
  formatHookForDisplay,
  normalizeHookChoice,
  normalizePlotChoice,
} from '../../storyState.js';

export default function ChoiceList({
  options = [],
  type = 'option',
  selectedIndex = null,
  disabled = false,
  onSelect,
  onRegenerate,
  onGenerateResultVariants,
  onUpdateOption,
  onAddOption,
  onDeleteOption,
  onFavorite,
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showAddOptionModal, setShowAddOptionModal] = useState(false);
  const [manualOptionText, setManualOptionText] = useState('');
  const [manualResultText, setManualResultText] = useState('');
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [resultVariantIndex, setResultVariantIndex] = useState(null);
  const [resultVariants, setResultVariants] = useState([]);

  useEffect(() => {
    setEditingIndex(null);
    setEditingText('');
    setManualOptionText('');
    setManualResultText('');
    setShowAddOptionModal(false);
    setResultVariantIndex(null);
    setResultVariants([]);
    setCurrentViewIndex(0);
  }, [options, type]);

  const canGoPrev = currentViewIndex > 0;
  const canGoNext = currentViewIndex < options.length - 1;

  const choiceListClass = useMemo(() => {
    if (type === 'hook') return 'choice-list choice-list-hook';
    if (type === 'bighook') return 'choice-list choice-list-bighook';
    return 'choice-list choice-list-option';
  }, [type]);

  function labelForType(currentType) {
    if (currentType === 'hook') return '钩子';
    if (currentType === 'bighook') return '大钩子';
    return '选项';
  }

  function labelClassForType(currentType) {
    if (currentType === 'hook') return 'hook';
    if (currentType === 'bighook') return 'big-hook';
    return '';
  }

  function optionParts(option, index) {
    return normalizePlotChoice(option, index);
  }

  function hookParts(option, index) {
    return normalizeHookChoice(option, index, type);
  }

  function primaryLabelForType(currentType) {
    if (currentType === 'hook') return '钩子';
    if (currentType === 'bighook') return '大钩子';
    return '选项';
  }

  function secondaryLabelForType(currentType) {
    if (currentType === 'option') return '结果';
    return '剧情走向';
  }

  function optionCardKey(option, index) {
    return `${type}-${index}-${type === 'option' ? formatChoiceForDisplay(option) : formatHookForDisplay(option, type)}`;
  }

  function selectButtonText(index) {
    return selectedIndex === index ? '取消选中' : '选择';
  }

  function resultVariantModalTitle() {
    return type === 'option' ? '选择一个结果' : '选择一个剧情走向';
  }

  function currentResultVariantSource() {
    if (resultVariantIndex === null || !options[resultVariantIndex]) return '';
    return type === 'option'
      ? optionParts(options[resultVariantIndex], resultVariantIndex).option
      : hookParts(options[resultVariantIndex], resultVariantIndex).hook;
  }

  function startEdit(index, option) {
    setEditingIndex(index);
    setEditingText(type === 'option' ? formatChoiceForDisplay(option) : formatHookForDisplay(option, type));
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditingText('');
  }

  function saveEdit(index) {
    const value = editingText.trim();
    if (!value) return;
    onUpdateOption?.(
      index,
      type === 'option' ? normalizePlotChoice(value, index) : normalizeHookChoice(value, index, type),
      type,
    );
    cancelEdit();
  }

  function openResultVariants(index) {
    setResultVariantIndex(index);
    setResultVariants([]);
    onGenerateResultVariants?.(index, type, (variants = []) => {
      setResultVariants(variants);
    });
  }

  function closeResultVariants() {
    setResultVariantIndex(null);
    setResultVariants([]);
  }

  function applyResultVariant(variant) {
    if (resultVariantIndex === null || !variant) return;
    const current = type === 'option'
      ? optionParts(options[resultVariantIndex], resultVariantIndex)
      : hookParts(options[resultVariantIndex], resultVariantIndex);

    onUpdateOption?.(
      resultVariantIndex,
      type === 'option' ? { ...current, result: variant } : { ...current, direction: variant },
      type,
    );
    closeResultVariants();
  }

  function addManualOption() {
    const value = manualOptionText.trim();
    if (!value) return;
    onAddOption?.(
      type === 'option'
        ? { option: value, result: manualResultText.trim() }
        : { hook: value, direction: manualResultText.trim() },
      type,
    );
    setManualOptionText('');
    setManualResultText('');
    setShowAddOptionModal(false);
  }

  return (
    <div className={choiceListClass}>
      <div className="choice-compact-toolbar">
        <div className="choice-toolbar-left">
          <button className="btn btn-secondary btn-sm choice-nav-btn" type="button" disabled={disabled || !canGoPrev} onClick={() => setCurrentViewIndex((value) => value - 1)} title="上一个选项">
            ←
          </button>

          <div className="choice-indicator-compact">
            <span className="choice-counter">{currentViewIndex + 1} / {options.length}</span>
            <div className="choice-dots-compact">
              {options.map((_, index) => (
                <span
                  key={`dot-${index}`}
                  className={`carousel-dot${index === currentViewIndex ? ' active' : ''}`}
                  onClick={() => setCurrentViewIndex(index)}
                />
              ))}
            </div>
          </div>

          <button className="btn btn-secondary btn-sm choice-nav-btn" type="button" disabled={disabled || !canGoNext} onClick={() => setCurrentViewIndex((value) => value + 1)} title="下一个选项">
            →
          </button>
        </div>

        <div className="choice-toolbar-right">
          <span className="choice-type-badge">{labelForType(type)}池</span>
          {selectedIndex === null ? (
            <button className="btn btn-secondary btn-sm" type="button" disabled={disabled} onClick={() => onRegenerate?.(type)} title="重新生成选项">
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              重新生成
            </button>
          ) : null}
          {selectedIndex === null ? (
            <button className="btn btn-secondary btn-sm" type="button" disabled={disabled} onClick={() => setShowAddOptionModal(true)} title="手动添加选项">
              +
            </button>
          ) : null}
        </div>
      </div>

      <div className="choice-carousel-container">
        {options.map((option, index) => (
          <article
            key={optionCardKey(option, index)}
            className={`option-card${selectedIndex === index ? ' selected' : ''}${selectedIndex !== null && selectedIndex !== index ? ' muted' : ''}`}
            style={{ display: index === currentViewIndex ? undefined : 'none' }}
          >
            <span className={`opt-label ${labelClassForType(type)}`.trim()}>{labelForType(type)} {index + 1}</span>

            {type === 'option' ? (
              <div className="option-structured">
                <div className="option-part option-action">
                  <div className="option-part-header">
                    <span className="option-part-tag">选项</span>
                    <span className="option-part-attr">choice-primary</span>
                  </div>
                  <p>{optionParts(option, index).option}</p>
                </div>
                <div className="option-part option-result">
                  <div className="option-part-header">
                    <span className="option-part-tag">结果</span>
                    <span className="option-part-attr">choice-outcome</span>
                  </div>
                  <p>{optionParts(option, index).result}</p>
                </div>
              </div>
            ) : (
              <div className="option-structured">
                <div className="option-part option-action">
                  <div className="option-part-header">
                    <span className="option-part-tag">{primaryLabelForType(type)}</span>
                    <span className="option-part-attr">hook-primary</span>
                  </div>
                  <p>{hookParts(option, index).hook}</p>
                </div>
                <div className="option-part option-result">
                  <div className="option-part-header">
                    <span className="option-part-tag">剧情走向</span>
                    <span className="option-part-attr">hook-direction</span>
                  </div>
                  <p>{hookParts(option, index).direction}</p>
                </div>
              </div>
            )}

            {editingIndex === index ? (
              <div className="option-inline-editor">
                <span className="option-part-label">编辑{labelForType(type)}</span>
                <textarea value={editingText} onChange={(event) => setEditingText(event.target.value)} className="choice-edit-textarea" />
                <div className="btn-row option-actions">
                  <button className="btn btn-primary btn-sm" type="button" disabled={disabled || !editingText.trim()} onClick={() => saveEdit(index)}>
                    保存
                  </button>
                  <button className="btn btn-secondary btn-sm" type="button" disabled={disabled} onClick={cancelEdit}>
                    取消
                  </button>
                </div>
              </div>
            ) : null}

            <div className="option-card-footer">
              <div className="btn-row option-actions">
                <button className="btn btn-primary btn-sm" type="button" disabled={disabled || (selectedIndex !== null && selectedIndex !== index)} onClick={() => onSelect?.(index, type)}>
                  {selectButtonText(index)}
                </button>
                <button className="btn btn-secondary btn-sm" type="button" disabled={disabled} onClick={() => startEdit(index, option)}>
                  修改
                </button>
                <button className="btn btn-secondary btn-sm" type="button" disabled={disabled || selectedIndex !== null} onClick={() => openResultVariants(index)}>
                  重新生成{secondaryLabelForType(type)}
                </button>
                <button className="btn btn-danger btn-sm" type="button" disabled={disabled || selectedIndex !== null} onClick={() => onDeleteOption?.(index, type)}>
                  删除
                </button>
              </div>
              <button className="btn btn-secondary btn-sm option-favorite-btn" type="button" disabled={disabled} onClick={() => onFavorite?.(option, index, type)}>
                收藏
              </button>
            </div>
          </article>
        ))}
      </div>

      {selectedIndex !== null && options[selectedIndex] ? (
        <div className={`selected-choice-banner${type !== 'option' ? ' hook-type' : ''}`}>
          <span>已选择{labelForType(type)} {selectedIndex + 1}</span>
          {type === 'option' ? (
            <>
              <div className="selected-choice-block">
                <div className="selected-choice-block-header">
                  <span className="selected-choice-block-tag">选项</span>
                  <span className="selected-choice-block-attr">choice-primary</span>
                </div>
                <p className="selected-choice-option">{optionParts(options[selectedIndex], selectedIndex).option}</p>
              </div>
              <div className="selected-choice-block">
                <div className="selected-choice-block-header">
                  <span className="selected-choice-block-tag">结果</span>
                  <span className="selected-choice-block-attr">choice-outcome</span>
                </div>
                <p className="selected-choice-result-text">{optionParts(options[selectedIndex], selectedIndex).result}</p>
              </div>
            </>
          ) : (
            <>
              <div className="selected-choice-block">
                <div className="selected-choice-block-header">
                  <span className="selected-choice-block-tag">{primaryLabelForType(type)}</span>
                  <span className="selected-choice-block-attr">hook-primary</span>
                </div>
                <p className="selected-choice-option">{hookParts(options[selectedIndex], selectedIndex).hook}</p>
              </div>
              <div className="selected-choice-block">
                <div className="selected-choice-block-header">
                  <span className="selected-choice-block-tag">剧情走向</span>
                  <span className="selected-choice-block-attr">hook-direction</span>
                </div>
                <p className="selected-choice-result-text">{hookParts(options[selectedIndex], selectedIndex).direction}</p>
              </div>
            </>
          )}
        </div>
      ) : null}

      {showAddOptionModal ? (
        <div className="modal-backdrop choice-add-backdrop" onClick={() => setShowAddOptionModal(false)}>
          <section className="settings-modal choice-add-modal" role="dialog" aria-modal="true" aria-labelledby="choice-add-title" onClick={(event) => event.stopPropagation()}>
            <header className="settings-modal-header">
              <div>
                <h2 id="choice-add-title">添加{labelForType(type)}</h2>
                <p>{primaryLabelForType(type)}必填，{secondaryLabelForType(type)}可以留空。</p>
              </div>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowAddOptionModal(false)}>关闭</button>
            </header>

            <div className="settings-modal-body">
              <div className="choice-add-form">
                <label htmlFor="manual-choice-option">{primaryLabelForType(type)}</label>
                <textarea
                  id="manual-choice-option"
                  value={manualOptionText}
                  onChange={(event) => setManualOptionText(event.target.value)}
                  className="choice-add-textarea"
                  placeholder={type === 'option' ? '角色采取的行为' : `输入${labelForType(type)}内容`}
                />

                <label htmlFor="manual-choice-result">{secondaryLabelForType(type)}</label>
                <textarea
                  id="manual-choice-result"
                  value={manualResultText}
                  onChange={(event) => setManualResultText(event.target.value)}
                  className="choice-add-textarea"
                  placeholder={type === 'option' ? '行为推进后的最后结果，可留空' : '选择这个钩子后的剧情展开方向，可留空'}
                />
              </div>
            </div>

            <footer className="settings-modal-footer">
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowAddOptionModal(false)}>取消</button>
              <button className="btn btn-primary btn-sm" type="button" disabled={disabled || !manualOptionText.trim()} onClick={addManualOption}>
                保存
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {resultVariantIndex !== null ? (
        <div className="modal-backdrop choice-add-backdrop" onClick={closeResultVariants}>
          <section className="settings-modal choice-add-modal" role="dialog" aria-modal="true" aria-labelledby="choice-result-variant-title" onClick={(event) => event.stopPropagation()}>
            <header className="settings-modal-header">
              <div>
                <h2 id="choice-result-variant-title">{resultVariantModalTitle()}</h2>
                <p>会保留当前{primaryLabelForType(type)}，只替换{secondaryLabelForType(type)}。</p>
              </div>
              <button className="btn btn-secondary btn-sm" type="button" onClick={closeResultVariants}>关闭</button>
            </header>

            <div className="settings-modal-body">
              {currentResultVariantSource() ? (
                <section className="choice-result-source">
                  <span className="option-part-label">当前{primaryLabelForType(type)}</span>
                  <p>{currentResultVariantSource()}</p>
                </section>
              ) : null}

              {!resultVariants.length ? (
                <div className="choice-result-variant-empty">正在生成候选...</div>
              ) : (
                <div className="choice-result-variant-list">
                  {resultVariants.map((variant, index) => (
                    <article key={`variant-${index}`} className="choice-result-variant-card">
                      <span className="option-part-label">{secondaryLabelForType(type)} {index + 1}</span>
                      <p>{variant}</p>
                      <button className="btn btn-primary btn-sm" type="button" disabled={disabled} onClick={() => applyResultVariant(variant)}>
                        选用这个
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
