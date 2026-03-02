import init_sound from './sound';

// ─── no_sound fallback ─────────────────────────────────────────────────────────
//
// When AudioContext is unavailable the module must return a complete stub so
// that callers (loader.js, game.worker.js) can safely call every audio method
// without a runtime TypeError.

describe('no_sound fallback (no AudioContext)', () => {
  let savedAudioContext;
  let savedWebkitAudioContext;
  let audio;

  beforeEach(() => {
    savedAudioContext = window.AudioContext;
    savedWebkitAudioContext = window.webkitAudioContext;
    delete window.AudioContext;
    delete window.webkitAudioContext;
    audio = init_sound();
  });

  afterEach(() => {
    if (savedAudioContext !== undefined) window.AudioContext = savedAudioContext;
    if (savedWebkitAudioContext !== undefined) window.webkitAudioContext = savedWebkitAudioContext;
  });

  const requiredMethods = [
    'create_sound_raw',
    'create_sound',
    'duplicate_sound',
    'play_sound',
    'set_volume',
    'stop_sound',
    'delete_sound',
    'stop_all',
  ];

  it.each(requiredMethods)('exposes callable method: %s', method => {
    expect(typeof audio[method]).toBe('function');
    expect(() => audio[method](0, new Uint8Array(4), 100, 1, 44100)).not.toThrow();
  });

  it('stop_all() does not throw', () => {
    expect(() => audio.stop_all()).not.toThrow();
  });
});

// ─── live sound API (with AudioContext mock) ───────────────────────────────────

