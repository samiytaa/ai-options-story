<script setup>
import ManualBrainholeFields from './ManualBrainholeFields.vue';

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  draft: {
    type: Object,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'save', 'update-draft-field']);
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click.self="emit('close')">
    <section
      class="settings-modal manual-brainhole-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-brainhole-title"
    >
      <header class="settings-modal-header">
        <div>
          <h2 id="manual-brainhole-title">手动添加脑洞</h2>
          <p>给当前作品补一个新的脑洞候选。</p>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" @click="emit('close')">关闭</button>
      </header>

      <div class="settings-modal-body">
        <ManualBrainholeFields
          :draft="draft"
          :is-loading="isLoading"
          title=""
          @update-draft-field="emit('update-draft-field', $event)"
          @submit="emit('save')"
        />
      </div>

      <footer class="settings-modal-footer manual-brainhole-modal-footer">
        <button class="btn btn-primary btn-sm" type="button" :disabled="isLoading" @click="emit('save')">
          添加选项
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.manual-brainhole-modal-footer {
  justify-content: flex-end;
}
</style>
