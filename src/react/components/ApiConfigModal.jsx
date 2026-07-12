import { useMemo, useState } from 'react';

export default function ApiConfigModal({
  visible = false,
  apiConfigDraft,
  showApiKey = false,
  modelFetchLoading = false,
  onClose,
  onUpdateShowApiKey,
  onUpdateApiConfig,
  onFetchModels,
  onClear,
  onReset,
  onSave,
}) {
  const [showModelOptions, setShowModelOptions] = useState(false);

  const filteredModelOptions = useMemo(() => {
    const models = apiConfigDraft?.availableModels || [];
    const query = String(apiConfigDraft?.model || '').trim().toLowerCase();
    if (!query) return models;
    const matches = models.filter((model) => model.toLowerCase().includes(query));
    const rest = models.filter((model) => !model.toLowerCase().includes(query));
    return [...matches, ...rest];
  }, [apiConfigDraft]);

  if (!visible) return null;

  return (
    <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="api-config-modal-title">
        <header className="settings-modal-header">
          <div>
            <h2 id="api-config-modal-title">API 配置</h2>
          </div>
          <button className="btn btn-secondary btn-sm" type="button" onClick={onClose}>关闭</button>
        </header>

        <div className="settings-modal-body">
          <div className="settings-grid">
            <div>
              <label htmlFor="api-endpoint-input">API Endpoint</label>
              <input
                id="api-endpoint-input"
                value={apiConfigDraft.apiEndpoint}
                type="text"
                className="mono-input"
                placeholder="https://api.deepseek.com/v1"
                onChange={(event) => onUpdateApiConfig?.('apiEndpoint', event.target.value)}
              />
              <p className="helper-text">填写到 `/v1` 这一层即可，程序会自动拼接 `/chat/completions` 和 `/models`。</p>
            </div>

            <div>
              <label htmlFor="api-key-input">API Key</label>
              <div className="inline-row">
                <input
                  id="api-key-input"
                  value={apiConfigDraft.apiKey}
                  type={showApiKey ? 'text' : 'password'}
                  className="mono-input"
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  onChange={(event) => onUpdateApiConfig?.('apiKey', event.target.value)}
                />
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => onUpdateShowApiKey?.(!showApiKey)}>
                  {showApiKey ? '隐藏' : '显示'}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="api-model-input">模型</label>
              <div className="inline-row">
                <div className="model-combobox">
                  <input
                    id="api-model-input"
                    value={apiConfigDraft.model}
                    type="text"
                    className="mono-input model-combobox-input"
                    placeholder="deepseek-chat"
                    role="combobox"
                    autoComplete="off"
                    aria-controls="available-models"
                    aria-expanded={showModelOptions && apiConfigDraft.availableModels.length > 0}
                    onFocus={() => setShowModelOptions(true)}
                    onClick={() => setShowModelOptions(true)}
                    onBlur={() => window.setTimeout(() => setShowModelOptions(false), 120)}
                    onChange={(event) => {
                      onUpdateApiConfig?.('model', event.target.value);
                      setShowModelOptions(true);
                    }}
                  />
                  <button
                    className="model-combobox-toggle"
                    type="button"
                    aria-label="展开模型列表"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setShowModelOptions((value) => !value);
                    }}
                  >
                    ▾
                  </button>
                  {showModelOptions && apiConfigDraft.availableModels.length ? (
                    <div id="available-models" className="model-options" role="listbox">
                      {filteredModelOptions.map((model) => (
                        <button
                          key={model}
                          className="model-option"
                          type="button"
                          role="option"
                          aria-selected={model === apiConfigDraft.model}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            onUpdateApiConfig?.('model', model);
                            setShowModelOptions(false);
                          }}
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button className="btn btn-secondary btn-sm" type="button" disabled={modelFetchLoading} onClick={onFetchModels}>
                  {modelFetchLoading ? '拉取中...' : '拉取模型'}
                </button>
              </div>
              <p className="helper-text">
                已缓存 {apiConfigDraft.availableModels.length} 个模型；
                当前生成会使用 <strong>{apiConfigDraft.model || '未填写模型'}</strong>。
              </p>
            </div>
          </div>
        </div>

        <footer className="settings-modal-footer">
          <button className="btn btn-danger btn-sm" type="button" onClick={onClear}>恢复默认</button>
          <div className="btn-row">
            <button className="btn btn-secondary btn-sm" type="button" onClick={onReset}>撤销改动</button>
            <button className="btn btn-primary btn-sm" type="button" onClick={onSave}>保存配置</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
