import codec_decode, { codec_init_key } from './codec';

// ─── helpers ──────────────────────────────────────────────────────────────────

const BLOCK = 64; // bytes per cipher block (16 × uint32)

/**
 * Encode plaintext with the same stream cipher used by codec_decode.
 *
 * The cipher is an OFB-like scheme: for each 64-byte block the SHA1-like
 * digest is XORed with plaintext to produce ciphertext, then the PLAINTEXT
 * block is fed back into the running SHA1 state to advance the key stream.
 *
 * Trailer layout (8 bytes):
 *   [0..3] – sha.digest[0] checksum after processing all blocks
 *   [4]    – must be 0 (compatibility flag)
 *   [5]    – last_size: real bytes in the last plaintext block (1–64)
 *   [6..7] – 0x00 padding
 */
function codec_encode(plaintext, password) {
  const lastSize = ((plaintext.length - 1) % BLOCK) + 1;
  const numBlocks = Math.ceil(plaintext.length / BLOCK);
  const paddedSize = numBlocks * BLOCK;

  // Pad plaintext to block boundary
  const padded = new Uint8Array(paddedSize);
  padded.set(plaintext);
  const padded32 = new Uint32Array(padded.buffer);

  const out = new Uint8Array(paddedSize + 8);
  const out32 = new Uint32Array(out.buffer);

  const sha = codec_init_key(password);

  for (let i = 0; i < padded32.length; i += 16) {
    const block32 = new Uint32Array(16);
    for (let j = 0; j < 16; ++j) {
      block32[j] = padded32[i + j] ^ sha.digest[j % sha.digest.length];
      out32[i + j] = block32[j];
    }
    // Advance key state using PLAINTEXT (mirrors the decode loop)
    sha.input(padded32.subarray(i, i + 16));
  }

  // Trailer
  out32[paddedSize / 4] = sha.digest[0]; // checksum
  out[paddedSize + 4] = 0;               // compatibility byte must be 0
  out[paddedSize + 5] = lastSize;

  return out;
}

// ─── codec_init_key ───────────────────────────────────────────────────────────

describe('codec_init_key()', () => {
  it('is deterministic: same password always produces the same key state', () => {
    const k1 = codec_init_key('xrgyrkj1');
    const k2 = codec_init_key('xrgyrkj1');
    expect([...k1.digest]).toEqual([...k2.digest]);
  });

  it('produces different key states for different passwords', () => {
    const k1 = codec_init_key('xrgyrkj1');
    const k2 = codec_init_key('lshbkfg1');
    expect([...k1.digest]).not.toEqual([...k2.digest]);
  });

  it('returns an object with a 5-element digest', () => {
    const k = codec_init_key('any');
    expect(k.digest).toBeInstanceOf(Uint32Array);
    expect(k.digest.length).toBe(5);
  });
});

// ─── codec_decode – rejection paths ───────────────────────────────────────────

describe('codec_decode() – rejection', () => {
  it('returns undefined for data that is 8 bytes or fewer', () => {
    expect(codec_decode(new Uint8Array(0), 'pw')).toBeUndefined();
    expect(codec_decode(new Uint8Array(8), 'pw')).toBeUndefined();
  });

  it('returns undefined when ciphertext is not a multiple of 64 bytes', () => {
    // size = 9 - 8 = 1, which is not a multiple of 64
    expect(codec_decode(new Uint8Array(9), 'pw')).toBeUndefined();
    // size = 72 + 1 - 8 = 65, also not a multiple of 64
    expect(codec_decode(new Uint8Array(73), 'pw')).toBeUndefined();
  });

  it('returns undefined when trailer byte [size+4] is non-zero', () => {
    const buf = new Uint8Array(64 + 8);
    buf[64 + 4] = 0x01; // must be 0
    expect(codec_decode(buf, 'pw')).toBeUndefined();
  });

  it('returns undefined when the checksum does not match', () => {
    // Produce a valid-sized buffer with a deliberately wrong checksum
    const buf = new Uint8Array(64 + 8);
    buf[64 + 5] = 1; // last_size = 1
    const u32 = new Uint32Array(buf.buffer);
    u32[64 / 4] = 0xDEADBEEF; // wrong checksum
    expect(codec_decode(buf, 'pw')).toBeUndefined();
  });
});

// ─── codec_decode – round-trip ────────────────────────────────────────────────

describe('codec_decode() – round-trip via codec_encode()', () => {
  const passwords = ['xrgyrkj1', 'lshbkfg1', 'szqnlsk1'];

  it.each(passwords)('round-trips a single-byte payload (password: %s)', pw => {
    const plain = new Uint8Array([0x42]);
    const encoded = codec_encode(plain, pw);
    const decoded = codec_decode(encoded, pw);
    expect(decoded).toBeInstanceOf(Uint8Array);
    expect([...decoded]).toEqual([...plain]);
  });

  it('round-trips exactly one full block (64 bytes)', () => {
    const plain = new Uint8Array(64).fill(0xAB);
    const encoded = codec_encode(plain, 'xrgyrkj1');
    const decoded = codec_decode(encoded, 'xrgyrkj1');
    expect(decoded).toBeInstanceOf(Uint8Array);
    expect([...decoded]).toEqual([...plain]);
  });

  it('round-trips a payload that spans multiple blocks', () => {
    const plain = new Uint8Array(150);
    for (let i = 0; i < plain.length; ++i) plain[i] = i & 0xFF;
    const encoded = codec_encode(plain, 'xrgyrkj1');
    const decoded = codec_decode(encoded, 'xrgyrkj1');
    expect(decoded).toBeInstanceOf(Uint8Array);
    expect([...decoded]).toEqual([...plain]);
  });

  it('round-trips an all-zero payload', () => {
    const plain = new Uint8Array(128);
    const encoded = codec_encode(plain, 'lshbkfg1');
    const decoded = codec_decode(encoded, 'lshbkfg1');
    expect([...decoded]).toEqual([...plain]);
  });

  it('returns undefined when decoding with the wrong password', () => {
    const plain = new Uint8Array([1, 2, 3, 4]);
    const encoded = codec_encode(plain, 'correct_password');
    expect(codec_decode(encoded, 'wrong_password')).toBeUndefined();
  });

  it('is deterministic: decoding the same buffer twice yields the same result', () => {
    const plain = new Uint8Array([0xFF, 0xAA, 0x55, 0x00]);
    const encoded = codec_encode(plain, 'xrgyrkj1');
    const d1 = codec_decode(encoded, 'xrgyrkj1');
    const d2 = codec_decode(encoded, 'xrgyrkj1');
    expect([...d1]).toEqual([...d2]);
  });
});
