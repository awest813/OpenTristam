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
 * @param {{onError?: function}} [hooks] Optional error sink for failed writes.
 * @returns {{ handleFs: function }}
 */
export function createFsAdapter(fs, hooks = {}) {
  const onError = hooks.onError || (() => {});
  return {
    handleFs({ func, params }) {
      if (!fs || typeof fs[func] !== 'function') {
        return;
      }
      try {
        const result = fs[func](...(params || []));
        Promise.resolve(result).catch((error) => {
          onError(error && error.message ? error.message : 'Save storage write failed');
        });
      } catch (error) {
        onError(error && error.message ? error.message : 'Save storage write failed');
      }
    },
  };
}
