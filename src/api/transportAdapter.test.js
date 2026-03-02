import { createTransportAdapter } from './transportAdapter';

function makeWorker() {
  return {postMessage: jest.fn()};
}

function makeWebRtc() {
  return {send: jest.fn()};
}

// ─── packet queue flushing ────────────────────────────────────────────────────

describe('createTransportAdapter — packet queue', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('does not send immediately when a packet is enqueued', () => {
    const worker = makeWorker();
    const adapter = createTransportAdapter(worker, makeWebRtc());

    adapter.enqueue(new ArrayBuffer(4));
    expect(worker.postMessage).not.toHaveBeenCalled();
    adapter.dispose();
  });

  it('flushes queued packets to the worker after 20 ms', () => {
    const worker = makeWorker();
    const adapter = createTransportAdapter(worker, makeWebRtc());

    adapter.enqueue(new ArrayBuffer(4));
    adapter.enqueue(new ArrayBuffer(8));

    jest.advanceTimersByTime(20);

    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    const [msg] = worker.postMessage.mock.calls[0];
    expect(msg.action).toBe('packetBatch');
    expect(msg.batch).toHaveLength(2);
    adapter.dispose();
  });

  it('does not flush when the queue is empty', () => {
    const worker = makeWorker();
    const adapter = createTransportAdapter(worker, makeWebRtc());

    jest.advanceTimersByTime(40);
    expect(worker.postMessage).not.toHaveBeenCalled();
    adapter.dispose();
  });

  it('clears the queue after flushing so the next tick starts empty', () => {
    const worker = makeWorker();
    const adapter = createTransportAdapter(worker, makeWebRtc());

    adapter.enqueue(new ArrayBuffer(4));
    jest.advanceTimersByTime(20);
    expect(worker.postMessage).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(20);
    expect(worker.postMessage).toHaveBeenCalledTimes(1); // no second flush
    adapter.dispose();
  });
});

// ─── lifecycle / dispose ──────────────────────────────────────────────────────

describe('createTransportAdapter — dispose', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('stops flushing after dispose()', () => {
    const worker = makeWorker();
    const adapter = createTransportAdapter(worker, makeWebRtc());

    adapter.enqueue(new ArrayBuffer(4));
    adapter.dispose();

    jest.advanceTimersByTime(100);
    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it('is safe to call dispose() more than once', () => {
    const adapter = createTransportAdapter(makeWorker(), makeWebRtc());
    adapter.dispose();
    expect(() => adapter.dispose()).not.toThrow();
  });
});

// ─── outbound routing (worker → peer) ────────────────────────────────────────

describe('createTransportAdapter — send / sendBatch', () => {
  it('send() forwards a single packet to the webrtc peer', () => {
    const webrtc = makeWebRtc();
    const adapter = createTransportAdapter(makeWorker(), webrtc);

    const buf = new Uint8Array([1, 2, 3]);
    adapter.send(buf);

    expect(webrtc.send).toHaveBeenCalledWith(buf);
    adapter.dispose();
  });

  it('sendBatch() forwards each packet in the batch to the webrtc peer', () => {
    const webrtc = makeWebRtc();
    const adapter = createTransportAdapter(makeWorker(), webrtc);

    const batch = [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])];
    adapter.sendBatch(batch);

    expect(webrtc.send).toHaveBeenCalledTimes(3);
    expect(webrtc.send).toHaveBeenNthCalledWith(1, batch[0]);
    expect(webrtc.send).toHaveBeenNthCalledWith(2, batch[1]);
    expect(webrtc.send).toHaveBeenNthCalledWith(3, batch[2]);
    adapter.dispose();
  });

  it('send() is a no-op when webrtc is null', () => {
    const adapter = createTransportAdapter(makeWorker(), null);
    expect(() => adapter.send(new Uint8Array([1]))).not.toThrow();
    adapter.dispose();
  });

  it('sendBatch() is a no-op when webrtc is null', () => {
    const adapter = createTransportAdapter(makeWorker(), null);
    expect(() => adapter.sendBatch([new Uint8Array([1])])).not.toThrow();
    adapter.dispose();
  });
});

// ─── setWebRtc ───────────────────────────────────────────────────────────────

describe('createTransportAdapter — setWebRtc', () => {
  it('send() uses a webrtc instance injected after construction', () => {
    const webrtc = makeWebRtc();
    const adapter = createTransportAdapter(makeWorker(), null);

    adapter.setWebRtc(webrtc);
    adapter.send(new Uint8Array([42]));

    expect(webrtc.send).toHaveBeenCalledTimes(1);
    adapter.dispose();
  });
});
