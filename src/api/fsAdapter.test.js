import { createFsAdapter } from './fsAdapter';

function makeFs() {
  return {
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    list: jest.fn(),
  };
}

describe('createFsAdapter — handleFs', () => {
  it('dispatches update with the provided params', () => {
    const fs = makeFs();
    const adapter = createFsAdapter(fs);
    const data = new Uint8Array([1, 2, 3]);

    adapter.handleFs({ func: 'update', params: ['single_0.sv', data] });

    expect(fs.update).toHaveBeenCalledWith('single_0.sv', data);
  });

  it('dispatches delete with the provided params', () => {
    const fs = makeFs();
    const adapter = createFsAdapter(fs);

    adapter.handleFs({ func: 'delete', params: ['single_0.sv'] });

    expect(fs.delete).toHaveBeenCalledWith('single_0.sv');
  });

  it('dispatches clear with no params', () => {
    const fs = makeFs();
    const adapter = createFsAdapter(fs);

    adapter.handleFs({ func: 'clear', params: [] });

    expect(fs.clear).toHaveBeenCalledWith();
  });

  it('forwards the exact params array to the fs operation', () => {
    const fs = makeFs();
    const adapter = createFsAdapter(fs);
    const data = new Uint8Array([42]);

    adapter.handleFs({ func: 'update', params: ['spawn0.sv', data] });

    expect(fs.update).toHaveBeenCalledTimes(1);
    expect(fs.update.mock.calls[0]).toEqual(['spawn0.sv', data]);
  });

  it('is tolerant of unknown func names (passes them through)', () => {
    const fs = { customOp: jest.fn() };
    const adapter = createFsAdapter(fs);

    expect(() => adapter.handleFs({ func: 'customOp', params: ['arg'] })).not.toThrow();
    expect(fs.customOp).toHaveBeenCalledWith('arg');
  });

  it('reports async persist failures without throwing', async () => {
    const onPersistError = jest.fn();
    const fs = {
      update: jest.fn(() => Promise.reject(new Error('QuotaExceededError'))),
    };
    const adapter = createFsAdapter(fs, { onPersistError });

    expect(() =>
      adapter.handleFs({ func: 'update', params: ['hero.sv', new Uint8Array([1])] })
    ).not.toThrow();

    await Promise.resolve();
    await Promise.resolve();

    expect(onPersistError).toHaveBeenCalledWith(expect.any(Error), 'update');
  });

  it('reports sync persist failures without throwing', () => {
    const onPersistError = jest.fn();
    const fs = {
      update: jest.fn(() => {
        throw new Error('boom');
      }),
    };
    const adapter = createFsAdapter(fs, { onPersistError });

    expect(() =>
      adapter.handleFs({ func: 'update', params: ['hero.sv', new Uint8Array([1])] })
    ).not.toThrow();
    expect(onPersistError).toHaveBeenCalledWith(expect.any(Error), 'update');
  });
});

describe('createFsAdapter — flush', () => {
  it('resolves immediately when nothing is pending', async () => {
    const adapter = createFsAdapter(makeFs());
    await expect(adapter.flush()).resolves.toBeUndefined();
  });

  it('waits for in-flight writes before resolving', async () => {
    let finishWrite;
    const fs = makeFs();
    fs.update.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishWrite = resolve;
        })
    );
    const adapter = createFsAdapter(fs);
    adapter.handleFs({ func: 'update', params: ['single_0.sv', new Uint8Array([1])] });

    let flushed = false;
    const flushing = adapter.flush().then(() => {
      flushed = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(flushed).toBe(false);

    finishWrite();
    await flushing;
    expect(flushed).toBe(true);
  });

  it('still resolves when a write fails', async () => {
    const fs = makeFs();
    fs.update.mockImplementation(() => Promise.reject(new Error('quota')));
    const onPersistError = jest.fn();
    const adapter = createFsAdapter(fs, { onPersistError });
    adapter.handleFs({ func: 'update', params: ['single_0.sv', new Uint8Array([1])] });

    await adapter.flush();
    expect(onPersistError).toHaveBeenCalled();
  });

  it('gives up after the timeout if storage never settles', async () => {
    jest.useFakeTimers();
    try {
      const fs = makeFs();
      fs.update.mockImplementation(() => new Promise(() => {}));
      const adapter = createFsAdapter(fs);
      adapter.handleFs({ func: 'update', params: ['single_0.sv', new Uint8Array([1])] });

      const flushing = adapter.flush(1000);
      jest.advanceTimersByTime(1000);
      await expect(flushing).resolves.toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });
});
