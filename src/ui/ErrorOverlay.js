import React from 'react';
import { buildIssueUrl, describeStartupError, ExternalLink } from '../api/errorReporter';
import { useSession } from '../engine/sessionContext';
import DialogFrame from './DialogFrame';

export default function ErrorOverlay(props) {
  const session = useSession();
  const error = props.error || session.error;
  const retail = props.retail != null ? props.retail : session.retail;
  const saveName = props.saveName || session.saveName;
  const onReload = props.onReload || (() => window.location.reload());

  if (!error) {
    return null;
  }

  const { isNetwork, message } = describeStartupError(error.message);
  const heading = isNetwork ? 'Connection problem' : 'Something went wrong';
  const lead = isNetwork
    ? 'Couldn’t download the game data.'
    : 'The game hit an unexpected error and had to stop.';
  const primaryActionLabel = isNetwork ? 'Try again' : 'Restart game';

  return (
    <DialogFrame
      className="error"
      role="alertdialog"
      ariaLabel="Game error details"
      onEscape={onReload}
    >
      <p className="header">{heading}</p>
      <p className="errorLead">{lead}</p>
      <p className="body">{message}</p>
      <div className="errorActions">
        {/* Network failures are not bugs — don't nudge the player to file one. */}
        {!isNetwork && (
          <ExternalLink className="errorIssueLink" href={buildIssueUrl(error, retail)}>
            Report on GitHub
          </ExternalLink>
        )}
        {error.save != null && (
          <a className="errorSaveLink" href={error.save} download={saveName}>
            Download save
          </a>
        )}
      </div>
      <button type="button" className="startButton startButton--primary" onClick={onReload}>
        {primaryActionLabel}
      </button>
    </DialogFrame>
  );
}
