<script setup>
import { computed, ref } from 'vue';
import ChoiceList from '../ChoiceList.vue';

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
  showCurrentChoicePanel: {
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
  customPromptInstruction: {
    type: String,
    default: '',
  },
  dnaResultReferences: {
    type: Object,
    default: () => ({ currentHooks: [], currentBigHooks: [], currentOptions: [] }),
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'toggle-collapse',
  'select-choice',
  'regenerate-current-choices',
  'generate-current-choice-result-variants',
  'continue-pending-plot-generation',
  'generate-pending-choices',
  'update-current-choice-option',
  'add-current-choice-option',
  'delete-current-choice-option',
  'favorite-current-choice',
  'update:customPromptInstruction',
  'open-dna-asset',
]);

const showManualPendingChoiceModal = ref(false);
const manualPendingChoiceText = ref('');
const manualPendingChoiceResult = ref('');

const canAddManualPendingChoice = computed(() => props.pendingChoiceGenerationLabel === '生成剧情选项');
const currentChoiceReferenceItems = computed(() => {
  if (props.currentChoiceType === 'hook') return props.dnaResultReferences?.currentHooks || [];
  if (props.currentChoiceType === 'bighook') return props.dnaResultReferences?.currentBigHooks || [];
  if (props.currentChoiceType === 'option') return props.dnaResultReferences?.currentOptions || [];
  return [];
});
const showBranchWorkspace = computed(() => (
  props.showCurrentChoicePanel ||
  props.pendingPlotGenerationAvailable ||
  props.pendingChoiceGenerationAvailable
));

function updateCustomPromptInstruction(event) {
  emit('update:customPromptInstruction', event.target.value);
}

function openManualPendingChoiceModal() {
  manualPendingChoiceText.value = '';
  manualPendingChoiceResult.value = '';
  showManualPendingChoiceModal.value = true;
}

function closeManualPendingChoiceModal() {
  showManualPendingChoiceModal.value = false;
  manualPendingChoiceText.value = '';
  manualPendingChoiceResult.value = '';
}

function saveManualPendingChoice() {
  const option = manualPendingChoiceText.value.trim();
  if (!option) return;
  emit('add-current-choice-option', {
    option,
    result: manualPendingChoiceResult.value.trim(),
  }, 'option');
  closeManualPendingChoiceModal();
}

function forwardSelect(index, type) {
  emit('select-choice', index, type);
}

function forwardRegenerate(type) {
  emit('regenerate-current-choices', type);
}

