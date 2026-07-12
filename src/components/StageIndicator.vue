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
  orientation: {
    type: String,
    default: 'horizontal',
    validator: (value) => ['horizontal', 'vertical'].includes(value),
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
  <nav class="stage-indicator" :class="`stage-indicator-${orientation}`" aria-label="创作环节导航">
    <template v-for="(item, index) in visibleStages" :key="item.stage">
      <div class="stage-indicator-item">
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
          v-if="orientation === 'horizontal'"
          class="stage-dot"
          :class="{ active: item.stage === activeStageKey, done: item.originalIndex < currentIndex }"
        ></span>
      </div>
      <span v-if="orientation === 'horizontal' && index < visibleStages.length - 1" class="stage-arrow">▸</span>
    </template>
  </nav>
</template>
