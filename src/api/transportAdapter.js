/**
 * Transport adapter — manages the inbound packet queue between WebRTC and the
 * game worker, and routes outbound packets from the worker to WebRTC.
 *
 * The worker runs its game loop on a fixed 50 ms render interval and batches
 * outbound packets internally. Inbound packets (received from remote peers via
 * WebRTC) are buffered here and flushed to the worker every 20 ms to decouple
 * peer-message arrival timing from the worker's event-processing cadence.
 *
 * Calling dispose() clears the flush interval so no intervals leak after the
 * game session ends.  It is safe to call dispose() more than once.
 */

import { MainToWorker } from './workerMessages';

/**
 * @param {Worker}  worker  The GameWorker instance to send batched packets to.
 * @param {object}  transport  The transport object (must have a .send() method).
 *                             May be set later via setTransport() if not available at
 *                          construction time.
 * @returns {{
 *   enqueue: function,
 *   setTransport: function,
 *   setWebRtc: function,
 *   send: function,
 *   sendBatch: function,
 *   dispose: function,
 * }}
 */
export function createTransportAdapter(worker, transport) {
  let queue = [];
  let flushIntervalId = setInterval(() => {
    if (queue.length) {
      const batch = queue;
      queue = [];
      worker.postMessage({action: MainToWorker.PACKET_BATCH, batch}, batch);
    }
  }, 20);

  return {
    /** Enqueue a packet received from a remote peer to be forwarded to the worker. */
    enqueue(data) {
      queue.push(data);
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
      if (transport) {
        transport.send(buffer);
      }
    },

    /** Forward a batch of outbound packets from the worker to the WebRTC peer. */
    sendBatch(batch) {
      if (transport) {
        for (const packet of batch) {
          transport.send(packet);
        }
      }
    },

    /**
     * Stop the flush interval.  Must be called when the game session ends to
     * prevent interval leaks.  Safe to call multiple times.
     */
    dispose() {
      if (flushIntervalId !== null) {
        clearInterval(flushIntervalId);
        flushIntervalId = null;
      }
    },
  };
}
