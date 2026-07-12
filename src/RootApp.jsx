import AppWorkbench from './react/AppWorkbench.jsx';
import LegacyVueBridge from './legacy/LegacyVueBridge.jsx';

export default function RootApp() {
  const searchParams = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search);
  const reactShellPreview = searchParams?.get('react_shell') === '1';

  if (reactShellPreview) {
    return (
      <div className="react-host-shell">
        <AppWorkbench
          mode="project-home"
          projectHomeProps={{
            projectCards: [],
            activeProjectId: '',
            projectSortBy: 'updatedAt',
            editingProjectId: null,
            editingProjectName: '',
            emptyIconPaths: [],
          }}
        />
      </div>
    );
  }

  return (
    <div className="react-host-shell">
      <div className="react-host-frame">
        <LegacyVueBridge />
      </div>
    </div>
  );
}
