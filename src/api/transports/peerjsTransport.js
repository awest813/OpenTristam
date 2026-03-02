import webrtc_open from '../webrtc';

/**
 * PeerJS transport adapter.
 *
 * @param {(packet: ArrayBuffer | Uint8Array) => void} onPacket
 * @returns {{send: function, dispose: function}}
 */
export function createPeerJsTransport(onPacket) {
  const webrtc = webrtc_open(onPacket);
  return {
    send(packet) {
      webrtc.send(packet);
    },
    dispose() {
      // Current WebRTC implementation is packet-driven and does not expose
      // explicit teardown. Keeping this hook gives us a stable Transport API.
    },
  };
}
