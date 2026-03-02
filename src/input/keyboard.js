export function findKeyboardRule() {
  for (let sheet of document.styleSheets) {
    for (let rule of sheet.cssRules) {
      if (rule.type === CSSRule.MEDIA_RULE && rule.conditionText === '(min-aspect-ratio: 3/1)') {
        for (let sub of rule.cssRules) {
          if (sub.selectorText === '.App.keyboard .Body .inner') {
            return sub;
          }
        }
      }
    }
  }
}

export function openKeyboard(app, keyboardRule, rect) {
  if (rect) {
    app.showKeyboard = {
      left: `${(100 * (rect[0] - 10) / 640).toFixed(2)}%`,
      top: `${(100 * (rect[1] - 10) / 480).toFixed(2)}%`,
      width: `${(100 * (rect[2] - rect[0] + 20) / 640).toFixed(2)}%`,
      height: `${(100 * (rect[3] - rect[1] + 20) / 480).toFixed(2)}%`,
    };
    app.maxKeyboard = rect[4];
    app.element.classList.add('keyboard');
    Object.assign(app.keyboard.style, app.showKeyboard);
    app.keyboard.focus();
    if (keyboardRule) {
      keyboardRule.style.transform = `translate(-50%, ${(-(rect[1] + rect[3]) * 56.25 / 960).toFixed(2)}vw)`;
    }
  } else {
    app.showKeyboard = false;
    app.element.classList.remove('keyboard');
    app.keyboard.blur();
    app.keyboard.value = '';
    app.keyboardNum = 0;
  }
}

export function clearKeySelection(app) {
  if (app.showKeyboard) {
    const len = app.keyboard.value.length;
    app.keyboard.setSelectionRange(len, len);
  }
}

export function handleKeyboardInput(app, flags) {
  if (app.showKeyboard) {
    const text = app.keyboard.value;
    let valid;
    if (app.maxKeyboard > 0) {
      valid = (text.match(/[\x20-\x7E]/g) || []).join('').substring(0, app.maxKeyboard);
    } else {
      const maxValue = -app.maxKeyboard;
      if (text.match(/^\d*$/)) {
        app.keyboardNum = Math.min(text.length ? parseInt(text, 10) : 0, maxValue);
      }
      valid = (app.keyboardNum ? app.keyboardNum.toString() : '');
    }
    if (text !== valid) {
      app.keyboard.value = valid;
    }
    clearKeySelection(app);
    app.game('text', valid, flags);
  }
}

export function handleKeyDown(app, e) {
  if (!app.canvas) return;
  app.game('DApi_Key', 0, app.eventMods(e), e.keyCode);
  if (!app.showKeyboard && (e.keyCode >= 32 && e.key.length === 1)) {
    app.game('DApi_Char', e.key.charCodeAt(0));
  } else if (e.keyCode === 8 || e.keyCode === 13) {
    app.game('DApi_Char', e.keyCode);
  }
  clearKeySelection(app);
  if (!app.showKeyboard) {
    if (e.keyCode === 8 || e.keyCode === 9 || (e.keyCode >= 112 && e.keyCode <= 119)) {
      e.preventDefault();
    }
  }
}

export function handleKeyUp(app, e) {
  if (!app.canvas) return;
  app.game('DApi_Key', 1, app.eventMods(e), e.keyCode);
  clearKeySelection(app);
}
