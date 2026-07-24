export const TOUCH_MOVE = 0;
export const TOUCH_RMB = 1;
export const TOUCH_SHIFT = 2;
export const TOUCH_GESTURE_DRAG_THRESHOLD = 14;
export const TOUCH_GESTURE_LONG_PRESS_MS = 450;
export const TOUCH_PAN_SENSITIVITY_DIVISORS = {
  low: 8,
  normal: 12,
  high: 16,
};

/** CSS selector for shell chrome that must receive native touch (buttons, banners). */
export const TOUCH_UI_CHROME_SELECTOR = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  '.multiplayerBanner',
  '.storageBanner',
  '.startupNotice',
  '.updateBanner',
  '.offlineReadyToast',
  '.dropHint',
  '.start',
  '.error',
  '.loading',
  '.saveManager',
].join(',');

function resolveTimestamp(now) {
  if (typeof now === 'number' && Number.isFinite(now)) {
    return now;
  }
  return performance.now();
}

function getPanStep(app) {
  const sensitivity =
    (app.state && app.state.touchPanSensitivity) || app.touchPanSensitivity || 'normal';
  const divisor =
    TOUCH_PAN_SENSITIVITY_DIVISORS[sensitivity] || TOUCH_PAN_SENSITIVITY_DIVISORS.normal;
  return app.canvas.offsetHeight / divisor;
}

function fKeyCode(index) {
  // touchButtons 6..9 map to F5..F8 (legacy DApi key codes 116..119).
  return 110 + index;
}

function releaseHeldFKey(app) {
  if (typeof app.touchFKey !== 'number') {
    return;
  }
  if (app.game) {
    app.game('DApi_Key', 1, 0, app.touchFKey);
  }
  for (let i = 6; i <= 9; i += 1) {
    if (app.touchButtons[i] && app.touchButtons[i].classList) {
      app.touchButtons[i].classList.toggle('active', false);
    }
  }
  delete app.touchFKey;
}

function releaseHeldPanKey(app) {
  if (typeof app.panKey !== 'number') {
    return;
  }
  if (app.game) {
    app.game('DApi_Key', 1, 0, app.panKey);
  }
  delete app.panKey;
}

function pressPanKey(app, key) {
  if (app.panKey === key) {
    return;
  }
  releaseHeldPanKey(app);
  app.game('DApi_Key', 0, 0, key);
  app.panKey = key;
}

/**
 * True when the touch target belongs to shell UI chrome that should not be
 * routed into the game canvas pipeline (and should not call preventDefault).
 */
export function isUiChromeTouchTarget(target) {
  if (!target || typeof target.closest !== 'function') {
    return false;
  }
  // Touch pads are game controls, not chrome — even though they are buttons-like divs.
  if (target.closest('.touch-button, .touch-ui')) {
    return false;
  }
  return !!target.closest(TOUCH_UI_CHROME_SELECTOR);
}

/**
 * Clear sticky touch mods / gestures / held keys after an OS interrupt.
 * Does not synthesize mouse clicks.
 */
export function releaseTouchInputState(app) {
  cancelTouchGesture(app);
  releaseHeldFKey(app);
  releaseHeldPanKey(app);
  delete app.panPos;
  delete app.touchCanvas;
  if (app.touchButton) {
    const index = app.touchButton.index;
    app.touchButton = null;
    if (index < 3) {
      setTouchMod(app, index, false);
    }
  }
  for (let i = 0; i < 3; i += 1) {
    if (app.touchMods[i]) {
      setTouchMod(app, i, false);
    }
  }
}

export function setTouchMod(app, index, value, use) {
  if (index < 3) {
    app.touchMods[index] = value;
    if (app.touchButtons[index]) {
      app.touchButtons[index].classList.toggle('active', value);
    }
  } else if (index <= 5 && use && app.touchBelt[index] >= 0) {
    const now = performance.now();
    if (!app.beltTime || now - app.beltTime > 750) {
      app.game('DApi_Char', 49 + app.touchBelt[index]);
      app.beltTime = now;
    }
  }
}

export function beginTouchGesture(app, touch, now) {
  if (!touch) {
    delete app.touchGesture;
    return null;
  }
  const startedAt = resolveTimestamp(now);
  const gesture = {
    id: touch.identifier,
    startX: touch.clientX,
    startY: touch.clientY,
    lastX: touch.clientX,
    lastY: touch.clientY,
    startedAt,
    dragging: false,
    dragButton: null,
  };
  app.touchGesture = gesture;
  return gesture;
}

export function updateTouchGesture(app, touch, now, button = 1) {
  const gesture = app.touchGesture;
  if (!gesture || !touch || touch.identifier !== gesture.id) {
    return { active: false, startDrag: false, dragging: false, dragButton: null };
  }

  const timestamp = resolveTimestamp(now);
  gesture.lastX = touch.clientX;
  gesture.lastY = touch.clientY;

  const dx = gesture.lastX - gesture.startX;
  const dy = gesture.lastY - gesture.startY;
  const moved = Math.max(Math.abs(dx), Math.abs(dy)) >= TOUCH_GESTURE_DRAG_THRESHOLD;

  let startDrag = false;
  if (moved && !gesture.dragging) {
    gesture.dragging = true;
    gesture.dragButton = button;
    startDrag = true;
  }

  return {
    active: true,
    startDrag,
    dragging: gesture.dragging,
    dragButton: gesture.dragButton,
    moved,
    duration: timestamp - gesture.startedAt,
  };
}

