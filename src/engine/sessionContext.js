import React from 'react';

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
};

const SessionContext = React.createContext(defaultSessionValue);

export function useSession() {
  return React.useContext(SessionContext);
}

export default SessionContext;
