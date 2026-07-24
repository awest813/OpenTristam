import {
  startGame,
  handleGameError,
  handleGameExit,
  handleProgress,
  resetToStart,
  setCurrentSave,
  setCursorPos,
} from './session';

// ─── handleGameError ─────────────────────────────────────────────────────────

jest.mock('sourcemapped-stacktrace', () => ({
  mapStackTrace: jest.fn((stack, cb) => cb([stack])),
}));

// ─── startGame ───────────────────────────────────────────────────────────────

describe('startGame', () => {
  function makeApp(overrides = {}) {
    return {
      state: { show_saves: false, loading: false, started: false },
      setState: jest.fn(),
      fileDropTarget: { detach: jest.fn() },
      onSaveUploaded: jest.fn(),
      showStartupNotice: jest.fn(),
      ...overrides,
    };
  }

  it('shows an error notice for a non-MPQ file and does not launch', () => {
    const app = makeApp();
    startGame(app, { name: 'screenshot.png' });
    expect(app.showStartupNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: 'error' }));
    expect(app.fileDropTarget.detach).not.toHaveBeenCalled();
    expect(app.setState).not.toHaveBeenCalled();
  });

  it('does not launch a second time while already loading', () => {
    const app = makeApp({ state: { show_saves: false, loading: true, started: false } });
    startGame(app, null);
    expect(app.fileDropTarget.detach).not.toHaveBeenCalled();
    expect(app.showStartupNotice).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/Already loading/i) })
    );
  });

  it('does not launch again once a game has started', () => {
    const app = makeApp({ state: { show_saves: false, loading: false, started: true } });
    startGame(app, null);
    expect(app.fileDropTarget.detach).not.toHaveBeenCalled();
    expect(app.showStartupNotice).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/already running/i) })
    );
  });

  it('imports a .sv save file and reports a notice', async () => {
    const files = new Map();
    const upload = jest.fn(async (file) => {
      files.set(file.name.toLowerCase(), new Uint8Array([1]));
    });
    const app = makeApp({ fs: Promise.resolve({ upload, files, initError: null }) });
    startGame(app, { name: 'hero.sv' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(upload).toHaveBeenCalled();
    expect(app.onSaveUploaded).toHaveBeenCalledTimes(1);
    expect(app.showStartupNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/Imported/),
      })
    );
    expect(app.fileDropTarget.detach).not.toHaveBeenCalled();
  });

  it('reports an error when a .sv import fails', async () => {
    const upload = jest.fn().mockRejectedValue(new Error('bad save'));
    const app = makeApp({ fs: Promise.resolve({ upload, initError: null }) });
    startGame(app, { name: 'broken.sv' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(app.onSaveUploaded).not.toHaveBeenCalled();
    expect(app.showStartupNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: 'error' }));
  });

  it('rejects save import when storage init failed', async () => {
    const upload = jest.fn();
    const app = makeApp({
      fs: Promise.resolve({ upload, initError: new Error('IDB unavailable') }),
    });
    startGame(app, { name: 'hero.sv' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(upload).not.toHaveBeenCalled();
    expect(app.showStartupNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: 'error' }));
  });
});

describe('handleGameError', () => {
  function makeApp(overrides = {}) {
    return {
      setState: jest.fn((updater) => {
        if (typeof updater === 'function') updater({ error: null });
      }),
      runtimeListeners: { detach: jest.fn() },
      fileDropTarget: { attach: jest.fn() },
      ...overrides,
    };
  }

  it('sets the error state with the given message when no stack is provided', async () => {
    const app = makeApp();
    handleGameError(app, 'Something broke');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(app.runtimeListeners.detach).toHaveBeenCalled();
    expect(app.fileDropTarget.attach).toHaveBeenCalled();
    expect(app.setState).toHaveBeenCalled();
    const updater = app.setState.mock.calls[0][0];
    const result = typeof updater === 'function' ? updater({ error: null }) : updater;
    expect(result).toMatchObject({
      error: { message: 'Something broke' },
      loading: false,
      started: false,
    });
  });

  it('resolves the stack trace via mapStackTrace when a stack is provided', async () => {
    const { mapStackTrace } = require('sourcemapped-stacktrace');
    mapStackTrace.mockImplementation((_stack, cb) => cb(['at foo.js:1:2']));
    const app = makeApp();
    handleGameError(app, 'Crash', 'at minified.js:1:1');
    await new Promise((resolve) => setTimeout(resolve, 10));
    const calls = app.setState.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastUpdater = calls[calls.length - 1][0];
    const result = typeof lastUpdater === 'function' ? lastUpdater({ error: null }) : lastUpdater;
    expect(result.error.stack).toBe('at foo.js:1:2');
    expect(result.loading).toBe(false);
  });

  it('does not overwrite a pre-existing error', async () => {
    const app = makeApp();
    app.setState.mockImplementation((updater) => {
      if (typeof updater === 'function') updater({ error: { message: 'previous' } });
    });
    handleGameError(app, 'New error');
    await new Promise((resolve) => setTimeout(resolve, 0));
    const results = app.setState.mock.calls
      .map(([updater]) => updater)
      .filter((updater) => typeof updater === 'function')
      .map((updater) => updater({ error: { message: 'previous' } }));
    expect(results.length).toBeGreaterThan(0);
    results.forEach((result) => expect(result).toBeFalsy());
  });
});