function forwardGenerateResultVariants(index, type, done) {
  emit('generate-current-choice-result-variants', index, type, done);
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

function choicePanelClass(type) {
  if (type === 'hook') return 'choice-panel-hook';
  if (type === 'bighook') return 'choice-panel-bighook';
  return 'choice-panel-option';
}
</script>

<template>
  <aside class="panel panel-right" :class="{ collapsed }">
    <button
      class="panel-toggle"
      type="button"
      :aria-expanded="(!props.collapsed).toString()"
      :aria-label="props.collapsed ? '展开右侧区域' : '折叠右侧区域'"
      @click="emit('toggle-collapse')"
    >
      <svg class="panel-toggle-icon" viewBox="0 0 20 20" aria-hidden="true">
        <path v-if="collapsed" d="M12.5 4.5 7 10l5.5 5.5" />
        <path v-else d="M7.5 4.5 13 10l-5.5 5.5" />
      </svg>
    </button>
    <div v-if="collapsed" class="panel-collapsed-hint"></div>
    <div v-else class="panel-body panel-right-branch-body">
      <div v-if="showBranchWorkspace" class="right-branch-workspace">
        <div v-if="pendingChoiceGenerationAvailable" class="action-panel action-panel-choice right-branch-section right-branch-section-compact">
          <div class="panel-intro-row">
            <div>
              <span class="panel-kicker">分支生成</span>
              <div class="section-title">为当前剧情点补充分支与走向</div>
            </div>
          </div>
          <div class="right-branch-action-group" :class="{ 'single-action': !canAddManualPendingChoice }">
            <button class="btn btn-secondary right-branch-action-btn" type="button" :disabled="isLoading" @click="emit('generate-pending-choices')">
              {{ pendingChoiceGenerationLabel }}
            </button>
            <button
              v-if="canAddManualPendingChoice"
              class="btn btn-secondary right-branch-action-btn"
              type="button"
              :disabled="isLoading"
              @click="openManualPendingChoiceModal"
            >
              手动添加
            </button>
          </div>
          <section class="custom-prompt-panel" aria-label="本次额外生成要求">
            <label for="right-custom-prompt-instruction-choice">额外要求</label>
            <textarea
              id="right-custom-prompt-instruction-choice"
              :value="customPromptInstruction"
              rows="2"
              placeholder="例如：给出更激进/更保守/更反转的走向，选项之间差异要更大。会追加到当前生成按钮的提示词后。"
              :disabled="isLoading"
              @input="updateCustomPromptInstruction"
            />
          </section>
        </div>

        <div v-if="showCurrentChoicePanel" class="choice-panel right-branch-section right-branch-section-compact" :class="choicePanelClass(currentChoiceType)">
          <div class="panel-intro-row panel-intro-row-choice">
            <div>
              <span class="panel-kicker">分支决策</span>
              <div class="section-title">{{ currentChoiceTitle }}</div>
            </div>
          </div>
          <section v-if="selectedChoiceIndex === null" class="custom-prompt-panel custom-prompt-panel-inline" aria-label="本次额外生成要求">
            <label for="right-custom-prompt-instruction-regenerate">重生成要求</label>
            <textarea
              id="right-custom-prompt-instruction-regenerate"
              :value="customPromptInstruction"
              rows="1"
              placeholder="例如：重新生成时让选项更有差异、结果更尖锐、走向更贴近你想要的方向。"
              :disabled="isLoading"
              @input="updateCustomPromptInstruction"
            />
          </section>
          <div v-if="currentChoiceReferenceItems.length" class="choice-reference-strip">
            <span class="choice-field-label">本轮生成引用 DNA</span>
            <div class="btn-row right-branch-reference-list">
              <button
                v-for="item in currentChoiceReferenceItems"
                :key="`current-choice-${currentChoiceType}-${item.assetType}-${item.assetId}`"
                class="btn btn-secondary btn-sm"
                type="button"
                @click="emit('open-dna-asset', item)"
              >
                {{ item.label || item.assetName || item.assetId || 'DNA资产' }}
              </button>
            </div>
          </div>
          <ChoiceList
            :options="currentChoices"
            :type="currentChoiceType"
            :selected-index="selectedChoiceIndex"
            :disabled="isLoading"
            @select="forwardSelect"
            @regenerate="forwardRegenerate"
            @generate-result-variants="forwardGenerateResultVariants"
            @update-option="forwardUpdateOption"
            @add-option="forwardAddOption"
            @delete-option="forwardDeleteOption"
            @favorite="forwardFavorite"
          />
        </div>

        <div v-if="pendingPlotGenerationAvailable" class="action-panel action-panel-plot right-branch-section right-branch-section-compact">
          <div class="panel-intro-row">
            <div>
              <span class="panel-kicker">情节推进</span>
              <div class="section-title">基于已选分支继续生成下一段剧情</div>
            </div>
          </div>
          <button class="btn btn-primary right-branch-action-btn" type="button" :disabled="isLoading" @click="emit('continue-pending-plot-generation')">
            生成下一段剧情
          </button>
          <section class="custom-prompt-panel" aria-label="本次额外生成要求">
            <label for="right-custom-prompt-instruction-plot">额外要求</label>
            <textarea
              id="right-custom-prompt-instruction-plot"
              :value="customPromptInstruction"
              rows="2"
              placeholder="例如：让下一段更偏感情拉扯、加重代价、不要立刻揭晓真相。会追加到当前生成按钮的提示词后。"
              :disabled="isLoading"
              @input="updateCustomPromptInstruction"
            />
          </section>
        </div>
      </div>

      <div v-else class="right-panel-empty-state">
        <span class="right-panel-empty-kicker">预留区域</span>
        <p>分支生成和选项选择会在可操作时显示在这里。</p>
      </div>
    </div>
  </aside>

  <div v-if="showManualPendingChoiceModal" class="modal-backdrop choice-add-backdrop" @click.self="closeManualPendingChoiceModal">
    <section class="settings-modal choice-add-modal" role="dialog" aria-modal="true" aria-labelledby="manual-pending-choice-title">
      <header class="settings-modal-header">
        <div>
          <h2 id="manual-pending-choice-title">手动添加剧情选项</h2>
          <p>选项必填，结果可以留空。保存后会进入当前剧情选项池。</p>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" :disabled="isLoading" @click="closeManualPendingChoiceModal">
          关闭
        </button>
      </header>

      <div class="settings-modal-body">
        <div class="choice-add-form">
          <label for="manual-pending-choice-option">选项</label>
          <textarea
            id="manual-pending-choice-option"
            v-model="manualPendingChoiceText"
            class="choice-add-textarea"
            placeholder="输入角色可以采取的行为或选择"
            :disabled="isLoading"
          />

          <label for="manual-pending-choice-result">结果</label>
          <textarea
            id="manual-pending-choice-result"
            v-model="manualPendingChoiceResult"
            class="choice-add-textarea"
            placeholder="输入选择后推动剧情的结果，可留空"
            :disabled="isLoading"
          />
        </div>
      </div>

      <footer class="settings-modal-footer">
        <button class="btn btn-secondary btn-sm" type="button" :disabled="isLoading" @click="closeManualPendingChoiceModal">
          取消
        </button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="isLoading || !manualPendingChoiceText.trim()" @click="saveManualPendingChoice">
          保存
        </button>
      </footer>
    </section>
  </div>
</template>
