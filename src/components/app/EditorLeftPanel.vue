<script setup>
import BrainholeInputPanel from './BrainholeInputPanel.vue';

defineProps({
  isCollapsed: {
    type: Boolean,
    default: false,
  },
  aiConfig: {
    type: Object,
    default: () => ({
      model: '',
      apiEndpoint: '',
    }),
  },
  activeProjectName: {
    type: String,
    default: '未创建项目',
  },
  hasActiveProject: {
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
  fileTextIconPaths: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  'toggle-panel',
  'open-api-config',
  'open-project-manager',
  'update:storyStart',
  'choose-wind-vane-file',
  'wind-vane-file-change',
  'wind-vane-file-dragover',
  'wind-vane-file-dragleave',
  'wind-vane-file-drop',
  'clear-wind-vane-file',
  'clear-brainhole-input',
  'generate-brainhole',
]);
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
      <div class="config-summary-card">
        <div class="config-summary-header">
          <div>
            <div class="section-title section-title-tight">当前模型</div>
            <div class="config-summary-value">{{ aiConfig.model || '未设置' }}</div>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" @click="emit('open-api-config')">
            编辑
          </button>
        </div>
        <div class="config-summary-meta">{{ aiConfig.apiEndpoint }}</div>
      </div>

      <div class="config-summary-card">
        <div class="config-summary-header">
          <div>
            <div class="section-title section-title-tight">当前项目</div>
            <div class="config-summary-value">{{ activeProjectName }}</div>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" @click="emit('open-project-manager')">
            管理
          </button>
        </div>
        <div class="config-summary-meta">
          {{ hasActiveProject ? '' : '请先创建项目再开始创作' }}
        </div>
      </div>

      <div class="left-panel-brainhole-section">
        <BrainholeInputPanel
          :story-start="storyStart"
          :wind-vane-file="windVaneFile"
          :is-loading="isLoading"
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
  </aside>
</template>
