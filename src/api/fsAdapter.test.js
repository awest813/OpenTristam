import { createFsAdapter } from './fsAdapter';

function makeFs() {
  return {
    update: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    list: jest.fn(),
  };
}

// ─── handleFs ────────────────────────────────────────────────────────────────

describe('createFsAdapter — handleFs', () => {
  it('dispatches update with the provided params', () => {
    const fs = makeFs();
    const adapter = createFsAdapter(fs);
    const data = new Uint8Array([1, 2, 3]);

    adapter.handleFs({func: 'update', params: ['single_0.sv', data]});

    expect(fs.update).toHaveBeenCalledWith('single_0.sv', data);
  });

  it('dispatches delete with the provided params', () => {
    const fs = makeFs();
    const adapter = createFsAdapter(fs);

    adapter.handleFs({func: 'delete', params: ['single_0.sv']});

    expect(fs.delete).toHaveBeenCalledWith('single_0.sv');
  });

  it('dispatches clear with no params', () => {
    const fs = makeFs();
    const adapter = createFsAdapter(fs);

    adapter.handleFs({func: 'clear', params: []});

    expect(fs.clear).toHaveBeenCalledWith();
  });

  it('forwards the exact params array to the fs operation', () => {
    const fs = makeFs();
    const adapter = createFsAdapter(fs);
    const data = new Uint8Array([42]);

    adapter.handleFs({func: 'update', params: ['spawn0.sv', data]});

    expect(fs.update).toHaveBeenCalledTimes(1);
    expect(fs.update.mock.calls[0]).toEqual(['spawn0.sv', data]);
  });

  it('is tolerant of unknown func names (passes them through)', () => {
    const fs = {customOp: jest.fn()};
    const adapter = createFsAdapter(fs);

    expect(() => adapter.handleFs({func: 'customOp', params: ['arg']})).not.toThrow();
    expect(fs.customOp).toHaveBeenCalledWith('arg');
  });
});
