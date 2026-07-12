<script setup>
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import {
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import PromptConfigModalReact from '../../react/components/PromptConfigModal.jsx';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  promptConfigs: {
    type: Array,
    default: () => [],
  },
  activePromptId: {
    type: String,
    default: '',
  },
  activePromptConfig: {
    type: Object,
    default: null,
  },
  editorVersion: {
    type: Number,
    default: 0,
  },
  modalTitle: {
    type: String,
    default: '提示词控制台',
  },
  modalDescription: {
    type: String,
    default: '',
  },
  placeholderDescriptions: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  'close',
  'update:activePromptId',
  'update-prompt-config',
  'reset',
]);

const mountRef = ref(null);
let root = null;

function renderReact() {
  if (!root) return;
  root.render(createElement(PromptConfigModalReact, {
    visible: props.visible,
    promptConfigs: props.promptConfigs,
    activePromptId: props.activePromptId,
    activePromptConfig: props.activePromptConfig,
    editorVersion: props.editorVersion,
    modalTitle: props.modalTitle,
    modalDescription: props.modalDescription,
    placeholderDescriptions: props.placeholderDescriptions,
    onClose: () => emit('close'),
    onUpdateActivePromptId: (value) => emit('update:activePromptId', value),
    onUpdatePromptConfig: (...args) => emit('update-prompt-config', ...args),
    onReset: () => emit('reset'),
  }));
}

onMounted(() => {
  root = createRoot(mountRef.value);
  renderReact();
});

watch(
  () => [
    props.visible,
    props.promptConfigs,
    props.activePromptId,
    props.activePromptConfig,
    props.editorVersion,
    props.modalTitle,
    props.modalDescription,
    props.placeholderDescriptions,
  ],
  () => {
    renderReact();
  },
  { deep: true },
);

onBeforeUnmount(() => {
  if (!root) return;
  root.unmount();
  root = null;
});
</script>

<template>
  <div ref="mountRef"></div>
</template>
