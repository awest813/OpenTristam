import { getMousePos, getMouseButton, handleMouseMove, handleMouseDown, handleMouseUp } from './mouseHandlers';

function makeApp({left = 0, top = 0, right = 640, bottom = 480} = {}) {
  const calls = [];
  return {
    canvas: {
      getBoundingClientRect: () => ({left, top, right, bottom}),
      requestPointerLock: jest.fn(),
    },
    keyboard: {},
    element: {classList: {remove: jest.fn()}},
    cursorPos: {x: 0, y: 0},
    touchControls: false,
    game: (...args) => calls.push(args),
    eventMods: () => 0,
    pointerLocked: () => false,
    _calls: calls,
  };
}

// ─── getMousePos ──────────────────────────────────────────────────────────────

describe('getMousePos', () => {
  it('clamps to game-space [0, 639] x [0, 479]', () => {
    const app = makeApp({left: 0, top: 0, right: 640, bottom: 480});
    // client coords at canvas origin → game coords (0, 0)
    expect(getMousePos(app, {clientX: 0, clientY: 0})).toEqual({x: 0, y: 0});
    // client coords at canvas far edge → game coords (639, 479)
    expect(getMousePos(app, {clientX: 640, clientY: 480})).toEqual({x: 639, y: 479});
  });

  it('scales client coords to 640x480 game resolution', () => {
    const app = makeApp({left: 100, top: 50, right: 740, bottom: 530});
    const pos = getMousePos(app, {clientX: 420, clientY: 290});
    expect(pos.x).toBe(320);
    expect(pos.y).toBe(240);
  });

  it('accumulates movementX/Y when pointer is locked', () => {
    const app = makeApp({left: 0, top: 0, right: 640, bottom: 480});
    app.pointerLocked = () => true;
    app.cursorPos = {x: 300, y: 200};
    getMousePos(app, {movementX: 20, movementY: -10});
    expect(app.cursorPos.x).toBe(320);
    expect(app.cursorPos.y).toBe(190);
  });
});

// ─── getMouseButton ───────────────────────────────────────────────────────────

describe('getMouseButton', () => {
  it.each([
    [0, 1],
    [1, 4],
    [2, 2],
    [3, 5],
    [4, 6],
    [99, 1],
  ])('maps button %i to DApi button %i', (btn, expected) => {
    expect(getMouseButton({button: btn})).toBe(expected);
  });
});

// ─── handleMouseMove ─────────────────────────────────────────────────────────

describe('handleMouseMove', () => {
  it('sends DApi_Mouse move event and calls preventDefault', () => {
    const app = makeApp();
    const e = {clientX: 320, clientY: 240, preventDefault: jest.fn()};
    handleMouseMove(app, e);
    expect(app._calls).toEqual([['DApi_Mouse', 0, 0, 0, 320, 240]]);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('returns early when canvas is null', () => {
    const app = makeApp();
    app.canvas = null;
    const e = {clientX: 0, clientY: 0, preventDefault: jest.fn()};
    handleMouseMove(app, e);
    expect(app._calls).toHaveLength(0);
  });
});

// ─── handleMouseDown ─────────────────────────────────────────────────────────

describe('handleMouseDown', () => {
  it('sends DApi_Mouse button-down event', () => {
    const app = makeApp();
    const e = {button: 0, clientX: 100, clientY: 50, target: {}, preventDefault: jest.fn()};
    handleMouseDown(app, e);
    expect(app._calls).toContainEqual(['DApi_Mouse', 1, 1, 0, 100, 50]);
  });

  it('skips the event when the target is the keyboard element', () => {
    const app = makeApp();
    const e = {button: 0, target: app.keyboard, preventDefault: jest.fn()};
    handleMouseDown(app, e);
    expect(app._calls).toHaveLength(0);
  });

  it('clears touch-controls mode on mouse interaction', () => {
    const app = makeApp();
    app.touchControls = true;
    const e = {button: 0, clientX: 0, clientY: 0, target: {}, preventDefault: jest.fn()};
    handleMouseDown(app, e);
    expect(app.touchControls).toBe(false);
    expect(app.element.classList.remove).toHaveBeenCalledWith('touch');
  });
});

// ─── handleMouseUp ───────────────────────────────────────────────────────────

describe('handleMouseUp', () => {
  it('sends DApi_Mouse button-up event', () => {
    const app = makeApp();
    const e = {button: 2, clientX: 50, clientY: 75, target: {}, preventDefault: jest.fn()};
    handleMouseUp(app, e);
    expect(app._calls).toContainEqual(['DApi_Mouse', 2, 2, 0, 50, 75]);
  });

  it('calls preventDefault when target is not the keyboard', () => {
    const app = makeApp();
    const e = {button: 0, clientX: 0, clientY: 0, target: {}, preventDefault: jest.fn()};
    handleMouseUp(app, e);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('does not call preventDefault when target is the keyboard', () => {
    const app = makeApp();
    const e = {button: 0, clientX: 0, clientY: 0, target: app.keyboard, preventDefault: jest.fn()};
    handleMouseUp(app, e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});

// ─── object pooling (allocation reduction) ───────────────────────────────────

describe('getMousePos — object pooling', () => {
  it('returns the same object reference on successive calls', () => {
    const app = makeApp();
    const ref1 = getMousePos(app, {clientX: 100, clientY: 50});
    const ref2 = getMousePos(app, {clientX: 200, clientY: 100});
    expect(ref1).toBe(ref2);
  });

  it('mutates cursorPos in-place instead of creating a new object (non-locked)', () => {
    const app = makeApp();
    const original = app.cursorPos;
    getMousePos(app, {clientX: 320, clientY: 240});
    expect(app.cursorPos).toBe(original);
    expect(app.cursorPos.x).toBe(320);
    expect(app.cursorPos.y).toBe(240);
  });
});

