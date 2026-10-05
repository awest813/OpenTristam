import React from 'react';
import {
  buildDiagnosticsText,
  buildIssueUrl,
  describeStartupError,
  ExternalLink,
} from '../api/errorReporter';
import { useSession } from '../engine/sessionContext';
import DialogFrame from './DialogFrame';

export default function ErrorOverlay(props) {
  const session = useSession();
  const error = props.error || session.error;
  const retail = props.retail != null ? props.retail : session.retail;
  const saveName = props.saveName || session.saveName;
  const onReturnToStart =
    props.onReturnToStart || session.returnToStart || (() => window.location.reload());
  const onReload = props.onReload || (() => window.location.reload());
  const [copied, setCopied] = React.useState(false);

  if (!error) {
    return null;
  }

  const { isNetwork, isData, message } = describeStartupError(error.message);
  let heading = 'Something went wrong';
  let lead = 'The game hit an unexpected error and had to stop.';
  if (isNetwork) {
    heading = 'Connection problem';
    lead = 'Couldn’t download the game data.';
  } else if (isData) {
    heading = 'Game data problem';
    lead = 'The game couldn’t load its data files.';
  }
  const primaryActionLabel = isNetwork ? 'Try again' : 'Back to start';

  const copyDetails = async () => {
    const text = buildDiagnosticsText(error, retail);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('clipboard unavailable');
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      window.prompt('Copy these details:', text);
    }
  };

  return (
    <DialogFrame
      className="error"
      role="alertdialog"
      ariaLabel="Game error details"
      onEscape={onReturnToStart}
      initialFocusSelector=".errorPrimaryActions .startButton--primary"
    >
      <p className="header">{heading}</p>
      <p className="errorLead">{lead}</p>
      <p className="body">{message}</p>
      <div className="errorActions">
        <button type="button" className="errorCopyLink" onClick={copyDetails}>
          {copied ? 'Copied' : 'Copy details'}
        </button>
        {/* Network and data-file problems aren't bugs, so don't ask for a report. */}
        {!isNetwork && !isData && (
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
      <div className="errorPrimaryActions">
        <button
          type="button"
          className="startButton startButton--primary"
          onClick={onReturnToStart}
        >
          {primaryActionLabel}
        </button>
        <button type="button" className="startButton startButton--secondary" onClick={onReload}>
          Reload page
        </button>
      </div>
    </DialogFrame>
  );
}
