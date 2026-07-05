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

const emit = defineEmits(['select', 'regenerate', 'update-option', 'add-option', 'delete-option', 'favorite']);
const editingIndex = ref(null);
const editingText = ref('');
const showAddOptionModal = ref(false);
const manualOptionText = ref('');
const manualResultText = ref('');
const currentViewIndex = ref(0);

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
</script>

<template>
  <div class="choice-list">
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
            <span class="option-part-label">选项</span>
            <p>{{ optionParts(option, index).option }}</p>
          </div>
          <div class="option-part option-result">
            <span class="option-part-label">结果</span>
            <p>{{ optionParts(option, index).result }}</p>
          </div>
        </div>
        <div v-else class="option-structured">
          <div class="option-part option-action">
            <span class="option-part-label">{{ primaryLabelForType(type) }}</span>
            <p>{{ hookParts(option, index).hook }}</p>
          </div>
          <div class="option-part option-result">
            <span class="option-part-label">剧情走向</span>
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
              :disabled="disabled || selectedIndex !== null"
              @click="emit('select', index, type)"
            >
              选择
            </button>
            <button class="btn btn-secondary btn-sm" type="button" :disabled="disabled" @click="startEdit(index, option)">
              修改
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

    <!-- 轮播导航 -->
    <div class="choice-carousel-nav">
      <button
        class="btn btn-secondary btn-sm carousel-nav-btn"
        type="button"
        :disabled="disabled || !canGoPrev"
        @click="goToPrev"
      >
        ← 上一个
      </button>

      <div class="carousel-center">
        <div class="carousel-indicator">
          <span
            v-for="(option, index) in options"
            :key="`dot-${index}`"
            class="carousel-dot"
            :class="{ active: index === currentViewIndex }"
            @click="currentViewIndex = index"
          ></span>
        </div>
        <div class="carousel-center-actions">
          <button class="btn btn-secondary btn-sm" type="button" :disabled="disabled" @click="emit('regenerate', type)">
            {{ regenerateText() }}
          </button>
          <button class="btn btn-secondary btn-sm" type="button" :disabled="disabled" @click="openAddOptionModal">
            添加{{ labelForType(type) }}
          </button>
        </div>
      </div>

      <button
        class="btn btn-secondary btn-sm carousel-nav-btn"
        type="button"
        :disabled="disabled || !canGoNext"
        @click="goToNext"
      >
        下一个 →
      </button>
    </div>

    <div v-if="selectedIndex !== null && options[selectedIndex]" class="selected-choice-banner">
      <span>已选择{{ labelForType(type) }} {{ selectedIndex + 1 }}</span>
      <template v-if="type === 'option'">
        <p class="selected-choice-option">选项：{{ optionParts(options[selectedIndex], selectedIndex).option }}</p>
        <p class="selected-choice-result-text">结果：{{ optionParts(options[selectedIndex], selectedIndex).result }}</p>
      </template>
      <template v-else>
        <p class="selected-choice-option">{{ primaryLabelForType(type) }}：{{ hookParts(options[selectedIndex], selectedIndex).hook }}</p>
        <p class="selected-choice-result-text">剧情走向：{{ hookParts(options[selectedIndex], selectedIndex).direction }}</p>
      </template>
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
  </div>
</template>
