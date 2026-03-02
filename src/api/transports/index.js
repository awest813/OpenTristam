import { createPeerJsTransport } from './peerjsTransport';
import { createWebSocketTransport } from './websocketTransport';

/**
 * @typedef {{send: function, dispose: function}} Transport
 */

/**
 * Build a multiplayer transport implementation.
 *
 * @param {{kind?: 'peerjs'|'websocket', websocketUrl?: string}} options
 * @param {(packet: ArrayBuffer | Uint8Array) => void} onPacket
 * @returns {Transport}
 */
export function createTransport(options = {}, onPacket) {
  const kind = options.kind || 'peerjs';

  if (kind === 'websocket') {
    if (!options.websocketUrl) {
      throw new Error('websocketUrl is required when kind is websocket');
    }
    return createWebSocketTransport({url: options.websocketUrl}, onPacket);
  }

  return createPeerJsTransport(onPacket);
}
