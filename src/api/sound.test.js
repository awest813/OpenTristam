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

  beforeEach(() => {
    mockSource = {
      connect: jest.fn().mockReturnThis(),
      start: jest.fn(),
      stop: jest.fn(),
      buffer: null,
      loop: false,
    };
    mockGain = {
      gain: { value: 1 },
      connect: jest.fn().mockReturnThis(),
    };
    mockContext = {
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
    delete window.webkitAudioContext;

    audio = init_sound();
  });

  afterEach(() => {
    delete window.AudioContext;
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

  it('stop_all() closes the AudioContext', () => {
    audio.stop_all();
    expect(mockContext.close).toHaveBeenCalledTimes(1);
  });

  it('stop_all() is safe to call a second time after context is null', () => {
    audio.stop_all();
    expect(() => audio.stop_all()).not.toThrow();
  });
});
