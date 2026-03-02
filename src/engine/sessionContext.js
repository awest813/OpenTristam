import React from 'react';
import { DEFAULT_TOUCH_LAYOUT_PRESET, DEFAULT_TOUCH_PAN_SENSITIVITY } from '../preferences';

const noop = () => {};

export const defaultSessionValue = {
  started: false,
  loading: false,
  progress: null,
  error: null,
  retail: false,
  hasSpawn: false,
  hasSaves: false,
  savesVersion: 0,
  showSaveManager: false,
  showCompressor: false,
  fs: null,
  saveName: null,
  startGame: noop,
  openSaveManager: noop,
  closeSaveManager: noop,
  openCompressor: noop,
  closeCompressor: noop,
  multiplayerStatus: 'idle',
  multiplayerErrorCategory: null,
  multiplayerMessage: '',
  multiplayerSessionId: null,
  multiplayerShareUrl: null,
  multiplayerNoticeDismissed: false,
  retryMultiplayer: noop,
  reconnectMultiplayer: noop,
  copySessionId: noop,
  copyShareLink: noop,
  dismissMultiplayerNotice: noop,
  touchLayoutPreset: DEFAULT_TOUCH_LAYOUT_PRESET,
  touchPanSensitivity: DEFAULT_TOUCH_PAN_SENSITIVITY,
  setTouchLayoutPreset: noop,
  setTouchPanSensitivity: noop,
  isTouchDevice: false,
  showMobileOnboarding: false,
  dismissMobileOnboarding: noop,
  highContrastMode: false,
  setHighContrastMode: noop,
};

const SessionContext = React.createContext(defaultSessionValue);

export function useSession() {
  return React.useContext(SessionContext);
}

export default SessionContext;
