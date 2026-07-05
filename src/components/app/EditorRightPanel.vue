<script setup>
import { computed } from 'vue';

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
  canCopyBody: {
    type: Boolean,
    default: false,
  },
  activeTab: {
    type: String,
    default: 'body',
  },
  promptAutomationSettings: {
    type: Object,
    default: () => ({
      autoGeneratePlot: true,
      autoGenerateChoices: true,
    }),
  },
  copySelectedChoicesWithBody: {
    type: Boolean,
    default: false,
  },
  outlineEntries: {
    type: Array,
    default: () => [],
  },
  selectedStoryBlockTitle: {
    type: String,
    default: '',
  },
  selectedStoryBlockContent: {
    type: String,
    default: '',
  },
  assistantInput: {
    type: String,
    default: '',
  },
  assistantMessages: {
    type: Array,
    default: () => [],
  },
  assistantLoading: {
    type: Boolean,
    default: false,
  },
  canUseAssistant: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'toggle-collapse',
  'update:activeTab',
  'update-prompt-automation-setting',
  'copy-body',
  'update:copySelectedChoicesWithBody',
  'update:assistantInput',
  'send-assistant-message',
  'apply-assistant-rewrite',
  'clear-assistant-conversation',
]);

const isExpanded = computed(() => (!props.collapsed).toString());
const toggleAriaLabel = computed(() => (props.collapsed ? '展开右侧区域' : '折叠右侧区域'));
const isQuickActionsTab = computed(() => ['quickActions', 'body', 'automation'].includes(props.activeTab));

function updateCopySelectedChoicesWithBody(event) {
  emit('update:copySelectedChoicesWithBody', event.target.checked);
}

function updatePromptAutomationSetting(key, event) {
  emit('update-prompt-automation-setting', key, event.target.checked);
}

function updateAssistantInput(event) {
  emit('update:assistantInput', event.target.value);
}

function handleAssistantKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    emit('send-assistant-message');
  }
}

