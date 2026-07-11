<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  content: {
    type: String,
    default: '',
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'update:content',
  'save',
  'copy',
  'download',
]);

const showAiCheck = ref(true);
const wordCountMessage = ref('');

const paragraphs = computed(() => splitStoryParagraphs(props.content));
const characterCount = computed(() => countStoryCharacters(props.content));
const paragraphCount = computed(() => paragraphs.value.length);
const aiFlavorChecklist = computed(() => getAiFlavorChecklist(props.content));
const goldenSentences = computed(() => extractGoldenSentences(props.content));

function updateContent(event) {
  emit('update:content', event.target.value);
}

function runAiCheck() {
  showAiCheck.value = true;
}

function countWords() {
  const text = String(props.content || '');
  const hanCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const punctCount = (text.match(/[\u3000-\u303f\uff00-\uffef]/g) || []).length;
  const total = hanCount + punctCount;
  const rangeText = total >= 800 && total <= 1200 ? '在 800-1200 字范围' : '不在 800-1200 字范围';
  wordCountMessage.value = `汉字 ${hanCount}，标点 ${punctCount}，合计 ${total}，${rangeText}`;
}

function splitStoryParagraphs(text) {
  return String(text || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function countStoryCharacters(text) {
  return String(text || '').replace(/\s/g, '').length;
}

function getAiFlavorChecklist(text) {
  const content = String(text || '').trim();
  const currentParagraphs = splitStoryParagraphs(content);
  const longParagraphCount = currentParagraphs.filter((paragraph) => countStoryCharacters(paragraph) > 220).length;
  const aiPhrases = ['他知道', '她知道', '这一刻', '命运', '仿佛', '无法言说', '心中一震', '空气凝固'];
  const aiPhraseCount = aiPhrases.filter((phrase) => content.includes(phrase)).length;
  const dialogueCount = (content.match(/[“"][^”"]+[”"]/g) || []).length;
  const sceneDetailCount = (content.match(/门|窗|灯|风|雨|手|眼|脚步|声音|气味|桌|椅|街|房间/g) || []).length;

  return [
    {
      label: '段落长度',
      passed: currentParagraphs.length > 0 && longParagraphCount === 0,
      detail: longParagraphCount ? `${longParagraphCount} 段超过 220 字，建议拆短` : '段落长度适合手机阅读',
    },
    {
      label: '套话密度',
      passed: aiPhraseCount <= 2,
      detail: aiPhraseCount > 2 ? `检测到 ${aiPhraseCount} 个常见泛化词` : '常见泛化词较少',
    },
    {
      label: '人物对话',
      passed: dialogueCount >= 3,
      detail: dialogueCount >= 3 ? `已有 ${dialogueCount} 处对话` : '对话偏少，可增加人物交锋',
    },
    {
      label: '现场细节',
      passed: sceneDetailCount >= 8,
      detail: sceneDetailCount >= 8 ? '有可感知的动作或环境细节' : '细节偏抽象，可补动作、物件、声音',
    },
  ];
}

function extractGoldenSentences(text) {
  return splitStoryParagraphs(text)
    .map((line) => line.trim())
    .filter((line) => {
      const length = countStoryCharacters(line);
      return length >= 10 && length <= 80 && /[\u4e00-\u9fa5A-Za-z0-9]/.test(line);
    })
    .slice(0, 5);
}
</script>

<template>
  <div class="final-work-editor">
    <header class="final-work-editor-header">
      <div>
        <span class="panel-kicker">正文工作台</span>
        <div class="section-title">最终正文编辑器</div>
      </div>
      <div class="final-work-metrics" aria-label="最终作品统计">
        <span>{{ characterCount }} 字</span>
        <span>{{ paragraphCount }} 段</span>
      </div>
    </header>

    <div class="final-work-rule-row" aria-label="正文编辑规则">
      <span>第一人称亲历</span>
      <span>单章 800-1200 字</span>
      <span>每 500 字有新信息</span>
      <span>章尾保留钩子</span>
    </div>

    <textarea
      :value="content"
      class="final-work-textarea"
      :disabled="isLoading"
      placeholder="在这里编辑最终正文。修改会同步到当前作品状态，点击保存正文后写入项目快照。"
      @input="updateContent"
    />

    <div class="btn-row final-work-editor-actions">
      <button class="btn btn-secondary btn-sm" type="button" :disabled="isLoading" @click="runAiCheck">
        去 AI 味自检
      </button>
      <button class="btn btn-secondary btn-sm" type="button" :disabled="isLoading" @click="countWords">
        统计字数
      </button>
      <button class="btn btn-primary btn-sm" type="button" :disabled="isLoading" @click="emit('save')">
        保存正文
      </button>
      <button class="btn btn-secondary btn-sm" type="button" :disabled="isLoading || !content" @click="emit('copy')">
        复制全文
      </button>
      <button class="btn btn-secondary btn-sm" type="button" :disabled="isLoading || !content" @click="emit('download')">
        下载 TXT
      </button>
    </div>

    <p v-if="wordCountMessage" class="final-work-word-count-message">
      {{ wordCountMessage }}
    </p>

    <section v-if="showAiCheck" class="final-work-checklist" aria-label="去 AI 味检查清单">
      <div
        v-for="item in aiFlavorChecklist"
        :key="item.label"
        class="final-work-check-item"
        :class="{ passed: item.passed }"
      >
        <span class="final-work-check-mark">{{ item.passed ? '✓' : '!' }}</span>
        <div>
          <strong>{{ item.label }}</strong>
          <p>{{ item.detail }}</p>
        </div>
      </div>
    </section>

    <section class="final-work-golden-sentences" aria-label="本章金句提取">
      <div class="final-work-subtitle">金句提取</div>
      <p v-if="!goldenSentences.length" class="helper-text">正文内容足够后会自动提取 5 条短句。</p>
      <ol v-else>
        <li v-for="line in goldenSentences" :key="line">
          {{ line }}
        </li>
      </ol>
    </section>
  </div>
</template>
