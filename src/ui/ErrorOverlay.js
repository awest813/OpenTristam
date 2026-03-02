import React from 'react';
import { buildIssueUrl, ExternalLink } from '../api/errorReporter';
import { useSession } from '../engine/sessionContext';
import DialogFrame from './DialogFrame';

export default function ErrorOverlay(props) {
  const session = useSession();
  const error = props.error || session.error;
  const retail = props.retail != null ? props.retail : session.retail;
  const saveName = props.saveName || session.saveName;

  if (!error) {
    return null;
  }

  return (
    <DialogFrame className="error" role="alertdialog" ariaLabel="Game error details">
      <p className="header">The following error has occurred:</p>
      <p className="body">{error.message}</p>
      <ExternalLink className="errorIssueLink" href={buildIssueUrl(error, retail)}>
        Create an issue on GitHub
      </ExternalLink>
      {error.save != null && <a href={error.save} download={saveName}>Download save file</a>}
    </DialogFrame>
  );
}
