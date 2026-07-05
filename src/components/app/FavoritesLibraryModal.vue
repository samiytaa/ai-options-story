<script setup>
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  tabs: {
    type: Array,
    default: () => [],
  },
  activeTab: {
    type: String,
    default: 'brainhole',
  },
  favorites: {
    type: Array,
    default: () => [],
  },
  favoriteItems: {
    type: Array,
    default: () => [],
  },
  canAppendFavoriteBrainhole: {
    type: Boolean,
    default: false,
  },
  scoreLabels: {
    type: Object,
    default: () => ({}),
  },
  normalizePlotChoice: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits([
  'close',
  'update:activeTab',
  'open-add-favorite',
  'append-brainhole',
  'edit-favorite',
  'delete-favorite',
]);

function close() {
  emit('close');
}

function selectTab(tab) {
  emit('update:activeTab', tab);
}

function hookChoiceParts(item) {
  const choice = item?.payload?.choice || {};
  return {
    hook: choice.hook || item?.payload?.text || item?.content || '',
    direction: choice.direction || item?.note || '',
  };
}
</script>

<template>
  <div v-if="visible" class="modal-backdrop fullscreen-backdrop" @click.self="close">
    <section class="library-modal" role="dialog" aria-modal="true" aria-labelledby="favorites-modal-title">
      <header class="prompt-modal-header">
        <div>
          <h2 id="favorites-modal-title">收藏库</h2>
          <p></p>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" @click="close">关闭</button>
      </header>

      <div class="library-workspace">
        <nav class="library-tabs" aria-label="收藏分类">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="library-tab"
            type="button"
            :class="{ active: activeTab === tab.value }"
            @click="selectTab(tab.value)"
          >
            {{ tab.label }}
            <span>{{ favorites.filter((item) => item.type === tab.value).length }}</span>
          </button>
        </nav>

        <section class="library-panel">
          <div class="library-panel-toolbar">
            <div>
              <div class="section-title section-title-tight">
                {{ tabs.find((tab) => tab.value === activeTab)?.label }}收藏
              </div>
              <p class="helper-text">手动新增会按当前分类保存完整结构化字段。</p>
            </div>
            <button class="btn btn-primary btn-sm" type="button" @click="emit('open-add-favorite')">
              添加{{ tabs.find((tab) => tab.value === activeTab)?.label }}
            </button>
          </div>

          <div v-if="favoriteItems.length" class="library-list">
            <article v-for="item in favoriteItems" :key="item.id" class="library-item">
              <div class="library-item-header">
                <div>
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.projectName || '无项目' }} · {{ new Date(item.createdAt).toLocaleString() }}</p>
                </div>
                <div class="btn-row">
                  <button
                    v-if="item.type === 'brainhole' && canAppendFavoriteBrainhole"
                    class="btn btn-primary btn-sm"
                    type="button"
                    @click="emit('append-brainhole', item)"
                  >
                    添加为脑洞
                  </button>
                  <button class="btn btn-secondary btn-sm" type="button" @click="emit('edit-favorite', item)">编辑</button>
                  <button class="btn btn-danger btn-sm" type="button" @click="emit('delete-favorite', item.id)">删除</button>
                </div>
              </div>

              <template v-if="item.type === 'brainhole' && item.payload?.kind === 'brainhole-option'">
                <div class="library-content">{{ item.payload.idea }}</div>
                <p v-if="item.payload.fit" class="library-note">{{ item.payload.fit }}</p>
                <div class="score-grid library-score-grid">
                  <div v-for="(label, key) in scoreLabels" :key="key" class="score-pill">
                    <span>{{ label }}</span>
                    <strong>{{ item.payload.scores?.[key] ?? 0 }}</strong>
                  </div>
                </div>
                <p v-if="item.payload.comment" class="library-note">{{ item.payload.comment }}</p>
                <p v-if="item.payload.recommendedReason" class="brainhole-reason">{{ item.payload.recommendedReason }}</p>
              </template>

              <template v-else-if="item.type === 'plot' && item.payload?.kind === 'plot-point'">
                <div class="library-meta-row">
                  <span>第{{ item.payload.chapterNum }}章</span>
                  <span>剧情点 {{ item.payload.plotIndex }}</span>
                  <span>已选 {{ item.payload.chosenOption + 1 }}</span>
                </div>
                <div class="library-content">{{ item.payload.desc }}</div>
                <div v-if="item.payload.options?.length" class="library-choice-stack">
                  <div
                    v-for="(option, index) in item.payload.options"
                    :key="`plot-fav-${item.id}-${index}`"
                    class="library-choice-detail"
                    :class="{ selected: index === item.payload.chosenOption }"
                  >
                    <span class="library-choice-label">选项 {{ index + 1 }}</span>
                    <p>{{ normalizePlotChoice(option, index).option }}</p>
                    <small>结果：{{ normalizePlotChoice(option, index).result }}</small>
                  </div>
                </div>
              </template>

              <template v-else-if="item.type === 'option' && item.payload?.kind === 'choice'">
                <div class="library-meta-row">
                  <span>
                    {{
                      item.payload.choiceKind === 'hook'
                        ? '章节钩子'
                        : item.payload.choiceKind === 'bighook'
                          ? '大钩子'
                          : '剧情选项'
                    }}
                  </span>
                  <span>{{ item.payload.label || `选项 ${item.payload.index + 1}` }}</span>
                </div>
                <template v-if="item.payload.choiceKind === 'option'">
                  <div class="library-choice-detail selected">
                    <span class="library-choice-label">选项</span>
                    <p>{{ item.payload.choice?.option }}</p>
                    <small>结果：{{ item.payload.choice?.result }}</small>
                  </div>
                </template>
                <div v-else class="library-choice-detail selected">
                  <span class="library-choice-label">{{ item.payload.choiceKind === 'hook' ? '钩子' : '大钩子' }}</span>
                  <p>{{ hookChoiceParts(item).hook }}</p>
                  <small>剧情走向：{{ hookChoiceParts(item).direction }}</small>
                </div>
              </template>

              <template v-else>
                <div class="library-content">{{ item.content }}</div>
                <p v-if="item.note" class="library-note">{{ item.note }}</p>
              </template>
            </article>
          </div>
          <div v-else class="outline-empty">这个分类还没有收藏</div>
        </section>
      </div>
    </section>
  </div>
</template>
