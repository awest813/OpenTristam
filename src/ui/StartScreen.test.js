import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SessionContext, { defaultSessionValue } from '../engine/sessionContext';
import StartScreen from './StartScreen';

describe('StartScreen', () => {
  let container;
  let root;

  const renderWithSession = async overrides => {
    await act(async () => {
      root.render(
        <SessionContext.Provider value={{...defaultSessionValue, ...overrides}}>
          <StartScreen/>
        </SessionContext.Provider>,
      );
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('opens hidden MPQ file input when Select MPQ is clicked', async () => {
    await renderWithSession({});

    const selectButton = Array.from(container.querySelectorAll('button.startButton'))
      .find(node => node.textContent === 'Select MPQ');
    const input = container.querySelector('input[type="file"]');
    input.click = jest.fn();

    act(() => {
      selectButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });

    expect(input.click).toHaveBeenCalledTimes(1);
  });

  it('starts game with selected MPQ file', async () => {
    const startGame = jest.fn();
    await renderWithSession({startGame});

    const input = container.querySelector('input[type="file"]');
    const file = new File(['test'], 'DIABDAT.MPQ', {type: 'application/octet-stream'});
    Object.defineProperty(input, 'files', {value: [file], configurable: true});

    act(() => {
      input.dispatchEvent(new Event('change', {bubbles: true}));
    });

    expect(startGame).toHaveBeenCalledWith(file);
  });

  it('updates touch settings from selector controls', async () => {
    const setTouchLayoutPreset = jest.fn();
    const setTouchPanSensitivity = jest.fn();
    await renderWithSession({
      isTouchDevice: true,
      touchLayoutPreset: 'default',
      touchPanSensitivity: 'normal',
      setTouchLayoutPreset,
      setTouchPanSensitivity,
    });

    const selects = container.querySelectorAll('.touchSettings select');
    const layoutSelect = selects[0];
    const sensitivitySelect = selects[1];
    Object.defineProperty(layoutSelect, 'value', {value: 'thumb', configurable: true});
    Object.defineProperty(sensitivitySelect, 'value', {value: 'high', configurable: true});

    act(() => {
      layoutSelect.dispatchEvent(new Event('change', {bubbles: true}));
      sensitivitySelect.dispatchEvent(new Event('change', {bubbles: true}));
    });

    expect(setTouchLayoutPreset).toHaveBeenCalledWith('thumb');
    expect(setTouchPanSensitivity).toHaveBeenCalledWith('high');
  });


  it('toggles high contrast mode from accessibility settings', async () => {
    const setHighContrastMode = jest.fn();
    await renderWithSession({
      highContrastMode: false,
      setHighContrastMode,
    });

    const highContrastCheckbox = container.querySelector('.accessibilitySettings input[type="checkbox"]');
    Object.defineProperty(highContrastCheckbox, 'checked', {value: true, configurable: true});

    act(() => {
      highContrastCheckbox.dispatchEvent(new Event('change', {bubbles: true}));
    });

    expect(setHighContrastMode).toHaveBeenCalledWith(true);
  });
  it('renders mobile onboarding and dismisses it', async () => {
    const dismissMobileOnboarding = jest.fn();
    await renderWithSession({
      showMobileOnboarding: true,
      dismissMobileOnboarding,
    });

    expect(container.querySelector('.mobileOnboarding')).not.toBeNull();
    const dismiss = Array.from(container.querySelectorAll('button.linkButton'))
      .find(node => node.textContent.trim() === 'Got it');

    act(() => {
      dismiss.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });

    expect(dismissMobileOnboarding).toHaveBeenCalledTimes(1);
  });
});
