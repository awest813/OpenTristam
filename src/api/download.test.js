import { downloadArrayBuffer, downloadText } from './download';

function makeResponse({ status = 200, chunks = [], headers = {}, stream = true } = {}) {
  const lowerHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)])
  );
  let index = 0;
  const all = () => {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    chunks.forEach((chunk) => {
      out.set(chunk, offset);
      offset += chunk.length;
    });
    return out.buffer;
  };
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => lowerHeaders[name.toLowerCase()] ?? null },
    body: stream
      ? {
          getReader: () => ({
            read: () =>
              Promise.resolve(
                index < chunks.length
                  ? { done: false, value: chunks[index++] }
                  : { done: true, value: undefined }
              ),
          }),
        }
      : null,
    arrayBuffer: () => Promise.resolve(all()),
  };
}

describe('download', () => {
  const originalFetch = global.fetch;
  const originalTextDecoder = global.TextDecoder;

  afterEach(() => {
    global.fetch = originalFetch;
    global.TextDecoder = originalTextDecoder;
  });

  it('streams chunks into one buffer and reports progress against Content-Length', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(
        makeResponse({
          chunks: [new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])],
          headers: { 'Content-Length': 5 },
        })
      )
    );
    const onProgress = jest.fn();

    const buffer = await downloadArrayBuffer('/file.bin', { onProgress });

    expect(global.fetch).toHaveBeenCalledWith('/file.bin');
    expect(Array.from(new Uint8Array(buffer))).toEqual([1, 2, 3, 4, 5]);
    expect(onProgress.mock.calls.map(([e]) => e)).toEqual([
      { loaded: 2, total: 5 },
      { loaded: 5, total: 5 },
    ]);
  });

  it('reports an unknown total for compressed responses', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(
        makeResponse({
          chunks: [new Uint8Array([1, 2, 3])],
          headers: { 'Content-Length': 2, 'Content-Encoding': 'gzip' },
        })
      )
    );
    const onProgress = jest.fn();

    const buffer = await downloadArrayBuffer('/file.wasm', { onProgress });

    expect(buffer.byteLength).toBe(3);
    expect(onProgress).toHaveBeenLastCalledWith({ loaded: 3, total: 0 });
  });

  it('copes with a body longer or shorter than Content-Length', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(
        makeResponse({
          chunks: [new Uint8Array([1, 2]), new Uint8Array([3, 4])],
          headers: { 'Content-Length': 3 },
        })
      )
    );
    expect(Array.from(new Uint8Array(await downloadArrayBuffer('/a')))).toEqual([1, 2, 3, 4]);

    global.fetch = jest.fn(() =>
      Promise.resolve(
        makeResponse({ chunks: [new Uint8Array([7])], headers: { 'Content-Length': 4 } })
      )
    );
    expect(Array.from(new Uint8Array(await downloadArrayBuffer('/b')))).toEqual([7]);
  });

  it('falls back to arrayBuffer() when the body is not streamable', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(makeResponse({ chunks: [new Uint8Array([9, 8])], stream: false }))
    );
    const onProgress = jest.fn();

    const buffer = await downloadArrayBuffer('/c', { onProgress });

    expect(Array.from(new Uint8Array(buffer))).toEqual([9, 8]);
    expect(onProgress).toHaveBeenCalledWith({ loaded: 2, total: 2 });
  });

  it('rejects HTTP errors with an axios-compatible message', async () => {
    global.fetch = jest.fn(() => Promise.resolve(makeResponse({ status: 404 })));
    await expect(downloadArrayBuffer('/missing')).rejects.toThrow(
      'Request failed with status code 404'
    );
  });

  it('propagates network failures from fetch', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(downloadArrayBuffer('/offline')).rejects.toThrow('Failed to fetch');
  });

  it('decodes text responses', async () => {
    global.TextDecoder =
      originalTextDecoder ||
      class {
        decode(buffer) {
          return String.fromCharCode(...new Uint8Array(buffer));
        }
      };
    global.fetch = jest.fn(() =>
      Promise.resolve(makeResponse({ chunks: [new Uint8Array([104, 105])] }))
    );
    await expect(downloadText('/list.txt')).resolves.toBe('hi');
  });
});
