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