function splitStoryParagraphs(text) {
  return String(text || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
</script>

<template>
  <aside class="panel panel-right" :class="{ collapsed }">
    <button class="panel-toggle" type="button" :aria-expanded="isExpanded" :aria-label="toggleAriaLabel"
      @click="emit('toggle-collapse')">
      <svg class="panel-toggle-icon" viewBox="0 0 20 20" aria-hidden="true">
        <path v-if="collapsed" d="M12.5 4.5 7 10l5.5 5.5" />
        <path v-else d="M7.5 4.5 13 10l-5.5 5.5" />
      </svg>
    </button>
    <div v-if="collapsed" class="panel-collapsed-hint"></div>
    <div v-else class="panel-body">
      <nav class="right-panel-tabs" aria-label="右侧工具">
        <button class="right-panel-tab" :class="{ active: activeTab === 'assistant' }" type="button"
          @click="emit('update:activeTab', 'assistant')">
          AI助手
        </button>
        <button class="right-panel-tab" :class="{ active: isQuickActionsTab }" type="button"
          @click="emit('update:activeTab', 'quickActions')">
          快捷操作
        </button>
      </nav>

      <section v-if="activeTab === 'assistant'" class="assistant-panel">
        <div class="assistant-target">
          <div class="section-title section-title-tight">当前节点</div>
          <template v-if="selectedStoryBlockContent">
            <strong>{{ selectedStoryBlockTitle }}</strong>
            <div class="assistant-story-text">
              <p v-for="(paragraph, index) in splitStoryParagraphs(selectedStoryBlockContent)"
                :key="`selected-${index}`">
                {{ paragraph }}
              </p>
            </div>
          </template>
          <p v-else class="outline-empty">请先在中间正文区选中一个剧情节点。</p>
        </div>

        <div class="assistant-thread" aria-live="polite">
          <div v-if="assistantMessages.length" class="assistant-message-list">
            <article v-for="message in assistantMessages" :key="message.id" class="assistant-message"
              :class="message.role">
              <div class="assistant-message-meta">
                <span>{{ message.role === 'user' ? '你' : 'AI' }}</span>
                <small v-if="message.blockTitle">{{ message.blockTitle }}</small>
              </div>
              <div class="assistant-story-text">
                <p v-for="(paragraph, index) in splitStoryParagraphs(message.content)" :key="`${message.id}-${index}`">
                  {{ paragraph }}
                </p>
              </div>
              <button v-if="message.role === 'assistant'" class="btn btn-primary btn-sm btn-block" type="button"
                :disabled="message.applied" @click="emit('apply-assistant-rewrite', message)">
                {{ message.applied ? '已应用' : '应用到当前节点' }}
              </button>
            </article>
          </div>
          <div v-else class="outline-empty">暂无对话</div>
        </div>

        <div class="assistant-composer">
          <textarea :value="assistantInput" class="assistant-input" placeholder="例如：把这个剧情点写得更紧张；保留事件但弱化解释；改成更口语的短句。"
            :disabled="assistantLoading" @input="updateAssistantInput" @keydown="handleAssistantKeydown" />
          <div class="assistant-actions">
            <button class="btn btn-primary btn-sm" type="button" :disabled="!canUseAssistant || !assistantInput.trim()"
              @click="emit('send-assistant-message')">
              {{ assistantLoading ? '生成中...' : '发送' }}
            </button>
            <button class="btn btn-secondary btn-sm" type="button"
              :disabled="assistantLoading || !assistantMessages.length" @click="emit('clear-assistant-conversation')">
              清空
            </button>
          </div>
        </div>
      </section>

      <section v-else class="body-record-panel">
        <div class="section-title">提示词控制</div>
        <div class="automation-switch-list">
          <label class="automation-switch-card">
            <input :checked="promptAutomationSettings.autoGeneratePlot !== false" type="checkbox"
              @change="updatePromptAutomationSetting('autoGeneratePlot', $event)" />
            <span class="automation-switch-body">
              <span class="automation-switch-title">自动生成剧情</span>
            </span>
          </label>
          <label class="automation-switch-card">
            <input :checked="promptAutomationSettings.autoGenerateChoices !== false" type="checkbox"
              @change="updatePromptAutomationSetting('autoGenerateChoices', $event)" />
            <span class="automation-switch-body">
              <span class="automation-switch-title">自动生成选项</span>
            </span>
          </label>
        </div>

        <div class="section-title">复制正文</div>
        <div class="copy-body-tools">
          <button class="btn btn-primary btn-sm btn-block" type="button" :disabled="!canCopyBody"
            @click="emit('copy-body')">
            复制正文
          </button>
          <label class="copy-choice-toggle">
            <input :checked="copySelectedChoicesWithBody" type="checkbox" @change="updateCopySelectedChoicesWithBody" />
            <span>复制选项</span>
          </label>
        </div>

        <div v-if="outlineEntries.length" class="outline-log">
          <template v-for="entry in outlineEntries" :key="entry.key">
            <div v-if="entry.badge" class="outline-item">
              <span class="badge" :class="entry.badgeClass">{{ entry.badge }}</span>
              <span>{{ entry.text }}</span>
            </div>
            <div v-else-if="entry.type === 'chapter-title'" class="outline-chapter">{{ entry.text }}</div>
            <div v-else-if="entry.type === 'plot'" class="outline-plot">
              <span>{{ entry.text }}</span>
              <span class="outline-note">{{ entry.note }}</span>
            </div>
            <div v-else-if="entry.type === 'hook'" class="outline-hook">{{ entry.text }}</div>
            <div v-else-if="entry.type === 'big-hook'" class="outline-big-hook">{{ entry.text }}</div>
          </template>
        </div>
        <div v-else class="outline-empty">尚未开始</div>
      </section>
    </div>
  </aside>
</template>
