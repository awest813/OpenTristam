import { handleGameError, handleGameExit, handleProgress, setCurrentSave, setCursorPos } from './session';

// ─── handleGameError ─────────────────────────────────────────────────────────

jest.mock('sourcemapped-stacktrace', () => ({
  mapStackTrace: jest.fn((stack, cb) => cb([stack])),
}));

describe('handleGameError', () => {
  function makeApp(overrides = {}) {
    return {
      setState: jest.fn(updater => {
        if (typeof updater === 'function') updater({error: null});
      }),
      ...overrides,
    };
  }

  it('sets the error state with the given message when no stack is provided', async () => {
    const app = makeApp();
    handleGameError(app, 'Something broke');
    // Allow micro-tasks to flush
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(app.setState).toHaveBeenCalled();
    const updater = app.setState.mock.calls[0][0];
    const result = typeof updater === 'function' ? updater({error: null}) : updater;
    expect(result).toMatchObject({error: {message: 'Something broke'}});
  });

  it('resolves the stack trace via mapStackTrace when a stack is provided', async () => {
    const { mapStackTrace } = require('sourcemapped-stacktrace');
    mapStackTrace.mockImplementation((_stack, cb) => cb(['at foo.js:1:2']));
    const app = makeApp();
    handleGameError(app, 'Crash', 'at minified.js:1:1');
    await new Promise(resolve => setTimeout(resolve, 10));
    const calls = app.setState.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastUpdater = calls[calls.length - 1][0];
    const result = typeof lastUpdater === 'function' ? lastUpdater({error: null}) : lastUpdater;
    expect(result.error.stack).toBe('at foo.js:1:2');
  });

  it('does not overwrite a pre-existing error', async () => {
    const app = makeApp();
    // Simulate error already set: updater returns falsy when error exists
    app.setState.mockImplementation(updater => {
      if (typeof updater === 'function') updater({error: {message: 'previous'}});
    });
    handleGameError(app, 'New error');
    await new Promise(resolve => setTimeout(resolve, 0));
    // All setState updaters should have returned falsy (undefined / false)
    for (const [updater] of app.setState.mock.calls) {
      if (typeof updater === 'function') {
        expect(updater({error: {message: 'previous'}})).toBeFalsy();
      }
    }
  });
});



describe('handleGameExit', () => {
  it('calls the reload function when there is no error', () => {
    const reloadFn = jest.fn();
    const app = {state: {error: null}};
    handleGameExit(app, reloadFn);
    expect(reloadFn).toHaveBeenCalledTimes(1);
  });

  it('does not call the reload function when an error is already set', () => {
    const reloadFn = jest.fn();
    const app = {state: {error: {message: 'already errored'}}};
    handleGameExit(app, reloadFn);
    expect(reloadFn).not.toHaveBeenCalled();
  });
});

// ─── handleProgress ──────────────────────────────────────────────────────────

describe('handleProgress', () => {
  it('calls setState with the given progress value', () => {
    const app = {setState: jest.fn()};
    const progress = {text: 'Downloading...', loaded: 50, total: 100};
    handleProgress(app, progress);
    expect(app.setState).toHaveBeenCalledWith({progress});
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
    const app = {saveName: 'old.sv'};
    setCurrentSave(app, 'new.sv');
    expect(app.saveName).toBe('new.sv');
  });
});

// ─── setCursorPos ─────────────────────────────────────────────────────────────

describe('setCursorPos', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  function makeApp({left = 0, top = 0, right = 640, bottom = 480} = {}) {
    const calls = [];
    return {
      canvas: {
        getBoundingClientRect: () => ({left, top, right, bottom}),
      },
      cursorPos: {x: 0, y: 0},
      game: (...args) => calls.push(args),
      _calls: calls,
    };
  }

  it('updates cursorPos based on canvas bounds', () => {
    const app = makeApp({left: 100, top: 50, right: 740, bottom: 530});
    setCursorPos(app, 320, 240);
    expect(app.cursorPos.x).toBeCloseTo(100 + 640 * 320 / 640);
    expect(app.cursorPos.y).toBeCloseTo(50 + 480 * 240 / 480);
  });

  it('dispatches DApi_Mouse after a timeout', () => {
    const app = makeApp();
    setCursorPos(app, 100, 200);
    expect(app._calls).toHaveLength(0);
    jest.runAllTimers();
    expect(app._calls).toEqual([['DApi_Mouse', 0, 0, 0, 100, 200]]);
  });
});
