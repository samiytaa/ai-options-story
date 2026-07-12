import { ACTOR_ROLE_OPTIONS, ARCHITECTURE_FIELD_GROUPS } from '../../features/architectureSetup/architectureConfig.js';
import { validateArchitectureFields, validatePersonaFields } from '../../features/architectureSetup/architectureState.js';
import '../../features/architectureSetup/style.css';

export default function ArchitectureSetupStage({
  architecturePlan = {},
  mode = 'architecture',
  brainhole = '',
  guide = '',
  referenceGroups = { guide: [], outline: [] },
  resultReferenceGroups = { guide: [], architecture: [] },
  isLoading = false,
  onGenerate,
  onConfirm,
  onUpdateField,
  onAddActor,
  onRemoveActor,
  onUpdateActorField,
}) {
  const isArchitectureMode = mode !== 'persona';
  const validation = isArchitectureMode
    ? validateArchitectureFields(architecturePlan)
    : validatePersonaFields(architecturePlan);
  const actorCountText = `当前 ${architecturePlan?.actors?.length || 0} / 5`;
  const guideReferenceItems = Array.isArray(referenceGroups?.guide) ? referenceGroups.guide : [];
  const outlineReferenceItems = Array.isArray(referenceGroups?.outline) ? referenceGroups.outline : [];
  const guideResultReferenceItems = Array.isArray(resultReferenceGroups?.guide) ? resultReferenceGroups.guide : [];
  const architectureResultReferenceItems = Array.isArray(resultReferenceGroups?.architecture) ? resultReferenceGroups.architecture : [];

  return (
    <section className="architecture-stage">
      <div className="architecture-stage-panel architecture-stage-intro">
        <div className="architecture-stage-intro-copy">
          <div className="section-title">{isArchitectureMode ? '生成架构' : '生成人设'}</div>
          {isArchitectureMode ? (
            <p>这一阶段把已选脑洞和导语整理成后续章节的执行蓝图：只保留冲突、10章事件链、前四章执行路线，以及第4章末付费点和后段反转铺垫。</p>
          ) : (
            <p>这一阶段基于已完成的故事架构，为后续剧情生成补齐核心演员。完成后，再生成第一个剧情点。</p>
          )}
        </div>
        <div className="architecture-stage-actions">
          <button className="btn btn-primary" type="button" disabled={isLoading || !brainhole || !guide} onClick={onGenerate}>
            {isArchitectureMode ? 'AI 生成架构' : 'AI 生成人设'}
          </button>
          <button className="btn btn-secondary" type="button" disabled={isLoading || !validation.isValid} onClick={onConfirm}>
            {isArchitectureMode ? '确认并进入人设' : '确认并生成第一个剧情点'}
          </button>
        </div>
      </div>

      {(guideResultReferenceItems.length || architectureResultReferenceItems.length) ? (
        <div className="architecture-reference-grid">
          {guideResultReferenceItems.length ? (
            <div className="architecture-stage-panel architecture-reference-panel architecture-reference-panel-result">
              <div className="section-title section-title-tight">当前导语结果引用来源</div>
              <div className="architecture-reference-list">
                {guideResultReferenceItems.map((item) => (
                  <article key={`guide-result-${item.id}`} className="architecture-reference-item">
                    <div className="architecture-reference-title">{item.label || item.assetName || item.assetType || 'DNA资产'}</div>
                    {item.summary ? <p>{item.summary}</p> : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          {architectureResultReferenceItems.length ? (
            <div className="architecture-stage-panel architecture-reference-panel architecture-reference-panel-result">
              <div className="section-title section-title-tight">{isArchitectureMode ? '当前架构结果引用来源' : '当前人设结果引用来源'}</div>
              <div className="architecture-reference-list">
                {architectureResultReferenceItems.map((item) => (
                  <article key={`architecture-result-${item.id}`} className="architecture-reference-item">
                    <div className="architecture-reference-title">{item.label || item.assetName || item.assetType || 'DNA资产'}</div>
                    {item.summary ? <p>{item.summary}</p> : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {(guideReferenceItems.length || outlineReferenceItems.length) ? (
        <div className="architecture-reference-grid">
          {guideReferenceItems.length ? (
            <div className="architecture-stage-panel architecture-reference-panel">
              <div className="section-title section-title-tight">导语区已引用 DNA</div>
              <div className="architecture-reference-list">
                {guideReferenceItems.map((item) => (
                  <article key={item.id} className="architecture-reference-item">
                    <div className="architecture-reference-title">{item.label || item.assetName || item.assetType || 'DNA资产'}</div>
                    {item.summary ? <p>{item.summary}</p> : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          {outlineReferenceItems.length ? (
            <div className="architecture-stage-panel architecture-reference-panel">
              <div className="section-title section-title-tight">大纲区已引用 DNA</div>
              <div className="architecture-reference-list">
                {outlineReferenceItems.map((item) => (
                  <article key={item.id} className="architecture-reference-item">
                    <div className="architecture-reference-title">{item.label || item.assetName || item.assetType || 'DNA资产'}</div>
                    {item.summary ? <p>{item.summary}</p> : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="architecture-context-grid">
        <div className="architecture-context-card">
          <div className="section-title section-title-tight">已选脑洞</div>
          <p>{brainhole || '请先完成脑洞选择。'}</p>
        </div>
        <div className="architecture-context-card">
          <div className="section-title section-title-tight">当前导语</div>
          <p>{guide || '请先生成导语。'}</p>
        </div>
      </div>

      {isArchitectureMode ? (
        <>
          {ARCHITECTURE_FIELD_GROUPS.map((group) => (
            <div key={group.id} className="architecture-stage-panel architecture-form-section">
              <div className="section-title">{group.title}</div>
              <div className="architecture-form-grid">
                {group.fields.map(([fieldKey, label, hint]) => (
                  <div
                    key={fieldKey}
                    className={`architecture-field${!['storySummary', 'coreConflict'].includes(fieldKey) ? ' architecture-field-wide' : ''}`}
                  >
                    <label htmlFor={`architecture-${fieldKey}`}>{label}</label>
                    <textarea
                      id={`architecture-${fieldKey}`}
                      rows={['storySummary', 'coreConflict'].includes(fieldKey) ? 4 : 6}
                      value={architecturePlan?.[fieldKey] || ''}
                      disabled={isLoading}
                      onChange={(event) => onUpdateField?.(fieldKey, event.target.value)}
                    />
                    <p className="architecture-field-hint">{hint}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="architecture-stage-panel architecture-form-section">
          <div className="architecture-actor-toolbar">
            <div>
              <div className="section-title">核心演员分配表</div>
              <p className="architecture-actor-hint">只保留真正推动主线的 3 到 5 个角色。</p>
            </div>
            <div className="architecture-stage-actions">
              <span className="architecture-actor-hint">{actorCountText}</span>
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                disabled={isLoading || (architecturePlan?.actors?.length || 0) >= 5}
                onClick={onAddActor}
              >
                添加演员
              </button>
            </div>
          </div>

          {architecturePlan?.actors?.length ? (
            <div className="architecture-actor-grid">
              {architecturePlan.actors.map((actor, index) => (
                <div key={index} className="architecture-actor-card">
                  <div className="architecture-actor-header">
                    <span className="architecture-actor-title">核心演员 {index + 1}</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      type="button"
                      disabled={isLoading || (architecturePlan?.actors?.length || 0) <= 3}
                      onClick={() => onRemoveActor?.(index)}
                    >
                      删除
                    </button>
                  </div>
                  <div className="architecture-actor-fields">
                    <div className="architecture-field">
                      <label htmlFor={`actor-name-${index}`}>角色名</label>
                      <input id={`actor-name-${index}`} value={actor.name} disabled={isLoading} onChange={(event) => onUpdateActorField?.(index, 'name', event.target.value)} />
                    </div>
                    <div className="architecture-field">
                      <label htmlFor={`actor-role-${index}`}>角色功能</label>
                      <select id={`actor-role-${index}`} value={actor.role} disabled={isLoading} onChange={(event) => onUpdateActorField?.(index, 'role', event.target.value)}>
                        <option value="">请选择功能</option>
                        {ACTOR_ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    <div className="architecture-field architecture-field-actor-summary architecture-field-wide">
                      <label htmlFor={`actor-persona-${index}`}>人设定位</label>
                      <textarea id={`actor-persona-${index}`} rows="2" value={actor.persona} disabled={isLoading} onChange={(event) => onUpdateActorField?.(index, 'persona', event.target.value)} />
                    </div>
                    <div className="architecture-field architecture-field-actor-compact">
                      <label htmlFor={`actor-goal-${index}`}>目标</label>
                      <textarea id={`actor-goal-${index}`} rows="2" value={actor.goal} disabled={isLoading} onChange={(event) => onUpdateActorField?.(index, 'goal', event.target.value)} />
                    </div>
                    <div className="architecture-field architecture-field-actor-compact">
                      <label htmlFor={`actor-pressure-${index}`}>压力行为</label>
                      <textarea id={`actor-pressure-${index}`} rows="2" value={actor.pressureBehavior} disabled={isLoading} onChange={(event) => onUpdateActorField?.(index, 'pressureBehavior', event.target.value)} />
                    </div>
                    <div className="architecture-field architecture-field-actor-compact">
                      <label htmlFor={`actor-voice-${index}`}>说话味道</label>
                      <textarea id={`actor-voice-${index}`} rows="2" value={actor.voice} disabled={isLoading} onChange={(event) => onUpdateActorField?.(index, 'voice', event.target.value)} />
                    </div>
                    <div className="architecture-field architecture-field-actor-compact">
                      <label htmlFor={`actor-emotion-${index}`}>制造情绪</label>
                      <textarea id={`actor-emotion-${index}`} rows="2" value={actor.emotionFunction} disabled={isLoading} onChange={(event) => onUpdateActorField?.(index, 'emotionFunction', event.target.value)} />
                    </div>
                    <div className="architecture-field architecture-field-actor-summary architecture-field-wide">
                      <label htmlFor={`actor-plot-function-${index}`}>剧情任务</label>
                      <textarea id={`actor-plot-function-${index}`} rows="2" value={actor.plotFunction} disabled={isLoading} onChange={(event) => onUpdateActorField?.(index, 'plotFunction', event.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="architecture-empty">当前还没有核心演员。可以先点“AI 生成架构”，或手动添加 3 到 5 个。</p>
          )}
        </div>
      )}
    </section>
  );
}
