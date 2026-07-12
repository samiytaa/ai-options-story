import { useMemo, useState } from 'react';

function splitStoryParagraphs(text) {
  return String(text || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function countStoryCharacters(text) {
  return String(text || '').replace(/\s/g, '').length;
}

function getAiFlavorChecklist(text) {
  const content = String(text || '').trim();
  const currentParagraphs = splitStoryParagraphs(content);
  const longParagraphCount = currentParagraphs.filter((paragraph) => countStoryCharacters(paragraph) > 220).length;
  const aiPhrases = ['他知道', '她知道', '这一刻', '命运', '仿佛', '无法言说', '心中一震', '空气凝固'];
  const aiPhraseCount = aiPhrases.filter((phrase) => content.includes(phrase)).length;
  const dialogueCount = (content.match(/[“"][^”"]+[”"]/g) || []).length;
  const sceneDetailCount = (content.match(/门|窗|灯|风|雨|手|眼|脚步|声音|气味|桌|椅|街|房间/g) || []).length;

  return [
    {
      label: '段落长度',
      passed: currentParagraphs.length > 0 && longParagraphCount === 0,
      detail: longParagraphCount ? `${longParagraphCount} 段超过 220 字，建议拆短` : '段落长度适合手机阅读',
    },
    {
      label: '套话密度',
      passed: aiPhraseCount <= 2,
      detail: aiPhraseCount > 2 ? `检测到 ${aiPhraseCount} 个常见泛化词` : '常见泛化词较少',
    },
    {
      label: '人物对话',
      passed: dialogueCount >= 3,
      detail: dialogueCount >= 3 ? `已有 ${dialogueCount} 处对话` : '对话偏少，可增加人物交锋',
    },
    {
      label: '现场细节',
      passed: sceneDetailCount >= 8,
      detail: sceneDetailCount >= 8 ? '有可感知的动作或环境细节' : '细节偏抽象，可补动作、物件、声音',
    },
  ];
}

function extractGoldenSentences(text) {
  return splitStoryParagraphs(text)
    .map((line) => line.trim())
    .filter((line) => {
      const length = countStoryCharacters(line);
      return length >= 10 && length <= 80 && /[\u4e00-\u9fa5A-Za-z0-9]/.test(line);
    })
    .slice(0, 5);
}

export default function FinalWorkEditor({
  content = '',
  isLoading = false,
  onUpdateContent,
  onSave,
  onCopy,
  onDownload,
}) {
  const [showAiCheck, setShowAiCheck] = useState(true);
  const [wordCountMessage, setWordCountMessage] = useState('');

  const paragraphs = useMemo(() => splitStoryParagraphs(content), [content]);
  const characterCount = useMemo(() => countStoryCharacters(content), [content]);
  const paragraphCount = paragraphs.length;
  const aiFlavorChecklist = useMemo(() => getAiFlavorChecklist(content), [content]);
  const goldenSentences = useMemo(() => extractGoldenSentences(content), [content]);

  function countWords() {
    const text = String(content || '');
    const hanCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const punctCount = (text.match(/[\u3000-\u303f\uff00-\uffef]/g) || []).length;
    const total = hanCount + punctCount;
    const rangeText = total >= 800 && total <= 1200 ? '在 800-1200 字范围' : '不在 800-1200 字范围';
    setWordCountMessage(`汉字 ${hanCount}，标点 ${punctCount}，合计 ${total}，${rangeText}`);
  }

  return (
    <div className="final-work-editor">
      <header className="final-work-editor-header">
        <div>
          <span className="panel-kicker">正文工作台</span>
          <div className="section-title">最终正文编辑器</div>
        </div>
        <div className="final-work-metrics" aria-label="最终作品统计">
          <span>{characterCount} 字</span>
          <span>{paragraphCount} 段</span>
        </div>
      </header>

      <div className="final-work-rule-row" aria-label="正文编辑规则">
        <span>第一人称亲历</span>
        <span>单章 800-1200 字</span>
        <span>每 500 字有新信息</span>
        <span>章尾保留钩子</span>
      </div>

      <textarea
        value={content}
        className="final-work-textarea"
        disabled={isLoading}
        placeholder="在这里编辑最终正文。修改会同步到当前作品状态，点击保存正文后写入项目快照。"
        onChange={(event) => onUpdateContent?.(event.target.value)}
      />

      <div className="btn-row final-work-editor-actions">
        <button className="btn btn-secondary btn-sm" type="button" disabled={isLoading} onClick={() => setShowAiCheck(true)}>
          去 AI 味自检
        </button>
        <button className="btn btn-secondary btn-sm" type="button" disabled={isLoading} onClick={countWords}>
          统计字数
        </button>
        <button className="btn btn-primary btn-sm" type="button" disabled={isLoading} onClick={onSave}>
          保存正文
        </button>
        <button className="btn btn-secondary btn-sm" type="button" disabled={isLoading || !content} onClick={onCopy}>
          复制全文
        </button>
        <button className="btn btn-secondary btn-sm" type="button" disabled={isLoading || !content} onClick={onDownload}>
          下载 TXT
        </button>
      </div>

      {wordCountMessage ? <p className="final-work-word-count-message">{wordCountMessage}</p> : null}

      {showAiCheck ? (
        <section className="final-work-checklist" aria-label="去 AI 味检查清单">
          {aiFlavorChecklist.map((item) => (
            <div key={item.label} className={`final-work-check-item${item.passed ? ' passed' : ''}`}>
              <span className="final-work-check-mark">{item.passed ? '✓' : '!'}</span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="final-work-golden-sentences" aria-label="本章金句提取">
        <div className="final-work-subtitle">金句提取</div>
        {!goldenSentences.length ? (
          <p className="helper-text">正文内容足够后会自动提取 5 条短句。</p>
        ) : (
          <ol>
            {goldenSentences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
