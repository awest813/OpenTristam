/**
 * Audio adapter — forwards worker audio messages to the Web Audio API.
 *
 * Wraps the `init_sound()` audio object so that the generic worker message
 * handler in loader.js only needs to call `handleAudio` / `handleAudioBatch`
 * rather than knowing the internal audio API shape.  `dispose()` stops all
 * active sounds and closes the AudioContext.
 */

/**
 * @param {object} audio  The audio object returned by init_sound().
 * @returns {{ handleAudio: function, handleAudioBatch: function, dispose: function }}
 */
export function createAudioAdapter(audio) {
  return {
    handleAudio({func, params}) {
      audio[func](...params);
    },

    handleAudioBatch({batch}) {
      for (const {func, params} of batch) {
        audio[func](...params);
      }
    },

    dispose() {
      audio.stop_all();
    },
  };
}
