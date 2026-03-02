/**
 * Experimental WebSocket transport adapter.
 *
 * This implements the same send/dispose interface as PeerJS transport and can
 * be selected as a fallback path while multiplayer reliability work continues.
 *
 * @param {{url: string}} options
 * @param {(packet: ArrayBuffer | Uint8Array) => void} onPacket
 * @returns {{send: function, dispose: function}}
 */
export function createWebSocketTransport(options, onPacket) {
  const socket = new WebSocket(options.url);
  socket.binaryType = 'arraybuffer';

  socket.addEventListener('message', event => {
    if (event.data) {
      onPacket(event.data);
    }
  });

  return {
    send(packet) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(packet);
      }
    },
    dispose() {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    },
  };
}
