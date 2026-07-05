<script setup>
import { computed } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: 'add',
  },
  type: {
    type: String,
    default: 'brainhole',
  },
  typeLabel: {
    type: String,
    default: '收藏',
  },
  description: {
    type: String,
    default: '',
  },
  draft: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['close', 'save']);

const modalTitle = computed(() => (props.mode === 'edit' ? `编辑${props.typeLabel}收藏` : `添加${props.typeLabel}收藏`));

function close() {
  emit('close');
}

function save() {
  emit('save');
}
</script>

<template>
  <div v-if="visible" class="modal-backdrop favorite-edit-backdrop" @click.self="close">
    <section class="settings-modal favorite-edit-modal" role="dialog" aria-modal="true" :aria-labelledby="`${mode}-favorite-title`">
      <header class="settings-modal-header">
        <div>
          <h2 :id="`${mode}-favorite-title`">{{ modalTitle }}</h2>
          <p>{{ description }}</p>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" @click="close">关闭</button>
      </header>

      <div class="settings-modal-body">
        <div class="library-edit-form">
          <label>
            收藏标题
            <input v-model="draft.title" type="text" :placeholder="mode === 'edit' ? '收藏标题' : '收藏标题，可选'" />
          </label>
          <label>
            项目名
            <input v-model="draft.projectName" type="text" placeholder="项目名，可选" />
          </label>

          <template v-if="type === 'brainhole'">
            <label>
              脑洞内容
              <textarea v-model="draft.idea" class="brainhole-edit-idea" placeholder="脑洞内容" />
            </label>
            <label>
              契合点
              <textarea v-model="draft.fit" placeholder="契合点" />
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
          </template>

          <template v-else-if="type === 'plot'">
            <div class="favorite-edit-grid">
              <label>
                章节
                <input v-model.number="draft.chapterNum" type="number" min="1" />
              </label>
              <label>
                剧情点序号
                <input v-model.number="draft.plotIndex" type="number" min="1" max="4" />
              </label>
              <label>
                已选索引（0-3）
                <input v-model.number="draft.chosenOption" type="number" min="0" max="3" />
              </label>
            </div>
            <label>
              剧情点内容
              <textarea v-model="draft.plotDesc" class="brainhole-edit-idea" placeholder="剧情点内容" />
            </label>
            <label>
              剧情点选项列表
              <textarea
                v-model="draft.plotOptionsText"
                class="favorite-options-textarea"
                placeholder="选项1：角色采取的行为&#10;结果1：行为导致的结果&#10;选项2：...&#10;结果2：..."
              />
            </label>
          </template>

          <template v-else-if="type === 'option'">
            <label>
              选项类型
              <select v-model="draft.choiceKind">
                <option value="option">剧情选项</option>
                <option value="hook">章节钩子</option>
                <option value="bighook">大钩子</option>
              </select>
            </label>
            <div class="favorite-edit-grid two">
              <label>
                原序号索引
                <input v-model.number="draft.optionIndex" type="number" min="0" />
              </label>
              <label>
                标签
                <input v-model="draft.optionLabel" type="text" placeholder="例如：选项 1 / 钩子 2" />
              </label>
            </div>
            <label>
              {{ draft.choiceKind === 'option' ? '选项内容' : draft.choiceKind === 'hook' ? '钩子内容' : '大钩子内容' }}
              <textarea v-model="draft.optionText" placeholder="选项内容或钩子内容" />
            </label>
            <label>
              {{ draft.choiceKind === 'option' ? '选项对应结果' : '剧情走向' }}
              <textarea
                v-model="draft.optionResult"
                :placeholder="draft.choiceKind === 'option' ? '选项对应结果' : '选择这个钩子后的剧情展开方向'"
              />
            </label>
          </template>

          <template v-else>
            <label>
              收藏内容
              <textarea v-model="draft.content" placeholder="收藏内容" />
            </label>
            <label>
              备注
              <input v-model="draft.note" type="text" placeholder="备注，可选" />
            </label>
          </template>
        </div>
      </div>

      <footer class="settings-modal-footer">
        <button class="btn btn-secondary btn-sm" type="button" @click="close">取消</button>
        <button class="btn btn-primary btn-sm" type="button" @click="save">保存</button>
      </footer>
    </section>
  </div>
</template>
