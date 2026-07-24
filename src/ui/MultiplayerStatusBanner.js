import React from 'react';
import classNames from 'classnames';
import { useSession } from '../engine/sessionContext';

const statusLabels = {
  connecting: 'Connecting…',
  connected: 'Connected',
  retrying: 'Reconnecting…',
  failed: 'Connection failed',
};

export default function MultiplayerStatusBanner(props) {
  const session = useSession();
  const status = props.status || session.multiplayerStatus;
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
        {/* Category stays in diagnostics/state for logging; the message is the player-facing text. */}
        {message && <span className="multiplayerBanner-message">{message}</span>}
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
          <button type="button" onClick={onReconnect}>
            Reconnect
          </button>
        )}
        {sessionId && (
          <button type="button" onClick={onCopySessionId} aria-label="Copy session ID to clipboard">
            Copy ID
          </button>
        )}
        {shareUrl && (
          <button
            type="button"
            onClick={onCopyShareLink}
            aria-label="Copy invite link to clipboard"
          >
            Copy invite link
          </button>
        )}
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
