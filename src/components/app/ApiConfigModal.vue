<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
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

const showModelOptions = ref(false);

const normalizedModelQuery = computed(() => props.apiConfigDraft.model.trim().toLowerCase());
const filteredModelOptions = computed(() => {
  const models = props.apiConfigDraft.availableModels || [];
  const query = normalizedModelQuery.value;

  if (!query) {
    return models;
  }

  const matches = models.filter((model) => model.toLowerCase().includes(query));
  const rest = models.filter((model) => !model.toLowerCase().includes(query));
  return [...matches, ...rest];
});

function updateModel(value) {
  emit('update-api-config', 'model', value);
}

function selectModel(model) {
  updateModel(model);
  showModelOptions.value = false;
}

function hideModelOptionsSoon() {
  window.setTimeout(() => {
    showModelOptions.value = false;
  }, 120);
}
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
              <div class="model-combobox">
                <input
                  id="api-model-input"
                  :value="apiConfigDraft.model"
                  type="text"
                  class="mono-input model-combobox-input"
                  placeholder="deepseek-chat"
                  role="combobox"
                  autocomplete="off"
                  aria-controls="available-models"
                  :aria-expanded="showModelOptions && apiConfigDraft.availableModels.length > 0"
                  @focus="showModelOptions = true"
                  @click="showModelOptions = true"
                  @blur="hideModelOptionsSoon"
                  @input="updateModel($event.target.value); showModelOptions = true"
                />
                <button
                  class="model-combobox-toggle"
                  type="button"
                  aria-label="展开模型列表"
                  @mousedown.prevent="showModelOptions = !showModelOptions"
                >
                  ▾
                </button>
                <div
                  v-if="showModelOptions && apiConfigDraft.availableModels.length"
                  id="available-models"
                  class="model-options"
                  role="listbox"
                >
                  <button
                    v-for="model in filteredModelOptions"
                    :key="model"
                    class="model-option"
                    type="button"
                    role="option"
                    :aria-selected="model === apiConfigDraft.model"
                    @mousedown.prevent="selectModel(model)"
                  >
                    {{ model }}
                  </button>
                </div>
              </div>
              <button
                class="btn btn-secondary btn-sm"
                type="button"
                :disabled="modelFetchLoading"
                @click="emit('fetch-models')"
              >
                {{ modelFetchLoading ? '拉取中...' : '拉取模型' }}
              </button>
            </div>
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