describe('init_sound() with AudioContext', () => {
  let audio;
  let mockContext;
  let mockSource;
  let mockGain;
  let mockPanner;

  beforeEach(() => {
    mockSource = {
      connect: jest.fn().mockReturnThis(),
      start: jest.fn(),
      stop: jest.fn(),
      disconnect: jest.fn(),
      buffer: null,
      loop: false,
    };
    mockGain = {
      gain: { value: 1 },
      connect: jest.fn().mockReturnThis(),
      disconnect: jest.fn(),
    };
    mockPanner = {
      pan: { value: 0 },
      connect: jest.fn().mockReturnThis(),
      disconnect: jest.fn(),
    };
    mockContext = {
      state: 'running',
      resume: jest.fn(),
      close: jest.fn(),
      createBuffer: jest.fn((channels, length) => ({
        getChannelData: jest.fn(() => new Float32Array(length)),
      })),
      createBufferSource: jest.fn(() => mockSource),
      createGain: jest.fn(() => mockGain),
      decodeAudioData: jest.fn((buf, resolve) => resolve({/* decoded buffer */})),
      destination: {},
    };

    window.AudioContext = jest.fn(() => mockContext);
    window.StereoPannerNode = jest.fn(() => mockPanner);
    delete window.webkitAudioContext;

    audio = init_sound();
  });

  afterEach(() => {
    delete window.AudioContext;
    delete window.StereoPannerNode;
  });

  it('calls context.resume() on creation', () => {
    expect(mockContext.resume).toHaveBeenCalledTimes(1);
  });

  it('set_volume() on a nonexistent id is a no-op', () => {
    expect(() => audio.set_volume(999, 500)).not.toThrow();
  });

  it('stop_sound() on a nonexistent id is a no-op', () => {
    expect(() => audio.stop_sound(999)).not.toThrow();
  });

  it('delete_sound() on a nonexistent id is a no-op', () => {
    expect(() => audio.delete_sound(999)).not.toThrow();
  });

  it('create_sound_raw() registers the sound and set_volume changes its gain', () => {
    const raw = new Uint8Array(4);
    audio.create_sound_raw(0, raw, 4, 1, 44100);
    audio.set_volume(0, 0); // 2^(0/1000) = 1.0
    expect(mockGain.gain.value).toBeCloseTo(1.0, 3);
  });

  // ─── gain/panner chain wired once at creation ───────────────────────────────
  //
  // The persistent gain → panner → destination chain must be connected at sound
  // creation, not inside play_sound.  Wiring it in play_sound would add an
  // extra parallel path on every replay, escalating volume by N× after N plays.

  it('create_sound_raw() connects gain→panner→destination exactly once', () => {
    audio.create_sound_raw(0, new Uint8Array(4), 4, 1, 44100);
    // gain.connect should have been called with panner and destination
    expect(mockGain.connect).toHaveBeenCalledWith(mockPanner);
    expect(mockPanner.connect).toHaveBeenCalledWith(mockContext.destination);
  });

  it('play_sound() does not add extra connections to gain/panner on repeated calls', async () => {
    audio.create_sound_raw(0, new Uint8Array(4), 4, 1, 44100);

    const connectCallsAfterCreate = mockGain.connect.mock.calls.length;

    audio.play_sound(0, 0, 0, false);
    await Promise.resolve();
    audio.play_sound(0, 0, 0, false);
    await Promise.resolve();

    // gain.connect must not have been called any extra times — the source→gain
    // connection is handled by mockSource.connect, not mockGain.connect.
    expect(mockGain.connect.mock.calls.length).toBe(connectCallsAfterCreate);
  });

  it('play_sound() connects source → gain only (not source → gain → panner again)', async () => {
    audio.create_sound_raw(0, new Uint8Array(4), 4, 1, 44100);
    audio.play_sound(0, 0, 0, false);
    await Promise.resolve();
    // The BufferSource should be connected to gain
    expect(mockSource.connect).toHaveBeenCalledWith(mockGain);
    // The panner must NOT be an argument to mockSource.connect
    const sourceConnectArgs = mockSource.connect.mock.calls.flat();
    expect(sourceConnectArgs).not.toContain(mockPanner);
  });

  // ─── suspended context ──────────────────────────────────────────────────────

  it('play_sound() calls context.resume() when context is suspended', async () => {
    mockContext.state = 'suspended';
    audio.create_sound_raw(0, new Uint8Array(4), 4, 1, 44100);
    audio.play_sound(0, 0, 0, false);
    await Promise.resolve();
    // Called once on init and once on play
    expect(mockContext.resume).toHaveBeenCalledTimes(2);
  });

  it('play_sound() does not call context.resume() when context is already running', async () => {
    mockContext.state = 'running';
    audio.create_sound_raw(0, new Uint8Array(4), 4, 1, 44100);
    audio.play_sound(0, 0, 0, false);
    await Promise.resolve();
    // Only the initial resume() call
    expect(mockContext.resume).toHaveBeenCalledTimes(1);
  });

  // ─── play_sound() guard after stop_all ─────────────────────────────────────

  it('play_sound() is a no-op after stop_all() closes the context', () => {
    audio.create_sound_raw(0, new Uint8Array(4), 4, 1, 44100);
    audio.stop_all();
    expect(() => audio.play_sound(0, 0, 0, false)).not.toThrow();
  });

  // ─── delete_sound() cleanup ─────────────────────────────────────────────────

  it('delete_sound() disconnects gain and panner from the audio graph', () => {
    audio.create_sound_raw(0, new Uint8Array(4), 4, 1, 44100);
    audio.delete_sound(0);
    expect(mockPanner.disconnect).toHaveBeenCalled();
    expect(mockGain.disconnect).toHaveBeenCalled();
  });

  it('delete_sound() removes the sound so further calls are no-ops', () => {
    audio.create_sound_raw(0, new Uint8Array(4), 4, 1, 44100);
    audio.delete_sound(0);
    expect(() => audio.set_volume(0, 500)).not.toThrow();
    expect(() => audio.stop_sound(0)).not.toThrow();
  });

  // ─── stop_all() ────────────────────────────────────────────────────────────

  it('stop_all() closes the AudioContext', () => {
    audio.stop_all();
    expect(mockContext.close).toHaveBeenCalledTimes(1);
  });

  it('stop_all() is safe to call a second time after context is null', () => {
    audio.stop_all();
    expect(() => audio.stop_all()).not.toThrow();
  });

  it('stop_all() disconnects gain and panner for each registered sound', () => {
    audio.create_sound_raw(0, new Uint8Array(4), 4, 1, 44100);
    audio.stop_all();
    expect(mockPanner.disconnect).toHaveBeenCalled();
    expect(mockGain.disconnect).toHaveBeenCalled();
  });

  // ─── duplicate_sound() ─────────────────────────────────────────────────────

  it('duplicate_sound() shares the source buffer but gets its own gain node', () => {
    audio.create_sound_raw(0, new Uint8Array(4), 4, 1, 44100);

    // Reset call counts before duplicating so we can count the new wiring.
    mockGain.connect.mockClear();
    mockPanner.connect.mockClear();

    // createGain is called once per sound; the duplicate should get a fresh one.
    audio.duplicate_sound(1, 0);
    expect(mockContext.createGain).toHaveBeenCalledTimes(2);
    // The duplicate's chain must also be wired at creation time.
    expect(mockGain.connect).toHaveBeenCalledWith(mockPanner);
    expect(mockPanner.connect).toHaveBeenCalledWith(mockContext.destination);
  });

  it('duplicate_sound() on a nonexistent srcId is a no-op', () => {
    expect(() => audio.duplicate_sound(1, 999)).not.toThrow();
  });
});
