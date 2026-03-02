import React from 'react';
import './App.scss';
import classNames from 'classnames';
import ReactGA from 'react-ga';

import create_fs from './fs';
import { SpawnSizes } from './api/load_spawn';
import { getDropFile, isDropFile } from './input/fileDrop';
import createFileDropTarget from './input/fileDropTarget';
import createEventListeners from './input/eventListeners';
import {
  TOUCH_MOVE, TOUCH_RMB, TOUCH_SHIFT,
  setTouchMod as applyTouchMod,
  updateTouchButton as applyTouchButtonUpdate,
} from './input/touchControls';
import { findKeyboardRule, openKeyboard, handleKeyDown, handleKeyUp, handleKeyboardInput } from './input/keyboard';
import { getMousePos, handleMouseMove, handleMouseDown, handleMouseUp } from './input/mouseHandlers';
import { startGame, handleGameError, handleGameExit, handleProgress, setCurrentSave, setCursorPos } from './engine/session';
import SessionContext from './engine/sessionContext';

import ErrorOverlay from './ui/ErrorOverlay';
import LoadingScreen from './ui/LoadingScreen';
import StartScreen from './ui/StartScreen';
import SaveManager from './ui/SaveManager';
import CompressMpq from './mpqcmp';

import Peer from 'peerjs';

window.Peer = Peer;

if (process.env.NODE_ENV === 'production') {
  ReactGA.initialize('UA-43123589-6');
  ReactGA.pageview('/');
}

let keyboardRule = null;
try {
  keyboardRule = findKeyboardRule();
} catch (e) {
}

class App extends React.Component {
  files = new Map();
  state = {started: false, loading: false, dropping: 0, has_spawn: false, has_saves: false, savesVersion: 0, updateAvailable: false, storageError: null};
  cursorPos = {x: 0, y: 0};

  touchControls = false;
  touchButtons = [null, null, null, null, null, null, null, null, null, null];
  touchCtx = [null, null, null, null, null, null];
  touchMods = [false, false, false, false, false, false];
  touchBelt = [-1, -1, -1, -1, -1, -1];
  maxKeyboard = 0;

  fs = create_fs();

  constructor(props) {
    super(props);

    this.fileDropTarget = createFileDropTarget({
      target: document,
      onDrop: this.onDrop,
      onDragOver: this.onDragOver,
      onDragEnter: this.onDragEnter,
      onDragLeave: this.onDragLeave,
    });

    const touchListenerOptions = {passive: false, capture: true};
    this.runtimeListeners = createEventListeners([
      {target: document, event: 'mousemove', handler: this.onMouseMove, options: true},
      {target: document, event: 'mousedown', handler: this.onMouseDown, options: true},
      {target: document, event: 'mouseup', handler: this.onMouseUp, options: true},
      {target: document, event: 'keydown', handler: this.onKeyDown, options: true},
      {target: document, event: 'keyup', handler: this.onKeyUp, options: true},
      {target: document, event: 'contextmenu', handler: this.onMenu, options: true},
      {target: document, event: 'touchstart', handler: this.onTouchStart, options: touchListenerOptions},
      {target: document, event: 'touchmove', handler: this.onTouchMove, options: touchListenerOptions},
      {target: document, event: 'touchend', handler: this.onTouchEnd, options: touchListenerOptions},
      {target: document, event: 'pointerlockchange', handler: this.onPointerLockChange},
      {target: window, event: 'resize', handler: this.onResize},
    ]);

    this.setTouch0 = this.setTouch_.bind(this, 0);
    this.setTouch1 = this.setTouch_.bind(this, 1);
    this.setTouch2 = this.setTouch_.bind(this, 2);
    this.setTouch3 = this.setTouchBelt_.bind(this, 3);
    this.setTouch4 = this.setTouchBelt_.bind(this, 4);
    this.setTouch5 = this.setTouchBelt_.bind(this, 5);

    this.setTouch6 = this.setTouch_.bind(this, 6);
    this.setTouch7 = this.setTouch_.bind(this, 7);
    this.setTouch8 = this.setTouch_.bind(this, 8);
    this.setTouch9 = this.setTouch_.bind(this, 9);
  }

  onSwUpdate = () => this.setState({updateAvailable: true});

  componentDidMount() {
    this.fileDropTarget.attach();
    window.addEventListener('swUpdate', this.onSwUpdate);

    this.fs.then(fs => {
      if (fs.initError) {
        this.setState({storageError: fs.initError.message || String(fs.initError)});
      }
      const spawn = fs.files.get('spawn.mpq');
      if (spawn && SpawnSizes.includes(spawn.byteLength)) {
        this.setState({has_spawn: true});
      }
      for (const name of fs.files.keys()) {
        if (name.match(/\.sv$/i)) {
          this.setState({has_saves: true});
          break;
        }
      }
    });
  }

  componentWillUnmount() {
    this.fileDropTarget.detach();
    this.runtimeListeners.detach();
    window.removeEventListener('swUpdate', this.onSwUpdate);
  }

  // ─── Drag-and-drop ──────────────────────────────────────────────────────────

