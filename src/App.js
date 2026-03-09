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
  beginTouchGesture,
  cancelTouchGesture,
  finishTouchGesture,
  setTouchMod as applyTouchMod,
  updateTouchGesture,
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
import MultiplayerStatusBanner from './ui/MultiplayerStatusBanner';
import {
  DEFAULT_TOUCH_LAYOUT_PRESET,
  DEFAULT_TOUCH_PAN_SENSITIVITY,
  TOUCH_LAYOUT_PRESETS,
  TOUCH_PAN_SENSITIVITIES,
  loadPreferences,
  savePreferences,
} from './preferences';

import Peer from 'peerjs';

window.Peer = Peer;

if (process.env.NODE_ENV === 'production') {
  ReactGA.initialize('UA-43123589-6');
  ReactGA.pageview('/');
}

let keyboardRule = null;
let keyboardRuleResolved = false;

function getKeyboardRule() {
  if (!keyboardRuleResolved) {
    keyboardRuleResolved = true;
    try {
      keyboardRule = findKeyboardRule();
    } catch (e) {
      // Keyboard rule detection is optional; ignore failures
    }
  }
  return keyboardRule;
}

const scheduleIdle = typeof requestIdleCallback === 'function'
  ? cb => requestIdleCallback(cb, {timeout: 500})
  : cb => setTimeout(cb, 0);

const CompressMpq = React.lazy(() => import('./mpqcmp'));

class App extends React.Component {
  files = new Map();
  state = {
    started: false,
    loading: false,
    dropping: 0,
    has_spawn: false,
    has_saves: false,
    savesVersion: 0,
    updateAvailable: false,
    storageError: null,
    // Game session state (set by engine/session helpers)
    progress: null,
    error: null,
    retail: false,
    // UI overlay state
    show_saves: false,
    compress: false,
    touchLayoutPreset: DEFAULT_TOUCH_LAYOUT_PRESET,
    touchPanSensitivity: DEFAULT_TOUCH_PAN_SENSITIVITY,
    isTouchDevice: false,
    showMobileOnboarding: false,
    mobileOnboardingDismissed: false,
    highContrastMode: false,
    multiplayerStatus: 'idle',
    multiplayerErrorCategory: null,
    multiplayerMessage: '',
    multiplayerSessionId: null,
    multiplayerShareUrl: null,
    multiplayerNoticeDismissed: false,
    multiplayerRetryCount: 0,
  };
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
    this.multiplayerOptions = this.resolveMultiplayerOptions();

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

  resolveMultiplayerOptions() {
    const config = {...(window.DIABLOWEB_MULTIPLAYER_OPTIONS || {})};
    const params = new URLSearchParams(window.location.search);
    const transport = params.get('transport');
    if (transport === 'peerjs' || transport === 'websocket') {
      config.kind = transport;
    }
    const websocketUrl = params.get('websocketUrl');
    if (websocketUrl) {
      config.websocketUrl = websocketUrl;
    }
    return config;
  }

  onSwUpdate = () => this.setState({updateAvailable: true});

