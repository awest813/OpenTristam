import IdbKvStore from 'idb-kv-store';

export const STORAGE_UNAVAILABLE_MESSAGE = 'Save storage is unavailable in this browser.';

const PROBE_KEY = '__opentristam_probe__';
const DOWNLOAD_REVOKE_MS = 1500;

function toUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

function rejectUnavailable() {
  return Promise.reject(new Error(STORAGE_UNAVAILABLE_MESSAGE));
}

/**
 * Trigger a browser download for a stored file.
 * Revokes the blob URL after a short delay so Safari/iOS can finish the download.
 *
 * @param {object} store IndexedDB key-value store.
 * @param {string} name File name.
 */
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
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch (_e) {
      // ignore
    }
  }, DOWNLOAD_REVOKE_MS);
}

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.onabort = () => reject(new Error('File read was aborted'));
    reader.readAsArrayBuffer(file);
  });

/**
 * @param {object} store
 * @param {Map} files
 * @param {File} file
 */
async function uploadFile(store, files, file) {
  if (!file || typeof file.name !== 'string' || !file.name) {
    throw new TypeError('upload(file) expects a File with a valid name');
  }
  if (!/\.sv$/i.test(file.name)) {
    throw new Error('Only .sv save files can be imported');
  }

  const data = new Uint8Array(await readFile(file));
  const key = file.name.toLowerCase();
  // Persist first so a failed write cannot leave a ghost entry in the map.
  await store.set(key, data);
  files.set(key, data);
}

function createFallbackFs(initError) {
  return {
    initError,
    files: new Map(),
    list: () => [],
    update: () => rejectUnavailable(),
    delete: () => rejectUnavailable(),
    clear: () => rejectUnavailable(),
    download: () => rejectUnavailable(),
    upload: () => rejectUnavailable(),
    fileUrl: () => Promise.resolve(undefined),
    subscribe: () => () => {},
  };
}

/**
 * Creates the storage service backed by IndexedDB.
 *
 * On success the returned object has `initError: null` and all operations are
 * live. On failure the returned object has `initError` set to the caught Error
 * and mutating operations reject — callers should surface `initError` / rejections
 * so the player is not left believing saves persist.
 *
 * `subscribe(listener)` notifies when another tab mutates the store (via
 * BroadcastChannel), so UI can refresh save lists.
 */
export default async function create_fs() {
  try {
    const store = new IdbKvStore('diablo_fs');
    // Safari private mode (and some locked-down browsers) can open IDB then
    // fail on the first write — probe before claiming storage is healthy.
    await store.set(PROBE_KEY, new Uint8Array([1]));
    await store.remove(PROBE_KEY);

    const storeJson = await store.json();
    const files = new Map(Object.entries(storeJson).filter(([key]) => key !== PROBE_KEY));
    const listeners = new Set();

    const notify = (change) => {
      listeners.forEach((listener) => {
        try {
          listener(change);
        } catch (_e) {
          // Listener errors must not break storage.
        }
      });
    };

    const applyRemote = (method, key, value) => {
      if (!key || key === PROBE_KEY) {
        return;
      }
      if (method === 'remove') {
        files.delete(key);
      } else {
        const data = toUint8Array(value);
        if (data) {
          files.set(key, data);
        }
      }
      notify({ source: 'remote', method, key });
    };

    store.on('set', (data) => applyRemote('set', data.key, data.value));
    store.on('add', (data) => applyRemote('add', data.key, data.value));
    store.on('remove', (data) => applyRemote('remove', data.key));

    return {
      initError: null,
      files,
      list: () => Array.from(files.keys()).sort(),
      update: async (name, data) => {
        const key = String(name).toLowerCase();
        await store.set(key, data);
        files.set(key, data);
        notify({ source: 'local', method: 'set', key });
      },
      delete: async (name) => {
        const key = String(name).toLowerCase();
        await store.remove(key);
        files.delete(key);
        notify({ source: 'local', method: 'remove', key });
      },
      clear: async () => {
        await store.clear();
        files.clear();
        notify({ source: 'local', method: 'clear' });
      },
      download: (name) => downloadFile(store, name),
      upload: (file) =>
        uploadFile(store, files, file).then(() => {
          notify({ source: 'local', method: 'set', key: file.name.toLowerCase() });
        }),
      fileUrl: async (name) => {
        const file = await store.get(name.toLowerCase());
        if (file) {
          const blob = new Blob([file], { type: 'binary/octet-stream' });
          return URL.createObjectURL(blob);
        }
      },
      subscribe: (listener) => {
        if (typeof listener !== 'function') {
          return () => {};
        }
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  } catch (e) {
    return createFallbackFs(e);
  }
}
