import codec_decode, { codec_init_key } from './codec';

function codec_encode(result, password) {
  const size = Math.ceil(result.length / 64) * 64;
  let last_size = result.length % 64;
  if (last_size === 0) {
    last_size = 64;
  }

  const data = new Uint8Array(size + 8);
  data[size + 5] = last_size;

  const sha = codec_init_key(password);
  const size32 = size >> 2;
  const data32 = new Uint32Array(data.buffer, data.byteOffset, size32 + 1);
  const buf32 = new Uint32Array(16);
  const buf = new Uint8Array(buf32.buffer);

  for (let i = 0; i < size32; i += 16) {
    buf.fill(0);
    const copySize = (i === size32 - 16) ? last_size : 64;
    buf.set(result.subarray(i * 4, i * 4 + copySize));

    for (let j = 0; j < 16; ++j) {
      data32[i + j] = buf32[j] ^ sha.digest[j % sha.digest.length];
    }
    sha.input(buf32);
  }
  data32[size32] = sha.digest[0];
  return data;
}

describe('codec_decode', () => {
  const password = "mysecretpassword";

  test('happy path: correctly decodes valid encoded data (small size)', () => {
    const origData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const encoded = codec_encode(origData, password);
    const decoded = codec_decode(encoded, password);
    expect(decoded).toEqual(origData);
  });

  test('happy path: correctly decodes valid encoded data (large size)', () => {
    const origData = new Uint8Array(150);
    for (let i = 0; i < 150; i++) {
      origData[i] = i % 256;
    }
    const encoded = codec_encode(origData, password);
    const decoded = codec_decode(encoded, password);
    expect(decoded).toEqual(origData);
  });

  test('happy path: correctly decodes valid encoded data (exact 64 boundary)', () => {
    const origData = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      origData[i] = i % 256;
    }
    const encoded = codec_encode(origData, password);
    const decoded = codec_decode(encoded, password);
    expect(decoded).toEqual(origData);
  });

  test('error condition: decoding with incorrect password returns undefined', () => {
    const origData = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = codec_encode(origData, password);
    const decoded = codec_decode(encoded, "wrongpassword");
    expect(decoded).toBeUndefined();
  });

  test('edge case: decoding data that is too short returns undefined', () => {
    const shortData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]); // length <= 8
    const decoded = codec_decode(shortData, password);
    expect(decoded).toBeUndefined();
  });

  test('edge case: decoding data that is not a multiple of 64 (+8) returns undefined', () => {
    const origData = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = codec_encode(origData, password);
    const badEncoded = new Uint8Array(encoded.length - 1);
    badEncoded.set(encoded.subarray(0, encoded.length - 1)); // size will be 71, not 72 (multiple of 64 + 8)
    const decoded = codec_decode(badEncoded, password);
    expect(decoded).toBeUndefined();
  });

  test('edge case: data[size + 4] is non-zero returns undefined', () => {
    const origData = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = codec_encode(origData, password);
    const size = encoded.length - 8;
    // Mutate the specific flag check byte
    encoded[size + 4] = 1;
    const decoded = codec_decode(encoded, password);
    expect(decoded).toBeUndefined();
  });

  test('error condition: corrupted data returns undefined', () => {
    const origData = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = codec_encode(origData, password);
    // Corrupt one byte of the payload
    encoded[10] ^= 0xFF;
    const decoded = codec_decode(encoded, password);
    expect(decoded).toBeUndefined();
  });
});
