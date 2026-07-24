export function isDropFile(e) {
  const dataTransfer = e && e.dataTransfer;
  if (!dataTransfer) {
    return false;
  }

  if (dataTransfer.items) {
    for (let i = 0; i < dataTransfer.items.length; ++i) {
      if (dataTransfer.items[i].kind === 'file') {
        return true;
      }
    }
  }

  return !!(dataTransfer.files && dataTransfer.files.length > 0);
}

export function getDropFile(e) {
  const dataTransfer = e && e.dataTransfer;
  if (!dataTransfer) {
    return undefined;
  }

  if (dataTransfer.items) {
    for (let i = 0; i < dataTransfer.items.length; ++i) {
      if (dataTransfer.items[i].kind === 'file') {
        const file = dataTransfer.items[i].getAsFile();
        // Some browsers report kind === 'file' but return null from getAsFile().
        if (file) {
          return file;
        }
      }
    }
  }

  return dataTransfer.files && dataTransfer.files[0];
}
