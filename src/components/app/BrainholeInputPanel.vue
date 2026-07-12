<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
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
  referenceItems: {
    type: Array,
    default: () => [],
  },
  resultReferenceItems: {
    type: Array,
    default: () => [],
  },
  fileTextIconPaths: {
    type: Array,
    default: () => [],
  },
  compact: {
    type: Boolean,
    default: false,
  },
  showClearBrainhole: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits([
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

const uploadInputRef = ref(null);

function updateStoryStart(event) {
  emit('update:storyStart', event.target.value);
}

function chooseWindVaneFile() {
  emit('choose-wind-vane-file');
  uploadInputRef.value?.click();
}

watch(
  () => props.windVaneFile,
  (file) => {
    if (!file && uploadInputRef.value) {
      uploadInputRef.value.value = '';
    }
  },
);
</script>

<template>
  <section class="brainhole-control-card brainhole-input-card" :class="{ compact }">
    <div class="brainhole-panel-header">
      <div>
        <span class="brainhole-panel-kicker"></span>
        <h3 v-if="compact"></h3>
      </div>
      <span class="brainhole-panel-tip"></span>
    </div>

    <div v-if="resultReferenceItems.length" class="brainhole-reference-card brainhole-reference-card-result">
      <div class="brainhole-reference-header">
        <span>当前脑洞结果引用来源</span>
        <span>{{ resultReferenceItems.length }} 条</span>
      </div>
      <div class="brainhole-reference-list">
        <article v-for="item in resultReferenceItems" :key="`result-${item.id}`" class="brainhole-reference-item">
          <div class="brainhole-reference-title">{{ item.label || item.assetName || item.assetType || 'DNA资产' }}</div>
          <p v-if="item.summary" class="brainhole-reference-summary">{{ item.summary }}</p>
        </article>
      </div>
    </div>

    <div v-if="referenceItems.length" class="brainhole-reference-card">
      <div class="brainhole-reference-header">
        <span>已引用的故事 DNA</span>
        <span>{{ referenceItems.length }} 条</span>
      </div>
      <div class="brainhole-reference-list">
        <article v-for="item in referenceItems" :key="item.id" class="brainhole-reference-item">
          <div class="brainhole-reference-title">{{ item.label || item.assetName || item.assetType || 'DNA资产' }}</div>
          <p v-if="item.summary" class="brainhole-reference-summary">{{ item.summary }}</p>
          <div v-if="item.assetType || item.assetId" class="brainhole-reference-meta">
            <span v-if="item.assetType">{{ item.assetType }}</span>
            <span v-if="item.assetId">{{ item.assetId }}</span>
          </div>
        </article>
      </div>
    </div>

    <div class="brainhole-form-grid">
      <label class="brainhole-field">
        <span>脑洞</span>
        <textarea :value="storyStart"
          placeholder="可选。只输入故事的起点，不输入完整脑洞。&#10;例如：&#10;• 一个失忆的杀手在雨夜醒来&#10;• 修仙门派发现了一个没有灵根的弟子&#10;• 社畜意外继承了神秘古董店"
          @input="updateStoryStart" />
      </label>

      <div class="brainhole-field">
        <span>风向标文件</span>
        <div v-if="!windVaneFile" class="upload-area" :class="{ 'upload-area-disabled': isLoading }"
          @click="!isLoading && chooseWindVaneFile()"
          @dragover.prevent="!isLoading && emit('wind-vane-file-dragover', $event)"
          @dragleave.prevent="emit('wind-vane-file-dragleave', $event)"
          @drop.prevent="emit('wind-vane-file-drop', $event)">
          <svg class="upload-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div class="upload-text">
            <span class="upload-title">点击或拖拽上传</span>
            <span class="upload-hint">支持 .md / .txt / .json 格式</span>
          </div>
        </div>

        <div v-else class="uploaded-file-card">
          <div class="uploaded-file-info">
            <svg class="file-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path v-for="path in fileTextIconPaths" :key="path" :d="path" />
            </svg>
            <div class="uploaded-file-details">
              <div class="uploaded-file-name">{{ windVaneFile.name }}</div>
              <div class="uploaded-file-meta">{{ windVaneFile.content.length }} 字</div>
            </div>
          </div>
          <button class="btn btn-danger btn-sm" type="button" :disabled="isLoading"
            @click="emit('clear-wind-vane-file')">
            清除
          </button>
        </div>
      </div>
    </div>

    <input ref="uploadInputRef" type="file" class="file-input-hidden" accept=".md,.txt,.json" :disabled="isLoading"
      @change="emit('wind-vane-file-change', $event)" />

    <div class="brainhole-control-actions">
      <button v-if="showClearBrainhole" class="btn btn-secondary" type="button" :disabled="isLoading || !storyStart.trim()"
        @click="emit('clear-brainhole-input')">
        清空脑洞
      </button>
      <button class="btn btn-primary" type="button" :disabled="isLoading" @click="emit('generate-brainhole')">
        生成脑洞
      </button>
    </div>
  </section>
</template>

<style scoped>
.brainhole-reference-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.brainhole-reference-card-result {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}

.brainhole-reference-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.9rem;
  color: var(--text2);
}

.brainhole-reference-list {
  display: grid;
  gap: 8px;
}

.brainhole-reference-item {
  display: grid;
  gap: 4px;
  padding: 10px;
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.brainhole-reference-title {
  font-weight: 700;
}

.brainhole-reference-summary,
.brainhole-reference-meta {
  margin: 0;
  color: var(--text2);
  font-size: 0.9rem;
}

.brainhole-reference-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
