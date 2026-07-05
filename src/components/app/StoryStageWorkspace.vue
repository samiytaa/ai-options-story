<script setup>
import { computed } from 'vue';
import BrainholeOptionsStage from './BrainholeOptionsStage.vue';
import ChoiceList from '../ChoiceList.vue';

const props = defineProps({
  activeStageViewLabel: {
    type: String,
    default: '',
  },
  stageProgressText: {
    type: String,
    default: '',
  },
  activeStageEmptyText: {
    type: String,
    default: '',
  },
  visibleStoryBlocks: {
    type: Array,
    default: () => [],
  },
  showBrainholeAction: {
    type: Boolean,
    default: false,
  },
  showCurrentChoicePanel: {
    type: Boolean,
    default: false,
  },
  showStylePanel: {
    type: Boolean,
    default: false,
  },
  showFinalActions: {
    type: Boolean,
    default: false,
  },
  pendingPlotGenerationAvailable: {
    type: Boolean,
    default: false,
  },
  pendingChoiceGenerationAvailable: {
    type: Boolean,
    default: false,
  },
  pendingChoiceGenerationLabel: {
    type: String,
    default: '生成剧情选项',
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  loadingMessage: {
    type: String,
    default: '',
  },
  editingBlockId: {
    type: String,
    default: null,
  },
  editingContent: {
    type: String,
    default: '',
  },
  selectedStoryBlockId: {
    type: String,
    default: '',
  },
  storyStart: {
    type: String,
    default: '',
  },
  windVaneFile: {
    type: Object,
    default: null,
  },
  brainholeOptions: {
    type: Array,
    default: () => [],
  },
  selectedBrainholeIndex: {
    type: Number,
    default: null,
  },
  brainholeScoreLabels: {
    type: Object,
    default: () => ({}),
  },
  icons: {
    type: Object,
    default: () => ({}),
  },
  currentChoiceTitle: {
    type: String,
    default: '',
  },
  currentChoices: {
    type: Array,
    default: () => [],
  },
  currentChoiceType: {
    type: String,
    default: 'option',
  },
  selectedChoiceIndex: {
    type: Number,
    default: null,
  },
  styleInput: {
    type: String,
    default: '',
  },
  customPromptInstruction: {
    type: String,
    default: '',
  },
  quickStyles: {
    type: Array,
    default: () => [],
  },
  isPlotBlock: {
    type: Function,
    default: () => false,
  },
  isLatestRegeneratablePlotBlock: {
    type: Function,
    default: () => false,
  },
  formatPlotChoice: {
    type: Function,
    default: (choice) => {
      if (typeof choice === 'object' && choice) return choice;
      return { option: choice || '', result: '' };
    },
  },
});

const emit = defineEmits([
  'favorite-story-block',
  'select-story-block',
  'start-edit-block',
  'delete-plot-block',
  'regenerate-plot-block-result',
  'update:editingContent',
  'save-edit-block',
  'cancel-edit-block',
  'update:storyStart',
  'choose-wind-vane-file',
  'wind-vane-file-change',
  'wind-vane-file-dragover',
  'wind-vane-file-dragleave',
  'wind-vane-file-drop',
  'clear-wind-vane-file',
  'clear-brainhole-options',
  'generate-brainhole',
  'open-manual-brainhole-modal',
  'select-brainhole-option',
  'unselect-brainhole-option',
  'start-edit-brainhole-option',
  'favorite-brainhole-option',
  'delete-brainhole-option',
  'generate-guide-and-first-plot',
  'select-choice',
  'regenerate-current-choices',
  'continue-pending-plot-generation',
  'generate-pending-choices',
  'update-current-choice-option',
  'add-current-choice-option',
  'delete-current-choice-option',
  'favorite-current-choice',
  'update:styleInput',
  'update:customPromptInstruction',
  'final-writing',
  'copy-final-work',
  'download-final-work',
  'reset-all',
]);

const showEmptyState = computed(
  () =>
    !props.visibleStoryBlocks.length &&
    !props.showBrainholeAction &&
    !props.showCurrentChoicePanel &&
    !props.showStylePanel &&
    !props.showFinalActions,
);

function updateEditingContent(event) {
  emit('update:editingContent', event.target.value);
}

function updateStoryStart(event) {
  emit('update:storyStart', event.target.value);
}

function updateStyleInput(event) {
  emit('update:styleInput', event.target.value);
}

function updateCustomPromptInstruction(event) {
  emit('update:customPromptInstruction', event.target.value);
}

function setQuickStyle(style) {
  emit('update:styleInput', style);
}

function forwardSelect(index, type) {
  emit('select-choice', index, type);
}

function forwardRegenerate(type) {
  emit('regenerate-current-choices', type);
}

function forwardUpdateOption(index, value, type) {
  emit('update-current-choice-option', index, value, type);
}

function forwardAddOption(value, type) {
  emit('add-current-choice-option', value, type);
}

function forwardDeleteOption(index, type) {
  emit('delete-current-choice-option', index, type);
}

function forwardFavorite(option, index, type) {
  emit('favorite-current-choice', option, index, type);
}

function forwardBrainholeFavorite(option, index) {
  emit('favorite-brainhole-option', option, index);
}

function splitStoryParagraphs(text) {
  return String(text || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function countStoryCharacters(text) {
  return String(text || '').replace(/\s/g, '').length;
}
</script>

<template>
  <div class="stage-view-heading">
    <div>
      <span class="stage-view-kicker">当前环节</span>
      <div class="stage-view-title-row">
        <h2>{{ activeStageViewLabel }}</h2>
        <button
          v-if="activeStageViewLabel === '脑洞'"
          class="btn btn-secondary btn-sm"
          type="button"
          :disabled="isLoading || !brainholeOptions.length"
          @click="emit('clear-brainhole-options')"
        >
          清空脑洞
        </button>
      </div>
    </div>
    <span class="stage-view-progress">生成进度：{{ stageProgressText }}</span>
  </div>

  <div v-if="showEmptyState" class="stage-empty-state">
    {{ activeStageEmptyText }}
  </div>

  <div v-for="block in visibleStoryBlocks" :key="block.id">
    <div v-if="block.title && block.id !== 'brainhole-options'" class="section-title section-title-icon">
      <svg v-if="block.titleIcon" class="section-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path v-for="path in icons[block.titleIcon] || []" :key="path" :d="path" />
      </svg>
      {{ block.title }}
    </div>
    <div v-if="block.divider" class="chapter-divider">{{ block.divider }}</div>
    <div class="story-block">
      <div
        v-if="block.id !== 'brainhole-options' && (block.content || isPlotBlock(block))"
        class="story-block-toolbar"
      >
        <button
          v-if="block.content"
          class="btn btn-secondary btn-sm story-block-select-btn"
          type="button"
          :class="{ active: selectedStoryBlockId === block.id }"
          :aria-pressed="selectedStoryBlockId === block.id"
          :disabled="isLoading"
          @click="emit('select-story-block', block)"
        >
          {{ selectedStoryBlockId === block.id ? '取消选中' : '选中节点' }}
        </button>
        <button
          v-if="block.content"
          class="btn btn-secondary btn-sm"
          type="button"
          :disabled="isLoading"
          @click="emit('favorite-story-block', block)"
        >
          收藏
        </button>
        <button
          v-if="editingBlockId !== block.id"
          class="btn btn-secondary btn-sm"
          type="button"
          :disabled="isLoading"
          @click="emit('start-edit-block', block)"
        >
          编辑
        </button>
        <button
          v-if="isPlotBlock(block)"
          class="btn btn-danger btn-sm"
          type="button"
          :disabled="isLoading"
          @click="emit('delete-plot-block', block)"
        >
          删除情节点
        </button>
        <button
          v-if="isLatestRegeneratablePlotBlock(block)"
          class="btn btn-secondary btn-sm"
          type="button"
          :disabled="isLoading"
          @click="emit('regenerate-plot-block-result', block)"
        >
          重新生成结果
        </button>
      </div>

      <template v-if="editingBlockId === block.id">
        <textarea :value="editingContent" class="edit-textarea" @input="updateEditingContent" />
        <div class="btn-row edit-actions">
          <button
            class="btn btn-primary btn-sm"
            type="button"
            :disabled="isLoading"
            @click="emit('save-edit-block', block.id)"
          >
            保存
          </button>
          <button class="btn btn-secondary btn-sm" type="button" :disabled="isLoading" @click="emit('cancel-edit-block')">
            取消
          </button>
        </div>
      </template>
      <template v-else-if="block.id === 'brainhole-options'">
        <BrainholeOptionsStage
          :story-start="storyStart"
          :wind-vane-file="windVaneFile"
          :is-loading="isLoading"
          :brainhole-options="brainholeOptions"
          :selected-brainhole-index="selectedBrainholeIndex"
          :brainhole-score-labels="brainholeScoreLabels"
          :file-text-icon-paths="icons.fileText || []"
          :show-input-controls="false"
          :show-manual-add="false"
          @update:storyStart="emit('update:storyStart', $event)"
          @choose-wind-vane-file="emit('choose-wind-vane-file')"
          @wind-vane-file-change="emit('wind-vane-file-change', $event)"
          @wind-vane-file-dragover="emit('wind-vane-file-dragover', $event)"
          @wind-vane-file-dragleave="emit('wind-vane-file-dragleave', $event)"
          @wind-vane-file-drop="emit('wind-vane-file-drop', $event)"
          @clear-wind-vane-file="emit('clear-wind-vane-file')"
          @generate-brainhole="emit('generate-brainhole')"
          @open-manual-brainhole-modal="emit('open-manual-brainhole-modal')"
          @select-brainhole-option="emit('select-brainhole-option', $event)"
          @unselect-brainhole-option="emit('unselect-brainhole-option')"
          @start-edit-brainhole-option="emit('start-edit-brainhole-option', $event)"
          @favorite-brainhole-option="forwardBrainholeFavorite"
          @delete-brainhole-option="emit('delete-brainhole-option', $event)"
        />
      </template>
      <template v-else>
        <div v-if="block.sourceChoice?.text" class="selected-choice-result">
          <span>已选择：{{ block.sourceChoice.label }}</span>
          <template v-if="block.sourceChoice.type === 'option'">
            <div class="story-text-group">
              <p>选项：{{ formatPlotChoice(block.sourceChoice.choice || block.sourceChoice.text).option }}</p>
              <p class="selected-choice-result-text">
                结果：{{ formatPlotChoice(block.sourceChoice.choice || block.sourceChoice.text).result }}
              </p>
            </div>
          </template>
          <div v-else class="story-text-group">
            <p v-for="(paragraph, index) in splitStoryParagraphs(block.sourceChoice.text)" :key="`${block.id}-source-${index}`">
              {{ paragraph }}
            </p>
          </div>
        </div>
        <button
          v-if="block.content"
          class="content-block content-block-button"
          :class="[block.blockClass, { active: selectedStoryBlockId === block.id }]"
          type="button"
          :aria-pressed="selectedStoryBlockId === block.id"
          @click="emit('select-story-block', block)"
        >
          <div class="story-text-group">
            <p v-for="(paragraph, index) in splitStoryParagraphs(block.content)" :key="`${block.id}-paragraph-${index}`">
              {{ paragraph }}
            </p>
          </div>
          <span class="story-word-count">{{ countStoryCharacters(block.content) }} 字</span>
        </button>
      </template>
    </div>
  </div>

  <div v-if="showBrainholeAction" class="action-panel">
    <button class="btn btn-primary" type="button" :disabled="isLoading" @click="emit('generate-guide-and-first-plot')">
      生成导语 & 第一个剧情点
    </button>
    <section class="custom-prompt-panel" aria-label="本次额外生成要求">
      <label for="custom-prompt-instruction-guide">本次额外要求</label>
      <textarea
        id="custom-prompt-instruction-guide"
        :value="customPromptInstruction"
        rows="3"
        placeholder="例如：让主角主动冒险、增加误会冲突、走向更悬疑但不要死人。会追加到当前生成按钮的提示词后。"
        :disabled="isLoading"
        @input="updateCustomPromptInstruction"
      />
    </section>
    <button class="manual-brainhole-add-card manual-brainhole-add-card-bottom" type="button" :disabled="isLoading"
      @click="emit('open-manual-brainhole-modal')">
      <span class="manual-brainhole-add-plus">+</span>
      <span>手动添加脑洞</span>
    </button>
  </div>

  <div v-if="showCurrentChoicePanel" class="choice-panel">
    <div class="section-title">
      {{ currentChoiceTitle }}
    </div>
    <ChoiceList
      :options="currentChoices"
      :type="currentChoiceType"
      :selected-index="selectedChoiceIndex"
      :disabled="isLoading"
      @select="forwardSelect"
      @regenerate="forwardRegenerate"
      @update-option="forwardUpdateOption"
      @add-option="forwardAddOption"
      @delete-option="forwardDeleteOption"
      @favorite="forwardFavorite"
    >
      <template #after-regenerate>
        <section class="custom-prompt-panel custom-prompt-panel-compact" aria-label="本次额外生成要求">
          <label for="custom-prompt-instruction-regenerate">本次额外要求</label>
          <textarea
            id="custom-prompt-instruction-regenerate"
            :value="customPromptInstruction"
            rows="3"
            placeholder="例如：重新生成时让选项更有差异、结果更尖锐、走向更贴近你想要的方向。"
            :disabled="isLoading"
            @input="updateCustomPromptInstruction"
          />
        </section>
      </template>
    </ChoiceList>
  </div>

  <div v-if="pendingPlotGenerationAvailable" class="action-panel">
    <button class="btn btn-primary" type="button" :disabled="isLoading" @click="emit('continue-pending-plot-generation')">
      生成下一段剧情
    </button>
    <section class="custom-prompt-panel" aria-label="本次额外生成要求">
      <label for="custom-prompt-instruction-plot">本次额外要求</label>
      <textarea
        id="custom-prompt-instruction-plot"
        :value="customPromptInstruction"
        rows="3"
        placeholder="例如：让下一段更偏感情拉扯、加重代价、不要立刻揭晓真相。会追加到当前生成按钮的提示词后。"
        :disabled="isLoading"
        @input="updateCustomPromptInstruction"
      />
    </section>
  </div>

  <div v-if="pendingChoiceGenerationAvailable" class="action-panel">
    <button class="btn btn-secondary" type="button" :disabled="isLoading" @click="emit('generate-pending-choices')">
      {{ pendingChoiceGenerationLabel }}
    </button>
    <section class="custom-prompt-panel" aria-label="本次额外生成要求">
      <label for="custom-prompt-instruction-choice">本次额外要求</label>
      <textarea
        id="custom-prompt-instruction-choice"
        :value="customPromptInstruction"
        rows="3"
        placeholder="例如：给出更激进/更保守/更反转的走向，选项之间差异要更大。会追加到当前生成按钮的提示词后。"
        :disabled="isLoading"
        @input="updateCustomPromptInstruction"
      />
    </section>
  </div>

  <div v-if="showStylePanel" class="style-panel">
    <div class="section-title">输入文风，开始最终写作</div>
    <input
      :value="styleInput"
      type="text"
      placeholder="例如：古龙风格、严肃文学、轻快言情、悬疑冷峻..."
      @input="updateStyleInput"
    />
    <div class="btn-row quick-style-row">
      <button
        v-for="style in quickStyles"
        :key="style"
        class="btn btn-secondary btn-sm"
        type="button"
        @click="setQuickStyle(style)"
      >
        {{ style }}
      </button>
    </div>
    <button class="btn btn-gold btn-block" type="button" :disabled="isLoading" @click="emit('final-writing')">
      生成完整作品
    </button>
  </div>

  <div v-if="showFinalActions" class="btn-row action-panel">
    <button class="btn btn-primary btn-sm" type="button" @click="emit('copy-final-work')">复制全文</button>
    <button class="btn btn-secondary btn-sm" type="button" @click="emit('download-final-work')">下载 TXT</button>
    <button class="btn btn-secondary btn-sm" type="button" @click="emit('reset-all')">开始新创作</button>
  </div>

  <div v-if="loadingMessage" class="loading-overlay">
    <span class="spinner"></span>
    {{ loadingMessage }}
  </div>
</template>
