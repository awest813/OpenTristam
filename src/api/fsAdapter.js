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
 * @returns {{ handleFs: function }}
 */
export function createFsAdapter(fs, options = {}) {
  const { onPersistError } = options;
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
      Promise.resolve(result).catch((error) => {
        if (typeof onPersistError === 'function') {
          onPersistError(error, func);
        }
      });
    },
  };
}
