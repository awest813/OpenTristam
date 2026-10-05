import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import ChunkErrorBoundary from './ChunkErrorBoundary';

function Broken() {
  throw new Error('Failed to fetch dynamically imported module');
}

describe('ChunkErrorBoundary', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });

  it('renders children when nothing fails', async () => {
    await act(async () => {
      root.render(
        <ChunkErrorBoundary onClose={jest.fn()}>
          <p className="ok">Saves</p>
        </ChunkErrorBoundary>
      );
    });
    expect(container.querySelector('.ok')).toBeTruthy();
  });

  it('shows a recoverable dialog instead of blanking the app', async () => {
    const onClose = jest.fn();
    const onReload = jest.fn();
    await act(async () => {
      root.render(
        <ChunkErrorBoundary onClose={onClose} onReload={onReload}>
          <Broken />
        </ChunkErrorBoundary>
      );
    });

    expect(container.querySelector('[role="alertdialog"]').textContent).toMatch(
      /Couldn’t open this screen/
    );
    const [back, reload] = container.querySelectorAll('button');
    expect(document.activeElement).toBe(back);
    await act(async () => back.click());
    expect(onClose).toHaveBeenCalled();
    await act(async () => reload.click());
    expect(onReload).toHaveBeenCalled();
  });
});
