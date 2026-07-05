<script setup>
defineProps({
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
  'open-manual-brainhole-modal',
]);

</script>

<template>
  <div class="empty-state">
    <svg class="empty-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path v-for="path in fileTextIconPaths" :key="path" :d="path" />
    </svg>
    <p class="empty-title">准备好开始创作了吗？</p>
    <p>左侧展开“”，先补充起点或上传风向标，再开始生成脑洞。</p>
    <p class="empty-subtitle">流程：脑洞 → 导语 → 逐章剧情选择 → 钩子 → 大钩子 → 文风成文</p>
    <div class="brainhole-workspace brainhole-workspace-intro empty-state-actions">
      <button class="manual-brainhole-add-card" type="button" :disabled="isLoading"
        @click="emit('open-manual-brainhole-modal')">
        <span class="manual-brainhole-add-plus">+</span>
        <span>手动添加脑洞</span>
      </button>
    </div>
  </div>
</template>
