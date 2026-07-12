import { useEffect, useRef } from 'react';
import MaterialTagsView from './MaterialTagsView.jsx';
import MaterialExampleLibraryView from './MaterialExampleLibraryView.jsx';

export default function MaterialContentView({ data }) {
  const viewRef = useRef(null);
  const html = data?.html || '';
  const containedScroll = Boolean(data?.containedScroll);

  useEffect(() => {
    if (typeof data?.onRendered === 'function') {
      data.onRendered(viewRef.current);
    }
  }, [data?.renderVersion]);

  const className = `view-area${containedScroll ? ' contained-scroll' : ''}`;

  if (data?.component === 'tags') {
    return (
      <div ref={viewRef} className={className} id="view-area">
        <MaterialTagsView
          categories={data.categories}
          activeFilter={data.activeFilter}
          matches={data.matches}
          onSelectTag={data.onSelectTag}
          onClearFilter={data.onClearFilter}
          onOpenAsset={data.onOpenAsset}
        />
      </div>
    );
  }

  if (data?.component === 'exampleLibrary') {
    return (
      <div ref={viewRef} className={className} id="view-area">
        <MaterialExampleLibraryView
          example={data.example}
          links={data.links}
          onCreate={data.onCreate}
          onUpload={data.onUpload}
          onUseExample={data.onUseExample}
          onEditExample={data.onEditExample}
          onDeleteExample={data.onDeleteExample}
          onOpenAsset={data.onOpenAsset}
        />
      </div>
    );
  }

  return (
    <div
      ref={viewRef}
      className={className}
      id="view-area"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
