import {
  TOUCH_GESTURE_DRAG_THRESHOLD,
  TOUCH_GESTURE_LONG_PRESS_MS,
  TOUCH_MOVE,
  TOUCH_RMB,
  beginTouchGesture,
  cancelTouchGesture,
  finishTouchGesture,
  isUiChromeTouchTarget,
  releaseTouchInputState,
  setTouchMod,
  updateTouchButton,
  updateTouchGesture,
} from './touchControls';

function createApp() {
  const calls = [];
  const buttons = Array.from({ length: 10 }, (_, idx) => ({
    classList: { toggle: jest.fn() },
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100 }),
    _idx: idx,
  }));

  return {
    calls,
    game: (...args) => calls.push(args),
    touchMods: [false, false, false, false, false, false],
    touchBelt: [-1, -1, -1, -1, -1, -1],
    touchButtons: buttons,
    touchButton: null,
    touchCanvas: null,
    touchControls: false,
    state: { touchPanSensitivity: 'normal' },
    element: { classList: { add: jest.fn() } },
    canvas: { offsetHeight: 480 },
  };
}

describe('touchControls', () => {
  it('activates modifier buttons and toggles active state', () => {
    const app = createApp();

    setTouchMod(app, TOUCH_MOVE, true);

    expect(app.touchMods[TOUCH_MOVE]).toBe(true);
    expect(app.touchButtons[TOUCH_MOVE].classList.toggle).toHaveBeenCalledWith('active', true);
  });

  it('updates tracked touch button and emits canvas touch as pointer source', () => {
    const app = createApp();
    const modTarget = app.touchButtons[TOUCH_MOVE];

    const hasCanvasTouch = updateTouchButton(
      app,
      [
        { target: modTarget, identifier: 10, clientX: 5, clientY: 6 },
        { target: { nodeName: 'CANVAS' }, identifier: 11, clientX: 12, clientY: 13 },
      ],
      false
    );

    expect(hasCanvasTouch).toBe(true);
    expect(app.touchButton.index).toBe(TOUCH_MOVE);
    expect(app.touchMods[TOUCH_MOVE]).toBe(true);
    expect(app.touchCanvas).toEqual({ identifier: 11, clientX: 12, clientY: 13 });
  });

  it('toggles sticky button state on release inside same button bounds', () => {
    const app = createApp();
    app.touchMods[TOUCH_RMB] = false;
    app.touchButton = {
      id: 20,
      index: TOUCH_RMB,
      stick: true,
      original: false,
      clientX: 50,
      clientY: 50,
    };

    const hasCanvasTouch = updateTouchButton(app, [], true);

    expect(hasCanvasTouch).toBe(false);
    expect(app.touchMods[TOUCH_RMB]).toBe(true);
  });

  it('emits map-pan helper input for two-finger pan gesture start', () => {
    const app = createApp();

    const hasCanvasTouch = updateTouchButton(
      app,
      [
        { target: { id: 'a' }, identifier: 1, clientX: 100, clientY: 200 },
        { target: { id: 'b' }, identifier: 2, clientX: 120, clientY: 220 },
      ],
      false
    );

    expect(hasCanvasTouch).toBe(false);
    expect(app.calls).toEqual([
      ['DApi_Mouse', 0, 0, 24, 320, 180],
      ['DApi_Mouse', 2, 1, 24, 320, 180],
    ]);
    expect(app.panPos).toEqual({ x: 110, y: 210 });
  });

  it('uses sensitivity setting when deciding two-finger pan threshold', () => {
    const lowSensitivityApp = createApp();
    lowSensitivityApp.state.touchPanSensitivity = 'low';
    lowSensitivityApp.panPos = { x: 110, y: 210 };

    updateTouchButton(
      lowSensitivityApp,
      [
        { target: { id: 'a' }, identifier: 1, clientX: 162, clientY: 210 },
        { target: { id: 'b' }, identifier: 2, clientX: 158, clientY: 210 },
      ],
      false
    );

    expect(lowSensitivityApp.calls).toEqual([]);

    const highSensitivityApp = createApp();
    highSensitivityApp.state.touchPanSensitivity = 'high';
    highSensitivityApp.panPos = { x: 110, y: 210 };

    updateTouchButton(
      highSensitivityApp,
      [
        { target: { id: 'a' }, identifier: 1, clientX: 162, clientY: 210 },
        { target: { id: 'b' }, identifier: 2, clientX: 158, clientY: 210 },
      ],
      false
    );

    expect(highSensitivityApp.calls).toEqual([['DApi_Key', 0, 0, 37]]);
  });

  it('starts and upgrades gesture to drag after moving threshold', () => {
    const app = createApp();

    beginTouchGesture(app, { identifier: 1, clientX: 20, clientY: 30 }, 1000);

    const beforeDrag = updateTouchGesture(
      app,
      { identifier: 1, clientX: 20, clientY: 30 },
      1100,
      1
    );
    expect(beforeDrag.startDrag).toBe(false);
    expect(beforeDrag.dragging).toBe(false);

    const afterDrag = updateTouchGesture(
      app,
      { identifier: 1, clientX: 20 + TOUCH_GESTURE_DRAG_THRESHOLD, clientY: 30 },
      1200,
      1
    );
    expect(afterDrag.startDrag).toBe(true);
    expect(afterDrag.dragging).toBe(true);
    expect(afterDrag.dragButton).toBe(1);
  });

  it('classifies finished gesture as long-press when held without movement', () => {
    const app = createApp();
    beginTouchGesture(app, { identifier: 3, clientX: 10, clientY: 10 }, 500);
    updateTouchGesture(app, { identifier: 3, clientX: 12, clientY: 11 }, 650, 1);

    const result = finishTouchGesture(app, 500 + TOUCH_GESTURE_LONG_PRESS_MS + 1);

    expect(result.kind).toBe('long-press');
    expect(result.button).toBe(2);
    expect(app.touchGesture).toBeUndefined();
  });

  it('cancels active gesture state', () => {
    const app = createApp();
    beginTouchGesture(app, { identifier: 4, clientX: 0, clientY: 0 }, 50);

    const cancelled = cancelTouchGesture(app);

    expect(cancelled).toBeTruthy();
    expect(cancelled.id).toBe(4);
    expect(app.touchGesture).toBeUndefined();
  });

  it('setTouchMod fires belt action for valid belt indices 3-5 when use is true and slot is filled', () => {
    const app = createApp();
    app.touchBelt[3] = 1; // slot 3 maps to belt position 1
    jest.spyOn(performance, 'now').mockReturnValue(10000);

    setTouchMod(app, 3, true, true);

    expect(app.calls).toEqual([['DApi_Char', 49 + 1]]);
  });

  it('setTouchMod does not fire belt action for indices 6-9 (F-key range)', () => {
    const app = createApp();
    // Even if touchBelt happened to have a value at index 6 (out of range), no call is made
    setTouchMod(app, 6, true, true);
    setTouchMod(app, 7, true, true);
    setTouchMod(app, 9, true, true);

    expect(app.calls).toHaveLength(0);
  });

  it('setTouchMod does not fire belt action when use is false', () => {
    const app = createApp();
    app.touchBelt[4] = 2;

    setTouchMod(app, 4, true, false);

    expect(app.calls).toHaveLength(0);
  });

  it('emits F-key down on press and F-key up on release', () => {
    const app = createApp();
    const f5 = app.touchButtons[6];

    updateTouchButton(app, [{ target: f5, identifier: 40, clientX: 10, clientY: 10 }], false);
    expect(app.calls).toEqual([['DApi_Key', 0, 0, 116]]);
    expect(app.touchFKey).toBe(116);

    updateTouchButton(app, [], true);
    expect(app.calls).toEqual([
      ['DApi_Key', 0, 0, 116],
      ['DApi_Key', 1, 0, 116],
    ]);
    expect(app.touchFKey).toBeUndefined();
  });

  it('releases pan arrow keys when the two-finger gesture ends', () => {
    const app = createApp();
    app.panPos = { x: 110, y: 210 };

    updateTouchButton(
      app,
      [
        { target: { id: 'a' }, identifier: 1, clientX: 180, clientY: 210 },
        { target: { id: 'b' }, identifier: 2, clientX: 200, clientY: 210 },
      ],
      false
    );
    expect(app.calls).toEqual([['DApi_Key', 0, 0, 0x25]]);
    expect(app.panKey).toBe(0x25);

    updateTouchButton(app, [], true);
    expect(app.calls).toEqual([
      ['DApi_Key', 0, 0, 0x25],
      ['DApi_Key', 1, 0, 0x25],
    ]);
    expect(app.panKey).toBeUndefined();
  });

  it('releaseTouchInputState clears sticky mods and held keys', () => {
    const app = createApp();
    app.touchMods[TOUCH_MOVE] = true;
    app.touchFKey = 116;
    app.panKey = 0x25;
    app.touchCanvas = { identifier: 1, clientX: 0, clientY: 0 };
    beginTouchGesture(app, { identifier: 1, clientX: 0, clientY: 0 }, 10);

    releaseTouchInputState(app);

    expect(app.touchMods[TOUCH_MOVE]).toBe(false);
    expect(app.touchFKey).toBeUndefined();
    expect(app.panKey).toBeUndefined();
    expect(app.touchGesture).toBeUndefined();
    expect(app.calls).toEqual([
      ['DApi_Key', 1, 0, 116],
      ['DApi_Key', 1, 0, 0x25],
    ]);
  });

  it('isUiChromeTouchTarget ignores touch pads but catches banner buttons', () => {
    const pad = {
      closest: (sel) => (String(sel).includes('.touch-button') ? pad : null),
    };
    const bannerButton = {
      closest: (sel) => {
        if (String(sel).includes('.touch-button')) return null;
        if (String(sel).includes('button')) return bannerButton;
        return null;
      },
    };
    expect(isUiChromeTouchTarget(pad)).toBe(false);
    expect(isUiChromeTouchTarget(bannerButton)).toBe(true);
  });
});
