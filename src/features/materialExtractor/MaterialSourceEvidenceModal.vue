<script setup>
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MaterialSourceEvidenceModalReact from '../../react/components/MaterialSourceEvidenceModal.jsx'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  supportsField: {
    type: String,
    default: '',
  },
  interpretation: {
    type: String,
    default: '',
  },
  excerptHtml: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close'])

const mountRef = ref(null)
let root = null

function renderReact() {
  if (!root) return
  root.render(createElement(MaterialSourceEvidenceModalReact, {
    visible: props.visible,
    supportsField: props.supportsField,
    interpretation: props.interpretation,
    excerptHtml: props.excerptHtml,
    onClose: () => emit('close'),
  }))
}

onMounted(() => {
  root = createRoot(mountRef.value)
  renderReact()
})

watch(
  () => [props.visible, props.supportsField, props.interpretation, props.excerptHtml],
  () => {
    renderReact()
  },
)

onBeforeUnmount(() => {
  if (!root) return
  root.unmount()
  root = null
})
</script>

<template>
  <div ref="mountRef"></div>
</template>
