import { getDropFile, isDropFile } from './fileDrop';

describe('fileDrop utilities', () => {
  it('detects file drops from DataTransferItemList', () => {
    const event = {
      dataTransfer: {
        items: [
          { kind: 'string', getAsFile: () => null },
          { kind: 'file', getAsFile: () => ({ name: 'spawn.mpq' }) },
        ],
        files: [],
      },
    };

    expect(isDropFile(event)).toBe(true);
    expect(getDropFile(event)).toEqual({ name: 'spawn.mpq' });
  });

  it('falls back to dataTransfer.files when items are unavailable', () => {
    const file = { name: 'hero.sv' };
    const event = {
      dataTransfer: {
        items: null,
        files: [file],
      },
    };

    expect(isDropFile(event)).toBe(true);
    expect(getDropFile(event)).toBe(file);
  });

  it('falls back to dataTransfer.files when getAsFile returns null', () => {
    const file = { name: 'hero.sv' };
    const event = {
      dataTransfer: {
        items: [{ kind: 'file', getAsFile: () => null }],
        files: [file],
      },
    };

    expect(isDropFile(event)).toBe(true);
    expect(getDropFile(event)).toBe(file);
  });

  it('returns false when no files are present', () => {
    const event = {
      dataTransfer: {
        items: [{ kind: 'string', getAsFile: () => null }],
        files: [],
      },
    };

    expect(isDropFile(event)).toBe(false);
    expect(getDropFile(event)).toBeUndefined();
  });

  it('handles missing dataTransfer payload safely', () => {
    const event = {};

    expect(isDropFile(event)).toBe(false);
    expect(getDropFile(event)).toBeUndefined();
  });
});
