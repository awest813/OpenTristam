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
 * @returns {{ handleFs: function }}
 */
export function createFsAdapter(fs) {
  return {
    handleFs({func, params}) {
      fs[func](...params);
    },
  };
}
