<script setup>
import { ref, watch, computed } from 'vue';
import {
  formatChoiceForDisplay,
  formatHookForDisplay,
  normalizeHookChoice,
  normalizePlotChoice,
} from '../storyState';

const props = defineProps({
  options: {
    type: Array,
    default: () => [],
  },
  type: {
    type: String,
    default: 'option',
  },
  selectedIndex: {
    type: Number,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['select', 'regenerate', 'generate-result-variants', 'update-option', 'add-option', 'delete-option', 'favorite']);
const editingIndex = ref(null);
const editingText = ref('');
const showAddOptionModal = ref(false);
const manualOptionText = ref('');
const manualResultText = ref('');
const currentViewIndex = ref(0);
const resultVariantIndex = ref(null);
const resultVariants = ref([]);

const canGoPrev = computed(() => currentViewIndex.value > 0);
const canGoNext = computed(() => currentViewIndex.value < props.options.length - 1);

watch(
  () => [props.options, props.type],
  () => {
    editingIndex.value = null;
    editingText.value = '';
    manualOptionText.value = '';
    manualResultText.value = '';
    showAddOptionModal.value = false;
    resultVariantIndex.value = null;
    resultVariants.value = [];
    currentViewIndex.value = 0;
  },
  { deep: true },
);

function goToPrev() {
  if (canGoPrev.value) {
    currentViewIndex.value--;
  }
}

function goToNext() {
  if (canGoNext.value) {
    currentViewIndex.value++;
  }
}

function labelForType(type) {
  if (type === 'hook') return '钩子';
  if (type === 'bighook') return '大钩子';
  return '选项';
}

function labelClassForType(type) {
  if (type === 'hook') return 'hook';
  if (type === 'bighook') return 'big-hook';
  return '';
}

function regenerateText() {
  return '重新生成';
}

function startEdit(index, option) {
  editingIndex.value = index;
  editingText.value = props.type === 'option' ? formatChoiceForDisplay(option) : formatHookForDisplay(option, props.type);
}

function cancelEdit() {
  editingIndex.value = null;
  editingText.value = '';
}

function saveEdit(index) {
  const value = editingText.value.trim();
  if (!value) return;
  emit('update-option', index, props.type === 'option' ? normalizePlotChoice(value, index) : normalizeHookChoice(value, index, props.type), props.type);
  cancelEdit();
}

function openResultVariants(index) {
  resultVariantIndex.value = index;
  resultVariants.value = [];
  emit('generate-result-variants', index, props.type, (variants = []) => {
    if (resultVariantIndex.value !== index) return;
    resultVariants.value = variants;
  });
}

function closeResultVariants() {
  resultVariantIndex.value = null;
  resultVariants.value = [];
}

function applyResultVariant(variant) {
  const index = resultVariantIndex.value;
  if (index === null || !variant) return;
  const current = props.type === 'option'
    ? optionParts(props.options[index], index)
    : hookParts(props.options[index], index);

  emit(
    'update-option',
    index,
    props.type === 'option'
      ? { ...current, result: variant }
      : { ...current, direction: variant },
    props.type,
  );
  closeResultVariants();
}

function addManualOption() {
  const value = manualOptionText.value.trim();
  if (!value) return;
  emit(
    'add-option',
    props.type === 'option'
      ? {
          option: value,
          result: manualResultText.value.trim(),
        }
      : {
          hook: value,
          direction: manualResultText.value.trim(),
        },
    props.type,
  );
  manualOptionText.value = '';
  manualResultText.value = '';
  showAddOptionModal.value = false;
}

function openAddOptionModal() {
  manualOptionText.value = '';
  manualResultText.value = '';
  showAddOptionModal.value = true;
}

function closeAddOptionModal() {
  showAddOptionModal.value = false;
  manualOptionText.value = '';
  manualResultText.value = '';
}

function optionParts(option, index) {
  return normalizePlotChoice(option, index);
}

function hookParts(option, index) {
  return normalizeHookChoice(option, index, props.type);
}

function primaryLabelForType(type) {
  if (type === 'hook') return '钩子';
  if (type === 'bighook') return '大钩子';
  return '选项';
}

function secondaryLabelForType(type) {
  if (type === 'option') return '结果';
  return '剧情走向';
}

function optionCardKey(option, index) {
  return `${props.type}-${index}-${props.type === 'option' ? formatChoiceForDisplay(option) : formatHookForDisplay(option, props.type)}`;
}

function selectButtonText(index) {
  return props.selectedIndex === index ? '取消选中' : '选择';
}

function resultVariantModalTitle() {
  return props.type === 'option' ? '选择一个结果' : '选择一个剧情走向';
}

function currentResultVariantSource() {
  const index = resultVariantIndex.value;
  if (index === null || !props.options[index]) return '';
  return props.type === 'option'
    ? optionParts(props.options[index], index).option
    : hookParts(props.options[index], index).hook;
}

function choiceListClass(type) {
  if (type === 'hook') return 'choice-list-hook';
  if (type === 'bighook') return 'choice-list-bighook';
  return 'choice-list-option';
}
</script>

<template>
  <div class="choice-list" :class="choiceListClass(type)">
    <!-- 紧凑型工具栏：导航 + 操作 -->
    <div class="choice-compact-toolbar">
      <div class="choice-toolbar-left">
        <button
          class="btn btn-secondary btn-sm choice-nav-btn"
          type="button"
          :disabled="disabled || !canGoPrev"
          @click="goToPrev"
          title="上一个选项"
        >
          ←
        </button>

        <div class="choice-indicator-compact">
          <span class="choice-counter">{{ currentViewIndex + 1 }} / {{ options.length }}</span>
          <div class="choice-dots-compact">
            <span
              v-for="(option, index) in options"
              :key="`dot-${index}`"
              class="carousel-dot"
              :class="{ active: index === currentViewIndex }"
              @click="currentViewIndex = index"
            ></span>
          </div>
        </div>

        <button
          class="btn btn-secondary btn-sm choice-nav-btn"
          type="button"
          :disabled="disabled || !canGoNext"
          @click="goToNext"
          title="下一个选项"
        >
          →
        </button>
      </div>

      <div class="choice-toolbar-right">
        <span class="choice-type-badge">{{ labelForType(type) }}池</span>
        <button
          v-if="selectedIndex === null"
          class="btn btn-secondary btn-sm"
          type="button"
          :disabled="disabled"
          @click="emit('regenerate', type)"
          title="重新生成选项"
        >
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          重新生成
        </button>
        <button
          v-if="selectedIndex === null"
          class="btn btn-secondary btn-sm"
          type="button"
          :disabled="disabled"
          @click="openAddOptionModal"
          title="手动添加选项"
        >
          +
        </button>
      </div>
    </div>

    <!-- 选项卡片轮播容器 -->
    <div class="choice-carousel-container">
      <article
        v-for="(option, index) in options"
        v-show="index === currentViewIndex"
        :key="optionCardKey(option, index)"
        class="option-card"
        :class="{ selected: selectedIndex === index, muted: selectedIndex !== null && selectedIndex !== index }"
      >
        <span class="opt-label" :class="labelClassForType(type)">{{ labelForType(type) }} {{ index + 1 }}</span>

        <div v-if="type === 'option'" class="option-structured">
          <div class="option-part option-action">
            <div class="option-part-header">
              <span class="option-part-tag">选项</span>
              <span class="option-part-attr">choice-primary</span>
            </div>
            <p>{{ optionParts(option, index).option }}</p>
          </div>
          <div class="option-part option-result">
            <div class="option-part-header">
              <span class="option-part-tag">结果</span>
              <span class="option-part-attr">choice-outcome</span>
            </div>
            <p>{{ optionParts(option, index).result }}</p>
          </div>
        </div>
        <div v-else class="option-structured">
          <div class="option-part option-action">
            <div class="option-part-header">
              <span class="option-part-tag">{{ primaryLabelForType(type) }}</span>
              <span class="option-part-attr">hook-primary</span>
            </div>
            <p>{{ hookParts(option, index).hook }}</p>
          </div>
          <div class="option-part option-result">
            <div class="option-part-header">
              <span class="option-part-tag">剧情走向</span>
              <span class="option-part-attr">hook-direction</span>
            </div>
            <p>{{ hookParts(option, index).direction }}</p>
          </div>
        </div>

        <div v-if="editingIndex === index" class="option-inline-editor">
          <span class="option-part-label">编辑{{ labelForType(type) }}</span>
          <textarea v-model="editingText" class="choice-edit-textarea" />
          <div class="btn-row option-actions">
            <button class="btn btn-primary btn-sm" type="button" :disabled="disabled || !editingText.trim()" @click="saveEdit(index)">
              保存
            </button>
            <button class="btn btn-secondary btn-sm" type="button" :disabled="disabled" @click="cancelEdit">
              取消
            </button>
          </div>
        </div>

        <div class="option-card-footer">
          <div class="btn-row option-actions">
            <button
              class="btn btn-primary btn-sm"
              type="button"
              :disabled="disabled || (selectedIndex !== null && selectedIndex !== index)"
              @click="emit('select', index, type)"
            >
              {{ selectButtonText(index) }}
            </button>
            <button class="btn btn-secondary btn-sm" type="button" :disabled="disabled" @click="startEdit(index, option)">
              修改
            </button>
            <button
              class="btn btn-secondary btn-sm"
              type="button"
              :disabled="disabled || selectedIndex !== null"
              @click="openResultVariants(index)"
            >
              重新生成{{ secondaryLabelForType(type) }}
            </button>
            <button
              class="btn btn-danger btn-sm"
              type="button"
              :disabled="disabled || selectedIndex !== null"
              @click="emit('delete-option', index, type)"
            >
              删除
            </button>
          </div>
          <button
            class="btn btn-secondary btn-sm option-favorite-btn"
            type="button"
            :disabled="disabled"
            @click="emit('favorite', option, index, type)"
          >
            收藏
          </button>
        </div>
      </article>
    </div>

    <!-- 已选择横幅 -->
    <div v-if="selectedIndex !== null && options[selectedIndex]" class="selected-choice-banner" :class="{ 'hook-type': type !== 'option' }">
      <span>已选择{{ labelForType(type) }} {{ selectedIndex + 1 }}</span>
      <template v-if="type === 'option'">
        <div class="selected-choice-block">
          <div class="selected-choice-block-header">
            <span class="selected-choice-block-tag">选项</span>
            <span class="selected-choice-block-attr">choice-primary</span>
          </div>
          <p class="selected-choice-option">{{ optionParts(options[selectedIndex], selectedIndex).option }}</p>
        </div>
        <div class="selected-choice-block">
          <div class="selected-choice-block-header">
            <span class="selected-choice-block-tag">结果</span>
            <span class="selected-choice-block-attr">choice-outcome</span>
          </div>
          <p class="selected-choice-result-text">{{ optionParts(options[selectedIndex], selectedIndex).result }}</p>
        </div>
      </template>
      <template v-else>
        <div class="selected-choice-block">
          <div class="selected-choice-block-header">
            <span class="selected-choice-block-tag">{{ primaryLabelForType(type) }}</span>
            <span class="selected-choice-block-attr">hook-primary</span>
          </div>
          <p class="selected-choice-option">{{ hookParts(options[selectedIndex], selectedIndex).hook }}</p>
        </div>
        <div class="selected-choice-block">
          <div class="selected-choice-block-header">
            <span class="selected-choice-block-tag">剧情走向</span>
            <span class="selected-choice-block-attr">hook-direction</span>
          </div>
          <p class="selected-choice-result-text">{{ hookParts(options[selectedIndex], selectedIndex).direction }}</p>
        </div>
      </template>
    </div>

    <!-- 额外生成要求插槽 -->
    <div v-if="selectedIndex === null" class="choice-extra-controls">
      <slot name="after-regenerate" />
    </div>

    <div v-if="showAddOptionModal" class="modal-backdrop choice-add-backdrop" @click.self="closeAddOptionModal">
      <section class="settings-modal choice-add-modal" role="dialog" aria-modal="true" aria-labelledby="choice-add-title">
        <header class="settings-modal-header">
          <div>
            <h2 id="choice-add-title">添加{{ labelForType(type) }}</h2>
            <p>{{ primaryLabelForType(type) }}必填，{{ secondaryLabelForType(type) }}可以留空。</p>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" @click="closeAddOptionModal">关闭</button>
        </header>

        <div class="settings-modal-body">
          <div class="choice-add-form">
            <label for="manual-choice-option">{{ primaryLabelForType(type) }}</label>
            <textarea
              id="manual-choice-option"
              v-model="manualOptionText"
              class="choice-add-textarea"
              :placeholder="type === 'option' ? '角色采取的行为' : `输入${labelForType(type)}内容`"
            />

            <label for="manual-choice-result">{{ secondaryLabelForType(type) }}</label>
            <textarea
              id="manual-choice-result"
              v-model="manualResultText"
              class="choice-add-textarea"
              :placeholder="type === 'option' ? '行为推进后的最后结果，可留空' : '选择这个钩子后的剧情展开方向，可留空'"
            />
          </div>
        </div>

        <footer class="settings-modal-footer">
          <button class="btn btn-secondary btn-sm" type="button" @click="closeAddOptionModal">取消</button>
          <button class="btn btn-primary btn-sm" type="button" :disabled="disabled || !manualOptionText.trim()" @click="addManualOption">
            保存
          </button>
        </footer>
      </section>
    </div>

    <div v-if="resultVariantIndex !== null" class="modal-backdrop choice-add-backdrop" @click.self="closeResultVariants">
      <section class="settings-modal choice-add-modal" role="dialog" aria-modal="true" aria-labelledby="choice-result-variant-title">
        <header class="settings-modal-header">
          <div>
            <h2 id="choice-result-variant-title">{{ resultVariantModalTitle() }}</h2>
            <p>会保留当前{{ primaryLabelForType(type) }}，只替换{{ secondaryLabelForType(type) }}。</p>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" @click="closeResultVariants">关闭</button>
        </header>

        <div class="settings-modal-body">
          <section v-if="currentResultVariantSource()" class="choice-result-source">
            <span class="option-part-label">当前{{ primaryLabelForType(type) }}</span>
            <p>{{ currentResultVariantSource() }}</p>
          </section>

          <div v-if="!resultVariants.length" class="choice-result-variant-empty">正在生成候选...</div>
          <div v-else class="choice-result-variant-list">
            <article v-for="(variant, index) in resultVariants" :key="`variant-${index}`" class="choice-result-variant-card">
              <span class="option-part-label">{{ secondaryLabelForType(type) }} {{ index + 1 }}</span>
              <p>{{ variant }}</p>
              <button class="btn btn-primary btn-sm" type="button" :disabled="disabled" @click="applyResultVariant(variant)">
                选用这个
              </button>
            </article>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
