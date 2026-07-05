<script setup>
const props = defineProps({
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

function updateAssistantInput(event) {
  emit('update:assistantInput', event.target.value);
}

function updateEditingContent(event) {
  emit('update:editingContent', event.target.value);
}

function updateEditingMessageContent(event) {
  emit('update:editingMessageContent', event.target.value);
}

function handleAssistantKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    emit('send-assistant-message');
  }
}

function splitStoryParagraphs(text) {
  return String(text || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
</script>

<template>
  <section class="assistant-panel assistant-workspace">
    <div class="assistant-target">
      <template v-if="selectedStoryBlockContent">
        <div class="assistant-target-tools">
          <span>{{ selectedStoryBlockContent.replace(/\s/g, '').length }} 字</span>
          <button v-if="!isEditing" class="btn btn-secondary btn-sm" type="button" @click="emit('start-edit')">
            编辑
          </button>
        </div>
        <template v-if="isEditing">
          <textarea
            :value="editingContent"
            class="assistant-edit-textarea"
            placeholder="编辑当前节点正文"
            @input="updateEditingContent"
          />
          <div class="assistant-edit-actions">
            <button class="btn btn-primary btn-sm" type="button" @click="emit('save-edit')">保存</button>
            <button class="btn btn-secondary btn-sm" type="button" @click="emit('cancel-edit')">取消</button>
          </div>
        </template>
        <div v-else class="assistant-story-text">
          <p v-for="(paragraph, index) in splitStoryParagraphs(selectedStoryBlockContent)" :key="`selected-${index}`">
            {{ paragraph }}
          </p>
        </div>
      </template>
      <p v-else class="outline-empty">请先在中间正文区选中一个剧情节点。</p>
    </div>

    <div class="assistant-thread" aria-live="polite">
      <div v-if="assistantMessages.length" class="assistant-message-list">
        <article v-for="message in assistantMessages" :key="message.id" class="assistant-message" :class="message.role">
          <template v-if="editingMessageId === message.id">
            <textarea
              :value="editingMessageContent"
              class="assistant-message-edit"
              placeholder="编辑这条消息"
              @input="updateEditingMessageContent"
            />
            <div class="assistant-message-actions">
              <button class="btn btn-primary btn-sm" type="button" @click="emit('save-edit-message', message)">
                保存
              </button>
              <button class="btn btn-secondary btn-sm" type="button" @click="emit('cancel-edit-message')">
                取消
              </button>
            </div>
          </template>
          <template v-else>
            <div class="assistant-story-text">
              <p v-for="(paragraph, index) in splitStoryParagraphs(message.content)" :key="`${message.id}-${index}`">
                {{ paragraph }}
              </p>
            </div>
            <div class="assistant-message-actions">
              <button class="btn btn-secondary btn-sm" type="button" :disabled="assistantLoading" @click="emit('start-edit-message', message)">
                编辑
              </button>
              <button class="btn btn-secondary btn-sm" type="button" :disabled="assistantLoading" @click="emit('delete-message', message)">
                删除
              </button>
              <button
                v-if="message.role === 'assistant'"
                class="btn btn-secondary btn-sm"
                type="button"
                :disabled="assistantLoading"
                @click="emit('regenerate-message', message)"
              >
                重新生成
              </button>
              <button
                v-if="message.role === 'assistant'"
                class="btn btn-primary btn-sm"
                type="button"
                :disabled="message.applied || assistantLoading"
                @click="emit('apply-assistant-rewrite', message)"
              >
                {{ message.applied ? '已应用' : '应用到当前节点' }}
              </button>
            </div>
          </template>
        </article>
      </div>
      <div v-else class="outline-empty">暂无对话</div>
    </div>

    <div class="assistant-composer">
      <textarea
        :value="assistantInput"
        class="assistant-input"
        placeholder="例如：把这个剧情点写得更紧张；保留事件但弱化解释；改成更口语的短句。"
        :disabled="assistantLoading"
        @input="updateAssistantInput"
        @keydown="handleAssistantKeydown"
      />
      <div class="assistant-actions">
        <button
          class="btn btn-primary btn-sm"
          type="button"
          :disabled="!canUseAssistant || !assistantInput.trim()"
          @click="emit('send-assistant-message')"
        >
          {{ assistantLoading ? '生成中...' : '发送' }}
        </button>
        <button
          class="btn btn-secondary btn-sm"
          type="button"
          :disabled="assistantLoading || !assistantMessages.length"
          @click="emit('clear-assistant-conversation')"
        >
          清空
        </button>
      </div>
    </div>
  </section>
</template>
