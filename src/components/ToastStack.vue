<script setup>
defineProps({
  toasts: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <div class="toast-stack">
    <div v-for="toast in toasts" :key="toast.id" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>
