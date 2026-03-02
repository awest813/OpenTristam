import { decrypt, encrypt, decrypt8, encrypt8, hash, path_name } from './savefile';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeU32(values) {
  return new Uint32Array(values);
}

function makeU8(values) {
  return new Uint8Array(values);
}

// ─── hash() ───────────────────────────────────────────────────────────────────

describe('hash()', () => {
  it('is deterministic for the same input', () => {
    expect(hash('(hash table)', 3)).toBe(hash('(hash table)', 3));
  });

  it('produces different values for different type parameters', () => {
    const name = 'hero';
    expect(hash(name, 0)).not.toBe(hash(name, 1));
    expect(hash(name, 1)).not.toBe(hash(name, 2));
    expect(hash(name, 2)).not.toBe(hash(name, 3));
  });

  it('is case-insensitive (lower-case matches upper-case)', () => {
    expect(hash('HERO', 0)).toBe(hash('hero', 0));
    expect(hash('HeroFile', 1)).toBe(hash('herofile', 1));
  });

  it('normalises forward slashes to back slashes', () => {
    expect(hash('a/b', 0)).toBe(hash('a\\b', 0));
  });

  it('returns a 32-bit unsigned integer', () => {
    const h = hash('diabdat.mpq', 0);
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xFFFFFFFF);
  });

  it('produces the known hash for the hash-table sentinel key', () => {
    // This value is used by the MPQ reader to decrypt the hash table itself.
    // A regression here would break all MPQ file lookup.
    const hashTableKey = hash('(hash table)', 3);
    expect(hashTableKey).toBe(0xC3AF3770);
  });

  it('produces the known hash for the block-table sentinel key', () => {
    const blockTableKey = hash('(block table)', 3);
    expect(blockTableKey).toBe(0xEC83B3A3);
  });
});

// ─── path_name() ──────────────────────────────────────────────────────────────

describe('path_name()', () => {
  it('strips a unix-style directory prefix', () => {
    expect(path_name('data/ui/hero.dat')).toBe('hero.dat');
  });

  it('strips a windows-style directory prefix', () => {
    expect(path_name('data\\ui\\hero.dat')).toBe('hero.dat');
  });

  it('returns the full name when there is no separator', () => {
    expect(path_name('hero.dat')).toBe('hero.dat');
  });

  it('handles an empty string', () => {
    expect(path_name('')).toBe('');
  });

  it('handles a trailing separator (directory with no filename)', () => {
    expect(path_name('data/')).toBe('');
  });

  it('picks the last separator when both slash types are present', () => {
    expect(path_name('a\\b/c.dat')).toBe('c.dat');
  });
});

// ─── encrypt / decrypt round-trip ─────────────────────────────────────────────

describe('encrypt() / decrypt() round-trip', () => {
  it('decrypts what encrypt produces (Uint32Array)', () => {
    const original = makeU32([0xDEADBEEF, 0x12345678, 0xCAFEBABE, 0x00000000]);
    const encrypted = new Uint32Array(original);
    encrypt(encrypted, 0xABCD1234);

    // Encrypted data must differ from plain
    expect([...encrypted]).not.toEqual([...original]);

    decrypt(encrypted, 0xABCD1234);
    expect([...encrypted]).toEqual([...original]);
  });

  it('is key-sensitive: wrong key does not restore plaintext', () => {
    const original = makeU32([0x11111111, 0x22222222]);
    const encrypted = new Uint32Array(original);
    encrypt(encrypted, 0x12345678);

    const copy = new Uint32Array(encrypted);
    decrypt(copy, 0xDEADBEEF);
    expect([...copy]).not.toEqual([...original]);
  });

  it('round-trips an all-zero block', () => {
    const data = new Uint32Array(8);
    const enc = new Uint32Array(data);
    encrypt(enc, 0x1);
    decrypt(enc, 0x1);
    expect([...enc]).toEqual([...data]);
  });

  it('round-trips a single element', () => {
    const data = makeU32([0xFFFFFFFF]);
    const enc = new Uint32Array(data);
    encrypt(enc, 0x00000001);
    decrypt(enc, 0x00000001);
    expect([...enc]).toEqual([...data]);
  });
});

describe('encrypt8() / decrypt8() round-trip', () => {
  it('decrypts what encrypt8 produces', () => {
    // Must be a multiple of 4 bytes long for Uint32 view to align
    const original = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0xAA, 0xBB, 0xCC, 0xDD]);
    const enc = new Uint8Array(original);
    encrypt8(enc, 0xDEAD);
    expect([...enc]).not.toEqual([...original]);
    decrypt8(enc, 0xDEAD);
    expect([...enc]).toEqual([...original]);
  });
});
