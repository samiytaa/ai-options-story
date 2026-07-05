<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  apiConfigDraft: {
    type: Object,
    required: true,
  },
  showApiKey: {
    type: Boolean,
    default: false,
  },
  modelFetchLoading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'close',
  'update:showApiKey',
  'update-api-config',
  'fetch-models',
  'clear',
  'reset',
  'save',
]);
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click.self="emit('close')">
    <section class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="api-config-modal-title">
      <header class="settings-modal-header">
        <div>
          <h2 id="api-config-modal-title">API 配置</h2>

        </div>
        <button class="btn btn-secondary btn-sm" type="button" @click="emit('close')">关闭</button>
      </header>

      <div class="settings-modal-body">
        <div class="settings-grid">
          <div>
            <label for="api-endpoint-input">API Endpoint</label>
            <input
              id="api-endpoint-input"
              :value="apiConfigDraft.apiEndpoint"
              type="text"
              class="mono-input"
              placeholder="https://api.deepseek.com/v1"
              @input="emit('update-api-config', 'apiEndpoint', $event.target.value)"
            />
            <p class="helper-text">填写到 `/v1` 这一层即可，程序会自动拼接 `/chat/completions` 和 `/models`。</p>
          </div>

          <div>
            <label for="api-key-input">API Key</label>
            <div class="inline-row">
              <input
                id="api-key-input"
                :value="apiConfigDraft.apiKey"
                :type="showApiKey ? 'text' : 'password'"
                class="mono-input"
                placeholder="sk-xxxxxxxxxxxxxxxx"
                @input="emit('update-api-config', 'apiKey', $event.target.value)"
              />
              <button class="btn btn-secondary btn-sm" type="button" @click="emit('update:showApiKey', !showApiKey)">
                {{ showApiKey ? '隐藏' : '显示' }}
              </button>
            </div>
          </div>

          <div>
            <label for="api-model-input">模型</label>
            <div class="inline-row">
              <input
                id="api-model-input"
                :value="apiConfigDraft.model"
                list="available-models"
                type="text"
                class="mono-input"
                placeholder="deepseek-chat"
                @input="emit('update-api-config', 'model', $event.target.value)"
              />
              <button
                class="btn btn-secondary btn-sm"
                type="button"
                :disabled="modelFetchLoading"
                @click="emit('fetch-models')"
              >
                {{ modelFetchLoading ? '拉取中...' : '拉取模型' }}
              </button>
            </div>
            <datalist id="available-models">
              <option v-for="model in apiConfigDraft.availableModels" :key="model" :value="model" />
            </datalist>
            <p class="helper-text">
              已缓存 {{ apiConfigDraft.availableModels.length }} 个模型；
              当前生成会使用 <strong>{{ apiConfigDraft.model || '未填写模型' }}</strong>。
            </p>
          </div>
        </div>
      </div>

      <footer class="settings-modal-footer">
        <button class="btn btn-danger btn-sm" type="button" @click="emit('clear')">恢复默认</button>
        <div class="btn-row">
          <button class="btn btn-secondary btn-sm" type="button" @click="emit('reset')">撤销改动</button>
          <button class="btn btn-primary btn-sm" type="button" @click="emit('save')">保存配置</button>
        </div>
      </footer>
    </section>
  </div>
</template>
