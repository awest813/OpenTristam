export const TOUCH_MOVE = 0;
export const TOUCH_RMB = 1;
export const TOUCH_SHIFT = 2;
export const TOUCH_PAN_SENSITIVITY_DIVISORS = {
  low: 8,
  normal: 12,
  high: 16,
};

function getPanStep(app) {
  const sensitivity = (app.state && app.state.touchPanSensitivity) || app.touchPanSensitivity || 'normal';
  const divisor = TOUCH_PAN_SENSITIVITY_DIVISORS[sensitivity] || TOUCH_PAN_SENSITIVITY_DIVISORS.normal;
  return app.canvas.offsetHeight / divisor;
}

export function setTouchMod(app, index, value, use) {
  if (index < 3) {
    app.touchMods[index] = value;
    if (app.touchButtons[index]) {
      app.touchButtons[index].classList.toggle("active", value);
    }
  } else if (use && app.touchBelt[index] >= 0) {
    const now = performance.now();
    if (!app.beltTime || now - app.beltTime > 750) {
      app.game("DApi_Char", 49 + app.touchBelt[index]);
      app.beltTime = now;
    }
  }
}

export function updateTouchButton(app, touches, release) {
  let touchOther = null;
  if (!app.touchControls) {
    app.touchControls = true;
    app.element.classList.add("touch");
  }

  const btn = app.touchButton;
  for (let { target, identifier, clientX, clientY } of touches) {
    if (btn && btn.id === identifier && app.touchButtons[btn.index] === target) {
      if (touches.length > 1) {
        btn.stick = false;
      }
      btn.clientX = clientX;
      btn.clientY = clientY;
      app.touchCanvas = [...touches].find(t => t.identifier !== identifier);
      if (app.touchCanvas) {
        app.touchCanvas = { clientX: app.touchCanvas.clientX, clientY: app.touchCanvas.clientY };
      }
      delete app.panPos;
      return app.touchCanvas != null;
    }

    const idx = app.touchButtons.indexOf(target);
    if (idx >= 0 && !touchOther) {
      touchOther = { id: identifier, index: idx, stick: true, original: app.touchMods[idx], clientX, clientY };
    }
  }

  if (btn && !touchOther && release && btn.stick) {
    const rect = app.touchButtons[btn.index].getBoundingClientRect();
    const { clientX, clientY } = btn;
    if (clientX >= rect.left && clientX < rect.right && clientY >= rect.top && clientY < rect.bottom) {
      setTouchMod(app, btn.index, !btn.original, true);
    } else {
      setTouchMod(app, btn.index, btn.original);
    }
  } else if (btn) {
    setTouchMod(app, btn.index, false);
  }

  app.touchButton = touchOther;
  if (touchOther) {
    if (touchOther.index < 6) {
      setTouchMod(app, touchOther.index, true);
      if (touchOther.index === TOUCH_MOVE) {
        setTouchMod(app, TOUCH_RMB, false);
      } else if (touchOther.index === TOUCH_RMB) {
        setTouchMod(app, TOUCH_MOVE, false);
      }
      delete app.panPos;
    } else {
      app.game("DApi_Key", 0, 0, 110 + touchOther.index);
    }
  } else if (touches.length === 2) {
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
        app.game("DApi_Key", 0, 0, key);
        app.panPos = { x, y };
      }
    } else {
      app.game("DApi_Mouse", 0, 0, 24, 320, 180);
      app.game("DApi_Mouse", 2, 1, 24, 320, 180);
      app.panPos = { x, y };
    }
    app.touchCanvas = null;
    return false;
  } else {
    delete app.panPos;
  }

  app.touchCanvas = [...touches].find(t => !touchOther || t.identifier !== touchOther.id);
  if (app.touchCanvas) {
    app.touchCanvas = { clientX: app.touchCanvas.clientX, clientY: app.touchCanvas.clientY };
  }
  return app.touchCanvas != null;
}
