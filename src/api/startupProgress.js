/**
 * Startup progress coordinator.
 *
 * First-launch shareware boots in two sequential phases that live in different
 * contexts and each report their own 0→100% stream:
 *   1. the asset download (spawn.mpq, ~25 MB) on the main thread, and
 *   2. the worker's WASM/MPQ load.
 *
 * Surfacing both streams verbatim makes the loading bar fill, snap back to 0%,
 * and fill again — reading as "stuck, then restarting". This coordinator folds
 * the two phases into a single monotonic `percent` so the bar only ever moves
 * forward. The download is given the lion's share of the bar since it
 * dominates wall-clock time; the worker load finishes the remainder.
 *
 * When there is no download phase (retail, or cached shareware), the worker
 * load owns the whole bar — matching the original single-stream behaviour.
 */

const DEFAULT_DOWNLOAD_SHARE = 0.9;

/**
 * @param {{onProgress?: function}} api Object exposing onProgress(progress).
 * @param {{downloadShare?: number}} [options]
 * @returns {{download: function, worker: function}}
 */
export function createStartupProgress(api, { downloadShare = DEFAULT_DOWNLOAD_SHARE } = {}) {
  let lastPercent = 0;
  let downloadSeen = false;

  const report = (text, fraction, extra) => {
    if (!api || typeof api.onProgress !== 'function') {
      return;
    }
    let percent = lastPercent;
    if (Number.isFinite(fraction)) {
      const clamped = Math.max(0, Math.min(1, fraction));
      // Never move backwards, even if a later phase reports a lower local ratio.
      percent = Math.max(lastPercent, clamped * 100);
      lastPercent = percent;
    }
    api.onProgress({ text, percent, ...(extra || {}) });
  };

  return {
    // Main-thread asset download phase. Real byte counts are forwarded so the
    // UI can show "X MB / Y MB" for the large download.
    download({ text, loaded, total }) {
      downloadSeen = true;
      const fraction = total > 0 ? (loaded / total) * downloadShare : null;
      report(text || 'Downloading...', fraction, { loaded, total });
    },

    // Worker WASM/MPQ load phase. After a fresh download we suppress the byte
    // readout so it does not jarringly swap the ~25 MB total for the tiny WASM
    // total; when the worker load is the primary phase we keep it.
    worker({ text, loaded, total }) {
      const base = downloadSeen ? downloadShare : 0;
      const span = 1 - base;
      const fraction = total > 0 ? base + (loaded / total) * span : null;
      const extra = downloadSeen ? undefined : { loaded, total };
      report(text, fraction, extra);
    },
  };
}
