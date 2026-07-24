import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SessionContext, { defaultSessionValue } from '../engine/sessionContext';
import ErrorOverlay from './ErrorOverlay';

describe('ErrorOverlay', () => {
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
          <ErrorOverlay />
        </SessionContext.Provider>
      );
      await Promise.resolve();
    });
  }

  it('renders nothing when there is no error', async () => {
    await renderWithSession({ error: null });
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('renders the error message and GitHub issue link', async () => {
    const error = { message: 'Something went terribly wrong' };
    await renderWithSession({ error, retail: false });

    expect(container.textContent).toContain('Something went terribly wrong');
    const issueLink = container.querySelector('a.errorIssueLink');
    expect(issueLink).toBeTruthy();
    expect(issueLink.href).toContain('github.com');
  });

  it('renders a soft-recovery button that invokes returnToStart', async () => {
    const returnToStart = jest.fn();

    await act(async () => {
      root.render(
        <SessionContext.Provider
          value={{
            ...defaultSessionValue,
            error: { message: 'Crash!' },
            retail: true,
            returnToStart,
          }}
        >
          <ErrorOverlay />
        </SessionContext.Provider>
      );
      await Promise.resolve();
    });

    const primary = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent.trim() === 'Back to start'
    );
    expect(primary).toBeTruthy();

    act(() => {
      primary.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(returnToStart).toHaveBeenCalledTimes(1);
  });

  it('falls back to a generic message when the error has no message', async () => {
    await renderWithSession({ error: { message: '' } });

    expect(container.querySelector('.body').textContent).toBe('An unexpected error occurred.');
  });

  it('shows friendly, retry-oriented copy for a network failure', async () => {
    await renderWithSession({ error: { message: 'Network Error' } });

    expect(container.querySelector('.header').textContent).toBe('Connection problem');
    expect(container.querySelector('.body').textContent).toMatch(/could not be downloaded/i);

    const primary = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.className.includes('startButton--primary')
    );
    expect(primary.textContent.trim()).toBe('Try again');
  });

  it('hides the GitHub report link for network failures', async () => {
    await renderWithSession({ error: { message: 'Network Error' } });
    expect(container.querySelector('a.errorIssueLink')).toBeNull();
  });

  it('shows a save file download link when error.save is provided', async () => {
    const error = { message: 'Oops', save: 'blob:https://example.com/abc' };
    await renderWithSession({ error, saveName: 'hero.sv' });

    const downloadLink = container.querySelector('a[download]');
    expect(downloadLink).toBeTruthy();
    expect(downloadLink.getAttribute('download')).toBe('hero.sv');
  });

  it('exposes a Copy details control', async () => {
    await renderWithSession({ error: { message: 'Crash details' } });
    const copyButton = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent.trim() === 'Copy details'
    );
    expect(copyButton).toBeTruthy();
  });
});
