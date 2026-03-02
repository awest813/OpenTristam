import React from 'react';
import classNames from 'classnames';
import { useSession } from '../engine/sessionContext';

const statusLabels = {
  connecting: 'Connecting',
  connected: 'Connected',
  retrying: 'Retrying',
  failed: 'Failed',
};

export default function MultiplayerStatusBanner(props) {
  const session = useSession();
  const status = props.status || session.multiplayerStatus;
  const category = props.category || session.multiplayerErrorCategory;
  const message = props.message || session.multiplayerMessage;
  const sessionId = props.sessionId || session.multiplayerSessionId;
  const shareUrl = props.shareUrl || session.multiplayerShareUrl;
  const dismissed = props.dismissed != null ? props.dismissed : session.multiplayerNoticeDismissed;
  const onRetry = props.onRetry || session.retryMultiplayer;
  const onReconnect = props.onReconnect || session.reconnectMultiplayer;
  const onCopySessionId = props.onCopySessionId || session.copySessionId;
  const onCopyShareLink = props.onCopyShareLink || session.copyShareLink;
  const onDismiss = props.onDismiss || session.dismissMultiplayerNotice;

  if (!status || status === 'idle' || dismissed) {
    return null;
  }

  const isFailure = status === 'failed';

  return (
    <div
      className={classNames('multiplayerBanner', `multiplayerBanner-${status}`)}
      role={isFailure ? 'alert' : 'status'}
      aria-live={isFailure ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div className="multiplayerBanner-main">
        <strong className="multiplayerBanner-title">{statusLabels[status] || status}</strong>
        {category && <span className="multiplayerBanner-category">{category.replace(/_/g, ' ')}</span>}
        {message && <span className="multiplayerBanner-message">{message}</span>}
      </div>
      <div className="multiplayerBanner-actions">
        {(status === 'retrying' || status === 'failed') && (
          <button type="button" onClick={onRetry}>Retry</button>
        )}
        {(status === 'failed' || status === 'connected') && (
          <button type="button" onClick={onReconnect}>Reconnect</button>
        )}
        {sessionId && (
          <button type="button" onClick={onCopySessionId}>Copy Session ID</button>
        )}
        {shareUrl && (
          <button type="button" onClick={onCopyShareLink}>Copy Share Link</button>
        )}
        <button type="button" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}
