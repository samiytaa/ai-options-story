<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  draft: {
    type: Object,
    required: true,
  },
  optionIndex: {
    type: Number,
    default: 0,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'save']);
</script>

<template>
  <div v-if="visible" class="modal-backdrop favorite-edit-backdrop" @click.self="emit('close')">
    <section
      class="settings-modal favorite-edit-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="brainhole-edit-title"
    >
      <header class="settings-modal-header">
        <div>
          <h2 id="brainhole-edit-title">编辑脑洞候选</h2>
          <p>当前脑洞列表 · 选项 {{ optionIndex + 1 }}</p>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" :disabled="isLoading" @click="emit('close')">
          关闭
        </button>
      </header>

      <div class="settings-modal-body">
        <div class="library-edit-form">
          <label>
            脑洞标题
            <input v-model="draft.title" type="text" placeholder="脑洞标题" />
          </label>
          <label>
            脑洞内容
            <textarea v-model="draft.idea" class="brainhole-edit-idea" placeholder="脑洞内容，直接用口水话表述" />
          </label>
          <label>
            契合点
            <textarea v-model="draft.fit" placeholder="它和风向标哪里契合" />
          </label>
          <div class="score-edit-grid">
            <label>
              新鲜度
              <input v-model.number="draft.freshness" type="number" min="0" max="10" />
            </label>
            <label>
              契合度
              <input v-model.number="draft.alignment" type="number" min="0" max="10" />
            </label>
            <label>
              爽点/虐点
              <input v-model.number="draft.payoff" type="number" min="0" max="10" />
            </label>
            <label>
              可写性
              <input v-model.number="draft.writability" type="number" min="0" max="10" />
            </label>
          </div>
          <label>
            一句短评
            <input v-model="draft.comment" type="text" placeholder="一句短评" />
          </label>
          <label>
            推荐理由
            <input v-model="draft.recommendedReason" type="text" placeholder="推荐理由，可选" />
          </label>
        </div>
      </div>

      <footer class="settings-modal-footer">
        <button class="btn btn-secondary btn-sm" type="button" :disabled="isLoading" @click="emit('close')">
          取消
        </button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="isLoading" @click="emit('save')">
          保存脑洞
        </button>
      </footer>
    </section>
  </div>
</template>
