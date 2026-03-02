import { handleGameExit, handleProgress, setCurrentSave, setCursorPos } from './session';

// ─── handleGameExit ──────────────────────────────────────────────────────────

describe('handleGameExit', () => {
  const originalReload = window.location.reload;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {reload: jest.fn()},
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {reload: originalReload},
    });
  });

  it('calls location.reload() when there is no error', () => {
    const app = {state: {error: null}};
    handleGameExit(app);
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload when an error is already set', () => {
    const app = {state: {error: {message: 'already errored'}}};
    handleGameExit(app);
    expect(window.location.reload).not.toHaveBeenCalled();
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
