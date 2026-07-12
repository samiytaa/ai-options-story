import { useRef } from 'react';

function formatUpdatedAt(value) {
  return new Date(value).toLocaleString();
}

function PlusIcon() {
  return (
    <svg
      className="btn-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export default function ProjectHome({
  projectCards = [],
  activeProjectId = '',
  projectSortBy = 'updatedAt',
  editingProjectId = null,
  editingProjectName = '',
  emptyIconPaths = [],
  onImportDataJson,
  onExportDataJson,
  onCreateProject,
  onSetProjectSort,
  onUpdateEditingProjectName,
  onSaveProjectName,
  onCancelEditProjectName,
  onStartEditProjectName,
  onSelectProject,
  onDeleteProject,
}) {
  const dataJsonInputRef = useRef(null);

  return (
    <main className="work-list-home">
      <section className="work-list-section">
        <div className="work-list-heading">
          <div className="work-list-title-group">
            <h2 className="work-list-title">作品列表</h2>
            <span className="work-count">{projectCards.length}</span>
          </div>
          <div className="work-list-controls">
            <input
              ref={dataJsonInputRef}
              className="visually-hidden-file-input"
              type="file"
              accept="application/json,.json"
              onChange={onImportDataJson}
            />
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => dataJsonInputRef.current?.click()}>
              导入
            </button>
            <button className="btn btn-secondary btn-sm" type="button" onClick={onExportDataJson}>
              导出
            </button>
            <button className="btn btn-primary btn-sm" type="button" onClick={onCreateProject}>
              <PlusIcon />
              创建作品
            </button>
            <div className="sort-selector">
              <button
                className={`sort-btn${projectSortBy === 'updatedAt' ? ' active' : ''}`}
                type="button"
                onClick={() => onSetProjectSort?.('updatedAt')}
              >
                最后编辑
              </button>
              <button
                className={`sort-btn${projectSortBy === 'createdAt' ? ' active' : ''}`}
                type="button"
                onClick={() => onSetProjectSort?.('createdAt')}
              >
                创建时间
              </button>
            </div>
          </div>
        </div>

        {projectCards.length ? (
          <div className="work-card-grid">
            {projectCards.map((project) => (
              <article
                key={project.id}
                className={`work-card${activeProjectId === project.id ? ' active' : ''}`}
              >
                <div className="work-card-main">
                  {editingProjectId === project.id ? (
                    <div className="work-card-edit">
                      <input
                        value={editingProjectName}
                        type="text"
                        className="project-name-input"
                        onChange={(event) => onUpdateEditingProjectName?.(event.target.value)}
                        onKeyUp={(event) => {
                          if (event.key === 'Enter') onSaveProjectName?.();
                          if (event.key === 'Escape') onCancelEditProjectName?.();
                        }}
                      />
                      <div className="work-card-edit-actions">
                        <button className="btn btn-primary btn-xs" type="button" onClick={onSaveProjectName}>保存</button>
                        <button className="btn btn-secondary btn-xs" type="button" onClick={onCancelEditProjectName}>取消</button>
                      </div>
                    </div>
                  ) : (
                    <div className="work-card-title">
                      <h3>{project.name}</h3>
                      <button
                        className="btn-icon-only"
                        type="button"
                        title="重命名"
                        onClick={() => onStartEditProjectName?.(project)}
                      >
                        <EditIcon />
                      </button>
                    </div>
                  )}
                  <p>更新于 {formatUpdatedAt(project.updatedAt)}</p>
                  <div className="work-card-meta">
                    <span>{project.snapshot?.storyBlocks?.length || 0} 条内容</span>
                    <span>{project.snapshot?.state?.chapters?.length || 0} 章</span>
                    <span>{project.snapshot?.state?.finalWork ? '已成文' : '创作中'}</span>
                  </div>
                </div>
                <div className="work-card-actions">
                  <button className="btn btn-primary btn-sm" type="button" onClick={() => onSelectProject?.(project.id)}>
                    进入编辑
                  </button>
                  <button className="btn btn-danger btn-sm" type="button" onClick={() => onDeleteProject?.(project.id)}>
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="work-empty-state">
            <svg className="empty-icon" viewBox="0 0 24 24" aria-hidden="true">
              {emptyIconPaths.map((path) => <path key={path} d={path} />)}
            </svg>
            <h3>还没有作品</h3>
            <p>创建第一个作品后，会自动进入现在的编辑页面。</p>
          </div>
        )}
      </section>
    </main>
  );
}
