import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import SessionContext, { defaultSessionValue } from '../engine/sessionContext';
import StartScreen from './StartScreen';
import LoadingScreen from './LoadingScreen';
import ErrorOverlay from './ErrorOverlay';
import SaveManager from './SaveManager';

describe('session context-backed UI components', () => {
  let container;

  const makeSession = overrides => ({
    ...defaultSessionValue,
    ...overrides,
  });

  const renderWithSession = async (ui, sessionOverrides) => {
    const session = makeSession(sessionOverrides);
    await act(async () => {
      ReactDOM.render(
        <SessionContext.Provider value={session}>
          {ui}
        </SessionContext.Provider>,
        container,
      );
      await Promise.resolve();
    });
    return session;
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
    container = null;
  });

  it('StartScreen drives actions from session context', async () => {
    const startGame = jest.fn();
    const openSaveManager = jest.fn();

    await renderWithSession(<StartScreen/>, {
      hasSpawn: true,
      hasSaves: true,
      startGame,
      openSaveManager,
    });

    const buttons = Array.from(container.querySelectorAll('.startButton'));
    const sharewareButton = buttons.find(node => node.textContent === 'Play Shareware');
    const manageSavesButton = buttons.find(node => node.textContent === 'Manage Saves');

    expect(sharewareButton).toBeTruthy();
    expect(manageSavesButton).toBeTruthy();

    act(() => {
      sharewareButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      manageSavesButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });

    expect(startGame).toHaveBeenCalledWith(null);
    expect(openSaveManager).toHaveBeenCalledTimes(1);
  });

  it('LoadingScreen reads progress from session context', async () => {
    await renderWithSession(<LoadingScreen/>, {
      progress: {
        text: 'Booting...',
        loaded: 2,
        total: 4,
      },
    });

    expect(container.textContent).toContain('Booting...');
    expect(container.querySelector('.progressBar')).not.toBeNull();
  });

  it('ErrorOverlay renders from session context values', async () => {
    await renderWithSession(<ErrorOverlay/>, {
      error: {message: 'Unexpected failure'},
      retail: true,
      saveName: 'single_0.sv',
    });

    const root = container.querySelector('.error');
    expect(root).not.toBeNull();
    expect(root.textContent).toContain('Unexpected failure');
    expect(root.getAttribute('href')).toContain('github.com');
  });

  it('SaveManager closes via session context callback', async () => {
    const closeSaveManager = jest.fn();
    const fs = Promise.resolve({
      files: new Map(),
      delete: jest.fn(),
      download: jest.fn(),
      upload: jest.fn(() => Promise.resolve()),
    });

    await renderWithSession(<SaveManager/>, {fs, closeSaveManager});

    const backButton = Array.from(container.querySelectorAll('.startButton')).find(node => node.textContent === 'Back');
    expect(backButton).toBeTruthy();

    act(() => {
      backButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });

    expect(closeSaveManager).toHaveBeenCalledTimes(1);
  });
});
