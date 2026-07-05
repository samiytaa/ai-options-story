function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'utf-8');
  });
}

export function useWindVaneFile(deps) {
  const {
    windVaneFile,
    uploadInputRef,
    requireActiveProject,
    pushToast,
    isLoading,
  } = deps;

  function clearWindVaneFile() {
    windVaneFile.value = null;
    if (uploadInputRef.value) uploadInputRef.value.value = '';
    pushToast('已清除风向标文件', 'info');
  }

  async function importWindVaneFile(file) {
    if (!file) return;
    if (!requireActiveProject()) return;

    try {
      const rawContent = await readFileAsText(file);
      const content = rawContent.trim();
      if (!content) {
        pushToast('文件内容为空，请重新选择', 'error');
        return;
      }

      windVaneFile.value = {
        name: file.name,
        content,
        uploadedAt: new Date().toISOString(),
      };
      pushToast(`已读取风向标文件：${file.name}`, 'success');
    } catch (error) {
      pushToast(`读取风向标失败：${error.message}`, 'error');
    } finally {
      if (uploadInputRef.value) uploadInputRef.value.value = '';
    }
  }

  async function handleWindVaneFileChange(event) {
    const [file] = event.target.files || [];
    await importWindVaneFile(file);
  }

  function handleWindVaneDragOver(event) {
    if (isLoading?.value) return;
    event.currentTarget.classList.add('upload-area-dragover');
  }

  function handleWindVaneDragLeave(event) {
    event.currentTarget.classList.remove('upload-area-dragover');
  }

  async function handleFileDrop(event) {
    if (isLoading?.value) return;
    event.currentTarget.classList.remove('upload-area-dragover');
    const [file] = event.dataTransfer?.files || [];
    await importWindVaneFile(file);
  }

  return {
    clearWindVaneFile,
    importWindVaneFile,
    handleWindVaneFileChange,
    handleWindVaneDragOver,
    handleWindVaneDragLeave,
    handleFileDrop,
  };
}
