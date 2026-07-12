<script setup>
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import MaterialCommandModalHostReact from '../../react/components/MaterialCommandModalHost.jsx'

const mountRef = ref(null)
let root = null

onMounted(() => {
  root = createRoot(mountRef.value)
  root.render(createElement(MaterialCommandModalHostReact))
})

onBeforeUnmount(() => {
  if (!root) return
  const currentRoot = root
  root = null
  window.setTimeout(() => {
    currentRoot.unmount()
  }, 0)
})
</script>

<template>
  <div ref="mountRef"></div>
</template>
