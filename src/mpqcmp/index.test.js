import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import CompressMpq from './index';

describe('CompressMpq', () => {
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
    });
    container.remove();
  });

  async function render(props = {}) {
    await act(async () => {
      root.render(<CompressMpq onClose={() => {}} onError={() => {}} {...props} />);
      await Promise.resolve();
    });
  }

  it('renders the titled intro screen with a tidy action row', async () => {
    await render();

    expect(container.querySelector('.startTitleText').textContent).toBe('COMPRESS');
    expect(container.textContent).toMatch(/Select an MPQ file or drop it onto the page/i);
    expect(container.textContent).not.toMatch(/click the button below/i);

    const actions = container.querySelector('.dialogActions');
    expect(actions).toBeTruthy();
    const labels = Array.from(actions.querySelectorAll('button')).map((b) => b.textContent.trim());
    expect(labels).toEqual(['Back', 'Select MPQ']);
    expect(actions.querySelector('.startButton--primary').textContent.trim()).toBe('Select MPQ');
  });

  it('opens the hidden file picker when Select MPQ is clicked', async () => {
    await render();

    const selectButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Select MPQ'
    );
    const input = container.querySelector('input[type="file"]');
    input.click = jest.fn();

    act(() => {
      selectButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(input.click).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose from the Back button', async () => {
    const onClose = jest.fn();
    await render({ onClose });

    const backButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Back'
    );

    act(() => {
      backButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
