<script setup>
import { computed } from 'vue';
import { STAGES, STAGE_LABELS } from '../storyState';

const props = defineProps({
  stage: {
    type: String,
    required: true,
  },
});

const currentIndex = computed(() => Math.max(0, STAGES.indexOf(props.stage)));
</script>

<template>
  <div class="stage-indicator">
    <template v-for="(label, index) in STAGE_LABELS" :key="label">
      <span class="stage-label" :class="{ active: index === currentIndex }">{{ label }}</span>
      <span class="stage-dot" :class="{ active: index === currentIndex, done: index < currentIndex }"></span>
      <span v-if="index < STAGE_LABELS.length - 1" class="stage-arrow">▸</span>
    </template>
  </div>
</template>
