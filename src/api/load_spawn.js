import axios from 'axios';

const SpawnSizes = [50274091, 25830791];

export { SpawnSizes };

export default async function load_spawn(api, fs) {
  let file = fs.files.get('spawn.mpq');
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
    const spawn = await axios.request({
      url: process.env.PUBLIC_URL + '/spawn.mpq',
      responseType: 'arraybuffer',
      onDownloadProgress: (e) => {
        if (api.onProgress) {
          api.onProgress({
            text: 'Downloading...',
            loaded: e.loaded,
            total: e.total || SpawnSizes[1],
          });
        }
      },
      headers: {
        'Cache-Control': 'max-age=31536000',
      },
    });
    if (!SpawnSizes.includes(spawn.data.byteLength)) {
      throw Error('Invalid spawn.mpq size. Try clearing cache and refreshing the page.');
    }
    const data = new Uint8Array(spawn.data);
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
