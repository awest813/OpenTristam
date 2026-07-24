import create_fs, { STORAGE_UNAVAILABLE_MESSAGE } from './fs';

// ─── IdbKvStore mock ──────────────────────────────────────────────────────────
//
// Tests control the mock through the module-level `mockStore` object so each
// suite can set up different initial state or failure modes without re-requiring
// the module.  The `mock` prefix is required by Jest's factory scope rules.

let mockStore;

jest.mock('idb-kv-store', () => {
  return jest.fn().mockImplementation(() => mockStore);
});

function makeMockStore(initialData = {}) {
  const listeners = {};
  return {
    json: jest.fn(() => Promise.resolve(initialData)),
    set: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    get: jest.fn((key) => Promise.resolve(initialData[key] ?? null)),
    on: jest.fn((event, handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    }),
    _emit(event, data) {
      (listeners[event] || []).forEach((handler) => handler(data));
    },
  };
}

// ─── happy path ───────────────────────────────────────────────────────────────

describe('create_fs — successful IndexedDB init', () => {
  beforeEach(() => {
    mockStore = makeMockStore({
      'single_0.sv': new Uint8Array([1, 2, 3]),
      'spawn.mpq': new Uint8Array([4, 5]),
    });
  });

  it('returns initError: null on success', async () => {
    const fs = await create_fs();
    expect(fs.initError).toBeNull();
  });

  it('probes write access during init', async () => {
    await create_fs();
    expect(mockStore.set).toHaveBeenCalled();
    expect(mockStore.remove).toHaveBeenCalled();
  });

  it('populates files map from the store', async () => {
    const fs = await create_fs();
    expect(fs.files.has('single_0.sv')).toBe(true);
    expect(fs.files.has('spawn.mpq')).toBe(true);
  });

  it('list() returns sorted file names', async () => {
    const fs = await create_fs();
    const names = fs.list();
    expect(names).toEqual(['single_0.sv', 'spawn.mpq']);
  });

  it('list() returns an empty array when no files are stored', async () => {
    mockStore = makeMockStore({});
    const fs = await create_fs();
    expect(fs.list()).toEqual([]);
  });

  it('update() persists before updating the in-memory map', async () => {
    const fs = await create_fs();
    const data = new Uint8Array([9]);
    const order = [];
    mockStore.set.mockImplementation(async () => {
      order.push('store');
    });
    const originalSet = fs.files.set.bind(fs.files);
    fs.files.set = (...args) => {
      order.push('map');
      return originalSet(...args);
    };

    await fs.update('NEW.SV', data);
    expect(mockStore.set).toHaveBeenCalledWith('new.sv', data);
    expect(fs.files.get('new.sv')).toBe(data);
    expect(order.indexOf('store')).toBeLessThan(order.indexOf('map'));
  });

  it('update() does not leave a ghost map entry when persistence fails', async () => {
    const fs = await create_fs();
    mockStore.set.mockRejectedValueOnce(new Error('QuotaExceededError'));
    await expect(fs.update('fail.sv', new Uint8Array([1]))).rejects.toThrow('QuotaExceededError');
    expect(fs.files.has('fail.sv')).toBe(false);
  });

  it('delete() delegates to store.remove', async () => {
    const fs = await create_fs();
    await fs.delete('SINGLE_0.SV');
    expect(mockStore.remove).toHaveBeenCalledWith('single_0.sv');
    expect(fs.files.has('single_0.sv')).toBe(false);
  });

  it('clear() delegates to store.clear', async () => {
    const fs = await create_fs();
    await fs.clear();
    expect(mockStore.clear).toHaveBeenCalled();
    expect(fs.files.size).toBe(0);
  });

  it('upload() validates the file argument', async () => {
    const fs = await create_fs();
    await expect(fs.upload(null)).rejects.toThrow(TypeError);
  });

  it('upload() rejects non-.sv files', async () => {
    const fs = await create_fs();
    const file = new File(['x'], 'DIABDAT.MPQ');
    await expect(fs.upload(file)).rejects.toThrow(/\.sv/i);
  });

  it('download() throws when the file is missing', async () => {
    const fs = await create_fs();
    mockStore.get.mockResolvedValueOnce(null);
    await expect(fs.download('missing.sv')).rejects.toThrow(/does not exist/i);
  });

  it('download() delays blob URL revocation', async () => {
    jest.useFakeTimers();
    URL.createObjectURL = jest.fn(() => 'blob:fake-url');
    URL.revokeObjectURL = jest.fn();
    const fs = await create_fs();
    mockStore.get.mockResolvedValueOnce(new Uint8Array([1]));

    await fs.download('single_0.sv');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1600);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
    jest.useRealTimers();
  });

  it('fileUrl() returns a blob URL for an existing file', async () => {
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:fake-url');
    URL.revokeObjectURL = jest.fn();

    const fs = await create_fs();
    mockStore.get.mockResolvedValueOnce(new Uint8Array([1]));
    const url = await fs.fileUrl('single_0.sv');
    expect(url).toBe('blob:fake-url');

    URL.createObjectURL = originalCreate;
  });

  it('fileUrl() returns undefined for a missing file', async () => {
    const fs = await create_fs();
    mockStore.get.mockResolvedValueOnce(null);
    const url = await fs.fileUrl('missing.sv');
    expect(url).toBeUndefined();
  });

  it('subscribe() notifies listeners for remote store events', async () => {
    const fs = await create_fs();
    const listener = jest.fn();
    fs.subscribe(listener);
    mockStore._emit('set', { key: 'hero.sv', value: new Uint8Array([7]) });
    expect(fs.files.get('hero.sv')).toEqual(new Uint8Array([7]));
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'remote', method: 'set', key: 'hero.sv' })
    );
  });
});

