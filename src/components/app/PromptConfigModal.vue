<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, watch } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  promptConfigs: {
    type: Array,
    default: () => [],
  },
  activePromptId: {
    type: String,
    default: '',
  },
  activePromptConfig: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits([
  'close',
  'update:activePromptId',
  'update-prompt-config',
  'reset',
]);

const MAX_HISTORY_STEPS = 30;
const HISTORY_IDLE_DELAY = 1000;
const promptHistories = reactive({});
const pendingHistoryBaselines = new Map();
const pendingHistoryTimers = new Map();

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

const activePromptPlaceholders = computed(() => {
  const prompt = props.activePromptConfig;
  if (!prompt) return [];
  const source = `${prompt.systemPrompt || ''}\n${prompt.userPrompt || ''}`;
  const names = Array.from(source.matchAll(/\{\{(\w+)\}\}/g), (match) => match[1]);
  return [...new Set(names)].map((name) => ({
    name,
    description: PLACEHOLDER_DESCRIPTIONS[name] || '运行时动态替换的内容。这个占位符还没有写入说明表。',
  }));
});

function historyKey(promptId, fieldKey) {
  return `${promptId}:${fieldKey}`;
}

function getHistory(promptId, fieldKey) {
  const key = historyKey(promptId, fieldKey);
  if (!promptHistories[key]) {
    promptHistories[key] = {
      past: [],
      future: [],
    };
  }
  return promptHistories[key];
}

function getPromptFieldValue(promptId, fieldKey) {
  const prompt = props.promptConfigs.find((item) => item.id === promptId);
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
}

function clearPendingHistoryTimer(key) {
  window.clearTimeout(pendingHistoryTimers.get(key));
  pendingHistoryTimers.delete(key);
}

function commitPendingHistory(promptId, fieldKey) {
  const key = historyKey(promptId, fieldKey);
  if (!pendingHistoryBaselines.has(key)) return;

  clearPendingHistoryTimer(key);
  const baselineValue = pendingHistoryBaselines.get(key);
  pendingHistoryBaselines.delete(key);

  if (getPromptFieldValue(promptId, fieldKey) !== baselineValue) {
    pushHistoryStep(promptId, fieldKey, baselineValue);
  }
}

function commitAllPendingHistory() {
  for (const key of Array.from(pendingHistoryBaselines.keys())) {
    const [promptId, fieldKey] = key.split(':');
    commitPendingHistory(promptId, fieldKey);
  }
}

function schedulePendingHistoryCommit(promptId, fieldKey) {
  const key = historyKey(promptId, fieldKey);
  clearPendingHistoryTimer(key);
  pendingHistoryTimers.set(key, window.setTimeout(() => {
    commitPendingHistory(promptId, fieldKey);
  }, HISTORY_IDLE_DELAY));
}

function updatePromptField(promptId, fieldKey, nextValue) {
  const currentValue = getPromptFieldValue(promptId, fieldKey);
  if (nextValue === currentValue) return;

  const key = historyKey(promptId, fieldKey);
  if (!pendingHistoryBaselines.has(key)) {
    pendingHistoryBaselines.set(key, currentValue);
  }
  schedulePendingHistoryCommit(promptId, fieldKey);
  emit('update-prompt-config', promptId, fieldKey, nextValue);
}

function updatePromptTemperature(promptId, value) {
  const temperature = Number(value);
  if (!Number.isFinite(temperature)) return;
  emit('update-prompt-config', promptId, 'temperature', Math.min(2, Math.max(0, temperature)));
}

