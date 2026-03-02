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
});
