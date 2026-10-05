/**
 * Minimal fetch-based downloader with progress, used by the main thread and
 * workers in place of axios.
 *
 * Errors keep axios's wording ("Request failed with status code 404") so the
 * friendly-copy rules in errorReporter keep matching; network failures surface
 * as fetch's own "Failed to fetch" / "Load failed" TypeErrors.
 */

function contentLength(response) {
  // With a content-encoding the header counts compressed bytes while the
  // stream yields decoded ones, so it cannot be used as a progress total.
  const encoding = response.headers.get('content-encoding');
  if (encoding && encoding !== 'identity') {
    return 0;
  }
  const length = Number(response.headers.get('content-length'));
  return Number.isFinite(length) && length > 0 ? length : 0;
}

async function readBody(response, onProgress) {
  const total = contentLength(response);
  const reader = response.body && response.body.getReader ? response.body.getReader() : null;
  if (!reader) {
    const buffer = await response.arrayBuffer();
    if (onProgress) {
      onProgress({ loaded: buffer.byteLength, total: total || buffer.byteLength });
    }
    return buffer;
  }

  // Write straight into a preallocated buffer when the size is known, so a
  // 50 MB archive does not briefly need twice the memory.
  let target = total ? new Uint8Array(total) : null;
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (target && loaded + value.byteLength <= target.byteLength) {
      target.set(value, loaded);
    } else {
      if (target) {
        // Server sent more than it announced; fall back to collecting chunks.
        chunks.push(target.subarray(0, loaded));
        target = null;
      }
      chunks.push(value);
    }
    loaded += value.byteLength;
    if (onProgress) {
      onProgress({ loaded, total });
    }
  }

  if (total && loaded < total) {
    // The connection closed early. Surface it as a network failure rather than
    // handing a truncated file (e.g. half a .wasm) to the caller.
    throw new Error(`Network error: download ended early (${loaded} of ${total} bytes)`);
  }
  if (target) {
    // Exactly `total` bytes were written (shorter throws above, longer
    // switched to chunk collection).
    return target.buffer;
  }
  const result = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result.buffer;
}

/**
 * Download a URL as an ArrayBuffer.
 *
 * @param {string} url
 * @param {{onProgress?: function({loaded: number, total: number}): void}} [options]
 *   `total` is 0 when the size is unknown.
 * @returns {Promise<ArrayBuffer>}
 */
export async function downloadArrayBuffer(url, { onProgress } = {}) {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`Request failed with status code ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return readBody(response, onProgress);
}

/**
 * Download a URL as text.
 *
 * @param {string} url
 * @param {{onProgress?: function({loaded: number, total: number}): void}} [options]
 * @returns {Promise<string>}
 */
export async function downloadText(url, options) {
  const buffer = await downloadArrayBuffer(url, options);
  return new TextDecoder().decode(buffer);
}
