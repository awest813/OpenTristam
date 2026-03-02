/**
 * Formal typed message schemas for the main-thread ↔ GameWorker boundary.
 *
 * WorkerToMain: messages posted by game.worker.js to the main thread.
 * MainToWorker: messages posted by the main thread to game.worker.js.
 *
 * Using these constants throughout loader.js and game.worker.js eliminates
 * implicit string coupling and makes the full message contract visible in one
 * place.
 */

export const WorkerToMain = Object.freeze({
  /** Worker finished initialization and is ready to receive events. */
  LOADED: 'loaded',
  /** Worker has a render frame ready (bitmap or legacy image batch). */
  RENDER: 'render',
  /** Single audio operation (create / play / stop / delete / volume). */
  AUDIO: 'audio',
  /** Batched audio operations accumulated during a single game tick. */
  AUDIO_BATCH: 'audioBatch',
  /** Filesystem write / delete request to be forwarded to IndexedDB. */
  FS: 'fs',
  /** Worker is requesting the on-screen cursor position to be updated. */
  CURSOR: 'cursor',
  /** Worker is requesting the virtual keyboard to open or close. */
  KEYBOARD: 'keyboard',
  /** Recoverable game error — worker has already stopped. */
  ERROR: 'error',
  /** Fatal initialization failure — game could not start. */
  FAILED: 'failed',
  /** Asset / WASM load progress update. */
  PROGRESS: 'progress',
  /** Game exited cleanly. */
  EXIT: 'exit',
  /** Active save-file slot changed. */
  CURRENT_SAVE: 'current_save',
  /** Single outbound network packet to be forwarded via WebRTC. */
  PACKET: 'packet',
  /** Batch of outbound network packets accumulated during a game tick. */
  PACKET_BATCH: 'packetBatch',
});

export const MainToWorker = Object.freeze({
  /** Bootstrap the game engine with filesystem contents and WASM binary. */
  INIT: 'init',
  /** Deliver a game-engine API event (keyboard / mouse / etc.). */
  EVENT: 'event',
  /** Deliver a single inbound network packet received from a peer. */
  PACKET: 'packet',
  /** Deliver a batch of inbound network packets. */
  PACKET_BATCH: 'packetBatch',
});
