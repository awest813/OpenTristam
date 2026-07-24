import React from 'react';
import classNames from 'classnames';
import { useSession } from '../engine/sessionContext';

const statusLabels = {
  connecting: 'Connecting',
  connected: 'Connected',
  retrying: 'Retrying',
  failed: 'Failed',
};

const categoryLabels = {
  transport_retry: 'Reconnecting',
  manual_retry: 'Manual retry',
  protocol_mismatch: 'Version mismatch',
  peer_disconnected: 'Peer disconnected',
  relay_fallback: 'Using relay',
  network_error: 'Network issue',
};

function formatCategory(category) {
  if (!category) {
    return '';
  }
  return categoryLabels[category] || category.replace(/_/g, ' ');
}

export default function MultiplayerStatusBanner(props) {
  const session = useSession();
  const status = props.status || session.multiplayerStatus;
  const category = props.category || session.multiplayerErrorCategory;
  const message = props.message || session.multiplayerMessage;
  const sessionId = props.sessionId || session.multiplayerSessionId;
  const shareUrl = props.shareUrl || session.multiplayerShareUrl;
  const dismissed = props.dismissed != null ? props.dismissed : session.multiplayerNoticeDismissed;
  const retryCount = props.retryCount != null ? props.retryCount : session.multiplayerRetryCount;
  const onRetry = props.onRetry || session.retryMultiplayer;
  const onReconnect = props.onReconnect || session.reconnectMultiplayer;
  const onCopySessionId = props.onCopySessionId || session.copySessionId;
  const onCopyShareLink = props.onCopyShareLink || session.copyShareLink;
  const onDismiss = props.onDismiss || session.dismissMultiplayerNotice;
  const showNotice = props.showNotice || session.showNotice;
  const [copyState, setCopyState] = React.useState('');

  // Suppress the banner during single-player startup: the PeerJS transport
  // fires 'connecting' events even when no multiplayer session was requested.
  if (!status || status === 'idle' || dismissed) {
    return null;
  }
  if (status === 'connecting' && !sessionId) {
    return null;
  }

  const isFailure = status === 'failed';
  const isConnecting = status === 'connecting' || status === 'retrying';
  const primaryActionLabel = status === 'retrying' ? 'Retry now' : 'Try again';
  const categoryLabel = formatCategory(category);

  const withCopyFeedback = async (action, successLabel) => {
    try {
      const ok = await action();
      if (ok === false) {
        throw new Error('copy failed');
      }
      setCopyState(successLabel);
      if (typeof showNotice === 'function') {
        showNotice({ tone: 'success', message: successLabel });
      }
      window.setTimeout(() => setCopyState(''), 2000);
    } catch (e) {
      if (typeof showNotice === 'function') {
        showNotice({ tone: 'error', message: 'Could not copy to the clipboard.' });
      }
    }
  };

  return (
    <div
      className={classNames('multiplayerBanner', `multiplayerBanner-${status}`)}
      role={isFailure ? 'alert' : 'status'}
      aria-live={isFailure ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div className="multiplayerBanner-main">
        {isConnecting && <span className="multiplayerBanner-spinner" aria-hidden="true" />}
        <strong className="multiplayerBanner-title">{statusLabels[status] || status}</strong>
        {status === 'retrying' && retryCount > 0 && (
          <span className="multiplayerBanner-retry-count" aria-label={`Attempt ${retryCount}`}>
            #{retryCount}
          </span>
        )}
        {categoryLabel && <span className="multiplayerBanner-category">{categoryLabel}</span>}
        {message && <span className="multiplayerBanner-message">{message}</span>}
        {copyState && <span className="multiplayerBanner-copy-feedback">{copyState}</span>}
        {sessionId && (
          <span className="multiplayerBanner-session-id" aria-label={`Session ID: ${sessionId}`}>
            {sessionId}
          </span>
        )}
      </div>
      <div className="multiplayerBanner-actions">
        {(status === 'retrying' || status === 'failed') && (
          <button type="button" onClick={onRetry}>
            {primaryActionLabel}
          </button>
        )}
        {status === 'connected' && (
          <button
            type="button"
            onClick={onReconnect}
            aria-label="Force reconnect to the multiplayer session"
          >
            Force reconnect
          </button>
        )}
        {sessionId && (
          <button
            type="button"
            onClick={() => withCopyFeedback(onCopySessionId, 'Session ID copied')}
            aria-label="Copy session ID to clipboard"
          >
            Copy ID
          </button>
        )}
        {shareUrl && (
          <button
            type="button"
            onClick={() => withCopyFeedback(onCopyShareLink, 'Invite link copied')}
            aria-label="Copy share link to clipboard"
          >
            Copy Invite Link
          </button>
        )}
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
