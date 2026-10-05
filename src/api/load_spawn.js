import { downloadArrayBuffer } from './download';

const SpawnSizes = [50274091, 25830791];

export { SpawnSizes };

export const SPAWN_MISSING_MESSAGE = 'spawn.mpq is not available on this server.';

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
    let buffer;
    try {
      buffer = await downloadArrayBuffer(process.env.PUBLIC_URL + '/spawn.mpq', {
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
    } catch (e) {
      if (/status code 404\b/.test(e && e.message)) {
        // The host simply doesn't ship shareware data (it is not in the repo).
        throw new Error(SPAWN_MISSING_MESSAGE);
      }
      throw e;
    }
    // Hosts with an SPA fallback answer a missing file with index.html (200).
    if (new Uint8Array(buffer, 0, Math.min(1, buffer.byteLength))[0] === 0x3c /* '<' */) {
      throw new Error(SPAWN_MISSING_MESSAGE);
    }
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
