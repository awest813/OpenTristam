import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SessionContext, { defaultSessionValue } from '../engine/sessionContext';
import MultiplayerStatusBanner from './MultiplayerStatusBanner';

describe('MultiplayerStatusBanner', () => {
  let container;
  let root;

  const renderWithSession = async (overrides) => {
    const value = {
      ...defaultSessionValue,
      ...overrides,
    };
    await act(async () => {
      root.render(
        <SessionContext.Provider value={value}>
          <MultiplayerStatusBanner />
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
    container = null;
    root = null;
  });

  it('does not render in idle status', async () => {
    await renderWithSession({ multiplayerStatus: 'idle' });
    expect(container.querySelector('.multiplayerBanner')).toBeNull();
  });

  it('renders failure state and invokes action callbacks', async () => {
    const retryMultiplayer = jest.fn();
    const copySessionId = jest.fn();
    const copyShareLink = jest.fn();
    const dismissMultiplayerNotice = jest.fn();
    await renderWithSession({
      multiplayerStatus: 'failed',
      multiplayerErrorCategory: 'game_not_found',
      multiplayerMessage: 'Session not found.',
      multiplayerSessionId: 'abc123',
      multiplayerShareUrl: 'https://example.test/?session=abc123',
      retryMultiplayer,
      copySessionId,
      copyShareLink,
      dismissMultiplayerNotice,
    });

    expect(container.textContent).toContain('Connection failed');
    expect(container.textContent).toContain('Session not found.');
    expect(container.textContent).not.toMatch(/game not found/i);
    const banner = container.querySelector('.multiplayerBanner');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.getAttribute('aria-live')).toBe('assertive');

    const buttons = Array.from(container.querySelectorAll('button'));
    const retryButton = buttons.find((node) => node.textContent === 'Try again');
    const reconnectButton = buttons.find((node) => node.textContent === 'Reconnect');
    const copySessionButton = buttons.find((node) => node.textContent === 'Copy ID');
    const copyShareButton = buttons.find((node) => node.textContent === 'Copy invite link');
    const dismissButton = buttons.find((node) => node.textContent === 'Dismiss');

    expect(retryButton).toBeTruthy();
    expect(reconnectButton).toBeFalsy();
    expect(copySessionButton).toBeTruthy();
    expect(copyShareButton).toBeTruthy();
    expect(dismissButton).toBeTruthy();

    act(() => {
      retryButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      copySessionButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      copyShareButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      dismissButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(retryMultiplayer).toHaveBeenCalledTimes(1);
    expect(copySessionId).toHaveBeenCalledTimes(1);
    expect(copyShareLink).toHaveBeenCalledTimes(1);
    expect(dismissMultiplayerNotice).toHaveBeenCalledTimes(1);
  });

  it('renders reconnect action only when connected', async () => {
    const reconnectMultiplayer = jest.fn();
    await renderWithSession({
      multiplayerStatus: 'connected',
      reconnectMultiplayer,
    });

    const reconnectButton = Array.from(container.querySelectorAll('button')).find(
      (node) => node.textContent === 'Reconnect'
    );
    expect(reconnectButton).toBeTruthy();

    act(() => {
      reconnectButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(reconnectMultiplayer).toHaveBeenCalledTimes(1);
  });

  it('shows session ID as visible text when connecting', async () => {
    await renderWithSession({
      multiplayerStatus: 'connecting',
      multiplayerSessionId: 'my-session',
    });
    const sessionIdEl = container.querySelector('.multiplayerBanner-session-id');
    expect(sessionIdEl).toBeTruthy();
    expect(sessionIdEl.textContent).toBe('my-session');
  });

  it('shows session ID as visible text when connected', async () => {
    await renderWithSession({
      multiplayerStatus: 'connected',
      multiplayerSessionId: 'my-session',
    });
    const sessionIdEl = container.querySelector('.multiplayerBanner-session-id');
    expect(sessionIdEl).toBeTruthy();
    expect(sessionIdEl.textContent).toBe('my-session');
  });

  it('shows a spinner when connecting', async () => {
    await renderWithSession({ multiplayerStatus: 'connecting', multiplayerSessionId: 'abc123' });
    expect(container.querySelector('.multiplayerBanner-spinner')).toBeTruthy();
  });

  it('hides the banner when connecting without a session (single-player startup)', async () => {
    await renderWithSession({ multiplayerStatus: 'connecting', multiplayerSessionId: null });
    expect(container.querySelector('.multiplayerBanner')).toBeNull();
  });

  it('shows a spinner when retrying', async () => {
    await renderWithSession({ multiplayerStatus: 'retrying' });
    expect(container.querySelector('.multiplayerBanner-spinner')).toBeTruthy();
  });

  it('does not show a spinner when failed', async () => {
    await renderWithSession({ multiplayerStatus: 'failed' });
    expect(container.querySelector('.multiplayerBanner-spinner')).toBeNull();
  });

  it('shows retry count when retrying with retryCount > 0', async () => {
    await renderWithSession({
      multiplayerStatus: 'retrying',
      multiplayerRetryCount: 3,
    });
    const retryCountEl = container.querySelector('.multiplayerBanner-retry-count');
    expect(retryCountEl).toBeTruthy();
    expect(retryCountEl.textContent).toContain('3');
    expect(retryCountEl.getAttribute('aria-label')).toBe('Attempt 3');
  });

  it('does not show retry count when retryCount is 0', async () => {
    await renderWithSession({
      multiplayerStatus: 'retrying',
      multiplayerRetryCount: 0,
    });
    expect(container.querySelector('.multiplayerBanner-retry-count')).toBeNull();
  });

  it('copy buttons have accessible aria-labels', async () => {
    await renderWithSession({
      multiplayerStatus: 'connecting',
      multiplayerSessionId: 'abc123',
      multiplayerShareUrl: 'https://example.test/?session=abc123',
    });
    const buttons = Array.from(container.querySelectorAll('button'));
    const copySessionButton = buttons.find((node) => node.textContent === 'Copy ID');
    const copyShareButton = buttons.find((node) => node.textContent === 'Copy invite link');
    expect(copySessionButton.getAttribute('aria-label')).toBe('Copy session ID to clipboard');
    expect(copyShareButton.getAttribute('aria-label')).toBe('Copy invite link to clipboard');
  });
});
