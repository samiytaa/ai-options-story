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
  fileTextIconPaths: {
    type: Array,
    default: () => [],
  },
  showUploadInput: {
    type: Boolean,
    default: true,
  },
  showInputControls: {
    type: Boolean,
    default: true,
  },
  showManualAdd: {
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
  'generate-brainhole',
  'open-manual-brainhole-modal',
  'select-brainhole-option',
  'unselect-brainhole-option',
  'start-edit-brainhole-option',
  'favorite-brainhole-option',
  'delete-brainhole-option',
]);

const uploadInputRef = ref(null);

function updateStoryStart(event) {
  emit('update:storyStart', event.target.value);
}

function openWindVaneFilePicker() {
  emit('choose-wind-vane-file');
  uploadInputRef.value?.click();
}

function handleUploadAreaDragOver(event) {
  event.currentTarget.classList.add('upload-area-dragover');
  emit('wind-vane-file-dragover', event);
}

function handleUploadAreaDragLeave(event) {
  event.currentTarget.classList.remove('upload-area-dragover');
  emit('wind-vane-file-dragleave', event);
}

function handleUploadAreaDrop(event) {
  event.currentTarget.classList.remove('upload-area-dragover');
  emit('wind-vane-file-drop', event);
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
  <div v-if="showInputControls" class="brainhole-workspace">
    <section class="brainhole-control-card">
      <div class="brainhole-panel-header">
        <div>
          <span class="brainhole-panel-kicker">脑洞操作台</span>
          <h3>在这里继续补充或刷新脑洞候选</h3>
        </div>
        <span class="brainhole-panel-tip">不会清空当前已选脑洞之外的输入信息</span>
      </div>

      <div class="brainhole-form-grid">
        <label class="brainhole-field">
          <span>脑洞</span>
          <textarea :value="storyStart" placeholder="补充一句新的起点设定，帮助 AI 重新发散脑洞。" @input="updateStoryStart" />
        </label>

        <div class="brainhole-field">
          <span>风向标文件</span>
          <div v-if="!windVaneFile" class="upload-area" :class="{ 'upload-area-disabled': isLoading }"
            @click="!isLoading && openWindVaneFilePicker()"
            @dragover.prevent="!isLoading && handleUploadAreaDragOver($event)"
            @dragleave.prevent="handleUploadAreaDragLeave($event)" @drop.prevent="handleUploadAreaDrop($event)">
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

      <input v-if="showUploadInput" ref="uploadInputRef" type="file" class="file-input-hidden" accept=".md,.txt,.json"
        :disabled="isLoading" @change="emit('wind-vane-file-change', $event)" />

      <div class="brainhole-control-actions">
        <button class="btn btn-secondary btn-sm" type="button" :disabled="isLoading"
          @click="emit('generate-brainhole')">
          重新生成脑洞
        </button>
      </div>
    </section>
  </div>

  <div class="brainhole-grid">
    <article v-for="(option, index) in brainholeOptions" :key="`${index}-${option.title}`" class="brainhole-card"
      :class="{ selected: selectedBrainholeIndex === index }">
      <div class="brainhole-card-head">
        <span class="brainhole-index">选项 {{ index + 1 }}</span>
        <span v-if="selectedBrainholeIndex === index" class="brainhole-selected">已选</span>
      </div>
      <h3>{{ option.title }}</h3>
      <p class="brainhole-idea">{{ option.idea }}</p>
      <p class="brainhole-fit">{{ option.fit }}</p>
      <div class="score-grid">
        <div v-for="(label, key) in brainholeScoreLabels" :key="key" class="score-pill">
          <span>{{ label }}</span>
          <strong>{{ option.scores?.[key] }}</strong>
        </div>
      </div>
      <p v-if="option.comment" class="brainhole-comment">{{ option.comment }}</p>
      <p v-if="option.recommendedReason" class="brainhole-reason">{{ option.recommendedReason }}</p>
      <div class="btn-row brainhole-actions">
        <button v-if="selectedBrainholeIndex !== index" class="btn btn-primary btn-sm" type="button" :disabled="isLoading"
          @click="emit('select-brainhole-option', index)">
          选这个
        </button>
        <button v-else class="btn btn-secondary btn-sm" type="button" :disabled="isLoading"
          @click="emit('unselect-brainhole-option')">
          取消选定
        </button>
        <button class="btn btn-secondary btn-sm" type="button" :disabled="isLoading"
          @click="emit('start-edit-brainhole-option', index)">
          编辑脑洞
        </button>
        <button class="btn btn-secondary btn-sm" type="button" :disabled="isLoading"
          @click="emit('favorite-brainhole-option', option, index)">
          收藏
        </button>
        <button class="btn btn-danger btn-sm" type="button" :disabled="isLoading"
          @click="emit('delete-brainhole-option', index)">
          删除
        </button>
      </div>
    </article>
  </div>

  <button v-if="showManualAdd" class="manual-brainhole-add-card" type="button" :disabled="isLoading"
    @click="emit('open-manual-brainhole-modal')">
    <span class="manual-brainhole-add-plus">+</span>
    <span>手动添加脑洞</span>
  </button>
</template>
