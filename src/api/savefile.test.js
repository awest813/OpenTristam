import getPlayerName, { decrypt, encrypt, decrypt8, encrypt8, hash, path_name, MpqReader } from './savefile';

// ─── decrypt / encrypt roundtrip ────────────────────────────────────────────

describe('decrypt / encrypt roundtrip', () => {
  it('decrypt(encrypt(data)) === original data', () => {
    const original = new Uint32Array([0xDEADBEEF, 0x12345678, 0xCAFEBABE, 0x00000000]);
    const data = new Uint32Array(original);
    encrypt(data, 0xABCDEF01);
    expect(data).not.toEqual(original);
    decrypt(data, 0xABCDEF01);
    expect(data).toEqual(original);
  });

  it('decrypt8 / encrypt8 work on byte arrays', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const data = new Uint8Array(original);
    encrypt8(data, 0x11223344);
    expect(data).not.toEqual(original);
    decrypt8(data, 0x11223344);
    expect(data).toEqual(original);
  });

  it('decrypting with wrong key does not restore original', () => {
    const original = new Uint32Array([0x11111111, 0x22222222]);
    const data = new Uint32Array(original);
    encrypt(data, 0xAAAAAAAA);
    decrypt(data, 0xBBBBBBBB);
    expect(data).not.toEqual(original);
  });

  it('encrypt is deterministic', () => {
    const a = new Uint32Array([1, 2, 3, 4]);
    const b = new Uint32Array([1, 2, 3, 4]);
    encrypt(a, 0x42);
    encrypt(b, 0x42);
    expect(a).toEqual(b);
  });
});

// ─── hash ────────────────────────────────────────────────────────────────────

describe('hash', () => {
  it('returns a non-negative 32-bit integer', () => {
    const h = hash('diabdat.mpq', 0);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xFFFFFFFF);
  });

  it('is case-insensitive (uppercases input)', () => {
    expect(hash('diabdat.mpq', 1)).toBe(hash('DIABDAT.MPQ', 1));
  });

  it('treats forward slashes as backslashes', () => {
    expect(hash('path/file.bin', 2)).toBe(hash('path\\file.bin', 2));
  });

  it('produces different values for different type parameters', () => {
    const h0 = hash('hero', 0);
    const h1 = hash('hero', 1);
    const h2 = hash('hero', 2);
    const h3 = hash('hero', 3);
    expect(new Set([h0, h1, h2, h3]).size).toBe(4);
  });

  it('produces different values for different names', () => {
    expect(hash('file1.bin', 0)).not.toBe(hash('file2.bin', 0));
  });
});

// ─── path_name ───────────────────────────────────────────────────────────────

describe('path_name', () => {
  it('strips a Unix-style directory prefix', () => {
    expect(path_name('some/dir/file.mpq')).toBe('file.mpq');
  });

  it('strips a Windows-style directory prefix', () => {
    expect(path_name('some\\dir\\file.mpq')).toBe('file.mpq');
  });

  it('returns the name unchanged when there is no separator', () => {
    expect(path_name('diabdat.mpq')).toBe('diabdat.mpq');
  });

  it('handles an empty string', () => {
    expect(path_name('')).toBe('');
  });

  it('handles mixed slashes', () => {
    expect(path_name('some/dir\\file.mpq')).toBe('file.mpq');
    expect(path_name('some\\dir/file.mpq')).toBe('file.mpq');
  });

  it('handles trailing separators', () => {
    expect(path_name('some/dir/')).toBe('');
    expect(path_name('some\\dir\\')).toBe('');
  });

  it('handles paths with only separators', () => {
    expect(path_name('/')).toBe('');
    expect(path_name('\\')).toBe('');
    expect(path_name('//')).toBe('');
    expect(path_name('\\\\')).toBe('');
  });

  it('handles root paths and drive letters', () => {
    expect(path_name('/file.mpq')).toBe('file.mpq');
    expect(path_name('\\file.mpq')).toBe('file.mpq');
    expect(path_name('C:\\file.mpq')).toBe('file.mpq');
  });
});