  onDrop = e => {
    const file = getDropFile(e);
    if (file) {
      e.preventDefault();
      if (this.compressMpq && !file.name.match(/\.sv$/i)) {
        this.compressMpq.start(file);
      } else {
        this.start(file);
      }
    }
    this.setState({dropping: 0});
  }

  onDragEnter = e => {
    e.preventDefault();
    this.setDropping(1);
  }

  onDragOver = e => {
    if (isDropFile(e)) {
      e.preventDefault();
    }
  }

  onDragLeave = () => {
    this.setDropping(-1);
  }

  setDropping(inc) {
    this.setState(({dropping}) => ({dropping: Math.max(dropping + inc, 0)}));
  }

  // ─── Session delegates ──────────────────────────────────────────────────────

  start = file => startGame(this, file);
  onError = (message, stack) => handleGameError(this, message, stack);
  onExit() { handleGameExit(this); }
  onProgress(progress) { handleProgress(this, progress); }
  setCurrentSave(name) { setCurrentSave(this, name); }
  setCursorPos(x, y) { setCursorPos(this, x, y); }
  openKeyboard(rect) { openKeyboard(this, keyboardRule, rect); }

  onSaveUploaded() {
    this.setState(s => ({savesVersion: s.savesVersion + 1, has_saves: true}));
  }

  openSaveManager = () => this.setState({show_saves: true});
  closeSaveManager = () => this.setState({show_saves: false});
  openCompressor = () => this.setState({compress: true});
  closeCompressor = () => this.setState({compress: false});

  getSessionContextValue() {
    const {started, loading, progress, error, retail, has_spawn, has_saves, savesVersion, show_saves, compress} = this.state;
    return {
      started,
      loading,
      progress,
      error,
      retail,
      hasSpawn: has_spawn,
      hasSaves: has_saves,
      savesVersion,
      showSaveManager: !!show_saves,
      showCompressor: !!compress,
      fs: this.fs,
      saveName: this.saveName,
      startGame: this.start,
      openSaveManager: this.openSaveManager,
      closeSaveManager: this.closeSaveManager,
      openCompressor: this.openCompressor,
      closeCompressor: this.closeCompressor,
    };
  }

  // ─── Pointer lock ───────────────────────────────────────────────────────────

  pointerLocked() {
    return document.pointerLockElement === this.canvas || document.mozPointerLockElement === this.canvas;
  }

  eventMods(e) {
    return ((e.shiftKey || this.touchMods[TOUCH_SHIFT]) ? 1 : 0) + (e.ctrlKey ? 2 : 0) + (e.altKey ? 4 : 0) + (e.touches ? 8 : 0);
  }

  onResize = () => { document.exitPointerLock(); }

  onPointerLockChange = () => {
    if (window.screen && window.innerHeight === window.screen.height && !this.pointerLocked()) {
      this.game('DApi_Key', 0, 0, 27);
      this.game('DApi_Key', 1, 0, 27);
    }
  }

  // ─── Mouse event delegates ──────────────────────────────────────────────────

  onMouseMove = e => handleMouseMove(this, e);
  onMouseDown = e => handleMouseDown(this, e);
  onMouseUp = e => handleMouseUp(this, e);
  onMenu = e => { e.preventDefault(); }

  // ─── Keyboard event delegates ───────────────────────────────────────────────

  onKeyDown = e => handleKeyDown(this, e);
  onKeyUp = e => handleKeyUp(this, e);
  onKeyboard = () => handleKeyboardInput(this, 0);
  onKeyboardBlur = () => handleKeyboardInput(this, 1);

  // ─── Touch events ───────────────────────────────────────────────────────────

  onTouchStart = e => {
    if (!this.canvas) return;
    if (e.target === this.keyboard) {
      return;
    } else {
      this.keyboard.blur();
    }
    e.preventDefault();
    if (applyTouchButtonUpdate(this, e.touches, false)) {
      const {x, y} = getMousePos(this, this.touchCanvas);
      this.game('DApi_Mouse', 0, 0, this.eventMods(e), x, y);
      if (!this.touchMods[TOUCH_MOVE]) {
        this.game('DApi_Mouse', 1, this.touchMods[TOUCH_RMB] ? 2 : 1, this.eventMods(e), x, y);
      }
    }
  }

  onTouchMove = e => {
    if (!this.canvas) return;
    if (e.target === this.keyboard) {
      return;
    }
    e.preventDefault();
    if (applyTouchButtonUpdate(this, e.touches, false)) {
      const {x, y} = getMousePos(this, this.touchCanvas);
      this.game('DApi_Mouse', 0, 0, this.eventMods(e), x, y);
    }
  }

  onTouchEnd = e => {
    if (!this.canvas) return;
    if (e.target !== this.keyboard) {
      e.preventDefault();
    }
    const prevTc = this.touchCanvas;
    applyTouchButtonUpdate(this, e.touches, true);
    if (prevTc && !this.touchCanvas) {
      const {x, y} = getMousePos(this, prevTc);
      this.game('DApi_Mouse', 2, 1, this.eventMods(e), x, y);
      this.game('DApi_Mouse', 2, 2, this.eventMods(e), x, y);

      if (this.touchMods[TOUCH_RMB] && (!this.touchButton || this.touchButton.index !== TOUCH_RMB)) {
        applyTouchMod(this, TOUCH_RMB, false);
      }
    }
    if (!document.fullscreenElement) {
      this.element.requestFullscreen();
    }
  }

