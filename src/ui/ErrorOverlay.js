import React from 'react';
import { buildIssueUrl, ExternalLink } from '../api/errorReporter';
import { useSession } from '../engine/sessionContext';

export default function ErrorOverlay(props) {
  const session = useSession();
  const error = props.error || session.error;
  const retail = props.retail != null ? props.retail : session.retail;
  const saveName = props.saveName || session.saveName;

  if (!error) {
    return null;
  }

  return (
    <ExternalLink className="error" href={buildIssueUrl(error, retail)}>
      <p className="header">The following error has occurred:</p>
      <p className="body">{error.message}</p>
      <p className="footer">Click to create an issue on GitHub</p>
      {error.save != null && <a href={error.save} download={saveName}>Download save file</a>}
    </ExternalLink>
  );
}