function undoPromptField(promptId, fieldKey) {
  commitPendingHistory(promptId, fieldKey);
  const history = getHistory(promptId, fieldKey);
  if (!history.past.length) return;
  const currentValue = getPromptFieldValue(promptId, fieldKey);
  const previousValue = history.past.pop();
  history.future.push(currentValue);
  emit('update-prompt-config', promptId, fieldKey, previousValue);
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
  emit('update-prompt-config', promptId, fieldKey, nextValue);
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

function highlightedPromptParts(value) {
  const parts = [];
  const source = String(value || '');
  const placeholderPattern = /\{\{\w+\}\}/g;
  let cursor = 0;
  for (const match of source.matchAll(placeholderPattern)) {
    if (match.index > cursor) {
      parts.push({ text: source.slice(cursor, match.index), isPlaceholder: false });
    }
    parts.push({ text: match[0], isPlaceholder: true });
    cursor = match.index + match[0].length;
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

function handleRichPromptInput(event, promptId, fieldKey) {
  const caretOffset = getCaretOffset(event.currentTarget);
  updatePromptField(promptId, fieldKey, getEditableText(event.currentTarget));
  nextTick(() => setCaretOffset(event.currentTarget, caretOffset));
}

function handleRichPromptBlur(promptId, fieldKey) {
  commitPendingHistory(promptId, fieldKey);
}

function handleRichPromptPaste(event) {
  event.preventDefault();
  const text = event.clipboardData?.getData('text/plain') || '';
  document.execCommand('insertText', false, text);
}

watch(() => props.visible, (visible) => {
  if (!visible) commitAllPendingHistory();
});

onBeforeUnmount(() => {
  pendingHistoryTimers.forEach((timer) => window.clearTimeout(timer));
  pendingHistoryTimers.clear();
});
</script>

<template>
  <div v-if="visible" class="modal-backdrop fullscreen-backdrop" @click.self="emit('close')">
    <section class="prompt-modal" role="dialog" aria-modal="true" aria-labelledby="prompt-modal-title">
      <header class="prompt-modal-header">
        <div>
          <h2 id="prompt-modal-title">提示词控制台</h2>
          <p></p>
        </div>
        <div class="prompt-modal-actions">
          <button class="btn btn-danger btn-sm" type="button" @click="emit('reset')">恢复默认</button>
          <button class="btn btn-secondary btn-sm" type="button" @click="emit('close')">关闭</button>
        </div>
      </header>

      <div class="prompt-workspace">
        <nav class="prompt-tabs" aria-label="提示词分类">
          <button
            v-for="prompt in promptConfigs"
            :key="prompt.id"
            class="prompt-tab"
            type="button"
            :class="{ active: prompt.id === activePromptId }"
            @click="emit('update:activePromptId', prompt.id)"
          >
            <span class="prompt-tab-heading">
              <span>{{ prompt.title }}</span>
              <em
                v-if="prompt.category"
                class="prompt-category-tag"
                :class="`prompt-category-tag-${prompt.category}`"
              >{{ prompt.category }}</em>
            </span>
            <small>{{ prompt.description }}</small>
          </button>
        </nav>

        <article v-if="activePromptConfig" class="prompt-editor">
          <div class="prompt-editor-heading">
            <div>
              <h3>{{ activePromptConfig.title }}</h3>
              <p>{{ activePromptConfig.description }}</p>
            </div>
            <div class="prompt-temperature-control">
              <label :for="`${activePromptConfig.id}-temperature`">温度</label>
              <input
                :id="`${activePromptConfig.id}-temperature`"
                type="range"
                min="0"
                max="2"
                step="0.05"
                :value="activePromptConfig.temperature"
                @input="updatePromptTemperature(activePromptConfig.id, $event.target.value)"
              />
              <input
                class="prompt-temperature-number"
                type="number"
                min="0"
                max="2"
                step="0.05"
                :value="activePromptConfig.temperature"
                @input="updatePromptTemperature(activePromptConfig.id, $event.target.value)"
              />
            </div>
          </div>

          <section v-if="activePromptPlaceholders.length" class="prompt-placeholder-help" aria-label="占位符说明">
            <h4>占位符说明</h4>
            <dl>
              <div v-for="placeholder in activePromptPlaceholders" :key="placeholder.name">
                <dt v-text="`{{${placeholder.name}}}`"></dt>
                <dd>{{ placeholder.description }}</dd>
              </div>
            </dl>
          </section>

          <div class="prompt-field-header">
            <label :for="`${activePromptConfig.id}-system`">System prompt</label>
            <div class="prompt-history-actions" aria-label="System prompt 历史记录">
              <button
                class="btn btn-secondary btn-xs"
                type="button"
                title="撤销"
                aria-label="撤销"
                :disabled="!historyStatus(activePromptConfig.id, 'systemPrompt').undoCount"
                @click="undoPromptField(activePromptConfig.id, 'systemPrompt')"
              >
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 14 4 9 9 4"></polyline>
                  <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                </svg>
              </button>
              <button
                class="btn btn-secondary btn-xs"
                type="button"
                title="重做"
                aria-label="重做"
                :disabled="!historyStatus(activePromptConfig.id, 'systemPrompt').redoCount"
                @click="redoPromptField(activePromptConfig.id, 'systemPrompt')"
              >
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 14 20 9 15 4"></polyline>
                  <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
                </svg>
              </button>
              <span>历史 {{ historyStatus(activePromptConfig.id, 'systemPrompt').undoCount }}/30</span>
            </div>
          </div>
          <div
            :id="`${activePromptConfig.id}-system`"
            class="prompt-textarea prompt-rich-editor system-prompt"
            role="textbox"
            aria-multiline="true"
            contenteditable="true"
            spellcheck="false"
            @keydown="handlePromptKeydown($event, activePromptConfig.id, 'systemPrompt')"
            @input="handleRichPromptInput($event, activePromptConfig.id, 'systemPrompt')"
            @blur="handleRichPromptBlur(activePromptConfig.id, 'systemPrompt')"
            @paste="handleRichPromptPaste"
          ><template
              v-for="(part, index) in highlightedPromptParts(activePromptConfig.systemPrompt)"
              :key="index"
            ><mark v-if="part.isPlaceholder" class="prompt-token-placeholder">{{ part.text }}</mark><span v-else>{{ part.text }}</span></template></div>

          <div class="prompt-field-header">
            <label :for="`${activePromptConfig.id}-user`">User prompt 模板</label>
            <div class="prompt-history-actions" aria-label="User prompt 历史记录">
              <button
                class="btn btn-secondary btn-xs"
                type="button"
                title="撤销"
                aria-label="撤销"
                :disabled="!historyStatus(activePromptConfig.id, 'userPrompt').undoCount"
                @click="undoPromptField(activePromptConfig.id, 'userPrompt')"
              >
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 14 4 9 9 4"></polyline>
                  <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                </svg>
              </button>
              <button
                class="btn btn-secondary btn-xs"
                type="button"
                title="重做"
                aria-label="重做"
                :disabled="!historyStatus(activePromptConfig.id, 'userPrompt').redoCount"
                @click="redoPromptField(activePromptConfig.id, 'userPrompt')"
              >
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 14 20 9 15 4"></polyline>
                  <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
                </svg>
              </button>
              <span>历史 {{ historyStatus(activePromptConfig.id, 'userPrompt').undoCount }}/30</span>
            </div>
          </div>
          <div
            :id="`${activePromptConfig.id}-user`"
            class="prompt-textarea prompt-rich-editor"
            role="textbox"
            aria-multiline="true"
            contenteditable="true"
            spellcheck="false"
            @keydown="handlePromptKeydown($event, activePromptConfig.id, 'userPrompt')"
            @input="handleRichPromptInput($event, activePromptConfig.id, 'userPrompt')"
            @blur="handleRichPromptBlur(activePromptConfig.id, 'userPrompt')"
            @paste="handleRichPromptPaste"
          ><template
              v-for="(part, index) in highlightedPromptParts(activePromptConfig.userPrompt)"
              :key="index"
            ><mark v-if="part.isPlaceholder" class="prompt-token-placeholder">{{ part.text }}</mark><span v-else>{{ part.text }}</span></template></div>
        </article>
      </div>
    </section>
  </div>
</template>
