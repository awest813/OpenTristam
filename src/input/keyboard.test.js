import { findKeyboardRule, clearKeySelection, handleKeyboardInput, handleKeyDown, handleKeyUp } from './keyboard';

// ─── findKeyboardRule ─────────────────────────────────────────────────────────

describe('findKeyboardRule', () => {
  it('returns undefined when no matching stylesheet rule exists', () => {
    // jsdom does not load real stylesheets, so cssRules is empty
    expect(findKeyboardRule()).toBeUndefined();
  });
});

// ─── clearKeySelection ────────────────────────────────────────────────────────

describe('clearKeySelection', () => {
  it('moves the cursor to the end of the keyboard value when showKeyboard is set', () => {
    const keyboard = {value: 'hello', setSelectionRange: jest.fn()};
    const app = {showKeyboard: {left: '0%'}, keyboard};
    clearKeySelection(app);
    expect(keyboard.setSelectionRange).toHaveBeenCalledWith(5, 5);
  });

  it('is a no-op when showKeyboard is falsy', () => {
    const keyboard = {value: 'hello', setSelectionRange: jest.fn()};
    const app = {showKeyboard: false, keyboard};
    clearKeySelection(app);
    expect(keyboard.setSelectionRange).not.toHaveBeenCalled();
  });
});

// ─── handleKeyboardInput ──────────────────────────────────────────────────────

describe('handleKeyboardInput', () => {
  function makeApp(value, maxKeyboard = 8) {
    const calls = [];
    return {
      showKeyboard: {left: '10%'},
      keyboard: {
        setSelectionRange: jest.fn(),
        get value() { return this._value; },
        set value(v) { this._value = v; },
        _value: value,
      },
      maxKeyboard,
      keyboardNum: 0,
      game: (...args) => calls.push(args),
      _calls: calls,
    };
  }

  it('strips non-printable characters from the text input', () => {
    const app = makeApp('hello\x01world', 20);
    handleKeyboardInput(app, 0);
    expect(app.keyboard.value).toBe('helloworld');
  });

  it('truncates input to maxKeyboard characters', () => {
    const app = makeApp('abcdefghij', 5);
    handleKeyboardInput(app, 0);
    expect(app.keyboard.value).toBe('abcde');
  });

  it('sends a text game message with the sanitised value', () => {
    const app = makeApp('hi', 10);
    handleKeyboardInput(app, 0);
    expect(app._calls).toContainEqual(['text', 'hi', 0]);
  });

  it('sends text with flags=1 for blur events', () => {
    const app = makeApp('ok', 10);
    handleKeyboardInput(app, 1);
    expect(app._calls).toContainEqual(['text', 'ok', 1]);
  });

  it('is a no-op when showKeyboard is falsy', () => {
    const calls = [];
    const app = {showKeyboard: false, game: (...a) => calls.push(a)};
    handleKeyboardInput(app, 0);
    expect(calls).toHaveLength(0);
  });
});

// ─── handleKeyDown ────────────────────────────────────────────────────────────

describe('handleKeyDown', () => {
  function makeApp() {
    const calls = [];
    return {
      canvas: {},
      showKeyboard: false,
      keyboard: {value: '', setSelectionRange: jest.fn()},
      maxKeyboard: 0,
      game: (...args) => calls.push(args),
      eventMods: () => 0,
      _calls: calls,
    };
  }

  it('sends DApi_Key with keyCode', () => {
    const app = makeApp();
    handleKeyDown(app, {keyCode: 65, key: 'a', shiftKey: false});
    expect(app._calls).toContainEqual(['DApi_Key', 0, 0, 65]);
  });

  it('sends DApi_Char for printable characters when keyboard overlay is closed', () => {
    const app = makeApp();
    handleKeyDown(app, {keyCode: 65, key: 'a', shiftKey: false});
    expect(app._calls).toContainEqual(['DApi_Char', 97]);
  });

  it('sends DApi_Char for backspace (keyCode 8)', () => {
    const app = makeApp();
    handleKeyDown(app, {keyCode: 8, key: 'Backspace', shiftKey: false, preventDefault: jest.fn()});
    expect(app._calls).toContainEqual(['DApi_Char', 8]);
  });

  it('returns early when canvas is not mounted', () => {
    const calls = [];
    const app = {canvas: null, game: (...a) => calls.push(a)};
    handleKeyDown(app, {keyCode: 65});
    expect(calls).toHaveLength(0);
  });

  it('calls preventDefault for F1–F8 keys when overlay is closed', () => {
    const app = makeApp();
    const e = {keyCode: 112, key: 'F1', shiftKey: false, preventDefault: jest.fn()};
    handleKeyDown(app, e);
    expect(e.preventDefault).toHaveBeenCalled();
  });
});

// ─── handleKeyUp ─────────────────────────────────────────────────────────────

describe('handleKeyUp', () => {
  it('sends DApi_Key with type=1 and keyCode', () => {
    const calls = [];
    const app = {
      canvas: {},
      showKeyboard: false,
      keyboard: {value: '', setSelectionRange: jest.fn()},
      game: (...args) => calls.push(args),
      eventMods: () => 0,
    };
    handleKeyUp(app, {keyCode: 27, shiftKey: false});
    expect(calls).toContainEqual(['DApi_Key', 1, 0, 27]);
  });

  it('returns early when canvas is not mounted', () => {
    const calls = [];
    const app = {canvas: null, game: (...a) => calls.push(a)};
    handleKeyUp(app, {keyCode: 27});
    expect(calls).toHaveLength(0);
  });
});
