<script setup>
import AssistantWorkspace from './AssistantWorkspace.vue';

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  selectedStoryBlockTitle: {
    type: String,
    default: '',
  },
  selectedStoryBlockContent: {
    type: String,
    default: '',
  },
  assistantInput: {
    type: String,
    default: '',
  },
  assistantMessages: {
    type: Array,
    default: () => [],
  },
  assistantLoading: {
    type: Boolean,
    default: false,
  },
  canUseAssistant: {
    type: Boolean,
    default: false,
  },
  editingContent: {
    type: String,
    default: '',
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
  editingMessageId: {
    type: [Number, String],
    default: null,
  },
  editingMessageContent: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([
  'close',
  'update:assistantInput',
  'update:editingContent',
  'update:editingMessageContent',
  'send-assistant-message',
  'apply-assistant-rewrite',
  'clear-assistant-conversation',
  'start-edit',
  'save-edit',
  'cancel-edit',
  'start-edit-message',
  'save-edit-message',
  'cancel-edit-message',
  'delete-message',
  'regenerate-message',
]);
</script>

<template>
  <div v-if="visible" class="modal-backdrop fullscreen-backdrop" @click.self="emit('close')">
    <section class="assistant-modal" role="dialog" aria-modal="true" aria-labelledby="assistant-modal-title">
      <header class="assistant-modal-header">
        <div>
          <span class="stage-view-kicker">AI 助手</span>
          <h2 id="assistant-modal-title">{{ selectedStoryBlockTitle || '当前节点' }}</h2>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" @click="emit('close')">关闭</button>
      </header>

      <AssistantWorkspace
        :selected-story-block-title="selectedStoryBlockTitle"
        :selected-story-block-content="selectedStoryBlockContent"
        :assistant-input="assistantInput"
        :assistant-messages="assistantMessages"
        :assistant-loading="assistantLoading"
        :can-use-assistant="canUseAssistant"
        :editing-content="editingContent"
        :is-editing="isEditing"
        :editing-message-id="editingMessageId"
        :editing-message-content="editingMessageContent"
        @update:assistant-input="emit('update:assistantInput', $event)"
        @update:editing-content="emit('update:editingContent', $event)"
        @update:editing-message-content="emit('update:editingMessageContent', $event)"
        @send-assistant-message="emit('send-assistant-message')"
        @apply-assistant-rewrite="emit('apply-assistant-rewrite', $event)"
        @clear-assistant-conversation="emit('clear-assistant-conversation')"
        @start-edit="emit('start-edit')"
        @save-edit="emit('save-edit')"
        @cancel-edit="emit('cancel-edit')"
        @start-edit-message="emit('start-edit-message', $event)"
        @save-edit-message="emit('save-edit-message', $event)"
        @cancel-edit-message="emit('cancel-edit-message')"
        @delete-message="emit('delete-message', $event)"
        @regenerate-message="emit('regenerate-message', $event)"
      />
    </section>
  </div>
</template>
