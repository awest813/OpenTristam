export function getMousePos(app, e) {
  const rect = app.canvas.getBoundingClientRect();
  if (app.pointerLocked()) {
    app.cursorPos.x = Math.max(rect.left, Math.min(rect.right, app.cursorPos.x + e.movementX));
    app.cursorPos.y = Math.max(rect.top, Math.min(rect.bottom, app.cursorPos.y + e.movementY));
  } else {
    app.cursorPos = {x: e.clientX, y: e.clientY};
  }
  return {
    x: Math.max(0, Math.min(Math.round((app.cursorPos.x - rect.left) / (rect.right - rect.left) * 640), 639)),
    y: Math.max(0, Math.min(Math.round((app.cursorPos.y - rect.top) / (rect.bottom - rect.top) * 480), 479)),
  };
}

export function getMouseButton(e) {
  switch (e.button) {
  case 0: return 1;
  case 1: return 4;
  case 2: return 2;
  case 3: return 5;
  case 4: return 6;
  default: return 1;
  }
}

export function handleMouseMove(app, e) {
  if (!app.canvas) return;
  const {x, y} = getMousePos(app, e);
  app.game('DApi_Mouse', 0, 0, app.eventMods(e), x, y);
  e.preventDefault();
}

export function handleMouseDown(app, e) {
  if (!app.canvas) return;
  if (e.target === app.keyboard) return;
  if (app.touchControls) {
    app.touchControls = false;
    app.element.classList.remove('touch');
  }
  const {x, y} = getMousePos(app, e);
  if (window.screen && window.innerHeight === window.screen.height) {
    if (!app.pointerLocked()) {
      app.canvas.requestPointerLock();
    }
  }
  app.game('DApi_Mouse', 1, getMouseButton(e), app.eventMods(e), x, y);
  e.preventDefault();
}

export function handleMouseUp(app, e) {
  if (!app.canvas) return;
  const {x, y} = getMousePos(app, e);
  app.game('DApi_Mouse', 2, getMouseButton(e), app.eventMods(e), x, y);
  if (e.target !== app.keyboard) {
    e.preventDefault();
  }
}