// ─── IndexedDB failure path ───────────────────────────────────────────────────

describe('create_fs — IndexedDB init failure', () => {
  beforeEach(() => {
    mockStore = {
      json: jest.fn(() => Promise.reject(new Error('IDB unavailable'))),
      set: jest.fn(() => Promise.reject(new Error('IDB unavailable'))),
      remove: jest.fn(() => Promise.reject(new Error('IDB unavailable'))),
      on: jest.fn(),
    };
  });

  it('returns an initError on failure', async () => {
    const fs = await create_fs();
    expect(fs.initError).toBeInstanceOf(Error);
    expect(fs.initError.message).toBe('IDB unavailable');
  });

  it('returns an empty files map on failure', async () => {
    const fs = await create_fs();
    expect(fs.files.size).toBe(0);
  });

  it('list() returns an empty array on failure', async () => {
    const fs = await create_fs();
    expect(fs.list()).toEqual([]);
  });

  it('update() rejects when storage is unavailable', async () => {
    const fs = await create_fs();
    await expect(fs.update('x.sv', new Uint8Array())).rejects.toThrow(STORAGE_UNAVAILABLE_MESSAGE);
  });

  it('delete() rejects when storage is unavailable', async () => {
    const fs = await create_fs();
    await expect(fs.delete('x.sv')).rejects.toThrow(STORAGE_UNAVAILABLE_MESSAGE);
  });

  it('clear() rejects when storage is unavailable', async () => {
    const fs = await create_fs();
    await expect(fs.clear()).rejects.toThrow(STORAGE_UNAVAILABLE_MESSAGE);
  });

  it('upload() rejects when storage is unavailable', async () => {
    const fs = await create_fs();
    await expect(fs.upload(new File(['x'], 'hero.sv'))).rejects.toThrow(
      STORAGE_UNAVAILABLE_MESSAGE
    );
  });

  it('fileUrl() returns a resolved promise with undefined on failure', async () => {
    const fs = await create_fs();
    await expect(fs.fileUrl('x.sv')).resolves.toBeUndefined();
  });

  it('treats probe write failure as init failure', async () => {
    mockStore = makeMockStore({});
    mockStore.set.mockRejectedValueOnce(new Error('Private mode'));
    const fs = await create_fs();
    expect(fs.initError).toBeInstanceOf(Error);
    expect(fs.initError.message).toBe('Private mode');
    await expect(fs.update('x.sv', new Uint8Array())).rejects.toThrow(STORAGE_UNAVAILABLE_MESSAGE);
  });
});
