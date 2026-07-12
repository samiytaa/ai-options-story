import MaterialSidebarTree from './MaterialSidebarTree.jsx';
import MaterialContentView from './MaterialContentView.jsx';

export default function MaterialExtractorShell({
  onClose,
  onSwitchView,
  onSwitchInputTab,
  onOpenTrackManager,
  onOpenPrompt,
  sidebarTreeData,
  onCreateExample,
  onUploadExamples,
  onSearchExamples,
  onOpenExample,
  onClearTrackProducts,
  onSelectTrackProduct,
  onClearAssetLibrary,
  onSelectAssetType,
  onToggleSidebarFolder,
  contentViewData,
}) {
  return (
    <div className="material-extractor-page">
      <div id="topbar">
        <button type="button" className="topbar-back" title="返回主工作台" aria-label="返回主工作台" onClick={onClose}>←</button>
        <div className="logo">🧬 <span>故事DNA</span>数据库</div>
        <div className="topbar-actions">
          <button type="button" id="btn-examples" className="active" onClick={() => onSwitchView?.('examples')}>例文库</button>
          <button type="button" id="btn-input-track" className="topbar-tab" onClick={() => onSwitchInputTab?.('track')}>赛道分析</button>
          <button type="button" id="btn-input-dna" className="topbar-tab" onClick={() => onSwitchInputTab?.('dna')}>DNA数据抽取</button>
          <button type="button" id="btn-tags" onClick={() => onSwitchView?.('tags')}>🏷️ 标签索引</button>
          <button type="button" onClick={onOpenTrackManager}>管理赛道</button>
          <button type="button" onClick={onOpenPrompt}>提示词</button>
        </div>
      </div>

      <div id="main">
        <div id="sidebar">
          <div className="sidebar-header">📂 数据库表结构</div>
          <MaterialSidebarTree
            data={sidebarTreeData}
            onCreateExample={onCreateExample}
            onUploadExamples={onUploadExamples}
            onSearchExamples={onSearchExamples}
            onOpenExample={onOpenExample}
            onClearTrackProducts={onClearTrackProducts}
            onSelectTrackProduct={onSelectTrackProduct}
            onClearAssetLibrary={onClearAssetLibrary}
            onSelectAssetType={onSelectAssetType}
            onToggleFolder={onToggleSidebarFolder}
          />
        </div>

        <div id="content">
          <MaterialContentView data={contentViewData} />
        </div>
      </div>

      <div id="toast" />
      <input
        type="file"
        id="material-example-file-upload"
        className="file-input-hidden"
        accept=".txt,text/plain"
        multiple
      />
    </div>
  );
}