describe('resetToStart', () => {
  it('disposes the game bridge and clears session UI state', () => {
    const dispose = jest.fn();
    const app = {
      game: Object.assign(() => {}, { dispose }),
      runtimeListeners: { detach: jest.fn() },
      fileDropTarget: { attach: jest.fn() },
      setState: jest.fn(),
    };
    resetToStart(app);
    expect(app.runtimeListeners.detach).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(app.game).toBeNull();
    expect(app.fileDropTarget.attach).toHaveBeenCalledTimes(1);
    expect(app.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        loading: false,
        started: false,
        error: null,
      })
    );
  });
});

describe('handleGameExit', () => {
  it('calls the reload function when there is no error', () => {
    const reloadFn = jest.fn();
    const app = { state: { error: null } };
    handleGameExit(app, reloadFn);
    expect(reloadFn).toHaveBeenCalledTimes(1);
  });

  it('does not call the reload function when an error is already set', () => {
    const reloadFn = jest.fn();
    const app = { state: { error: { message: 'already errored' } } };
    handleGameExit(app, reloadFn);
    expect(reloadFn).not.toHaveBeenCalled();
  });
});

// ─── handleProgress ──────────────────────────────────────────────────────────

describe('handleProgress', () => {
  it('calls setState with the given progress value', () => {
    const app = { setState: jest.fn() };
    const progress = { text: 'Downloading...', loaded: 50, total: 100 };
    handleProgress(app, progress);
    expect(app.setState).toHaveBeenCalledWith({ progress });
  });
});

// ─── setCurrentSave ──────────────────────────────────────────────────────────

describe('setCurrentSave', () => {
  it('assigns saveName on the app object', () => {
    const app = {};
    setCurrentSave(app, 'single_0.sv');
    expect(app.saveName).toBe('single_0.sv');
  });

  it('overwrites a previous save name', () => {
    const app = { saveName: 'old.sv' };
    setCurrentSave(app, 'new.sv');
    expect(app.saveName).toBe('new.sv');
  });
});

// ─── setCursorPos ─────────────────────────────────────────────────────────────

describe('setCursorPos', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  function makeApp({ left = 0, top = 0, right = 640, bottom = 480 } = {}) {
    const calls = [];
    return {
      canvas: {
        getBoundingClientRect: () => ({ left, top, right, bottom }),
      },
      cursorPos: { x: 0, y: 0 },
      game: (...args) => calls.push(args),
      _calls: calls,
    };
  }

  it('updates cursorPos based on canvas bounds', () => {
    const app = makeApp({ left: 100, top: 50, right: 740, bottom: 530 });
    setCursorPos(app, 320, 240);
    expect(app.cursorPos.x).toBeCloseTo(100 + (640 * 320) / 640);
    expect(app.cursorPos.y).toBeCloseTo(50 + (480 * 240) / 480);
  });

  it('dispatches DApi_Mouse after a timeout', () => {
    const app = makeApp();
    setCursorPos(app, 100, 200);
    expect(app._calls).toHaveLength(0);
    jest.runAllTimers();
    expect(app._calls).toEqual([['DApi_Mouse', 0, 0, 0, 100, 200]]);
  });
});
