import { WorkerToMain, MainToWorker } from './workerMessages';

// ─── WorkerToMain ─────────────────────────────────────────────────────────────

describe('WorkerToMain', () => {
  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(WorkerToMain)).toBe(true);
  });

  it('defines all expected outbound message actions', () => {
    const expected = [
      'loaded', 'render', 'audio', 'audioBatch', 'fs',
      'cursor', 'keyboard', 'error', 'failed', 'progress',
      'exit', 'current_save', 'packet', 'packetBatch',
    ];
    const values = Object.values(WorkerToMain);
    for (const action of expected) {
      expect(values).toContain(action);
    }
  });

  it('LOADED is "loaded"', () => {
    expect(WorkerToMain.LOADED).toBe('loaded');
  });

  it('RENDER is "render"', () => {
    expect(WorkerToMain.RENDER).toBe('render');
  });

  it('AUDIO is "audio"', () => {
    expect(WorkerToMain.AUDIO).toBe('audio');
  });

  it('AUDIO_BATCH is "audioBatch"', () => {
    expect(WorkerToMain.AUDIO_BATCH).toBe('audioBatch');
  });

  it('FS is "fs"', () => {
    expect(WorkerToMain.FS).toBe('fs');
  });

  it('ERROR is "error"', () => {
    expect(WorkerToMain.ERROR).toBe('error');
  });

  it('FAILED is "failed"', () => {
    expect(WorkerToMain.FAILED).toBe('failed');
  });

  it('EXIT is "exit"', () => {
    expect(WorkerToMain.EXIT).toBe('exit');
  });

  it('PACKET_BATCH is "packetBatch"', () => {
    expect(WorkerToMain.PACKET_BATCH).toBe('packetBatch');
  });

  it('does not allow mutation', () => {
    expect(() => { WorkerToMain.LOADED = 'tampered'; }).toThrow();
  });
});

// ─── MainToWorker ─────────────────────────────────────────────────────────────

describe('MainToWorker', () => {
  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(MainToWorker)).toBe(true);
  });

  it('defines all expected inbound message actions', () => {
    const expected = ['init', 'event', 'packet', 'packetBatch'];
    const values = Object.values(MainToWorker);
    for (const action of expected) {
      expect(values).toContain(action);
    }
  });

  it('INIT is "init"', () => {
    expect(MainToWorker.INIT).toBe('init');
  });

  it('EVENT is "event"', () => {
    expect(MainToWorker.EVENT).toBe('event');
  });

  it('PACKET is "packet"', () => {
    expect(MainToWorker.PACKET).toBe('packet');
  });

  it('PACKET_BATCH is "packetBatch"', () => {
    expect(MainToWorker.PACKET_BATCH).toBe('packetBatch');
  });

  it('does not allow mutation', () => {
    expect(() => { MainToWorker.INIT = 'tampered'; }).toThrow();
  });
});
