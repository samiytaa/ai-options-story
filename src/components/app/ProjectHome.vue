<script setup>
import { ref } from 'vue';

defineProps({
  projectCards: {
    type: Array,
    default: () => [],
  },
  activeProjectId: {
    type: String,
    default: '',
  },
  projectSortBy: {
    type: String,
    default: 'updatedAt',
  },
  editingProjectId: {
    type: [String, Number, null],
    default: null,
  },
  editingProjectName: {
    type: String,
    default: '',
  },
  emptyIconPaths: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  'import-data-json',
  'export-data-json',
  'create-project',
  'set-project-sort',
  'update:editingProjectName',
  'save-project-name',
  'cancel-edit-project-name',
  'start-edit-project-name',
  'select-project',
  'delete-project',
]);

const dataJsonInputRef = ref(null);

function triggerImportDataJson() {
  dataJsonInputRef.value?.click();
}

function updateEditingProjectName(event) {
  emit('update:editingProjectName', event.target.value);
}

function formatUpdatedAt(value) {
  return new Date(value).toLocaleString();
}
</script>

<template>
  <main class="work-list-home">
    <section class="work-list-section">
      <div class="work-list-heading">
        <div class="work-list-title-group">
          <h2 class="work-list-title">作品列表</h2>
          <span class="work-count">{{ projectCards.length }}</span>
        </div>
        <div class="work-list-controls">
          <input
            ref="dataJsonInputRef"
            class="visually-hidden-file-input"
            type="file"
            accept="application/json,.json"
            @change="emit('import-data-json', $event)"
          />
          <button class="btn btn-secondary btn-sm" type="button" @click="triggerImportDataJson">
            导入
          </button>
          <button class="btn btn-secondary btn-sm" type="button" @click="emit('export-data-json')">
            导出
          </button>
          <button class="btn btn-primary btn-sm" type="button" @click="emit('create-project')">
            <svg
              class="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            创建作品
          </button>
          <div class="sort-selector">
            <button
              class="sort-btn"
              :class="{ active: projectSortBy === 'updatedAt' }"
              type="button"
              @click="emit('set-project-sort', 'updatedAt')"
            >
              最后编辑
            </button>
            <button
              class="sort-btn"
              :class="{ active: projectSortBy === 'createdAt' }"
              type="button"
              @click="emit('set-project-sort', 'createdAt')"
            >
              创建时间
            </button>
          </div>
        </div>
      </div>

      <div v-if="projectCards.length" class="work-card-grid">
        <article
          v-for="project in projectCards"
          :key="project.id"
          class="work-card"
          :class="{ active: activeProjectId === project.id }"
        >
          <div class="work-card-main">
            <div v-if="editingProjectId === project.id" class="work-card-edit">
              <input
                :value="editingProjectName"
                type="text"
                class="project-name-input"
                @input="updateEditingProjectName"
                @keyup.enter="emit('save-project-name')"
                @keyup.escape="emit('cancel-edit-project-name')"
              />
              <div class="work-card-edit-actions">
                <button class="btn btn-primary btn-xs" type="button" @click="emit('save-project-name')">保存</button>
                <button class="btn btn-secondary btn-xs" type="button" @click="emit('cancel-edit-project-name')">
                  取消
                </button>
              </div>
            </div>
            <div v-else class="work-card-title">
              <h3>{{ project.name }}</h3>
              <button
                class="btn-icon-only"
                type="button"
                title="重命名"
                @click="emit('start-edit-project-name', project)"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </div>
            <p>更新于 {{ formatUpdatedAt(project.updatedAt) }}</p>
            <div class="work-card-meta">
              <span>{{ project.snapshot?.storyBlocks?.length || 0 }} 条内容</span>
              <span>{{ project.snapshot?.state?.chapters?.length || 0 }} 章</span>
              <span>{{ project.snapshot?.state?.finalWork ? '已成文' : '创作中' }}</span>
            </div>
          </div>
          <div class="work-card-actions">
            <button class="btn btn-primary btn-sm" type="button" @click="emit('select-project', project.id)">
              进入编辑
            </button>
            <button class="btn btn-danger btn-sm" type="button" @click="emit('delete-project', project.id)">
              删除
            </button>
          </div>
        </article>
      </div>

      <div v-else class="work-empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path v-for="path in emptyIconPaths" :key="path" :d="path" />
        </svg>
        <h3>还没有作品</h3>
        <p>创建第一个作品后，会自动进入现在的编辑页面。</p>
      </div>
    </section>
  </main>
</template>
