import { STAGES, STAGE_LABELS } from '../../storyState.js';

export default function StageIndicator({
  stage,
  activeStage = '',
  orientation = 'horizontal',
  onNavigate,
}) {
  const currentIndex = Math.max(0, STAGES.indexOf(stage));
  const activeStageKey = activeStage || stage;
  const visibleStages = STAGES.map((stageKey, index) => ({
    stage: stageKey,
    label: STAGE_LABELS[index],
    originalIndex: index,
  })).filter((item) => item.stage !== 'setup');

  return (
    <nav className={`stage-indicator stage-indicator-${orientation}`} aria-label="创作环节导航">
      {visibleStages.map((item, index) => (
        <span key={item.stage} className="contents">
          <div className="stage-indicator-item">
            <button
              className={`stage-label${item.stage === activeStageKey ? ' active' : ''}`}
              type="button"
              aria-current={item.stage === activeStageKey ? 'step' : undefined}
              onClick={() => onNavigate?.(item.stage)}
            >
              {item.label}
            </button>
            {orientation === 'horizontal' ? (
              <span
                className={`stage-dot${item.stage === activeStageKey ? ' active' : ''}${item.originalIndex < currentIndex ? ' done' : ''}`}
              />
            ) : null}
          </div>
          {orientation === 'horizontal' && index < visibleStages.length - 1 ? (
            <span className="stage-arrow">▸</span>
          ) : null}
        </span>
      ))}
    </nav>
  );
}
