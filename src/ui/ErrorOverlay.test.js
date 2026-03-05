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
        <SessionContext.Provider value={{...defaultSessionValue, ...overrides}}>
          <ErrorOverlay/>
        </SessionContext.Provider>,
      );
      await Promise.resolve();
    });
  }

  it('renders nothing when there is no error', async () => {
    await renderWithSession({error: null});
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('renders the error message and GitHub issue link', async () => {
    const error = {message: 'Something went terribly wrong'};
    await renderWithSession({error, retail: false});

    expect(container.textContent).toContain('Something went terribly wrong');
    const issueLink = container.querySelector('a.errorIssueLink');
    expect(issueLink).toBeTruthy();
    expect(issueLink.href).toContain('github.com');
  });

  it('renders a Reload button that invokes the onReload handler', async () => {
    const reloadMock = jest.fn();

    await act(async () => {
      root.render(
        <SessionContext.Provider value={{...defaultSessionValue, error: {message: 'Crash!'}, retail: true}}>
          <ErrorOverlay onReload={reloadMock}/>
        </SessionContext.Provider>,
      );
      await Promise.resolve();
    });

    const reloadButton = Array.from(container.querySelectorAll('button'))
      .find(btn => btn.textContent.trim() === 'Reload');
    expect(reloadButton).toBeTruthy();

    act(() => {
      reloadButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('shows a save file download link when error.save is provided', async () => {
    const error = {message: 'Oops', save: 'blob:https://example.com/abc'};
    await renderWithSession({error, saveName: 'hero.sv'});

    const downloadLink = container.querySelector('a[download]');
    expect(downloadLink).toBeTruthy();
    expect(downloadLink.getAttribute('download')).toBe('hero.sv');
  });
});
