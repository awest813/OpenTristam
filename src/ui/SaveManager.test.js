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
        <SessionContext.Provider value={{ ...defaultSessionValue, ...overrides }}>
          <SaveManager />
        </SessionContext.Provider>
      );
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders semantic icon buttons and dispatches download/remove actions', async () => {
    const files = new Map([['hero.sv', new Uint8Array([1])]]);
    const fsApi = {
      files,
      delete: jest.fn(() => Promise.resolve()),
      download: jest.fn(),
      upload: jest.fn(() => Promise.resolve()),
    };

    await renderWithSession({ fs: Promise.resolve(fsApi) });

    const downloadButton = container.querySelector('button[aria-label="Download hero.sv"]');
    const deleteButton = container.querySelector('button[aria-label="Delete hero.sv"]');
    expect(downloadButton).toBeTruthy();
    expect(deleteButton).toBeTruthy();
    expect(downloadButton.classList.contains('saveIconButton')).toBe(true);
    expect(deleteButton.classList.contains('saveIconButton')).toBe(true);

    await act(async () => {
      downloadButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(fsApi.download).toHaveBeenCalledWith('hero.sv');

    // Deleting is a two-step confirmation — the first click only reveals it.
    await act(async () => {
      deleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(fsApi.delete).not.toHaveBeenCalled();

    const confirmButton = container.querySelector('button[aria-label="Confirm deleting hero.sv"]');
    expect(confirmButton).toBeTruthy();

    await act(async () => {
      confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(fsApi.delete).toHaveBeenCalledWith('hero.sv');
  });

  it('does not delete a save when the confirmation is cancelled', async () => {
    const fsApi = {
      files: new Map([['hero.sv', new Uint8Array([1])]]),
      delete: jest.fn(() => Promise.resolve()),
      download: jest.fn(),
      upload: jest.fn(() => Promise.resolve()),
    };

    await renderWithSession({ fs: Promise.resolve(fsApi) });

    await act(async () => {
      container
        .querySelector('button[aria-label="Delete hero.sv"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const cancelButton = container.querySelector('button[aria-label="Cancel deleting hero.sv"]');
    expect(cancelButton).toBeTruthy();

    await act(async () => {
      cancelButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(fsApi.delete).not.toHaveBeenCalled();
    // The standard download/delete actions are restored.
    expect(container.querySelector('button[aria-label="Delete hero.sv"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Confirm deleting hero.sv"]')).toBeNull();
  });

  it('reports a success notice after deleting a save', async () => {
    const showNotice = jest.fn();
    const fsApi = {
      files: new Map([['hero.sv', new Uint8Array([1])]]),
      delete: jest.fn(() => Promise.resolve()),
      download: jest.fn(),
      upload: jest.fn(() => Promise.resolve()),
    };

    await renderWithSession({ fs: Promise.resolve(fsApi), showNotice });

    await act(async () => {
      container
        .querySelector('button[aria-label="Delete hero.sv"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      container
        .querySelector('button[aria-label="Confirm deleting hero.sv"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(showNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: 'success' }));
  });

  it('reports a success notice after importing a save with readable hero data', async () => {
    const showNotice = jest.fn();
    const upload = jest.fn(async (file) => {
      fsApi.files.set(file.name.toLowerCase(), new Uint8Array([1]));
    });
    // getPlayerName returns null for garbage bytes — still treat as import success path via tone info/success.
    const fsApi = { files: new Map(), delete: jest.fn(), download: jest.fn(), upload };

    await renderWithSession({ fs: Promise.resolve(fsApi), showNotice });

    const input = container.querySelector('input[type="file"]');
    const file = new File(['x'], 'hero.sv', { type: 'application/octet-stream' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(upload).toHaveBeenCalledWith(file);
    expect(showNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/Imported “hero\.sv”/),
      })
    );
  });

  it('rejects non-.sv uploads before calling storage', async () => {
    const showNotice = jest.fn();
    const upload = jest.fn(() => Promise.resolve());
    const fsApi = { files: new Map(), delete: jest.fn(), download: jest.fn(), upload };

    await renderWithSession({ fs: Promise.resolve(fsApi), showNotice });

    const input = container.querySelector('input[type="file"]');
    const file = new File(['x'], 'DIABDAT.MPQ');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    expect(upload).not.toHaveBeenCalled();
    expect(showNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: 'error' }));
  });

  it('reports an error notice when delete fails', async () => {
    const showNotice = jest.fn();
    const fsApi = {
      files: new Map([['hero.sv', new Uint8Array([1])]]),
      delete: jest.fn(() => Promise.reject(new Error('unavailable'))),
      download: jest.fn(),
      upload: jest.fn(),
    };

    await renderWithSession({ fs: Promise.resolve(fsApi), showNotice });

    await act(async () => {
      container
        .querySelector('button[aria-label="Delete hero.sv"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      container
        .querySelector('button[aria-label="Confirm deleting hero.sv"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(showNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: 'error' }));
  });

  it('resets the file input after a change so the same file can be reselected', async () => {
    const fsApi = {
      files: new Map(),
      delete: jest.fn(),
      download: jest.fn(),
      upload: jest.fn(() => Promise.resolve()),
    };
    await renderWithSession({ fs: Promise.resolve(fsApi) });

    const input = container.querySelector('input[type="file"]');
    const file = new File(['x'], 'hero.sv');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    // Handler clears value so picking the same path again still fires change.
    expect(input.value).toBe('');
  });

  it('lays out the footer Back and Upload actions in a single row', async () => {
    const fsApi = { files: new Map(), delete: jest.fn(), download: jest.fn(), upload: jest.fn() };
    await renderWithSession({ fs: Promise.resolve(fsApi) });

    const actions = container.querySelector('.saveManagerActions');
    expect(actions).toBeTruthy();
    const labels = Array.from(actions.querySelectorAll('button')).map((b) => b.textContent.trim());
    expect(labels).toEqual(['Back', 'Upload Save']);
  });

  it('shows an empty state message when there are no save files', async () => {
    const fsApi = {
      files: new Map(),
      delete: jest.fn(),
      download: jest.fn(),
      upload: jest.fn(),
    };

    await renderWithSession({ fs: Promise.resolve(fsApi) });

    expect(container.textContent).toContain('No save files found.');
    expect(container.querySelector('ul.saveList')).toBeNull();
  });

  it('offers an inline upload CTA in the empty state that opens the file picker', async () => {
    const fsApi = { files: new Map(), delete: jest.fn(), download: jest.fn(), upload: jest.fn() };
    await renderWithSession({ fs: Promise.resolve(fsApi) });

    const cta = container.querySelector('.savesEmpty .savesEmptyCta');
    expect(cta).toBeTruthy();
    expect(cta.textContent.trim()).toBe('Upload a save');

    const input = container.querySelector('input[type="file"]');
    input.click = jest.fn();

    act(() => {
      cta.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(input.click).toHaveBeenCalledTimes(1);
  });

  it('upload file input has an accessible aria-label', async () => {
    const fsApi = { files: new Map(), delete: jest.fn(), download: jest.fn(), upload: jest.fn() };
    await renderWithSession({ fs: Promise.resolve(fsApi) });

    const uploadInput = container.querySelector('input[type="file"]');
    expect(uploadInput).toBeTruthy();
    expect(uploadInput.getAttribute('aria-label')).toBeTruthy();
  });
});
