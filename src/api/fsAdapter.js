/**
 * Filesystem adapter — forwards worker fs messages to the storage service.
 *
 * The worker posts `{ action: 'fs', func: 'update'|'delete', params: [...] }`
 * messages whenever the game engine writes or removes a save file.  This
 * adapter decouples the generic message dispatcher in loader.js from the
 * storage API shape.
 */

/**
 * @param {object} fs  The storage service object returned by create_fs().
 * @param {{ onPersistError?: (error: Error, func: string) => void }} [options]
 * @returns {{ handleFs: function, flush: function }}
 */
export function createFsAdapter(fs, options = {}) {
  const { onPersistError } = options;
  // Writes still in flight. The engine saves right before it exits and the
  // app then reloads the page, which would abort these IndexedDB writes.
  const pending = new Set();
  return {
    handleFs({ func, params }) {
      if (typeof fs[func] !== 'function') {
        return;
      }
      let result;
      try {
        result = fs[func](...params);
      } catch (error) {
        if (typeof onPersistError === 'function') {
          onPersistError(error, func);
        }
        return;
      }
      // Support both sync and async storage backends; catch async rejections
      // so quota / private-mode write failures cannot become unhandled.
      const settled = Promise.resolve(result)
        .catch((error) => {
          if (typeof onPersistError === 'function') {
            onPersistError(error, func);
          }
        })
        .finally(() => pending.delete(settled));
      pending.add(settled);
    },

    /**
     * Resolve once every write issued so far has settled, or after `timeoutMs`
     * so a stuck storage backend cannot block the caller forever.
     *
     * @param {number} [timeoutMs]
     * @returns {Promise<void>}
     */
    flush(timeoutMs = 5000) {
      if (pending.size === 0) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const timer = setTimeout(resolve, timeoutMs);
        Promise.all(Array.from(pending)).then(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    },
  };
}
