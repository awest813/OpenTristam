/**
 * Read a File/Blob into an ArrayBuffer. Used on the main thread and in workers.
 *
 * @param {Blob} file
 * @param {function(ProgressEvent|{loaded: number}): void} [onProgress]
 *   Receives FileReader progress events, then a final `{loaded: file.size}`.
 * @returns {Promise<ArrayBuffer>}
 */
export default function readFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (onProgress) {
        onProgress({ loaded: file.size });
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(reader.error || new Error('Reading the file failed.'));
    reader.onabort = () => reject(new Error('Reading the file was aborted.'));
    if (onProgress) {
      reader.addEventListener('progress', onProgress);
    }
    reader.readAsArrayBuffer(file);
  });
}
