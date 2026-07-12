<script setup>
import { ref } from 'vue';
import BrainholeInputPanel from './BrainholeInputPanel.vue';
import StageIndicator from '../StageIndicator.vue';

const activeTab = ref('brainhole');

defineProps({
  isCollapsed: {
    type: Boolean,
    default: false,
  },
  storyStart: {
    type: String,
    default: '',
  },
  windVaneFile: {
    type: Object,
    default: null,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  dnaAssetReferences: {
    type: Object,
    default: () => ({ brainhole: [], guide: [], outline: [] }),
  },
  dnaResultReferences: {
    type: Object,
    default: () => ({ brainholeOptions: [], guide: [], architecture: [] }),
  },
  stage: {
    type: String,
    default: 'brainhole',
  },
  activeStageView: {
    type: String,
    default: 'brainhole',
  },
  fileTextIconPaths: {
    type: Array,
    default: () => [],
  },
  canCopyBody: {
    type: Boolean,
    default: false,
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
  'toggle-panel',
  'update:storyStart',
  'choose-wind-vane-file',
  'wind-vane-file-change',
  'wind-vane-file-dragover',
  'wind-vane-file-dragleave',
  'wind-vane-file-drop',
  'clear-wind-vane-file',
  'clear-brainhole-input',
  'generate-brainhole',
  'navigate-stage',
  'update-prompt-automation-setting',
  'copy-body',
  'update:copySelectedChoicesWithBody',
]);

function updateCopySelectedChoicesWithBody(event) {
  emit('update:copySelectedChoicesWithBody', event.target.checked);
}

function updatePromptAutomationSetting(key, event) {
  emit('update-prompt-automation-setting', key, event.target.checked);
}
</script>

<template>
  <aside class="panel panel-left" :class="{ collapsed: isCollapsed }">
    <button
      class="panel-toggle"
      type="button"
      :aria-expanded="(!isCollapsed).toString()"
      :aria-label="isCollapsed ? '展开左侧区域' : '折叠左侧区域'"
      @click="emit('toggle-panel')"
    >
      <svg class="panel-toggle-icon" viewBox="0 0 20 20" aria-hidden="true">
        <path
          v-if="isCollapsed"
          d="M7.5 4.5 13 10l-5.5 5.5"
        />
        <path
          v-else
          d="M12.5 4.5 7 10l5.5 5.5"
        />
      </svg>
    </button>

    <div v-if="isCollapsed" class="panel-collapsed-hint"></div>
    <div v-else class="panel-body">
      <div class="left-panel-tabs" role="tablist" aria-label="左侧功能区">
        <button
          class="left-panel-tab"
          :class="{ active: activeTab === 'brainhole' }"
          type="button"
          role="tab"
          :aria-selected="(activeTab === 'brainhole').toString()"
          @click="activeTab = 'brainhole'"
        >
          脑洞工作台
        </button>
        <button
          class="left-panel-tab"
          :class="{ active: activeTab === 'stages' }"
          type="button"
          role="tab"
          :aria-selected="(activeTab === 'stages').toString()"
          @click="activeTab = 'stages'"
        >
          创作流程
        </button>
        <button
          class="left-panel-tab"
          :class="{ active: activeTab === 'promptControl' }"
          type="button"
          role="tab"
          :aria-selected="(activeTab === 'promptControl').toString()"
          @click="activeTab = 'promptControl'"
        >
          提示词控制
        </button>
        <button
          class="left-panel-tab"
          :class="{ active: activeTab === 'copyBody' }"
          type="button"
          role="tab"
          :aria-selected="(activeTab === 'copyBody').toString()"
          @click="activeTab = 'copyBody'"
        >
          复制正文
        </button>
      </div>

      <div v-if="activeTab === 'brainhole'" class="left-panel-tab-body">
        <div class="left-panel-brainhole-section">
          <BrainholeInputPanel
            :story-start="storyStart"
            :wind-vane-file="windVaneFile"
            :is-loading="isLoading"
            :reference-items="dnaAssetReferences?.brainhole || []"
            :result-reference-items="dnaResultReferences?.brainholeOptions || []"
            :file-text-icon-paths="fileTextIconPaths"
            :show-clear-brainhole="false"
            compact
            @update:story-start="emit('update:storyStart', $event)"
            @choose-wind-vane-file="emit('choose-wind-vane-file')"
            @wind-vane-file-change="emit('wind-vane-file-change', $event)"
            @wind-vane-file-dragover="emit('wind-vane-file-dragover', $event)"
            @wind-vane-file-dragleave="emit('wind-vane-file-dragleave', $event)"
            @wind-vane-file-drop="emit('wind-vane-file-drop', $event)"
            @clear-wind-vane-file="emit('clear-wind-vane-file')"
            @clear-brainhole-input="emit('clear-brainhole-input')"
            @generate-brainhole="emit('generate-brainhole')"
          />
        </div>
      </div>

      <div v-else class="left-panel-tab-body left-panel-tab-body-stages">
        <template v-if="activeTab === 'stages'">
          <div class="left-stage-nav-card">
            <div class="section-title section-title-tight">创作流程</div>
            <StageIndicator
              :stage="stage"
              :active-stage="activeStageView"
              orientation="vertical"
              @navigate="emit('navigate-stage', $event)"
            />
          </div>
        </template>

        <section v-else-if="activeTab === 'promptControl'" class="automation-panel">
          <div class="section-title">提示词控制</div>
          <div class="automation-switch-list">
            <label class="automation-switch-card">
              <input
                :checked="promptAutomationSettings.autoGeneratePlot !== false"
                type="checkbox"
                @change="updatePromptAutomationSetting('autoGeneratePlot', $event)"
              />
              <span class="automation-switch-body">
                <span class="automation-switch-title">自动生成剧情</span>
              </span>
            </label>
            <label class="automation-switch-card">
              <input
                :checked="promptAutomationSettings.autoGenerateChoices !== false"
                type="checkbox"
                @change="updatePromptAutomationSetting('autoGenerateChoices', $event)"
              />
              <span class="automation-switch-body">
                <span class="automation-switch-title">自动生成选项</span>
              </span>
            </label>
            <label class="automation-switch-card">
              <input
                :checked="promptAutomationSettings.generateBodyBeforeChoices !== false"
                type="checkbox"
                @change="updatePromptAutomationSetting('generateBodyBeforeChoices', $event)"
              />
              <span class="automation-switch-body">
                <span class="automation-switch-title">选项前生成正文</span>
              </span>
            </label>
          </div>
        </section>

        <section v-else class="body-record-panel">
          <div class="section-title">复制正文</div>
          <div class="copy-body-tools">
            <button
              class="btn btn-primary btn-sm btn-block"
              type="button"
              :disabled="!canCopyBody"
              @click="emit('copy-body')"
            >
              复制正文
            </button>
            <label class="copy-choice-toggle">
              <input
                :checked="copySelectedChoicesWithBody"
                type="checkbox"
                @change="updateCopySelectedChoicesWithBody"
              />
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
    </div>
  </aside>
</template>
