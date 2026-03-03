/**
 * Transport adapter — manages the inbound packet queue between WebRTC and the
 * game worker, and routes outbound packets from the worker to WebRTC.
 *
 * The worker runs its game loop on a fixed 50 ms render interval and batches
 * outbound packets internally. Inbound packets (received from remote peers via
 * WebRTC) are buffered here and flushed to the worker 20 ms after enqueue to
 * decouple peer-message arrival timing from the worker's event-processing cadence.
 *
 * Calling dispose() clears any pending flush timer so no timers leak after the
 * game session ends. It is safe to call dispose() more than once.
 */

import { MainToWorker } from './workerMessages';

/**
 * @param {Worker}  worker  The GameWorker instance to send batched packets to.
 * @param {object}  transport  The transport object (must have a .send() method).
 *                             May be set later via setTransport() if not available at
 *                          construction time.
 * @param {{
 *   onInboundPacket?: function,
 *   onOutboundPacket?: function,
 * }} hooks
 * @returns {{
 *   enqueue: function,
 *   setTransport: function,
 *   setWebRtc: function,
 *   send: function,
 *   sendBatch: function,
 *   dispose: function,
 * }}
 */
export function createTransportAdapter(worker, transport, hooks = {}) {
  const onInboundPacket = hooks.onInboundPacket || (() => {});
  const onOutboundPacket = hooks.onOutboundPacket || (() => {});
  let queue = [];
  let flushTimeoutId = null;
  const flushQueue = () => {
    flushTimeoutId = null;
    if (queue.length) {
      const batch = queue;
      queue = [];
      worker.postMessage({action: MainToWorker.PACKET_BATCH, batch}, batch);
    }
  };

  return {
    /** Enqueue a packet received from a remote peer to be forwarded to the worker. */
    enqueue(data) {
      queue.push(data);
      onInboundPacket(data);
      if (flushTimeoutId === null) {
        flushTimeoutId = setTimeout(flushQueue, 20);
      }
    },

    /** Inject or replace the transport session after construction. */
    setTransport(nextTransport) {
      transport = nextTransport;
    },

    /** @deprecated Use setTransport() instead. */
    setWebRtc(w) {
      transport = w;
    },

    /** Forward a single outbound packet from the worker to the WebRTC peer. */
    send(buffer) {
      onOutboundPacket(buffer, {batched: false});
      if (transport) {
        transport.send(buffer);
      }
    },

    /** Forward a batch of outbound packets from the worker to the WebRTC peer. */
    sendBatch(batch) {
      if (transport) {
        batch.forEach((packet, index) => {
          onOutboundPacket(packet, {batched: true, index, size: batch.length});
          transport.send(packet);
        });
      }
    },

    /**
     * Stop any pending flush timer. Must be called when the game session ends
     * to prevent timer leaks. Any queued-but-unflushed packets are dropped.
     * Safe to call multiple times.
     */
    dispose() {
      if (flushTimeoutId !== null) {
        clearTimeout(flushTimeoutId);
        flushTimeoutId = null;
      }
      queue = [];
    },
  };
}
