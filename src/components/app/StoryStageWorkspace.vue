<script setup>
import { computed } from 'vue';
import BrainholeOptionsStage from './BrainholeOptionsStage.vue';
import FinalWorkEditor from './FinalWorkEditor.vue';
import ArchitectureSetupStage from '../../features/architectureSetup/ArchitectureSetupStage.vue';

const props = defineProps({
  activeStageViewLabel: {
    type: String,
    default: '',
  },
  activeStageView: {
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
  architecturePlan: {
    type: Object,
    default: () => ({}),
  },
  brainhole: {
    type: String,
    default: '',
  },
  guide: {
    type: String,
    default: '',
  },
  dnaAssetReferences: {
    type: Object,
    default: () => ({ brainhole: [], guide: [], outline: [] }),
  },
  dnaResultReferences: {
    type: Object,
    default: () => ({ brainholeOptions: [], guide: [], architecture: [] }),
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
  'update-final-work-draft',
  'save-final-work',
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
  'generate-guide',
  'select-choice',
  'regenerate-current-choices',
  'generate-current-choice-result-variants',
  'continue-pending-plot-generation',
  'generate-pending-choices',
  'update-current-choice-option',
  'add-current-choice-option',
  'delete-current-choice-option',
  'favorite-current-choice',
  'update:styleInput',
  'update:customPromptInstruction',
  'open-dna-asset',
  'final-writing',
  'copy-final-work',
  'download-final-work',
  'reset-all',
  'generate-architecture',
  'confirm-architecture',
  'generate-persona',
  'confirm-persona',
  'update-architecture-field',
  'add-architecture-actor',
  'remove-architecture-actor',
  'update-architecture-actor-field',
]);

const showEmptyState = computed(
  () =>
    !props.visibleStoryBlocks.length &&
    !props.showBrainholeAction &&
    !props.showCurrentChoicePanel &&
    !props.showStylePanel &&
    !props.showFinalActions &&
    props.activeStageView !== 'architecture_setup' &&
    props.activeStageView !== 'persona_setup',
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

function blockTypeClass(block) {
  if (props.isPlotBlock(block)) return 'stage-section-plot';
  if (block.id === 'guide') return 'stage-section-guide';
  if (block.id === 'final-work') return 'stage-section-final';
  if (block.id === 'brainhole-options') return 'stage-section-brainhole';
  return 'stage-section-generic';
}

function getBlockDnaReferenceItems(block) {
  return Array.isArray(block?.dnaReferenceItems) ? block.dnaReferenceItems : [];
}

function getSourceChoiceDnaReferenceItems(block) {
  return Array.isArray(block?.sourceChoice?.dnaReferenceItems) ? block.sourceChoice.dnaReferenceItems : [];
}

function showToolbarWordCount(block) {
  return block?.id === 'guide';
}

function showInlineWordCount(block) {
  return !showToolbarWordCount(block);
}

function forwardArchitectureField(field, value) {
  emit('update-architecture-field', field, value);
}

function forwardArchitectureActorField(index, field, value) {
  emit('update-architecture-actor-field', index, field, value);
}
</script>

<template>
  <div class="stage-view-heading">
    <div>
      <span class="stage-view-kicker">当前环节</span>
      <div class="stage-view-title-row">
        <h2>{{ activeStageViewLabel }}</h2>
        <button v-if="activeStageViewLabel === '脑洞'" class="btn btn-secondary btn-sm" type="button"
          :disabled="isLoading || !brainholeOptions.length" @click="emit('clear-brainhole-options')">
          清空脑洞
        </button>
      </div>
    </div>
    <span class="stage-view-progress">生成进度：{{ stageProgressText }}</span>
  </div>

  <div v-if="showEmptyState" class="stage-empty-state">
    {{ activeStageEmptyText }}
  </div>

  <ArchitectureSetupStage
    v-if="activeStageView === 'architecture_setup' || activeStageView === 'persona_setup'"
    :architecture-plan="architecturePlan"
    :mode="activeStageView === 'persona_setup' ? 'persona' : 'architecture'"
    :brainhole="brainhole"
    :guide="guide"
    :reference-groups="{ guide: dnaAssetReferences?.guide || [], outline: dnaAssetReferences?.outline || [] }"
    :result-reference-groups="{ guide: dnaResultReferences?.guide || [], architecture: dnaResultReferences?.architecture || [] }"
    :is-loading="isLoading"
    @generate="emit(activeStageView === 'persona_setup' ? 'generate-persona' : 'generate-architecture')"
    @confirm="emit(activeStageView === 'persona_setup' ? 'confirm-persona' : 'confirm-architecture')"
    @update-field="forwardArchitectureField"
    @add-actor="emit('add-architecture-actor')"
    @remove-actor="emit('remove-architecture-actor', $event)"
    @update-actor-field="forwardArchitectureActorField"
  />

  <section v-for="block in visibleStoryBlocks" :key="block.id" class="stage-section" :class="blockTypeClass(block)">
    <div v-if="block.divider" class="chapter-divider">{{ block.divider }}</div>
    <div
      v-if="block.sourceChoice?.text && block.id !== 'brainhole-options'"
      class="block-header-merged"
      :class="{ 'has-choice': block.sourceChoice?.text, 'hook-type': block.sourceChoice?.type !== 'option' }">
      <div v-if="block.sourceChoice?.text" class="selected-choice-content">
        <span class="selected-choice-label">已选择：{{ block.sourceChoice.label }}</span>
        <template v-if="block.sourceChoice.type === 'option'">
          <div class="choice-item">
            <span class="choice-field-label">选项</span>
            <p class="choice-field-text">{{ formatPlotChoice(block.sourceChoice.choice ||
              block.sourceChoice.text).option }}</p>
          </div>
          <div class="choice-item">
            <span class="choice-field-label">结果</span>
            <p class="choice-field-text">{{ formatPlotChoice(block.sourceChoice.choice ||
              block.sourceChoice.text).result }}</p>
          </div>
        </template>
        <template v-else>
          <div v-for="(paragraph, index) in splitStoryParagraphs(block.sourceChoice.text)"
            :key="`${block.id}-source-${index}`" class="choice-item">
            <span class="choice-field-label">{{ index === 0 ? (block.sourceChoice.type === 'hook' ? '钩子' : '大钩子') :
              '剧情走向' }}</span>
            <p class="choice-field-text">{{ paragraph }}</p>
          </div>
        </template>
        <div v-if="getSourceChoiceDnaReferenceItems(block).length" class="choice-reference-strip">
          <span class="choice-field-label">引用 DNA</span>
          <div class="btn-row">
            <button
              v-for="item in getSourceChoiceDnaReferenceItems(block)"
              :key="`source-${block.id}-${item.assetType}-${item.assetId}`"
              class="btn btn-secondary btn-sm"
              type="button"
              @click="emit('open-dna-asset', item)"
            >
              {{ item.label || item.assetName || item.assetId || 'DNA资产' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="story-block">
      <div v-if="block.id !== 'brainhole-options' && (block.content || isPlotBlock(block))" class="story-block-toolbar">
        <span v-if="block.content && showToolbarWordCount(block)" class="story-toolbar-word-count">
          {{ countStoryCharacters(block.content) }} 字
        </span>
        <button v-if="block.content" class="btn btn-secondary btn-sm" type="button" :disabled="isLoading"
          @click="emit('favorite-story-block', block)">
          收藏
        </button>
        <button v-if="block.id !== 'final-work' && editingBlockId !== block.id" class="btn btn-secondary btn-sm" type="button" :disabled="isLoading"
          @click="emit('start-edit-block', block)">
          编辑
        </button>
        <button v-if="isPlotBlock(block)" class="btn btn-danger btn-sm" type="button" :disabled="isLoading"
          @click="emit('delete-plot-block', block)">
          删除
        </button>
        <button v-if="isLatestRegeneratablePlotBlock(block)" class="btn btn-secondary btn-sm" type="button"
          :disabled="isLoading" @click="emit('regenerate-plot-block-result', block)">
          重新生成结果
        </button>
      </div>

      <div v-if="getBlockDnaReferenceItems(block).length" class="choice-reference-strip">
        <span class="choice-field-label">本结果引用 DNA</span>
        <div class="btn-row">
          <button
            v-for="item in getBlockDnaReferenceItems(block)"
            :key="`block-${block.id}-${item.assetType}-${item.assetId}`"
            class="btn btn-secondary btn-sm"
            type="button"
            @click="emit('open-dna-asset', item)"
          >
            {{ item.label || item.assetName || item.assetId || 'DNA资产' }}
          </button>
        </div>
      </div>

      <template v-if="editingBlockId === block.id">
        <textarea :value="editingContent" class="edit-textarea" @input="updateEditingContent" />
        <div class="btn-row edit-actions">
          <button class="btn btn-primary btn-sm" type="button" :disabled="isLoading"
            @click="emit('save-edit-block', block.id)">
            保存
          </button>
          <button class="btn btn-secondary btn-sm" type="button" :disabled="isLoading"
            @click="emit('cancel-edit-block')">
            取消
          </button>
        </div>
      </template>
      <template v-else-if="block.id === 'final-work'">
        <FinalWorkEditor
          :content="block.content"
          :is-loading="isLoading"
          @update:content="emit('update-final-work-draft', block.id, $event)"
          @save="emit('save-final-work', block.id)"
          @copy="emit('copy-final-work')"
          @download="emit('download-final-work')"
        />
      </template>
      <template v-else-if="block.id === 'brainhole-options'">
        <BrainholeOptionsStage :story-start="storyStart" :wind-vane-file="windVaneFile" :is-loading="isLoading"
          :brainhole-options="brainholeOptions" :selected-brainhole-index="selectedBrainholeIndex"
          :brainhole-score-labels="brainholeScoreLabels" :file-text-icon-paths="icons.fileText || []"
          :show-input-controls="false" :show-manual-add="false" @update:storyStart="emit('update:storyStart', $event)"
          @choose-wind-vane-file="emit('choose-wind-vane-file')"
          @wind-vane-file-change="emit('wind-vane-file-change', $event)"
          @wind-vane-file-dragover="emit('wind-vane-file-dragover', $event)"
          @wind-vane-file-dragleave="emit('wind-vane-file-dragleave', $event)"
          @wind-vane-file-drop="emit('wind-vane-file-drop', $event)"
          @clear-wind-vane-file="emit('clear-wind-vane-file')" @generate-brainhole="emit('generate-brainhole')"
          @open-manual-brainhole-modal="emit('open-manual-brainhole-modal')"
          @select-brainhole-option="emit('select-brainhole-option', $event)"
          @unselect-brainhole-option="emit('unselect-brainhole-option')"
          @start-edit-brainhole-option="emit('start-edit-brainhole-option', $event)"
          @favorite-brainhole-option="forwardBrainholeFavorite"
          @delete-brainhole-option="emit('delete-brainhole-option', $event)" />
      </template>
      <template v-else>
        <button v-if="block.content" class="content-block content-block-button"
          :class="[block.blockClass, { active: selectedStoryBlockId === block.id }]" type="button"
          :aria-label="`打开${block.title || '当前节点'}的 AI 助手`"
          :aria-pressed="selectedStoryBlockId === block.id" @click="emit('select-story-block', block)">
          <div class="story-text-group">
            <p v-for="(paragraph, index) in splitStoryParagraphs(block.content)"
              :key="`${block.id}-paragraph-${index}`">
              {{ paragraph }}
            </p>
          </div>
          <span v-if="showInlineWordCount(block)" class="story-word-count">{{ countStoryCharacters(block.content) }} 字</span>
        </button>
      </template>
    </div>
  </section>

  <div v-if="showBrainholeAction" class="action-panel action-panel-brainhole">
    <div class="panel-intro-row">
      <div>
        <span class="panel-kicker">起点确认</span>
        <div class="section-title">确认脑洞后继续推进</div>
      </div>
    </div>
    <button class="btn btn-primary" type="button" :disabled="isLoading" @click="emit('generate-guide')">
      生成导语
    </button>
    <section class="custom-prompt-panel" aria-label="本次额外生成要求">
      <label for="custom-prompt-instruction-guide">本次额外要求</label>
      <textarea id="custom-prompt-instruction-guide" :value="customPromptInstruction" rows="3"
        placeholder="例如：让主角主动冒险、增加误会冲突、走向更悬疑但不要死人。会追加到当前生成按钮的提示词后。" :disabled="isLoading"
        @input="updateCustomPromptInstruction" />
    </section>
    <button class="manual-brainhole-add-card manual-brainhole-add-card-bottom" type="button" :disabled="isLoading"
      @click="emit('open-manual-brainhole-modal')">
      <span class="manual-brainhole-add-plus">+</span>
      <span>手动添加脑洞</span>
    </button>
  </div>

  <div v-if="showStylePanel" class="style-panel style-panel-final">
    <div class="panel-intro-row">
      <div>
        <span class="panel-kicker">成文阶段</span>
        <div class="section-title">输入文风，开始最终写作</div>
      </div>
    </div>
    <input :value="styleInput" type="text" placeholder="例如：古龙风格、严肃文学、轻快言情、悬疑冷峻..." @input="updateStyleInput" />
    <div class="btn-row quick-style-row">
      <button v-for="style in quickStyles" :key="style" class="btn btn-secondary btn-sm" type="button"
        @click="setQuickStyle(style)">
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
