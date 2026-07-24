import IdbKvStore from 'idb-kv-store';

const STORAGE_UNAVAILABLE = 'Browser storage is unavailable (read-only fallback).';

function storageUnavailableError() {
  return new Error(STORAGE_UNAVAILABLE);
}

async function downloadFile(store, name) {
  const file = await store.get(name.toLowerCase());
  if (!file) {
    throw new Error(`File ${name} does not exist`);
  }
  const blob = new Blob([file], { type: 'binary/octet-stream' });
  const url = URL.createObjectURL(blob);
  const lnk = document.createElement('a');
  lnk.setAttribute('href', url);
  lnk.setAttribute('download', name);
  document.body.appendChild(lnk);
  lnk.click();
  document.body.removeChild(lnk);
  URL.revokeObjectURL(url);
}

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.onabort = () => reject();
    reader.readAsArrayBuffer(file);
  });

async function uploadFile(store, files, file) {
  if (!file || typeof file.name !== 'string' || !file.name) {
    throw new TypeError('upload(file) expects a File with a valid name');
  }

  const data = new Uint8Array(await readFile(file));
  const key = file.name.toLowerCase();
  files.set(key, data);
  return store.set(key, data);
}

/**
 * Creates the storage service backed by IndexedDB.
 *
 * On success the returned object has `initError: null` and all operations are
 * live. On failure the returned object has `initError` set to the caught Error
 * and mutating operations reject — callers should surface `initError` and those
 * rejections so users are not told a save succeeded when nothing persisted.
 *
 * Added in Phase 3: `list()` returns the names of all stored files as a
 * sorted array, providing an explicit enumeration API that works consistently
 * across both the live and fallback implementations.
 */
export default async function create_fs() {
  try {
    const store = new IdbKvStore('diablo_fs');
    const storeJson = await store.json();
    const files = new Map(Object.entries(storeJson));
    return {
      initError: null,
      files,
      list: () => Array.from(files.keys()).sort(),
      update: (name, data) => {
        const key = String(name).toLowerCase();
        files.set(key, data);
        return store.set(key, data);
      },
      delete: (name) => {
        const key = String(name).toLowerCase();
        files.delete(key);
        return store.remove(key);
      },
      clear: () => {
        files.clear();
        return store.clear();
      },
      download: (name) => downloadFile(store, name),
      upload: (file) => uploadFile(store, files, file),
      fileUrl: async (name) => {
        const file = await store.get(name.toLowerCase());
        if (file) {
          const blob = new Blob([file], { type: 'binary/octet-stream' });
          return URL.createObjectURL(blob);
        }
      },
    };
  } catch (e) {
    return {
      initError: e,
      files: new Map(),
      list: () => [],
      update: () => Promise.reject(storageUnavailableError()),
      delete: () => Promise.reject(storageUnavailableError()),
      clear: () => Promise.reject(storageUnavailableError()),
      download: () => Promise.reject(storageUnavailableError()),
      upload: () => Promise.reject(storageUnavailableError()),
      fileUrl: () => Promise.resolve(undefined),
    };
  }
}
