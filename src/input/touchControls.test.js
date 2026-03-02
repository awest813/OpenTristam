import { TOUCH_MOVE, TOUCH_RMB, setTouchMod, updateTouchButton } from './touchControls';

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
    state: {touchPanSensitivity: 'normal'},
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

    const hasCanvasTouch = updateTouchButton(app, [
      { target: modTarget, identifier: 10, clientX: 5, clientY: 6 },
      { target: { nodeName: 'CANVAS' }, identifier: 11, clientX: 12, clientY: 13 },
    ], false);

    expect(hasCanvasTouch).toBe(true);
    expect(app.touchButton.index).toBe(TOUCH_MOVE);
    expect(app.touchMods[TOUCH_MOVE]).toBe(true);
    expect(app.touchCanvas).toEqual({ clientX: 12, clientY: 13 });
  });

  it('toggles sticky button state on release inside same button bounds', () => {
    const app = createApp();
    app.touchMods[TOUCH_RMB] = false;
    app.touchButton = { id: 20, index: TOUCH_RMB, stick: true, original: false, clientX: 50, clientY: 50 };

    const hasCanvasTouch = updateTouchButton(app, [], true);

    expect(hasCanvasTouch).toBe(false);
    expect(app.touchMods[TOUCH_RMB]).toBe(true);
  });

  it('emits map-pan helper input for two-finger pan gesture start', () => {
    const app = createApp();

    const hasCanvasTouch = updateTouchButton(app, [
      { target: { id: 'a' }, identifier: 1, clientX: 100, clientY: 200 },
      { target: { id: 'b' }, identifier: 2, clientX: 120, clientY: 220 },
    ], false);

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
    lowSensitivityApp.panPos = {x: 110, y: 210};

    updateTouchButton(lowSensitivityApp, [
      { target: { id: 'a' }, identifier: 1, clientX: 162, clientY: 210 },
      { target: { id: 'b' }, identifier: 2, clientX: 158, clientY: 210 },
    ], false);

    expect(lowSensitivityApp.calls).toEqual([]);

    const highSensitivityApp = createApp();
    highSensitivityApp.state.touchPanSensitivity = 'high';
    highSensitivityApp.panPos = {x: 110, y: 210};

    updateTouchButton(highSensitivityApp, [
      { target: { id: 'a' }, identifier: 1, clientX: 162, clientY: 210 },
      { target: { id: 'b' }, identifier: 2, clientX: 158, clientY: 210 },
    ], false);

    expect(highSensitivityApp.calls).toEqual([
      ['DApi_Key', 0, 0, 37],
    ]);
  });
});
