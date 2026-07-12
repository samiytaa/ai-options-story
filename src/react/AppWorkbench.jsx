import EditorLeftPanel from './components/EditorLeftPanel.jsx';
import EditorRightPanel from './components/EditorRightPanel.jsx';
import ProjectHome from './components/ProjectHome.jsx';
import StoryStageWorkspace from './components/StoryStageWorkspace.jsx';

export default function AppWorkbench({
  mode = 'project-home',
  projectHomeProps = {},
  leftPanelProps = {},
  workspaceProps = {},
  rightPanelProps = {},
}) {
  if (mode === 'project-home') {
    return <ProjectHome {...projectHomeProps} />;
  }

  return (
    <div className="main-container">
      <EditorLeftPanel {...leftPanelProps} />
      <main className="panel panel-center">
        <StoryStageWorkspace {...workspaceProps} />
      </main>
      <EditorRightPanel {...rightPanelProps} />
    </div>
  );
}
