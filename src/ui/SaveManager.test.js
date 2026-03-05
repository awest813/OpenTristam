import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SessionContext, { defaultSessionValue } from '../engine/sessionContext';
import SaveManager from './SaveManager';

describe('SaveManager', () => {
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
    jest.restoreAllMocks();
  });

  async function renderWithSession(overrides) {
    await act(async () => {
      root.render(
        <SessionContext.Provider value={{...defaultSessionValue, ...overrides}}>
          <SaveManager/>
        </SessionContext.Provider>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders semantic icon buttons and dispatches download/remove actions', async () => {
    const files = new Map([
      ['hero.sv', new Uint8Array([1])],
    ]);
    const fsApi = {
      files,
      delete: jest.fn(() => Promise.resolve()),
      download: jest.fn(),
      upload: jest.fn(() => Promise.resolve()),
    };
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    await renderWithSession({fs: Promise.resolve(fsApi)});

    const downloadButton = container.querySelector('button[aria-label="Download hero.sv"]');
    const deleteButton = container.querySelector('button[aria-label="Delete hero.sv"]');
    expect(downloadButton).toBeTruthy();
    expect(deleteButton).toBeTruthy();
    expect(downloadButton.classList.contains('saveIconButton')).toBe(true);
    expect(deleteButton.classList.contains('saveIconButton')).toBe(true);

    await act(async () => {
      downloadButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      await Promise.resolve();
    });
    expect(fsApi.download).toHaveBeenCalledWith('hero.sv');

    await act(async () => {
      deleteButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      await Promise.resolve();
    });
    expect(fsApi.delete).toHaveBeenCalledWith('hero.sv');
  });

  it('shows an empty state message when there are no save files', async () => {
    const fsApi = {
      files: new Map(),
      delete: jest.fn(),
      download: jest.fn(),
      upload: jest.fn(),
    };

    await renderWithSession({fs: Promise.resolve(fsApi)});

    expect(container.textContent).toContain('No save files found.');
    expect(container.querySelector('ul.saveList')).toBeNull();
  });

  it('upload file input has an accessible aria-label', async () => {
    const fsApi = {files: new Map(), delete: jest.fn(), download: jest.fn(), upload: jest.fn()};
    await renderWithSession({fs: Promise.resolve(fsApi)});

    const uploadInput = container.querySelector('input[type="file"]');
    expect(uploadInput).toBeTruthy();
    expect(uploadInput.getAttribute('aria-label')).toBeTruthy();
  });
});
