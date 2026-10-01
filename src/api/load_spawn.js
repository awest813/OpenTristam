import { downloadArrayBuffer } from './download';

const SpawnSizes = [50274091, 25830791];

export { SpawnSizes };

export default async function load_spawn(api, fs) {
  let file = fs.files.get('spawn.mpq');
  if (!file && typeof fs.load === 'function') {
    // Cached archives stay in IndexedDB until a launch needs them.
    try {
      file = await fs.load('spawn.mpq');
    } catch (_e) {
      file = null;
    }
  }
  if (file && !SpawnSizes.includes(file.byteLength)) {
    fs.files.delete('spawn.mpq');
    try {
      await fs.delete('spawn.mpq');
    } catch (_e) {
      // In-memory copy already removed; persistence may be unavailable.
    }
    file = null;
  }
  if (!file) {
    const buffer = await downloadArrayBuffer(process.env.PUBLIC_URL + '/spawn.mpq', {
      onProgress: (e) => {
        if (api.onProgress) {
          api.onProgress({
            text: 'Downloading...',
            loaded: e.loaded,
            total: e.total || SpawnSizes[1],
          });
        }
      },
    });
    if (!SpawnSizes.includes(buffer.byteLength)) {
      throw Error('Invalid spawn.mpq size. Try clearing cache and refreshing the page.');
    }
    const data = new Uint8Array(buffer);
    // Keep an in-memory copy for this session even if persistence fails.
    fs.files.set('spawn.mpq', data);
    try {
      await fs.update('spawn.mpq', data.slice());
    } catch (_e) {
      // Session can still launch; next visit may re-download.
    }
  }
  return fs;
}