export function cancelTouchGesture(app) {
  const gesture = app.touchGesture || null;
  delete app.touchGesture;
  return gesture;
}

export function finishTouchGesture(app, now) {
  const gesture = app.touchGesture;
  if (!gesture) {
    return { kind: 'none', button: null, duration: 0 };
  }

  const timestamp = resolveTimestamp(now);
  const dx = gesture.lastX - gesture.startX;
  const dy = gesture.lastY - gesture.startY;
  const moved = Math.max(Math.abs(dx), Math.abs(dy)) >= TOUCH_GESTURE_DRAG_THRESHOLD;
  const duration = timestamp - gesture.startedAt;

  delete app.touchGesture;

  if (gesture.dragging || moved) {
    return { kind: 'drag', button: gesture.dragButton || 1, duration };
  }
  if (duration >= TOUCH_GESTURE_LONG_PRESS_MS) {
    return { kind: 'long-press', button: 2, duration };
  }
  return { kind: 'tap', button: 1, duration };
}

export function updateTouchButton(app, touches, release) {
  let touchOther = null;
  if (!app.touchControls) {
    app.touchControls = true;
    app.element.classList.add('touch');
  }

  const btn = app.touchButton;
  for (let { target, identifier, clientX, clientY } of touches) {
    if (btn && btn.id === identifier && app.touchButtons[btn.index] === target) {
      if (touches.length > 1) {
        btn.stick = false;
      }
      btn.clientX = clientX;
      btn.clientY = clientY;
      app.touchCanvas = [...touches].find((t) => t.identifier !== identifier);
      if (app.touchCanvas) {
        app.touchCanvas = {
          identifier: app.touchCanvas.identifier,
          clientX: app.touchCanvas.clientX,
          clientY: app.touchCanvas.clientY,
        };
      }
      delete app.panPos;
      releaseHeldPanKey(app);
      return app.touchCanvas != null;
    }

    const idx = app.touchButtons.indexOf(target);
    if (idx >= 0 && !touchOther) {
      touchOther = {
        id: identifier,
        index: idx,
        stick: true,
        original: app.touchMods[idx],
        clientX,
        clientY,
      };
    }
  }

  if (btn && !touchOther && release && btn.stick) {
    const rect = app.touchButtons[btn.index].getBoundingClientRect();
    const { clientX, clientY } = btn;
    if (
      clientX >= rect.left &&
      clientX < rect.right &&
      clientY >= rect.top &&
      clientY < rect.bottom
    ) {
      setTouchMod(app, btn.index, !btn.original, true);
    } else {
      setTouchMod(app, btn.index, btn.original);
    }
    if (btn.index >= 6) {
      releaseHeldFKey(app);
    }
  } else if (btn) {
    setTouchMod(app, btn.index, false);
    if (btn.index >= 6) {
      releaseHeldFKey(app);
    }
  }

  app.touchButton = touchOther;
  if (touchOther) {
    releaseHeldPanKey(app);
    delete app.panPos;
    if (touchOther.index < 6) {
      releaseHeldFKey(app);
      setTouchMod(app, touchOther.index, true);
      if (touchOther.index === TOUCH_MOVE) {
        setTouchMod(app, TOUCH_RMB, false);
      } else if (touchOther.index === TOUCH_RMB) {
        setTouchMod(app, TOUCH_MOVE, false);
      }
    } else {
      const key = fKeyCode(touchOther.index);
      if (app.touchFKey !== key) {
        releaseHeldFKey(app);
        app.game('DApi_Key', 0, 0, key);
        app.touchFKey = key;
      }
      if (app.touchButtons[touchOther.index] && app.touchButtons[touchOther.index].classList) {
        app.touchButtons[touchOther.index].classList.toggle('active', true);
      }
    }
  } else if (touches.length === 2) {
    releaseHeldFKey(app);
    const x = (touches[1].clientX + touches[0].clientX) / 2;
    const y = (touches[1].clientY + touches[0].clientY) / 2;
    if (app.panPos) {
      const dx = x - app.panPos.x;
      const dy = y - app.panPos.y;
      const step = getPanStep(app);
      if (Math.max(Math.abs(dx), Math.abs(dy)) > step) {
        let key;
        if (Math.abs(dx) > Math.abs(dy)) {
          key = dx > 0 ? 0x25 : 0x27;
        } else {
          key = dy > 0 ? 0x26 : 0x28;
        }
        pressPanKey(app, key);
        app.panPos = { x, y };
      }
    } else {
      app.game('DApi_Mouse', 0, 0, 24, 320, 180);
      app.game('DApi_Mouse', 2, 1, 24, 320, 180);
      app.panPos = { x, y };
    }
    app.touchCanvas = null;
    return false;
  } else {
    releaseHeldPanKey(app);
    delete app.panPos;
  }

  app.touchCanvas = [...touches].find((t) => !touchOther || t.identifier !== touchOther.id);
  if (app.touchCanvas) {
    app.touchCanvas = {
      identifier: app.touchCanvas.identifier,
      clientX: app.touchCanvas.clientX,
      clientY: app.touchCanvas.clientY,
    };
  }
  return app.touchCanvas != null;
}
