<script setup>
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  projects: {
    type: Array,
    default: () => [],
  },
  activeProjectId: {
    type: String,
    default: '',
  },
  newProjectName: {
    type: String,
    default: '',
  },
  editingProjectId: {
    type: [String, Number, null],
    default: null,
  },
  editingProjectName: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([
  'close',
  'update:newProjectName',
  'update:editingProjectName',
  'create-project',
  'save-project-name',
  'cancel-edit-project-name',
  'start-edit-project-name',
  'select-project',
  'delete-project',
]);

function close() {
  emit('close');
}

function updateName(event) {
  emit('update:newProjectName', event.target.value);
}

function updateEditingName(event) {
  emit('update:editingProjectName', event.target.value);
}
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click.self="close">
    <section class="settings-modal project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
      <header class="settings-modal-header">
        <div>
          <h2 id="project-modal-title">项目管理</h2>
          <p></p>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" @click="close">关闭</button>
      </header>

      <div class="settings-modal-body">
        <div class="project-create-row">
          <input :value="newProjectName" type="text" placeholder="项目名，例如：废后归来短篇" @input="updateName" />
          <button class="btn btn-primary btn-sm" type="button" @click="emit('create-project')">创建项目</button>
        </div>

        <div v-if="projects.length" class="project-list">
          <article
            v-for="project in projects"
            :key="project.id"
            class="project-item"
            :class="{ active: activeProjectId === project.id }"
          >
            <div>
              <div v-if="editingProjectId === project.id" class="project-item-edit">
                <input
                  :value="editingProjectName"
                  type="text"
                  class="project-name-input"
                  @input="updateEditingName"
                  @keyup.enter="emit('save-project-name')"
                  @keyup.escape="emit('cancel-edit-project-name')"
                />
                <div class="project-item-edit-actions">
                  <button class="btn btn-primary btn-xs" type="button" @click="emit('save-project-name')">保存</button>
                  <button class="btn btn-secondary btn-xs" type="button" @click="emit('cancel-edit-project-name')">
                    取消
                  </button>
                </div>
              </div>
              <div v-else class="project-item-title">
                <h3>{{ project.name }}</h3>
              </div>
              <p>更新于 {{ new Date(project.updatedAt).toLocaleString() }}</p>
            </div>
            <div class="btn-row">
              <button
                v-if="editingProjectId !== project.id"
                class="btn btn-secondary btn-sm"
                type="button"
                @click="emit('start-edit-project-name', project)"
              >
                重命名
              </button>
              <button class="btn btn-secondary btn-sm" type="button" @click="emit('select-project', project.id)">
                {{ activeProjectId === project.id ? '当前项目' : '切换' }}
              </button>
              <button class="btn btn-danger btn-sm" type="button" @click="emit('delete-project', project.id)">删除</button>
            </div>
          </article>
        </div>
        <div v-else class="outline-empty">还没有项目，先创建一个再开文。</div>
      </div>
    </section>
  </div>
</template>