// ─── MpqReader ───────────────────────────────────────────────────────────────

describe('MpqReader', () => {
  it('throws on a zero-length buffer', () => {
    expect(() => new MpqReader(new ArrayBuffer(0))).toThrow();
  });

  it('throws on a buffer with an invalid MPQ signature', () => {
    const buf = new ArrayBuffer(64);
    new Uint8Array(buf).fill(0);
    expect(() => new MpqReader(buf)).toThrow('invalid MPQ header');
  });

  it('constructs successfully given a minimal valid MPQ header', () => {
    // Build the smallest valid MPQ: header + empty hash table + empty block table.
    // MPQ header signature: 0x1A51504D (little-endian bytes: 4D 50 51 1A)
    const buf = new ArrayBuffer(512);
    const u8 = new Uint8Array(buf);
    const u32 = new Uint32Array(buf);

    // Signature
    u32[0] = 0x1A51504D;
    // Header size (unused by reader but present in real files)
    u32[1] = 32;
    // Archive size
    u32[2] = 512;
    // sizeId at bytes 14-15: sector size = 512 << (9 + 0) = 512
    u8[14] = 0; u8[15] = 0;
    // hashOffset: immediately after header
    u32[4] = 32;
    // blockOffset: 32 + 0 hash entries * 16 bytes
    u32[5] = 32;
    // hashCount: 0
    u32[6] = 0;
    // blockCount: 0
    u32[7] = 0;

    expect(() => new MpqReader(buf)).not.toThrow();
  });

  it('returns undefined for a file lookup in an empty archive', () => {
    const buf = new ArrayBuffer(512);
    const u8 = new Uint8Array(buf);
    const u32 = new Uint32Array(buf);

    u32[0] = 0x1A51504D;
    u8[14] = 0; u8[15] = 0;
    u32[4] = 32;
    u32[5] = 32;
    u32[6] = 0;
    u32[7] = 0;

    const reader = new MpqReader(buf);
    expect(reader.read('nonexistent.bin')).toBeUndefined();
  });
});

// ─── getPlayerName ───────────────────────────────────────────────────────────

describe('getPlayerName', () => {
  it('returns null for an empty buffer', () => {
    expect(getPlayerName(new ArrayBuffer(0), 'spawn1.sv')).toBeNull();
  });

  it('returns null for a buffer with an invalid MPQ header', () => {
    const buf = new ArrayBuffer(64);
    expect(getPlayerName(buf, 'single_0.sv')).toBeNull();
  });

  it('returns null for a valid-looking MPQ that contains no hero file', () => {
    const buf = new ArrayBuffer(512);
    const u8 = new Uint8Array(buf);
    const u32 = new Uint32Array(buf);
    u32[0] = 0x1A51504D;
    u8[14] = 0; u8[15] = 0;
    u32[4] = 32;
    u32[5] = 32;
    u32[6] = 0;
    u32[7] = 0;
    expect(getPlayerName(buf, 'single_0.sv')).toBeNull();
  });

it('returns null when codec_decode fails to parse the hero file', () => {
    const buf = new ArrayBuffer(512);
    const u8 = new Uint8Array(buf);
    const u32 = new Uint32Array(buf);
    u32[0] = 0x1A51504D;
    u8[14] = 0; u8[15] = 0;
    u32[4] = 32;
    u32[5] = 48;
    u32[6] = 1;
    u32[7] = 1;

    const hashEntry = new Uint32Array(4);
    hashEntry[0] = hash('hero', 1);
    hashEntry[1] = hash('hero', 2);
    hashEntry[2] = 0;
    hashEntry[3] = 0;

    const blockEntry = new Uint32Array(4);
    blockEntry[0] = 64;
    blockEntry[1] = 8;
    blockEntry[2] = 8;
    blockEntry[3] = 0x80000000;

    encrypt(hashEntry, hash('(hash table)', 3));
    encrypt(blockEntry, hash('(block table)', 3));

    u32.set(hashEntry, 8);
    u32.set(blockEntry, 12);

    expect(getPlayerName(buf, 'single_0.sv')).toBeNull();
  });
});
