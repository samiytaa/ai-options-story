<script setup>
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MaterialExtractorShellReact from '../../react/components/MaterialExtractorShell.jsx'

const props = defineProps({
  sidebarTreeData: {
    type: Object,
    default: () => ({}),
  },
  contentViewData: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits([
  'close',
  'switch-view',
  'switch-input-tab',
  'open-track-manager',
  'open-prompt',
  'create-example',
  'upload-examples',
  'search-examples',
  'open-example',
  'clear-track-products',
  'select-track-product',
  'clear-asset-library',
  'select-asset-type',
  'toggle-sidebar-folder',
])

const mountRef = ref(null)
let root = null

function renderReact() {
  if (!root) return
  root.render(createElement(MaterialExtractorShellReact, {
    sidebarTreeData: props.sidebarTreeData,
    contentViewData: props.contentViewData,
    onClose: () => emit('close'),
    onSwitchView: (value) => emit('switch-view', value),
    onSwitchInputTab: (value) => emit('switch-input-tab', value),
    onOpenTrackManager: () => emit('open-track-manager'),
    onOpenPrompt: () => emit('open-prompt'),
    onCreateExample: () => emit('create-example'),
    onUploadExamples: () => emit('upload-examples'),
    onSearchExamples: (value) => emit('search-examples', value),
    onOpenExample: (value) => emit('open-example', value),
    onClearTrackProducts: () => emit('clear-track-products'),
    onSelectTrackProduct: (value) => emit('select-track-product', value),
    onClearAssetLibrary: () => emit('clear-asset-library'),
    onSelectAssetType: (value) => emit('select-asset-type', value),
    onToggleSidebarFolder: (value) => emit('toggle-sidebar-folder', value),
  }))
}

onMounted(() => {
  root = createRoot(mountRef.value)
  renderReact()
})

watch(() => props.sidebarTreeData, () => {
  renderReact()
}, { deep: true })

watch(() => props.contentViewData, () => {
  renderReact()
}, { deep: true })

onBeforeUnmount(() => {
  if (!root) return
  root.unmount()
  root = null
})
</script>

<template>
  <div ref="mountRef"></div>
</template>
