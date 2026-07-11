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
    default: 'promptControl',
  },
  promptAutomationSettings: {
    type: Object,
    default: () => ({
      autoGeneratePlot: true,
      autoGenerateChoices: true,
      generateBodyBeforeChoices: true,
    }),
  },
  copySelectedChoicesWithBody: {
    type: Boolean,
    default: false,
  },
  copyBodyPreviewText: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([
  'toggle-collapse',
  'update:activeTab',
  'update-prompt-automation-setting',
  'copy-body',
  'update:copySelectedChoicesWithBody',
]);

const isExpanded = computed(() => (!props.collapsed).toString());
const toggleAriaLabel = computed(() => (props.collapsed ? '展开右侧区域' : '折叠右侧区域'));
const normalizedActiveTab = computed(() => {
  if (['body', 'copyBody'].includes(props.activeTab)) {
    return 'copyBody';
  }

  return 'promptControl';
});

function updateCopySelectedChoicesWithBody(event) {
  emit('update:copySelectedChoicesWithBody', event.target.checked);
}

function updatePromptAutomationSetting(key, event) {
  emit('update-prompt-automation-setting', key, event.target.checked);
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
        <button class="right-panel-tab" :class="{ active: normalizedActiveTab === 'promptControl' }" type="button"
          @click="emit('update:activeTab', 'promptControl')">
          提示词控制
        </button>
        <button class="right-panel-tab" :class="{ active: normalizedActiveTab === 'copyBody' }" type="button"
          @click="emit('update:activeTab', 'copyBody')">
          复制正文
        </button>
      </nav>

      <section v-if="normalizedActiveTab === 'promptControl'" class="automation-panel">
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
          <label class="automation-switch-card">
            <input :checked="promptAutomationSettings.generateBodyBeforeChoices !== false" type="checkbox"
              @change="updatePromptAutomationSetting('generateBodyBeforeChoices', $event)" />
            <span class="automation-switch-body">
              <span class="automation-switch-title">选项前生成正文</span>
            </span>
          </label>
        </div>
      </section>

      <section v-else class="body-record-panel">
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

        <div class="copy-preview-panel">
          <div class="copy-preview-header">
            <span>将复制到剪切板</span>
            <span>{{ copyBodyPreviewText.length }} 字</span>
          </div>
          <pre v-if="copyBodyPreviewText" class="copy-preview-text">{{ copyBodyPreviewText }}</pre>
          <div v-else class="copy-preview-empty">暂无可复制正文</div>
        </div>
      </section>
    </div>
  </aside>
</template>
