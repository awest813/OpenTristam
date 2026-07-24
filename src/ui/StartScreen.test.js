import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SessionContext, { defaultSessionValue } from '../engine/sessionContext';
import StartScreen from './StartScreen';

describe('StartScreen', () => {
  let container;
  let root;

  const renderWithSession = async (overrides) => {
    await act(async () => {
      root.render(
        <SessionContext.Provider value={{ ...defaultSessionValue, ...overrides }}>
          <StartScreen />
        </SessionContext.Provider>
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

    const selectButton = Array.from(container.querySelectorAll('button.startButton')).find(
      (node) => node.textContent === 'Select MPQ'
    );
    const input = container.querySelector('input[type="file"]');
    input.click = jest.fn();

    act(() => {
      selectButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(input.click).toHaveBeenCalledTimes(1);
  });

  it('starts game with selected MPQ file', async () => {
    const startGame = jest.fn();
    await renderWithSession({ startGame });

    const input = container.querySelector('input[type="file"]');
    const file = new File(['test'], 'DIABDAT.MPQ', { type: 'application/octet-stream' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });

    act(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(startGame).toHaveBeenCalledWith(file);
  });

  it('does not start game when no MPQ file is selected', async () => {
    const startGame = jest.fn();
    await renderWithSession({ startGame });

    const input = container.querySelector('input[type="file"]');
    Object.defineProperty(input, 'files', { value: null, configurable: true });

    act(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(startGame).not.toHaveBeenCalled();
  });

  it('adds an accessible label to hidden MPQ file input', async () => {
    await renderWithSession({});

    const input = container.querySelector('input[type="file"]');
    expect(input.getAttribute('aria-label')).toBe('Select MPQ file');
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
    Object.defineProperty(layoutSelect, 'value', { value: 'thumb', configurable: true });
    Object.defineProperty(sensitivitySelect, 'value', { value: 'high', configurable: true });

    act(() => {
      layoutSelect.dispatchEvent(new Event('change', { bubbles: true }));
      sensitivitySelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(setTouchLayoutPreset).toHaveBeenCalledWith('thumb');
    expect(setTouchPanSensitivity).toHaveBeenCalledWith('high');
  });

  it('renders mobile onboarding and dismisses it', async () => {
    const dismissMobileOnboarding = jest.fn();
    await renderWithSession({
      showMobileOnboarding: true,
      dismissMobileOnboarding,
    });

    expect(container.querySelector('.mobileOnboarding')).not.toBeNull();
    expect(container.querySelector('.mobileOnboardingLead')).not.toBeNull();
    const dismiss = Array.from(
      container.querySelectorAll('.mobileOnboarding button.linkButton')
    ).find((node) => node.textContent.trim() === 'Got it');

    act(() => {
      dismiss.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(dismissMobileOnboarding).toHaveBeenCalledTimes(1);
  });

  it('keeps settings collapsed and exposes display controls inside', async () => {
    await renderWithSession({ highContrastMode: false });

    const settings = container.querySelector('details.startSettings');
    expect(settings).not.toBeNull();
    expect(settings.open).toBe(false);
    expect(container.querySelector('.startBrand')?.textContent).toBe('OpenTristam');
    expect(container.querySelector('.startStepList')).toBeNull();

    const checkbox = container.querySelector('.displaySettings input[type="checkbox"]');
    expect(checkbox).not.toBeNull();
  });

  it('renders tester welcome and dismisses it', async () => {
    const dismissTesterWelcome = jest.fn();
    await renderWithSession({
      showTesterWelcome: true,
      dismissTesterWelcome,
    });

    expect(container.querySelector('.testerWelcome')).not.toBeNull();
    const dismiss = Array.from(container.querySelectorAll('.testerWelcome button.linkButton'))[0];

    act(() => {
      dismiss.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(dismissTesterWelcome).toHaveBeenCalledTimes(1);
  });

  it('renders display settings section with high-contrast checkbox', async () => {
    await renderWithSession({ highContrastMode: false });

    const section = container.querySelector('.displaySettings');
    expect(section).not.toBeNull();
    expect(section.getAttribute('role')).toBe('group');

    const checkbox = container.querySelector('.displaySettings input[type="checkbox"]');
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(false);
  });

  it('calls setHighContrastMode when high-contrast checkbox is toggled', async () => {
    const setHighContrastMode = jest.fn();
    await renderWithSession({ highContrastMode: false, setHighContrastMode });

    const checkbox = container.querySelector('.displaySettings input[type="checkbox"]');

    act(() => {
      checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setHighContrastMode).toHaveBeenCalledWith(true);
  });

  it('reflects highContrastMode true on checkbox', async () => {
    await renderWithSession({ highContrastMode: true });
    const checkbox = container.querySelector('.displaySettings input[type="checkbox"]');
    expect(checkbox.checked).toBe(true);
  });
});