  componentDidMount() {
    this.fileDropTarget.attach();
    window.addEventListener('swUpdate', this.onSwUpdate);

    scheduleIdle(() => {
      const preferences = loadPreferences();
      const isTouchDevice = this.detectTouchDevice();
      React.startTransition(() => {
        this.setState({
          touchLayoutPreset: preferences.touchLayoutPreset,
          touchPanSensitivity: preferences.touchPanSensitivity,
          mobileOnboardingDismissed: preferences.mobileOnboardingDismissed,
          highContrastMode: preferences.highContrastMode,
          isTouchDevice,
          showMobileOnboarding: isTouchDevice && !preferences.mobileOnboardingDismissed,
        });
      });
    });

    this.fs.then(fs => {
      if (fs.initError) {
        this.setState({storageError: fs.initError.message || String(fs.initError)});
      }
      const spawn = fs.files.get('spawn.mpq');
      if (spawn && SpawnSizes.includes(spawn.byteLength)) {
        this.setState({has_spawn: true});
      }
      for (const name of fs.files.keys()) {
        if (/\.sv$/i.test(name)) {
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
      if (this.state.compress && !/\.sv$/i.test(file.name)) {
        this.pendingCompressedFile = file;
        this.flushPendingCompressedFile();
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

  start = file => {
    this.setState({
      multiplayerStatus: 'idle',
      multiplayerErrorCategory: null,
      multiplayerMessage: '',
      multiplayerSessionId: null,
      multiplayerShareUrl: null,
      multiplayerNoticeDismissed: false,
      multiplayerRetryCount: 0,
    });
    startGame(this, file);
  };
  onError = (message, stack) => handleGameError(this, message, stack);
  onExit() { handleGameExit(this); }
  onProgress(progress) { handleProgress(this, progress); }
  setCurrentSave(name) { setCurrentSave(this, name); }
  setCursorPos(x, y) { setCursorPos(this, x, y); }
  openKeyboard(rect) { openKeyboard(this, getKeyboardRule(), rect); }
  onMultiplayerEvent = event => {
    this.multiplayerEvents = [...(this.multiplayerEvents || []), event];
    if (this.multiplayerEvents.length > 200) {
      this.multiplayerEvents = this.multiplayerEvents.slice(this.multiplayerEvents.length - 200);
    }
  }
  onMultiplayerStatus = status => {
    this.setState({
      multiplayerStatus: status.status || 'idle',
      multiplayerErrorCategory: status.category || null,
      multiplayerMessage: status.message || '',
      multiplayerSessionId: status.sessionId || null,
      multiplayerShareUrl: status.shareUrl || null,
      multiplayerNoticeDismissed: false,
      multiplayerRetryCount: status.retryCount || 0,
    });
  }

  retryMultiplayer = () => {
    if (this.game && this.game.retryMultiplayer) {
      this.game.retryMultiplayer();
    }
  }

  reconnectMultiplayer = () => {
    if (this.game && this.game.reconnectMultiplayer) {
      this.game.reconnectMultiplayer();
    }
  }

  copyText = async text => {
    if (!text) {
      return false;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      // Clipboard API unavailable or permission denied — fall through to execCommand
    }
    const input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand ? document.execCommand('copy') : false;
    document.body.removeChild(input);
    return copied;
  }

  copySessionId = async () => {
    const {multiplayerSessionId} = this.state;
    const copied = await this.copyText(multiplayerSessionId);
    if (copied) {
      this.setState({multiplayerMessage: 'Session ID copied to clipboard.'});
    }
  }

  copyShareLink = async () => {
    const {multiplayerShareUrl} = this.state;
    const copied = await this.copyText(multiplayerShareUrl);
    if (copied) {
      this.setState({multiplayerMessage: 'Share link copied to clipboard.'});
    }
  }

  dismissMultiplayerNotice = () => {
    this.setState({multiplayerNoticeDismissed: true});
  }

  detectTouchDevice() {
    const nav = window.navigator || {};
    const hasTouchPoints = !!(nav.maxTouchPoints && nav.maxTouchPoints > 0);
    const hasTouchEvents = 'ontouchstart' in window;
    const coarsePointer = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
    return hasTouchPoints || hasTouchEvents || coarsePointer;
  }

  setTouchLayoutPreset = preset => {
    if (!TOUCH_LAYOUT_PRESETS.includes(preset)) {
      return;
    }
    savePreferences({touchLayoutPreset: preset});
    this.setState({touchLayoutPreset: preset});
  }

  setTouchPanSensitivity = sensitivity => {
    if (!TOUCH_PAN_SENSITIVITIES.includes(sensitivity)) {
      return;
    }
    savePreferences({touchPanSensitivity: sensitivity});
    this.setState({touchPanSensitivity: sensitivity});
  }

  dismissMobileOnboarding = () => {
    savePreferences({mobileOnboardingDismissed: true});
    this.setState({
      mobileOnboardingDismissed: true,
      showMobileOnboarding: false,
    });
  }

  setHighContrastMode = enabled => {
    const highContrastMode = Boolean(enabled);
    savePreferences({highContrastMode});
    this.setState({highContrastMode});
  }

  flushPendingCompressedFile = () => {
    if (!this.pendingCompressedFile || !this.compressMpq || !this.state.compress) {
      return;
    }
    const file = this.pendingCompressedFile;
    this.pendingCompressedFile = null;
    this.compressMpq.start(file);
  }

  setCompressMpqRef = node => {
    this.compressMpq = node;
    this.flushPendingCompressedFile();
  }

  onSaveUploaded() {
    this.setState(s => ({savesVersion: s.savesVersion + 1, has_saves: true}));
  }

  openSaveManager = () => this.setState({show_saves: true});
  closeSaveManager = () => this.setState({show_saves: false});
  openCompressor = () => this.setState({compress: true}, this.flushPendingCompressedFile);
  closeCompressor = () => {
    this.pendingCompressedFile = null;
    this.setState({compress: false});
  };

  getSessionContextValue() {
    const {
      started,
      loading,
      progress,
      error,
      retail,
      has_spawn,
      has_saves,
      savesVersion,
      show_saves,
      compress,
      multiplayerStatus,
      multiplayerErrorCategory,
      multiplayerMessage,
      multiplayerSessionId,
      multiplayerShareUrl,
      multiplayerNoticeDismissed,
      multiplayerRetryCount,
      touchLayoutPreset,
      touchPanSensitivity,
      isTouchDevice,
      showMobileOnboarding,
      highContrastMode,
    } = this.state;
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
      multiplayerStatus,
      multiplayerErrorCategory,
      multiplayerMessage,
      multiplayerSessionId,
      multiplayerShareUrl,
      multiplayerNoticeDismissed,
      multiplayerRetryCount,
      retryMultiplayer: this.retryMultiplayer,
      reconnectMultiplayer: this.reconnectMultiplayer,
      copySessionId: this.copySessionId,
      copyShareLink: this.copyShareLink,
      dismissMultiplayerNotice: this.dismissMultiplayerNotice,
      touchLayoutPreset,
      touchPanSensitivity,
      setTouchLayoutPreset: this.setTouchLayoutPreset,
      setTouchPanSensitivity: this.setTouchPanSensitivity,
      isTouchDevice,
      showMobileOnboarding,
      dismissMobileOnboarding: this.dismissMobileOnboarding,
      highContrastMode,
      setHighContrastMode: this.setHighContrastMode,
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

  getTouchEventTimestamp(e) {
    if (typeof e.timeStamp === 'number' && Number.isFinite(e.timeStamp)) {
      return e.timeStamp;
    }
    return performance.now();
  }

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
      const useGestureControl = !this.touchMods[TOUCH_MOVE] && !this.touchButton && e.touches.length === 1;
      if (useGestureControl) {
        beginTouchGesture(this, this.touchCanvas, this.getTouchEventTimestamp(e));
      } else if (!this.touchMods[TOUCH_MOVE]) {
        cancelTouchGesture(this);
        this.game('DApi_Mouse', 1, this.touchMods[TOUCH_RMB] ? 2 : 1, this.eventMods(e), x, y);
      }
    } else {
      cancelTouchGesture(this);
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
      if (this.touchGesture && this.touchCanvas && this.touchGesture.id === this.touchCanvas.identifier) {
        const pointerButton = this.touchMods[TOUCH_RMB] ? 2 : 1;
        const gestureUpdate = updateTouchGesture(this, this.touchCanvas, this.getTouchEventTimestamp(e), pointerButton);
        if (gestureUpdate.startDrag && !this.touchMods[TOUCH_MOVE]) {
          this.game('DApi_Mouse', 1, pointerButton, this.eventMods(e), x, y);
        }
      }
      if (e.touches.length > 1) {
        cancelTouchGesture(this);
      }
    } else {
      cancelTouchGesture(this);
    }
  }

  onTouchEnd = e => {
    if (!this.canvas) return;
    if (e.target !== this.keyboard) {
      e.preventDefault();
    }
    const prevTc = this.touchCanvas;
    const hadGesture = !!this.touchGesture && !!prevTc;
    applyTouchButtonUpdate(this, e.touches, true);
    if (prevTc && !this.touchCanvas) {
      const {x, y} = getMousePos(this, prevTc);
      const mods = this.eventMods(e);

      if (hadGesture) {
        const gestureResult = finishTouchGesture(this, this.getTouchEventTimestamp(e));
        if (gestureResult.kind === 'drag') {
          this.game('DApi_Mouse', 2, gestureResult.button || 1, mods, x, y);
        } else if (gestureResult.kind === 'long-press') {
          this.game('DApi_Mouse', 1, 2, mods, x, y);
          this.game('DApi_Mouse', 2, 2, mods, x, y);
        } else if (gestureResult.kind === 'tap') {
          const clickButton = this.touchMods[TOUCH_RMB] ? 2 : 1;
          this.game('DApi_Mouse', 1, clickButton, mods, x, y);
          this.game('DApi_Mouse', 2, clickButton, mods, x, y);
        } else {
          this.game('DApi_Mouse', 2, 1, mods, x, y);
          this.game('DApi_Mouse', 2, 2, mods, x, y);
        }
      } else {
        this.game('DApi_Mouse', 2, 1, mods, x, y);
        this.game('DApi_Mouse', 2, 2, mods, x, y);
      }

      if (this.touchMods[TOUCH_RMB] && (!this.touchButton || this.touchButton.index !== TOUCH_RMB)) {
        applyTouchMod(this, TOUCH_RMB, false);
      }
    }
    if (this.touchGesture && (!this.touchCanvas || this.touchGesture.id !== this.touchCanvas.identifier)) {
      cancelTouchGesture(this);
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
        <React.Suspense fallback={<LoadingScreen progress={{text: 'Loading MPQ compressor...'}}/>}>
          <CompressMpq
            onClose={this.closeCompressor}
            onError={this.onError}
            ref={this.setCompressMpqRef}
          />
        </React.Suspense>
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
    const {started, error, dropping, updateAvailable, touchLayoutPreset, highContrastMode} = this.state;
    const sessionContextValue = this.getSessionContextValue();
    const touchPresetClass = `touch-preset-${touchLayoutPreset || DEFAULT_TOUCH_LAYOUT_PRESET}`;
    return (
      <SessionContext.Provider value={sessionContextValue}>
        <div className={classNames('App', touchPresetClass, {'high-contrast': highContrastMode, touch: this.touchControls, started, dropping, keyboard: !!this.showKeyboard})} ref={this.setElement}>
          {updateAvailable && (
            <div className="updateBanner" role="status" aria-live="polite" aria-atomic="true">
              A new version is available.{' '}
              <button type="button" onClick={() => window.location.reload()}>Reload</button>
            </div>
          )}
          {this.state.storageError && (
            <div className="storageBanner" role="alert" aria-live="assertive" aria-atomic="true">
              Save storage unavailable — game progress will not be saved.{' '}
              <small>({this.state.storageError})</small>
            </div>
          )}
          <MultiplayerStatusBanner/>
          <div className="touch-ui touch-mods">
            <div className={classNames('touch-button', 'touch-button-0', {active: this.touchMods[0]})} ref={this.setTouch0} role="button" tabIndex={0} aria-label="Touch Mod 1"/>
            <div className={classNames('touch-button', 'touch-button-1', {active: this.touchMods[1]})} ref={this.setTouch1} role="button" tabIndex={0} aria-label="Touch Mod 2"/>
            <div className={classNames('touch-button', 'touch-button-2', {active: this.touchMods[2]})} ref={this.setTouch2} role="button" tabIndex={0} aria-label="Touch Mod 3"/>
          </div>
          <div className="touch-ui touch-belt">
            <div className={classNames('touch-button', 'touch-button-0')} ref={this.setTouch3} role="button" tabIndex={0} aria-label="Belt Slot 1"/>
            <div className={classNames('touch-button', 'touch-button-1')} ref={this.setTouch4} role="button" tabIndex={0} aria-label="Belt Slot 2"/>
            <div className={classNames('touch-button', 'touch-button-2')} ref={this.setTouch5} role="button" tabIndex={0} aria-label="Belt Slot 3"/>
          </div>
          <div className="touch-ui fkeys-left">
            <div className={classNames('touch-button', 'touch-button-3')} ref={this.setTouch6} role="button" tabIndex={0} aria-label="F-Key Left 1"/>
            <div className={classNames('touch-button', 'touch-button-4')} ref={this.setTouch7} role="button" tabIndex={0} aria-label="F-Key Left 2"/>
          </div>
          <div className="touch-ui fkeys-right">
            <div className={classNames('touch-button', 'touch-button-5')} ref={this.setTouch8} role="button" tabIndex={0} aria-label="F-Key Right 1"/>
            <div className={classNames('touch-button', 'touch-button-6')} ref={this.setTouch9} role="button" tabIndex={0} aria-label="F-Key Right 2"/>
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
