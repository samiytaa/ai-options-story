<script setup>
import { computed } from 'vue';
import { ACTOR_ROLE_OPTIONS, ARCHITECTURE_FIELD_GROUPS } from './architectureConfig.js';
import { validateArchitectureFields, validatePersonaFields } from './architectureState.js';
import './style.css';

const props = defineProps({
  architecturePlan: {
    type: Object,
    default: () => ({}),
  },
  mode: {
    type: String,
    default: 'architecture',
  },
  brainhole: {
    type: String,
    default: '',
  },
  guide: {
    type: String,
    default: '',
  },
  referenceGroups: {
    type: Object,
    default: () => ({ guide: [], outline: [] }),
  },
  resultReferenceGroups: {
    type: Object,
    default: () => ({ guide: [], architecture: [] }),
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'generate',
  'confirm',
  'update-field',
  'add-actor',
  'remove-actor',
  'update-actor-field',
]);

const isArchitectureMode = computed(() => props.mode !== 'persona');
const validation = computed(() => (
  isArchitectureMode.value
    ? validateArchitectureFields(props.architecturePlan)
    : validatePersonaFields(props.architecturePlan)
));
const actorCountText = computed(() => `当前 ${props.architecturePlan?.actors?.length || 0} / 5`);
const guideReferenceItems = computed(() => Array.isArray(props.referenceGroups?.guide) ? props.referenceGroups.guide : []);
const outlineReferenceItems = computed(() => Array.isArray(props.referenceGroups?.outline) ? props.referenceGroups.outline : []);
const guideResultReferenceItems = computed(() => Array.isArray(props.resultReferenceGroups?.guide) ? props.resultReferenceGroups.guide : []);
const architectureResultReferenceItems = computed(() => Array.isArray(props.resultReferenceGroups?.architecture) ? props.resultReferenceGroups.architecture : []);

function updateField(field, event) {
  emit('update-field', field, event.target.value);
}

function updateActorField(index, field, event) {
  emit('update-actor-field', index, field, event.target.value);
}
</script>

<template>
  <section class="architecture-stage">
    <div class="architecture-stage-panel architecture-stage-intro">
      <div class="architecture-stage-intro-copy">
        <div class="section-title">{{ isArchitectureMode ? '生成架构' : '生成人设' }}</div>
        <p v-if="isArchitectureMode">这一阶段把已选脑洞和导语整理成后续章节的执行蓝图：只保留冲突、10章事件链、前四章执行路线，以及第4章末付费点和后段反转铺垫。</p>
        <p v-else>这一阶段基于已完成的故事架构，为后续剧情生成补齐核心演员。完成后，再生成第一个剧情点。</p>
      </div>
      <div class="architecture-stage-actions">
        <button class="btn btn-primary" type="button" :disabled="isLoading || !brainhole || !guide" @click="emit('generate')">
          {{ isArchitectureMode ? 'AI 生成架构' : 'AI 生成人设' }}
        </button>
        <button class="btn btn-secondary" type="button" :disabled="isLoading || !validation.isValid" @click="emit('confirm')">
          {{ isArchitectureMode ? '确认并进入人设' : '确认并生成第一个剧情点' }}
        </button>
      </div>
    </div>

    <div v-if="guideResultReferenceItems.length || architectureResultReferenceItems.length" class="architecture-reference-grid">
      <div v-if="guideResultReferenceItems.length" class="architecture-stage-panel architecture-reference-panel architecture-reference-panel-result">
        <div class="section-title section-title-tight">当前导语结果引用来源</div>
        <div class="architecture-reference-list">
          <article v-for="item in guideResultReferenceItems" :key="`guide-result-${item.id}`" class="architecture-reference-item">
            <div class="architecture-reference-title">{{ item.label || item.assetName || item.assetType || 'DNA资产' }}</div>
            <p v-if="item.summary">{{ item.summary }}</p>
          </article>
        </div>
      </div>
      <div v-if="architectureResultReferenceItems.length" class="architecture-stage-panel architecture-reference-panel architecture-reference-panel-result">
        <div class="section-title section-title-tight">{{ isArchitectureMode ? '当前架构结果引用来源' : '当前人设结果引用来源' }}</div>
        <div class="architecture-reference-list">
          <article v-for="item in architectureResultReferenceItems" :key="`architecture-result-${item.id}`" class="architecture-reference-item">
            <div class="architecture-reference-title">{{ item.label || item.assetName || item.assetType || 'DNA资产' }}</div>
            <p v-if="item.summary">{{ item.summary }}</p>
          </article>
        </div>
      </div>
    </div>

    <div v-if="guideReferenceItems.length || outlineReferenceItems.length" class="architecture-reference-grid">
      <div v-if="guideReferenceItems.length" class="architecture-stage-panel architecture-reference-panel">
        <div class="section-title section-title-tight">导语区已引用 DNA</div>
        <div class="architecture-reference-list">
          <article v-for="item in guideReferenceItems" :key="item.id" class="architecture-reference-item">
            <div class="architecture-reference-title">{{ item.label || item.assetName || item.assetType || 'DNA资产' }}</div>
            <p v-if="item.summary">{{ item.summary }}</p>
          </article>
        </div>
      </div>
      <div v-if="outlineReferenceItems.length" class="architecture-stage-panel architecture-reference-panel">
        <div class="section-title section-title-tight">大纲区已引用 DNA</div>
        <div class="architecture-reference-list">
          <article v-for="item in outlineReferenceItems" :key="item.id" class="architecture-reference-item">
            <div class="architecture-reference-title">{{ item.label || item.assetName || item.assetType || 'DNA资产' }}</div>
            <p v-if="item.summary">{{ item.summary }}</p>
          </article>
        </div>
      </div>
    </div>

    <div class="architecture-context-grid">
      <div class="architecture-context-card">
        <div class="section-title section-title-tight">已选脑洞</div>
        <p>{{ brainhole || '请先完成脑洞选择。' }}</p>
      </div>
      <div class="architecture-context-card">
        <div class="section-title section-title-tight">当前导语</div>
        <p>{{ guide || '请先生成导语。' }}</p>
      </div>
    </div>

    <div
      v-if="isArchitectureMode"
      v-for="group in ARCHITECTURE_FIELD_GROUPS"
      :key="group.id"
      class="architecture-stage-panel architecture-form-section"
    >
      <div class="section-title">{{ group.title }}</div>
      <div class="architecture-form-grid">
        <div
          v-for="[fieldKey, label, hint] in group.fields"
          :key="fieldKey"
          class="architecture-field"
          :class="{ 'architecture-field-wide': !['storySummary', 'coreConflict'].includes(fieldKey) }"
        >
          <label :for="`architecture-${fieldKey}`">{{ label }}</label>
          <textarea
            :id="`architecture-${fieldKey}`"
            :rows="['storySummary', 'coreConflict'].includes(fieldKey) ? 4 : 6"
            :value="architecturePlan?.[fieldKey] || ''"
            :disabled="isLoading"
            @input="updateField(fieldKey, $event)"
          />
          <p class="architecture-field-hint">{{ hint }}</p>
        </div>
      </div>
    </div>

    <div v-else class="architecture-stage-panel architecture-form-section">
      <div class="architecture-actor-toolbar">
        <div>
          <div class="section-title">核心演员分配表</div>
          <p class="architecture-actor-hint">只保留真正推动主线的 3 到 5 个角色。</p>
        </div>
        <div class="architecture-stage-actions">
          <span class="architecture-actor-hint">{{ actorCountText }}</span>
          <button
            class="btn btn-secondary btn-sm"
            type="button"
            :disabled="isLoading || (architecturePlan?.actors?.length || 0) >= 5"
            @click="emit('add-actor')"
          >
            添加演员
          </button>
        </div>
      </div>

      <div v-if="architecturePlan?.actors?.length" class="architecture-actor-grid">
        <div v-for="(actor, index) in architecturePlan.actors" :key="index" class="architecture-actor-card">
          <div class="architecture-actor-header">
            <span class="architecture-actor-title">核心演员 {{ index + 1 }}</span>
            <button
              class="btn btn-secondary btn-sm"
              type="button"
              :disabled="isLoading || (architecturePlan?.actors?.length || 0) <= 3"
              @click="emit('remove-actor', index)"
            >
              删除
            </button>
          </div>
          <div class="architecture-actor-fields">
            <div class="architecture-field">
              <label :for="`actor-name-${index}`">角色名</label>
              <input :id="`actor-name-${index}`" :value="actor.name" :disabled="isLoading" @input="updateActorField(index, 'name', $event)" />
            </div>
            <div class="architecture-field">
              <label :for="`actor-role-${index}`">角色功能</label>
              <select :id="`actor-role-${index}`" :value="actor.role" :disabled="isLoading" @change="updateActorField(index, 'role', $event)">
                <option value="">请选择功能</option>
                <option v-for="role in ACTOR_ROLE_OPTIONS" :key="role" :value="role">
                  {{ role }}
                </option>
              </select>
            </div>
            <div class="architecture-field architecture-field-actor-summary architecture-field-wide">
              <label :for="`actor-persona-${index}`">人设定位</label>
              <textarea :id="`actor-persona-${index}`" rows="2" :value="actor.persona" :disabled="isLoading" @input="updateActorField(index, 'persona', $event)" />
            </div>
            <div class="architecture-field architecture-field-actor-compact">
              <label :for="`actor-goal-${index}`">目标</label>
              <textarea :id="`actor-goal-${index}`" rows="2" :value="actor.goal" :disabled="isLoading" @input="updateActorField(index, 'goal', $event)" />
            </div>
            <div class="architecture-field architecture-field-actor-compact">
              <label :for="`actor-pressure-${index}`">压力行为</label>
              <textarea :id="`actor-pressure-${index}`" rows="2" :value="actor.pressureBehavior" :disabled="isLoading" @input="updateActorField(index, 'pressureBehavior', $event)" />
            </div>
            <div class="architecture-field architecture-field-actor-compact">
              <label :for="`actor-voice-${index}`">说话味道</label>
              <textarea :id="`actor-voice-${index}`" rows="2" :value="actor.voice" :disabled="isLoading" @input="updateActorField(index, 'voice', $event)" />
            </div>
            <div class="architecture-field architecture-field-actor-compact">
              <label :for="`actor-emotion-${index}`">制造情绪</label>
              <textarea :id="`actor-emotion-${index}`" rows="2" :value="actor.emotionFunction" :disabled="isLoading" @input="updateActorField(index, 'emotionFunction', $event)" />
            </div>
            <div class="architecture-field architecture-field-actor-summary architecture-field-wide">
              <label :for="`actor-plot-function-${index}`">剧情任务</label>
              <textarea :id="`actor-plot-function-${index}`" rows="2" :value="actor.plotFunction" :disabled="isLoading" @input="updateActorField(index, 'plotFunction', $event)" />
            </div>
          </div>
        </div>
      </div>
      <p v-else class="architecture-empty">当前还没有核心演员。可以先点“AI 生成架构”，或手动添加 3 到 5 个。</p>
    </div>

  </section>
</template>
