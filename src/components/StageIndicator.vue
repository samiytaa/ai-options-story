<script setup>
import { computed } from 'vue';
import { STAGES, STAGE_LABELS } from '../storyState';

const props = defineProps({
  stage: {
    type: String,
    required: true,
  },
  activeStage: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['navigate']);
const currentIndex = computed(() => Math.max(0, STAGES.indexOf(props.stage)));
const activeStageKey = computed(() => props.activeStage || props.stage);
const visibleStages = computed(() =>
  STAGES.map((stage, index) => ({
    stage,
    label: STAGE_LABELS[index],
    originalIndex: index,
  })).filter((item) => item.stage !== 'setup'),
);
</script>

<template>
  <nav class="stage-indicator" aria-label="创作环节导航">
    <template v-for="(item, index) in visibleStages" :key="item.stage">
      <button
        class="stage-label"
        :class="{ active: item.stage === activeStageKey }"
        type="button"
        :aria-current="item.stage === activeStageKey ? 'step' : undefined"
        @click="emit('navigate', item.stage)"
      >
        {{ item.label }}
      </button>
      <span
        class="stage-dot"
        :class="{ active: item.stage === activeStageKey, done: item.originalIndex < currentIndex }"
      ></span>
      <span v-if="index < visibleStages.length - 1" class="stage-arrow">▸</span>
    </template>
  </nav>
</template>
