import load_spawn, { SPAWN_MISSING_MESSAGE, SpawnSizes } from './load_spawn';
import { downloadArrayBuffer } from './download';

jest.mock('./download', () => ({
  downloadArrayBuffer: jest.fn(),
}));

function makeFs({ files = new Map(), stored = {} } = {}) {
  return {
    files,
    load: jest.fn(async (name) => {
      const data = stored[name];
      if (data) {
        files.set(name, data);
      }
      return data;
    }),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
  };
}

describe('load_spawn', () => {
  afterEach(() => {
    downloadArrayBuffer.mockReset();
  });

  it('reuses a cached archive from storage without downloading', async () => {
    const cached = new Uint8Array(SpawnSizes[1]);
    const fs = makeFs({ stored: { 'spawn.mpq': cached } });

    await load_spawn({}, fs);

    expect(fs.load).toHaveBeenCalledWith('spawn.mpq');
    expect(downloadArrayBuffer).not.toHaveBeenCalled();
    expect(fs.files.get('spawn.mpq')).toBe(cached);
  });

  it('downloads, reports progress and persists when nothing is cached', async () => {
    const fs = makeFs();
    const onProgress = jest.fn();
    downloadArrayBuffer.mockImplementation(async (url, { onProgress: report }) => {
      report({ loaded: 10, total: 0 });
      return new ArrayBuffer(SpawnSizes[1]);
    });

    await load_spawn({ onProgress }, fs);

    // Unknown size (compressed response) falls back to the bundled archive's size.
    expect(onProgress).toHaveBeenCalledWith({
      text: 'Downloading...',
      loaded: 10,
      total: SpawnSizes[2],
    });
    expect(fs.files.get('spawn.mpq').byteLength).toBe(SpawnSizes[1]);
    expect(fs.update).toHaveBeenCalledWith('spawn.mpq', expect.any(Uint8Array));
  });

  it('replaces a cached archive with the wrong size', async () => {
    const fs = makeFs({ stored: { 'spawn.mpq': new Uint8Array(3) } });
    downloadArrayBuffer.mockResolvedValue(new ArrayBuffer(SpawnSizes[0]));

    await load_spawn({}, fs);

    expect(fs.delete).toHaveBeenCalledWith('spawn.mpq');
    expect(fs.files.get('spawn.mpq').byteLength).toBe(SpawnSizes[0]);
  });

  it('reports a missing archive (404) distinctly', async () => {
    downloadArrayBuffer.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 404'), { status: 404 })
    );
    await expect(load_spawn({}, makeFs())).rejects.toThrow(SPAWN_MISSING_MESSAGE);
  });

  it('treats an HTML fallback page (SPA hosts answer 200) as missing data', async () => {
    const html = Uint8Array.from('<!doctype html>', (c) => c.charCodeAt(0));
    downloadArrayBuffer.mockResolvedValue(html.buffer);
    await expect(load_spawn({}, makeFs())).rejects.toThrow(SPAWN_MISSING_MESSAGE);
  });

  it('passes other download failures through unchanged', async () => {
    downloadArrayBuffer.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(load_spawn({}, makeFs())).rejects.toThrow('Failed to fetch');
  });

  it('rejects a download with an unexpected size', async () => {
    downloadArrayBuffer.mockResolvedValue(new ArrayBuffer(5));
    await expect(load_spawn({}, makeFs())).rejects.toThrow(/Invalid spawn\.mpq size/);
  });

  it('still launches when persisting the download fails', async () => {
    const fs = makeFs();
    fs.update.mockRejectedValue(new Error('quota'));
    downloadArrayBuffer.mockResolvedValue(new ArrayBuffer(SpawnSizes[1]));

    await expect(load_spawn({}, fs)).resolves.toBe(fs);
    expect(fs.files.has('spawn.mpq')).toBe(true);
  });
});
