<script setup>
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

const emit = defineEmits(['select', 'regenerate']);

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

function regenerateText(type) {
  if (type === 'hook') return '重新生成钩子';
  if (type === 'bighook') return '重新生成大钩子';
  return '不满意，重新生成选项';
}
</script>

<template>
  <div class="choice-list">
    <button
      v-for="(option, index) in options"
      :key="`${type}-${index}-${option}`"
      class="option-card"
      :class="{ selected: selectedIndex === index, muted: selectedIndex !== null && selectedIndex !== index }"
      :disabled="disabled || selectedIndex !== null"
      type="button"
      @click="emit('select', index, type)"
    >
      <span class="opt-label" :class="labelClassForType(type)">{{ labelForType(type) }} {{ index + 1 }}</span>
      {{ option }}
    </button>
    <button class="btn btn-secondary btn-sm" type="button" :disabled="disabled" @click="emit('regenerate', type)">
      {{ regenerateText(type) }}
    </button>
  </div>
</template>
