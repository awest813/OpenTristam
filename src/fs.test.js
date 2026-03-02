import create_fs from './fs';

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
  return {
    json: jest.fn(() => Promise.resolve(initialData)),
    set: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    get: jest.fn(key => Promise.resolve(initialData[key] ?? null)),
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

  it('update() delegates to store.set', async () => {
    const fs = await create_fs();
    const data = new Uint8Array([9]);
    await fs.update('new.sv', data);
    expect(mockStore.set).toHaveBeenCalledWith('new.sv', data);
  });

  it('delete() delegates to store.remove', async () => {
    const fs = await create_fs();
    await fs.delete('single_0.sv');
    expect(mockStore.remove).toHaveBeenCalledWith('single_0.sv');
  });

  it('clear() delegates to store.clear', async () => {
    const fs = await create_fs();
    await fs.clear();
    expect(mockStore.clear).toHaveBeenCalled();
  });

  it('fileUrl() returns a blob URL for an existing file', async () => {
    // jsdom does not implement URL.createObjectURL; provide a minimal stub.
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
});

// ─── IndexedDB failure path ───────────────────────────────────────────────────

describe('create_fs — IndexedDB init failure', () => {
  beforeEach(() => {
    mockStore = {
      json: jest.fn(() => Promise.reject(new Error('IDB unavailable'))),
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

  it('update() is a no-op and returns a resolved promise on failure', async () => {
    const fs = await create_fs();
    await expect(fs.update('x.sv', new Uint8Array())).resolves.toBeUndefined();
  });

  it('delete() is a no-op and returns a resolved promise on failure', async () => {
    const fs = await create_fs();
    await expect(fs.delete('x.sv')).resolves.toBeUndefined();
  });

  it('clear() is a no-op and returns a resolved promise on failure', async () => {
    const fs = await create_fs();
    await expect(fs.clear()).resolves.toBeUndefined();
  });

  it('fileUrl() returns a resolved promise with undefined on failure', async () => {
    const fs = await create_fs();
    await expect(fs.fileUrl('x.sv')).resolves.toBeUndefined();
  });
});
