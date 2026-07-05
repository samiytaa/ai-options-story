<script setup>
defineProps({
  draft: {
    type: Object,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  submitLabel: {
    type: String,
    default: '添加为脑洞选项',
  },
});

const emit = defineEmits(['update-draft-field', 'submit']);

function updateDraftField(field, event) {
  emit('update-draft-field', {
    field,
    value: event.target.value,
  });
}
</script>

<template>
  <div class="manual-brainhole-panel">
    <div v-if="title" class="section-title">{{ title }}</div>
    <label class="manual-brainhole-field">
      <span class="manual-brainhole-field-label">标题属性</span>
      <input :value="draft.title" type="text" placeholder="脑洞标题，可选" @input="updateDraftField('title', $event)" />
    </label>
    <label class="manual-brainhole-field">
      <span class="manual-brainhole-field-label">核心脑洞内容</span>
      <textarea :value="draft.idea" class="brainhole-edit-idea" placeholder="不用 AI，直接写一个口水话脑洞。例如：她一醒来发现全宗门都在演她，只有反派偷偷递小抄。"
        @input="updateDraftField('idea', $event)" />
    </label>
    <label class="manual-brainhole-field">
      <span class="manual-brainhole-field-label">契合属性</span>
      <input :value="draft.fit" type="text" placeholder="契合点，可选" @input="updateDraftField('fit', $event)" />
    </label>
  </div>
</template>

<style scoped>
.manual-brainhole-panel {
  display: grid;
  gap: 18px;
  width: 100%;
  margin: 0;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.manual-brainhole-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.manual-brainhole-field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  line-height: 1.4;
}
</style>
