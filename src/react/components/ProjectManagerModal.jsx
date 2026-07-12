function formatUpdatedAt(value) {
  return new Date(value).toLocaleString();
}

export default function ProjectManagerModal({
  visible = false,
  projects = [],
  activeProjectId = '',
  newProjectName = '',
  editingProjectId = null,
  editingProjectName = '',
  onClose,
  onUpdateNewProjectName,
  onUpdateEditingProjectName,
  onCreateProject,
  onSaveProjectName,
  onCancelEditProjectName,
  onStartEditProjectName,
  onSelectProject,
  onDeleteProject,
}) {
  if (!visible) return null;

  return (
    <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className="settings-modal project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
        <header className="settings-modal-header">
          <div>
            <h2 id="project-modal-title">项目管理</h2>
            <p />
          </div>
          <button className="btn btn-secondary btn-sm" type="button" onClick={onClose}>关闭</button>
        </header>

        <div className="settings-modal-body">
          <div className="project-create-row">
            <input value={newProjectName} type="text" placeholder="项目名，例如：废后归来短篇" onChange={(event) => onUpdateNewProjectName?.(event.target.value)} />
            <button className="btn btn-primary btn-sm" type="button" onClick={onCreateProject}>创建项目</button>
          </div>

          {projects.length ? (
            <div className="project-list">
              {projects.map((project) => (
                <article key={project.id} className={`project-item${activeProjectId === project.id ? ' active' : ''}`}>
                  <div>
                    {editingProjectId === project.id ? (
                      <div className="project-item-edit">
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
                        <div className="project-item-edit-actions">
                          <button className="btn btn-primary btn-xs" type="button" onClick={onSaveProjectName}>保存</button>
                          <button className="btn btn-secondary btn-xs" type="button" onClick={onCancelEditProjectName}>取消</button>
                        </div>
                      </div>
                    ) : (
                      <div className="project-item-title">
                        <h3>{project.name}</h3>
                      </div>
                    )}
                    <p>更新于 {formatUpdatedAt(project.updatedAt)}</p>
                  </div>
                  <div className="btn-row">
                    {editingProjectId !== project.id ? (
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => onStartEditProjectName?.(project)}>
                        重命名
                      </button>
                    ) : null}
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => onSelectProject?.(project.id)}>
                      {activeProjectId === project.id ? '当前项目' : '切换'}
                    </button>
                    <button className="btn btn-danger btn-sm" type="button" onClick={() => onDeleteProject?.(project.id)}>删除</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="outline-empty">还没有项目，先创建一个再开文。</div>
          )}
        </div>
      </section>
    </div>
  );
}
