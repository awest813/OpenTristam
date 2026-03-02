import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import DialogFrame from './DialogFrame';

describe('DialogFrame', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  async function renderDialog(ui) {
    await act(async () => {
      root.render(ui);
      await Promise.resolve();
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('focuses first focusable control on mount', async () => {
    await renderDialog(
      <DialogFrame className="start" ariaLabel="Dialog">
        <button type="button">First</button>
        <button type="button">Second</button>
      </DialogFrame>,
    );

    expect(document.activeElement.textContent).toBe('First');
  });

  it('traps tab focus within dialog controls', async () => {
    await renderDialog(
      <DialogFrame className="start" ariaLabel="Dialog">
        <button type="button">First</button>
        <button type="button">Second</button>
      </DialogFrame>,
    );

    const buttons = container.querySelectorAll('button');
    buttons[1].focus();
    buttons[1].dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true}));
    expect(document.activeElement).toBe(buttons[0]);

    buttons[0].focus();
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', shiftKey: true, bubbles: true, cancelable: true}));
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('invokes onEscape handler when Escape is pressed', async () => {
    const onEscape = jest.fn();
    await renderDialog(
      <DialogFrame className="start" ariaLabel="Dialog" onEscape={onEscape}>
        <button type="button">First</button>
      </DialogFrame>,
    );

    const frame = container.querySelector('.start');
    frame.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('restores focus to previously focused element on unmount', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open';
    document.body.appendChild(trigger);
    trigger.focus();

    await renderDialog(
      <DialogFrame className="start" ariaLabel="Dialog">
        <button type="button">First</button>
      </DialogFrame>,
    );
    expect(document.activeElement.textContent).toBe('First');

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