  // ─── Ref setters ────────────────────────────────────────────────────────────

  setCanvas = e => { this.canvas = e; }
  setElement = e => { this.element = e; }
  setKeyboard = e => { this.keyboard = e; }

  setTouch_(i, e) {
    this.touchButtons[i] = e;
  }

  setTouchBelt_(i, e) {
    this.touchButtons[i] = e;
    if (e) {
      const canvas = document.createElement('canvas');
      canvas.width = 28;
      canvas.height = 28;
      e.appendChild(canvas);
      this.touchCtx[i] = canvas.getContext('2d');
    } else {
      this.touchCtx[i] = null;
    }
  }

  // ─── Belt rendering ──────────────────────────────────────────────────────────

  drawBelt(idx, slot) {
    if (!this.canvas) return;
    if (!this.touchButtons[idx]) {
      return;
    }
    this.touchBelt[idx] = slot;
    if (slot >= 0) {
      this.touchButtons[idx].style.display = 'block';
      this.touchCtx[idx].drawImage(this.canvas, 205 + 29 * slot, 357, 28, 28, 0, 0, 28, 28);
    } else {
      this.touchButtons[idx].style.display = 'none';
    }
  }

  updateBelt(belt) {
    if (belt) {
      const used = new Set();
      let pos = 3;
      for (let i = 0; i < belt.length && pos < 6; ++i) {
        if (belt[i] >= 0 && !used.has(belt[i])) {
          this.drawBelt(pos++, i);
          used.add(belt[i]);
        }
      }
      for (; pos < 6; ++pos) {
        this.drawBelt(pos, -1);
      }
    } else {
      this.drawBelt(3, -1);
      this.drawBelt(4, -1);
      this.drawBelt(5, -1);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  renderUi() {
    const {started, loading, error, show_saves, compress} = this.state;
    if (show_saves) {
      return <SaveManager/>;
    } else if (compress) {
      return (
        <CompressMpq
          onClose={this.closeCompressor}
          onError={this.onError}
          ref={e => { this.compressMpq = e; }}
        />
      );
    } else if (error) {
      return <ErrorOverlay/>;
    } else if (loading && !started) {
      return <LoadingScreen/>;
    } else if (!started) {
      return <StartScreen/>;
    }
  }

  render() {
    const {started, error, dropping, updateAvailable} = this.state;
    const sessionContextValue = this.getSessionContextValue();
    return (
      <SessionContext.Provider value={sessionContextValue}>
        <div className={classNames('App', {touch: this.touchControls, started, dropping, keyboard: !!this.showKeyboard})} ref={this.setElement}>
          {updateAvailable && (
            <div className="updateBanner">
              A new version is available.{' '}
              <button onClick={() => window.location.reload()}>Reload</button>
            </div>
          )}
          {this.state.storageError && (
            <div className="storageBanner">
              Save storage unavailable — game progress will not be saved.{' '}
              <small>({this.state.storageError})</small>
            </div>
          )}
          <div className="touch-ui touch-mods">
            <div className={classNames('touch-button', 'touch-button-0', {active: this.touchMods[0]})} ref={this.setTouch0}/>
            <div className={classNames('touch-button', 'touch-button-1', {active: this.touchMods[1]})} ref={this.setTouch1}/>
            <div className={classNames('touch-button', 'touch-button-2', {active: this.touchMods[2]})} ref={this.setTouch2}/>
          </div>
          <div className="touch-ui touch-belt">
            <div className={classNames('touch-button', 'touch-button-0')} ref={this.setTouch3}/>
            <div className={classNames('touch-button', 'touch-button-1')} ref={this.setTouch4}/>
            <div className={classNames('touch-button', 'touch-button-2')} ref={this.setTouch5}/>
          </div>
          <div className="touch-ui fkeys-left">
            <div className={classNames('touch-button', 'touch-button-3')} ref={this.setTouch6}/>
            <div className={classNames('touch-button', 'touch-button-4')} ref={this.setTouch7}/>
          </div>
          <div className="touch-ui fkeys-right">
            <div className={classNames('touch-button', 'touch-button-5')} ref={this.setTouch8}/>
            <div className={classNames('touch-button', 'touch-button-6')} ref={this.setTouch9}/>
          </div>
          <div className="Body">
            <div className="inner">
              {!error && <canvas ref={this.setCanvas} width={640} height={480}/>}
              <input type="text" className="keyboard" onChange={this.onKeyboard} onBlur={this.onKeyboardBlur} ref={this.setKeyboard} spellCheck={false} style={this.showKeyboard || {}}/>
            </div>
          </div>
          <div className="BodyV">
            {this.renderUi()}
          </div>
        </div>
      </SessionContext.Provider>
    );
  }
}

export default App;
